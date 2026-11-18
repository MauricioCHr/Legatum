<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardControllerTest extends TestCase
{
    use RefreshDatabase;

    private const ROLE_DASHBOARDS = [
        'Administrador' => 'Panel administrativo',
        'Talento Humano' => 'Dashboard de Talento Humano',
        'Jefe de área' => 'Dashboard de jefatura',
        'Nómina' => 'Dashboard de nómina',
        'Gerencia' => 'Dashboard gerencial',
    ];

    public function test_guest_is_redirected_to_login_before_dashboard_renders(): void
    {
        $this->get(route('dashboard'))
            ->assertRedirect(route('login'));
    }

    public function test_each_existing_role_receives_its_own_dashboard(): void
    {
        foreach (self::ROLE_DASHBOARDS as $roleName => $dashboardTitle) {
            $user = $this->createUserWithRole($roleName);
            $metricCount = match ($roleName) {
                'Administrador', 'Talento Humano', 'Nómina', 'Gerencia' => 4,
                'Jefe de área' => 5,
                default => 3,
            };

            $this->actingAs($user)
                ->get(route('dashboard'))
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Inicio')
                    ->where('auth.user.id', $user->id)
                    ->where('auth.user.role', $roleName)
                    ->where('dashboard.title', $dashboardTitle)
                    ->has('dashboard.metrics', $metricCount)
                    ->has('dashboard.departments')
                    ->has('dashboard.employeeStatuses')
                    ->has('dashboard.panels')
                    ->where('dashboard.recentActivity', [])
                    ->missing('auth.user.password')
                    ->etc()
                );
        }
    }

    public function test_employee_dashboard_contains_only_the_authenticated_employees_data(): void
    {
        $employeeUser = $this->createUserWithRole('Empleado');
        $department = Department::factory()->create(['nombre' => 'Tecnología']);
        $employee = Employee::factory()
            ->for($employeeUser, 'user')
            ->for($department, 'department')
            ->create();
        Employee::factory()->create(['departamento_id' => Department::factory()->create()->id]);

        $this->actingAs($employeeUser)
            ->get(route('dashboard'))
            ->assertForbidden();

        $this->actingAs($employeeUser)
            ->get(route('employees.me'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('employee.user.name', $employeeUser->name)
                ->where('employee.departamento', $department->nombre)
                ->where('employee.estado', $employee->estado)
                ->etc());
    }

    public function test_area_manager_dashboard_only_includes_the_managers_department(): void
    {
        $managerUser = $this->createUserWithRole('Jefe de área');
        $department = Department::factory()->create(['nombre' => 'Tecnología']);
        $otherDepartment = Department::factory()->create(['nombre' => 'Finanzas']);
        $manager = Employee::factory()
            ->for($managerUser, 'user')
            ->for($department, 'department')
            ->create();
        $department->update(['jefe_id' => $manager->id]);
        Employee::factory()->for($department, 'department')->create();
        Employee::factory()->for($otherDepartment, 'department')->create();

        $this->actingAs($managerUser)
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('dashboard.role', 'manager')
                ->where('dashboard.metrics.0.value', 2)
                ->has('dashboard.team', 2)
                ->where('dashboard.departments.0.name', $department->nombre)
                ->where('dashboard.departments.0.employees', 2)
                ->where('dashboard.employeeStatuses.0.value', 2)
                ->missing('dashboard.recentEmployees')
                ->etc()
            );
    }

    public function test_area_manager_without_employee_profile_does_not_receive_unassigned_department_data(): void
    {
        $managerUser = $this->createUserWithRole('Jefe de área');
        $department = Department::factory()->create(['nombre' => 'Área sin responsable']);
        Employee::factory()->for($department, 'department')->create();

        $this->actingAs($managerUser)
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('dashboard.role', 'manager')
                ->where('dashboard.metrics.0.value', 0)
                ->where('dashboard.departments', [])
                ->has('dashboard.team', 0)
                ->etc()
            );
    }

    public function test_dashboard_uses_real_employee_and_department_counts(): void
    {
        $administrator = $this->createUserWithRole('Administrador');
        $operations = Department::factory()->create(['nombre' => 'Operaciones']);
        Department::factory()->create(['nombre' => 'Ventas']);
        Employee::factory()->for($operations, 'department')->create(['estado' => 'Activo']);
        Employee::factory()->for($operations, 'department')->create(['estado' => 'Inactivo']);

        $this->actingAs($administrator)
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Inicio')
                ->where('dashboard.metrics.0.label', 'Colaboradores')
                ->where('dashboard.metrics.0.value', 2)
                ->where('dashboard.metrics.1.value', 3)
                ->where('dashboard.metrics.2.value', 3)
                ->where('dashboard.metrics.3.value', 2)
                ->where('dashboard.departments.0.name', 'Operaciones')
                ->where('dashboard.departments.0.employees', 2)
                ->where('dashboard.employeeStatuses.0.value', 1)
                ->where('dashboard.employeeStatuses.1.value', 1)
                ->etc()
            );
    }

    public function test_user_without_a_role_is_forbidden_from_the_dashboard(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson(route('dashboard'))
            ->assertForbidden()
            ->assertJsonPath('message', 'Acceso denegado');
    }

    private function createUserWithRole(string $roleName): User
    {
        $role = Role::query()->create([
            'name' => $roleName,
            'slug' => Str::slug($roleName),
        ]);
        $user = User::factory()->for($role)->create();
        $this->acceptCurrentPrivacyPolicy($user);

        return $user;
    }
}
