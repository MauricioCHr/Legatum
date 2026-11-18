<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EvaluationCriteria;
use App\Models\EvaluationPeriod;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\PayrollNovelty;
use App\Models\PayrollNoveltyType;
use App\Models\PayrollPeriod;
use App\Models\PerformanceEvaluation;
use App\Models\Position;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\ContractTypeSeeder;
use Database\Seeders\EvaluationCriteriaSeeder;
use Database\Seeders\LeaveTypeSeeder;
use Database\Seeders\PayrollNoveltyTypeSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ComprehensiveSystemAuditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(ContractTypeSeeder::class);
        $this->seed(LeaveTypeSeeder::class);
        $this->seed(PayrollNoveltyTypeSeeder::class);
        $this->seed(EvaluationCriteriaSeeder::class);
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

    /**
     * 1. VERIFICACIÓN DE LOS SEIS ROLES Y SEGURIDAD HTTP
     */
    public function test_audit_six_roles_access_and_strict_security_boundaries(): void
    {
        $admin = $this->createUserWithRole('Administrador');
        $th = $this->createUserWithRole('Talento Humano');
        $jefe = $this->createUserWithRole('Jefe de área');
        $nomina = $this->createUserWithRole('Nómina');
        $gerencia = $this->createUserWithRole('Gerencia');
        $empleadoUser = $this->createUserWithRole('Empleado');

        $dept = Department::create(['nombre' => 'Comercial', 'is_active' => true]);
        $empleado = $this->createEmployee(['user_id' => $empleadoUser->id, 'departamento_id' => $dept->id]);
        $otherEmployee = $this->createEmployee();

        // 1.1 Administrador
        $this->actingAs($admin)->get(route('dashboard'))->assertOk();
        $this->actingAs($admin)->get(route('users.index'))->assertOk();
        $this->actingAs($admin)->get(route('catalogs.index'))->assertOk();
        $this->actingAs($admin)->get(route('departments.index'))->assertOk();

        // 1.2 Talento Humano
        $this->actingAs($th)->get(route('dashboard'))->assertOk();
        $this->actingAs($th)->get(route('employees.index'))->assertOk();
        $this->actingAs($th)->get(route('contracts.index'))->assertOk();
        $this->actingAs($th)->get(route('attendance.index'))->assertOk();
        $this->actingAs($th)->get(route('leaves.index'))->assertOk();
        $this->actingAs($th)->get(route('payroll.index'))->assertOk();
        $this->actingAs($th)->get(route('reports.index'))->assertOk();
        $this->actingAs($th)->get(route('users.index'))->assertForbidden(); // Cannot access user management

        // 1.3 Jefe de área
        $jefeEmp = $this->createEmployee(['user_id' => $jefe->id, 'departamento_id' => $dept->id]);
        $dept->update(['jefe_id' => $jefeEmp->id]);
        $this->actingAs($jefe)->get(route('dashboard'))->assertOk();
        $this->actingAs($jefe)->get(route('employees.team'))->assertOk();
        $this->actingAs($jefe)->get(route('attendance.team'))->assertOk();
        $this->actingAs($jefe)->get(route('leaves.team'))->assertOk();
        $this->actingAs($jefe)->get(route('users.index'))->assertForbidden();
        $this->actingAs($jefe)->get(route('payroll.index'))->assertForbidden(); // Cannot view payroll novelties

        // 1.4 Nómina
        $this->actingAs($nomina)->get(route('dashboard'))->assertOk();
        $this->actingAs($nomina)->get(route('payroll.index'))->assertOk();
        $this->actingAs($nomina)->get(route('payroll.consolidated'))->assertOk();
        $this->actingAs($nomina)->get(route('users.index'))->assertForbidden();
        $this->actingAs($nomina)->get(route('attendance.index'))->assertForbidden();

        // 1.5 Gerencia
        $this->actingAs($gerencia)->get(route('dashboard'))->assertOk();
        $this->actingAs($gerencia)->get(route('employees.index'))->assertOk();
        $this->actingAs($gerencia)->get(route('contracts.index'))->assertOk();
        $this->actingAs($gerencia)->get(route('evaluations.index'))->assertOk();
        $this->actingAs($gerencia)->get(route('reports.index'))->assertOk();
        $this->actingAs($gerencia)->get(route('users.index'))->assertForbidden();
        $this->actingAs($gerencia)->post(route('employees.store'), [])->assertForbidden(); // Strictly read-only

        // 1.6 Empleado
        $this->actingAs($empleadoUser)->get(route('dashboard'))->assertForbidden();
        $this->actingAs($empleadoUser)->get(route('employees.me'))->assertOk();
        $this->actingAs($empleadoUser)->get(route('contracts.my'))->assertOk();
        $this->actingAs($empleadoUser)->get(route('attendance.my'))->assertOk();
        $this->actingAs($empleadoUser)->get(route('leaves.my'))->assertOk();
        $this->actingAs($empleadoUser)->get(route('evaluations.my'))->assertOk();

        // Empleado CANNOT view others or administrative endpoints
        $this->actingAs($empleadoUser)->get(route('employees.index'))->assertForbidden();
        $this->actingAs($empleadoUser)->get(route('contracts.index'))->assertForbidden();
        $this->actingAs($empleadoUser)->get(route('reports.index'))->assertForbidden();
        $this->actingAs($empleadoUser)->get(route('employees.show', $otherEmployee))->assertForbidden();
    }

    /**
     * 2. VERIFICACIÓN DE EMPLEADOS Y CONTRATOS
     */
    public function test_audit_employee_and_contract_lifecycle(): void
    {
        $th = $this->createUserWithRole('Talento Humano');
        $dept = Department::create(['nombre' => 'Logística', 'is_active' => true]);
        $position = Position::create(['nombre' => 'Auxiliar de Bodega', 'departamento_id' => $dept->id, 'salario_base' => 1500000]);
        $user = User::factory()->create(['name' => 'Carlos Andrés Gómez']);
        $contractType = ContractType::first();

        // 2.1 Registro de empleado
        $response = $this->actingAs($th)->post(route('employees.store'), [
            'user_id' => $user->id,
            'departamento_id' => $dept->id,
            'cargo_id' => $position->id,
            'tipo_documento' => 'CC',
            'numero_documento' => '1085123456',
            'telefono' => '3157894561',
            'direccion' => 'Carrera 6 # 14-25, Ipiales',
            'fecha_nacimiento' => '1995-04-12',
            'fecha_contratacion' => '2026-01-15',
            'estado' => 'Activo',
        ]);
        $response->assertRedirect();
        $this->assertDatabaseHas('employees', ['numero_documento' => '1085123456']);

        $employee = Employee::where('numero_documento', '1085123456')->first();
        $this->assertNotNull($employee);
        $this->assertEquals($user->id, $employee->user_id);
        $response->assertRedirect(route('employees.show', $employee));

        // 2.2 Desactivación de empleado (preserva histórico)
        $this->actingAs($th)->patch(route('employees.status', $employee), [
            'estado' => 'Inactivo',
        ])->assertRedirect();
        $employee->refresh();
        $this->assertEquals('Inactivo', $employee->estado);

        // Reactivar
        $this->actingAs($th)->patch(route('employees.status', $employee), [
            'estado' => 'Activo',
        ]);
        $employee->refresh();
        $this->assertEquals('Activo', $employee->estado);

        // 2.3 Registro de contrato inicial
        $this->actingAs($th)->post(route('contracts.store'), [
            'employee_id' => $employee->id,
            'contract_type_id' => $contractType->id,
            'salario' => 1600000,
            'fecha_inicio' => '2026-01-15',
            'fecha_fin' => '2026-07-15',
            'estado' => 'Vigente',
        ])->assertRedirect();

        $contract = Contract::where('employee_id', $employee->id)->first();
        $this->assertNotNull($contract);
        $this->assertStringStartsWith('CT-', $contract->numero_contrato);

        // 2.4 Renovación de contrato (encadenamiento histórico)
        $this->actingAs($th)->post(route('contracts.renew', $contract), [
            'contract_type_id' => $contractType->id,
            'salario' => 1750000,
            'fecha_inicio' => '2026-07-16',
            'fecha_fin' => '2027-01-16',
            'observaciones' => 'Renovación por excelente desempeño',
        ])->assertRedirect();

        $contract->refresh();
        $this->assertEquals('Renovado', $contract->estado);

        $renewed = Contract::where('parent_contract_id', $contract->id)->first();
        $this->assertNotNull($renewed);
        $this->assertEquals('Vigente', $renewed->estado);
        $this->assertEquals(1750000, (float) $renewed->salario);
        $this->assertEquals($contract->id, $renewed->parent_contract_id);

        // 2.5 Anulación de contrato
        $this->actingAs($th)->patch(route('contracts.annul', $renewed), [
            'motivo_anulacion' => 'Error administrativo en renovación',
        ])->assertRedirect();
        $renewed->refresh();
        $this->assertEquals('Anulado', $renewed->estado);
    }

    /**
     * 3. VERIFICACIÓN DE CONTROL DE ASISTENCIA
     */
    public function test_audit_attendance_clocking_calculations_and_unique_constraint(): void
    {
        $employeeUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $employeeUser->id]);
        $today = Carbon::today()->toDateString();

        // 3.1 Marcación de Entrada con cálculo de minutos de retardo
        $this->actingAs($employeeUser)->post(route('attendance.clock'))->assertRedirect();

        $attendance = Attendance::where('employee_id', $employee->id)->where('fecha', $today)->first();
        $this->assertNotNull($attendance);
        $this->assertNotNull($attendance->hora_entrada);
        $this->assertNull($attendance->hora_salida);

        // 3.2 Marcación de Salida
        $this->actingAs($employeeUser)->post(route('attendance.clock'))->assertRedirect();
        $attendance->refresh();
        $this->assertNotNull($attendance->hora_salida);

        // 3.3 Intento de tercera marcación en el mismo día (bloqueado)
        $this->actingAs($employeeUser)->post(route('attendance.clock'))->assertSessionHas('error');

        // 3.4 Restricción UNIQUE(employee_id, fecha): intento de insertar duplicado en BD lanza excepción de integridad
        $this->expectException(QueryException::class);
        Attendance::create([
            'employee_id' => $employee->id,
            'fecha' => $today,
            'hora_entrada' => '09:00:00',
            'estado' => 'Presente',
        ]);
    }

    /**
     * 4. VERIFICACIÓN DE VACACIONES, SALDOS Y REGLAS DE NEGOCIO (CST COLOMBIA)
     */
    public function test_audit_vacations_balances_and_attendance_synchronization(): void
    {
        $employeeUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $employeeUser->id]);
        $th = $this->createUserWithRole('Talento Humano');

        // 4.1 Balance inicial: 15 días ganados por año laborado (Art. 186 Código Sustantivo del Trabajo)
        $balance = $employee->getOrCreateVacationBalance();
        $this->assertEquals(15.0, (float) $balance->dias_disponibles);

        $vacationType = LeaveType::where('descuenta_vacaciones', true)->first();

        // 4.2 Radicación de solicitud de 5 días
        $start = Carbon::today()->addWeek()->startOfWeek(); // lunes
        $end = (clone $start)->addDays(4); // viernes (5 días)

        $response = $this->actingAs($employeeUser)->post(route('leaves.store'), [
            'leave_type_id' => $vacationType->id,
            'fecha_inicio' => $start->toDateString(),
            'fecha_fin' => $end->toDateString(),
            'motivo' => 'Vacaciones familiares anuales',
        ]);
        $response->assertRedirect();

        $leaveRequest = LeaveRequest::where('employee_id', $employee->id)->first();
        $this->assertNotNull($leaveRequest);
        $this->assertEquals(5.0, (float) $leaveRequest->dias_solicitados);

        // 4.3 Días pasan a pendientes, disponibles disminuyen a 10 (sin descontar definitivamente aún)
        $balance->refresh();
        $this->assertEquals(5.0, (float) $balance->dias_pendientes);
        $this->assertEquals(10.0, (float) $balance->dias_disponibles);
        $this->assertEquals(0.0, (float) $balance->dias_disfrutados);

        // 4.4 Prevención de solicitud superpuesta
        $overlapResponse = $this->actingAs($employeeUser)->post(route('leaves.store'), [
            'leave_type_id' => $vacationType->id,
            'fecha_inicio' => (clone $start)->addDay()->toDateString(),
            'fecha_fin' => (clone $end)->addDay()->toDateString(),
            'motivo' => 'Intento superpuesto',
        ]);
        $overlapResponse->assertSessionHas('error');

        // 4.5 Aprobación por Talento Humano: NUNCA descuenta dos veces
        $this->actingAs($th)->post(route('leaves.approve', $leaveRequest), [
            'observaciones_respuesta' => 'Aprobado conforme al cronograma',
        ])->assertRedirect();

        $leaveRequest->refresh();
        $balance->refresh();
        $this->assertEquals('Aprobada', $leaveRequest->estado);
        $this->assertEquals(0.0, (float) $balance->dias_pendientes);
        $this->assertEquals(5.0, (float) $balance->dias_disfrutados);
        $this->assertEquals(10.0, (float) $balance->dias_disponibles); // Exactamente 10 días, sin doble descuento!

        // 4.6 Sincronización automática con la tabla de Asistencia para días hábiles
        $attendanceDays = Attendance::where('employee_id', $employee->id)
            ->where('estado', 'Vacaciones')
            ->count();
        $this->assertEquals(5, $attendanceDays);
    }

    /**
     * 5. VERIFICACIÓN DE NOVEDADES DE NÓMINA Y CONSOLIDACIÓN
     */
    public function test_audit_payroll_novelties_and_period_closing(): void
    {
        $th = $this->createUserWithRole('Talento Humano');
        $nomina = $this->createUserWithRole('Nómina');
        $employee = $this->createEmployee();

        $period = PayrollPeriod::create([
            'codigo' => '2026-11-Q1',
            'nombre' => 'Noviembre 2026 Quincena 1',
            'fecha_inicio' => '2026-11-01',
            'fecha_fin' => '2026-11-15',
            'estado' => 'Abierto',
        ]);

        $devengoType = PayrollNoveltyType::where('tipo', 'Devengo')->first();

        // 5.1 Registro de novedad en período abierto
        $this->actingAs($th)->post(route('payroll.store'), [
            'employee_id' => $employee->id,
            'payroll_period_id' => $period->id,
            'payroll_novelty_type_id' => $devengoType->id,
            'valor' => 120000,
            'cantidad' => 1,
            'descripcion' => 'Bonificación por cumplimiento de ventas',
        ])->assertRedirect();

        $novelty = PayrollNovelty::where('employee_id', $employee->id)->first();
        $this->assertNotNull($novelty);
        $this->assertEquals('Activa', $novelty->estado);

        // 5.2 Consulta desde el rol Nómina (Lectura permitida)
        $this->actingAs($nomina)->get(route('payroll.index', ['period_id' => $period->id]))->assertOk();
        $this->actingAs($nomina)->get(route('payroll.consolidated', ['period_id' => $period->id]))->assertOk();

        // 5.3 Rol Nómina NO puede anular ni consolidar (Prohibición estricta)
        $this->actingAs($nomina)->patch(route('payroll.annul', $novelty), ['motivo_anulacion' => 'Intento nómina'])->assertForbidden();
        $this->actingAs($nomina)->post(route('payroll.consolidate', $period))->assertForbidden();

        // 5.4 Consolidación por Talento Humano
        $this->actingAs($th)->post(route('payroll.consolidate', $period))->assertRedirect();
        $period->refresh();
        $this->assertEquals('Consolidado', $period->estado);

        // 5.5 Bloqueo de adición o anulación posterior al cierre
        $this->actingAs($th)->post(route('payroll.store'), [
            'employee_id' => $employee->id,
            'payroll_period_id' => $period->id,
            'payroll_novelty_type_id' => $devengoType->id,
            'valor' => 50000,
            'descripcion' => 'Intento extemporáneo',
        ])->assertSessionHas('error');

        $this->actingAs($th)->patch(route('payroll.annul', $novelty), [
            'motivo_anulacion' => 'Intento anular cerrado',
        ])->assertSessionHas('error');
    }

    /**
     * 6. VERIFICACIÓN DE EVALUACIONES DE DESEMPEÑO Y PONDERACIONES
     */
    public function test_audit_performance_evaluations_and_criteria_weights(): void
    {
        // 6.1 Verificar que la sumatoria de ponderaciones de criterios sea exactamente 100%
        $criteria = EvaluationCriteria::where('is_active', true)->get();
        $totalWeight = $criteria->sum('peso');
        $this->assertEquals(100.0, (float) $totalWeight);

        $th = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee();

        $period = EvaluationPeriod::create([
            'nombre' => 'Evaluación Semestre II',
            'fecha_inicio' => '2026-11-01',
            'fecha_fin' => '2026-11-30',
            'estado' => 'Abierto',
        ]);

        $eval = PerformanceEvaluation::create([
            'evaluation_period_id' => $period->id,
            'employee_id' => $employee->id,
            'estado' => 'Pendiente',
        ]);

        // 6.2 Calificar con notas específicas
        $scoresPayload = $criteria->map(fn ($c) => [
            'criteria_id' => $c->id,
            'calificacion' => 4.0, // Calificación homogénea de 4.0
            'comentarios' => "Desempeño en {$c->nombre}",
        ])->all();

        $this->actingAs($th)->post(route('evaluations.evaluate', $eval), [
            'scores' => $scoresPayload,
            'observaciones' => 'Buen desempeño semestral',
            'compromisos_mejora' => 'Fortalecer comunicación',
        ])->assertRedirect();

        $eval->refresh();
        $this->assertEquals('Completada', $eval->estado);
        $this->assertEquals(4.00, (float) $eval->calificacion_final);
    }

    /**
     * 7. VERIFICACIÓN DE REPORTES Y DASHBOARD DINÁMICO
     */
    public function test_audit_reports_and_real_mysql_dashboard_calculation(): void
    {
        $admin = $this->createUserWithRole('Administrador');
        $dept = Department::create(['nombre' => 'Mercadeo', 'is_active' => true]);
        $this->createEmployee(['departamento_id' => $dept->id, 'estado' => 'Activo']);

        // 7.1 Dashboard calcula métricas dinámicas
        $response = $this->actingAs($admin)->get(route('dashboard'));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Inicio')
            ->has('dashboard.metrics')
            ->has('dashboard.departments')
            ->has('dashboard.employeeStatuses')
        );

        // 7.2 Exportación de reportes a CSV con cabeceras correctas
        $export = $this->actingAs($admin)->get(route('reports.export', [
            'report_type' => 'employees_status',
        ]));
        $export->assertOk();
        $export->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }
}
