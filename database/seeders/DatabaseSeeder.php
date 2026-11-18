<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            PrivacyPolicySeeder::class,
            AdminUserSeeder::class,
            DepartmentSeeder::class,
            PositionSeeder::class,
            ContractTypeSeeder::class,
            LeaveTypeSeeder::class,
            PayrollNoveltyTypeSeeder::class,
            EvaluationCriteriaSeeder::class,
            PayrollPeriodSeeder::class,
            EvaluationPeriodSeeder::class,
        ]);
    }
}
