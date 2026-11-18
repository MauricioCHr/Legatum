<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\PayrollNovelty;
use App\Models\Position;
use App\Models\VacationBalance;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class StrategicReportService
{
    private const PRESENT_STATES = ['Presente', 'Retardo'];

    private const ABSENCE_STATES = ['Ausente', 'Ausencia Injustificada'];

    private const ELIGIBLE_ATTENDANCE_STATES = [
        'Presente',
        'Retardo',
        'Ausente',
        'Ausencia Injustificada',
    ];

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    public function build(
        string $reportType,
        array $filters,
        string $userRole,
        bool $isJefe,
        ?Department $managedDepartment,
    ): array {
        return match ($reportType) {
            'executive_overview' => $this->executiveOverview($filters, $isJefe, $managedDepartment),
            'contracts_status' => $this->contractsStatus($filters, $isJefe, $managedDepartment, $userRole),
            'attendance_absenteeism' => $this->attendanceAbsenteeism($filters, $isJefe, $managedDepartment, $userRole),
            'leaves_payroll' => $this->leavesPayroll($filters, $isJefe, $managedDepartment, $userRole),
            default => throw new InvalidArgumentException("Unsupported strategic report type: {$reportType}"),
        };
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    private function executiveOverview(array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        $employees = $this->employeeQuery($filters, $isJefe, $managedDepartment);
        $totalEmployees = (clone $employees)->count();
        $activeEmployees = (clone $employees)->where('estado', 'Activo')->count();
        $inactiveEmployees = (clone $employees)->where('estado', 'Inactivo')->count();
        $newHires = (clone $employees)
            ->whereBetween('fecha_contratacion', [$filters['date_from'], $filters['date_to']])
            ->count();

        $departments = Department::query()
            ->when($isJefe, fn (Builder $query) => $query->whereKey($managedDepartment?->id))
            ->when(! $isJefe && $filters['department_id'] !== '', fn (Builder $query) => $query->whereKey($filters['department_id']))
            ->withCount([
                'employees as employees_count' => fn (Builder $query) => $this->filterEmployeeRelation($query, $filters),
                'employees as active_employees_count' => fn (Builder $query) => $this->filterEmployeeRelation($query, $filters)->where('estado', 'Activo'),
                'employees as inactive_employees_count' => fn (Builder $query) => $this->filterEmployeeRelation($query, $filters)->where('estado', 'Inactivo'),
                'employees as pending_requests_count' => fn (Builder $query) => $this->filterEmployeeRelation($query, $filters)
                    ->whereHas('leaveRequests', fn (Builder $leaveQuery) => $leaveQuery->where('estado', 'Pendiente')),
            ])
            ->orderBy('nombre')
            ->get();

        $departmentRows = $departments->map(fn (Department $department): array => [
            'departamento' => $department->nombre,
            'total' => $department->employees_count,
            'activos' => $department->active_employees_count,
            'inactivos' => $department->inactive_employees_count,
            'solicitudes_pendientes' => $department->pending_requests_count,
        ])->all();

        $positions = Position::query()
            ->when($isJefe, fn (Builder $query) => $query->where('departamento_id', $managedDepartment?->id))
            ->when(! $isJefe && $filters['department_id'] !== '', fn (Builder $query) => $query->where('departamento_id', $filters['department_id']))
            ->withCount([
                'employees as employees_count' => fn (Builder $query) => $this->filterEmployeeRelation($query, $filters),
            ])
            ->when($filters['employee_id'] !== '', fn (Builder $query) => $query->whereHas(
                'employees',
                fn (Builder $employeeQuery) => $employeeQuery->whereKey($filters['employee_id']),
            ))
            ->orderBy('nombre')
            ->get()
            ->map(fn (Position $position): array => [
                'cargo' => $position->nombre,
                'departamento' => $position->department?->nombre ?? 'Sin departamento',
                'empleados' => $position->employees_count,
            ])
            ->all();

        $contractTypes = ContractType::query()
            ->withCount([
                'contracts as contracts_count' => fn (Builder $query) => $this->filterContractRelation($query, $filters, $isJefe, $managedDepartment),
            ])
            ->orderBy('nombre')
            ->get()
            ->map(fn (ContractType $type): array => [
                'label' => $type->nombre,
                'value' => $type->contracts_count,
            ])
            ->all();

        $contractScope = $this->contractQuery($filters, $isJefe, $managedDepartment);
        $activeContracts = (clone $contractScope)
            ->where('estado', 'Vigente')
            ->where(fn (Builder $query) => $query->whereNull('fecha_fin')->orWhereDate('fecha_fin', '>=', Carbon::today()))
            ->count();
        $expiredContracts = (clone $contractScope)
            ->where(fn (Builder $query) => $query->where('estado', 'Vencido')->orWhereDate('fecha_fin', '<', Carbon::today()))
            ->count();
        $expiringContracts = (clone $contractScope)
            ->proximosAVencer((int) config('legatum.contract_expiry_days', 30))
            ->count();

        $pendingRequests = $this->leaveQuery($filters, $isJefe, $managedDepartment)
            ->where('estado', 'Pendiente')
            ->count();

        $attendance = $this->attendanceQuery($filters, $isJefe, $managedDepartment)
            ->whereBetween('fecha', [$filters['date_from'], $filters['date_to']])
            ->whereIn('estado', self::ELIGIBLE_ATTENDANCE_STATES)
            ->get(['estado']);
        $workedAttendance = $attendance->whereIn('estado', self::PRESENT_STATES)->count();
        $absenceAttendance = $attendance->whereIn('estado', self::ABSENCE_STATES)->count();
        $eligibleAttendance = $workedAttendance + $absenceAttendance;

        $rows = $departmentRows;
        $title = 'Informe Ejecutivo de Talento Humano';
        $summary = [
            'Empleados registrados' => $totalEmployees,
            'Empleados activos' => $activeEmployees,
            'Empleados inactivos' => $inactiveEmployees,
            'Nuevos ingresos en el período' => $newHires,
            'Contratos activos' => $activeContracts,
            'Contratos vencidos' => $expiredContracts,
            'Contratos próximos a vencer' => $expiringContracts,
            'Solicitudes pendientes' => $pendingRequests,
            'Asistencia registrada' => $this->percentage($workedAttendance, $eligibleAttendance),
        ];

        return [
            'title' => $title,
            'headers' => ['Departamento', 'Total empleados', 'Activos', 'Inactivos', 'Solicitudes pendientes'],
            'rows' => $rows,
            'summary' => $summary,
            'charts' => [
                $this->barChart('Personal por departamento', array_map(
                    fn (array $row): array => ['label' => $row['departamento'], 'value' => $row['total']],
                    $departmentRows,
                )),
                $this->barChart('Estado de los empleados', [
                    ['label' => 'Activos', 'value' => $activeEmployees],
                    ['label' => 'Inactivos', 'value' => $inactiveEmployees],
                ]),
                $this->barChart('Contratos por tipo', $contractTypes),
            ],
            'sections' => [
                [
                    'title' => 'Distribución por cargo',
                    'headers' => ['Cargo', 'Departamento', 'Empleados'],
                    'rows' => $positions,
                ],
            ],
            'period' => "{$filters['date_from']} a {$filters['date_to']}",
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    private function contractsStatus(
        array $filters,
        bool $isJefe,
        ?Department $managedDepartment,
        string $userRole,
    ): array {
        $showSalary = in_array($userRole, ['Administrador', 'Talento Humano'], true);
        $columns = [
            'id',
            'employee_id',
            'contract_type_id',
            'numero_contrato',
            'fecha_inicio',
            'fecha_fin',
            'estado',
        ];
        if ($showSalary) {
            $columns[] = 'salario';
        }

        $query = $this->contractQuery($filters, $isJefe, $managedDepartment)
            ->select($columns)
            ->with(['employee:id,user_id,departamento_id', 'employee.user:id,name', 'employee.department:id,nombre', 'contractType:id,nombre'])
            ->when($filters['contract_type_id'] !== '', fn (Builder $builder) => $builder->where('contract_type_id', $filters['contract_type_id']))
            ->when($filters['contract_status'] !== '', fn (Builder $builder) => $builder->where('estado', $filters['contract_status']))
            ->when($filters['expiry_from'] !== '', fn (Builder $builder) => $builder->whereDate('fecha_fin', '>=', $filters['expiry_from']))
            ->when($filters['expiry_to'] !== '', fn (Builder $builder) => $builder->whereDate('fecha_fin', '<=', $filters['expiry_to']))
            ->orderByRaw('fecha_fin IS NULL')
            ->orderBy('fecha_fin')
            ->orderBy('id');

        $contracts = $query->get();
        $alertDays = (int) config('legatum.contract_expiry_days', 30);
        $urgentDays = (int) config('legatum.contract_expiry_urgent_days', 10);
        $rows = $contracts->map(function (Contract $contract) use ($showSalary, $alertDays, $urgentDays): array {
            $daysRemaining = $contract->dias_restantes;
            $alert = $daysRemaining !== null && $daysRemaining >= 0 && $daysRemaining <= $urgentDays
                ? 'Urgente'
                : ($daysRemaining !== null && $daysRemaining > $urgentDays && $daysRemaining <= $alertDays ? 'Próximo a vencer' : 'Sin alerta');
            $row = [
                'numero_contrato' => $contract->numero_contrato,
                'empleado' => $contract->employee?->user?->name ?? 'Usuario sin nombre',
                'departamento' => $contract->employee?->department?->nombre ?? 'Sin departamento',
                'tipo' => $contract->contractType?->nombre ?? 'Sin tipo',
                'fecha_inicio' => $contract->fecha_inicio?->format('d/m/Y') ?? '—',
                'fecha_fin' => $contract->fecha_fin?->format('d/m/Y') ?? 'Indefinido',
            ];
            if ($showSalary) {
                $row['salario'] = '$ '.number_format((float) $contract->salario, 0, ',', '.');
            }
            $row['estado'] = $contract->estado;
            $row['dias_restantes'] = $daysRemaining === null ? 'Indefinido' : $daysRemaining;
            $row['alerta'] = $alert;

            return $row;
        })->all();

        $activeCount = $contracts->filter(fn (Contract $contract): bool => $contract->estado === 'Vigente'
            && ($contract->fecha_fin === null || $contract->fecha_fin->isAfter(Carbon::today()->subDay())))->count();
        $expiredCount = $contracts->filter(fn (Contract $contract): bool => $contract->estado === 'Vencido'
            || ($contract->fecha_fin !== null && $contract->fecha_fin->isBefore(Carbon::today())))->count();
        $expiringCount = $contracts->filter(fn (Contract $contract): bool => $contract->estado === 'Vigente'
            && $contract->dias_restantes !== null
            && $contract->dias_restantes >= 0
            && $contract->dias_restantes <= $alertDays)->count();
        $byType = $contracts->groupBy(fn (Contract $contract): string => $contract->contractType?->nombre ?? 'Sin tipo')
            ->map(fn (Collection $items, string $label): array => ['label' => $label, 'value' => $items->count()])
            ->values()
            ->all();
        $byStatus = $contracts->groupBy('estado')
            ->map(fn (Collection $items, string $label): array => ['label' => $label, 'value' => $items->count()])
            ->values()
            ->all();

        $headers = ['Contrato', 'Empleado', 'Departamento', 'Tipo', 'Inicio', 'Finalización'];
        if ($showSalary) {
            $headers[] = 'Salario';
        }
        array_push($headers, 'Estado', 'Días restantes', 'Alerta');

        return [
            'title' => 'Informe de Contratación y Vencimiento de Contratos',
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'Contratos registrados' => $contracts->count(),
                'Contratos activos' => $activeCount,
                'Contratos vencidos' => $expiredCount,
                "Próximos a vencer (≤ {$alertDays} días)" => $expiringCount,
            ],
            'charts' => [
                $this->barChart('Contratos por tipo', $byType),
                $this->barChart('Contratos por estado', $byStatus),
            ],
            'sections' => [],
            'period' => $filters['expiry_from'] !== '' || $filters['expiry_to'] !== ''
                ? trim($filters['expiry_from'].' – '.$filters['expiry_to'], ' –')
                : 'Todos los vencimientos',
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    private function attendanceAbsenteeism(
        array $filters,
        bool $isJefe,
        ?Department $managedDepartment,
        string $userRole,
    ): array {
        $records = $this->attendanceQuery($filters, $isJefe, $managedDepartment)
            ->whereBetween('fecha', [$filters['date_from'], $filters['date_to']])
            ->with(['employee.user:id,name', 'employee.department:id,nombre'])
            ->orderBy('fecha')
            ->orderBy('employee_id')
            ->get([
                'id',
                'employee_id',
                'fecha',
                'hora_entrada',
                'hora_salida',
                'estado',
                'minutos_retardo',
                'horas_extra',
                'justificacion_correccion',
            ]);

        $eligible = $records->whereIn('estado', self::ELIGIBLE_ATTENDANCE_STATES);
        $worked = $eligible->whereIn('estado', self::PRESENT_STATES)->count();
        $absences = $eligible->whereIn('estado', self::ABSENCE_STATES)->count();
        $late = $records->where('estado', 'Retardo')->count();
        $incidents = $records->filter(fn (Attendance $attendance): bool => in_array($attendance->estado, self::ABSENCE_STATES, true)
            || $attendance->estado === 'Retardo');

        $departmentRows = $incidents
            ->groupBy(fn (Attendance $attendance): string => $attendance->employee?->department?->nombre ?? 'Sin departamento')
            ->map(fn (Collection $items, string $department): array => [
                'departamento' => $department,
                'ausencias_injustificadas' => $items->whereIn('estado', self::ABSENCE_STATES)->count(),
                'retardos' => $items->where('estado', 'Retardo')->count(),
                'incidencias' => $items->count(),
            ])
            ->sortByDesc('incidencias')
            ->values()
            ->all();

        $employeeRows = $incidents
            ->groupBy('employee_id')
            ->map(function (Collection $items): array {
                $employee = $items->first()->employee;

                return [
                    'empleado' => $employee?->user?->name ?? 'Usuario sin nombre',
                    'departamento' => $employee?->department?->nombre ?? 'Sin departamento',
                    'ausencias_injustificadas' => $items->whereIn('estado', self::ABSENCE_STATES)->count(),
                    'retardos' => $items->where('estado', 'Retardo')->count(),
                    'incidencias' => $items->count(),
                ];
            })
            ->sortByDesc('incidencias')
            ->take(10)
            ->values()
            ->all();

        $previousEnd = Carbon::parse($filters['date_from'])->subDay();
        $periodDays = CarbonPeriod::create($filters['date_from'], $filters['date_to'])->count();
        $previousStart = (clone $previousEnd)->subDays(max(0, $periodDays - 1));
        $previousRecords = $this->attendanceQuery($filters, $isJefe, $managedDepartment)
            ->whereBetween('fecha', [$previousStart->toDateString(), $previousEnd->toDateString()])
            ->whereIn('estado', self::ELIGIBLE_ATTENDANCE_STATES)
            ->get(['estado']);
        $previousWorked = $previousRecords->whereIn('estado', self::PRESENT_STATES)->count();
        $previousAbsences = $previousRecords->whereIn('estado', self::ABSENCE_STATES)->count();
        $currentAttendanceRate = $this->percentageValue($worked, $worked + $absences);
        $previousAttendanceRate = $this->percentageValue($previousWorked, $previousWorked + $previousAbsences);

        $rows = $userRole === 'Gerencia'
            ? $departmentRows
            : $records->map(fn (Attendance $attendance): array => [
                'fecha' => $attendance->fecha?->format('d/m/Y') ?? '—',
                'empleado' => $attendance->employee?->user?->name ?? 'Usuario sin nombre',
                'departamento' => $attendance->employee?->department?->nombre ?? 'Sin departamento',
                'entrada' => $attendance->hora_entrada ?? '—',
                'salida' => $attendance->hora_salida ?? '—',
                'estado' => $attendance->estado,
                'retardo_minutos' => $attendance->minutos_retardo,
                'horas_extra' => (float) $attendance->horas_extra,
                'justificacion' => $attendance->justificacion_correccion ?? '—',
            ])->all();

        $headers = $userRole === 'Gerencia'
            ? ['Departamento', 'Ausencias injustificadas', 'Retardos', 'Incidencias']
            : ['Fecha', 'Empleado', 'Departamento', 'Entrada', 'Salida', 'Estado', 'Retardo (min)', 'Horas extra', 'Justificación'];

        return [
            'title' => 'Informe de Asistencia y Ausentismo',
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'Registros de asistencia' => $records->count(),
                'Días laborados registrados' => $worked,
                'Ausencias injustificadas' => $absences,
                'Retardos' => $late,
                'Horas extra registradas' => round((float) $records->sum('horas_extra'), 2),
                'Porcentaje de ausentismo' => $this->percentage($absences, $worked + $absences),
                'Porcentaje de asistencia' => $this->percentage($worked, $worked + $absences),
            ],
            'charts' => [
                $this->barChart('Incidencias por departamento', array_map(
                    fn (array $row): array => ['label' => $row['departamento'], 'value' => $row['incidencias']],
                    $departmentRows,
                )),
                $this->barChart('Asistencia registrada', [
                    ['label' => 'Días laborados', 'value' => $worked],
                    ['label' => 'Ausencias injustificadas', 'value' => $absences],
                    ['label' => 'Retardos', 'value' => $late],
                ]),
            ],
            'sections' => array_values(array_filter([
                [
                    'title' => 'Incidencias por departamento',
                    'headers' => ['Departamento', 'Ausencias injustificadas', 'Retardos', 'Total incidencias'],
                    'rows' => $departmentRows,
                ],
                $userRole === 'Gerencia' ? null : [
                    'title' => 'Empleados con más incidencias',
                    'headers' => ['Empleado', 'Departamento', 'Ausencias injustificadas', 'Retardos', 'Total incidencias'],
                    'rows' => $employeeRows,
                ],
                [
                    'title' => 'Comparación con el período anterior',
                    'headers' => ['Período', 'Días laborados', 'Ausencias injustificadas', 'Asistencia'],
                    'rows' => [
                        [
                            'período' => $previousStart->format('d/m/Y').' a '.$previousEnd->format('d/m/Y'),
                            'días_laborados' => $previousWorked,
                            'ausencias_injustificadas' => $previousAbsences,
                            'asistencia' => $this->percentage($previousWorked, $previousWorked + $previousAbsences),
                        ],
                        [
                            'período' => $filters['date_from'].' a '.$filters['date_to'],
                            'días_laborados' => $worked,
                            'ausencias_injustificadas' => $absences,
                            'asistencia' => $this->percentage($worked, $worked + $absences),
                        ],
                    ],
                    'change_percentage_points' => $currentAttendanceRate === null || $previousAttendanceRate === null
                        ? null
                        : round($currentAttendanceRate - $previousAttendanceRate, 1),
                ],
            ])),
            'period' => "{$filters['date_from']} a {$filters['date_to']}",
            'methodology' => 'Las tasas consideran únicamente registros Presente, Retardo y ausencia injustificada. Permisos, incapacidades y vacaciones aprobadas no se cuentan como ausencias.',
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    private function leavesPayroll(
        array $filters,
        bool $isJefe,
        ?Department $managedDepartment,
        string $userRole,
    ): array {
        $showLeaveData = $userRole !== 'Nómina';
        $showPayrollData = in_array($userRole, ['Administrador', 'Talento Humano', 'Nómina'], true);
        $leaveRequests = $showLeaveData
            ? $this->leaveQuery($filters, $isJefe, $managedDepartment)
                ->with(['employee.user:id,name', 'employee.department:id,nombre', 'leaveType:id,nombre,descuenta_vacaciones'])
                ->whereBetween('created_at', [
                    Carbon::parse($filters['date_from'])->startOfDay(),
                    Carbon::parse($filters['date_to'])->endOfDay(),
                ])
                ->when($filters['leave_type_id'] !== '', fn (Builder $query) => $query->where('leave_type_id', $filters['leave_type_id']))
                ->when($filters['leave_status'] !== '', fn (Builder $query) => $query->where('estado', $filters['leave_status']))
                ->orderByDesc('created_at')
                ->get()
            : collect();

        $leaveRows = $leaveRequests->map(fn (LeaveRequest $request): array => [
            'solicitud' => '#SOL-'.$request->id,
            'empleado' => $request->employee?->user?->name ?? 'Usuario sin nombre',
            'departamento' => $request->employee?->department?->nombre ?? 'Sin departamento',
            'categoría' => $request->leaveType?->descuenta_vacaciones ? 'Vacaciones' : 'Permiso',
            'tipo' => $request->leaveType?->nombre ?? 'Sin tipo',
            'fecha_solicitud' => $request->created_at?->format('d/m/Y') ?? '—',
            'período' => $request->fecha_inicio?->format('d/m/Y').' a '.$request->fecha_fin?->format('d/m/Y'),
            'días' => (float) $request->dias_solicitados,
            'estado' => $request->estado,
        ])->all();

        $statusCounts = collect(['Pendiente', 'Aprobada', 'Rechazada', 'Cancelada'])
            ->mapWithKeys(fn (string $status): array => [$status => $leaveRequests->where('estado', $status)->count()]);
        $balances = $showLeaveData
            ? VacationBalance::query()
                ->whereHas('employee', fn (Builder $query) => $this->applyEmployeeFilters($query, $filters, $isJefe, $managedDepartment))
                ->with('employee:id,departamento_id')
                ->get()
            : collect();
        $averageResponseHours = $leaveRequests
            ->filter(fn (LeaveRequest $request): bool => $request->created_at !== null && $request->fecha_respuesta !== null)
            ->map(fn (LeaveRequest $request): float => $request->created_at->diffInMinutes($request->fecha_respuesta) / 60)
            ->avg();
        $requestsByDepartment = $leaveRequests
            ->groupBy(fn (LeaveRequest $request): string => $request->employee?->department?->nombre ?? 'Sin departamento')
            ->map(fn (Collection $requests, string $department): array => [
                'departamento' => $department,
                'vacaciones' => $requests->filter(fn (LeaveRequest $request): bool => (bool) $request->leaveType?->descuenta_vacaciones)->count(),
                'permisos' => $requests->filter(fn (LeaveRequest $request): bool => ! $request->leaveType?->descuenta_vacaciones)->count(),
            ])
            ->values()
            ->all();

        $novelties = $showPayrollData
            ? PayrollNovelty::query()
                ->where('estado', 'Activa')
                ->with([
                    'employee.user:id,name',
                    'employee.department:id,nombre',
                    'noveltyType:id,nombre,tipo,unidad_medida',
                    'period:id,codigo,nombre,fecha_inicio,fecha_fin',
                ])
                ->when($filters['period_id'] !== '', fn (Builder $query) => $query->where('payroll_period_id', $filters['period_id']))
                ->when($filters['novelty_type_id'] !== '', fn (Builder $query) => $query->where('payroll_novelty_type_id', $filters['novelty_type_id']))
                ->when($filters['period_id'] === '', fn (Builder $query) => $query->whereHas(
                    'period',
                    fn (Builder $periodQuery) => $periodQuery
                        ->whereDate('fecha_inicio', '<=', $filters['date_to'])
                        ->whereDate('fecha_fin', '>=', $filters['date_from']),
                ))
                ->whereHas('employee', fn (Builder $query) => $this->applyEmployeeFilters($query, $filters, $isJefe, $managedDepartment))
                ->orderBy('payroll_period_id')
                ->orderBy('payroll_novelty_type_id')
                ->get()
            : collect();

        $noveltyRows = $novelties->map(fn (PayrollNovelty $novelty): array => [
            'período' => $novelty->period?->codigo ?? 'Sin período',
            'empleado' => $novelty->employee?->user?->name ?? 'Usuario sin nombre',
            'departamento' => $novelty->employee?->department?->nombre ?? 'Sin departamento',
            'tipo_novedad' => $novelty->noveltyType?->nombre ?? 'Sin tipo',
            'clasificación' => $novelty->noveltyType?->tipo ?? 'Sin clasificación',
            'unidad' => $novelty->noveltyType?->unidad_medida ?? 'Sin unidad',
            'cantidad' => $novelty->cantidad === null ? '—' : (float) $novelty->cantidad,
            'valor_registrado' => $novelty->valor === null ? '—' : '$ '.number_format((float) $novelty->valor, 0, ',', '.'),
        ])->all();

        $noveltiesByType = $novelties
            ->groupBy(fn (PayrollNovelty $novelty): string => $novelty->noveltyType?->nombre ?? 'Sin tipo')
            ->map(fn (Collection $items, string $type): array => ['label' => $type, 'value' => $items->count()])
            ->values()
            ->all();
        $noveltiesByPeriod = $novelties
            ->groupBy(fn (PayrollNovelty $novelty): string => $novelty->period?->codigo ?? 'Sin período')
            ->map(function (Collection $items, string $period): array {
                $units = $items->groupBy(fn (PayrollNovelty $novelty): string => $novelty->noveltyType?->unidad_medida ?? 'Sin unidad')
                    ->map(fn (Collection $unitItems, string $unit): string => $unitItems->sum('cantidad').' '.$unit)
                    ->all();

                return [
                    'período' => $period,
                    'novedades' => $items->count(),
                    'cantidades_por_unidad' => implode('; ', array_map(
                        fn (string $unit, string $amount): string => "{$amount}",
                        array_keys($units),
                        array_values($units),
                    )),
                    'valor_registrado' => '$ '.number_format((float) $items->sum('valor'), 0, ',', '.'),
                ];
            })
            ->values()
            ->all();

        $rows = $userRole === 'Nómina' ? $noveltyRows : $leaveRows;
        $headers = $userRole === 'Nómina'
            ? ['Período', 'Empleado', 'Departamento', 'Novedad', 'Clasificación', 'Unidad', 'Cantidad', 'Valor registrado']
            : ['Solicitud', 'Empleado', 'Departamento', 'Categoría', 'Tipo', 'Fecha de solicitud', 'Período solicitado', 'Días', 'Estado'];

        $summary = [];
        if ($showLeaveData) {
            $summary = [
                'Solicitudes de vacaciones' => $leaveRequests->filter(fn (LeaveRequest $request): bool => (bool) $request->leaveType?->descuenta_vacaciones)->count(),
                'Solicitudes de permisos' => $leaveRequests->filter(fn (LeaveRequest $request): bool => ! $request->leaveType?->descuenta_vacaciones)->count(),
                'Solicitudes pendientes' => $statusCounts['Pendiente'],
                'Solicitudes aprobadas' => $statusCounts['Aprobada'],
                'Solicitudes rechazadas' => $statusCounts['Rechazada'],
                'Solicitudes canceladas' => $statusCounts['Cancelada'],
                'Días disponibles' => round((float) $balances->sum(fn (VacationBalance $balance): float => $balance->dias_disponibles), 2),
                'Días disfrutados' => round((float) $balances->sum('dias_disfrutados'), 2),
                'Tiempo promedio de respuesta' => $averageResponseHours === null ? 'Sin datos suficientes' : round($averageResponseHours, 1).' horas',
            ];
        }
        if ($showPayrollData) {
            $summary['Novedades de nómina registradas'] = $novelties->count();
            $summary['Valor registrado en novedades'] = '$ '.number_format((float) $novelties->sum('valor'), 0, ',', '.');
        }

        $sections = [];
        if ($showLeaveData) {
            $sections[] = [
                'title' => 'Solicitudes por departamento',
                'headers' => ['Departamento', 'Vacaciones', 'Permisos'],
                'rows' => $requestsByDepartment,
            ];
            $sections[] = [
                'title' => 'Solicitudes por estado',
                'headers' => ['Estado', 'Solicitudes'],
                'rows' => $statusCounts->map(fn (int $count, string $status): array => [
                    'estado' => $status,
                    'solicitudes' => $count,
                ])->values()->all(),
            ];
        }
        if ($showPayrollData) {
            $sections[] = [
                'title' => 'Novedades agrupadas por período y unidad',
                'headers' => ['Período', 'Cantidad de novedades', 'Cantidades por unidad', 'Valor registrado'],
                'rows' => $noveltiesByPeriod,
            ];
        }

        $charts = [];
        if ($showLeaveData) {
            $charts[] = $this->barChart('Solicitudes por estado', $statusCounts
                ->map(fn (int $count, string $status): array => ['label' => $status, 'value' => $count])
                ->values()
                ->all());
        }
        if ($showPayrollData) {
            $charts[] = $this->barChart('Novedades por tipo', $noveltiesByType);
        }

        return [
            'title' => 'Informe de Vacaciones, Permisos y Novedades de Nómina',
            'headers' => $headers,
            'rows' => $rows,
            'summary' => $summary,
            'charts' => $charts,
            'sections' => $sections,
            'period' => "{$filters['date_from']} a {$filters['date_to']}",
        ];
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function employeeQuery(array $filters, bool $isJefe, ?Department $managedDepartment): Builder
    {
        return $this->applyEmployeeFilters(Employee::query(), $filters, $isJefe, $managedDepartment);
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function contractQuery(array $filters, bool $isJefe, ?Department $managedDepartment): Builder
    {
        return Contract::query()
            ->when($isJefe, fn (Builder $query) => $query->whereHas(
                'employee',
                fn (Builder $employeeQuery) => $employeeQuery->where('departamento_id', $managedDepartment?->id),
            ))
            ->when(! $isJefe && $filters['department_id'] !== '', fn (Builder $query) => $query->whereHas(
                'employee',
                fn (Builder $employeeQuery) => $employeeQuery->where('departamento_id', $filters['department_id']),
            ))
            ->when($filters['employee_id'] !== '', fn (Builder $query) => $query->where('employee_id', $filters['employee_id']));
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function leaveQuery(array $filters, bool $isJefe, ?Department $managedDepartment): Builder
    {
        return LeaveRequest::query()->whereHas(
            'employee',
            fn (Builder $query) => $this->applyEmployeeFilters($query, $filters, $isJefe, $managedDepartment),
        );
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function attendanceQuery(array $filters, bool $isJefe, ?Department $managedDepartment): Builder
    {
        return Attendance::query()->whereHas(
            'employee',
            fn (Builder $query) => $this->applyEmployeeFilters($query, $filters, $isJefe, $managedDepartment),
        );
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function filterContractRelation(Builder $query, array $filters, bool $isJefe, ?Department $managedDepartment): Builder
    {
        return $query
            ->when($isJefe, fn (Builder $builder) => $builder->whereHas(
                'employee',
                fn (Builder $employeeQuery) => $employeeQuery->where('departamento_id', $managedDepartment?->id),
            ))
            ->when(! $isJefe && $filters['department_id'] !== '', fn (Builder $builder) => $builder->whereHas(
                'employee',
                fn (Builder $employeeQuery) => $employeeQuery->where('departamento_id', $filters['department_id']),
            ))
            ->when($filters['employee_id'] !== '', fn (Builder $builder) => $builder->where('employee_id', $filters['employee_id']));
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function filterEmployeeRelation(Builder $query, array $filters): Builder
    {
        return $query->when($filters['employee_id'] !== '', fn (Builder $builder) => $builder->whereKey($filters['employee_id']));
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function applyEmployeeFilters(
        Builder $query,
        array $filters,
        bool $isJefe,
        ?Department $managedDepartment,
    ): Builder {
        return $query
            ->when($isJefe, fn (Builder $builder) => $builder->where('departamento_id', $managedDepartment?->id))
            ->when(! $isJefe && $filters['department_id'] !== '', fn (Builder $builder) => $builder->where('departamento_id', $filters['department_id']))
            ->when($filters['employee_id'] !== '', fn (Builder $builder) => $builder->whereKey($filters['employee_id']));
    }

    /**
     * @param  array<int, array{label: string, value: int|float}>  $points
     * @return array{title: string, points: array<int, array{label: string, value: int|float, percentage: float}>}
     */
    private function barChart(string $title, array $points): array
    {
        $maximum = $points === [] ? 0 : max(array_column($points, 'value'));

        return [
            'title' => $title,
            'points' => array_map(fn (array $point): array => [
                'label' => (string) $point['label'],
                'value' => $point['value'],
                'percentage' => $maximum > 0 ? round(((float) $point['value'] / $maximum) * 100, 1) : 0,
            ], $points),
        ];
    }

    private function percentage(int|float $numerator, int|float $denominator): string
    {
        return $denominator > 0 ? number_format(($numerator / $denominator) * 100, 1).'%' : 'Sin datos';
    }

    private function percentageValue(int|float $numerator, int|float $denominator): ?float
    {
        return $denominator > 0 ? round(($numerator / $denominator) * 100, 1) : null;
    }
}
