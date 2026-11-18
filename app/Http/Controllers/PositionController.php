<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePositionRequest;
use App\Http\Requests\UpdatePositionRequest;
use App\Models\Department;
use App\Models\Position;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PositionController extends Controller
{
    public function index(Request $request): Response
    {
        $search = (string) $request->input('search', '');
        $departmentId = $request->input('departamento_id');
        $status = $request->input('status');
        $canManage = $request->user()?->role?->name === 'Administrador';

        $positions = Position::query()
            ->withCount('employees')
            ->with('department:id,nombre')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where('nombre', 'like', "%{$search}%")
                    ->orWhere('descripcion', 'like', "%{$search}%");
            })
            ->when($departmentId !== null && $departmentId !== '', function ($query) use ($departmentId): void {
                $query->where('departamento_id', $departmentId);
            })
            ->when($status !== null && $status !== '', function ($query) use ($status): void {
                $query->where('is_active', $status === '1' || $status === 'true');
            })
            ->orderBy('nombre')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Positions/Index', [
            'positions' => $positions,
            'departments' => Department::query()->where('is_active', true)->orderBy('nombre')->get(['id', 'nombre']),
            'filters' => [
                'search' => $search,
                'departamento_id' => $departmentId,
                'status' => $status,
            ],
            'canManage' => $canManage,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function store(StorePositionRequest $request): RedirectResponse
    {
        Position::query()->create($request->validated());

        return to_route('positions.index')->with('success', 'El cargo se registró correctamente.');
    }

    public function update(UpdatePositionRequest $request, Position $position): RedirectResponse
    {
        $position->update($request->validated());

        return to_route('positions.index')->with('success', 'El cargo se actualizó correctamente.');
    }

    public function toggleStatus(Request $request, Position $position): RedirectResponse
    {
        abort_unless($request->user()?->role?->name === 'Administrador', 403, 'Acceso denegado');

        if ($position->is_active && $position->employees()->where('estado', 'Activo')->exists()) {
            return back()->with('error', 'No se puede desactivar un cargo asignado a colaboradores activos.');
        }

        $position->update(['is_active' => ! $position->is_active]);

        $action = $position->is_active ? 'activó' : 'desactivó';

        return back()->with('success', "El cargo se {$action} correctamente.");
    }
}
