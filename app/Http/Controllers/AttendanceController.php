<?php

namespace App\Http\Controllers;

use App\AttendanceMarkStatus;
use App\Models\Attendance;
use App\Models\AttendanceCorrection;
use App\Models\Department;
use App\Models\Employee;
use App\Models\User;
use App\Services\AttendanceMarkingService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    public function index(Request $request): Response
    {
        $employeeId = $request->input('employee_id');
        $departmentId = $request->input('departamento_id');
        $status = $request->input('estado');
        $startDate = $request->input('fecha_inicio', Carbon::now('America/Bogota')->startOfMonth()->toDateString());
        $endDate = $request->input('fecha_fin', Carbon::now('America/Bogota')->toDateString());
        $canManage = $request->user()?->role?->name === 'Talento Humano';

        $query = Attendance::query()
            ->with([
                'employee.user:id,name,email',
                'employee.department:id,nombre',
                'employee.position:id,nombre',
                'correctedBy:id,name',
                'corrections',
            ])
            ->when($employeeId, fn (Builder $q) => $q->where('employee_id', $employeeId))
            ->when($departmentId, function (Builder $q) use ($departmentId): void {
                $q->whereHas('employee', fn ($emp) => $emp->where('departamento_id', $departmentId));
            })
            ->when($status, fn (Builder $q) => $q->where('estado', $status))
            ->when($startDate, fn (Builder $q) => $q->whereDate('fecha', '>=', $startDate))
            ->when($endDate, fn (Builder $q) => $q->whereDate('fecha', '<=', $endDate))
            ->orderByDesc('fecha')
            ->orderByDesc('id');

        $attendances = $query->paginate(15)->withQueryString();

        // Calculate summary metrics for the filtered date range
        $metricsQuery = Attendance::query()
            ->when($startDate, fn ($q) => $q->whereDate('fecha', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->whereDate('fecha', '<=', $endDate))
            ->when($departmentId, fn ($q) => $q->whereHas('employee', fn ($e) => $e->where('departamento_id', $departmentId)));

        $summary = [
            'presentes' => (clone $metricsQuery)->where('estado', 'Presente')->count(),
            'retardos' => (clone $metricsQuery)->where('estado', 'Retardo')->count(),
            'ausencias' => (clone $metricsQuery)->where('estado', 'Ausencia Injustificada')->count(),
            'permisos_incapacidades' => (clone $metricsQuery)->whereIn('estado', ['Permiso Remunerado', 'Permiso No Remunerado', 'Incapacidad', 'Vacaciones'])->count(),
            'total_horas_extra' => (float) (clone $metricsQuery)->sum('horas_extra'),
        ];

        return Inertia::render('Attendance/Index', [
            'attendances' => $attendances,
            'summary' => $summary,
            'departments' => Department::query()->orderBy('nombre')->get(['id', 'nombre']),
            'employees' => Employee::query()->where('estado', 'Activo')->with('user:id,name')->get()->map(fn ($e) => [
                'id' => $e->id,
                'name' => $e->user->name,
                'departamento_id' => $e->departamento_id,
            ]),
            'filters' => [
                'employee_id' => $employeeId,
                'departamento_id' => $departmentId,
                'estado' => $status,
                'fecha_inicio' => $startDate,
                'fecha_fin' => $endDate,
            ],
            'canManage' => $canManage,
            'today' => Carbon::now('America/Bogota')->toDateString(),
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function team(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user?->role?->name === 'Jefe de área' || $user?->role?->name === 'Talento Humano' || $user?->role?->name === 'Administrador', 403, 'Acceso denegado');

        $managerEmployee = $user->employee;
        $department = $managerEmployee
            ? Department::query()->where('jefe_id', $managerEmployee->id)->first()
                ?? $managerEmployee->department
            : null;
        abort_if(
            $user->role?->name === 'Jefe de área' && ! $department,
            403,
            'No tienes un departamento asignado para consultar asistencias del equipo.',
        );

        $startDate = $request->input('fecha_inicio', Carbon::now('America/Bogota')->startOfWeek()->toDateString());
        $endDate = $request->input('fecha_fin', Carbon::now('America/Bogota')->toDateString());
        $status = $request->input('estado');

        $attendances = Attendance::query()
            ->with([
                'employee.user:id,name,email',
                'employee.position:id,nombre',
                'correctedBy:id,name',
            ])
            ->when($department, function ($q) use ($department): void {
                $q->whereHas('employee', fn ($emp) => $emp->where('departamento_id', $department->id));
            })
            ->when($status, fn ($q) => $q->where('estado', $status))
            ->when($startDate, fn ($q) => $q->whereDate('fecha', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->whereDate('fecha', '<=', $endDate))
            ->orderByDesc('fecha')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Attendance/Team', [
            'department' => $department,
            'attendances' => $attendances,
            'filters' => [
                'fecha_inicio' => $startDate,
                'fecha_fin' => $endDate,
                'estado' => $status,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function myAttendance(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $employee = $user?->employee;

        if (! $employee) {
            return to_route('dashboard')->with('error', 'No tienes una ficha de colaborador vinculada.');
        }

        $startDate = $request->input('fecha_inicio', Carbon::now('America/Bogota')->startOfMonth()->toDateString());
        $endDate = $request->input('fecha_fin', Carbon::now('America/Bogota')->toDateString());

        $attendances = Attendance::query()
            ->where('employee_id', $employee->id)
            ->when($startDate, fn ($q) => $q->whereDate('fecha', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->whereDate('fecha', '<=', $endDate))
            ->orderByDesc('fecha')
            ->paginate(15)
            ->withQueryString();

        $todayRecord = Attendance::query()
            ->where('employee_id', $employee->id)
            ->whereDate('fecha', Carbon::now('America/Bogota')->toDateString())
            ->first();

        return Inertia::render('Attendance/MyAttendance', [
            'attendances' => $attendances,
            'todayRecord' => $todayRecord,
            'employee' => $employee->loadMissing('user'),
            'today' => Carbon::now('America/Bogota')->toDateString(),
            'filters' => [
                'fecha_inicio' => $startDate,
                'fecha_fin' => $endDate,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function clock(Request $request, AttendanceMarkingService $attendanceMarkingService): RedirectResponse
    {
        $user = $request->user();
        $employee = $user?->employee;

        if (! $employee || ! $user instanceof User) {
            return back()->with('error', 'Usuario no vinculado a empleado.');
        }

        return match ($attendanceMarkingService->toggleForUser($employee, $user)) {
            AttendanceMarkStatus::EntryRecorded => back()->with('success', 'Entrada registrada correctamente.'),
            AttendanceMarkStatus::ExitRecorded => back()->with('success', 'Salida registrada correctamente.'),
            AttendanceMarkStatus::AlreadyRecorded => back()->with('error', 'Ya existe una marcación para hoy o una entrada reciente está abierta.'),
            AttendanceMarkStatus::NoOpenEntry => back()->with('error', 'No hay una entrada abierta para registrar salida.'),
            AttendanceMarkStatus::InvalidCredentials => back()->with('error', 'No fue posible validar tu marcación.'),
            AttendanceMarkStatus::InactiveEmployee => back()->with('error', 'El registro laboral no está activo. Consulta a Talento Humano.'),
        };
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role?->name === 'Talento Humano', 403, 'Acceso denegado');

        $data = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'fecha' => ['required', 'date'],
            'hora_entrada' => ['nullable', 'date_format:H:i'],
            'hora_salida' => ['nullable', 'date_format:H:i', 'after:hora_entrada'],
            'estado' => ['required', Rule::in([
                'Presente',
                'Retardo',
                'Ausencia Injustificada',
                'Permiso Remunerado',
                'Permiso No Remunerado',
                'Incapacidad',
                'Vacaciones',
            ])],
            'minutos_retardo' => ['nullable', 'integer', 'min:0'],
            'horas_extra' => ['nullable', 'numeric', 'min:0'],
            'observaciones' => ['nullable', 'string', 'max:500'],
        ], [
            'employee_id.required' => 'Debes seleccionar un colaborador.',
            'fecha.required' => 'La fecha de asistencia es obligatoria.',
            'hora_salida.after' => 'La hora de salida debe ser posterior a la de entrada.',
        ]);

        // Evitar registros duplicados para un mismo empleado y jornada
        $existing = Attendance::query()
            ->where('employee_id', $data['employee_id'])
            ->whereDate('fecha', $data['fecha'])
            ->exists();

        if ($existing) {
            return back()->with('error', 'Ya existe un registro de asistencia para este colaborador en la fecha indicada. Utiliza la opción Corregir para modificarlo.');
        }

        $data['registrado_por'] = $request->user()->id;
        $data['origen_entrada'] = filled($data['hora_entrada'] ?? null) ? 'manual' : null;
        $data['origen_salida'] = filled($data['hora_salida'] ?? null) ? 'manual' : null;
        Attendance::query()->create($data);

        return back()->with('success', 'Registro de asistencia guardado exitosamente.');
    }

    public function update(Request $request, Attendance $attendance): RedirectResponse
    {
        abort_unless($request->user()?->role?->name === 'Talento Humano', 403, 'Acceso denegado');

        $data = $request->validate([
            'hora_entrada' => ['nullable', 'date_format:H:i'],
            'hora_salida' => ['nullable', 'date_format:H:i'],
            'estado' => ['required', Rule::in([
                'Presente',
                'Retardo',
                'Ausencia Injustificada',
                'Permiso Remunerado',
                'Permiso No Remunerado',
                'Incapacidad',
                'Vacaciones',
            ])],
            'minutos_retardo' => ['nullable', 'integer', 'min:0'],
            'horas_extra' => ['nullable', 'numeric', 'min:0'],
            'justificacion_correccion' => ['required', 'string', 'min:5', 'max:500'],
            'observaciones' => ['nullable', 'string', 'max:500'],
        ], [
            'justificacion_correccion.required' => 'La justificación de la corrección es obligatoria.',
            'justificacion_correccion.min' => 'La justificación debe tener al menos 5 caracteres.',
        ]);

        $user = $request->user();
        abort_unless($user instanceof User, 401);

        DB::transaction(function () use ($attendance, $data, $user): void {
            $lockedAttendance = Attendance::query()->lockForUpdate()->findOrFail($attendance->getKey());
            $trackedFields = [
                'hora_entrada',
                'hora_salida',
                'estado',
                'minutos_retardo',
                'horas_extra',
                'observaciones',
                'origen_entrada',
                'origen_salida',
            ];
            $originalValues = Arr::only($lockedAttendance->getAttributes(), $trackedFields);

            foreach (['hora_entrada', 'hora_salida'] as $timeField) {
                $originalValues[$timeField] = filled($originalValues[$timeField])
                    ? substr((string) $originalValues[$timeField], 0, 5)
                    : null;
            }

            $correctedValues = array_replace(
                $originalValues,
                Arr::only($data, [
                    'hora_entrada',
                    'hora_salida',
                    'estado',
                    'minutos_retardo',
                    'horas_extra',
                    'observaciones',
                ]),
            );

            foreach (['hora_entrada', 'hora_salida'] as $timeField) {
                if ($originalValues[$timeField] !== ($correctedValues[$timeField] ?? null)) {
                    $correctedValues[$timeField === 'hora_entrada' ? 'origen_entrada' : 'origen_salida'] = 'corregido';
                }
            }

            AttendanceCorrection::query()->create([
                'attendance_id' => $lockedAttendance->id,
                'user_id' => $user->id,
                'actor_name' => $user->name,
                'actor_role' => $user->role?->name ?? 'Desconocido',
                'original_values' => $originalValues,
                'corrected_values' => $correctedValues,
                'reason' => $data['justificacion_correccion'],
                'corrected_at' => now(),
            ]);

            $lockedAttendance->update([
                ...$data,
                'origen_entrada' => $correctedValues['origen_entrada'],
                'origen_salida' => $correctedValues['origen_salida'],
                'corregido_por' => $user->id,
                'fecha_correccion' => now(),
            ]);
        });

        return back()->with('success', 'El registro de asistencia fue corregido con justificación guardada.');
    }
}
