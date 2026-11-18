<?php

namespace Tests;

use App\Models\PrivacyPolicyAcceptance;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function acceptCurrentPrivacyPolicy(User $user): void
    {
        if ($user->role?->name !== 'Empleado') {
            return;
        }

        PrivacyPolicyAcceptance::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'policy_version' => (string) config('privacy.policy_version'),
            ],
            [
                'policy_text' => (string) config('privacy.policy_text'),
                'accepted_at' => now(),
            ],
        );
    }
}
