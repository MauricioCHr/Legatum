import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import EmptyState from '../../Components/EmptyState';
import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

function ReportTable({ headers, rows }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 print:text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-700 print:bg-slate-100">
                    <tr>
                        {headers.map((header, index) => (
                            <th className="px-3 py-2.5 font-bold" key={index}>{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                    {rows.map((row, rowIndex) => (
                        <tr className="transition hover:bg-slate-50/75" key={rowIndex}>
                            {Object.values(row).map((value, cellIndex) => (
                                <td className="whitespace-nowrap px-3 py-2.5" key={cellIndex}>{String(value)}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ChartCard({ chart }) {
    return (
        <section className="break-inside-avoid rounded-lg border border-slate-200 bg-white p-4 print:border-slate-300">
            <h3 className="mb-3 text-sm font-bold text-slate-800">{chart.title}</h3>
            {chart.points.length === 0 ? (
                <p className="text-xs text-slate-500">Sin datos para representar.</p>
            ) : (
                <div className="space-y-2.5">
                    {chart.points.map((point) => (
                        <div className="grid grid-cols-[minmax(90px,1fr)_2fr_auto] items-center gap-2" key={point.label}>
                            <span className="truncate text-xs text-slate-600" title={point.label}>{point.label}</span>
                            <div
                                aria-label={`${point.label}: ${point.value}`}
                                className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                                role="img"
                            >
                                <span
                                    className="block h-full rounded-full bg-[#547da6]"
                                    style={{ width: `${Math.min(Math.max(point.percentage, 0), 100)}%` }}
                                />
                            </div>
                            <span className="min-w-8 text-right text-xs font-semibold tabular-nums text-slate-700">{point.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export default function Index({
    reportTypes,
    filters,
    reportData,
    departments,
    employees,
    periods,
    contractTypes,
    leaveTypes,
    payrollNoveltyTypes,
    reportHistory,
    isJefe,
    managedDepartment,
    generatedAt,
}) {
    const { errors = {} } = usePage().props;
    const [reportType, setReportType] = useState(filters.report_type ?? 'employees_status');
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const [departmentId, setDepartmentId] = useState(filters.department_id ?? '');
    const [employeeId, setEmployeeId] = useState(filters.employee_id ?? '');
    const [periodId, setPeriodId] = useState(filters.period_id ?? '');
    const [contractTypeId, setContractTypeId] = useState(filters.contract_type_id ?? '');
    const [contractStatus, setContractStatus] = useState(filters.contract_status ?? '');
    const [expiryFrom, setExpiryFrom] = useState(filters.expiry_from ?? '');
    const [expiryTo, setExpiryTo] = useState(filters.expiry_to ?? '');
    const [leaveTypeId, setLeaveTypeId] = useState(filters.leave_type_id ?? '');
    const [leaveStatus, setLeaveStatus] = useState(filters.leave_status ?? '');
    const [noveltyTypeId, setNoveltyTypeId] = useState(filters.novelty_type_id ?? '');
    const [pdfProcessing, setPdfProcessing] = useState(false);
    const [pdfError, setPdfError] = useState('');
    const [pdfSuccess, setPdfSuccess] = useState('');
    const dateRangeError = dateFrom && dateTo && dateTo < dateFrom
        ? 'La fecha final debe ser igual o posterior a la fecha inicial.'
        : '';

    function getFilterData() {
        return {
            report_type: reportType,
            date_from: dateFrom,
            date_to: dateTo,
            department_id: departmentId,
            employee_id: employeeId,
            period_id: periodId,
            contract_type_id: contractTypeId,
            contract_status: contractStatus,
            expiry_from: expiryFrom,
            expiry_to: expiryTo,
            leave_type_id: leaveTypeId,
            leave_status: leaveStatus,
            novelty_type_id: noveltyTypeId,
        };
    }

    function handleFilter(e) {
        e.preventDefault();
        if (dateRangeError || expiryRangeError) {
            return;
        }

        router.get('/reportes', getFilterData(), {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function handleReset() {
        setReportType('employees_status');
        setDateFrom('');
        setDateTo('');
        setDepartmentId('');
        setEmployeeId('');
        setPeriodId('');
        setContractTypeId('');
        setContractStatus('');
        setExpiryFrom('');
        setExpiryTo('');
        setLeaveTypeId('');
        setLeaveStatus('');
        setNoveltyTypeId('');
        router.get('/reportes');
    }

    function handleExportCsv() {
        if (dateRangeError || expiryRangeError) {
            return;
        }

        const params = new URLSearchParams(getFilterData());
        window.location.href = `/reportes/exportar?${params.toString()}`;
    }

    function handlePrint() {
        window.print();
    }

    async function downloadPdf(url, payload = {}) {
        setPdfProcessing(true);
        setPdfError('');
        setPdfSuccess('');

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            if (!csrfToken) {
                throw new Error('No se pudo validar la sesión para generar el reporte.');
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/pdf, application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let message = 'No fue posible generar el PDF.';
                if (response.headers.get('Content-Type')?.includes('application/json')) {
                    const responseData = await response.json();
                    const validationMessage = Object.values(responseData.errors ?? {}).flat().join(' ');
                    message = validationMessage || responseData.message || message;
                }

                throw new Error(message);
            }

            if (!response.headers.get('Content-Type')?.includes('application/pdf')) {
                throw new Error('El servidor no devolvió un documento PDF válido.');
            }

            const pdfBlob = await response.blob();
            const objectUrl = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            const disposition = response.headers.get('Content-Disposition') ?? '';
            const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? 'reporte_legatum.pdf';

            link.href = objectUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
            setPdfSuccess('El PDF se generó y quedó disponible en el historial.');
            router.reload({ only: ['reportHistory'], preserveScroll: true });
        } catch (error) {
            setPdfError(error instanceof Error ? error.message : 'No fue posible generar el PDF.');
        } finally {
            setPdfProcessing(false);
        }
    }

    function handleGeneratePdf() {
        if (dateRangeError || expiryRangeError) {
            return;
        }

        downloadPdf('/reportes/generar-pdf', getFilterData());
    }

    function handleReportHistoryPage(page) {
        router.get('/reportes', { ...getFilterData(), page }, {
            only: ['reportHistory'],
            preserveState: true,
            preserveScroll: true,
        });
    }

    const showDateFilter = ['executive_overview', 'attendance_absenteeism', 'leaves_payroll', 'attendance_general', 'attendance_by_employee', 'absenteeism'].includes(reportType);
    const showPeriodFilter = ['payroll_by_period', 'payroll_by_employee', 'leaves_payroll'].includes(reportType);
    const showContractFilters = reportType === 'contracts_status';
    const showLeaveFilters = reportType === 'leaves_payroll';
    const expiryRangeError = expiryFrom && expiryTo && expiryTo < expiryFrom
        ? 'La fecha final de vencimiento debe ser igual o posterior a la fecha inicial.'
        : '';

    return (
        <AuthenticatedLayout>
            <div className="space-y-6">
                {/* Header (Hidden in Print) */}
                <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Módulo de Reportes Institucionales
                        </h1>
                        <p className="text-sm text-slate-500">
                            {isJefe
                                ? `Reportes analíticos de los colaboradores del área: ${managedDepartment || 'Mi equipo'}`
                                : 'Consulta, genera y descarga reportes basados en la información registrada en LEGATUM.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleGeneratePdf}
                            disabled={pdfProcessing || Boolean(dateRangeError || expiryRangeError)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 rounded-lg shadow-sm transition"
                        >
                            <Icon name="file" className="w-4 h-4" />
                            {pdfProcessing ? 'Generando PDF…' : 'Generar y descargar PDF'}
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition"
                        >
                            <Icon name="printer" className="w-4 h-4 text-slate-500" />
                            Imprimir vista
                        </button>

                        <button
                            type="button"
                            onClick={handleExportCsv}
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition"
                        >
                            <Icon name="download" className="w-4 h-4" />
                            Exportar CSV (Excel)
                        </button>
                    </div>
                </div>

                {(pdfError || pdfSuccess) && (
                    <div
                        className={`rounded-lg border px-3 py-2 text-sm ${pdfError ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}
                        role={pdfError ? 'alert' : 'status'}
                    >
                        {pdfError || pdfSuccess}
                    </div>
                )}

                {/* Filter Control Box (Hidden in Print) */}
                <form onSubmit={handleFilter} className="print:hidden bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    {(dateRangeError || expiryRangeError || Object.keys(errors).length > 0) && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                            {dateRangeError || expiryRangeError || Object.values(errors).join(' ')}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Report Type Selector */}
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Tipo de Reporte
                            </label>
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                className="w-full text-sm font-medium rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                            >
                                {Object.entries(reportTypes).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Department Selector */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Departamento
                            </label>
                            <select
                                disabled={isJefe}
                                value={departmentId}
                                onChange={(e) => setDepartmentId(e.target.value)}
                                className="w-full text-sm rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500 disabled:bg-slate-100 disabled:text-slate-500"
                            >
                                <option value="">Todos los departamentos</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Optional Date Range */}
                        {showDateFilter && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                        Fecha Desde
                                    </label>
                                    <input
                                        type="date"
                                        max={dateTo || undefined}
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="w-full text-sm rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                        Fecha Hasta
                                    </label>
                                    <input
                                        type="date"
                                        min={dateFrom || undefined}
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="w-full text-sm rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                                    />
                                </div>
                            </>
                        )}

                        {showContractFilters && (
                            <>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Tipo de contrato
                                    </label>
                                    <select
                                        className="w-full rounded-lg border-slate-300 text-sm focus:border-slate-500 focus:ring-slate-500"
                                        onChange={(event) => setContractTypeId(event.target.value)}
                                        value={contractTypeId}
                                    >
                                        <option value="">Todos los tipos</option>
                                        {contractTypes.map((type) => (
                                            <option key={type.id} value={type.id}>{type.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Estado contractual
                                    </label>
                                    <select
                                        className="w-full rounded-lg border-slate-300 text-sm focus:border-slate-500 focus:ring-slate-500"
                                        onChange={(event) => setContractStatus(event.target.value)}
                                        value={contractStatus}
                                    >
                                        <option value="">Todos los estados</option>
                                        {['Vigente', 'Vencido', 'Renovado', 'Anulado'].map((status) => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Vencimiento desde
                                    </label>
                                    <input
                                        className="w-full rounded-lg border-slate-300 text-sm focus:border-slate-500 focus:ring-slate-500"
                                        max={expiryTo || undefined}
                                        onChange={(event) => setExpiryFrom(event.target.value)}
                                        type="date"
                                        value={expiryFrom}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Vencimiento hasta
                                    </label>
                                    <input
                                        className="w-full rounded-lg border-slate-300 text-sm focus:border-slate-500 focus:ring-slate-500"
                                        min={expiryFrom || undefined}
                                        onChange={(event) => setExpiryTo(event.target.value)}
                                        type="date"
                                        value={expiryTo}
                                    />
                                </div>
                            </>
                        )}

                        {/* Optional Period Selector */}
                        {showPeriodFilter && (
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Período de Nómina
                                </label>
                                <select
                                    value={periodId}
                                    onChange={(e) => setPeriodId(e.target.value)}
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                                >
                                    <option value="">Período activo más reciente</option>
                                    {periods.map(p => (
                                        <option key={p.id} value={p.id}>{p.codigo} — {p.nombre} ({p.estado})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {showLeaveFilters && (
                            <>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Tipo de solicitud
                                    </label>
                                    <select
                                        className="w-full rounded-lg border-slate-300 text-sm focus:border-slate-500 focus:ring-slate-500"
                                        onChange={(event) => setLeaveTypeId(event.target.value)}
                                        value={leaveTypeId}
                                    >
                                        <option value="">Todos los tipos</option>
                                        {leaveTypes.map((type) => (
                                            <option key={type.id} value={type.id}>{type.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Estado de solicitud
                                    </label>
                                    <select
                                        className="w-full rounded-lg border-slate-300 text-sm focus:border-slate-500 focus:ring-slate-500"
                                        onChange={(event) => setLeaveStatus(event.target.value)}
                                        value={leaveStatus}
                                    >
                                        <option value="">Todos los estados</option>
                                        {['Pendiente', 'Aprobada', 'Rechazada', 'Cancelada'].map((status) => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>
                                {payrollNoveltyTypes.length > 0 && (
                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                                            Tipo de novedad de nómina
                                        </label>
                                        <select
                                            className="w-full rounded-lg border-slate-300 text-sm focus:border-slate-500 focus:ring-slate-500"
                                            onChange={(event) => setNoveltyTypeId(event.target.value)}
                                            value={noveltyTypeId}
                                        >
                                            <option value="">Todos los tipos</option>
                                            {payrollNoveltyTypes.map((type) => (
                                                <option key={type.id} value={type.id}>{type.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Optional Employee Filter */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Colaborador Específico
                            </label>
                            <select
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                className="w-full text-sm rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                            >
                                <option value="">Todos los colaboradores</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                            Restablecer
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition"
                        >
                            Generar Reporte
                        </button>
                    </div>
                </form>

                {/* Printable Document Header (Visible in print and regular view) */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm print:shadow-none print:border-none print:p-0">
                    <div className="border-b border-slate-200 pb-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="text-xs uppercase font-extrabold tracking-widest text-slate-400">
                                Comercializadora Andina S.A.S. • Ipiales, Nariño
                            </div>
                            <h2 className="text-xl font-black text-slate-900 mt-1">
                                {reportData.title}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Generado el {generatedAt}
                                {reportData.period && ` · Período: ${reportData.period}`}
                            </p>
                        </div>

                        {/* Print Watermark/Logo */}
                        <div className="text-right">
                            <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-extrabold text-xs tracking-wider">
                                LEGATUM TALENTO HUMANO
                            </span>
                        </div>
                    </div>

                    {/* Summary KPI Pills */}
                    {reportData.summary && Object.keys(reportData.summary).length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            {Object.entries(reportData.summary).map(([key, val]) => (
                                <div key={key} className="bg-slate-50 rounded-lg p-3 border border-slate-100 print:border-slate-300">
                                    <span className="text-xs font-semibold text-slate-500 uppercase">{key}</span>
                                    <div className="text-lg font-black text-slate-900 mt-0.5">{val}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {reportData.charts?.length > 0 && (
                        <div className="mb-6 grid gap-4 md:grid-cols-2">
                            {reportData.charts.map((chart) => (
                                <ChartCard chart={chart} key={chart.title} />
                            ))}
                        </div>
                    )}

                    {/* Table View */}
                    {reportData.rows.length === 0 ? (
                        <EmptyState
                            title="No se encontraron registros con los filtros seleccionados"
                            description="Modifica los parámetros de búsqueda o selecciona otro tipo de reporte."
                        />
                    ) : <ReportTable headers={reportData.headers} rows={reportData.rows} />}

                    {reportData.sections?.map((section) => (
                        <section className="mt-6 break-inside-avoid" key={section.title}>
                            <h3 className="mb-2 text-sm font-bold text-slate-800">{section.title}</h3>
                            {section.rows.length > 0
                                ? <ReportTable headers={section.headers} rows={section.rows} />
                                : <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Sin datos para este período.</p>}
                            {section.change_percentage_points !== undefined && section.change_percentage_points !== null && (
                                <p className="mt-2 text-xs text-slate-600">
                                    Variación de asistencia: {section.change_percentage_points > 0 ? '+' : ''}{section.change_percentage_points} puntos porcentuales.
                                </p>
                            )}
                        </section>
                    ))}

                    {/* Document Footer */}
                    <div className="pt-6 mt-6 border-t border-slate-100 text-xs text-slate-400 flex flex-col sm:flex-row justify-between gap-2 print:text-[10px]">
                        <div>
                            Sistema de Información LEGATUM • Comercializadora Andina S.A.S. — Ipiales, Colombia
                        </div>
                        <div>
                            Total de registros listados: <span className="font-bold text-slate-700">{reportData.rows.length}</span>
                        </div>
                    </div>
                </div>

                <section className="print:hidden bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="text-base font-bold text-slate-900">Historial de reportes PDF</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Descarga nuevamente un documento generado o regénéralo con los datos actuales.
                        </p>
                    </div>

                    {reportHistory.data.length === 0 ? (
                        <div className="px-5 py-8 text-center text-sm text-slate-500">
                            Aún no se han generado reportes PDF.
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-700">
                                        <tr>
                                            <th className="px-4 py-3 font-bold">Reporte</th>
                                            <th className="px-4 py-3 font-bold">Generado por</th>
                                            <th className="px-4 py-3 font-bold">Departamento</th>
                                            <th className="px-4 py-3 font-bold">Fecha</th>
                                            <th className="px-4 py-3 font-bold">Registros</th>
                                            <th className="px-4 py-3 font-bold">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reportHistory.data.map((report) => (
                                            <tr key={report.id}>
                                                <td className="px-4 py-3">
                                                    <span className="block font-semibold text-slate-800">{report.title}</span>
                                                    <span className="text-xs text-slate-500">{report.report_type_label}</span>
                                                </td>
                                                <td className="px-4 py-3">{report.generated_by}</td>
                                                <td className="px-4 py-3">{report.department}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">{report.created_at}</td>
                                                <td className="px-4 py-3">{report.rows_count}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        <a
                                                            href={report.download_url}
                                                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                                        >
                                                            <Icon name="download" className="size-3.5" />
                                                            Descargar
                                                        </a>
                                                        <button
                                                            type="button"
                                                            disabled={pdfProcessing}
                                                            onClick={() => downloadPdf(report.regenerate_url)}
                                                            className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            <Icon name="file" className="size-3.5" />
                                                            Regenerar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {reportHistory.last_page > 1 && (
                                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
                                    <span className="text-slate-500">
                                        Página {reportHistory.current_page} de {reportHistory.last_page}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            disabled={reportHistory.current_page <= 1}
                                            onClick={() => handleReportHistoryPage(reportHistory.current_page - 1)}
                                            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Anterior
                                        </button>
                                        <button
                                            type="button"
                                            disabled={reportHistory.current_page >= reportHistory.last_page}
                                            onClick={() => handleReportHistoryPage(reportHistory.current_page + 1)}
                                            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
