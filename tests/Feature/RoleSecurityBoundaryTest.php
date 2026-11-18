<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\PayrollNovelty;
use App\Models\PayrollNoveltyType;
use App\Models\PayrollPeriod;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\ContractTypeSeeder;
use Database\Seeders\LeaveTypeSeeder;
use Database\Seeders\PayrollNoveltyTypeSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleSecurityBoundaryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(ContractTypeSeeder::class);
        $this->seed(LeaveTypeSeeder::class);
        $this->seed(PayrollNoveltyTypeSeeder::class);
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

    public function test_administrador_can_manage_users_and_catalogs(): void
    {
        $admin = $this->createUserWithRole('Administrador');

        $this->actingAs($admin)->get(route('users.index'))->assertOk();
        $this->actingAs($admin)->get(route('catalogs.index'))->assertOk();
    }

    public function test_non_admin_cannot_manage_users(): void
    {
        $roles = ['Talento Humano', 'Jefe de área', 'Nómina', 'Gerencia', 'Empleado'];

        foreach ($roles as $roleName) {
            $user = $this->createUserWithRole($roleName);
            $this->actingAs($user)->get(route('users.index'))->assertForbidden();
        }
    }

    public function test_empleado_cannot_access_operational_management_routes(): void
    {
        $employeeUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $employeeUser->id]);

        $otherEmployee = $this->createEmployee();

        // Forbidden from general lists
        $this->actingAs($employeeUser)->get(route('employees.index'))->assertForbidden();
        $this->actingAs($employeeUser)->get(route('contracts.index'))->assertForbidden();
        $this->actingAs($employeeUser)->get(route('attendance.index'))->assertForbidden();
        $this->actingAs($employeeUser)->get(route('leaves.index'))->assertForbidden();
        $this->actingAs($employeeUser)->get(route('payroll.index'))->assertForbidden();
        $this->actingAs($employeeUser)->get(route('reports.index'))->assertForbidden();

        // Cannot view another employee's private profile
        $this->actingAs($employeeUser)->get(route('employees.show', $otherEmployee))->assertForbidden();

        // Can view own space
        $this->actingAs($employeeUser)->get(route('employees.me'))->assertOk();
        $this->actingAs($employeeUser)->get(route('contracts.my'))->assertOk();
        $this->actingAs($employeeUser)->get(route('attendance.my'))->assertOk();
        $this->actingAs($employeeUser)->get(route('leaves.my'))->assertOk();
    }

    public function test_gerencia_has_strict_read_only_access(): void
    {
        $gerencia = $this->createUserWithRole('Gerencia');
        $dept = Department::create(['nombre' => 'Presidencia', 'is_active' => true]);
        $emp = $this->createEmployee(['departamento_id' => $dept->id]);

        // Gerencia can read
        $this->actingAs($gerencia)->get(route('employees.index'))->assertOk();
        $this->actingAs($gerencia)->get(route('contracts.index'))->assertOk();
        $this->actingAs($gerencia)->get(route('attendance.index'))->assertForbidden();
        $this->actingAs($gerencia)->get(route('payroll.index'))->assertForbidden();
        $this->actingAs($gerencia)->get(route('payroll.consolidated'))->assertForbidden();
        $this->actingAs($gerencia)->get(route('reports.index'))->assertOk();

        // Gerencia CANNOT mutate operational data
        $this->actingAs($gerencia)->post(route('employees.store'), [])->assertForbidden();
        $this->actingAs($gerencia)->post(route('contracts.store'), [])->assertForbidden();
        $this->actingAs($gerencia)->post(route('attendance.store'), [])->assertForbidden();
        $this->actingAs($gerencia)->post(route('payroll.store'), [])->assertForbidden();
    }

    public function test_individual_workspaces_are_only_available_to_employees(): void
    {
        $roles = ['Administrador', 'Talento Humano', 'Jefe de área', 'Nómina', 'Gerencia'];

        foreach ($roles as $roleName) {
            $user = $this->createUserWithRole($roleName);

            $this->actingAs($user)->get(route('contracts.my'))->assertForbidden();
            $this->actingAs($user)->get(route('attendance.my'))->assertForbidden();
            $this->actingAs($user)->post(route('attendance.clock'))->assertForbidden();
            $this->actingAs($user)->get(route('leaves.my'))->assertForbidden();
            $this->actingAs($user)->get(route('evaluations.my'))->assertForbidden();
        }
    }

    public function test_jefe_de_area_cannot_approve_leaves_outside_department(): void
    {
        $dept1 = Department::create(['nombre' => 'Operaciones', 'is_active' => true]);
        $dept2 = Department::create(['nombre' => 'Finanzas', 'is_active' => true]);

        $jefeUser = $this->createUserWithRole('Jefe de área');
        $jefeEmp = $this->createEmployee(['user_id' => $jefeUser->id, 'departamento_id' => $dept1->id]);
        $dept1->update(['jefe_id' => $jefeEmp->id]);

        $otherEmp = $this->createEmployee(['departamento_id' => $dept2->id]);
        $leaveType = LeaveType::first();

        $foreignLeaveRequest = LeaveRequest::create([
            'employee_id' => $otherEmp->id,
            'leave_type_id' => $leaveType->id,
            'fecha_inicio' => Carbon::tomorrow()->toDateString(),
            'fecha_fin' => Carbon::tomorrow()->addDays(2)->toDateString(),
            'dias_solicitados' => 2,
            'motivo' => 'Permiso personal',
            'estado' => 'Pendiente',
        ]);

        $this->actingAs($jefeUser)->post(route('leaves.approve', $foreignLeaveRequest))
            ->assertForbidden();
    }

    public function test_nomina_role_cannot_modify_novelties(): void
    {
        $nominaUser = $this->createUserWithRole('Nómina');
        $emp = $this->createEmployee();

        $period = PayrollPeriod::create([
            'codigo' => '2026-11-Q1',
            'nombre' => 'Periodo Noviembre',
            'fecha_inicio' => '2026-11-01',
            'fecha_fin' => '2026-11-15',
            'estado' => 'Abierto',
        ]);

        $type = PayrollNoveltyType::first();

        $novelty = PayrollNovelty::create([
            'payroll_period_id' => $period->id,
            'employee_id' => $emp->id,
            'payroll_novelty_type_id' => $type->id,
            'valor' => 50000,
            'descripcion' => 'Bono',
            'estado' => 'Activa',
            'registrado_por' => 1,
        ]);

        // Nómina cannot store
        $this->actingAs($nominaUser)->post(route('payroll.store'), [
            'payroll_period_id' => $period->id,
            'employee_id' => $emp->id,
            'payroll_novelty_type_id' => $type->id,
            'valor' => 20000,
            'descripcion' => 'Intento',
        ])->assertForbidden();

        // Nómina cannot annul
        $this->actingAs($nominaUser)->patch(route('payroll.annul', $novelty), [
            'motivo_anulacion' => 'Intento nómina',
        ])->assertForbidden();

        // Nómina cannot consolidate
        $this->actingAs($nominaUser)->post(route('payroll.consolidate', $period))
            ->assertForbidden();
    }
}
