<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreContractRequest;
use App\Http\Requests\UpdateContractRequest;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ContractController extends Controller
{
    public function index(Request $request): Response
    {
        $search = (string) $request->input('search', '');
        $status = $request->input('estado');
        $contractTypeId = $request->input('contract_type_id');
        $expiringOnly = $request->boolean('expiring');
        $canManage = $request->user()?->role?->name === 'Talento Humano';

        $today = Carbon::today()->toDateString();
        $thirtyDaysLimit = Carbon::today()->addDays(30)->toDateString();

        $contracts = Contract::query()
            ->with([
                'employee.user:id,name,email',
                'employee.department:id,nombre',
                'employee.position:id,nombre',
                'contractType:id,nombre,codigo,requiere_fecha_fin',
            ])
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($searchQuery) use ($search): void {
                    $searchQuery->where('numero_contrato', 'like', "%{$search}%")
                        ->orWhereHas('employee.user', function ($q) use ($search): void {
                            $q->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        })
                        ->orWhereHas('employee', function ($q) use ($search): void {
                            $q->where('numero_documento', 'like', "%{$search}%");
                        });
                });
            })
            ->when($status !== null && $status !== '', fn ($query) => $query->where('estado', $status))
            ->when($contractTypeId !== null && $contractTypeId !== '', fn ($query) => $query->where('contract_type_id', $contractTypeId))
            ->when($expiringOnly, function ($query) use ($today, $thirtyDaysLimit): void {
                $query->where('estado', 'Vigente')
                    ->whereNotNull('fecha_fin')
                    ->whereBetween('fecha_fin', [$today, $thirtyDaysLimit]);
            })
            ->orderByDesc('id')
            ->paginate(10)
            ->withQueryString();

        // Expiring contracts alert list
        $expiringContracts = Contract::query()
            ->where('estado', 'Vigente')
            ->whereNotNull('fecha_fin')
            ->whereBetween('fecha_fin', [$today, $thirtyDaysLimit])
            ->with([
                'employee.user:id,name,email',
                'contractType:id,nombre',
            ])
            ->orderBy('fecha_fin')
            ->get()
            ->map(fn (Contract $contract) => [
                'id' => $contract->id,
                'numero_contrato' => $contract->numero_contrato,
                'employee_name' => $contract->employee->user->name,
                'contract_type' => $contract->contractType->nombre,
                'fecha_vencimiento' => $contract->fecha_fin->format('Y-m-d'),
                'dias_restantes' => (int) Carbon::today()->diffInDays($contract->fecha_fin, false),
            ]);

        $summary = [
            'vigentes' => Contract::query()->where('estado', 'Vigente')->count(),
            'vencidos' => Contract::query()->where('estado', 'Vencido')->count(),
            'proximos_a_vencer' => $expiringContracts->count(),
            'anulados' => Contract::query()->where('estado', 'Anulado')->count(),
        ];

        return Inertia::render('Contracts/Index', [
            'contracts' => $contracts,
            'expiringContracts' => $expiringContracts,
            'summary' => $summary,
            'candidateEmployees' => $canManage
                ? Employee::query()
                    ->where('estado', 'Activo')
                    ->with(['user:id,name', 'position:id,nombre', 'department:id,nombre'])
                    ->get()
                    ->map(fn ($emp) => [
                        'id' => $emp->id,
                        'name' => $emp->user->name,
                        'position' => $emp->position?->nombre,
                        'department' => $emp->department?->nombre,
                    ])
                : [],
            'contractTypes' => ContractType::query()->where('is_active', true)->orderBy('nombre')->get(),
            'filters' => [
                'search' => $search,
                'estado' => $status,
                'contract_type_id' => $contractTypeId,
                'expiring' => $expiringOnly,
            ],
            'canManage' => $canManage,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function show(Request $request, Contract $contract): Response
    {
        $user = $request->user();

        // Enforce protection for Empleado role
        if ($user?->role?->name === 'Empleado' && $contract->employee->user_id !== $user->id) {
            abort(403, 'No tienes autorización para consultar contratos de otros colaboradores.');
        }

        $contract->loadMissing([
            'employee.user:id,name,email',
            'employee.department:id,nombre',
            'employee.position:id,nombre',
            'contractType',
            'parentContract.contractType',
            'renewals.contractType',
            'creator:id,name',
        ]);

        // Full contractual history of this employee
        $history = Contract::query()
            ->where('employee_id', $contract->employee_id)
            ->with('contractType:id,nombre')
            ->orderByDesc('fecha_inicio')
            ->get();

        $contractTypes = ContractType::query()
            ->where('is_active', true)
            ->orWhereKey($contract->contract_type_id)
            ->orderBy('nombre')
            ->get();

        return Inertia::render('Contracts/Show', [
            'contract' => $contract,
            'history' => $history,
            'contractTypes' => $contractTypes,
            'dias_restantes' => $contract->dias_restantes,
            'canManage' => $user?->role?->name === 'Talento Humano',
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function myContracts(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $employee = $user?->employee;

        if (! $employee) {
            return to_route('dashboard')->with('error', 'Tu usuario no tiene una ficha de colaborador vinculada.');
        }

        $contracts = Contract::query()
            ->where('employee_id', $employee->id)
            ->with(['contractType', 'creator:id,name'])
            ->orderByDesc('fecha_inicio')
            ->get();

        $activeContract = $contracts->firstWhere('estado', 'Vigente');

        return Inertia::render('Contracts/MyContracts', [
            'employee' => $employee->loadMissing(['department', 'position', 'user']),
            'contracts' => $contracts,
            'activeContract' => $activeContract,
        ]);
    }

    public function store(StoreContractRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()->id;

        if (empty($data['numero_contrato'])) {
            $year = Carbon::parse($data['fecha_inicio'])->format('Y');
            $count = Contract::query()->whereYear('created_at', $year)->count() + 1;
            $data['numero_contrato'] = sprintf('CT-%s-%04d', $year, $count);
        }

        DB::transaction(function () use ($data): void {
            if ($data['estado'] === 'Vigente') {
                Contract::query()
                    ->where('employee_id', $data['employee_id'])
                    ->where('estado', 'Vigente')
                    ->update(['estado' => 'Renovado']);
            }

            Contract::query()->create($data);
        });

        return to_route('contracts.index')->with('success', 'El contrato laboral se registró correctamente.');
    }

    public function update(UpdateContractRequest $request, Contract $contract): RedirectResponse
    {
        $contract->update($request->validated());

        return to_route('contracts.show', $contract)->with('success', 'El contrato se actualizó correctamente.');
    }

    public function renew(Request $request, Contract $contract): RedirectResponse
    {
        abort_unless($request->user()?->role?->name === 'Talento Humano', 403, 'Acceso denegado');

        $data = $request->validate([
            'contract_type_id' => ['required', 'exists:contract_types,id'],
            'salario' => ['required', 'numeric', 'min:0'],
            'fecha_inicio' => ['required', 'date'],
            'fecha_fin' => [
                Rule::requiredIf(fn (): bool => (bool) ContractType::query()
                    ->whereKey($request->input('contract_type_id'))
                    ->value('requiere_fecha_fin')),
                'nullable',
                'date',
                'after:fecha_inicio',
            ],
            'observaciones' => ['nullable', 'string', 'max:1000'],
        ]);

        $year = Carbon::parse($data['fecha_inicio'])->format('Y');
        $count = Contract::query()->whereYear('created_at', $year)->count() + 1;

        DB::transaction(function () use ($contract, $data, $request, $year, $count): void {
            // Mark current contract as Renovado
            $contract->update(['estado' => 'Renovado']);

            // Create new contract
            Contract::query()->create([
                'employee_id' => $contract->employee_id,
                'contract_type_id' => $data['contract_type_id'],
                'numero_contrato' => sprintf('CT-%s-%04d', $year, $count),
                'salario' => $data['salario'],
                'fecha_inicio' => $data['fecha_inicio'],
                'fecha_fin' => $data['fecha_fin'] ?? null,
                'estado' => 'Vigente',
                'parent_contract_id' => $contract->id,
                'observaciones' => $data['observaciones'] ?? 'Renovación contractual',
                'created_by' => $request->user()->id,
            ]);
        });

        return back()->with('success', 'El contrato se renovó exitosamente manteniendo el historial anterior.');
    }

    public function annul(Request $request, Contract $contract): RedirectResponse
    {
        abort_unless($request->user()?->role?->name === 'Talento Humano', 403, 'Acceso denegado');

        $data = $request->validate([
            'motivo_anulacion' => ['required', 'string', 'min:5', 'max:500'],
        ], [
            'motivo_anulacion.required' => 'Debes especificar el motivo de anulación.',
        ]);

        $contract->update([
            'estado' => 'Anulado',
            'motivo_anulacion' => $data['motivo_anulacion'],
        ]);

        return back()->with('success', 'El contrato ha sido anulado correctamente.');
    }
}
