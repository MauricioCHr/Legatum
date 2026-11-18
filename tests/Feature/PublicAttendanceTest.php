<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\PrivacyPolicySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PublicAttendanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->seed(PrivacyPolicySeeder::class);
    }

    public function test_public_clock_is_available_without_login_and_does_not_expose_employee_data(): void
    {
        $this->get(route('attendance.public.show'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Attendance/PublicClock')
                ->missing('employee')
                ->missing('employees'));

        $this->assertGuest();
        $this->get(route('employees.index'))->assertRedirect(route('login'));
        $this->get(route('dashboard'))->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_public_entry_and_exit_use_server_time_and_store_each_origin(): void
    {
        $employee = $this->createEmployeeWithCredentials('Mauricio Chamorro', '123456');
        Carbon::setTestNow(Carbon::parse('2026-03-10 08:00:00', 'America/Bogota'));

        try {
            $payload = [
                'employee_name' => $employee->user->name,
                'pin' => '123456',
            ];

            $this->post(route('attendance.public.mark'), $payload)
                ->assertRedirect(route('attendance.public.show'))
                ->assertSessionHas('success', 'Entrada registrada correctamente.');

            $attendance = Attendance::query()->where('employee_id', $employee->id)->firstOrFail();
            $this->assertSame('2026-03-10', $attendance->fecha->toDateString());
            $this->assertSame('08:00:00', $attendance->hora_entrada);
            $this->assertSame('Presente', $attendance->estado);
            $this->assertSame('publico', $attendance->origen_entrada);
            $this->assertNull($attendance->registrado_por);

            Carbon::setTestNow(Carbon::parse('2026-03-10 18:30:00', 'America/Bogota'));

            $this->post(route('attendance.public.mark'), $payload)
                ->assertRedirect(route('attendance.public.show'))
                ->assertSessionHas('success', 'Salida registrada correctamente.');

            $attendance->refresh();
            $this->assertSame('18:30:00', $attendance->hora_salida);
            $this->assertSame('publico', $attendance->origen_salida);
            $this->assertSame(2.5, (float) $attendance->horas_extra);
            $this->assertGuest();

            $humanResources = $this->createUserWithRole('Talento Humano');
            $this->actingAs($humanResources)
                ->get(route('attendance.index', [
                    'fecha_inicio' => '2026-03-10',
                    'fecha_fin' => '2026-03-10',
                ]))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Attendance/Index')
                    ->where('attendances.data.0.employee_id', $employee->id)
                    ->where('attendances.data.0.origen_entrada', 'publico')
                    ->where('attendances.data.0.origen_salida', 'publico'));
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_invalid_or_inactive_credentials_return_a_generic_response(): void
    {
        $employee = $this->createEmployeeWithCredentials('Camila Vargas', '123456');
        $genericError = 'No se pudo validar la marcación. Verifica el nombre y el PIN o comunícate con Talento Humano.';

        $this->post(route('attendance.public.mark'), [
            'employee_name' => 'Nombre Inexistente',
            'pin' => '123456',
        ])->assertRedirect(route('attendance.public.show'))
            ->assertSessionHas('error', $genericError);

        $this->post(route('attendance.public.mark'), [
            'employee_name' => $employee->user->name,
            'pin' => '999999',
        ])->assertRedirect(route('attendance.public.show'))
            ->assertSessionHas('error', $genericError);

        $employee->update(['estado' => 'Inactivo']);
        $this->post(route('attendance.public.mark'), [
            'employee_name' => $employee->user->name,
            'pin' => '123456',
        ])->assertRedirect(route('attendance.public.show'))
            ->assertSessionHas('error', $genericError);

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_employee_without_current_policy_acceptance_cannot_mark_attendance(): void
    {
        $user = $this->createUserWithRole('Empleado');
        $user->forceFill(['name' => 'Laura Jimenez'])->save();
        $employee = Employee::factory()->create(['user_id' => $user->id]);
        $employee->forceFill([
            'attendance_code' => 'EMPLOYEE0005',
            'attendance_pin_hash' => Hash::make('123456'),
        ])->save();

        $this->post(route('attendance.public.mark'), [
            'employee_name' => $user->name,
            'pin' => '123456',
        ])->assertSessionHas(
            'error',
            'No se pudo validar la marcación. Verifica el nombre y el PIN o comunícate con Talento Humano.',
        );

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_name_matching_ignores_case_and_repeated_whitespace(): void
    {
        $employee = $this->createEmployeeWithCredentials('Mauricio Chamorro', '123456');

        $this->post(route('attendance.public.mark'), [
            'employee_name' => '  mAuRiCiO   cHaMoRrO  ',
            'pin' => '123456',
        ])->assertSessionHas('success', 'Entrada registrada correctamente.');

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'origen_entrada' => 'publico',
        ]);
    }

    public function test_name_matching_ignores_multibyte_case_differences(): void
    {
        $employee = $this->createEmployeeWithCredentials('Ángel Muñoz', '123456');

        $this->post(route('attendance.public.mark'), [
            'employee_name' => 'ÁNGEL MUÑOZ',
            'pin' => '123456',
        ])->assertSessionHas('success', 'Entrada registrada correctamente.');

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'origen_entrada' => 'publico',
        ]);
    }

    public function test_pin_identifies_the_correct_employee_when_names_are_duplicated(): void
    {
        $this->createEmployeeWithCredentials('Andrea Morales', '111111');
        $selectedEmployee = $this->createEmployeeWithCredentials('Andrea Morales', '222222');

        $this->post(route('attendance.public.mark'), [
            'employee_name' => 'Andrea Morales',
            'pin' => '222222',
        ])->assertSessionHas('success', 'Entrada registrada correctamente.');

        $this->assertDatabaseHas('attendances', [
            'employee_id' => $selectedEmployee->id,
            'origen_entrada' => 'publico',
        ]);
        $this->assertDatabaseCount('attendances', 1);
    }

    public function test_ambiguous_duplicate_name_and_pin_cannot_be_used_to_mark(): void
    {
        $this->createEmployeeWithCredentials('Andrea Morales', '222222');
        $this->createEmployeeWithCredentials('Andrea Morales', '222222');

        $this->post(route('attendance.public.mark'), [
            'employee_name' => 'Andrea Morales',
            'pin' => '222222',
        ])->assertSessionHas(
            'error',
            'No se pudo validar la marcación. Verifica el nombre y el PIN o comunícate con Talento Humano.',
        );

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_public_marking_requires_name_and_pin_not_the_old_employee_code(): void
    {
        $employee = $this->createEmployeeWithCredentials('Camila Vargas', '123456');

        $this->post(route('attendance.public.mark'), [
            'employee_code' => $employee->attendance_code,
            'pin' => '123456',
        ])->assertSessionHasErrors('employee_name');

        $this->assertDatabaseCount('attendances', 0);
    }

    public function test_single_mark_endpoint_toggles_entry_and_exit_without_duplicate_daily_entries(): void
    {
        $employee = $this->createEmployeeWithCredentials('Santiago Rojas', '123456');
        Carbon::setTestNow(Carbon::parse('2026-03-10 08:00:00', 'America/Bogota'));

        try {
            $payload = [
                'employee_name' => $employee->user->name,
                'pin' => '123456',
            ];

            $this->post(route('attendance.public.mark'), $payload)
                ->assertSessionHas('success', 'Entrada registrada correctamente.');

            $attendance = Attendance::query()->where('employee_id', $employee->id)->firstOrFail();
            $this->assertNull($attendance->hora_salida);

            $this->post(route('attendance.public.mark'), $payload)
                ->assertSessionHas('success', 'Salida registrada correctamente.');
            $this->post(route('attendance.public.mark'), $payload)
                ->assertSessionHas('error', 'Ya existe una marcación para hoy o una entrada reciente está abierta.');

            $this->assertDatabaseCount('attendances', 1);
            $this->assertSame('08:00:00', $attendance->fresh()->hora_entrada);
            $this->assertSame('08:00:00', $attendance->fresh()->hora_salida);
            $this->post('/marcacion/salida', $payload)->assertNotFound();
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_public_marking_is_rate_limited(): void
    {
        $names = [
            'Nombre De Prueba',
            ' NOMBRE DE PRUEBA ',
            'Nombre   De Prueba',
            'nombre de prueba',
            'NOMBRE   de   prueba',
        ];

        foreach ($names as $name) {
            $this->post(route('attendance.public.mark'), [
                'employee_name' => $name,
                'pin' => '123456',
            ])->assertRedirect();
        }

        $this->post(route('attendance.public.mark'), [
            'employee_name' => 'nombre de prueba',
            'pin' => '123456',
        ])->assertTooManyRequests();
    }

    public function test_only_administrators_can_assign_or_reset_a_hashed_attendance_pin(): void
    {
        $employee = Employee::factory()->create();
        $administrator = $this->createUserWithRole('Administrador');

        $this->actingAs($administrator)
            ->put(route('employees.attendance-pin', $employee), [
                'pin' => '123456',
                'pin_confirmation' => '123456',
            ])
            ->assertRedirect(route('employees.show', $employee));

        $employee->refresh();
        $attendanceCode = $employee->attendance_code;

        $this->assertMatchesRegularExpression('/\A[A-Z0-9]{12}\z/', $attendanceCode);
        $this->assertTrue(Hash::check('123456', $employee->attendance_pin_hash));
        $this->assertNotSame('123456', $employee->attendance_pin_hash);

        $this->actingAs($administrator)
            ->get(route('employees.show', $employee))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('attendanceCode', $attendanceCode)
                ->where('hasAttendancePin', true)
                ->missing('employee.attendance_pin_hash'));

        $this->actingAs($administrator)
            ->put(route('employees.attendance-pin', $employee), [
                'pin' => '654321',
                'pin_confirmation' => '654321',
            ])
            ->assertRedirect();

        $employee->refresh();
        $this->assertSame($attendanceCode, $employee->attendance_code);
        $this->assertTrue(Hash::check('654321', $employee->attendance_pin_hash));

        $humanResources = $this->createUserWithRole('Talento Humano');
        $this->actingAs($humanResources)
            ->put(route('employees.attendance-pin', $employee), [
                'pin' => '111111',
                'pin_confirmation' => '111111',
            ])
            ->assertForbidden();
    }

    public function test_employee_serialization_never_exposes_attendance_credentials(): void
    {
        $employee = $this->createEmployeeWithCredentials('EMPLOYEE0004', '123456');
        $this->acceptCurrentPrivacyPolicy($employee->user);

        $this->actingAs($employee->user)
            ->get(route('attendance.my'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->missing('employee.attendance_code')
                ->missing('employee.attendance_pin_hash')
                ->missing('employee.attendance_pin_updated_by'));
    }

    private function createEmployeeWithCredentials(string $name, string $pin): Employee
    {
        $user = $this->createUserWithRole('Empleado');
        $user->forceFill(['name' => $name])->save();
        $this->acceptCurrentPrivacyPolicy($user);
        $employee = Employee::factory()->create(['user_id' => $user->id]);
        $employee->forceFill([
            'attendance_pin_hash' => Hash::make($pin),
        ])->save();

        return $employee;
    }

    private function createUserWithRole(string $roleName): User
    {
        $role = Role::query()->where('name', $roleName)->firstOrFail();

        return User::factory()->for($role)->create();
    }
}
