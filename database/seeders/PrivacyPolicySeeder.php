<?php

namespace Database\Seeders;

use App\Models\PrivacyPolicy;
use Illuminate\Database\Seeder;

class PrivacyPolicySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        PrivacyPolicy::query()->firstOrCreate(
            ['version' => (string) config('privacy.policy_version')],
            [
                'text' => (string) config('privacy.policy_text'),
                'effective_at' => config('privacy.effective_at'),
                'responsible_name' => config('privacy.responsible_name'),
                'responsible_identification' => config('privacy.responsible_identification'),
                'contact_email' => config('privacy.contact_email'),
                'contact_address' => config('privacy.contact_address'),
            ],
        );
    }
}
