<?php

namespace App\Http\Controllers;

use App\EmployeeDocumentType;
use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Http\Requests\UpdateEmployeeStatusRequest;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Position;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class EmployeeController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'estado' => ['nullable', Rule::in(['Activo', 'Inactivo'])],
            'departamento_id' => ['nullable', 'integer', 'exists:departamentos,id'],
            'cargo_id' => ['nullable', 'integer', 'exists:cargos,id'],
        ], [
            'search.max' => 'La búsqueda no puede superar los 100 caracteres.',
            'estado.in' => 'El estado seleccionado no es válido.',
            'departamento_id.exists' => 'El departamento seleccionado no es válido.',
            'cargo_id.exists' => 'El cargo seleccionado no es válido.',
        ]);

        $search = $filters['search'] ?? '';
        $status = $filters['estado'] ?? null;
        $departmentId = $filters['departamento_id'] ?? null;
        $positionId = $filters['cargo_id'] ?? null;
        $canManage = $request->user()?->role?->name === 'Talento Humano';
        $departments = Department::query()->orderBy('nombre')->get(['id', 'nombre']);
        $positions = Position::query()->orderBy('nombre')->get(['id', 'nombre']);

        $employees = Employee::query()
            ->with([
                'user:id,name,email',
                'department:id,nombre',
                'position:id,nombre',
            ])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('numero_documento', 'like', "%{$search}%")
                        ->orWhereHas('user', function (Builder $userQuery) use ($search): void {
                            $userQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
            })
            ->when($status !== null, fn (Builder $query) => $query->where('estado', $status))
            ->when(
                $departmentId !== null,
                fn (Builder $query) => $query->where('departamento_id', $departmentId),
            )
            ->when(
                $positionId !== null,
                fn (Builder $query) => $query->where('cargo_id', $positionId),
            )
            ->orderBy('id')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Employees/Index', [
            'employees' => $employees,
            'availableUsers' => $canManage
                ? User::query()
                    ->doesntHave('employee')
                    ->orderBy('name')
                    ->get(['id', 'name', 'email'])
                : [],
            'departments' => $departments,
            'positions' => $positions,
            'documentTypes' => EmployeeDocumentType::options(),
            'filters' => [
                'search' => $search,
                'estado' => $status,
                'departamento_id' => $departmentId,
                'cargo_id' => $positionId,
            ],
            'summary' => [
                'total' => Employee::query()->count(),
                'active' => Employee::query()->where('estado', 'Activo')->count(),
                'departments' => $departments->count(),
            ],
            'canManage' => $canManage,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function show(Request $request, Employee $employee): Response
    {
        $user = $request->user();

        // Enforce strict personal data protection for Empleado role
        if ($user?->role?->name === 'Empleado' && $employee->user_id !== $user->id) {
            abort(403, 'No tienes autorización para consultar la información privada de otro colaborador.');
        }

        $canViewContract = in_array($user?->role?->name, ['Administrador', 'Talento Humano', 'Gerencia'], true)
            || ($user?->role?->name === 'Empleado' && $employee->user_id === $user->id);

        $employee->loadMissing([
            'user:id,name,email',
            'department:id,nombre',
            'position:id,nombre',
        ]);

        if ($canViewContract) {
            $employee->loadMissing('activeContract.contractType:id,nombre');
        }

        $activeContract = $canViewContract ? $employee->activeContract : null;
        $canManageAttendancePin = $user?->role?->name === 'Administrador';
        $attendancePinUpdatedAt = $employee->attendance_pin_updated_at;

        return Inertia::render('Employees/Show', [
            'employee' => [
                'id' => $employee->id,
                'user' => [
                    'name' => $employee->user->name,
                    'email' => $employee->user->email,
                ],
                'tipo_documento' => $employee->tipo_documento,
                'numero_documento' => $employee->numero_documento,
                'telefono' => $employee->telefono,
                'direccion' => $employee->direccion,
                'fecha_nacimiento' => $employee->fecha_nacimiento->format('Y-m-d'),
                'fecha_contratacion' => $employee->fecha_contratacion->format('Y-m-d'),
                'departamento' => $employee->department->nombre,
                'cargo' => $employee->position->nombre,
                'estado' => $employee->estado,
            ],
            'activeContract' => $activeContract ? [
                'id' => $activeContract->id,
                'numero_contrato' => $activeContract->numero_contrato,
                'tipo' => $activeContract->contractType->nombre,
                'salario' => $activeContract->salario,
                'fecha_inicio' => $activeContract->fecha_inicio->format('Y-m-d'),
                'fecha_fin' => $activeContract->fecha_fin?->format('Y-m-d'),
            ] : null,
            'canManage' => $request->user()?->role?->name === 'Talento Humano',
            'canManageAttendancePin' => $canManageAttendancePin,
            'attendanceCode' => $canManageAttendancePin ? $employee->attendance_code : null,
            'hasAttendancePin' => $canManageAttendancePin && is_string($employee->attendance_pin_hash),
            'attendancePinUpdatedAt' => $canManageAttendancePin && $attendancePinUpdatedAt !== null
                ? CarbonImmutable::parse($attendancePinUpdatedAt)->toIso8601String()
                : null,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function me(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $employee = $user?->employee;

        if (! $employee) {
            return to_route('dashboard')->with('error', 'Tu usuario no tiene una ficha de colaborador vinculada.');
        }

        return $this->show($request, $employee);
    }

    public function team(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user?->role?->name === 'Jefe de área' || $user?->role?->name === 'Administrador' || $user?->role?->name === 'Talento Humano', 403, 'Acceso denegado');

        $managerEmployee = $user->employee;
        $department = $managerEmployee
            ? Department::query()->where('jefe_id', $managerEmployee->id)->first()
                ?? $managerEmployee->department
            : null;
        abort_if(
            $user->role?->name === 'Jefe de área' && ! $department,
            403,
            'No tienes un departamento asignado para consultar el equipo.',
        );

        $teamEmployees = Employee::query()
            ->with([
                'user:id,name,email',
                'department:id,nombre',
                'position:id,nombre',
            ])
            ->when($department, fn ($q) => $q->where('departamento_id', $department->id))
            ->where('id', '!=', $managerEmployee?->id ?? 0)
            ->orderBy('estado')
            ->paginate(15);

        return Inertia::render('Employees/Team', [
            'department' => $department,
            'team' => $teamEmployees,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function store(StoreEmployeeRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $employee = DB::transaction(function () use ($data): Employee {
            $user = User::query()->lockForUpdate()->findOrFail($data['user_id']);

            if ($user->employee()->exists()) {
                throw ValidationException::withMessages([
                    'user_id' => 'Esta cuenta ya está vinculada a un empleado.',
                ]);
            }

            return Employee::query()->create($data);
        });

        return to_route('employees.show', $employee)
            ->with('success', 'El empleado se registró correctamente.');
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee): RedirectResponse
    {
        $employee->update($request->validated());

        return to_route('employees.show', $employee)
            ->with('success', 'La información del empleado se actualizó correctamente.');
    }

    public function updateStatus(
        UpdateEmployeeStatusRequest $request,
        Employee $employee,
    ): RedirectResponse {
        $employee->update($request->validated());

        return back()->with('success', 'El estado laboral del empleado se actualizó correctamente.');
    }

    public function updateAttendancePin(Request $request, Employee $employee): RedirectResponse
    {
        $admin = $request->user();
        abort_unless($admin instanceof User && $admin->role?->name === 'Administrador', 403, 'Acceso denegado');

        $validator = Validator::make($request->all(), [
            'pin' => ['required', 'string', 'regex:/\A[0-9]{6,12}\z/'],
            'pin_confirmation' => ['required', 'same:pin'],
        ], [
            'pin.regex' => 'El PIN debe tener entre 6 y 12 dígitos.',
            'pin_confirmation.same' => 'La confirmación del PIN no coincide.',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator);
        }

        $data = $validator->validated();

        DB::transaction(function () use ($employee, $admin, $data): void {
            $lockedEmployee = Employee::query()->lockForUpdate()->findOrFail($employee->getKey());
            $attendanceCode = $lockedEmployee->attendance_code;

            if (! is_string($attendanceCode) || $attendanceCode === '') {
                do {
                    $attendanceCode = Str::upper(Str::random(12));
                } while (Employee::query()->where('attendance_code', $attendanceCode)->exists());
            }

            $lockedEmployee->forceFill([
                'attendance_code' => $attendanceCode,
                'attendance_pin_hash' => Hash::make($data['pin']),
                'attendance_pin_updated_at' => now(),
                'attendance_pin_updated_by' => $admin->id,
            ])->save();
        });

        return to_route('employees.show', $employee)
            ->with('success', 'El código de marcación quedó asignado y el PIN se guardó protegido.');
    }
}
