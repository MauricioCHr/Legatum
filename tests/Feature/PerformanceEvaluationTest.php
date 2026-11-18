<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\EvaluationCriteria;
use App\Models\EvaluationPeriod;
use App\Models\PerformanceEvaluation;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\EvaluationCriteriaSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PerformanceEvaluationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(EvaluationCriteriaSeeder::class);
    }

    private function createEmployee(array $attributes = []): Employee
    {
        return Employee::factory()->create($attributes);
    }

    private function createUserWithRole(string $roleName): User
    {
        $role = Role::query()->where('name', $roleName)->firstOrFail();
        $user = User::factory()->for($role)->create();
        $this->acceptCurrentPrivacyPolicy($user);

        return $user;
    }

    public function test_talento_humano_can_create_period_and_auto_assign(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');
        $employee1 = $this->createEmployee(['estado' => 'Activo']);
        $employee2 = $this->createEmployee(['estado' => 'Activo']);

        $response = $this->actingAs($thUser)->post(route('evaluations.periods.store'), [
            'nombre' => 'Periodo Prueba 2026',
            'descripcion' => 'Evaluacion semestral',
            'fecha_inicio' => '2026-11-01',
            'fecha_fin' => '2026-12-01',
            'estado' => 'Abierto',
            'auto_assign_active_employees' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('evaluation_periods', [
            'nombre' => 'Periodo Prueba 2026',
            'estado' => 'Abierto',
        ]);

        $period = EvaluationPeriod::where('nombre', 'Periodo Prueba 2026')->first();

        $this->assertDatabaseHas('performance_evaluations', [
            'evaluation_period_id' => $period->id,
            'employee_id' => $employee1->id,
            'estado' => 'Pendiente',
        ]);
        $this->assertDatabaseHas('performance_evaluations', [
            'evaluation_period_id' => $period->id,
            'employee_id' => $employee2->id,
            'estado' => 'Pendiente',
        ]);
    }

    public function test_jefe_de_area_can_only_evaluate_subordinates_in_own_department(): void
    {
        $dept1 = Department::create(['nombre' => 'Ventas y Mostrador', 'is_active' => true]);
        $dept2 = Department::create(['nombre' => 'Logística e Inventario', 'is_active' => true]);

        $jefeUser = $this->createUserWithRole('Jefe de área');
        $jefeEmployee = $this->createEmployee([
            'user_id' => $jefeUser->id,
            'departamento_id' => $dept1->id,
        ]);
        $dept1->update(['jefe_id' => $jefeEmployee->id]);

        $subordinateDept1 = $this->createEmployee(['departamento_id' => $dept1->id]);
        $otherEmployeeDept2 = $this->createEmployee(['departamento_id' => $dept2->id]);

        $period = EvaluationPeriod::create([
            'nombre' => 'Periodo I',
            'fecha_inicio' => '2026-11-01',
            'fecha_fin' => '2026-11-30',
            'estado' => 'Abierto',
        ]);

        $evalDept1 = PerformanceEvaluation::create([
            'evaluation_period_id' => $period->id,
            'employee_id' => $subordinateDept1->id,
            'estado' => 'Pendiente',
        ]);

        $evalDept2 = PerformanceEvaluation::create([
            'evaluation_period_id' => $period->id,
            'employee_id' => $otherEmployeeDept2->id,
            'estado' => 'Pendiente',
        ]);
        $otherCompletedEmployee = $this->createEmployee(['departamento_id' => $dept2->id]);
        PerformanceEvaluation::create([
            'evaluation_period_id' => $period->id,
            'employee_id' => $otherCompletedEmployee->id,
            'calificacion_final' => 1.0,
            'estado' => 'Completada',
        ]);

        $criteria = EvaluationCriteria::first();

        // 1. Jefe evaluates subordinate in dept 1 -> Success
        $responseSuccess = $this->actingAs($jefeUser)->post(route('evaluations.evaluate', $evalDept1), [
            'observaciones' => 'Buen desempeño comercial',
            'compromisos_mejora' => 'Mejorar puntualidad',
            'scores' => [
                [
                    'criteria_id' => $criteria->id,
                    'calificacion' => 4.5,
                    'comentarios' => 'Excelente actitud',
                ],
            ],
        ]);

        $responseSuccess->assertRedirect();
        $evalDept1->refresh();
        $this->assertEquals('Completada', $evalDept1->estado);
        $this->assertEquals(4.5, (float) $evalDept1->calificacion_final);
        $this->assertEquals($jefeUser->id, $evalDept1->evaluator_id);

        // 2. Jefe attempts to evaluate employee in dept 2 -> 403 Forbidden!
        $responseForbidden = $this->actingAs($jefeUser)->post(route('evaluations.evaluate', $evalDept2), [
            'observaciones' => 'Intento ilegal',
            'scores' => [
                [
                    'criteria_id' => $criteria->id,
                    'calificacion' => 3.0,
                ],
            ],
        ]);

        $responseForbidden->assertForbidden();
        $evalDept2->refresh();
        $this->assertEquals('Pendiente', $evalDept2->estado);

        $this->actingAs($jefeUser)
            ->get(route('evaluations.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('departments.0.id', $dept1->id)
                ->has('departments', 1)
                ->where('periodComparison.0.total', 1)
                ->where('periodComparison.0.completadas', 1)
                ->where('periodComparison.0.promedio', 4.5)
                ->etc()
            );
    }

    public function test_jefe_without_employee_profile_cannot_view_evaluation_data(): void
    {
        $jefeUser = $this->createUserWithRole('Jefe de área');
        $department = Department::factory()->create(['nombre' => 'Área sin responsable']);
        $employee = $this->createEmployee(['departamento_id' => $department->id]);
        $period = EvaluationPeriod::create([
            'nombre' => 'Periodo de evaluación',
            'fecha_inicio' => '2026-11-01',
            'fecha_fin' => '2026-11-30',
            'estado' => 'Abierto',
        ]);
        PerformanceEvaluation::create([
            'evaluation_period_id' => $period->id,
            'employee_id' => $employee->id,
            'estado' => 'Pendiente',
        ]);

        $this->actingAs($jefeUser)
            ->get(route('evaluations.index'))
            ->assertForbidden();
    }

    public function test_jefe_without_employee_profile_cannot_evaluate_unassigned_department_employee(): void
    {
        $jefeUser = $this->createUserWithRole('Jefe de área');
        $department = Department::factory()->create(['nombre' => 'Área sin responsable']);
        $employee = $this->createEmployee(['departamento_id' => $department->id]);
        $period = EvaluationPeriod::create([
            'nombre' => 'Periodo de evaluación',
            'fecha_inicio' => '2026-11-01',
            'fecha_fin' => '2026-11-30',
            'estado' => 'Abierto',
        ]);
        $evaluation = PerformanceEvaluation::create([
            'evaluation_period_id' => $period->id,
            'employee_id' => $employee->id,
            'estado' => 'Pendiente',
        ]);
        $criteria = EvaluationCriteria::firstOrFail();

        $this->actingAs($jefeUser)
            ->post(route('evaluations.evaluate', $evaluation), [
                'scores' => [
                    [
                        'criteria_id' => $criteria->id,
                        'calificacion' => 4,
                    ],
                ],
            ])
            ->assertForbidden();

        $this->assertSame('Pendiente', $evaluation->fresh()->estado);
    }

    public function test_cannot_evaluate_closed_period(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee();

        $period = EvaluationPeriod::create([
            'nombre' => 'Periodo Cerrado',
            'fecha_inicio' => '2026-05-01',
            'fecha_fin' => '2026-05-30',
            'estado' => 'Cerrado',
        ]);

        $eval = PerformanceEvaluation::create([
            'evaluation_period_id' => $period->id,
            'employee_id' => $employee->id,
            'estado' => 'Pendiente',
        ]);

        $criteria = EvaluationCriteria::first();

        $response = $this->actingAs($thUser)->post(route('evaluations.evaluate', $eval), [
            'observaciones' => 'Intento en periodo cerrado',
            'scores' => [
                [
                    'criteria_id' => $criteria->id,
                    'calificacion' => 4.0,
                ],
            ],
        ]);

        $response->assertSessionHas('error');
        $eval->refresh();
        $this->assertEquals('Pendiente', $eval->estado);
    }

    public function test_employee_can_view_own_evaluations_portal(): void
    {
        $empRole = Role::where('name', 'Empleado')->first();
        $empUser = User::factory()->create(['role_id' => $empRole->id]);
        $this->acceptCurrentPrivacyPolicy($empUser);
        $employee = $this->createEmployee(['user_id' => $empUser->id]);

        $period = EvaluationPeriod::create([
            'nombre' => 'Periodo Empleado',
            'fecha_inicio' => '2026-11-01',
            'fecha_fin' => '2026-11-30',
            'estado' => 'Abierto',
        ]);

        $eval = PerformanceEvaluation::create([
            'evaluation_period_id' => $period->id,
            'employee_id' => $employee->id,
            'calificacion_final' => 4.80,
            'estado' => 'Completada',
            'observaciones' => 'Excelente colaborador',
            'fecha_evaluacion' => now(),
        ]);

        $response = $this->actingAs($empUser)->get(route('evaluations.my'));
        $response->assertOk();
    }
}
