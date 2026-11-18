<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_page_is_rendered_through_inertia(): void
    {
        $this->get(route('login'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/Login')
                ->etc()
            );
    }

    public function test_valid_credentials_authenticate_and_redirect_to_dashboard(): void
    {
        $user = User::factory()->create();

        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
        ])
            ->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($user);
    }

    public function test_each_role_reaches_its_authorized_landing_page_and_can_log_out(): void
    {
        $this->seed(RoleSeeder::class);

        foreach ([
            'Administrador',
            'Talento Humano',
            'Jefe de área',
            'Nómina',
            'Gerencia',
            'Empleado',
        ] as $index => $roleName) {
            $role = Role::query()->where('name', $roleName)->firstOrFail();
            $user = User::factory()->for($role)->create();
            $landingRoute = $roleName === 'Empleado' ? 'employees.me' : 'dashboard';

            $this->acceptCurrentPrivacyPolicy($user);

            if ($roleName === 'Empleado') {
                Employee::factory()->for($user, 'user')->create();
            }

            $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.'.($index + 1)])
                ->post(route('login.store'), [
                    'email' => $user->email,
                    'password' => 'password',
                ])->assertRedirect(route($landingRoute));

            $this->assertAuthenticatedAs($user);
            $this->get(route($landingRoute))->assertOk();

            if ($roleName !== 'Administrador') {
                $this->get(route('users.index'))->assertForbidden();
            }

            $this->post(route('logout'))->assertRedirect('/login');
            $this->assertGuest();
            $this->get(route('dashboard'))->assertRedirect(route('login'));
        }
    }

    public function test_login_does_not_redirect_a_role_to_a_stale_unauthorized_intended_url(): void
    {
        $this->seed(RoleSeeder::class);
        $role = Role::query()->where('name', 'Nómina')->firstOrFail();
        $user = User::factory()->for($role)->create();

        $this->withSession(['url.intended' => route('users.index')])
            ->post(route('login.store'), [
                'email' => $user->email,
                'password' => 'password',
            ])
            ->assertRedirect(route('dashboard'));

        $this->assertAuthenticatedAs($user);
        $this->assertNull(session('url.intended'));
        $this->get(route('dashboard'))->assertOk();
        $this->get(route('users.index'))->assertForbidden();
    }

    public function test_invalid_credentials_return_the_login_error_without_authenticating(): void
    {
        $this->post(route('login.store'), [
            'email' => 'user@example.test',
            'password' => 'incorrect-password',
        ])
            ->assertRedirect()
            ->assertSessionHasErrors([
                'email' => 'Las credenciales ingresadas son incorrectas.',
            ]);

        $this->assertGuest();
    }

    public function test_public_registration_route_is_not_available(): void
    {
        $this->get('/register')
            ->assertNotFound();

        $this->post('/register')
            ->assertNotFound();
    }
}
