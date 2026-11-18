<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LeaveRequestController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->input('estado');
        $departmentId = $request->input('departamento_id');
        $employeeId = $request->input('employee_id');
        $leaveTypeId = $request->input('leave_type_id');
        $periodRules = [
            'fecha_desde' => ['nullable', 'date'],
            'fecha_hasta' => ['nullable', 'date'],
        ];

        if ($request->filled('fecha_desde')) {
            $periodRules['fecha_hasta'][] = 'after_or_equal:fecha_desde';
        }

        $periodFilters = $request->validate($periodRules);
        $periodStart = $periodFilters['fecha_desde'] ?? null;
        $periodEnd = $periodFilters['fecha_hasta'] ?? null;
        $canManage = in_array($request->user()?->role?->name, ['Talento Humano', 'Administrador'], true);

        $query = LeaveRequest::query()
            ->with([
                'employee.user:id,name,email',
                'employee.department:id,nombre',
                'employee.position:id,nombre',
                'leaveType',
                'reviewer:id,name',
                'decisions.actor:id,name',
            ])
            ->when($status, fn (Builder $q) => $q->where('estado', $status))
            ->when($departmentId, fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('departamento_id', $departmentId)))
            ->when($employeeId, fn (Builder $q) => $q->where('employee_id', $employeeId))
            ->when($leaveTypeId, fn (Builder $q) => $q->where('leave_type_id', $leaveTypeId))
            ->when($periodEnd, fn (Builder $q) => $q->whereDate('fecha_inicio', '<=', $periodEnd))
            ->when($periodStart, fn (Builder $q) => $q->whereDate('fecha_fin', '>=', $periodStart))
            ->orderByDesc('id');

        $requests = $query->paginate(15)->withQueryString();

        $summary = [
            'pendientes' => LeaveRequest::query()->where('estado', 'Pendiente')->count(),
            'aprobadas' => LeaveRequest::query()->where('estado', 'Aprobada')->count(),
            'rechazadas' => LeaveRequest::query()->where('estado', 'Rechazada')->count(),
            'dias_concedidos' => (float) LeaveRequest::query()->where('estado', 'Aprobada')->sum('dias_solicitados'),
        ];

        return Inertia::render('Leaves/Index', [
            'requests' => $requests,
            'summary' => $summary,
            'departments' => Department::query()->orderBy('nombre')->get(['id', 'nombre']),
            'employees' => Employee::query()
                ->where('estado', 'Activo')
                ->with('user:id,name')
                ->get(['id', 'user_id', 'departamento_id'])
                ->map(fn ($e) => [
                    'id' => $e->id,
                    'name' => $e->user->name,
                    'departamento_id' => $e->departamento_id,
                ]),
            'filterEmployees' => Employee::query()
                ->with('user:id,name')
                ->orderBy('id')
                ->get(['id', 'user_id'])
                ->map(fn ($e) => [
                    'id' => $e->id,
                    'name' => $e->user->name,
                ]),
            'leaveTypes' => LeaveType::query()->where('is_active', true)->orderBy('nombre')->get(),
            'filterLeaveTypes' => LeaveType::query()->orderBy('nombre')->get(['id', 'nombre']),
            'filters' => [
                'estado' => $status,
                'departamento_id' => $departmentId,
                'employee_id' => $employeeId,
                'leave_type_id' => $leaveTypeId,
                'fecha_desde' => $periodStart,
                'fecha_hasta' => $periodEnd,
            ],
            'canManage' => $canManage,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function teamRequests(Request $request): Response
    {
        $user = $request->user();
        abort_unless(in_array($user?->role?->name, ['Jefe de área', 'Talento Humano', 'Administrador'], true), 403, 'Acceso denegado');

        $department = $this->managedDepartmentFor($user);
        abort_if(
            $user->role?->name === 'Jefe de área' && ! $department,
            403,
            'No tienes un departamento asignado para consultar solicitudes de equipo.'
        );

        $requests = LeaveRequest::query()
            ->with([
                'employee.user:id,name,email',
                'employee.position:id,nombre',
                'leaveType',
                'reviewer:id,name',
                'decisions.actor:id,name',
            ])
            ->when($department, function ($q) use ($department): void {
                $q->whereHas('employee', fn ($e) => $e->where('departamento_id', $department->id));
            })
            ->orderByRaw("FIELD(estado, 'Pendiente', 'Aprobada', 'Rechazada', 'Cancelada')")
            ->orderByDesc('id')
            ->paginate(15);

        return Inertia::render('Leaves/TeamApprovals', [
            'department' => $department,
            'requests' => $requests,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function myRequests(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $employee = $user?->employee;

        if (! $employee) {
            return to_route('dashboard')->with('error', 'Tu usuario no tiene una ficha de colaborador vinculada.');
        }

        $balance = $employee->getOrCreateVacationBalance();

        $requests = LeaveRequest::query()
            ->where('employee_id', $employee->id)
            ->with(['leaveType', 'reviewer:id,name', 'decisions.actor:id,name'])
            ->orderByDesc('id')
            ->paginate(15);

        return Inertia::render('Leaves/MyRequests', [
            'employee' => $employee->loadMissing(['user', 'department', 'position']),
            'balance' => [
                'dias_totales_ganados' => (float) $balance->dias_totales_ganados,
                'dias_disfrutados' => (float) $balance->dias_disfrutados,
                'dias_pendientes' => (float) $balance->dias_pendientes,
                'dias_disponibles' => (float) $balance->dias_disponibles,
            ],
            'requests' => $requests,
            'leaveTypes' => LeaveType::query()->where('is_active', true)->orderBy('nombre')->get(),
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $canCreateForEmployee = in_array($user?->role?->name, ['Talento Humano', 'Administrador'], true);

        $data = $request->validate([
            'employee_id' => [
                $canCreateForEmployee ? 'required' : 'prohibited',
                'integer',
                Rule::exists('employees', 'id'),
            ],
            'leave_type_id' => [
                'required',
                'integer',
                Rule::exists('leave_types', 'id')->where('is_active', true),
            ],
            'fecha_inicio' => ['required', 'date', 'after_or_equal:today'],
            'fecha_fin' => ['required', 'date', 'after_or_equal:fecha_inicio'],
            'motivo' => ['required', 'string', 'min:5', 'max:1000'],
        ], [
            'fecha_inicio.after_or_equal' => 'La fecha de inicio debe ser hoy o una fecha futura.',
            'fecha_fin.after_or_equal' => 'La fecha de finalización debe ser igual o posterior a la fecha de inicio.',
            'motivo.required' => 'Debes especificar el motivo o justificación de la solicitud.',
            'employee_id.prohibited' => 'No puedes radicar una solicitud a nombre de otro colaborador.',
        ]);

        $employeeId = $canCreateForEmployee && ! empty($data['employee_id'])
            ? (int) $data['employee_id']
            : $user->employee?->id;

        if (! $employeeId) {
            return back()->with('error', 'No se encontró el colaborador asociado a la solicitud.');
        }

        $employee = Employee::query()->findOrFail($employeeId);
        $leaveType = LeaveType::query()->findOrFail($data['leave_type_id']);

        $data = [
            ...$data,
            ...$request->validate([
                'support_file' => [
                    Rule::requiredIf($leaveType->requires_attachment),
                    'file',
                    'max:10240',
                    'mimes:pdf,jpg,jpeg,png',
                    'mimetypes:application/pdf,image/jpeg,image/png',
                    'extensions:pdf,jpg,jpeg,png',
                ],
            ], [
                'support_file.required' => 'Este tipo de solicitud requiere adjuntar un soporte.',
                'support_file.mimes' => 'El soporte debe ser un PDF, JPG o PNG válido.',
                'support_file.mimetypes' => 'El contenido del soporte debe corresponder a un PDF, JPG o PNG.',
                'support_file.extensions' => 'La extensión del soporte debe ser PDF, JPG o PNG.',
                'support_file.max' => 'El soporte no puede superar los 10 MB.',
            ]),
        ];

        $start = Carbon::parse($data['fecha_inicio']);
        $end = Carbon::parse($data['fecha_fin']);
        $diasSolicitados = 0;
        foreach (CarbonPeriod::create($start, $end) as $date) {
            if ($date->isWeekday()) {
                $diasSolicitados++;
            }
        }

        if ($diasSolicitados === 0) {
            return back()->withErrors([
                'fecha_fin' => 'El período solicitado debe incluir al menos un día hábil.',
            ]);
        }

        if ($leaveType->dias_maximos !== null && $diasSolicitados > $leaveType->dias_maximos) {
            return back()->withErrors([
                'fecha_fin' => "El tipo de solicitud permite un máximo de {$leaveType->dias_maximos} días hábiles.",
            ]);
        }

        // Check overlapping requests for same employee
        $overlap = LeaveRequest::query()
            ->where('employee_id', $employeeId)
            ->whereIn('estado', ['Pendiente', 'Aprobada'])
            ->where(function ($q) use ($data): void {
                $q->whereBetween('fecha_inicio', [$data['fecha_inicio'], $data['fecha_fin']])
                    ->orWhereBetween('fecha_fin', [$data['fecha_inicio'], $data['fecha_fin']])
                    ->orWhere(function ($q2) use ($data): void {
                        $q2->where('fecha_inicio', '<=', $data['fecha_inicio'])
                            ->where('fecha_fin', '>=', $data['fecha_fin']);
                    });
            })
            ->exists();

        if ($overlap) {
            return back()->with('error', 'Ya existe una solicitud pendiente o aprobada que se superpone con las fechas seleccionadas.');
        }

        // Vacation balance verification if it discounts vacation days
        if ($leaveType->descuenta_vacaciones) {
            $balance = $employee->getOrCreateVacationBalance();
            if ($balance->dias_disponibles < $diasSolicitados) {
                return back()->with('error', "Saldo insuficiente. Tienes {$balance->dias_disponibles} días disponibles y estás solicitando {$diasSolicitados} días.");
            }
        }

        $supportFile = $data['support_file'] ?? null;

        DB::transaction(function () use ($request, $data, $employeeId, $leaveType, $diasSolicitados, $employee, $supportFile): void {
            if ($leaveType->descuenta_vacaciones) {
                $balance = $employee->getOrCreateVacationBalance();
                $balance->increment('dias_pendientes', $diasSolicitados);
            }

            $supportPath = $supportFile?->store('leave-supports', 'local');

            if ($supportFile !== null && ! is_string($supportPath)) {
                throw new RuntimeException('No fue posible almacenar el soporte de la solicitud.');
            }

            $originalName = null;
            if ($supportFile !== null) {
                $originalName = basename(str_replace('\\', '/', $supportFile->getClientOriginalName()));
                $originalName = preg_replace('/[\x00-\x1F\x7F]/u', '', $originalName) ?: 'soporte';
                $originalName = mb_substr($originalName, 0, 255);
            }

            $leaveRequest = LeaveRequest::query()->create([
                'employee_id' => $employeeId,
                'leave_type_id' => $data['leave_type_id'],
                'fecha_inicio' => $data['fecha_inicio'],
                'fecha_fin' => $data['fecha_fin'],
                'dias_solicitados' => $diasSolicitados,
                'motivo' => $data['motivo'],
                'estado' => 'Pendiente',
                'support_path' => $supportPath,
                'support_original_name' => $originalName,
                'support_mime_type' => $supportFile?->getMimeType(),
                'support_size' => $supportFile?->getSize(),
            ]);

            $this->recordDecision($request, $leaveRequest, 'Solicitada', null);
        });

        return back()->with('success', 'Tu solicitud fue radicada exitosamente y está pendiente de aprobación.');
    }

    public function approve(Request $request, LeaveRequest $leaveRequest): RedirectResponse
    {
        $user = $request->user();
        $userRole = $user?->role?->name;
        abort_unless(in_array($userRole, ['Talento Humano', 'Jefe de área', 'Administrador'], true), 403, 'Acceso denegado');

        if ($userRole === 'Jefe de área') {
            $managedDepartment = $this->managedDepartmentFor($user);

            if (! $managedDepartment || $leaveRequest->employee->departamento_id !== $managedDepartment->id) {
                abort(403, 'Los jefes de área solamente pueden aprobar solicitudes de empleados de su propio equipo.');
            }
        }

        if ($leaveRequest->estado !== 'Pendiente') {
            return back()->with('error', 'Solo se pueden aprobar solicitudes en estado Pendiente.');
        }

        if ($leaveRequest->leaveType->requires_attachment && ! $leaveRequest->support_path) {
            return back()->with('error', 'No se puede aprobar esta solicitud sin el soporte obligatorio.');
        }

        $data = $request->validate([
            'observaciones_respuesta' => ['nullable', 'string', 'max:500'],
        ]);
        $observations = $data['observaciones_respuesta'] ?? 'Aprobado conforme a políticas internas';

        DB::transaction(function () use ($request, $leaveRequest, $user, $observations): void {
            $employee = $leaveRequest->employee;
            $leaveType = $leaveRequest->leaveType;

            // Update Vacation balance correctly
            if ($leaveType->descuenta_vacaciones) {
                $balance = $employee->getOrCreateVacationBalance();
                $dias = $leaveRequest->dias_solicitados;

                $balance->dias_pendientes = max(0, $balance->dias_pendientes - $dias);
                $balance->dias_disfrutados += $dias;
                $balance->ultima_actualizacion = now()->toDateString();
                $balance->save();
            }

            $leaveRequest->update([
                'estado' => 'Aprobada',
                'aprobado_por' => $user->id,
                'fecha_respuesta' => now(),
                'observaciones_respuesta' => $observations,
            ]);
            $this->recordDecision($request, $leaveRequest, 'Aprobada', $observations);

            // Synchronize attendance records for approved period
            $period = CarbonPeriod::create($leaveRequest->fecha_inicio, $leaveRequest->fecha_fin);
            $attendanceStatus = $leaveType->descuenta_vacaciones
                ? 'Vacaciones'
                : ($leaveType->es_remunerado ? 'Permiso Remunerado' : 'Permiso No Remunerado');

            foreach ($period as $date) {
                if ($date->isWeekend()) {
                    continue; // Skip weekends
                }

                Attendance::query()->updateOrCreate(
                    [
                        'employee_id' => $leaveRequest->employee_id,
                        'fecha' => $date->toDateString(),
                    ],
                    [
                        'estado' => $attendanceStatus,
                        'observaciones' => "Permiso aprobado #{$leaveRequest->id}: {$leaveType->nombre}",
                        'registrado_por' => $user->id,
                    ]
                );
            }
        });

        return back()->with('success', 'La solicitud fue aprobada exitosamente y los días fueron descontados del saldo.');
    }

    public function reject(Request $request, LeaveRequest $leaveRequest): RedirectResponse
    {
        $user = $request->user();
        $userRole = $user?->role?->name;
        abort_unless(in_array($userRole, ['Talento Humano', 'Jefe de área', 'Administrador'], true), 403, 'Acceso denegado');

        if ($userRole === 'Jefe de área') {
            $managedDepartment = $this->managedDepartmentFor($user);

            if (! $managedDepartment || $leaveRequest->employee->departamento_id !== $managedDepartment->id) {
                abort(403, 'Los jefes de área solamente pueden rechazar solicitudes de empleados de su propio equipo.');
            }
        }

        if ($leaveRequest->estado !== 'Pendiente') {
            return back()->with('error', 'Solo se pueden rechazar solicitudes en estado Pendiente.');
        }

        $data = $request->validate([
            'observaciones_respuesta' => ['required', 'string', 'min:5', 'max:500'],
        ], [
            'observaciones_respuesta.required' => 'Debes registrar el motivo del rechazo.',
        ]);

        if ($leaveRequest->leaveType->requires_attachment && ! $leaveRequest->support_path) {
            return back()->with('error', 'No se puede procesar esta solicitud sin el soporte obligatorio.');
        }

        DB::transaction(function () use ($request, $leaveRequest, $user, $data): void {
            $employee = $leaveRequest->employee;
            $leaveType = $leaveRequest->leaveType;

            // Restore pending balance if it affected vacation
            if ($leaveType->descuenta_vacaciones) {
                $balance = $employee->getOrCreateVacationBalance();
                $balance->dias_pendientes = max(0, $balance->dias_pendientes - $leaveRequest->dias_solicitados);
                $balance->save();
            }

            $leaveRequest->update([
                'estado' => 'Rechazada',
                'aprobado_por' => $user->id,
                'fecha_respuesta' => now(),
                'observaciones_respuesta' => $data['observaciones_respuesta'],
            ]);
            $this->recordDecision($request, $leaveRequest, 'Rechazada', $data['observaciones_respuesta']);
        });

        return back()->with('success', 'La solicitud fue rechazada y la justificación quedó registrada.');
    }

    public function cancel(Request $request, LeaveRequest $leaveRequest): RedirectResponse
    {
        $user = $request->user();

        // Only the owner employee or Talento Humano can cancel
        if ($user?->role?->name === 'Empleado' && $leaveRequest->employee->user_id !== $user->id) {
            abort(403, 'Acceso denegado.');
        }

        if ($leaveRequest->estado !== 'Pendiente') {
            return back()->with('error', 'Solo se pueden cancelar solicitudes en estado Pendiente.');
        }

        DB::transaction(function () use ($request, $leaveRequest): void {
            $employee = $leaveRequest->employee;
            $leaveType = $leaveRequest->leaveType;

            if ($leaveType->descuenta_vacaciones) {
                $balance = $employee->getOrCreateVacationBalance();
                $balance->dias_pendientes = max(0, $balance->dias_pendientes - $leaveRequest->dias_solicitados);
                $balance->save();
            }

            $leaveRequest->update(['estado' => 'Cancelada']);
            $this->recordDecision($request, $leaveRequest, 'Cancelada', null);
        });

        return back()->with('success', 'Tu solicitud fue cancelada exitosamente.');
    }

    public function downloadSupport(Request $request, LeaveRequest $leaveRequest): StreamedResponse
    {
        $user = $request->user();
        $userRole = $user?->role?->name;
        abort_unless(in_array($userRole, ['Empleado', 'Jefe de área', 'Talento Humano', 'Administrador'], true), 403);

        if ($userRole === 'Empleado' && $leaveRequest->employee->user_id !== $user->id) {
            abort(404);
        }

        if ($userRole === 'Jefe de área') {
            $department = $this->managedDepartmentFor($user);
            abort_unless(
                $department && $leaveRequest->employee->departamento_id === $department->id,
                404,
            );
        }

        abort_unless(
            is_string($leaveRequest->support_path)
                && Storage::disk('local')->exists($leaveRequest->support_path),
            404,
            'El soporte de la solicitud no está disponible.',
        );

        $extension = match ($leaveRequest->support_mime_type) {
            'application/pdf' => 'pdf',
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            default => 'bin',
        };

        return Storage::disk('local')->download(
            $leaveRequest->support_path,
            "soporte-solicitud-{$leaveRequest->id}.{$extension}",
            [
                'Content-Type' => $leaveRequest->support_mime_type ?? 'application/octet-stream',
                'X-Content-Type-Options' => 'nosniff',
            ],
        );
    }

    private function recordDecision(
        Request $request,
        LeaveRequest $leaveRequest,
        string $action,
        ?string $observations,
    ): void {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $leaveRequest->decisions()->create([
            'user_id' => $user->id,
            'actor_name' => $user->name,
            'actor_role' => $user->role?->name ?? 'Desconocido',
            'action' => $action,
            'observations' => $observations,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'decided_at' => now(),
        ]);
    }

    private function managedDepartmentFor(User $user): ?Department
    {
        $managerEmployee = $user->employee;

        if (! $managerEmployee) {
            return null;
        }

        return Department::query()->where('jefe_id', $managerEmployee->id)->first()
            ?? $managerEmployee->department;
    }
}
