<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\AttendanceCorrection;
use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_human_resources_can_record_and_correct_attendance_with_justification(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee();
        $today = Carbon::today()->toDateString();

        // 1. Create record
        $response = $this->actingAs($thUser)->post(route('attendance.store'), [
            'employee_id' => $employee->id,
            'fecha' => $today,
            'hora_entrada' => '08:15',
            'hora_salida' => '17:30',
            'estado' => 'Retardo',
            'minutos_retardo' => 15,
            'horas_extra' => 0.5,
            'observaciones' => 'Demora en transporte',
        ]);
        $response->assertRedirect();

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'fecha' => $today,
            'minutos_retardo' => 15,
            'origen_entrada' => 'manual',
            'origen_salida' => 'manual',
        ]);

        $attendance = Attendance::query()->where('employee_id', $employee->id)->firstOrFail();

        // 2. Correction requires mandatory justification
        $failCorrection = $this->actingAs($thUser)->put(route('attendance.update', $attendance), [
            'hora_entrada' => '08:00',
            'hora_salida' => '17:00',
            'estado' => 'Presente',
            'minutos_retardo' => 0,
            'horas_extra' => 0,
            'justificacion_correccion' => '', // Empty justification
        ]);
        $failCorrection->assertSessionHasErrors('justificacion_correccion');

        // 3. Correction with valid justification
        $successCorrection = $this->actingAs($thUser)->put(route('attendance.update', $attendance), [
            'hora_entrada' => '08:00',
            'hora_salida' => '17:00',
            'estado' => 'Presente',
            'minutos_retardo' => 0,
            'horas_extra' => 0,
            'justificacion_correccion' => 'Error biométrico subsanado con soporte físico',
        ]);
        $successCorrection->assertRedirect();

        $attendance->refresh();
        $this->assertSame('Presente', $attendance->estado);
        $this->assertSame('Error biométrico subsanado con soporte físico', $attendance->justificacion_correccion);
        $this->assertSame($thUser->id, $attendance->corregido_por);
        $this->assertNotNull($attendance->fecha_correccion);
    }

    public function test_prevents_duplicate_attendance_for_same_employee_and_date(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee();
        $today = Carbon::today()->toDateString();

        Attendance::query()->create([
            'employee_id' => $employee->id,
            'fecha' => $today,
            'hora_entrada' => '08:00',
            'estado' => 'Presente',
        ]);

        $this->actingAs($thUser)->post(route('attendance.store'), [
            'employee_id' => $employee->id,
            'fecha' => $today,
            'hora_entrada' => '08:05',
            'estado' => 'Presente',
        ]);

        // Still only 1 record
        $this->assertSame(1, Attendance::query()->where('employee_id', $employee->id)->where('fecha', $today)->count());
    }

    public function test_employee_can_clock_in_and_clock_out(): void
    {
        $user = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $user->id]);

        // Clock In
        $this->actingAs($user)->post(route('attendance.clock'))->assertRedirect();

        $attendance = Attendance::query()->where('employee_id', $employee->id)->firstOrFail();
        $this->assertNotNull($attendance->hora_entrada);
        $this->assertNull($attendance->hora_salida);

        // Clock Out
        $this->actingAs($user)->post(route('attendance.clock'))->assertRedirect();

        $attendance->refresh();
        $this->assertNotNull($attendance->hora_salida);
    }

    public function test_authorized_corrections_append_before_after_values_and_actor_history(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee();
        $attendance = Attendance::query()->create([
            'employee_id' => $employee->id,
            'fecha' => Carbon::today()->toDateString(),
            'hora_entrada' => '08:15:00',
            'estado' => 'Retardo',
            'minutos_retardo' => 15,
            'origen_entrada' => 'publico',
        ]);

        $this->actingAs($thUser)
            ->put(route('attendance.update', $attendance), [
                'hora_entrada' => '08:00',
                'hora_salida' => '17:00',
                'estado' => 'Presente',
                'minutos_retardo' => 0,
                'horas_extra' => 0,
                'justificacion_correccion' => 'Corrección de hora autorizada',
                'observaciones' => 'Registro verificado',
            ])
            ->assertRedirect();

        $correction = AttendanceCorrection::query()->firstOrFail();
        $this->assertSame($attendance->id, $correction->attendance_id);
        $this->assertSame($thUser->id, $correction->user_id);
        $this->assertSame($thUser->name, $correction->actor_name);
        $this->assertSame('Talento Humano', $correction->actor_role);
        $this->assertSame('08:15', $correction->original_values['hora_entrada']);
        $this->assertSame('publico', $correction->original_values['origen_entrada']);
        $this->assertSame('08:00', $correction->corrected_values['hora_entrada']);
        $this->assertSame('corregido', $correction->corrected_values['origen_entrada']);
        $this->assertSame('Corrección de hora autorizada', $correction->reason);
        $this->assertNotNull($correction->corrected_at);

        $this->actingAs($thUser)
            ->get(route('attendance.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('attendances.data.0.corrections.0.actor_name', $thUser->name)
                ->where('attendances.data.0.corrections.0.original_values.hora_entrada', '08:15')
                ->where('attendances.data.0.corrections.0.corrected_values.hora_entrada', '08:00'));

        $this->assertDatabaseCount('attendance_corrections', 1);
    }

    public function test_jefe_without_a_department_cannot_view_team_attendance(): void
    {
        $jefeUser = $this->createUserWithRole('Jefe de área');
        $employee = $this->createEmployee();
        Attendance::query()->create([
            'employee_id' => $employee->id,
            'fecha' => Carbon::today()->toDateString(),
            'estado' => 'Presente',
        ]);

        $this->actingAs($jefeUser)
            ->get(route('attendance.team'))
            ->assertForbidden();
    }

    private function createEmployee(array $attributes = []): Employee
    {
        return Employee::factory()->create($attributes);
    }

    private function createUserWithRole(string $roleName): User
    {
        $role = Role::query()->where('name', $roleName)->firstOrFail();
        $user = User::factory()->for($role)->create();
        $this->acceptCurrentPrivacyPolicy($user);

        return $user;
    }
}
