<?php

namespace Tests\Feature;

use App\EmployeeDocumentType;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Position;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class EmployeeManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_human_resources_and_management_can_consult_employee_details(): void
    {
        $employee = $this->createEmployee();
        $employee->forceFill([
            'attendance_code' => 'EMP-TEST-01',
            'attendance_pin_hash' => 'test-hash',
            'attendance_pin_updated_at' => now(),
        ])->save();
        $expectedAttendancePinUpdatedAt = $employee->fresh()->attendance_pin_updated_at->toIso8601String();

        foreach (['Administrador', 'Talento Humano', 'Gerencia'] as $roleName) {
            $user = $this->createUserWithRole($roleName);

            $this->actingAs($user)
                ->get(route('employees.index'))
                ->assertOk()
                ->assertInertia(function (Assert $page) use ($employee, $roleName): void {
                    $page->component('Employees/Index')
                        ->has('employees.data', 1)
                        ->where('employees.data.0.user.name', $employee->user->name)
                        ->where('employees.data.0.estado', 'Activo')
                        ->where('canManage', $roleName === 'Talento Humano');

                    if ($roleName === 'Talento Humano') {
                        $page->has('availableUsers');
                    } else {
                        $page->has('availableUsers', 0);
                    }

                    $page->etc();
                });

            $this->actingAs($user)
                ->get(route('employees.show', $employee))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('Employees/Show')
                    ->where('employee.user.name', $employee->user->name)
                    ->where('employee.user.email', $employee->user->email)
                    ->where('employee.tipo_documento', $employee->tipo_documento)
                    ->where('employee.numero_documento', $employee->numero_documento)
                    ->where('employee.departamento', $employee->department->nombre)
                    ->where('employee.cargo', $employee->position->nombre)
                    ->where('employee.estado', 'Activo')
                    ->where('activeContract', null)
                    ->where('canManage', $roleName === 'Talento Humano')
                    ->where('canManageAttendancePin', $roleName === 'Administrador')
                    ->where('attendanceCode', $roleName === 'Administrador' ? 'EMP-TEST-01' : null)
                    ->where('hasAttendancePin', $roleName === 'Administrador')
                    ->where('attendancePinUpdatedAt', $roleName === 'Administrador' ? $expectedAttendancePinUpdatedAt : null)
                    ->etc()
                );
        }
    }

    public function test_administrator_employee_detail_formats_a_string_attendance_pin_timestamp(): void
    {
        $administrator = $this->createUserWithRole('Administrador');
        $employee = $this->createEmployee();
        $updatedAt = now()->startOfSecond();
        $employee->forceFill([
            'attendance_code' => 'EMP-TEST-02',
            'attendance_pin_hash' => 'test-hash',
            'attendance_pin_updated_at' => $updatedAt,
        ])->save();

        Route::bind('employee', static function (string $value): Employee {
            return Employee::query()
                ->findOrFail($value)
                ->mergeCasts(['attendance_pin_updated_at' => 'string']);
        });

        $this->actingAs($administrator)
            ->get(route('employees.show', $employee))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Employees/Show')
                ->where('attendancePinUpdatedAt', $updatedAt->toIso8601String())
                ->where('attendanceCode', 'EMP-TEST-02')
                ->etc()
            );
    }

    public function test_employee_creation_redirects_to_a_detail_that_displays_an_authorized_active_contract(): void
    {
        $humanResourcesUser = $this->createUserWithRole('Talento Humano');
        $department = Department::factory()->create();
        $position = Position::factory()->create();
        $linkedUser = User::factory()->create();
        $contractType = ContractType::query()->create([
            'nombre' => 'Contrato de prueba',
            'codigo' => 'TEST-EMPLOYEE',
            'requiere_fecha_fin' => false,
            'is_active' => true,
        ]);

        $response = $this->actingAs($humanResourcesUser)
            ->post(route('employees.store'), $this->employeeData($linkedUser, $department, $position));

        $employee = Employee::query()->where('user_id', $linkedUser->id)->firstOrFail();

        $response->assertRedirect(route('employees.show', $employee));

        Contract::query()->create([
            'employee_id' => $employee->id,
            'contract_type_id' => $contractType->id,
            'numero_contrato' => 'CT-EMP-TEST-01',
            'salario' => 2000000,
            'fecha_inicio' => now()->toDateString(),
            'estado' => 'Vigente',
        ]);

        $this->actingAs($humanResourcesUser)
            ->get(route('employees.show', $employee))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Employees/Show')
                ->where('employee.id', $employee->id)
                ->where('employee.user.name', $linkedUser->name)
                ->where('employee.departamento', $department->nombre)
                ->where('employee.cargo', $position->nombre)
                ->where('activeContract.numero_contrato', 'CT-EMP-TEST-01')
                ->where('activeContract.tipo', 'Contrato de prueba')
                ->where('activeContract.salario', '2000000.00')
                ->where('flash.success', 'El empleado se registró correctamente.')
                ->etc()
            );
    }

    public function test_employee_self_detail_shows_own_contract_but_hides_contract_data_from_other_roles(): void
    {
        $contractType = ContractType::query()->create([
            'nombre' => 'Contrato de prueba',
            'codigo' => 'TEST-EMPLOYEE-ACCESS',
            'requiere_fecha_fin' => false,
            'is_active' => true,
        ]);
        $employeeUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $employeeUser->id]);
        $ownContract = Contract::query()->create([
            'employee_id' => $employee->id,
            'contract_type_id' => $contractType->id,
            'numero_contrato' => 'CT-EMP-OWN-01',
            'salario' => 1500000,
            'fecha_inicio' => now()->toDateString(),
            'estado' => 'Vigente',
        ]);

        $this->actingAs($employeeUser)
            ->get(route('employees.me'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Employees/Show')
                ->where('activeContract.id', $ownContract->id)
                ->where('canManageAttendancePin', false)
                ->etc()
            );

        $payrollUser = $this->createUserWithRole('Nómina');
        $payrollEmployee = $this->createEmployee(['user_id' => $payrollUser->id]);
        Contract::query()->create([
            'employee_id' => $payrollEmployee->id,
            'contract_type_id' => $contractType->id,
            'numero_contrato' => 'CT-PAYROLL-01',
            'salario' => 3000000,
            'fecha_inicio' => now()->toDateString(),
            'estado' => 'Vigente',
        ]);

        $this->actingAs($payrollUser)
            ->get(route('employees.me'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Employees/Show')
                ->where('activeContract', null)
                ->etc()
            );
    }

    public function test_human_resources_can_register_edit_and_deactivate_without_deleting_employee(): void
    {
        $humanResourcesUser = $this->createUserWithRole('Talento Humano');
        $department = Department::factory()->create();
        $position = Position::factory()->create();
        $linkedUser = User::factory()->create();

        $this->actingAs($humanResourcesUser)
            ->post(route('employees.store'), $this->employeeData($linkedUser, $department, $position))
            ->assertRedirect(route('employees.show', Employee::query()->first()));

        $employee = Employee::query()->firstOrFail();

        $this->assertSame($linkedUser->id, $employee->user_id);
        $this->assertSame('Activo', $employee->estado);
        $this->assertSame($linkedUser->name, $employee->user->name);
        $this->assertSame($department->id, $employee->departamento_id);
        $this->assertSame($position->id, $employee->cargo_id);
        $this->assertSame('CC', $employee->tipo_documento);

        $this->actingAs($humanResourcesUser)
            ->put(route('employees.update', $employee), [
                ...$this->employeeData($linkedUser, $department, $position),
                'tipo_documento' => 'TI',
                'numero_documento' => '87654321',
            ])
            ->assertRedirect(route('employees.show', $employee));

        $employee->refresh();
        $this->assertSame('87654321', $employee->numero_documento);
        $this->assertSame('TI', $employee->tipo_documento);
        $this->assertSame($linkedUser->id, $employee->user_id);

        $this->actingAs($humanResourcesUser)
            ->get(route('employees.show', $employee))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Employees/Show')
                ->where('employee.numero_documento', '87654321')
                ->where('employee.tipo_documento', 'TI')
                ->etc()
            );

        $this->actingAs($humanResourcesUser)
            ->patch(route('employees.status', $employee), ['estado' => 'Inactivo'])
            ->assertRedirect();

        $employee->refresh();
        $this->assertSame('Inactivo', $employee->estado);
        $this->assertModelExists($employee);
    }

    public function test_employee_search_and_status_filter_return_only_matching_records(): void
    {
        $humanResourcesUser = $this->createUserWithRole('Talento Humano');
        $inactiveEmployee = $this->createEmployee([
            'numero_documento' => '12345001',
            'estado' => 'Inactivo',
        ]);
        $this->createEmployee([
            'numero_documento' => '12345002',
            'estado' => 'Activo',
        ]);

        $this->actingAs($humanResourcesUser)
            ->get(route('employees.index', [
                'search' => '12345001',
                'estado' => 'Inactivo',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('employees.data', 1)
                ->where('employees.data.0.id', $inactiveEmployee->id)
                ->where('employees.data.0.estado', 'Inactivo')
                ->etc()
            );
    }

    public function test_department_filter_returns_only_employees_in_the_selected_department(): void
    {
        $humanResourcesUser = $this->createUserWithRole('Talento Humano');
        $operations = Department::factory()->create(['nombre' => 'Operaciones']);
        $sales = Department::factory()->create(['nombre' => 'Ventas']);
        $employee = $this->createEmployee(['departamento_id' => $operations->id]);
        $this->createEmployee(['departamento_id' => $sales->id]);

        $this->actingAs($humanResourcesUser)
            ->get(route('employees.index', ['departamento_id' => $operations->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('employees.data', 1)
                ->where('employees.data.0.id', $employee->id)
                ->where('filters.departamento_id', (string) $operations->id)
                ->etc()
            );

        $this->actingAs($humanResourcesUser)
            ->get(route('employees.index', ['departamento_id' => 999999]))
            ->assertSessionHasErrors('departamento_id');
    }

    public function test_position_filter_returns_only_employees_with_selected_position(): void
    {
        $humanResourcesUser = $this->createUserWithRole('Talento Humano');
        $pos1 = Position::factory()->create(['nombre' => 'Auxiliar Bodega']);
        $pos2 = Position::factory()->create(['nombre' => 'Conductor']);
        $emp1 = $this->createEmployee(['cargo_id' => $pos1->id]);
        $this->createEmployee(['cargo_id' => $pos2->id]);

        $this->actingAs($humanResourcesUser)
            ->get(route('employees.index', ['cargo_id' => $pos1->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('employees.data', 1)
                ->where('employees.data.0.id', $emp1->id)
                ->where('filters.cargo_id', (string) $pos1->id)
                ->etc()
            );
    }

    public function test_employee_cannot_view_other_employee_record_and_can_view_own_profile(): void
    {
        $empRoleUser = $this->createUserWithRole('Empleado');
        $ownEmployee = $this->createEmployee(['user_id' => $empRoleUser->id]);
        $otherEmployee = $this->createEmployee();

        $this->actingAs($empRoleUser)
            ->get(route('employees.show', $otherEmployee))
            ->assertForbidden();

        $this->actingAs($empRoleUser)
            ->get(route('employees.me'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Employees/Show')
                ->where('employee.id', $ownEmployee->id)
                ->etc()
            );
    }

    public function test_jefe_without_a_department_cannot_view_team_members(): void
    {
        $jefeUser = $this->createUserWithRole('Jefe de área');
        $this->createEmployee();

        $this->actingAs($jefeUser)
            ->get(route('employees.team'))
            ->assertForbidden();
    }

    public function test_employee_creation_rejects_duplicate_user_and_document_numbers(): void
    {
        $humanResourcesUser = $this->createUserWithRole('Talento Humano');
        $existingEmployee = $this->createEmployee([
            'numero_documento' => '55512345',
        ]);
        $department = Department::factory()->create();
        $position = Position::factory()->create();
        $newUser = User::factory()->create();

        $this->actingAs($humanResourcesUser)
            ->post(route('employees.store'), [
                ...$this->employeeData($newUser, $department, $position),
                'numero_documento' => $existingEmployee->numero_documento,
            ])
            ->assertSessionHasErrors('numero_documento');

        $this->assertDatabaseCount('employees', 1);

        $this->actingAs($humanResourcesUser)
            ->post(route('employees.store'), $this->employeeData($existingEmployee->user, $department, $position))
            ->assertSessionHasErrors('user_id');

        $this->assertDatabaseCount('employees', 1);
    }

    public function test_employee_creation_requires_existing_catalog_entries_and_all_required_fields(): void
    {
        $humanResourcesUser = $this->createUserWithRole('Talento Humano');

        $this->actingAs($humanResourcesUser)
            ->post(route('employees.store'), [])
            ->assertSessionHasErrors([
                'user_id',
                'tipo_documento',
                'numero_documento',
                'telefono',
                'direccion',
                'fecha_nacimiento',
                'fecha_contratacion',
                'departamento_id',
                'cargo_id',
            ]);

        $this->assertDatabaseCount('employees', 0);
    }

    public function test_administrator_and_management_cannot_write_and_other_roles_cannot_access_employees(): void
    {
        $employee = $this->createEmployee();

        foreach (['Administrador', 'Gerencia'] as $roleName) {
            $reader = $this->createUserWithRole($roleName);

            $this->actingAs($reader)
                ->post(route('employees.store'), [])
                ->assertForbidden();

            $this->actingAs($reader)
                ->put(route('employees.update', $employee), [])
                ->assertForbidden();

            $this->actingAs($reader)
                ->patch(route('employees.status', $employee), ['estado' => 'Inactivo'])
                ->assertForbidden();
        }

        foreach (['Jefe de área', 'Nómina', 'Empleado'] as $roleName) {
            $unauthorizedUser = $this->createUserWithRole($roleName);

            $this->actingAs($unauthorizedUser)
                ->get(route('employees.index'))
                ->assertForbidden();

            $this->actingAs($unauthorizedUser)
                ->get(route('employees.show', $employee))
                ->assertForbidden();
        }

        $this->assertModelExists($employee);
        $this->assertSame('Activo', $employee->fresh()->estado);
    }

    public static function supportedDocumentTypes(): array
    {
        return [
            'citizenship card' => ['CC'],
            'identity card' => ['TI'],
            'foreigner identity card' => ['CE'],
            'passport' => ['PA'],
            'temporary protection permit' => ['PPT'],
            'civil registry' => ['RC'],
        ];
    }

    #[DataProvider('supportedDocumentTypes')]
    public function test_human_resources_can_save_each_supported_document_type(string $documentType): void
    {
        $humanResourcesUser = $this->createUserWithRole('Talento Humano');
        $department = Department::factory()->create();
        $position = Position::factory()->create();
        $linkedUser = User::factory()->create();

        $this->actingAs($humanResourcesUser)
            ->post(route('employees.store'), [
                ...$this->employeeData($linkedUser, $department, $position),
                'tipo_documento' => $documentType,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('employees', [
            'user_id' => $linkedUser->id,
            'tipo_documento' => $documentType,
        ]);
    }

    public function test_legacy_cedula_value_remains_selectable_when_editing(): void
    {
        $humanResourcesUser = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee(['tipo_documento' => 'cedula']);

        $this->actingAs($humanResourcesUser)
            ->get(route('employees.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('documentTypes', EmployeeDocumentType::options())
                ->where('employees.data.0.tipo_documento', 'cedula')
                ->etc()
            );

        $this->actingAs($humanResourcesUser)
            ->put(route('employees.update', $employee), [
                ...$this->employeeData($employee->user, $employee->department, $employee->position),
                'tipo_documento' => 'cedula',
            ])
            ->assertRedirect(route('employees.show', $employee));

        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'tipo_documento' => 'cedula',
        ]);
    }

    public function test_employee_creation_rejects_a_document_type_outside_the_list(): void
    {
        $humanResourcesUser = $this->createUserWithRole('Talento Humano');
        $department = Department::factory()->create();
        $position = Position::factory()->create();
        $linkedUser = User::factory()->create();

        $this->actingAs($humanResourcesUser)
            ->post(route('employees.store'), [
                ...$this->employeeData($linkedUser, $department, $position),
                'tipo_documento' => 'Documento inventado',
            ])
            ->assertSessionHasErrors([
                'tipo_documento' => 'Selecciona un tipo de documento válido.',
            ]);

        $this->assertDatabaseCount('employees', 0);
    }

    public function test_employee_update_rejects_a_document_type_outside_the_list(): void
    {
        $humanResourcesUser = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee();
        $originalDocumentType = $employee->tipo_documento;

        $this->actingAs($humanResourcesUser)
            ->put(route('employees.update', $employee), [
                ...$this->employeeData($employee->user, $employee->department, $employee->position),
                'tipo_documento' => 'Documento inventado',
            ])
            ->assertSessionHasErrors([
                'tipo_documento' => 'Selecciona un tipo de documento válido.',
            ]);

        $this->assertSame($originalDocumentType, $employee->fresh()->tipo_documento);
    }

    public function test_guest_is_redirected_and_employee_has_no_physical_delete_route(): void
    {
        $employee = $this->createEmployee();

        $this->get(route('employees.index'))
            ->assertRedirect(route('login'));

        $this->actingAs($this->createUserWithRole('Talento Humano'))
            ->delete('/empleados/'.$employee->id)
            ->assertStatus(405);

        $this->assertModelExists($employee);
    }

    private function createEmployee(array $attributes = []): Employee
    {
        return Employee::factory()->create($attributes);
    }

    private function createUserWithRole(string $roleName): User
    {
        $this->seed(RoleSeeder::class);
        $role = Role::query()->where('name', $roleName)->firstOrFail();
        $user = User::factory()->for($role)->create();
        $this->acceptCurrentPrivacyPolicy($user);

        return $user;
    }

    /**
     * @return array<string, int|string>
     */
    private function employeeData(User $user, Department $department, Position $position): array
    {
        return [
            'user_id' => $user->id,
            'tipo_documento' => 'CC',
            'numero_documento' => '76543210',
            'telefono' => '3001234567',
            'direccion' => 'Calle 10 # 20-30',
            'fecha_nacimiento' => '1990-04-15',
            'fecha_contratacion' => '2024-01-15',
            'departamento_id' => $department->id,
            'cargo_id' => $position->id,
        ];
    }
}
