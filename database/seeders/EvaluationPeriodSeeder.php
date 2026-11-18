<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\EvaluationCriteria;
use App\Models\EvaluationPeriod;
use App\Models\PerformanceEvaluation;
use App\Models\User;
use Illuminate\Database\Seeder;

class EvaluationPeriodSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::first();

        $period = EvaluationPeriod::query()->firstOrCreate(
            ['nombre' => 'Evaluación de Desempeño 2026 - Periodo II'],
            [
                'descripcion' => 'Evaluación integral semestral por competencias y cumplimiento de objetivos para todo el personal de Comercializadora Andina S.A.S.',
                'fecha_inicio' => '2026-11-01',
                'fecha_fin' => '2026-12-15',
                'estado' => 'Abierto',
                'created_by' => $admin?->id,
            ]
        );

        // Pre-create pending evaluation for active employees if they don't have one
        $employees = Employee::query()->where('estado', 'Activo')->get();
        $criteria = EvaluationCriteria::query()->where('is_active', true)->get();

        foreach ($employees as $employee) {
            $eval = PerformanceEvaluation::query()->firstOrCreate(
                [
                    'evaluation_period_id' => $period->id,
                    'employee_id' => $employee->id,
                ],
                [
                    'estado' => 'Pendiente',
                    'calificacion_final' => null,
                ]
            );
        }
    }
}
