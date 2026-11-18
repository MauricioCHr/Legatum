<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\PayrollNovelty;
use App\Models\PayrollPeriod;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private const ROLE_NAMES = [
        'Administrador',
        'Talento Humano',
        'Jefe de área',
        'Nómina',
        'Gerencia',
        'Empleado',
    ];

    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 403, 'Acceso denegado');

        $user->loadMissing([
            'role',
            'employee.department.manager.user',
            'employee.position',
            'employee.vacationBalance',
            'employee.activeContract.contractType',
        ]);
        $roleName = $user->role?->name;
        abort_unless(
            is_string($roleName) && in_array($roleName, self::ROLE_NAMES, true),
            403,
            'Acceso denegado',
        );

        $dashboard = match ($roleName) {
            'Administrador' => $this->administratorDashboard($user),
            'Talento Humano' => $this->humanResourcesDashboard($user),
            'Jefe de área' => $this->areaManagerDashboard($user),
            'Nómina' => $this->payrollDashboard($user),
            'Gerencia' => $this->managementDashboard($user),
            'Empleado' => $this->employeeDashboard($user),
            default => abort(403, 'Acceso denegado'),
        };

        return Inertia::render('Inicio', [
            'dashboard' => $dashboard,
        ]);
    }

    private function administratorDashboard(User $user): array
    {
        $totalEmployees = Employee::count();
        $activeEmployees = Employee::where('estado', 'Activo')->count();
        $totalDepts = Department::where('is_active', true)->count();
        $totalUsers = User::count();
        $activeUsers = User::where('is_active', true)->count();

        $metrics = [
            ['label' => 'Colaboradores', 'value' => $totalEmployees, 'icon' => 'users', 'subtitle' => 'Total registrados'],
            ['label' => 'Usuarios registrados', 'value' => $totalUsers, 'icon' => 'users', 'subtitle' => 'Cuentas del sistema'],
            ['label' => 'Usuarios activos', 'value' => $activeUsers, 'icon' => 'users', 'subtitle' => 'Con acceso habilitado'],
            ['label' => 'Departamentos', 'value' => $totalDepts, 'icon' => 'building', 'subtitle' => 'Áreas activas'],
        ];

        $quickActions = [
            ['label' => 'Usuarios y Accesos', 'href' => '/usuarios', 'icon' => 'user'],
            ['label' => 'Departamentos', 'href' => '/departamentos', 'icon' => 'building'],
            ['label' => 'Cargos y Salarios', 'href' => '/cargos', 'icon' => 'briefcase'],
            ['label' => 'Catálogos del Sistema', 'href' => '/catalogos', 'icon' => 'settings'],
            ['label' => 'Directorio de Personal', 'href' => '/empleados', 'icon' => 'users'],
            ['label' => 'Generar Reportes', 'href' => '/reportes', 'icon' => 'chart'],
        ];

        return $this->formatDashboardResponse(
            'Panel administrativo',
            'Supervisión global de usuarios, catálogos institucionales y estructura organizacional.',
            $metrics,
            $quickActions,
            $this->getDepartmentStats(),
            $this->getEmployeeStatusStats(),
            $this->getExpiringContractsAlerts(),
            'admin',
            [
                'userStats' => [
                    ['label' => 'Activos', 'value' => User::where('is_active', true)->count()],
                    ['label' => 'Inactivos', 'value' => User::where('is_active', false)->count()],
                ],
                'recentEmployees' => $this->getRecentEmployees(),
                'hiringTrend' => $this->getHiringTrend(),
            ]
        );
    }

    private function humanResourcesDashboard(User $user): array
    {
        $activeEmployees = Employee::where('estado', 'Activo')->count();
        $expiringContracts = Contract::proximosAVencer(30)->count();
        $pendingLeaves = LeaveRequest::where('estado', 'Pendiente')->count();
        $newHires = Employee::whereBetween('fecha_contratacion', [
            Carbon::today()->subDays(30)->toDateString(),
            Carbon::today()->toDateString(),
        ])->count();

        $metrics = [
            ['label' => 'Colaboradores Activos', 'value' => $activeEmployees, 'icon' => 'users', 'subtitle' => 'En funciones'],
            ['label' => 'Contratos por Vencer', 'value' => $expiringContracts, 'icon' => 'clock', 'subtitle' => 'Alerta 30 días'],
            ['label' => 'Solicitudes Pendientes', 'value' => $pendingLeaves, 'icon' => 'calendar', 'subtitle' => 'Vacaciones / permisos'],
            ['label' => 'Nuevas contrataciones', 'value' => $newHires, 'icon' => 'userPlus', 'subtitle' => 'Últimos 30 días'],
        ];

        $quickActions = [
            ['label' => 'Registrar Colaborador', 'href' => '/empleados', 'icon' => 'users'],
            ['label' => 'Gestionar Contratos', 'href' => '/contratos', 'icon' => 'file'],
            ['label' => 'Control de Asistencia', 'href' => '/asistencia', 'icon' => 'clock'],
            ['label' => 'Gestionar Solicitudes', 'href' => '/vacaciones/solicitudes', 'icon' => 'calendar'],
            ['label' => 'Registrar Novedad Nómina', 'href' => '/nomina/novedades', 'icon' => 'wallet'],
            ['label' => 'Evaluaciones de Desempeño', 'href' => '/evaluaciones', 'icon' => 'clipboard'],
            ['label' => 'Reportes Consolidados', 'href' => '/reportes', 'icon' => 'chart'],
        ];

        return $this->formatDashboardResponse(
            'Dashboard de Talento Humano',
            'Gestión integral de personal, contratación, asistencia, novedades y bienestar laboral.',
            $metrics,
            $quickActions,
            $this->getDepartmentStats(),
            $this->getEmployeeStatusStats(),
            $this->getExpiringContractsAlerts(),
            'talento',
            [
                'recentEmployees' => $this->getRecentEmployees(),
                'birthdays' => $this->getUpcomingBirthdays(),
                'contractsByType' => $this->getActiveContractsByType(),
                'hiringTrend' => $this->getHiringTrend(),
            ]
        );
    }

    private function areaManagerDashboard(User $user): array
    {
        $managerEmployee = $user->employee;
        $department = $managerEmployee
            ? Department::query()->where('jefe_id', $managerEmployee->id)->first()
                ?? $managerEmployee->department
            : null;

        $teamCount = $department ? Employee::where('departamento_id', $department->id)->where('estado', 'Activo')->count() : 0;
        $teamAttendanceToday = $department
            ? Attendance::whereHas('employee', fn ($e) => $e->where('departamento_id', $department->id))
                ->where('fecha', Carbon::today()->toDateString())
                ->count()
            : 0;
        $pendingTeamLeaves = $department
            ? LeaveRequest::whereHas('employee', fn ($e) => $e->where('departamento_id', $department->id))
                ->where('estado', 'Pendiente')
                ->count()
            : 0;
        $teamApprovedLeaves = $department
            ? LeaveRequest::whereHas('employee', fn ($query) => $query->where('departamento_id', $department->id))
                ->where('estado', 'Aprobada')
                ->whereBetween('fecha_respuesta', [Carbon::today()->startOfMonth(), Carbon::today()->endOfDay()])
                ->count()
            : 0;
        $teamRejectedLeaves = $department
            ? LeaveRequest::whereHas('employee', fn ($query) => $query->where('departamento_id', $department->id))
                ->where('estado', 'Rechazada')
                ->whereBetween('fecha_respuesta', [Carbon::today()->startOfMonth(), Carbon::today()->endOfDay()])
                ->count()
            : 0;
        $team = $department
            ? Employee::query()
                ->with(['user:id,name,email', 'position:id,nombre'])
                ->where('departamento_id', $department->id)
                ->where('estado', 'Activo')
                ->orderBy('id')
                ->limit(8)
                ->get()
                ->map(fn (Employee $employee) => [
                    'id' => $employee->id,
                    'name' => $employee->user?->name ?? 'Usuario sin nombre',
                    'email' => $employee->user?->email,
                    'position' => $employee->position?->nombre ?? 'Sin cargo',
                    'status' => $employee->estado,
                ])
                ->all()
            : [];
        $teamRequests = $department
            ? LeaveRequest::query()
                ->with(['employee.user:id,name', 'leaveType:id,nombre'])
                ->where('estado', 'Pendiente')
                ->whereHas('employee', fn ($query) => $query->where('departamento_id', $department->id))
                ->latest()
                ->limit(8)
                ->get()
                ->map(fn (LeaveRequest $leaveRequest) => [
                    'id' => $leaveRequest->id,
                    'employee' => $leaveRequest->employee?->user?->name ?? 'Colaborador',
                    'type' => $leaveRequest->leaveType?->nombre ?? 'Solicitud',
                    'startDate' => $leaveRequest->fecha_inicio?->format('d/m/Y'),
                    'endDate' => $leaveRequest->fecha_fin?->format('d/m/Y'),
                    'days' => (float) $leaveRequest->dias_solicitados,
                    'status' => $leaveRequest->estado,
                ])
                ->all()
            : [];

        $metrics = [
            ['label' => 'Colaboradores a Cargo', 'value' => $teamCount, 'icon' => 'users', 'subtitle' => $department?->nombre ?? 'Mi equipo'],
            ['label' => 'Asistencias Hoy', 'value' => $teamAttendanceToday, 'icon' => 'clock', 'subtitle' => "De {$teamCount} colaboradores"],
            ['label' => 'Aprobaciones Pendientes', 'value' => $pendingTeamLeaves, 'icon' => 'calendar', 'subtitle' => 'Vacaciones / permisos'],
            ['label' => 'Solicitudes aprobadas', 'value' => $teamApprovedLeaves, 'icon' => 'check', 'subtitle' => 'Este mes'],
            ['label' => 'Solicitudes rechazadas', 'value' => $teamRejectedLeaves, 'icon' => 'close', 'subtitle' => 'Este mes'],
        ];

        $quickActions = [
            ['label' => 'Ver Mi Equipo', 'href' => '/equipo', 'icon' => 'users'],
            ['label' => 'Asistencia del Área', 'href' => '/asistencia/equipo', 'icon' => 'clock'],
            ['label' => 'Aprobar Vacaciones y Permisos', 'href' => '/vacaciones/aprobaciones', 'icon' => 'calendar'],
            ['label' => 'Calificar Desempeño', 'href' => '/evaluaciones', 'icon' => 'clipboard'],
            ['label' => 'Reportes de Mi Área', 'href' => '/reportes', 'icon' => 'chart'],
        ];

        return $this->formatDashboardResponse(
            'Dashboard de jefatura',
            $department ? "Gestión de equipo para el área de {$department->nombre}." : 'Gestión y acompañamiento del equipo de trabajo.',
            $metrics,
            $quickActions,
            $department ? $this->getDepartmentStats($department->id) : [],
            $department ? $this->getEmployeeStatusStats($department->id) : [],
            [],
            'manager',
            [
                'team' => $team,
                'teamRequests' => $teamRequests,
            ]
        );
    }

    private function payrollDashboard(User $user): array
    {
        $currentPeriod = PayrollPeriod::where('estado', 'Abierto')->orderByDesc('fecha_inicio')->first()
            ?? PayrollPeriod::orderByDesc('fecha_inicio')->first();
        $currentNovelties = $currentPeriod
            ? PayrollNovelty::query()
                ->with(['employee.user:id,name', 'employee.department:id,nombre', 'noveltyType:id,nombre'])
                ->where('payroll_period_id', $currentPeriod->id)
                ->where('estado', 'Activa')
            : null;
        $totalDevengos = $currentNovelties
            ? (float) (clone $currentNovelties)->whereHas('noveltyType', fn ($query) => $query->where('tipo', 'Devengo'))->sum('valor')
            : 0;
        $totalDeducciones = $currentNovelties
            ? (float) (clone $currentNovelties)->whereHas('noveltyType', fn ($query) => $query->where('tipo', 'Deduccion'))->sum('valor')
            : 0;
        $employeesWithNovelty = $currentNovelties
            ? (clone $currentNovelties)->distinct('employee_id')->count('employee_id')
            : 0;
        $activeNoveltyCount = $currentNovelties ? (clone $currentNovelties)->count() : 0;
        $recentNovelties = $currentNovelties
            ? (clone $currentNovelties)
                ->latest()
                ->limit(8)
                ->get()
                ->map(fn (PayrollNovelty $novelty) => [
                    'id' => $novelty->id,
                    'employee' => $novelty->employee?->user?->name ?? 'Colaborador',
                    'department' => $novelty->employee?->department?->nombre ?? 'Sin departamento',
                    'type' => $novelty->noveltyType?->nombre ?? 'Novedad',
                    'date' => $novelty->created_at?->format('d/m/Y'),
                    'amount' => $novelty->valor === null ? null : (float) $novelty->valor,
                    'status' => $novelty->estado,
                ])
                ->all()
            : [];
        $noveltiesByType = $currentNovelties
            ? (clone $currentNovelties)
                ->selectRaw('payroll_novelty_type_id, COUNT(*) as total')
                ->with('noveltyType:id,nombre')
                ->groupBy('payroll_novelty_type_id')
                ->get()
                ->map(fn (PayrollNovelty $novelty) => [
                    'name' => $novelty->noveltyType?->nombre ?? 'Sin tipo',
                    'value' => (int) $novelty->total,
                ])
                ->all()
            : [];
        $periods = PayrollPeriod::query()
            ->withCount(['novelties as active_novelties_count' => fn ($query) => $query->where('estado', 'Activa')])
            ->orderByDesc('fecha_inicio')
            ->limit(3)
            ->get()
            ->map(fn (PayrollPeriod $period) => [
                'name' => $period->nombre,
                'range' => $period->fecha_inicio->format('d/m/Y').' - '.$period->fecha_fin->format('d/m/Y'),
                'status' => $period->estado,
                'novelties' => $period->active_novelties_count,
            ])
            ->all();

        $metrics = [
            ['label' => 'Total Devengos (+)', 'value' => '$ '.number_format($totalDevengos, 0, ',', '.'), 'icon' => 'wallet', 'subtitle' => 'En período actual'],
            ['label' => 'Total Deducciones (-)', 'value' => '$ '.number_format($totalDeducciones, 0, ',', '.'), 'icon' => 'wallet', 'subtitle' => 'En período actual'],
            ['label' => 'Colaboradores con Novedad', 'value' => $employeesWithNovelty, 'icon' => 'users', 'subtitle' => 'Impacto nómina'],
            ['label' => 'Novedades registradas', 'value' => $activeNoveltyCount, 'icon' => 'clipboard', 'subtitle' => 'Período actual'],
        ];

        $quickActions = [
            ['label' => 'Consultar Novedades Quincenales', 'href' => '/nomina/novedades', 'icon' => 'wallet'],
            ['label' => 'Novedades Consolidadas por Período', 'href' => '/nomina/periodos', 'icon' => 'layers'],
        ];

        return $this->formatDashboardResponse(
            'Dashboard de nómina',
            'Acceso de consulta a novedades operativas, devengos, deducciones y períodos consolidados.',
            $metrics,
            $quickActions,
            [],
            [],
            [],
            'payroll',
            [
                'currentPeriod' => $currentPeriod ? [
                    'name' => $currentPeriod->nombre,
                    'status' => $currentPeriod->estado,
                    'startDate' => $currentPeriod->fecha_inicio->format('d/m/Y'),
                    'endDate' => $currentPeriod->fecha_fin->format('d/m/Y'),
                ] : null,
                'periods' => $periods,
                'recentNovelties' => $recentNovelties,
                'noveltiesByType' => $noveltiesByType,
            ]
        );
    }

    private function managementDashboard(User $user): array
    {
        $activeEmployees = Employee::where('estado', 'Activo')->count();
        $totalContracts = Contract::where('estado', 'Vigente')->count();
        $totalSalaries = (float) Contract::where('estado', 'Vigente')->sum('salario');

        $metrics = [
            ['label' => 'Colaboradores', 'value' => Employee::count(), 'icon' => 'users', 'subtitle' => 'Total registrado'],
            ['label' => 'Planta Activa', 'value' => $activeEmployees, 'icon' => 'users', 'subtitle' => 'En funciones'],
            ['label' => 'Contratos Vigentes', 'value' => $totalContracts, 'icon' => 'file', 'subtitle' => 'Seguridad contractual'],
            ['label' => 'Masa Salarial Mensual', 'value' => '$ '.number_format($totalSalaries, 0, ',', '.'), 'icon' => 'wallet', 'subtitle' => 'Nómina base vigente'],
        ];

        $quickActions = [
            ['label' => 'Consulta de Personal', 'href' => '/empleados', 'icon' => 'users'],
            ['label' => 'Consulta de Contratos', 'href' => '/contratos', 'icon' => 'file'],
            ['label' => 'Resultados de Evaluaciones', 'href' => '/evaluaciones', 'icon' => 'clipboard'],
            ['label' => 'Reportes Estratégicos', 'href' => '/reportes', 'icon' => 'chart'],
        ];

        return $this->formatDashboardResponse(
            'Dashboard gerencial',
            'Métricas clave de talento humano, masa salarial, desempeño institucional y estructura de la empresa.',
            $metrics,
            $quickActions,
            $this->getDepartmentStats(),
            $this->getEmployeeStatusStats(),
            [],
            'management',
            [
                'hiringTrend' => $this->getHiringTrend(),
                'contractsByType' => $this->getActiveContractsByType(),
            ]
        );
    }

    private function employeeDashboard(User $user): array
    {
        $employee = $user->employee;

        $vacationBalance = $employee?->getOrCreateVacationBalance();
        $diasDisponibles = $vacationBalance ? $vacationBalance->dias_disponibles : 0;
        $todayAttendance = $employee ? Attendance::where('employee_id', $employee->id)->where('fecha', Carbon::today()->toDateString())->first() : null;
        $activeLeaves = $employee ? LeaveRequest::where('employee_id', $employee->id)->where('estado', 'Pendiente')->count() : 0;
        $recentLeaveRequests = $employee
            ? LeaveRequest::query()
                ->with('leaveType:id,nombre')
                ->where('employee_id', $employee->id)
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn (LeaveRequest $leaveRequest) => [
                    'id' => $leaveRequest->id,
                    'type' => $leaveRequest->leaveType?->nombre ?? 'Solicitud',
                    'startDate' => $leaveRequest->fecha_inicio?->format('d/m/Y'),
                    'endDate' => $leaveRequest->fecha_fin?->format('d/m/Y'),
                    'days' => (float) $leaveRequest->dias_solicitados,
                    'status' => $leaveRequest->estado,
                ])
                ->all()
            : [];
        $recentAttendance = $employee
            ? Attendance::query()
                ->where('employee_id', $employee->id)
                ->latest('fecha')
                ->limit(5)
                ->get(['id', 'fecha', 'hora_entrada', 'hora_salida', 'estado'])
                ->map(fn (Attendance $attendance) => [
                    'date' => $attendance->fecha->format('d/m/Y'),
                    'entry' => $attendance->hora_entrada,
                    'exit' => $attendance->hora_salida,
                    'status' => $attendance->estado,
                ])
                ->all()
            : [];

        $attendanceStatus = 'Sin marcar';
        if ($todayAttendance) {
            $attendanceStatus = $todayAttendance->hora_salida ? 'Jornada lista' : 'Ingreso listo';
        }

        $metrics = [
            ['label' => 'Saldo Vacaciones', 'value' => "{$diasDisponibles} días", 'icon' => 'calendar', 'subtitle' => 'Días disponibles'],
            ['label' => 'Asistencia Hoy', 'value' => $attendanceStatus, 'icon' => 'clock', 'subtitle' => Carbon::today()->format('d/m/Y')],
            ['label' => 'Solicitudes en Trámite', 'value' => $activeLeaves, 'icon' => 'layers', 'subtitle' => 'Pendientes de respuesta'],
        ];

        $quickActions = [
            ['label' => 'Marcar Entrada / Salida', 'href' => '/mi-asistencia', 'icon' => 'clock'],
            ['label' => 'Solicitar Vacaciones / Permiso', 'href' => '/mis-vacaciones', 'icon' => 'calendar'],
            ['label' => 'Consultar Mi Contrato', 'href' => '/mis-contratos', 'icon' => 'file'],
            ['label' => 'Ver Mis Evaluaciones', 'href' => '/mis-evaluaciones', 'icon' => 'clipboard'],
            ['label' => 'Mi Ficha de Colaborador', 'href' => '/mi-perfil', 'icon' => 'user'],
        ];

        return $this->formatDashboardResponse(
            'Mi espacio personal',
            $employee ? "{$employee->position?->nombre} • {$employee->department?->nombre}" : 'Acceso a trámites personales, asistencia y contrato laboral.',
            $metrics,
            $quickActions,
            [],
            [],
            [],
            'employee',
            [
                'profile' => $employee ? [
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $employee->telefono,
                    'department' => $employee->department?->nombre,
                    'position' => $employee->position?->nombre,
                    'status' => $employee->estado,
                    'hireDate' => $employee->fecha_contratacion?->format('d/m/Y'),
                    'manager' => $employee->department?->manager?->user?->name,
                ] : null,
                'vacationBalance' => $diasDisponibles,
                'contract' => $employee?->activeContract ? [
                    'type' => $employee->activeContract->contractType?->nombre,
                    'startDate' => $employee->activeContract->fecha_inicio?->format('d/m/Y'),
                    'endDate' => $employee->activeContract->fecha_fin?->format('d/m/Y'),
                ] : null,
                'leaveRequests' => $recentLeaveRequests,
                'recentAttendance' => $recentAttendance,
            ]
        );
    }

    private function getDepartmentStats(?int $departmentId = null): array
    {
        return Department::query()
            ->when($departmentId !== null, fn ($query) => $query->whereKey($departmentId))
            ->where('is_active', true)
            ->withCount('employees')
            ->orderBy('nombre')
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'name' => $d->nombre,
                'employees' => $d->employees_count,
            ])
            ->all();
    }

    private function getEmployeeStatusStats(?int $departmentId = null): array
    {
        $employees = Employee::query()->when(
            $departmentId !== null,
            fn ($query) => $query->where('departamento_id', $departmentId)
        );
        $activos = (clone $employees)->where('estado', 'Activo')->count();
        $inactivos = (clone $employees)->where('estado', 'Inactivo')->count();

        return [
            ['label' => 'Activos', 'value' => $activos, 'icon' => 'users'],
            ['label' => 'Inactivos', 'value' => $inactivos, 'icon' => 'users'],
        ];
    }

    private function getExpiringContractsAlerts(): array
    {
        return Contract::proximosAVencer(30)
            ->with(['employee.user', 'contractType'])
            ->take(5)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'employee' => $c->employee->user->name,
                'type' => $c->contractType->nombre,
                'expiration' => $c->fecha_fin?->format('d/m/Y'),
                'days' => $c->dias_restantes,
            ])
            ->all();
    }

    private function getRecentEmployees(): array
    {
        return Employee::query()
            ->with(['user:id,name,email', 'department:id,nombre', 'position:id,nombre'])
            ->latest('created_at')
            ->limit(8)
            ->get()
            ->map(fn (Employee $employee) => [
                'id' => $employee->id,
                'name' => $employee->user?->name ?? 'Usuario sin nombre',
                'email' => $employee->user?->email,
                'department' => $employee->department?->nombre ?? 'Sin departamento',
                'position' => $employee->position?->nombre ?? 'Sin cargo',
                'status' => $employee->estado,
                'hireDate' => $employee->fecha_contratacion?->format('d/m/Y'),
            ])
            ->all();
    }

    private function getHiringTrend(): array
    {
        $monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        $firstMonth = Carbon::today()->startOfYear();
        $lastMonth = Carbon::today()->startOfMonth();
        $hireDates = Employee::query()
            ->whereBetween('fecha_contratacion', [$firstMonth->toDateString(), Carbon::today()->toDateString()])
            ->pluck('fecha_contratacion')
            ->map(fn ($date) => Carbon::parse($date)->format('Y-m'))
            ->countBy();

        $trend = [];
        for ($month = $firstMonth->copy(); $month->lte($lastMonth); $month->addMonth()) {
            $key = $month->format('Y-m');
            $trend[] = [
                'month' => $monthNames[(int) $month->format('n') - 1],
                'value' => (int) ($hireDates[$key] ?? 0),
            ];
        }

        return $trend;
    }

    private function getUpcomingBirthdays(): array
    {
        $today = Carbon::today();
        $limit = $today->copy()->addDays(30);

        return Employee::query()
            ->with(['user:id,name', 'department:id,nombre'])
            ->where(function ($query) use ($today, $limit) {
                $query->where(function ($query) use ($today) {
                    $query->whereMonth('fecha_nacimiento', $today->month)
                        ->whereDay('fecha_nacimiento', '>=', $today->day);
                });

                if ($limit->month !== $today->month) {
                    $query->orWhere(function ($query) use ($limit) {
                        $query->whereMonth('fecha_nacimiento', $limit->month)
                            ->whereDay('fecha_nacimiento', '<=', $limit->day);
                    });
                }
            })
            ->get()
            ->map(function (Employee $employee) use ($today): array {
                $birthDate = $employee->fecha_nacimiento;
                $birthday = $today->copy()->setDate($today->year, $birthDate->month, $birthDate->day);
                if ($birthday->lt($today)) {
                    $birthday->addYear();
                }

                return [
                    'name' => $employee->user?->name ?? 'Colaborador',
                    'department' => $employee->department?->nombre ?? 'Sin departamento',
                    'date' => $birthday->format('d/m'),
                    'days' => (int) $today->diffInDays($birthday),
                    'sortDate' => $birthday->format('Y-m-d'),
                ];
            })
            ->filter(fn (array $birthday) => $birthday['days'] <= 30)
            ->sortBy('sortDate')
            ->take(5)
            ->map(fn (array $birthday) => collect($birthday)->except('sortDate')->all())
            ->values()
            ->all();
    }

    private function getActiveContractsByType(): array
    {
        return ContractType::query()
            ->withCount([
                'contracts as active_contracts_count' => fn ($query) => $query->where('estado', 'Vigente'),
            ])
            ->get()
            ->filter(fn (ContractType $type) => $type->active_contracts_count > 0)
            ->map(fn (ContractType $type) => [
                'name' => $type->nombre,
                'value' => (int) $type->active_contracts_count,
            ])
            ->values()
            ->all();
    }

    private function formatDashboardResponse(
        string $title,
        string $description,
        array $metrics,
        array $quickActions,
        array $departments = [],
        array $employeeStatuses = [],
        array $alerts = [],
        string $role = '',
        array $details = []
    ): array {
        return [
            'role' => $role,
            'title' => $title,
            'description' => $description,
            'metrics' => $metrics,
            'quickActions' => $quickActions,
            'departments' => $departments,
            'employeeStatuses' => $employeeStatuses,
            'alerts' => $alerts,
            'panels' => [],
            'recentActivity' => [],
            ...$details,
        ];
    }
}
