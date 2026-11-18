<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\PrivacyPolicyAcceptance;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PrivacyPolicySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PrivacyPolicyConsentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->seed(PrivacyPolicySeeder::class);
    }

    public function test_employee_must_accept_the_current_policy_before_using_protected_pages(): void
    {
        $employeeUser = $this->createEmployeeUser();
        $this->freezeTime();
        $acceptedAt = now()->toDateTimeString();

        $this->actingAs($employeeUser)
            ->get(route('leaves.my'))
            ->assertRedirect(route('privacy-policy.show'));

        $this->actingAs($employeeUser)
            ->get(route('attendance.my'))
            ->assertRedirect(route('privacy-policy.show'));

        $this->actingAs($employeeUser)
            ->post(route('attendance.clock'))
            ->assertRedirect(route('privacy-policy.show'));

        $this->assertDatabaseCount('attendances', 0);

        $this->actingAs($employeeUser)
            ->get(route('privacy-policy.show'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('PrivacyPolicy/Show')
                ->where('policy.version', config('privacy.policy_version'))
                ->where('policy.text', config('privacy.policy_text')));

        $this->actingAs($employeeUser)
            ->from(route('privacy-policy.show'))
            ->post(route('privacy-policy.accept'), ['accepted' => false])
            ->assertRedirect(route('privacy-policy.show'))
            ->assertSessionHasErrors('accepted');

        $this->assertDatabaseCount('privacy_policy_acceptances', 0);

        $this->actingAs($employeeUser)
            ->post(route('privacy-policy.accept'), ['accepted' => true])
            ->assertRedirect(route('leaves.my'));

        $this->actingAs($employeeUser)
            ->post(route('privacy-policy.accept'), ['accepted' => true])
            ->assertRedirect(route('leaves.my'));

        $this->assertDatabaseHas('privacy_policy_acceptances', [
            'user_id' => $employeeUser->id,
            'policy_version' => (string) config('privacy.policy_version'),
            'policy_text' => config('privacy.policy_text'),
        ]);
        $this->assertDatabaseCount('privacy_policy_acceptances', 1);

        $acceptance = PrivacyPolicyAcceptance::query()
            ->where('user_id', $employeeUser->id)
            ->firstOrFail();
        $this->assertSame($acceptedAt, $acceptance->accepted_at->toDateTimeString());

        $this->actingAs($employeeUser)->get(route('leaves.my'))->assertOk();
    }

    public function test_new_policy_version_requires_a_new_acceptance_without_overwriting_history(): void
    {
        $employeeUser = $this->createEmployeeUser();
        $originalPolicyText = config('privacy.policy_text');

        $this->actingAs($employeeUser)
            ->post(route('privacy-policy.accept'), ['accepted' => true])
            ->assertRedirect(route('leaves.my'));
        $originalAcceptance = PrivacyPolicyAcceptance::query()
            ->where('user_id', $employeeUser->id)
            ->where('policy_version', '1.0')
            ->firstOrFail();
        $originalAcceptedAt = $originalAcceptance->accepted_at->toDateTimeString();

        config()->set('privacy.policy_version', '2.0');
        config()->set('privacy.policy_text', 'Texto actualizado para la prueba.');
        $this->seed(PrivacyPolicySeeder::class);

        $this->actingAs($employeeUser)
            ->get(route('leaves.my'))
            ->assertRedirect(route('privacy-policy.show'));

        $this->actingAs($employeeUser)
            ->post(route('privacy-policy.accept'), ['accepted' => true])
            ->assertRedirect(route('leaves.my'));

        $this->assertDatabaseCount('privacy_policy_acceptances', 2);
        $this->assertDatabaseHas('privacy_policy_acceptances', [
            'user_id' => $employeeUser->id,
            'policy_version' => '1.0',
        ]);
        $this->assertDatabaseHas('privacy_policy_acceptances', [
            'user_id' => $employeeUser->id,
            'policy_version' => '2.0',
            'policy_text' => 'Texto actualizado para la prueba.',
        ]);
        $this->assertSame(
            $originalAcceptedAt,
            $originalAcceptance->fresh()->accepted_at->toDateTimeString(),
        );

        $this->actingAs($employeeUser)
            ->get(route('privacy-policy.show'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('policy.version', '2.0')
                ->where('isAccepted', true)
                ->where('history.data.0.version', '2.0')
                ->where('history.data.1.version', '1.0')
                ->where('history.data.1.text', $originalPolicyText));
    }

    public function test_policy_seeder_does_not_overwrite_an_existing_version(): void
    {
        $originalPolicyText = config('privacy.policy_text');
        config()->set('privacy.policy_text', 'Texto que no debe reemplazar la versión existente.');

        $this->seed(PrivacyPolicySeeder::class);

        $this->assertDatabaseCount('privacy_policies', 1);
        $this->assertDatabaseHas('privacy_policies', [
            'version' => (string) config('privacy.policy_version'),
            'text' => $originalPolicyText,
        ]);
    }

    public function test_non_employee_users_do_not_need_employee_policy_acceptance(): void
    {
        $humanResources = $this->createUserWithRole('Talento Humano');

        $this->actingAs($humanResources)->get(route('dashboard'))->assertOk();

        $this->actingAs($humanResources)
            ->post(route('privacy-policy.accept'), ['accepted' => true])
            ->assertForbidden();

        $this->assertDatabaseCount('privacy_policy_acceptances', 0);
    }

    private function createEmployeeUser(): User
    {
        $user = $this->createUserWithRole('Empleado');
        Employee::factory()->create(['user_id' => $user->id]);

        return $user;
    }

    private function createUserWithRole(string $roleName): User
    {
        $role = Role::query()->where('name', $roleName)->firstOrFail();

        return User::factory()->for($role)->create();
    }
}
