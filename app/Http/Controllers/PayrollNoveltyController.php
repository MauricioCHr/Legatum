<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\PayrollNovelty;
use App\Models\PayrollNoveltyType;
use App\Models\PayrollPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PayrollNoveltyController extends Controller
{
    public function index(Request $request): Response
    {
        $periodId = $request->input('period_id');
        $employeeId = $request->input('employee_id');
        $typeId = $request->input('type_id');
        $status = $request->input('estado');
        $userRole = $request->user()?->role?->name;
        $canManage = $userRole === 'Talento Humano';

        // Default to active open period if no period specified
        if (! $periodId) {
            $defaultPeriod = PayrollPeriod::query()->where('estado', 'Abierto')->latest()->first()
                ?? PayrollPeriod::query()->latest()->first();
            $periodId = $defaultPeriod?->id;
        }

        $periods = PayrollPeriod::query()->orderByDesc('id')->get();
        $currentPeriod = $periods->firstWhere('id', (int) $periodId);

        $query = PayrollNovelty::query()
            ->with([
                'employee.user:id,name,email',
                'employee.department:id,nombre',
                'employee.position:id,nombre',
                'noveltyType',
                'period',
                'creator:id,name',
                'annuler:id,name',
            ])
            ->when($periodId, fn (Builder $q) => $q->where('payroll_period_id', $periodId))
            ->when($employeeId, fn (Builder $q) => $q->where('employee_id', $employeeId))
            ->when($typeId, fn (Builder $q) => $q->where('payroll_novelty_type_id', $typeId))
            ->when($status, fn (Builder $q) => $q->where('estado', $status))
            ->orderByDesc('id');

        $novelties = $query->paginate(15)->withQueryString();

        // Calculate totals for active novelties in the selected period
        $activeInPeriod = PayrollNovelty::query()
            ->where('payroll_period_id', $periodId)
            ->where('estado', 'Activa')
            ->with('noveltyType');

        $totalDevengos = (float) (clone $activeInPeriod)
            ->whereHas('noveltyType', fn ($t) => $t->where('tipo', 'Devengo'))
            ->sum('valor');

        $totalDeducciones = (float) (clone $activeInPeriod)
            ->whereHas('noveltyType', fn ($t) => $t->where('tipo', 'Deduccion'))
            ->sum('valor');

        $summary = [
            'total_devengos' => $totalDevengos,
            'total_deducciones' => $totalDeducciones,
            'total_novedades' => (clone $activeInPeriod)->count(),
            'periodo_estado' => $currentPeriod?->estado ?? 'Sin período',
        ];

        return Inertia::render('Payroll/Index', [
            'novelties' => $novelties,
            'periods' => $periods,
            'currentPeriod' => $currentPeriod,
            'summary' => $summary,
            'noveltyTypes' => PayrollNoveltyType::query()->where('is_active', true)->orderBy('nombre')->get(),
            'employees' => Employee::query()->where('estado', 'Activo')->with('user:id,name')->get()->map(fn ($e) => [
                'id' => $e->id,
                'name' => $e->user->name,
            ]),
            'filters' => [
                'period_id' => $periodId ? (string) $periodId : '',
                'employee_id' => $employeeId,
                'type_id' => $typeId,
                'estado' => $status,
            ],
            'canManage' => $canManage,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function consolidated(Request $request): Response
    {
        $periodId = $request->input('period_id');
        $userRole = $request->user()?->role?->name;
        $canConsolidate = $userRole === 'Talento Humano';

        $periods = PayrollPeriod::query()->orderByDesc('id')->get();

        if (! $periodId) {
            $periodId = $periods->first()?->id;
        }

        $currentPeriod = $periods->firstWhere('id', (int) $periodId);

        // Group active novelties by employee for consolidation
        $noveltiesByEmployee = PayrollNovelty::query()
            ->where('payroll_period_id', $periodId)
            ->where('estado', 'Activa')
            ->with(['employee.user', 'employee.department', 'employee.position', 'noveltyType'])
            ->get()
            ->groupBy('employee_id')
            ->map(function ($items) {
                $first = $items->first();
                $devengos = $items->filter(fn ($i) => $i->noveltyType->tipo === 'Devengo')->sum('valor');
                $deducciones = $items->filter(fn ($i) => $i->noveltyType->tipo === 'Deduccion')->sum('valor');

                return [
                    'employee' => [
                        'id' => $first->employee->id,
                        'name' => $first->employee->user->name,
                        'document' => "{$first->employee->tipo_documento} {$first->employee->numero_documento}",
                        'department' => $first->employee->department->nombre,
                        'position' => $first->employee->position->nombre,
                    ],
                    'devengos' => (float) $devengos,
                    'deducciones' => (float) $deducciones,
                    'neto' => (float) ($devengos - $deducciones),
                    'total_items' => $items->count(),
                    'concepts' => $items->map(fn ($i) => [
                        'id' => $i->id,
                        'name' => $i->noveltyType->nombre,
                        'tipo' => $i->noveltyType->tipo,
                        'valor' => (float) $i->valor,
                        'cantidad' => $i->cantidad ? (float) $i->cantidad : null,
                        'unidad' => $i->noveltyType->unidad_medida,
                    ])->values()->all(),
                ];
            })
            ->values()
            ->all();

        $totalDevengosPeriod = array_sum(array_column($noveltiesByEmployee, 'devengos'));
        $totalDeduccionesPeriod = array_sum(array_column($noveltiesByEmployee, 'deducciones'));

        return Inertia::render('Payroll/Consolidated', [
            'periods' => $periods,
            'currentPeriod' => $currentPeriod,
            'consolidatedEmployees' => $noveltiesByEmployee,
            'totals' => [
                'total_devengos' => (float) $totalDevengosPeriod,
                'total_deducciones' => (float) $totalDeduccionesPeriod,
                'neto' => (float) ($totalDevengosPeriod - $totalDeduccionesPeriod),
                'empleados_con_novedad' => count($noveltiesByEmployee),
            ],
            'canConsolidate' => $canConsolidate,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless(in_array($request->user()?->role?->name, ['Talento Humano', 'Administrador'], true), 403, 'Acceso denegado');

        $data = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'payroll_period_id' => ['required', 'exists:payroll_periods,id'],
            'payroll_novelty_type_id' => ['required', 'exists:payroll_novelty_types,id'],
            'valor' => ['nullable', 'numeric', 'min:0'],
            'cantidad' => ['nullable', 'numeric', 'min:0'],
            'descripcion' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        $period = PayrollPeriod::query()->findOrFail($data['payroll_period_id']);
        if ($period->estado === 'Consolidado' || $period->estado === 'Cerrado') {
            return back()->with('error', 'No se pueden registrar novedades en un período consolidado o cerrado.');
        }

        $data['registrado_por'] = $request->user()->id;
        $data['estado'] = 'Activa';

        PayrollNovelty::query()->create($data);

        return back()->with('success', 'Novedad de nómina registrada exitosamente.');
    }

    public function annul(Request $request, PayrollNovelty $novelty): RedirectResponse
    {
        abort_unless(in_array($request->user()?->role?->name, ['Talento Humano', 'Administrador'], true), 403, 'Acceso denegado');

        if ($novelty->period->estado === 'Consolidado' || $novelty->period->estado === 'Cerrado') {
            return back()->with('error', 'No se pueden anular novedades de un período consolidado o cerrado.');
        }

        $data = $request->validate([
            'motivo_anulacion' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $novelty->update([
            'estado' => 'Anulada',
            'motivo_anulacion' => $data['motivo_anulacion'],
            'anulado_por' => $request->user()->id,
            'fecha_anulacion' => now(),
        ]);

        return back()->with('success', 'La novedad fue anulada correctamente con el motivo registrado.');
    }

    public function consolidatePeriod(Request $request, PayrollPeriod $period): RedirectResponse
    {
        abort_unless(in_array($request->user()?->role?->name, ['Talento Humano', 'Administrador'], true), 403, 'Acceso denegado');

        if ($period->estado === 'Consolidado') {
            return back()->with('error', 'Este período ya se encuentra consolidado.');
        }

        $period->update([
            'estado' => 'Consolidado',
            'consolidado_por' => $request->user()->id,
            'fecha_consolidacion' => now(),
        ]);

        return back()->with('success', "El período {$period->nombre} fue consolidado y transferido al área de Nómina.");
    }
}
