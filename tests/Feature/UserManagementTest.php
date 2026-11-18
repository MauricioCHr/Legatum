<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Position;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_administrator_can_list_search_and_filter_users_with_database_roles(): void
    {
        $administrator = $this->createAdministrator();
        $employeeRole = Role::query()->where('slug', 'empleado')->firstOrFail();
        $employee = User::factory()->for($employeeRole)->create([
            'name' => 'Colaborador de prueba',
            'email' => 'colaborador@example.test',
        ]);
        User::factory()->for($employeeRole)->create([
            'name' => 'Otra persona',
            'email' => 'otra@example.test',
        ]);

        $this->actingAs($administrator)
            ->get(route('users.index', [
                'search' => 'colaborador',
                'role_id' => $employeeRole->id,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Users/Index')
                ->where('filters.search', 'colaborador')
                ->where('filters.role_id', $employeeRole->id)
                ->has('users.data', 1)
                ->where('users.data.0.id', $employee->id)
                ->where('users.data.0.role.name', 'Empleado')
                ->has('roles', 6)
                ->missing('users.data.0.password')
                ->etc()
            );
    }

    public function test_administrator_can_search_users_by_email(): void
    {
        $administrator = $this->createAdministrator();
        $role = Role::query()->where('slug', 'empleado')->firstOrFail();
        $user = User::factory()->for($role)->create([
            'email' => 'persona.encontrada@example.test',
        ]);
        User::factory()->for($role)->create([
            'email' => 'otra.persona@example.test',
        ]);

        $this->actingAs($administrator)
            ->get(route('users.index', ['search' => 'persona.encontrada']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Users/Index')
                ->has('users.data', 1)
                ->where('users.data.0.id', $user->id)
                ->where('users.data.0.email', 'persona.encontrada@example.test')
                ->etc()
            );
    }

    public function test_administrator_can_create_users_with_each_database_role_and_hashed_password(): void
    {
        $administrator = $this->createAdministrator();

        foreach (Role::query()->orderBy('id')->get() as $index => $role) {
            $email = "nuevo-usuario-{$index}@example.test";

            $this->actingAs($administrator)
                ->post(route('users.store'), [
                    'name' => "Usuario {$index}",
                    'email' => $email,
                    'password' => 'new-user-password',
                    'password_confirmation' => 'new-user-password',
                    'role_id' => $role->id,
                    'is_active' => true,
                ])
                ->assertRedirect(route('users.index'));

            $createdUser = User::query()->where('email', $email)->firstOrFail();

            $this->assertSame($role->id, $createdUser->role_id);
            $this->assertTrue(Hash::check('new-user-password', $createdUser->password));
            $this->assertTrue($createdUser->is_active);
        }

        $this->assertDatabaseCount('roles', 6);
    }

    public function test_administrator_can_edit_a_user_and_keep_the_existing_password(): void
    {
        $administrator = $this->createAdministrator();
        $employeeRole = Role::query()->where('slug', 'empleado')->firstOrFail();
        $managerRole = Role::query()->where('slug', 'gerencia')->firstOrFail();
        $user = User::factory()->for($employeeRole)->create([
            'name' => 'Nombre anterior',
            'email' => 'anterior@example.test',
        ]);
        $existingPassword = $user->password;

        $this->actingAs($administrator)
            ->put(route('users.update', $user), [
                'name' => 'Nombre actualizado',
                'email' => 'actualizado@example.test',
                'role_id' => $managerRole->id,
                'is_active' => true,
                'password' => '',
                'password_confirmation' => '',
            ])
            ->assertRedirect();

        $user->refresh();

        $this->assertSame('Nombre actualizado', $user->name);
        $this->assertSame('actualizado@example.test', $user->email);
        $this->assertSame($managerRole->id, $user->role_id);
        $this->assertSame($existingPassword, $user->password);
    }

    public function test_administrator_can_change_a_users_password(): void
    {
        $administrator = $this->createAdministrator();
        $role = Role::query()->where('slug', 'empleado')->firstOrFail();
        $user = User::factory()->for($role)->create();

        $this->actingAs($administrator)
            ->put(route('users.update', $user), [
                'name' => $user->name,
                'email' => $user->email,
                'role_id' => $role->id,
                'is_active' => true,
                'password' => 'updated-password',
                'password_confirmation' => 'updated-password',
            ])
            ->assertRedirect();

        $this->assertTrue(Hash::check('updated-password', $user->fresh()->password));
    }

    public function test_administrator_can_deactivate_a_user_and_the_account_cannot_authenticate(): void
    {
        $administrator = $this->createAdministrator();
        $employeeRole = Role::query()->where('slug', 'empleado')->firstOrFail();
        $user = User::factory()->for($employeeRole)->create([
            'email' => 'inactivo@example.test',
        ]);

        $this->actingAs($administrator)
            ->put(route('users.update', $user), [
                'name' => $user->name,
                'email' => $user->email,
                'role_id' => $employeeRole->id,
                'is_active' => false,
                'password' => '',
                'password_confirmation' => '',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'is_active' => false,
        ]);

        $this->post(route('logout'))
            ->assertRedirect('/login');

        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
        ])
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_deactivated_user_with_an_existing_session_is_logged_out(): void
    {
        $role = $this->createRole('Empleado', 'empleado');
        $user = User::factory()->for($role)->create();
        $user->is_active = false;
        $user->save();

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_administrator_can_delete_another_user(): void
    {
        $administrator = $this->createAdministrator();
        $role = Role::query()->where('slug', 'empleado')->firstOrFail();
        $user = User::factory()->for($role)->create();

        $this->from(route('users.index'))
            ->actingAs($administrator)
            ->delete(route('users.destroy', $user))
            ->assertRedirect(route('users.index'));

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_administrator_cannot_delete_their_own_account(): void
    {
        $administrator = $this->createAdministrator();

        $this->from(route('users.index'))
            ->actingAs($administrator)
            ->delete(route('users.destroy', $administrator))
            ->assertRedirect(route('users.index'))
            ->assertSessionHas('error', 'No puedes eliminar tu propia cuenta.');

        $this->assertModelExists($administrator);
    }

    public function test_administrator_cannot_delete_an_account_linked_to_an_employee(): void
    {
        $administrator = $this->createAdministrator();
        $employeeRole = Role::query()->where('slug', 'empleado')->firstOrFail();
        $linkedUser = User::factory()->for($employeeRole)->create();
        $department = Department::factory()->create();
        $position = Position::factory()->create();
        $employee = Employee::factory()
            ->for($linkedUser, 'user')
            ->for($department, 'department')
            ->for($position, 'position')
            ->create();

        $this->from(route('users.index'))
            ->actingAs($administrator)
            ->delete(route('users.destroy', $linkedUser))
            ->assertRedirect(route('users.index'))
            ->assertSessionHas(
                'error',
                'No se puede eliminar una cuenta vinculada a una ficha de empleado.',
            );

        $this->assertModelExists($linkedUser);
        $this->assertModelExists($employee);
    }

    public function test_last_active_administrator_cannot_be_deactivated_or_demoted(): void
    {
        $administrator = $this->createAdministrator();
        $employeeRole = Role::query()->where('slug', 'empleado')->firstOrFail();

        $this->from(route('users.index'))
            ->actingAs($administrator)
            ->put(route('users.update', $administrator), [
                'name' => $administrator->name,
                'email' => $administrator->email,
                'role_id' => $employeeRole->id,
                'is_active' => false,
                'password' => '',
                'password_confirmation' => '',
            ])
            ->assertRedirect(route('users.index'))
            ->assertSessionHas(
                'error',
                'No se puede desactivar ni cambiar el rol del último administrador activo.',
            );

        $this->assertDatabaseHas('users', [
            'id' => $administrator->id,
            'role_id' => $administrator->role_id,
            'is_active' => true,
        ]);
    }

    public function test_duplicate_email_is_rejected_with_a_validation_message(): void
    {
        $administrator = $this->createAdministrator();
        $role = Role::query()->where('slug', 'empleado')->firstOrFail();
        User::factory()->for($role)->create([
            'email' => 'repetido@example.test',
        ]);

        $this->actingAs($administrator)
            ->post(route('users.store'), [
                'name' => 'Nuevo usuario',
                'email' => 'repetido@example.test',
                'password' => 'new-user-password',
                'password_confirmation' => 'new-user-password',
                'role_id' => $role->id,
                'is_active' => true,
            ])
            ->assertSessionHasErrors([
                'email' => 'Este correo electrónico ya está registrado.',
            ]);

        $this->assertDatabaseCount('users', 2);
    }

    public function test_user_without_administrator_role_cannot_access_any_management_action(): void
    {
        $employeeRole = $this->createRole('Empleado', 'empleado');
        $employee = User::factory()->for($employeeRole)->create();
        $this->acceptCurrentPrivacyPolicy($employee);
        $target = User::factory()->for($employeeRole)->create();
        $this->acceptCurrentPrivacyPolicy($target);

        $this->actingAs($employee)
            ->get(route('users.index'))
            ->assertForbidden();

        $this->post(route('users.store'), [])
            ->assertForbidden();

        $this->put(route('users.update', $target), [])
            ->assertForbidden();

        $this->delete(route('users.destroy', $target))
            ->assertForbidden();

        $this->assertModelExists($target);
    }

    public function test_guest_is_redirected_before_user_management_renders(): void
    {
        $this->get(route('users.index'))
            ->assertRedirect(route('login'));
    }

    private function createAdministrator(): User
    {
        $this->seed(RoleSeeder::class);
        $role = Role::query()->where('slug', 'administrador')->firstOrFail();

        return User::factory()->for($role)->create();
    }

    private function createRole(string $name, string $slug): Role
    {
        return Role::query()->create([
            'name' => $name,
            'slug' => $slug,
        ]);
    }
}
