<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDepartmentRequest;
use App\Http\Requests\UpdateDepartmentRequest;
use App\Models\Department;
use App\Models\Employee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DepartmentController extends Controller
{
    public function index(Request $request): Response
    {
        $search = (string) $request->input('search', '');
        $status = $request->input('status');
        $canManage = $request->user()?->role?->name === 'Administrador';

        $departments = Department::query()
            ->withCount(['employees', 'positions'])
            ->with(['manager.user:id,name,email'])
            ->when($search !== '', function ($query) use ($search): void {
                $query->where('nombre', 'like', "%{$search}%")
                    ->orWhere('descripcion', 'like', "%{$search}%");
            })
            ->when($status !== null && $status !== '', function ($query) use ($status): void {
                $query->where('is_active', $status === '1' || $status === 'true');
            })
            ->orderBy('nombre')
            ->paginate(10)
            ->withQueryString();

        $candidateManagers = $canManage
            ? Employee::query()
                ->where('estado', 'Activo')
                ->with('user:id,name')
                ->get()
                ->map(fn (Employee $emp) => [
                    'id' => $emp->id,
                    'name' => $emp->user->name,
                ])
            : [];

        return Inertia::render('Departments/Index', [
            'departments' => $departments,
            'candidateManagers' => $candidateManagers,
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'canManage' => $canManage,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function store(StoreDepartmentRequest $request): RedirectResponse
    {
        Department::query()->create($request->validated());

        return to_route('departments.index')->with('success', 'El departamento se registró correctamente.');
    }

    public function update(UpdateDepartmentRequest $request, Department $department): RedirectResponse
    {
        $department->update($request->validated());

        return to_route('departments.index')->with('success', 'El departamento se actualizó correctamente.');
    }

    public function toggleStatus(Request $request, Department $department): RedirectResponse
    {
        abort_unless($request->user()?->role?->name === 'Administrador', 403, 'Acceso denegado');

        if ($department->is_active && $department->employees()->where('estado', 'Activo')->exists()) {
            return back()->with('error', 'No se puede desactivar un departamento con colaboradores activos.');
        }

        $department->update(['is_active' => ! $department->is_active]);

        $action = $department->is_active ? 'activó' : 'desactivó';

        return back()->with('success', "El departamento se {$action} correctamente.");
    }
}
