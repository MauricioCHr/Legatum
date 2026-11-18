<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EvaluationPeriod;
use App\Models\GeneratedReport;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\PayrollNovelty;
use App\Models\PayrollNoveltyType;
use App\Models\PayrollPeriod;
use App\Models\PerformanceEvaluation;
use App\Models\Position;
use App\Models\PrivacyPolicyAcceptance;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\ContractTypeSeeder;
use Database\Seeders\LeaveTypeSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReportManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(ContractTypeSeeder::class);
        $this->seed(LeaveTypeSeeder::class);
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

    public function test_talento_humano_can_view_reports(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');
        $this->createEmployee(['estado' => 'Activo']);

        $response = $this->actingAs($thUser)->get(route('reports.index', [
            'report_type' => 'employees_status',
        ]));

        $response->assertOk();
    }

    public function test_nomina_can_view_only_payroll_report_options(): void
    {
        $nominaUser = $this->createUserWithRole('Nómina');

        $this->actingAs($nominaUser)
            ->get(route('reports.index', ['report_type' => 'payroll_by_period']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('reportTypes.payroll_by_period')
                ->missing('reportTypes.employees_status'));

        $this->actingAs($nominaUser)->get(route('reports.export', [
            'report_type' => 'employees_status',
        ]))->assertForbidden();
    }

    public function test_talento_humano_can_export_csv(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee(['estado' => 'Activo']);

        $response = $this->actingAs($thUser)->get(route('reports.export', [
            'report_type' => 'employees_status',
        ]));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString($employee->user->name, $response->streamedContent());
    }

    public function test_talento_humano_can_generate_and_download_a_pdf_report(): void
    {
        Storage::fake('local');
        $thUser = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee(['estado' => 'Activo']);

        $response = $this->actingAs($thUser)->post(route('reports.generate'), [
            'report_type' => 'employees_status',
            'employee_id' => $employee->id,
        ]);

        $response->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $generatedReport = GeneratedReport::query()->sole();
        $this->assertSame('employees_status', $generatedReport->report_type);
        $this->assertSame('Talento Humano', $generatedReport->generated_by_role);
        $this->assertSame(1, $generatedReport->rows_count);
        Storage::disk('local')->assertExists($generatedReport->file_path);
        $this->assertStringStartsWith('%PDF-', $response->streamedContent());
    }

    public function test_generated_reports_are_listed_and_regeneration_uses_current_database_data(): void
    {
        Storage::fake('local');
        $thUser = $this->createUserWithRole('Talento Humano');
        $this->createEmployee(['estado' => 'Activo']);

        $this->actingAs($thUser)->post(route('reports.generate'), [
            'report_type' => 'employees_status',
        ])->assertOk();
        $originalReport = GeneratedReport::query()->sole();

        $this->createEmployee(['estado' => 'Inactivo']);

        $this->actingAs($thUser)
            ->get(route('reports.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('reportHistory.data.0.id', $originalReport->id)
                ->where('reportHistory.data.0.rows_count', 1));

        $download = $this->actingAs($thUser)->get(route('reports.download', $originalReport));
        $download->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $download->streamedContent());

        $this->actingAs($thUser)
            ->post(route('reports.regenerate', $originalReport))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $regeneratedReport = GeneratedReport::query()->where('id', '!=', $originalReport->id)->sole();
        $this->assertSame($originalReport->id, $regeneratedReport->regenerated_from_id);
        $this->assertSame(2, $regeneratedReport->rows_count);
        Storage::disk('local')->assertExists($regeneratedReport->file_path);
    }

    public function test_area_leads_cannot_access_generated_reports_from_other_departments(): void
    {
        Storage::fake('local');
        $humanResourcesUser = $this->createUserWithRole('Talento Humano');
        $otherDepartment = Department::create(['nombre' => 'Operaciones', 'is_active' => true]);
        $this->createEmployee(['departamento_id' => $otherDepartment->id]);

        $this->actingAs($humanResourcesUser)->post(route('reports.generate'), [
            'report_type' => 'employees_status',
            'department_id' => $otherDepartment->id,
        ])->assertOk();
        $generatedReport = GeneratedReport::query()->sole();

        $managedDepartment = Department::create(['nombre' => 'Comercial', 'is_active' => true]);
        $jefeUser = $this->createUserWithRole('Jefe de área');
        $jefeEmployee = $this->createEmployee([
            'user_id' => $jefeUser->id,
            'departamento_id' => $managedDepartment->id,
        ]);
        $managedDepartment->update(['jefe_id' => $jefeEmployee->id]);

        $this->actingAs($jefeUser)
            ->get(route('reports.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('reportHistory.data', 0));

        $this->actingAs($jefeUser)->get(route('reports.download', $generatedReport))->assertNotFound();
        $this->actingAs($jefeUser)->post(route('reports.regenerate', $generatedReport))->assertNotFound();
    }

    public function test_generated_pdfs_cannot_cross_role_sensitivity_boundaries(): void
    {
        Storage::fake('local');
        $admin = $this->createUserWithRole('Administrador');
        $department = Department::create(['nombre' => 'Finanzas', 'is_active' => true]);
        $employee = $this->createEmployee(['departamento_id' => $department->id]);
        $contractType = ContractType::query()->where('codigo', 'termino-fijo')->firstOrFail();

        Contract::query()->create([
            'employee_id' => $employee->id,
            'contract_type_id' => $contractType->id,
            'numero_contrato' => 'CT-ROLE-BOUNDARY',
            'salario' => 5000000,
            'fecha_inicio' => now()->subMonth()->toDateString(),
            'estado' => 'Vigente',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)->post(route('reports.generate'), [
            'report_type' => 'contracts_active',
        ])->assertOk();
        $salaryReport = GeneratedReport::query()->where('report_type', 'contracts_active')->sole();

        $gerencia = $this->createUserWithRole('Gerencia');
        $this->actingAs($gerencia)
            ->get(route('reports.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('reportHistory.data', 0));
        $this->actingAs($gerencia)->get(route('reports.download', $salaryReport))->assertNotFound();
        $this->actingAs($gerencia)->post(route('reports.regenerate', $salaryReport))->assertNotFound();

        $period = PayrollPeriod::query()->create([
            'codigo' => 'ROLE-BOUNDARY',
            'nombre' => 'Período de prueba de permisos',
            'fecha_inicio' => now()->startOfMonth()->toDateString(),
            'fecha_fin' => now()->endOfMonth()->toDateString(),
            'estado' => 'Abierto',
        ]);
        $noveltyType = PayrollNoveltyType::query()->create([
            'nombre' => 'Bono confidencial',
            'codigo' => 'ROLE-BOUNDARY',
            'tipo' => 'Devengo',
            'unidad_medida' => 'Valor',
            'is_active' => true,
        ]);
        PayrollNovelty::query()->create([
            'employee_id' => $employee->id,
            'payroll_novelty_type_id' => $noveltyType->id,
            'payroll_period_id' => $period->id,
            'valor' => 250000,
            'cantidad' => 1,
            'descripcion' => 'Novedad de prueba',
            'estado' => 'Activa',
            'registrado_por' => $admin->id,
        ]);

        $this->actingAs($admin)->post(route('reports.generate'), [
            'report_type' => 'leaves_payroll',
            'department_id' => $department->id,
            'period_id' => $period->id,
        ])->assertOk();
        $payrollReport = GeneratedReport::query()->where('report_type', 'leaves_payroll')->sole();

        $jefe = $this->createUserWithRole('Jefe de área');
        $jefeEmployee = $this->createEmployee([
            'user_id' => $jefe->id,
            'departamento_id' => $department->id,
        ]);
        $department->update(['jefe_id' => $jefeEmployee->id]);

        $this->actingAs($jefe)
            ->get(route('reports.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('reportHistory.data', 0));
        $this->actingAs($jefe)->get(route('reports.download', $payrollReport))->assertNotFound();
        $this->actingAs($jefe)->post(route('reports.regenerate', $payrollReport))->assertNotFound();
    }

    public function test_legacy_pdf_without_recorded_role_is_not_accessible(): void
    {
        Storage::fake('local');
        $admin = $this->createUserWithRole('Administrador');
        $legacyReport = GeneratedReport::query()->create([
            'user_id' => $admin->id,
            'report_type' => 'employees_status',
            'title' => 'Reporte histórico sin rol',
            'filters' => ['report_type' => 'employees_status'],
            'file_path' => 'reports/legacy.pdf',
            'rows_count' => 1,
        ]);
        Storage::disk('local')->put($legacyReport->file_path, '%PDF-legacy');

        $this->actingAs($admin)
            ->get(route('reports.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('reportHistory.data', 0));
        $this->actingAs($admin)->get(route('reports.download', $legacyReport))->assertNotFound();
        $this->actingAs($admin)->post(route('reports.regenerate', $legacyReport))->assertNotFound();
    }

    public function test_jefe_de_area_reports_are_scoped_to_department(): void
    {
        $dept1 = Department::create(['nombre' => 'Comercial', 'is_active' => true]);
        $dept2 = Department::create(['nombre' => 'Bodega', 'is_active' => true]);

        $jefeUser = $this->createUserWithRole('Jefe de área');
        $jefeEmployee = $this->createEmployee([
            'user_id' => $jefeUser->id,
            'departamento_id' => $dept1->id,
        ]);
        $dept1->update(['jefe_id' => $jefeEmployee->id]);

        $emp1 = $this->createEmployee(['departamento_id' => $dept1->id]);
        $emp2 = $this->createEmployee(['departamento_id' => $dept2->id]);

        $response = $this->actingAs($jefeUser)->get(route('reports.index', [
            'report_type' => 'employees_status',
        ]));

        $response->assertOk();
    }

    public function test_jefe_without_a_department_cannot_view_or_export_reports(): void
    {
        $jefeUser = $this->createUserWithRole('Jefe de área');

        $this->actingAs($jefeUser)->get(route('reports.index'))->assertForbidden();
        $this->actingAs($jefeUser)->get(route('reports.export'))->assertForbidden();
    }

    public function test_employee_filter_is_applied_to_department_and_position_reports(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');
        $department = Department::create(['nombre' => 'Tecnología', 'is_active' => true]);
        $firstPosition = Position::query()->create([
            'departamento_id' => $department->id,
            'nombre' => 'Desarrollador',
            'is_active' => true,
        ]);
        $secondPosition = Position::query()->create([
            'departamento_id' => $department->id,
            'nombre' => 'Analista',
            'is_active' => true,
        ]);
        $employee = $this->createEmployee([
            'departamento_id' => $department->id,
            'cargo_id' => $firstPosition->id,
        ]);
        $this->createEmployee([
            'departamento_id' => $department->id,
            'cargo_id' => $secondPosition->id,
        ]);

        $this->actingAs($thUser)
            ->get(route('reports.index', [
                'report_type' => 'employees_by_department',
                'employee_id' => $employee->id,
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('reportData.rows.0.total_colaboradores', 1)
                ->where('reportData.summary.Total Colaboradores', 1));

        $this->actingAs($thUser)
            ->get(route('reports.index', [
                'report_type' => 'employees_by_position',
                'employee_id' => $employee->id,
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('reportData.rows', 1)
                ->where('reportData.rows.0.cargo', 'Desarrollador')
                ->where('reportData.rows.0.total_ocupantes', 1));
    }

    public function test_attendance_report_applies_the_selected_date_range(): void
    {
        $this->travelTo(now()->setDate(2026, 11, 16)->setTime(9, 0));

        $thUser = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee();
        Attendance::query()->create([
            'employee_id' => $employee->id,
            'fecha' => '2026-11-10',
            'estado' => 'Presente',
        ]);
        Attendance::query()->create([
            'employee_id' => $employee->id,
            'fecha' => '2026-12-01',
            'estado' => 'Presente',
        ]);

        $this->actingAs($thUser)
            ->get(route('reports.index', [
                'report_type' => 'attendance_general',
                'date_from' => '2026-11-01',
                'date_to' => '2026-11-30',
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('reportData.rows', 1)
                ->where('reportData.rows.0.fecha', '10/11/2026'));
    }

    public function test_unknown_report_type_returns_validation_error(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');

        $this->actingAs($thUser)
            ->get(route('reports.index', ['report_type' => 'unknown']))
            ->assertSessionHasErrors('report_type');
    }

    public function test_report_rejects_an_invalid_date_range(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');

        $this->actingAs($thUser)
            ->get(route('reports.index', [
                'report_type' => 'attendance_general',
                'date_from' => '2026-11-30',
                'date_to' => '2026-11-01',
            ]))
            ->assertSessionHasErrors('date_to');
    }

    public function test_every_report_type_renders_real_rows_and_exports_a_csv(): void
    {
        $this->travelTo(now()->setDate(2026, 11, 16)->setTime(9, 0));

        $thUser = $this->createUserWithRole('Talento Humano');
        $department = Department::create(['nombre' => 'Operaciones', 'is_active' => true]);
        $position = Position::query()->create([
            'departamento_id' => $department->id,
            'nombre' => 'Analista',
            'is_active' => true,
        ]);
        $employee = $this->createEmployee([
            'departamento_id' => $department->id,
            'cargo_id' => $position->id,
            'estado' => 'Activo',
        ]);

        $fixedTermType = ContractType::query()->where('codigo', 'termino-fijo')->firstOrFail();
        Contract::query()->create([
            'employee_id' => $employee->id,
            'contract_type_id' => $fixedTermType->id,
            'numero_contrato' => 'CT-REPORT-ACTIVE',
            'salario' => 2000000,
            'fecha_inicio' => '2026-01-01',
            'fecha_fin' => '2026-11-26',
            'estado' => 'Vigente',
            'created_by' => $thUser->id,
        ]);
        Contract::query()->create([
            'employee_id' => $employee->id,
            'contract_type_id' => $fixedTermType->id,
            'numero_contrato' => 'CT-REPORT-EXPIRED',
            'salario' => 1800000,
            'fecha_inicio' => '2025-01-01',
            'fecha_fin' => '2025-12-31',
            'estado' => 'Vencido',
            'created_by' => $thUser->id,
        ]);

        Attendance::query()->create([
            'employee_id' => $employee->id,
            'fecha' => '2026-11-16',
            'estado' => 'Retardo',
            'minutos_retardo' => 10,
        ]);
        Attendance::query()->create([
            'employee_id' => $employee->id,
            'fecha' => '2026-11-17',
            'estado' => 'Ausente',
        ]);

        $employee->getOrCreateVacationBalance();

        $vacationType = LeaveType::query()->where('codigo', 'vacaciones')->firstOrFail();
        LeaveRequest::query()->create([
            'employee_id' => $employee->id,
            'leave_type_id' => $vacationType->id,
            'fecha_inicio' => '2026-12-01',
            'fecha_fin' => '2026-12-02',
            'dias_solicitados' => 2,
            'motivo' => 'Vacaciones programadas',
            'estado' => 'Pendiente',
        ]);
        LeaveRequest::query()->create([
            'employee_id' => $employee->id,
            'leave_type_id' => $vacationType->id,
            'fecha_inicio' => '2026-10-01',
            'fecha_fin' => '2026-10-02',
            'dias_solicitados' => 2,
            'motivo' => 'Permiso ya resuelto',
            'estado' => 'Aprobada',
            'aprobado_por' => $thUser->id,
            'fecha_respuesta' => now(),
            'observaciones_respuesta' => 'Aprobado',
        ]);

        $payrollPeriod = PayrollPeriod::query()->create([
            'codigo' => '2026-11-Q2',
            'nombre' => 'Nómina noviembre segunda quincena',
            'fecha_inicio' => '2026-11-16',
            'fecha_fin' => '2026-11-30',
            'estado' => 'Abierto',
        ]);
        $noveltyType = PayrollNoveltyType::query()->create([
            'nombre' => 'Bono',
            'codigo' => 'BONO-REPORTES',
            'tipo' => 'Devengo',
            'unidad_medida' => 'Valor',
            'is_active' => true,
        ]);
        PayrollNovelty::query()->create([
            'employee_id' => $employee->id,
            'payroll_novelty_type_id' => $noveltyType->id,
            'payroll_period_id' => $payrollPeriod->id,
            'valor' => 100000,
            'cantidad' => 1,
            'descripcion' => 'Bono de prueba del reporte',
            'estado' => 'Activa',
            'registrado_por' => $thUser->id,
        ]);

        $evaluationPeriod = EvaluationPeriod::query()->create([
            'nombre' => 'Evaluación 2026',
            'fecha_inicio' => '2026-01-01',
            'fecha_fin' => '2026-12-31',
            'estado' => 'Cerrado',
            'created_by' => $thUser->id,
        ]);
        PerformanceEvaluation::query()->create([
            'evaluation_period_id' => $evaluationPeriod->id,
            'employee_id' => $employee->id,
            'evaluator_id' => $thUser->id,
            'calificacion_final' => 4.5,
            'estado' => 'Completada',
            'fecha_evaluacion' => now(),
        ]);

        $reportTypes = [
            'employees_status',
            'employees_by_department',
            'employees_by_position',
            'talent_overview',
            'contracts_history',
            'contracts_by_type',
            'contracts_active',
            'contracts_expiring',
            'contracts_expired',
            'attendance_general',
            'attendance_by_employee',
            'absenteeism',
            'vacation_balances',
            'leaves_pending',
            'leaves_approved_rejected',
            'payroll_by_period',
            'payroll_by_employee',
            'evaluations_results',
        ];

        foreach ($reportTypes as $reportType) {
            $this->actingAs($thUser)
                ->get(route('reports.index', [
                    'report_type' => $reportType,
                    'date_from' => '2026-11-01',
                    'date_to' => '2026-11-30',
                    'period_id' => $payrollPeriod->id,
                ]))
                ->assertOk()
                ->assertInertia(fn ($page) => $page->has('reportData.rows.0.id'));

            $export = $this->actingAs($thUser)->get(route('reports.export', [
                'report_type' => $reportType,
                'date_from' => '2026-11-01',
                'date_to' => '2026-11-30',
                'period_id' => $payrollPeriod->id,
            ]));

            $export->assertOk()
                ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
            $csv = $export->streamedContent();
            $this->assertStringStartsWith(chr(0xEF).chr(0xBB).chr(0xBF), $csv, "CSV for {$reportType} is missing the UTF-8 BOM.");
            $this->assertGreaterThanOrEqual(2, count(preg_split('/\r\n|\r|\n/', trim(substr($csv, 3)))), "CSV for {$reportType} contains no data row.");
        }
    }

    public function test_regular_employee_cannot_access_reports(): void
    {
        $empUser = $this->createUserWithRole('Empleado');

        $response = $this->actingAs($empUser)->get(route('reports.index'));

        $response->assertForbidden();
        $this->actingAs($empUser)
            ->post(route('reports.generate'), ['report_type' => 'employees_status'])
            ->assertForbidden();
    }

    public function test_employee_document_and_leave_resolution_are_reported_with_real_model_fields(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee([
            'numero_documento' => '1020304050',
            'estado' => 'Activo',
        ]);

        $leaveType = LeaveType::query()->where('codigo', 'vacaciones')->firstOrFail();
        $leaveRequest = LeaveRequest::query()->create([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'fecha_inicio' => now()->addDays(2)->toDateString(),
            'fecha_fin' => now()->addDays(4)->toDateString(),
            'dias_solicitados' => 3,
            'motivo' => 'Vacaciones programadas',
            'estado' => 'Aprobada',
            'aprobado_por' => $thUser->id,
            'fecha_respuesta' => now(),
            'observaciones_respuesta' => 'Aprobado por Talento Humano.',
        ]);

        $response = $this->actingAs($thUser)->get(route('reports.index', [
            'report_type' => 'employees_status',
        ]));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('reportData.rows.0.documento', '1020304050')
                ->where('reportData.rows.0.estado', 'Activo'));

        $reportResponse = $this->actingAs($thUser)->get(route('reports.index', [
            'report_type' => 'leaves_approved_rejected',
        ]));

        $reportResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('reportData.rows.0.resuelto_por', $thUser->name)
                ->where('reportData.rows.0.observaciones', 'Aprobado por Talento Humano.'));

        $this->assertSame($thUser->id, $leaveRequest->fresh()->aprobado_por);
    }
}
