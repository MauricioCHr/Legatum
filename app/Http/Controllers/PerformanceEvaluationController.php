<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Employee;
use App\Models\EvaluationCriteria;
use App\Models\EvaluationPeriod;
use App\Models\EvaluationScore;
use App\Models\PerformanceEvaluation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PerformanceEvaluationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $userRole = $user?->role?->name;

        // Determine if user is Jefe de área
        $isJefe = $userRole === 'Jefe de área';
        $managerEmployee = $user?->employee;
        $managedDepartment = null;

        if ($isJefe) {
            $managedDepartment = $managerEmployee
                ? Department::query()->where('jefe_id', $managerEmployee->id)->first()
                    ?? $managerEmployee->department
                : null;

            abort_if(
                ! $managedDepartment,
                403,
                'No tienes un departamento asignado para consultar evaluaciones.',
            );
        }

        $periodId = $request->input('period_id');
        $departmentId = $request->input('department_id');
        $status = $request->input('estado');

        $periods = EvaluationPeriod::query()->orderByDesc('id')->get();
        $currentPeriod = $periodId
            ? $periods->firstWhere('id', (int) $periodId)
            : ($periods->firstWhere('estado', 'Abierto') ?? $periods->first());

        $evaluationsQuery = PerformanceEvaluation::query()
            ->with([
                'employee.user:id,name,email',
                'employee.department:id,nombre',
                'employee.position:id,nombre',
                'evaluator:id,name',
                'scores.criteria',
            ])
            ->when($currentPeriod, fn ($q) => $q->where('evaluation_period_id', $currentPeriod->id));

        if ($isJefe && $managedDepartment) {
            $evaluationsQuery->whereHas('employee', fn ($e) => $e->where('departamento_id', $managedDepartment->id));
        } elseif ($departmentId) {
            $evaluationsQuery->whereHas('employee', fn ($e) => $e->where('departamento_id', $departmentId));
        }

        if ($status) {
            $evaluationsQuery->where('estado', $status);
        }

        $evaluations = $evaluationsQuery->orderByDesc('id')->get()->map(fn ($eval) => [
            'id' => $eval->id,
            'evaluation_period_id' => $eval->evaluation_period_id,
            'employee_id' => $eval->employee_id,
            'employee_name' => $eval->employee->user->name,
            'employee_document' => $eval->employee->numero_documento,
            'department' => $eval->employee->department?->nombre ?? 'Sin depto',
            'position' => $eval->employee->position?->nombre ?? 'Sin cargo',
            'evaluator_name' => $eval->evaluator?->name ?? 'Sin asignar',
            'calificacion_final' => $eval->calificacion_final ? (float) $eval->calificacion_final : null,
            'estado' => $eval->estado,
            'observaciones' => $eval->observaciones,
            'compromisos_mejora' => $eval->compromisos_mejora,
            'fecha_evaluacion' => $eval->fecha_evaluacion?->format('d/m/Y H:i'),
            'scores' => $eval->scores->map(fn ($s) => [
                'criteria_id' => $s->evaluation_criteria_id,
                'criteria_name' => $s->criteria->nombre,
                'peso' => (float) $s->criteria->peso,
                'calificacion' => (float) $s->calificacion,
                'comentarios' => $s->comentarios,
            ]),
        ]);

        // Statistics for current period
        $periodEvaluations = PerformanceEvaluation::query()
            ->when($currentPeriod, fn ($q) => $q->where('evaluation_period_id', $currentPeriod->id))
            ->when($isJefe && $managedDepartment, fn ($q) => $q->whereHas('employee', fn ($e) => $e->where('departamento_id', $managedDepartment->id)));

        $totalEvaluations = (clone $periodEvaluations)->count();
        $completedEvaluations = (clone $periodEvaluations)->where('estado', 'Completada')->count();
        $pendingEvaluations = $totalEvaluations - $completedEvaluations;
        $averageScore = (clone $periodEvaluations)->where('estado', 'Completada')->avg('calificacion_final');

        $applyDepartmentScope = function (Builder $query) use ($isJefe, $managedDepartment): Builder {
            if ($isJefe && $managedDepartment) {
                $query->whereHas(
                    'employee',
                    fn (Builder $employeeQuery) => $employeeQuery->where('departamento_id', $managedDepartment->id),
                );
            }

            return $query;
        };

        $periodComparison = EvaluationPeriod::query()
            ->withCount([
                'evaluations' => fn (Builder $query) => $applyDepartmentScope($query),
                'evaluations as completed_count' => fn (Builder $query) => $applyDepartmentScope(
                    $query->where('estado', 'Completada'),
                ),
            ])
            ->get()
            ->map(function (EvaluationPeriod $period) use ($applyDepartmentScope): array {
                $averageQuery = $applyDepartmentScope(
                    PerformanceEvaluation::query()
                        ->where('evaluation_period_id', $period->id)
                        ->where('estado', 'Completada'),
                );

                return [
                    'id' => $period->id,
                    'nombre' => $period->nombre,
                    'estado' => $period->estado,
                    'total' => $period->evaluations_count,
                    'completadas' => $period->completed_count,
                    'promedio' => round((float) $averageQuery->avg('calificacion_final'), 2),
                ];
            });

        $activeCriteria = EvaluationCriteria::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->get();
        $departments = Department::query()
            ->where('is_active', true)
            ->when(
                $isJefe && $managedDepartment,
                fn (Builder $query) => $query->whereKey($managedDepartment->id),
            )
            ->orderBy('nombre')
            ->get();

        return Inertia::render('Evaluations/Index', [
            'periods' => $periods,
            'currentPeriod' => $currentPeriod,
            'evaluations' => $evaluations,
            'criteria' => $activeCriteria,
            'departments' => $departments,
            'stats' => [
                'total' => $totalEvaluations,
                'completadas' => $completedEvaluations,
                'pendientes' => $pendingEvaluations,
                'promedio' => $averageScore ? round((float) $averageScore, 2) : 0,
            ],
            'periodComparison' => $periodComparison,
            'isJefe' => $isJefe,
            'managedDepartment' => $managedDepartment?->nombre,
            'canManagePeriods' => in_array($userRole, ['Administrador', 'Talento Humano']),
            'canEvaluate' => in_array($userRole, ['Administrador', 'Talento Humano', 'Jefe de área']),
            'filters' => [
                'period_id' => $currentPeriod?->id ? (string) $currentPeriod->id : '',
                'department_id' => $departmentId ?? '',
                'estado' => $status ?? '',
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function myEvaluations(Request $request): Response|RedirectResponse
    {
        $employee = $request->user()?->employee;

        if (! $employee) {
            return to_route('dashboard')->with('error', 'Tu usuario no tiene una ficha de colaborador vinculada.');
        }

        $evaluations = PerformanceEvaluation::query()
            ->where('employee_id', $employee->id)
            ->with(['period', 'evaluator:id,name', 'scores.criteria'])
            ->orderByDesc('id')
            ->get()
            ->map(fn ($eval) => [
                'id' => $eval->id,
                'period_name' => $eval->period->nombre,
                'period_dates' => $eval->period->fecha_inicio->format('d/m/Y').' - '.$eval->period->fecha_fin->format('d/m/Y'),
                'period_status' => $eval->period->estado,
                'evaluator_name' => $eval->evaluator?->name ?? 'Talento Humano',
                'calificacion_final' => $eval->calificacion_final ? (float) $eval->calificacion_final : null,
                'estado' => $eval->estado,
                'observaciones' => $eval->observaciones,
                'compromisos_mejora' => $eval->compromisos_mejora,
                'fecha_evaluacion' => $eval->fecha_evaluacion?->format('d/m/Y H:i'),
                'scores' => $eval->scores->map(fn ($s) => [
                    'criteria_name' => $s->criteria->nombre,
                    'criteria_description' => $s->criteria->descripcion,
                    'peso' => (float) $s->criteria->peso,
                    'calificacion' => (float) $s->calificacion,
                    'comentarios' => $s->comentarios,
                ]),
            ]);

        return Inertia::render('Evaluations/MyEvaluations', [
            'employee' => [
                'name' => $request->user()->name,
                'document' => $employee->numero_documento,
                'department' => $employee->department?->nombre ?? 'Sin depto',
                'position' => $employee->position?->nombre ?? 'Sin cargo',
            ],
            'evaluations' => $evaluations,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function storePeriod(Request $request): RedirectResponse
    {
        $userRole = $request->user()?->role?->name;
        abort_unless(in_array($userRole, ['Administrador', 'Talento Humano']), 403, 'Acceso denegado');

        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string', 'max:1000'],
            'fecha_inicio' => ['required', 'date'],
            'fecha_fin' => ['required', 'date', 'after_or_equal:fecha_inicio'],
            'estado' => ['required', 'in:Borrador,Abierto,Cerrado'],
            'auto_assign_active_employees' => ['nullable', 'boolean'],
        ]);

        $period = EvaluationPeriod::create([
            'nombre' => $data['nombre'],
            'descripcion' => $data['descripcion'] ?? null,
            'fecha_inicio' => $data['fecha_inicio'],
            'fecha_fin' => $data['fecha_fin'],
            'estado' => $data['estado'],
            'created_by' => $request->user()->id,
        ]);

        if (! empty($data['auto_assign_active_employees'])) {
            $activeEmployees = Employee::query()->where('estado', 'Activo')->get();
            foreach ($activeEmployees as $emp) {
                PerformanceEvaluation::firstOrCreate([
                    'evaluation_period_id' => $period->id,
                    'employee_id' => $emp->id,
                ], [
                    'estado' => 'Pendiente',
                ]);
            }
        }

        return back()->with('success', 'Período de evaluación creado exitosamente.');
    }

    public function togglePeriodStatus(Request $request, EvaluationPeriod $period): RedirectResponse
    {
        $userRole = $request->user()?->role?->name;
        abort_unless(in_array($userRole, ['Administrador', 'Talento Humano']), 403, 'Acceso denegado');

        $data = $request->validate([
            'estado' => ['required', 'in:Borrador,Abierto,Cerrado'],
        ]);

        $period->update(['estado' => $data['estado']]);

        return back()->with('success', "El estado del período se actualizó a '{$data['estado']}'.");
    }

    public function evaluate(Request $request, PerformanceEvaluation $evaluation): RedirectResponse
    {
        $user = $request->user();
        $userRole = $user?->role?->name;

        abort_unless(in_array($userRole, ['Administrador', 'Talento Humano', 'Jefe de área']), 403, 'No tienes permisos para calificar evaluaciones.');

        // Guard against evaluating closed period
        if ($evaluation->period->estado === 'Cerrado') {
            return back()->with('error', 'No se pueden calificar ni modificar evaluaciones de un período cerrado.');
        }

        // Jefe de área check: must only evaluate their department employees!
        if ($userRole === 'Jefe de área') {
            $managerEmployee = $user->employee;
            $managedDepartment = $managerEmployee
                ? Department::query()->where('jefe_id', $managerEmployee->id)->first()
                    ?? $managerEmployee->department
                : null;

            if (! $managedDepartment || $evaluation->employee->departamento_id !== $managedDepartment->id) {
                abort(403, 'Los jefes de área solamente pueden evaluar a empleados de su propio equipo.');
            }
        }

        $data = $request->validate([
            'observaciones' => ['nullable', 'string', 'max:2000'],
            'compromisos_mejora' => ['nullable', 'string', 'max:2000'],
            'scores' => ['required', 'array', 'min:1'],
            'scores.*.criteria_id' => ['required', 'exists:evaluation_criteria,id'],
            'scores.*.calificacion' => ['required', 'numeric', 'min:1', 'max:5'],
            'scores.*.comentarios' => ['nullable', 'string', 'max:500'],
        ]);

        // Calculate weighted score
        $totalWeight = 0;
        $weightedSum = 0;

        foreach ($data['scores'] as $item) {
            $criteria = EvaluationCriteria::findOrFail($item['criteria_id']);
            $weight = (float) $criteria->peso > 0 ? (float) $criteria->peso : 1.0;
            $totalWeight += $weight;
            $weightedSum += ((float) $item['calificacion']) * $weight;

            EvaluationScore::updateOrCreate(
                [
                    'performance_evaluation_id' => $evaluation->id,
                    'evaluation_criteria_id' => $criteria->id,
                ],
                [
                    'calificacion' => $item['calificacion'],
                    'comentarios' => $item['comentarios'] ?? null,
                ]
            );
        }

        $finalScore = $totalWeight > 0 ? round($weightedSum / $totalWeight, 2) : 0;

        $evaluation->update([
            'evaluator_id' => $user->id,
            'calificacion_final' => $finalScore,
            'estado' => 'Completada',
            'observaciones' => $data['observaciones'] ?? null,
            'compromisos_mejora' => $data['compromisos_mejora'] ?? null,
            'fecha_evaluacion' => now(),
        ]);

        return back()->with('success', "Evaluación calificada exitosamente con puntaje final de {$finalScore} / 5.00.");
    }
}
