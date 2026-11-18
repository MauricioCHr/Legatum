<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    private const ADMIN_EMAIL = 'legatum-admin@example.test';

    private const ADMIN_PASSWORD = 'test-admin-password';

    public function test_database_seeder_creates_all_roles_and_hashed_administrator(): void
    {
        $this->configureAdminCredentials();

        $this->seed();

        $this->assertSame([
            'Administrador',
            'Talento Humano',
            'Jefe de área',
            'Nómina',
            'Gerencia',
            'Empleado',
        ], Role::query()->orderBy('id')->pluck('name')->all());

        $this->assertDatabaseCount('roles', 6);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('departamentos', 3);
        $this->assertDatabaseCount('cargos', 3);

        $admin = User::query()
            ->with('role')
            ->where('email', self::ADMIN_EMAIL)
            ->firstOrFail();

        $this->assertSame('Administrador inicial', $admin->name);
        $this->assertSame('administrador', $admin->role?->slug);
        $this->assertNotSame(self::ADMIN_PASSWORD, $admin->password);
        $this->assertTrue(Hash::check(self::ADMIN_PASSWORD, $admin->password));

        $this->post(route('login.store'), [
            'email' => self::ADMIN_EMAIL,
            'password' => self::ADMIN_PASSWORD,
        ])->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($admin);
    }

    public function test_repeated_database_seeding_does_not_duplicate_roles_or_administrator(): void
    {
        $this->configureAdminCredentials();

        $this->seed();
        $this->seed();

        $this->assertDatabaseCount('roles', 6);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('departamentos', 3);
        $this->assertDatabaseCount('cargos', 3);
        $this->assertSame(
            'administrador',
            User::query()->where('email', self::ADMIN_EMAIL)->firstOrFail()->role?->slug,
        );
    }

    public function test_repeated_database_seeding_does_not_reset_existing_administrator_credentials(): void
    {
        $this->configureAdminCredentials();

        $this->seed();
        $admin = User::query()->where('email', self::ADMIN_EMAIL)->firstOrFail();
        $admin->forceFill(['name' => 'Nombre administrado', 'password' => Hash::make('changed-admin-password')])->save();
        $existingPassword = $admin->fresh()->password;

        config()->set('legatum.admin_name', 'Otro nombre configurado');
        config()->set('legatum.admin_password', 'another-password');
        $this->seed();

        $this->assertSame('Nombre administrado', $admin->fresh()->name);
        $this->assertSame($existingPassword, $admin->fresh()->password);
        $this->assertTrue(Hash::check('changed-admin-password', $admin->fresh()->password));
    }

    public function test_database_seeder_does_not_promote_or_change_an_existing_non_admin_user(): void
    {
        $this->configureAdminCredentials();

        $employeeRole = Role::query()->create([
            'name' => 'Empleado',
            'slug' => 'empleado',
        ]);
        $existingUser = User::factory()->create([
            'email' => self::ADMIN_EMAIL,
            'name' => 'Cuenta anterior',
        ]);
        $existingUser->role()->associate($employeeRole)->save();
        $existingPassword = $existingUser->password;

        try {
            $this->seed();
            $this->fail('Se esperaba impedir la promoción automática de una cuenta existente.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('ya pertenece a un usuario con otro rol', $exception->getMessage());
        }

        $existingUser->refresh()->load('role');

        $this->assertSame('Cuenta anterior', $existingUser->name);
        $this->assertSame('empleado', $existingUser->role?->slug);
        $this->assertSame($existingPassword, $existingUser->password);
    }

    private function configureAdminCredentials(): void
    {
        config()->set([
            'legatum.admin_name' => 'Administrador inicial',
            'legatum.admin_email' => self::ADMIN_EMAIL,
            'legatum.admin_password' => self::ADMIN_PASSWORD,
        ]);
    }
}
