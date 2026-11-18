<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Tests\TestCase;

class CheckRoleMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private const ROLE_NAMES = [
        'Administrador',
        'Talento Humano',
        'Jefe de área',
        'Nómina',
        'Gerencia',
        'Empleado',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        Route::get('/test/role-admin', fn () => response()->noContent())
            ->middleware(['auth', 'role:Administrador']);

        Route::get('/test/role-admin-or-human-resources', fn () => response()->noContent())
            ->middleware(['auth', 'role:Administrador,Talento Humano']);

        Route::get(
            '/test/role-any-existing',
            fn () => response()->noContent(),
        )->middleware([
            'auth',
            'role:Administrador,Talento Humano,Jefe de área,Nómina,Gerencia,Empleado',
        ]);
    }

    public function test_each_existing_role_is_authorized_when_listed(): void
    {
        foreach (self::ROLE_NAMES as $roleName) {
            $user = $this->createUserWithRole($roleName);

            $this->actingAs($user)
                ->get('/test/role-any-existing')
                ->assertNoContent();
        }
    }

    public function test_single_role_is_authorized_and_other_roles_are_denied(): void
    {
        $administrator = $this->createUserWithRole('Administrador');
        $employee = $this->createUserWithRole('Empleado');

        $this->actingAs($administrator)
            ->get('/test/role-admin')
            ->assertNoContent();

        $this->actingAs($employee)
            ->getJson('/test/role-admin')
            ->assertForbidden()
            ->assertJsonPath('message', 'Acceso denegado');
    }

    public function test_multiple_roles_allow_any_matching_role(): void
    {
        foreach (['Administrador', 'Talento Humano'] as $roleName) {
            $user = $this->createUserWithRole($roleName);

            $this->actingAs($user)
                ->get('/test/role-admin-or-human-resources')
                ->assertNoContent();
        }
    }

    public function test_users_without_a_role_are_denied(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/test/role-admin')
            ->assertForbidden()
            ->assertJsonPath('message', 'Acceso denegado');
    }

    public function test_unauthenticated_users_keep_the_auth_redirect(): void
    {
        $this->get('/test/role-admin')
            ->assertRedirect(route('login'));
    }

    private function createUserWithRole(string $roleName): User
    {
        $role = Role::query()->create([
            'name' => $roleName,
            'slug' => Str::slug($roleName),
        ]);

        return User::factory()->for($role)->create();
    }
}
