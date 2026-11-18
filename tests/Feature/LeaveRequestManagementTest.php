<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\LeaveRequestDecision;
use App\Models\LeaveType;
use App\Models\PrivacyPolicyAcceptance;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\LeaveTypeSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\File\UploadedFile as SymfonyUploadedFile;
use Tests\TestCase;

class LeaveRequestManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->seed(LeaveTypeSeeder::class);
    }

    public function test_employee_can_request_vacation_and_balance_is_updated_on_approval(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 09:00:00'));

        $empUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $empUser->id]);
        $vacationType = LeaveType::query()->where('codigo', 'vacaciones')->firstOrFail();

        $balance = $employee->getOrCreateVacationBalance();
        $this->assertSame(15.0, (float) $balance->dias_disponibles);

        $startDate = Carbon::today()->addDay()->toDateString();
        $endDate = Carbon::today()->addDays(7)->toDateString();

        // 1. Submit Request
        $response = $this->actingAs($empUser)->post(route('leaves.store'), [
            'leave_type_id' => $vacationType->id,
            'fecha_inicio' => $startDate,
            'fecha_fin' => $endDate,
            'motivo' => 'Vacaciones familiares anuales en Pasto',
        ]);
        $response->assertRedirect();

        $balance->refresh();
        $this->assertSame(5.0, (float) $balance->dias_pendientes);
        $this->assertSame(10.0, (float) $balance->dias_disponibles);

        $request = LeaveRequest::query()->where('employee_id', $employee->id)->firstOrFail();
        $this->assertSame('Pendiente', $request->estado);

        // 2. Approve Request by Talento Humano
        $thUser = $this->createUserWithRole('Talento Humano');
        $approveResponse = $this->actingAs($thUser)->post(route('leaves.approve', $request), [
            'observaciones_respuesta' => 'Aprobadas formalmente',
        ]);
        $approveResponse->assertRedirect();

        $request->refresh();
        $this->assertSame('Aprobada', $request->estado);
        $this->assertSame($thUser->id, $request->aprobado_por);

        $balance->refresh();
        $this->assertSame(0.0, (float) $balance->dias_pendientes);
        $this->assertSame(5.0, (float) $balance->dias_disfrutados);
        $this->assertSame(10.0, (float) $balance->dias_disponibles);

        // 3. Verify attendance records were populated for approved vacation
        $this->assertDatabaseHas('attendances', [
            'employee_id' => $employee->id,
            'fecha' => $startDate,
            'estado' => 'Vacaciones',
        ]);
    }

    public function test_leave_request_counts_business_days_and_enforces_type_limit(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 09:00:00'));

        $empUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $empUser->id]);
        $leaveType = LeaveType::query()->where('codigo', 'permiso-remunerado')->firstOrFail();

        $this->actingAs($empUser)
            ->from(route('leaves.my'))
            ->post(route('leaves.store'), [
                'leave_type_id' => $leaveType->id,
                'fecha_inicio' => '2026-11-16',
                'fecha_fin' => '2026-11-19',
                'motivo' => 'Permiso personal de cuatro días',
            ])
            ->assertRedirect(route('leaves.my'))
            ->assertSessionHasErrors('fecha_fin');

        $this->assertDatabaseMissing('leave_requests', [
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
        ]);
    }

    public function test_weekend_only_leave_request_is_rejected(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 09:00:00'));

        $empUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $empUser->id]);
        $leaveType = LeaveType::query()->where('codigo', 'permiso-remunerado')->firstOrFail();

        $this->actingAs($empUser)
            ->post(route('leaves.store'), [
                'leave_type_id' => $leaveType->id,
                'fecha_inicio' => '2026-11-21',
                'fecha_fin' => '2026-11-22',
                'motivo' => 'Permiso durante fin de semana',
            ])
            ->assertSessionHasErrors('fecha_fin');

        $this->assertDatabaseMissing('leave_requests', [
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
        ]);
    }

    public function test_human_resources_can_file_and_reject_an_employee_permission_request(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 09:00:00'));

        $thUser = $this->createUserWithRole('Talento Humano');
        $employeeUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $employeeUser->id]);
        $leaveType = LeaveType::query()->where('codigo', 'permiso-remunerado')->firstOrFail();

        $this->actingAs($thUser)
            ->get(route('leaves.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('canManage', true)
                ->where('employees.0.id', $employee->id)
                ->has('leaveTypes', 7));

        $this->actingAs($thUser)
            ->post(route('leaves.store'), [
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'fecha_inicio' => '2026-11-17',
                'fecha_fin' => '2026-11-17',
                'motivo' => 'Diligencia personal en horario laboral',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $leaveRequest = LeaveRequest::query()->where('employee_id', $employee->id)->firstOrFail();
        $this->assertSame(1.0, (float) $leaveRequest->dias_solicitados);

        $this->actingAs($thUser)
            ->post(route('leaves.reject', $leaveRequest), [
                'observaciones_respuesta' => 'No se adjuntó el soporte requerido.',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('leave_requests', [
            'id' => $leaveRequest->id,
            'estado' => 'Rechazada',
            'aprobado_por' => $thUser->id,
            'observaciones_respuesta' => 'No se adjuntó el soporte requerido.',
        ]);

        $this->actingAs($employeeUser)
            ->get(route('leaves.my'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('requests.data.0.estado', 'Rechazada')
                ->where('requests.data.0.leave_type.codigo', 'permiso-remunerado'));
    }

    public function test_human_resources_can_review_cross_department_requests_with_details_and_filters(): void
    {
        $this->travelTo(Carbon::parse('2026-11-17 09:00:00'));

        $humanResources = $this->createUserWithRole('Talento Humano');
        $employeeUserOne = $this->createUserWithRole('Empleado');
        $employeeUserTwo = $this->createUserWithRole('Empleado');
        $employeeOne = $this->createEmployee(['user_id' => $employeeUserOne->id]);
        $employeeTwo = $this->createEmployee(['user_id' => $employeeUserTwo->id]);
        $this->assertNotSame($employeeOne->departamento_id, $employeeTwo->departamento_id);
        $employeeOne->update([
            'numero_documento' => '10010001',
            'estado' => 'Inactivo',
        ]);
        $employeeTwo->update(['numero_documento' => '10010002']);
        $vacationType = LeaveType::query()->where('codigo', 'vacaciones')->firstOrFail();
        $vacationType->update(['is_active' => false]);
        $permissionType = LeaveType::query()->where('codigo', 'permiso-remunerado')->firstOrFail();

        $pendingRequest = LeaveRequest::query()->create([
            'employee_id' => $employeeOne->id,
            'leave_type_id' => $vacationType->id,
            'fecha_inicio' => '2026-11-20',
            'fecha_fin' => '2026-11-22',
            'dias_solicitados' => 1,
            'motivo' => 'Descanso familiar programado',
            'estado' => 'Pendiente',
        ]);
        LeaveRequest::query()->create([
            'employee_id' => $employeeTwo->id,
            'leave_type_id' => $permissionType->id,
            'fecha_inicio' => '2026-11-23',
            'fecha_fin' => '2026-11-24',
            'dias_solicitados' => 2,
            'motivo' => 'Cita personal previamente aprobada',
            'estado' => 'Aprobada',
            'aprobado_por' => $humanResources->id,
            'fecha_respuesta' => now(),
            'observaciones_respuesta' => 'Aprobada por coordinación.',
        ]);
        $rejectedRequest = LeaveRequest::query()->create([
            'employee_id' => $employeeTwo->id,
            'leave_type_id' => $permissionType->id,
            'fecha_inicio' => '2026-11-28',
            'fecha_fin' => '2026-11-30',
            'dias_solicitados' => 1,
            'motivo' => 'Diligencia personal en otra ciudad',
            'estado' => 'Rechazada',
            'aprobado_por' => $humanResources->id,
            'fecha_respuesta' => now(),
            'observaciones_respuesta' => 'Coincide con una fecha crítica.',
        ]);
        LeaveRequestDecision::query()->create([
            'leave_request_id' => $rejectedRequest->id,
            'user_id' => $humanResources->id,
            'actor_name' => $humanResources->name,
            'actor_role' => 'Talento Humano',
            'action' => 'Rechazada',
            'observations' => 'Coincide con una fecha crítica.',
            'decided_at' => now(),
        ]);

        $this->actingAs($humanResources)
            ->get(route('leaves.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Leaves/Index')
                ->where('canManage', true)
                ->has('requests.data', 3)
                ->where('requests.data.2.id', $pendingRequest->id)
                ->where('requests.data.2.employee.user.name', $employeeUserOne->name)
                ->where('requests.data.2.employee.numero_documento', '10010001')
                ->where('requests.data.2.employee.department.nombre', $employeeOne->department->nombre)
                ->where('requests.data.2.employee.position.nombre', $employeeOne->position->nombre)
                ->where('requests.data.2.leave_type.nombre', $vacationType->nombre)
                ->where('requests.data.2.motivo', 'Descanso familiar programado')
                ->where('requests.data.0.decisions.0.observations', 'Coincide con una fecha crítica.')
                ->where('filters.fecha_desde', null)
                ->where('filters.fecha_hasta', null)
                ->has('employees', 1)
                ->has('filterEmployees', 2)
                ->has('leaveTypes', 6)
                ->has('filterLeaveTypes', 7)
                ->etc()
            );

        $filterCases = [
            'estado' => [['estado' => 'Rechazada'], 1],
            'departamento' => [['departamento_id' => $employeeTwo->departamento_id], 2],
            'empleado' => [['employee_id' => $employeeTwo->id], 2],
            'tipo' => [['leave_type_id' => $permissionType->id], 2],
            'tipo_historico' => [['leave_type_id' => $vacationType->id], 1],
            'periodo' => [['fecha_desde' => '2026-11-29', 'fecha_hasta' => '2026-11-30'], 1],
        ];

        foreach (array_values($filterCases) as [$query, $expectedCount]) {
            $this->actingAs($humanResources)
                ->get(route('leaves.index', $query))
                ->assertOk()
                ->assertInertia(fn ($page) => $page
                    ->component('Leaves/Index')
                    ->where('requests.total', $expectedCount)
                    ->etc()
                );
        }

        $this->actingAs($humanResources)
            ->get(route('leaves.index', [
                'estado' => 'Rechazada',
                'departamento_id' => $employeeTwo->departamento_id,
                'employee_id' => $employeeTwo->id,
                'leave_type_id' => $permissionType->id,
                'fecha_desde' => '2026-11-29',
                'fecha_hasta' => '2026-11-30',
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Leaves/Index')
                ->has('requests.data', 1)
                ->where('requests.data.0.id', $rejectedRequest->id)
                ->where('filters.fecha_desde', '2026-11-29')
                ->where('filters.fecha_hasta', '2026-11-30')
                ->etc()
            );
    }

    public function test_human_resources_cannot_filter_requests_with_a_reversed_period(): void
    {
        $humanResources = $this->createUserWithRole('Talento Humano');

        $this->actingAs($humanResources)
            ->from(route('leaves.index'))
            ->get(route('leaves.index', [
                'fecha_desde' => '2026-11-30',
                'fecha_hasta' => '2026-11-20',
            ]))
            ->assertRedirect(route('leaves.index'))
            ->assertSessionHasErrors('fecha_hasta');
    }

    public function test_employee_request_list_contains_only_the_authenticated_employees_requests(): void
    {
        $this->travelTo(Carbon::parse('2026-11-17 09:00:00'));

        $employeeUser = $this->createUserWithRole('Empleado');
        $otherEmployeeUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $employeeUser->id]);
        $otherEmployee = $this->createEmployee(['user_id' => $otherEmployeeUser->id]);
        $leaveType = LeaveType::query()->where('codigo', 'permiso-remunerado')->firstOrFail();
        $ownRequest = LeaveRequest::query()->create([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'fecha_inicio' => Carbon::tomorrow()->toDateString(),
            'fecha_fin' => Carbon::tomorrow()->toDateString(),
            'dias_solicitados' => 1,
            'motivo' => 'Diligencia propia',
            'estado' => 'Pendiente',
        ]);
        LeaveRequest::query()->create([
            'employee_id' => $otherEmployee->id,
            'leave_type_id' => $leaveType->id,
            'fecha_inicio' => Carbon::tomorrow()->toDateString(),
            'fecha_fin' => Carbon::tomorrow()->toDateString(),
            'dias_solicitados' => 1,
            'motivo' => 'Diligencia de otro colaborador',
            'estado' => 'Pendiente',
        ]);

        $this->actingAs($employeeUser)
            ->get(route('leaves.my'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Leaves/MyRequests')
                ->has('requests.data', 1)
                ->where('requests.data.0.id', $ownRequest->id)
                ->where('requests.data.0.motivo', 'Diligencia propia')
                ->etc()
            );
    }

    public function test_required_support_is_stored_privately_and_downloaded_only_by_authorized_users(): void
    {
        Storage::fake('local');
        Storage::fake('public');
        $employeeUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $employeeUser->id]);
        $this->acceptPrivacyPolicy($employeeUser);
        $medicalLeaveType = LeaveType::query()->where('codigo', 'cita-medica')->firstOrFail();
        $support = UploadedFile::fake()->createWithContent('cita.pdf', "%PDF-1.4\nSoporte de prueba\n%%EOF");

        $this->actingAs($employeeUser)
            ->from(route('leaves.my'))
            ->post(route('leaves.store'), [
                'leave_type_id' => $medicalLeaveType->id,
                'fecha_inicio' => Carbon::tomorrow()->toDateString(),
                'fecha_fin' => Carbon::tomorrow()->toDateString(),
                'motivo' => 'Cita médica de control',
                'support_file' => $support,
            ])
            ->assertRedirect(route('leaves.my'))
            ->assertSessionHas('success');

        $leaveRequest = LeaveRequest::query()->where('employee_id', $employee->id)->firstOrFail();
        $this->assertStringStartsWith('leave-supports/', $leaveRequest->support_path);
        $this->assertSame('application/pdf', $leaveRequest->support_mime_type);
        Storage::disk('local')->assertExists($leaveRequest->support_path);
        Storage::disk('public')->assertMissing($leaveRequest->support_path);
        $this->assertSame(storage_path('app/private'), config('filesystems.disks.local.root'));
        $this->assertDatabaseHas('leave_request_decisions', [
            'leave_request_id' => $leaveRequest->id,
            'action' => 'Solicitada',
            'user_id' => $employeeUser->id,
        ]);

        $this->actingAs($employeeUser)
            ->get(route('leaves.my'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('requests.data.0.support_original_name', 'cita.pdf')
                ->missing('requests.data.0.support_path'));

        $this->actingAs($employeeUser)
            ->get(route('leaves.support', $leaveRequest))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $anotherEmployee = $this->createUserWithRole('Empleado');
        $this->createEmployee(['user_id' => $anotherEmployee->id]);
        $this->acceptPrivacyPolicy($anotherEmployee);

        $this->actingAs($anotherEmployee)
            ->get(route('leaves.support', $leaveRequest))
            ->assertNotFound();

        $managerUser = $this->createUserWithRole('Jefe de área');
        $this->createEmployee([
            'user_id' => $managerUser->id,
            'departamento_id' => $employee->departamento_id,
            'cargo_id' => $employee->cargo_id,
        ]);

        $this->actingAs($managerUser)
            ->get(route('leaves.support', $leaveRequest))
            ->assertOk();

        $humanResources = $this->createUserWithRole('Talento Humano');
        $this->actingAs($humanResources)
            ->get(route('leaves.support', $leaveRequest))
            ->assertOk();

        $this->actingAs($humanResources)
            ->post(route('leaves.approve', $leaveRequest), [
                'observaciones_respuesta' => 'Soporte verificado.',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseCount('leave_request_decisions', 2);
        $this->assertDatabaseHas('leave_request_decisions', [
            'leave_request_id' => $leaveRequest->id,
            'action' => 'Aprobada',
            'observations' => 'Soporte verificado.',
            'user_id' => $humanResources->id,
        ]);
    }

    public function test_required_support_is_rejected_when_missing_or_mime_does_not_match_allowed_types(): void
    {
        $employeeUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $employeeUser->id]);
        $this->acceptPrivacyPolicy($employeeUser);
        $medicalLeaveType = LeaveType::query()->where('codigo', 'cita-medica')->firstOrFail();
        $dates = [
            'leave_type_id' => $medicalLeaveType->id,
            'fecha_inicio' => Carbon::tomorrow()->toDateString(),
            'fecha_fin' => Carbon::tomorrow()->toDateString(),
            'motivo' => 'Cita médica de control',
        ];

        $this->actingAs($employeeUser)
            ->post(route('leaves.store'), $dates)
            ->assertSessionHasErrors('support_file');

        $tempPath = tempnam(sys_get_temp_dir(), 'legatum-upload-');
        $this->assertNotFalse($tempPath);
        file_put_contents($tempPath, '<html>not a PDF</html>');

        try {
            $invalidFile = new SymfonyUploadedFile($tempPath, 'soporte.pdf', 'application/pdf', null, true);

            $this->actingAs($employeeUser)
                ->post(route('leaves.store'), [
                    ...$dates,
                    'support_file' => $invalidFile,
                ])
                ->assertSessionHasErrors('support_file');
        } finally {
            unlink($tempPath);
        }

        $this->assertDatabaseMissing('leave_requests', ['employee_id' => $employee->id]);
    }

    public function test_required_support_rejects_a_disallowed_extension(): void
    {
        $employeeUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $employeeUser->id]);
        $medicalLeaveType = LeaveType::query()->where('codigo', 'cita-medica')->firstOrFail();
        $support = UploadedFile::fake()->createWithContent(
            'soporte.exe',
            "%PDF-1.4\nSoporte de prueba\n%%EOF",
        );

        $this->actingAs($employeeUser)
            ->post(route('leaves.store'), [
                'leave_type_id' => $medicalLeaveType->id,
                'fecha_inicio' => Carbon::tomorrow()->toDateString(),
                'fecha_fin' => Carbon::tomorrow()->toDateString(),
                'motivo' => 'Cita médica de control',
                'support_file' => $support,
            ])
            ->assertSessionHasErrors([
                'support_file' => 'La extensión del soporte debe ser PDF, JPG o PNG.',
            ]);

        $this->assertDatabaseMissing('leave_requests', ['employee_id' => $employee->id]);
    }

    public function test_required_support_rejects_files_over_ten_megabytes(): void
    {
        $employeeUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $employeeUser->id]);
        $medicalLeaveType = LeaveType::query()->where('codigo', 'cita-medica')->firstOrFail();
        $support = UploadedFile::fake()->createWithContent(
            'soporte.pdf',
            "%PDF-1.4\n".str_repeat('a', 10 * 1024 * 1024)."\n%%EOF",
        );

        $this->actingAs($employeeUser)
            ->post(route('leaves.store'), [
                'leave_type_id' => $medicalLeaveType->id,
                'fecha_inicio' => Carbon::tomorrow()->toDateString(),
                'fecha_fin' => Carbon::tomorrow()->toDateString(),
                'motivo' => 'Cita médica de control',
                'support_file' => $support,
            ])
            ->assertSessionHasErrors([
                'support_file' => 'El soporte no puede superar los 10 MB.',
            ]);

        $this->assertDatabaseMissing('leave_requests', ['employee_id' => $employee->id]);
    }

    public function test_required_support_cannot_be_approved_when_missing(): void
    {
        $employeeUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $employeeUser->id]);
        $medicalLeaveType = LeaveType::query()->where('codigo', 'cita-medica')->firstOrFail();
        $leaveRequest = LeaveRequest::query()->create([
            'employee_id' => $employee->id,
            'leave_type_id' => $medicalLeaveType->id,
            'fecha_inicio' => Carbon::tomorrow()->toDateString(),
            'fecha_fin' => Carbon::tomorrow()->toDateString(),
            'dias_solicitados' => 1,
            'motivo' => 'Cita médica de control',
            'estado' => 'Pendiente',
        ]);
        $humanResources = $this->createUserWithRole('Talento Humano');

        $this->actingAs($humanResources)
            ->post(route('leaves.approve', $leaveRequest), [
                'observaciones_respuesta' => 'Soporte verificado.',
            ])
            ->assertRedirect()
            ->assertSessionHas('error', 'No se puede aprobar esta solicitud sin el soporte obligatorio.');

        $this->assertDatabaseHas('leave_requests', [
            'id' => $leaveRequest->id,
            'estado' => 'Pendiente',
            'support_path' => null,
        ]);
        $this->assertDatabaseMissing('leave_request_decisions', [
            'leave_request_id' => $leaveRequest->id,
            'action' => 'Aprobada',
        ]);
    }

    public function test_jefe_without_a_department_cannot_view_team_requests(): void
    {
        $jefeUser = $this->createUserWithRole('Jefe de área');

        $this->actingAs($jefeUser)->get(route('leaves.team'))->assertForbidden();
    }

    public function test_rejects_overlapping_leave_requests_for_the_same_employee(): void
    {
        $empUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $empUser->id]);
        $vacationType = LeaveType::query()->where('codigo', 'vacaciones')->firstOrFail();

        $start = Carbon::today()->addDays(10)->toDateString();
        $end = Carbon::today()->addDays(15)->toDateString();

        LeaveRequest::query()->create([
            'employee_id' => $employee->id,
            'leave_type_id' => $vacationType->id,
            'fecha_inicio' => $start,
            'fecha_fin' => $end,
            'dias_solicitados' => 6,
            'motivo' => 'Primera solicitud',
            'estado' => 'Pendiente',
        ]);

        // Attempt overlapping request (within same dates)
        $this->actingAs($empUser)->post(route('leaves.store'), [
            'leave_type_id' => $vacationType->id,
            'fecha_inicio' => Carbon::today()->addDays(12)->toDateString(),
            'fecha_fin' => Carbon::today()->addDays(18)->toDateString(),
            'motivo' => 'Segunda solicitud solapada',
        ]);

        $this->assertSame(1, LeaveRequest::query()->where('employee_id', $employee->id)->count());
    }

    public function test_employee_can_cancel_pending_request_and_restore_balance(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 09:00:00'));

        $empUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $empUser->id]);
        $vacationType = LeaveType::query()->where('codigo', 'vacaciones')->firstOrFail();

        $balance = $employee->getOrCreateVacationBalance();

        $this->actingAs($empUser)->post(route('leaves.store'), [
            'leave_type_id' => $vacationType->id,
            'fecha_inicio' => Carbon::today()->addDay()->toDateString(),
            'fecha_fin' => Carbon::today()->addDays(3)->toDateString(),
            'motivo' => 'Solicitud temporal a cancelar',
        ]);

        $request = LeaveRequest::query()->where('employee_id', $employee->id)->firstOrFail();
        $this->assertSame(3.0, (float) $balance->fresh()->dias_pendientes);

        // Cancel
        $this->actingAs($empUser)->post(route('leaves.cancel', $request))->assertRedirect();

        $this->assertSame('Cancelada', $request->fresh()->estado);
        $this->assertSame(0.0, (float) $balance->fresh()->dias_pendientes);
        $this->assertSame(15.0, (float) $balance->fresh()->dias_disponibles);
    }

    private function createEmployee(array $attributes = []): Employee
    {
        return Employee::factory()->create($attributes);
    }

    private function createUserWithRole(string $roleName): User
    {
        $role = Role::query()->where('name', $roleName)->firstOrFail();
        $user = User::factory()->for($role)->create();

        if ($roleName === 'Empleado') {
            PrivacyPolicyAcceptance::query()->create([
                'user_id' => $user->id,
                'policy_version' => (string) config('privacy.policy_version'),
                'policy_text' => (string) config('privacy.policy_text'),
                'accepted_at' => now(),
            ]);
        }

        return $user;
    }

    private function acceptPrivacyPolicy(User $user): void
    {
        if ($user->privacyPolicyAcceptances()->exists()) {
            return;
        }

        $this->actingAs($user)
            ->post(route('privacy-policy.accept'), ['accepted' => true])
            ->assertRedirect(route('leaves.my'));
    }
}
