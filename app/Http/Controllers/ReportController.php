<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Department;
use App\Models\Employee;
use App\Models\GeneratedReport;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\PayrollNovelty;
use App\Models\PayrollNoveltyType;
use App\Models\PayrollPeriod;
use App\Models\PerformanceEvaluation;
use App\Models\Position;
use App\Models\VacationBalance;
use App\Services\StrategicReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response as FacadeResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(private StrategicReportService $strategicReports) {}

    private const STRATEGIC_REPORT_TYPES = [
        'executive_overview' => 'Informe Ejecutivo de Talento Humano',
        'contracts_status' => 'Informe de Contratación y Vencimiento',
        'attendance_absenteeism' => 'Informe de Asistencia y Ausentismo',
        'leaves_payroll' => 'Informe de Vacaciones, Permisos y Novedades',
    ];

    private const REPORT_TYPES = [
        ...self::STRATEGIC_REPORT_TYPES,
        'employees_status' => 'Empleados Activos e Inactivos',
        'employees_by_department' => 'Distribución de Personal por Departamento',
        'employees_by_position' => 'Personal por Cargo',
        'talent_overview' => 'Resumen General de Talento Humano',
        'contracts_history' => 'Historial General de Contratos',
        'contracts_by_type' => 'Contratos por Tipo de Vinculación',
        'contracts_active' => 'Contratos Laborales Vigentes',
        'contracts_expiring' => 'Contratos Próximos a Vencer (Alerta Temprana)',
        'contracts_expired' => 'Contratos Finalizados, Renovados y Anulados',
        'attendance_general' => 'Control General de Asistencia y Puntualidad',
        'attendance_by_employee' => 'Asistencia Detallada por Empleado',
        'absenteeism' => 'Reporte de Ausentismo y Retardos',
        'vacation_balances' => 'Consolidado de Vacaciones (Ganadas vs Disponibles)',
        'leaves_pending' => 'Solicitudes de Vacaciones y Permisos Pendientes',
        'leaves_approved_rejected' => 'Historial de Permisos Aprobados y Rechazados',
        'payroll_by_period' => 'Novedades de Nómina por Período Quincenal',
        'payroll_by_employee' => 'Resumen de Devengos y Deducciones por Empleado',
        'evaluations_results' => 'Resultados y Calificaciones de Evaluaciones',
    ];

    public function index(Request $request): Response
    {
        $user = $request->user();
        $userRole = $user?->role?->name;

        abort_unless(is_string($userRole) && $this->canViewReports($userRole), 403, 'Acceso denegado a reportes.');

        $isJefe = $userRole === 'Jefe de área';
        $managedDepartment = $isJefe ? $this->managedDepartmentFor($request) : null;
        $filters = $this->validatedFilters($request, $isJefe, $managedDepartment);
        $reportType = $filters['report_type'];
        $this->authorizeReportType($userRole, $reportType);

        $reportData = $this->buildReportData($reportType, $filters, $isJefe, $managedDepartment, $userRole);

        $departmentsQuery = Department::query()->where('is_active', true)->orderBy('nombre');
        if ($isJefe && $managedDepartment) {
            $departmentsQuery->where('id', $managedDepartment->id);
        }

        $employeesQuery = Employee::query()->where('estado', 'Activo')->with('user:id,name')->orderBy('id');
        if ($isJefe && $managedDepartment) {
            $employeesQuery->where('departamento_id', $managedDepartment->id);
        }

        $reportHistory = GeneratedReport::query()
            ->with(['user:id,name', 'department:id,nombre'])
            ->where('generated_by_role', $userRole)
            ->whereIn('report_type', array_keys($this->reportTypesForRole($userRole)))
            ->when($isJefe, fn ($query) => $query->where('department_id', $managedDepartment->id))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(8)
            ->through(fn (GeneratedReport $report) => [
                'id' => $report->id,
                'title' => $report->title,
                'report_type_label' => self::REPORT_TYPES[$report->report_type] ?? $report->report_type,
                'generated_by' => $report->user?->name ?? 'Usuario eliminado',
                'department' => $report->department?->nombre ?? 'Todos los departamentos',
                'rows_count' => $report->rows_count,
                'created_at' => $report->created_at->format('d/m/Y H:i'),
                'download_url' => route('reports.download', $report),
                'regenerate_url' => route('reports.regenerate', $report),
            ]);

        return Inertia::render('Reports/Index', [
            'reportTypes' => $this->reportTypesForRole($userRole),
            'filters' => $filters,
            'reportData' => $reportData,
            'reportHistory' => $reportHistory,
            'departments' => $departmentsQuery->get(),
            'contractTypes' => ContractType::query()->where('is_active', true)->orderBy('nombre')->get(['id', 'nombre']),
            'leaveTypes' => LeaveType::query()->where('is_active', true)->orderBy('nombre')->get(['id', 'nombre']),
            'payrollNoveltyTypes' => PayrollNoveltyType::query()
                ->where('is_active', true)
                ->orderBy('nombre')
                ->get(['id', 'nombre']),
            'employees' => $employeesQuery->get()->map(fn ($e) => [
                'id' => $e->id,
                'name' => $e->user?->name ?? 'Usuario sin nombre',
            ]),
            'periods' => PayrollPeriod::query()->orderByDesc('id')->get(['id', 'codigo', 'nombre', 'estado']),
            'isJefe' => $isJefe,
            'managedDepartment' => $managedDepartment?->nombre,
            'userRole' => $userRole,
            'generatedAt' => now()->format('d/m/Y H:i'),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $user = $request->user();
        $userRole = $user?->role?->name;

        abort_unless(is_string($userRole) && $this->canViewReports($userRole), 403);

        $isJefe = $userRole === 'Jefe de área';
        $managedDepartment = $isJefe ? $this->managedDepartmentFor($request) : null;
        $filters = $this->validatedFilters($request, $isJefe, $managedDepartment);
        $this->authorizeReportType($userRole, $filters['report_type']);
        $reportType = $filters['report_type'];

        $reportData = $this->buildReportData($reportType, $filters, $isJefe, $managedDepartment, $userRole);
        $headers = $reportData['headers'] ?? [];
        $rows = $reportData['rows'] ?? [];

        $filename = "reporte_{$reportType}_".now()->format('Ymd_His').'.csv';

        return FacadeResponse::streamDownload(function () use ($headers, $rows) {
            $file = fopen('php://output', 'w');
            // Write UTF-8 BOM so Excel opens characters with accents properly
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($file, $headers);
            foreach ($rows as $row) {
                fputcsv($file, array_values($row));
            }
            fclose($file);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function generate(Request $request): StreamedResponse
    {
        $userRole = $request->user()?->role?->name;
        abort_unless(is_string($userRole) && $this->canViewReports($userRole), 403);
        $isJefe = $userRole === 'Jefe de área';
        $managedDepartment = $isJefe ? $this->managedDepartmentFor($request) : null;
        $filters = $this->validatedFilters($request, $isJefe, $managedDepartment);
        $this->authorizeReportType($userRole, $filters['report_type']);
        $reportData = $this->buildReportData($filters['report_type'], $filters, $isJefe, $managedDepartment, $userRole);

        return $this->generatePdf($request, $userRole, $filters, $reportData);
    }

    public function regenerate(Request $request, GeneratedReport $generatedReport): StreamedResponse
    {
        $userRole = $request->user()?->role?->name;
        abort_unless(is_string($userRole) && $this->canViewReports($userRole), 403);
        $isJefe = $userRole === 'Jefe de área';
        $managedDepartment = $isJefe ? $this->managedDepartmentFor($request) : null;
        $this->authorizeReportHistoryAccess($generatedReport, $userRole, $isJefe, $managedDepartment);
        $filters = $this->normalizeFilters($generatedReport->filters, $isJefe, $managedDepartment);
        $this->authorizeReportType($userRole, $filters['report_type']);
        $reportData = $this->buildReportData($filters['report_type'], $filters, $isJefe, $managedDepartment, $userRole);

        return $this->generatePdf($request, $userRole, $filters, $reportData, $generatedReport);
    }

    public function download(Request $request, GeneratedReport $generatedReport): StreamedResponse
    {
        $userRole = $request->user()?->role?->name;
        abort_unless(is_string($userRole) && $this->canViewReports($userRole), 403);
        $isJefe = $userRole === 'Jefe de área';
        $managedDepartment = $isJefe ? $this->managedDepartmentFor($request) : null;
        $this->authorizeReportHistoryAccess($generatedReport, $userRole, $isJefe, $managedDepartment);

        abort_unless(Storage::disk('local')->exists($generatedReport->file_path), 404, 'El archivo del reporte no está disponible.');

        return Storage::disk('local')->download(
            $generatedReport->file_path,
            $this->pdfFilename($generatedReport->report_type, $generatedReport->created_at),
            ['Content-Type' => 'application/pdf'],
        );
    }

    private function generatePdf(
        Request $request,
        string $generatedByRole,
        array $filters,
        array $reportData,
        ?GeneratedReport $regeneratedFrom = null,
    ): StreamedResponse {
        $generatedAt = now();
        $user = $request->user();
        $department = $filters['department_id'] !== ''
            ? Department::query()->find($filters['department_id'])
            : null;
        $pdfContents = Pdf::loadView('reports.pdf', [
            'reportData' => $reportData,
            'filters' => $filters,
            'reportType' => $filters['report_type'],
            'generatedAt' => $generatedAt,
            'generatedBy' => $user->name,
            'departmentName' => $department?->nombre,
        ])
            ->setPaper('a4', 'landscape')
            ->setOption(['defaultFont' => 'DejaVu Sans', 'isRemoteEnabled' => false])
            ->output();
        $filePath = 'reports/'.Str::uuid().'.pdf';

        $generatedReport = GeneratedReport::query()->create([
            'user_id' => $user->id,
            'generated_by_role' => $generatedByRole,
            'department_id' => $filters['department_id'] !== '' ? $filters['department_id'] : null,
            'report_type' => $filters['report_type'],
            'title' => $reportData['title'],
            'filters' => $filters,
            'file_path' => $filePath,
            'rows_count' => count($reportData['rows']),
            'regenerated_from_id' => $regeneratedFrom?->id,
        ]);

        if (! Storage::disk('local')->put($filePath, $pdfContents)) {
            $generatedReport->delete();

            throw new RuntimeException('No fue posible guardar el PDF generado.');
        }

        return Storage::disk('local')->download(
            $filePath,
            $this->pdfFilename($generatedReport->report_type, $generatedReport->created_at),
            ['Content-Type' => 'application/pdf'],
        );
    }

    private function pdfFilename(string $reportType, Carbon $generatedAt): string
    {
        return 'reporte_'.$reportType.'_'.$generatedAt->format('Ymd_His').'.pdf';
    }

    private function authorizeReportHistoryAccess(
        GeneratedReport $generatedReport,
        string $userRole,
        bool $isJefe,
        ?Department $managedDepartment,
    ): void {
        abort_unless(
            in_array($generatedReport->report_type, array_keys($this->reportTypesForRole($userRole)), true)
                && $generatedReport->generated_by_role === $userRole
                && (! $isJefe || $generatedReport->department_id === $managedDepartment?->id),
            404,
            'El reporte solicitado no está disponible.',
        );
    }

    private function canViewReports(string $userRole): bool
    {
        return in_array($userRole, ['Administrador', 'Talento Humano', 'Jefe de área', 'Nómina', 'Gerencia'], true);
    }

    /**
     * @return array<string, string>
     */
    private function reportTypesForRole(string $userRole): array
    {
        $excludedTypes = match ($userRole) {
            'Nómina' => array_diff(array_keys(self::REPORT_TYPES), [
                'payroll_by_period',
                'payroll_by_employee',
                'leaves_payroll',
            ]),
            'Jefe de área' => [
                'contracts_history',
                'contracts_active',
                'contracts_expired',
                'payroll_by_period',
                'payroll_by_employee',
            ],
            'Gerencia' => [
                'attendance_general',
                'attendance_by_employee',
                'absenteeism',
                'leaves_pending',
                'leaves_approved_rejected',
                'vacation_balances',
                'payroll_by_period',
                'payroll_by_employee',
                'leaves_payroll',
            ],
            default => [],
        };

        return array_diff_key(self::REPORT_TYPES, array_flip($excludedTypes));
    }

    private function authorizeReportType(string $userRole, string $reportType): void
    {
        abort_unless(
            array_key_exists($reportType, $this->reportTypesForRole($userRole)),
            403,
            'Tu rol no tiene permiso para consultar este tipo de reporte.',
        );
    }

    private function managedDepartmentFor(Request $request): Department
    {
        $employee = $request->user()?->employee;
        $department = $employee
            ? Department::query()->where('jefe_id', $employee->id)->first() ?? $employee->department
            : null;

        if (! $department) {
            abort(403, 'No tienes un departamento asignado para consultar reportes.');
        }

        return $department;
    }

    /**
     * @return array{report_type: string, date_from: string, date_to: string, department_id: string, employee_id: string, period_id: string}
     */
    private function validatedFilters(Request $request, bool $isJefe, ?Department $managedDepartment): array
    {
        return $this->normalizeFilters($request->all(), $isJefe, $managedDepartment);
    }

    private function normalizeFilters(array $input, bool $isJefe, ?Department $managedDepartment): array
    {
        $validated = Validator::make($input, [
            'report_type' => ['sometimes', 'required', Rule::in(array_keys(self::REPORT_TYPES))],
            'date_from' => ['sometimes', 'nullable', 'date'],
            'date_to' => ['sometimes', 'nullable', 'date', 'after_or_equal:date_from'],
            'expiry_from' => ['sometimes', 'nullable', 'date'],
            'expiry_to' => ['sometimes', 'nullable', 'date', 'after_or_equal:expiry_from'],
            'department_id' => ['sometimes', 'nullable', 'integer', Rule::exists('departamentos', 'id')],
            'employee_id' => ['sometimes', 'nullable', 'integer', Rule::exists('employees', 'id')],
            'period_id' => ['sometimes', 'nullable', 'integer', Rule::exists('payroll_periods', 'id')],
            'contract_type_id' => ['sometimes', 'nullable', 'integer', Rule::exists('contract_types', 'id')],
            'contract_status' => ['sometimes', 'nullable', Rule::in(['Vigente', 'Vencido', 'Renovado', 'Anulado'])],
            'leave_type_id' => ['sometimes', 'nullable', 'integer', Rule::exists('leave_types', 'id')],
            'leave_status' => ['sometimes', 'nullable', Rule::in(['Pendiente', 'Aprobada', 'Rechazada', 'Cancelada'])],
            'novelty_type_id' => ['sometimes', 'nullable', 'integer', Rule::exists('payroll_novelty_types', 'id')],
        ])->validate();

        return [
            'report_type' => $validated['report_type'] ?? 'employees_status',
            'date_from' => $validated['date_from'] ?? Carbon::today()->startOfMonth()->toDateString(),
            'date_to' => $validated['date_to'] ?? Carbon::today()->toDateString(),
            'expiry_from' => $validated['expiry_from'] ?? '',
            'expiry_to' => $validated['expiry_to'] ?? '',
            'department_id' => $isJefe
                ? (string) $managedDepartment->id
                : (string) ($validated['department_id'] ?? ''),
            'employee_id' => (string) ($validated['employee_id'] ?? ''),
            'period_id' => (string) ($validated['period_id'] ?? ''),
            'contract_type_id' => (string) ($validated['contract_type_id'] ?? ''),
            'contract_status' => (string) ($validated['contract_status'] ?? ''),
            'leave_type_id' => (string) ($validated['leave_type_id'] ?? ''),
            'leave_status' => (string) ($validated['leave_status'] ?? ''),
            'novelty_type_id' => (string) ($validated['novelty_type_id'] ?? ''),
        ];
    }

    private function buildReportData(string $type, array $filters, bool $isJefe, ?Department $managedDepartment, string $userRole): array
    {
        if (array_key_exists($type, self::STRATEGIC_REPORT_TYPES)) {
            return $this->strategicReports->build($type, $filters, $userRole, $isJefe, $managedDepartment);
        }

        switch ($type) {
            case 'employees_status':
                return $this->getEmployeesStatusReport($filters, $isJefe, $managedDepartment);
            case 'employees_by_department':
                return $this->getEmployeesByDepartmentReport($filters, $isJefe, $managedDepartment);
            case 'employees_by_position':
                return $this->getEmployeesByPositionReport($filters, $isJefe, $managedDepartment);
            case 'talent_overview':
                return $this->getTalentOverviewReport($filters, $isJefe, $managedDepartment);
            case 'contracts_history':
                return $this->getContractsHistoryReport($filters, $isJefe, $managedDepartment);
            case 'contracts_by_type':
                return $this->getContractsByTypeReport($filters, $isJefe, $managedDepartment);
            case 'contracts_active':
                return $this->getContractsReport(['Vigente'], $filters, $isJefe, $managedDepartment, in_array($userRole, ['Administrador', 'Talento Humano'], true));
            case 'contracts_expiring':
                return $this->getContractsExpiringReport($filters, $isJefe, $managedDepartment);
            case 'contracts_expired':
                return $this->getContractsReport(['Vencido', 'Renovado', 'Anulado'], $filters, $isJefe, $managedDepartment, in_array($userRole, ['Administrador', 'Talento Humano'], true));
            case 'attendance_general':
                return $this->getAttendanceGeneralReport($filters, $isJefe, $managedDepartment);
            case 'attendance_by_employee':
                return $this->getAttendanceByEmployeeReport($filters, $isJefe, $managedDepartment);
            case 'absenteeism':
                return $this->getAbsenteeismReport($filters, $isJefe, $managedDepartment);
            case 'vacation_balances':
                return $this->getVacationBalancesReport($filters, $isJefe, $managedDepartment);
            case 'leaves_pending':
                return $this->getLeavesByStatusReport('Pendiente', $filters, $isJefe, $managedDepartment);
            case 'leaves_approved_rejected':
                return $this->getLeavesApprovedRejectedReport($filters, $isJefe, $managedDepartment);
            case 'payroll_by_period':
                return $this->getPayrollByPeriodReport($filters, $isJefe, $managedDepartment);
            case 'payroll_by_employee':
                return $this->getPayrollByEmployeeReport($filters, $isJefe, $managedDepartment);
            case 'evaluations_results':
                return $this->getEvaluationsResultsReport($filters, $isJefe, $managedDepartment);
            default:
                throw new InvalidArgumentException("Unsupported report type: {$type}");
        }
    }

    private function applyEmployeeScope($query, array $filters, bool $isJefe, ?Department $managedDepartment, string $employeeColumn = 'id')
    {
        if ($isJefe && $managedDepartment) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $managedDepartment->id));
        } elseif (! empty($filters['department_id'])) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $filters['department_id']));
        }

        if (! empty($filters['employee_id'])) {
            $query->where($employeeColumn, $filters['employee_id']);
        }

        return $query;
    }

    private function getEmployeesStatusReport(array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        $query = Employee::query()->with(['user', 'department', 'position']);

        if ($isJefe && $managedDepartment) {
            $query->where('departamento_id', $managedDepartment->id);
        } elseif (! empty($filters['department_id'])) {
            $query->where('departamento_id', $filters['department_id']);
        }

        if (! empty($filters['employee_id'])) {
            $query->where('id', $filters['employee_id']);
        }

        $employees = $query->orderBy('estado')->orderBy('id')->get();

        $rows = $employees->map(fn ($e) => [
            'id' => $e->id,
            'nombre' => $e->user->name,
            'documento' => $e->numero_documento,
            'correo' => $e->user->email,
            'departamento' => $e->department?->nombre ?? 'Sin departamento',
            'cargo' => $e->position?->nombre ?? 'Sin cargo',
            'fecha_ingreso' => $e->fecha_contratacion ? Carbon::parse($e->fecha_contratacion)->format('d/m/Y') : 'N/D',
            'estado' => $e->estado,
        ])->all();

        $totalActivos = $employees->where('estado', 'Activo')->count();
        $totalInactivos = $employees->where('estado', 'Inactivo')->count();

        return [
            'title' => 'Reporte de Empleados Activos e Inactivos',
            'headers' => ['ID', 'Colaborador', 'Documento', 'Correo', 'Departamento', 'Cargo', 'Fecha Ingreso', 'Estado'],
            'rows' => $rows,
            'summary' => [
                'Total Empleados' => count($rows),
                'Activos' => $totalActivos,
                'Inactivos' => $totalInactivos,
                '% Actividad' => count($rows) > 0 ? round(($totalActivos / count($rows)) * 100, 1).'%' : '0%',
            ],
        ];
    }

    private function getEmployeesByDepartmentReport(array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        $employeeId = $filters['employee_id'] ?: null;
        $employeeScope = fn ($query) => $query->when($employeeId, fn ($employeeQuery) => $employeeQuery->whereKey($employeeId));
        $deptQuery = Department::query()
            ->withCount([
                'employees' => $employeeScope,
                'employees as activos_count' => fn ($query) => $query
                    ->where('estado', 'Activo')
                    ->when($employeeId, fn ($employeeQuery) => $employeeQuery->whereKey($employeeId)),
            ])
            ->with('manager.user')
            ->when($employeeId, fn ($query) => $query->whereHas('employees', $employeeScope));

        if ($isJefe && $managedDepartment) {
            $deptQuery->where('id', $managedDepartment->id);
        } elseif (! empty($filters['department_id'])) {
            $deptQuery->where('id', $filters['department_id']);
        }

        $departments = $deptQuery->get();

        $rows = $departments->map(fn ($d) => [
            'id' => $d->id,
            'departamento' => $d->nombre,
            'descripcion' => $d->descripcion ?? 'Sin descripción',
            'jefe_responsable' => $d->manager?->user?->name ?? 'Sin asignar',
            'total_colaboradores' => $d->employees_count,
            'colaboradores_activos' => $d->activos_count,
            'estado' => $d->is_active ? 'Activo' : 'Inactivo',
        ])->all();

        return [
            'title' => 'Distribución de Personal por Departamento',
            'headers' => ['ID', 'Departamento', 'Descripción', 'Jefe Responsable', 'Total Personal', 'Personal Activo', 'Estado Área'],
            'rows' => $rows,
            'summary' => [
                'Departamentos' => count($rows),
                'Total Colaboradores' => array_sum(array_column($rows, 'total_colaboradores')),
            ],
        ];
    }

    private function getEmployeesByPositionReport(array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        $employeeId = $filters['employee_id'] ?: null;
        $employeeScope = fn ($query) => $query->when($employeeId, fn ($employeeQuery) => $employeeQuery->whereKey($employeeId));
        $posQuery = Position::query()
            ->with('department')
            ->withCount([
                'employees' => $employeeScope,
                'employees as activos_count' => fn ($query) => $query
                    ->where('estado', 'Activo')
                    ->when($employeeId, fn ($employeeQuery) => $employeeQuery->whereKey($employeeId)),
            ])
            ->when($employeeId, fn ($query) => $query->whereHas('employees', $employeeScope));

        if ($isJefe && $managedDepartment) {
            $posQuery->where('departamento_id', $managedDepartment->id);
        } elseif (! empty($filters['department_id'])) {
            $posQuery->where('departamento_id', $filters['department_id']);
        }

        $positions = $posQuery->get();

        $rows = $positions->map(fn ($p) => [
            'id' => $p->id,
            'cargo' => $p->nombre,
            'departamento' => $p->department?->nombre ?? 'General',
            'total_ocupantes' => $p->employees_count,
            'ocupantes_activos' => $p->activos_count,
            'estado' => $p->is_active ? 'Activo' : 'Inactivo',
        ])->all();

        return [
            'title' => 'Distribución de Personal por Cargo',
            'headers' => ['ID', 'Cargo', 'Departamento', 'Ocupantes Totales', 'Ocupantes Activos', 'Estado Cargo'],
            'rows' => $rows,
            'summary' => [
                'Total Cargos Registrados' => count($rows),
                'Total Plazas Ocupadas' => array_sum(array_column($rows, 'total_ocupantes')),
            ],
        ];
    }

    private function getTalentOverviewReport(array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        $employeeId = $filters['employee_id'] ?: null;
        $employeesForSelection = fn ($query) => $query->when(
            $employeeId,
            fn ($employeeQuery) => $employeeQuery->whereKey($employeeId),
        );
        $departments = Department::query()
            ->withCount([
                'employees' => $employeesForSelection,
                'employees as activos_count' => fn ($query) => $query
                    ->where('estado', 'Activo')
                    ->when($employeeId, fn ($employeeQuery) => $employeeQuery->whereKey($employeeId)),
                'employees as inactivos_count' => fn ($query) => $query
                    ->where('estado', 'Inactivo')
                    ->when($employeeId, fn ($employeeQuery) => $employeeQuery->whereKey($employeeId)),
                'employees as contratos_vigentes_count' => fn ($query) => $query
                    ->whereHas('contracts', fn ($contractQuery) => $contractQuery->where('estado', 'Vigente'))
                    ->when($employeeId, fn ($employeeQuery) => $employeeQuery->whereKey($employeeId)),
                'employees as solicitudes_pendientes_count' => fn ($query) => $query
                    ->whereHas('leaveRequests', fn ($leaveQuery) => $leaveQuery->where('estado', 'Pendiente'))
                    ->when($employeeId, fn ($employeeQuery) => $employeeQuery->whereKey($employeeId)),
            ])
            ->with('manager.user')
            ->when(
                $isJefe && $managedDepartment,
                fn ($query) => $query->whereKey($managedDepartment->id),
            )
            ->when(
                ! $isJefe && ! empty($filters['department_id']),
                fn ($query) => $query->whereKey($filters['department_id']),
            )
            ->when($employeeId, fn ($query) => $query->whereHas('employees', $employeesForSelection))
            ->orderBy('nombre')
            ->get();

        $rows = $departments->map(fn (Department $department) => [
            'id' => $department->id,
            'departamento' => $department->nombre,
            'jefe_responsable' => $department->manager?->user?->name ?? 'Sin asignar',
            'total_colaboradores' => $department->employees_count,
            'activos' => $department->activos_count,
            'inactivos' => $department->inactivos_count,
            'colaboradores_con_contrato_vigente' => $department->contratos_vigentes_count,
            'colaboradores_con_solicitudes_pendientes' => $department->solicitudes_pendientes_count,
        ])->all();

        return [
            'title' => 'Resumen General de Talento Humano por Departamento',
            'headers' => ['ID', 'Departamento', 'Jefe Responsable', 'Total Colaboradores', 'Activos', 'Inactivos', 'Con Contrato Vigente', 'Con Solicitud Pendiente'],
            'rows' => $rows,
            'summary' => [
                'Departamentos' => count($rows),
                'Colaboradores' => array_sum(array_column($rows, 'total_colaboradores')),
                'Activos' => array_sum(array_column($rows, 'activos')),
                'Inactivos' => array_sum(array_column($rows, 'inactivos')),
                'Contratos Vigentes' => array_sum(array_column($rows, 'colaboradores_con_contrato_vigente')),
                'Solicitudes Pendientes' => array_sum(array_column($rows, 'colaboradores_con_solicitudes_pendientes')),
            ],
        ];
    }

    private function getContractsHistoryReport(array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        $query = Contract::query()
            ->with(['employee.user', 'employee.department', 'contractType', 'parentContract:id,numero_contrato'])
            ->withCount('renewals');

        if ($isJefe && $managedDepartment) {
            $query->whereHas('employee', fn ($employeeQuery) => $employeeQuery->where('departamento_id', $managedDepartment->id));
        } elseif (! empty($filters['department_id'])) {
            $query->whereHas('employee', fn ($employeeQuery) => $employeeQuery->where('departamento_id', $filters['department_id']));
        }

        if (! empty($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }

        $contracts = $query->orderByDesc('fecha_inicio')->orderByDesc('id')->get();
        $rows = $contracts->map(fn (Contract $contract) => [
            'id' => $contract->id,
            'numero' => $contract->numero_contrato,
            'colaborador' => $contract->employee->user->name,
            'departamento' => $contract->employee->department?->nombre ?? 'N/D',
            'tipo_contrato' => $contract->contractType->nombre,
            'fecha_inicio' => $contract->fecha_inicio->format('d/m/Y'),
            'fecha_fin' => $contract->fecha_fin?->format('d/m/Y') ?? 'Indefinido',
            'estado' => $contract->estado,
            'contrato_anterior' => $contract->parentContract?->numero_contrato ?? '—',
            'renovaciones' => $contract->renewals_count,
        ])->all();

        return [
            'title' => 'Historial General de Contratos',
            'headers' => ['ID', 'N° Contrato', 'Colaborador', 'Departamento', 'Tipo', 'Inicio', 'Fin', 'Estado', 'Contrato Anterior', 'Renovaciones'],
            'rows' => $rows,
            'summary' => [
                'Total Contratos' => count($rows),
                'Vigentes' => $contracts->where('estado', 'Vigente')->count(),
                'Vencidos' => $contracts->where('estado', 'Vencido')->count(),
                'Renovados' => $contracts->where('estado', 'Renovado')->count(),
                'Anulados' => $contracts->where('estado', 'Anulado')->count(),
            ],
        ];
    }

    private function getContractsByTypeReport(array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        $scopeContracts = function ($query) use ($filters, $isJefe, $managedDepartment) {
            if ($isJefe && $managedDepartment) {
                $query->whereHas('employee', fn ($employeeQuery) => $employeeQuery->where('departamento_id', $managedDepartment->id));
            } elseif (! empty($filters['department_id'])) {
                $query->whereHas('employee', fn ($employeeQuery) => $employeeQuery->where('departamento_id', $filters['department_id']));
            }

            if (! empty($filters['employee_id'])) {
                $query->where('employee_id', $filters['employee_id']);
            }

            return $query;
        };
        $contractTypes = ContractType::query()
            ->withCount([
                'contracts' => $scopeContracts,
                'contracts as vigentes_count' => fn ($query) => $scopeContracts($query)->where('estado', 'Vigente'),
                'contracts as finalizados_count' => fn ($query) => $scopeContracts($query)->whereIn('estado', ['Vencido', 'Renovado', 'Anulado']),
            ])
            ->orderBy('nombre')
            ->get();

        $rows = $contractTypes->map(fn (ContractType $contractType) => [
            'id' => $contractType->id,
            'tipo_vinculacion' => $contractType->nombre,
            'codigo' => $contractType->codigo,
            'contratos_registrados' => $contractType->contracts_count,
            'vigentes' => $contractType->vigentes_count,
            'finalizados' => $contractType->finalizados_count,
            'estado' => $contractType->is_active ? 'Activo' : 'Inactivo',
        ])->all();

        return [
            'title' => 'Contratos por Tipo de Vinculación',
            'headers' => ['ID', 'Tipo de Vinculación', 'Código', 'Contratos Registrados', 'Vigentes', 'Finalizados', 'Estado del Tipo'],
            'rows' => $rows,
            'summary' => [
                'Tipos de Vinculación' => count($rows),
                'Contratos Registrados' => array_sum(array_column($rows, 'contratos_registrados')),
                'Contratos Vigentes' => array_sum(array_column($rows, 'vigentes')),
                'Contratos Finalizados' => array_sum(array_column($rows, 'finalizados')),
            ],
        ];
    }

    private function getContractsReport(array $statuses, array $filters, bool $isJefe, ?Department $managedDepartment, bool $showSalary): array
    {
        $query = Contract::query()->whereIn('estado', $statuses)->with(['employee.user', 'employee.department', 'contractType']);

        if ($isJefe && $managedDepartment) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $managedDepartment->id));
        } elseif (! empty($filters['department_id'])) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $filters['department_id']));
        }

        if (! empty($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }

        $contracts = $query->orderBy('fecha_fin')->get();

        $rows = $contracts->map(function (Contract $contract) use ($showSalary): array {
            $row = [
                'id' => $contract->id,
                'numero' => $contract->numero_contrato,
                'colaborador' => $contract->employee->user->name,
                'departamento' => $contract->employee->department?->nombre ?? 'N/D',
                'tipo_contrato' => $contract->contractType->nombre,
            ];
            if ($showSalary) {
                $row['salario'] = '$ '.number_format((float) $contract->salario, 0, ',', '.');
            }
            $row['fecha_inicio'] = $contract->fecha_inicio->format('d/m/Y');
            $row['fecha_fin'] = $contract->fecha_fin ? $contract->fecha_fin->format('d/m/Y') : 'Indefinido';
            $row['estado'] = $contract->estado;

            return $row;
        })->all();

        $headers = ['ID', 'N° Contrato', 'Colaborador', 'Departamento', 'Tipo Contrato'];
        if ($showSalary) {
            $headers[] = 'Salario';
        }
        array_push($headers, 'Inicio', 'Vencimiento', 'Estado');

        return [
            'title' => 'Reporte de Contratos ('.implode(', ', $statuses).')',
            'headers' => $headers,
            'rows' => $rows,
            'summary' => [
                'Total Contratos' => count($rows),
                'Masa Salarial' => '$ '.number_format((float) $contracts->sum('salario'), 0, ',', '.'),
            ],
        ];
    }

    private function getContractsExpiringReport(array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        $alertDays = (int) config('legatum.contract_expiry_days', 30);
        $urgentDays = (int) config('legatum.contract_expiry_urgent_days', 10);
        $query = Contract::query()->proximosAVencer($alertDays)->with(['employee.user', 'employee.department', 'contractType']);

        if ($isJefe && $managedDepartment) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $managedDepartment->id));
        } elseif (! empty($filters['department_id'])) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $filters['department_id']));
        }

        if (! empty($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }

        $contracts = $query->orderBy('fecha_fin')->get();

        $rows = $contracts->map(fn ($c) => [
            'id' => $c->id,
            'numero' => $c->numero_contrato,
            'colaborador' => $c->employee->user->name,
            'departamento' => $c->employee->department?->nombre ?? 'N/D',
            'tipo_contrato' => $c->contractType->nombre,
            'fecha_vencimiento' => $c->fecha_fin ? $c->fecha_fin->format('d/m/Y') : 'N/D',
            'dias_restantes' => $c->dias_restantes.' días',
            'alerta' => $c->dias_restantes <= $urgentDays ? 'Urgente' : 'Atención',
        ])->all();

        return [
            'title' => "Contratos Próximos a Vencer (Ventana de {$alertDays} Días)",
            'headers' => ['ID', 'N° Contrato', 'Colaborador', 'Departamento', 'Tipo Contrato', 'Fecha Vencimiento', 'Días Restantes', 'Nivel Alerta'],
            'rows' => $rows,
            'summary' => [
                'Contratos por Vencer' => count($rows),
                "Urgentes (≤ {$urgentDays} días)" => count(array_filter($rows, fn ($r) => $r['alerta'] === 'Urgente')),
            ],
        ];
    }

    private function getAttendanceGeneralReport(array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        $query = Attendance::query()
            ->whereBetween('fecha', [$filters['date_from'], $filters['date_to']])
            ->with(['employee.user', 'employee.department']);

        if ($isJefe && $managedDepartment) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $managedDepartment->id));
        } elseif (! empty($filters['department_id'])) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $filters['department_id']));
        }

        if (! empty($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }

        $records = $query->orderByDesc('fecha')->get();

        $rows = $records->map(fn ($a) => [
            'id' => $a->id,
            'fecha' => Carbon::parse($a->fecha)->format('d/m/Y'),
            'colaborador' => $a->employee->user->name,
            'departamento' => $a->employee->department?->nombre ?? 'N/D',
            'hora_entrada' => $a->hora_entrada ? Carbon::parse($a->hora_entrada)->format('H:i') : '—',
            'hora_salida' => $a->hora_salida ? Carbon::parse($a->hora_salida)->format('H:i') : '—',
            'minutos_retardo' => $a->minutos_retardo > 0 ? "{$a->minutos_retardo} min" : 'Puntual',
            'horas_extra' => $a->horas_extra > 0 ? "{$a->horas_extra} hrs" : '0',
            'estado' => $a->estado,
        ])->all();

        $presentes = $records->where('estado', 'Presente')->count();
        $retardos = $records->where('estado', 'Retardo')->count();
        $ausencias = $records->where('estado', 'Ausente')->count();

        return [
            'title' => "Control de Asistencia del {$filters['date_from']} al {$filters['date_to']}",
            'headers' => ['ID', 'Fecha', 'Colaborador', 'Departamento', 'Entrada', 'Salida', 'Retardo', 'Horas Extra', 'Estado'],
            'rows' => $rows,
            'summary' => [
                'Total Registros' => count($rows),
                'Jornadas Cumplidas' => $presentes,
                'Retardos' => $retardos,
                'Ausencias' => $ausencias,
                'Total Horas Extra' => round($records->sum('horas_extra'), 1),
            ],
        ];
    }

    private function getAttendanceByEmployeeReport(array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        return $this->getAttendanceGeneralReport($filters, $isJefe, $managedDepartment);
    }

    private function getAbsenteeismReport(array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        $query = Attendance::query()
            ->whereIn('estado', ['Ausente', 'Retardo'])
            ->whereBetween('fecha', [$filters['date_from'], $filters['date_to']])
            ->with(['employee.user', 'employee.department']);

        if ($isJefe && $managedDepartment) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $managedDepartment->id));
        } elseif (! empty($filters['department_id'])) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $filters['department_id']));
        }

        if (! empty($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }

        $records = $query->orderByDesc('fecha')->get();

        $rows = $records->map(fn ($a) => [
            'id' => $a->id,
            'fecha' => Carbon::parse($a->fecha)->format('d/m/Y'),
            'colaborador' => $a->employee->user->name,
            'departamento' => $a->employee->department?->nombre ?? 'N/D',
            'tipo_incidencia' => $a->estado,
            'minutos_retardo' => $a->minutos_retardo > 0 ? "{$a->minutos_retardo} min" : '—',
            'justificacion' => $a->justificacion_correccion ?? 'Sin justificación registrada',
        ])->all();

        return [
            'title' => 'Reporte de Ausentismo y Novedades de Puntualidad',
            'headers' => ['ID', 'Fecha', 'Colaborador', 'Departamento', 'Incidencia', 'Retardo', 'Justificación'],
            'rows' => $rows,
            'summary' => [
                'Total Incidencias' => count($rows),
                'Ausencias' => $records->where('estado', 'Ausente')->count(),
                'Retardos' => $records->where('estado', 'Retardo')->count(),
            ],
        ];
    }

    private function getVacationBalancesReport(array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        $query = VacationBalance::query()->with(['employee.user', 'employee.department']);

        if ($isJefe && $managedDepartment) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $managedDepartment->id));
        } elseif (! empty($filters['department_id'])) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $filters['department_id']));
        }

        if (! empty($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }

        $balances = $query->get();

        $rows = $balances->map(fn ($b) => [
            'id' => $b->id,
            'colaborador' => $b->employee->user->name,
            'departamento' => $b->employee->department?->nombre ?? 'N/D',
            'dias_ganados' => number_format((float) $b->dias_totales_ganados, 1),
            'dias_disfrutados' => number_format((float) $b->dias_disfrutados, 1),
            'dias_pendientes' => number_format((float) $b->dias_pendientes, 1),
            'saldo_disponible' => number_format((float) $b->dias_disponibles, 1).' días',
        ])->all();

        return [
            'title' => 'Consolidado General de Saldos de Vacaciones',
            'headers' => ['ID', 'Colaborador', 'Departamento', 'Días Ganados', 'Días Disfrutados', 'Días Solicitados', 'Saldo Disponible'],
            'rows' => $rows,
            'summary' => [
                'Total Colaboradores' => count($rows),
                'Total Días Ganados' => round($balances->sum('dias_totales_ganados'), 1),
                'Total Días Disfrutados' => round($balances->sum('dias_disfrutados'), 1),
                'Días Disponibles Globales' => round($balances->sum('dias_disponibles'), 1),
            ],
        ];
    }

    private function getLeavesByStatusReport(string $status, array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        $query = LeaveRequest::query()->where('estado', $status)->with(['employee.user', 'employee.department', 'leaveType']);

        if ($isJefe && $managedDepartment) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $managedDepartment->id));
        } elseif (! empty($filters['department_id'])) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $filters['department_id']));
        }

        if (! empty($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }

        $requests = $query->orderByDesc('created_at')->get();

        $rows = $requests->map(fn ($r) => [
            'id' => $r->id,
            'fecha_solicitud' => $r->created_at->format('d/m/Y'),
            'colaborador' => $r->employee->user->name,
            'departamento' => $r->employee->department?->nombre ?? 'N/D',
            'tipo' => $r->leaveType->nombre,
            'desde' => $r->fecha_inicio->format('d/m/Y'),
            'hasta' => $r->fecha_fin->format('d/m/Y'),
            'dias' => $r->dias_solicitados,
            'motivo' => $r->motivo,
        ])->all();

        return [
            'title' => "Solicitudes de Vacaciones y Permisos ({$status})",
            'headers' => ['ID', 'Fecha Solicitud', 'Colaborador', 'Departamento', 'Tipo', 'Desde', 'Hasta', 'Días', 'Motivo'],
            'rows' => $rows,
            'summary' => [
                "Total Solicitudes {$status}" => count($rows),
                'Días Totales Solicitados' => array_sum(array_column($rows, 'dias')),
            ],
        ];
    }

    private function getLeavesApprovedRejectedReport(array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        $query = LeaveRequest::query()
            ->whereIn('estado', ['Aprobada', 'Rechazada'])
            ->with(['employee.user', 'employee.department', 'leaveType', 'reviewer']);

        if ($isJefe && $managedDepartment) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $managedDepartment->id));
        } elseif (! empty($filters['department_id'])) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $filters['department_id']));
        }

        if (! empty($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }

        $requests = $query->orderByDesc('fecha_respuesta')->get();

        $rows = $requests->map(fn ($r) => [
            'id' => $r->id,
            'colaborador' => $r->employee->user->name,
            'departamento' => $r->employee->department?->nombre ?? 'N/D',
            'tipo' => $r->leaveType->nombre,
            'dias' => $r->dias_solicitados,
            'estado' => $r->estado,
            'resuelto_por' => $r->reviewer?->name ?? 'Talento Humano',
            'fecha_resolucion' => $r->fecha_respuesta ? Carbon::parse($r->fecha_respuesta)->format('d/m/Y') : '—',
            'observaciones' => $r->observaciones_respuesta ?? 'Sin comentarios',
        ])->all();

        return [
            'title' => 'Historial de Solicitudes Aprobadas y Rechazadas',
            'headers' => ['ID', 'Colaborador', 'Departamento', 'Tipo Permiso', 'Días', 'Decisión', 'Responsable', 'Fecha Decisión', 'Observaciones'],
            'rows' => $rows,
            'summary' => [
                'Total Procesadas' => count($rows),
                'Aprobadas' => $requests->where('estado', 'Aprobada')->count(),
                'Rechazadas' => $requests->where('estado', 'Rechazada')->count(),
            ],
        ];
    }

    private function getPayrollByPeriodReport(array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        $periodId = $filters['period_id'] ?: (
            PayrollPeriod::query()
                ->where('estado', 'Abierto')
                ->orderByDesc('fecha_inicio')
                ->value('id')
                ?? PayrollPeriod::query()->orderByDesc('fecha_inicio')->value('id')
        );

        $query = PayrollNovelty::query()
            ->when($periodId, fn ($q) => $q->where('payroll_period_id', $periodId))
            ->where('estado', 'Activa')
            ->with(['employee.user', 'employee.department', 'noveltyType', 'period']);

        if ($isJefe && $managedDepartment) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $managedDepartment->id));
        } elseif (! empty($filters['department_id'])) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $filters['department_id']));
        }

        if (! empty($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }

        $novelties = $query->get();

        $rows = $novelties->map(fn ($n) => [
            'id' => $n->id,
            'periodo' => $n->period->codigo,
            'colaborador' => $n->employee->user->name,
            'departamento' => $n->employee->department?->nombre ?? 'N/D',
            'novedad' => $n->noveltyType->nombre,
            'tipo' => $n->noveltyType->tipo,
            'cantidad' => $n->cantidad ? (float) $n->cantidad : '—',
            'valor' => '$ '.number_format((float) $n->valor, 0, ',', '.'),
            'descripcion' => $n->descripcion,
        ])->all();

        $devengos = $novelties->where('noveltyType.tipo', 'Devengo')->sum('valor');
        $deducciones = $novelties->where('noveltyType.tipo', 'Deduccion')->sum('valor');

        return [
            'title' => 'Novedades de Nómina por Período Quincenal',
            'headers' => ['ID', 'Período', 'Colaborador', 'Departamento', 'Concepto Novedad', 'Tipo', 'Cantidad', 'Valor', 'Descripción'],
            'rows' => $rows,
            'summary' => [
                'Total Registros' => count($rows),
                'Total Devengos' => '$ '.number_format((float) $devengos, 0, ',', '.'),
                'Total Deducciones' => '$ '.number_format((float) $deducciones, 0, ',', '.'),
                'Neto Novedades' => '$ '.number_format((float) ($devengos - $deducciones), 0, ',', '.'),
            ],
        ];
    }

    private function getPayrollByEmployeeReport(array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        $periodId = $filters['period_id'] ?: (
            PayrollPeriod::query()
                ->where('estado', 'Abierto')
                ->orderByDesc('fecha_inicio')
                ->value('id')
                ?? PayrollPeriod::query()->orderByDesc('fecha_inicio')->value('id')
        );

        $query = PayrollNovelty::query()
            ->when($periodId, fn ($q) => $q->where('payroll_period_id', $periodId))
            ->where('estado', 'Activa')
            ->with(['employee.user', 'employee.department', 'noveltyType']);

        if ($isJefe && $managedDepartment) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $managedDepartment->id));
        } elseif (! empty($filters['department_id'])) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $filters['department_id']));
        }

        if (! empty($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }

        $novelties = $query->get();

        $byEmployee = $novelties->groupBy('employee_id')->map(function ($items) {
            $emp = $items->first()->employee;
            $devengos = $items->where('noveltyType.tipo', 'Devengo')->sum('valor');
            $deducciones = $items->where('noveltyType.tipo', 'Deduccion')->sum('valor');

            return [
                'id' => $emp->id,
                'colaborador' => $emp->user->name,
                'documento' => $emp->numero_documento,
                'departamento' => $emp->department?->nombre ?? 'N/D',
                'cantidad_novedades' => $items->count(),
                'total_devengos' => '$ '.number_format((float) $devengos, 0, ',', '.'),
                'total_deducciones' => '$ '.number_format((float) $deducciones, 0, ',', '.'),
                'neto' => '$ '.number_format((float) ($devengos - $deducciones), 0, ',', '.'),
            ];
        })->values()->all();

        return [
            'title' => 'Resumen de Novedades Consolidadas por Colaborador',
            'headers' => ['ID', 'Colaborador', 'Documento', 'Departamento', 'Cant. Novedades', 'Total Devengos (+)', 'Total Deducciones (-)', 'Impacto Neto'],
            'rows' => $byEmployee,
            'summary' => [
                'Colaboradores con Novedad' => count($byEmployee),
            ],
        ];
    }

    private function getEvaluationsResultsReport(array $filters, bool $isJefe, ?Department $managedDepartment): array
    {
        $query = PerformanceEvaluation::query()
            ->where('estado', 'Completada')
            ->with(['employee.user', 'employee.department', 'employee.position', 'evaluator', 'period']);

        if ($isJefe && $managedDepartment) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $managedDepartment->id));
        } elseif (! empty($filters['department_id'])) {
            $query->whereHas('employee', fn ($e) => $e->where('departamento_id', $filters['department_id']));
        }

        if (! empty($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }

        $evaluations = $query->orderByDesc('calificacion_final')->get();

        $rows = $evaluations->map(fn ($e) => [
            'id' => $e->id,
            'periodo' => $e->period->nombre,
            'colaborador' => $e->employee->user->name,
            'departamento' => $e->employee->department?->nombre ?? 'N/D',
            'cargo' => $e->employee->position?->nombre ?? 'N/D',
            'evaluador' => $e->evaluator?->name ?? 'Talento Humano',
            'calificacion' => number_format((float) $e->calificacion_final, 2).' / 5.00',
            'desempeno' => ((float) $e->calificacion_final >= 4.5) ? 'Excelente' : (((float) $e->calificacion_final >= 3.8) ? 'Sobresaliente' : (((float) $e->calificacion_final >= 3.0) ? 'Aceptable' : 'Requiere Mejora')),
            'fecha' => $e->fecha_evaluacion ? $e->fecha_evaluacion->format('d/m/Y') : '—',
        ])->all();

        $promedio = $evaluations->count() > 0 ? round($evaluations->avg('calificacion_final'), 2) : 0;

        return [
            'title' => 'Resultados Consolidados de Evaluaciones de Desempeño',
            'headers' => ['ID', 'Período', 'Colaborador', 'Departamento', 'Cargo', 'Evaluador', 'Puntaje Final', 'Nivel de Desempeño', 'Fecha Calificación'],
            'rows' => $rows,
            'summary' => [
                'Total Evaluaciones' => count($rows),
                'Promedio General' => "{$promedio} / 5.00",
                'Sobresalientes (>= 3.8)' => $evaluations->where('calificacion_final', '>=', 3.8)->count(),
                'Bajo Desempeño (< 3.0)' => $evaluations->where('calificacion_final', '<', 3.0)->count(),
            ],
        ];
    }
}
