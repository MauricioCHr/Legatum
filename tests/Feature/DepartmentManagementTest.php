<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DepartmentManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_can_view_create_and_update_departments(): void
    {
        $this->seed(RoleSeeder::class);
        $admin = $this->createUserWithRole('Administrador');

        $response = $this->actingAs($admin)->get(route('departments.index'));
        $response->assertOk();

        $createResponse = $this->actingAs($admin)->post(route('departments.store'), [
            'nombre' => 'Logística y Operaciones',
            'descripcion' => 'Distribución en Ipiales y frontera',
            'is_active' => true,
        ]);
        $createResponse->assertRedirect(route('departments.index'));

        $this->assertDatabaseHas('departamentos', [
            'nombre' => 'Logística y Operaciones',
        ]);

        $department = Department::query()->where('nombre', 'Logística y Operaciones')->firstOrFail();

        $updateResponse = $this->actingAs($admin)->put(route('departments.update', $department), [
            'nombre' => 'Logística, Bodega y Operaciones',
            'descripcion' => 'Actualizado con éxito',
            'is_active' => true,
        ]);
        $updateResponse->assertRedirect(route('departments.index'));

        $this->assertSame('Logística, Bodega y Operaciones', $department->fresh()->nombre);
    }

    public function test_non_admin_cannot_create_or_modify_departments(): void
    {
        $this->seed(RoleSeeder::class);
        $employeeUser = $this->createUserWithRole('Empleado');
        $department = Department::factory()->create(['nombre' => 'Compras']);

        $this->actingAs($employeeUser)
            ->get(route('departments.index'))
            ->assertForbidden();

        $this->actingAs($employeeUser)
            ->post(route('departments.store'), ['nombre' => 'Intento Hack'])
            ->assertForbidden();

        $this->actingAs($employeeUser)
            ->put(route('departments.update', $department), ['nombre' => 'Modificado'])
            ->assertForbidden();
    }

    private function createUserWithRole(string $roleName): User
    {
        $role = Role::query()->where('name', $roleName)->firstOrFail();
        $user = User::factory()->for($role)->create();
        $this->acceptCurrentPrivacyPolicy($user);

        return $user;
    }
}
