import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import EmptyState from '../../Components/EmptyState';
import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

function StatusBadge({ status }) {
    const styles = {
        Pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
        Aprobada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Rechazada: 'bg-red-50 text-red-700 border-red-200',
        Cancelada: 'bg-slate-100 text-slate-500 border-slate-200',
    };
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {status}
        </span>
    );
}

export default function Index({
    requests,
    summary,
    departments,
    employees,
    filterEmployees,
    leaveTypes,
    filterLeaveTypes,
    filters,
    canManage,
    flash,
    errors = {},
}) {
    const [status, setStatus] = useState(filters.estado ?? '');
    const [departmentId, setDepartmentId] = useState(filters.departamento_id ?? '');
    const [employeeId, setEmployeeId] = useState(filters.employee_id ?? '');
    const [leaveTypeId, setLeaveTypeId] = useState(filters.leave_type_id ?? '');
    const [periodStart, setPeriodStart] = useState(filters.fecha_desde ?? '');
    const [periodEnd, setPeriodEnd] = useState(filters.fecha_hasta ?? '');

    // Modals
    const [createModal, setCreateModal] = useState(false);
    const [approveModal, setApproveModal] = useState({ open: false, request: null });
    const [rejectModal, setRejectModal] = useState({ open: false, request: null });

    const createForm = useForm({
        employee_id: '',
        leave_type_id: '',
        fecha_inicio: '',
        fecha_fin: '',
        motivo: '',
        support_file: null,
    });

    const rejectForm = useForm({
        observaciones_respuesta: '',
    });
    const approveForm = useForm({
        observaciones_respuesta: '',
    });
    const selectedLeaveType = leaveTypes.find((type) => Number(type.id) === Number(createForm.data.leave_type_id));

    function handleCreateSubmit(e) {
        e.preventDefault();
        createForm.post('/vacaciones/solicitudes', {
            onSuccess: () => {
                setCreateModal(false);
                createForm.reset();
            },
        });
    }

    function openApprove(req) {
        setApproveModal({ open: true, request: req });
        approveForm.clearErrors();
        approveForm.setData({ observaciones_respuesta: '' });
    }

    function handleApproveSubmit(e) {
        e.preventDefault();
        approveForm.post(`/vacaciones/solicitudes/${approveModal.request.id}/aprobar`, {
            onSuccess: () => setApproveModal({ open: false, request: null }),
        });
    }

    function openReject(req) {
        setRejectModal({ open: true, request: req });
        rejectForm.clearErrors();
        rejectForm.setData({ observaciones_respuesta: '' });
    }

    function handleRejectSubmit(e) {
        e.preventDefault();
        rejectForm.post(`/vacaciones/solicitudes/${rejectModal.request.id}/rechazar`, {
            onSuccess: () => setRejectModal({ open: false, request: null }),
        });
    }

    function handleFilter(e) {
        e.preventDefault();
        router.get('/vacaciones/solicitudes', {
            estado: status,
            departamento_id: departmentId,
            employee_id: employeeId,
            leave_type_id: leaveTypeId,
            fecha_desde: periodStart,
            fecha_hasta: periodEnd,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function clearFilter() {
        setStatus('');
        setDepartmentId('');
        setEmployeeId('');
        setLeaveTypeId('');
        setPeriodStart('');
        setPeriodEnd('');
        router.get('/vacaciones/solicitudes');
    }

    const previousPage = requests.links[0];
    const nextPage = requests.links[requests.links.length - 1];
    const pageLinks = requests.links.slice(1, -1);

    return (
        <AuthenticatedLayout title="Vacaciones y Permisos">
            <div className="space-y-4">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#547da6]">
                            <span className="rounded bg-[#eaf1fa] px-1.5 py-0.5">Gestión de Ausencias</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">Comercializadora Andina S.A.S.</span>
                        </p>
                        <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[25px]">
                            Solicitudes de Vacaciones y Permisos
                        </h1>
                        <p className="mt-1 text-[10px] text-slate-500">
                            Flujo centralizado de aprobación, control de saldos y trazabilidad de licencias remuneradas y no remuneradas.
                        </p>
                    </div>

                    {canManage && (
                        <button
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#07152b] px-3.5 py-2 text-[10px] font-semibold text-white shadow-sm transition hover:bg-[#1a3150]"
                            onClick={() => {
                                createForm.reset();
                                createForm.clearErrors();
                                setCreateModal(true);
                            }}
                            type="button"
                        >
                            <Icon className="h-3.5 w-3.5" name="plus" />
                            Radicar Solicitud
                        </button>
                    )}
                </header>

                {flash?.success && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        {flash.error}
                    </div>
                )}

                {/* Metrics */}
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Solicitudes Pendientes</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-amber-600">{summary.pendientes}</span>
                            <span className="rounded bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">Por revisar</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Aprobadas</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-emerald-700">{summary.aprobadas}</span>
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Concedidas</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Rechazadas</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-red-600">{summary.rechazadas}</span>
                            <span className="rounded bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700">Denegadas</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Total Días Concedidos</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-[#547da6]">{summary.dias_concedidos}</span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700">Días</span>
                        </div>
                    </div>
                </section>

                {/* Filter and Table */}
                <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                    <form
                        className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-2 sm:items-center lg:grid-cols-4 xl:grid-cols-7"
                        onSubmit={handleFilter}
                    >
                        <select
                            className="rounded-md border border-slate-100 bg-[#f8faff] px-2 py-2 text-[10px] text-slate-700 outline-none"
                            onChange={(e) => setStatus(e.target.value)}
                            value={status}
                        >
                            <option value="">Estado: Todos</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="Aprobada">Aprobada</option>
                            <option value="Rechazada">Rechazada</option>
                            <option value="Cancelada">Cancelada</option>
                        </select>
                        <select
                            className="rounded-md border border-slate-100 bg-[#f8faff] px-2 py-2 text-[10px] text-slate-700 outline-none"
                            onChange={(e) => setDepartmentId(e.target.value)}
                            value={departmentId}
                        >
                            <option value="">Departamento: Todos</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>{d.nombre}</option>
                            ))}
                        </select>
                        <select
                            className="rounded-md border border-slate-100 bg-[#f8faff] px-2 py-2 text-[10px] text-slate-700 outline-none"
                            onChange={(e) => setEmployeeId(e.target.value)}
                            value={employeeId}
                        >
                            <option value="">Colaborador: Todos</option>
                            {filterEmployees.map((e) => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                        <select
                            className="rounded-md border border-slate-100 bg-[#f8faff] px-2 py-2 text-[10px] text-slate-700 outline-none"
                            onChange={(e) => setLeaveTypeId(e.target.value)}
                            value={leaveTypeId}
                        >
                            <option value="">Tipo de Permiso: Todos</option>
                            {filterLeaveTypes.map((t) => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                        </select>
                        <div>
                            <label className="block text-[9px] font-medium text-slate-500" htmlFor="leave-period-start">Período desde</label>
                            <input
                                aria-label="Filtrar solicitudes desde esta fecha"
                                aria-invalid={Boolean(errors.fecha_desde)}
                                className="w-full rounded-md border border-slate-100 bg-[#f8faff] px-2 py-2 text-[10px] text-slate-700 outline-none"
                                id="leave-period-start"
                                onChange={(e) => setPeriodStart(e.target.value)}
                                type="date"
                                value={periodStart}
                            />
                            {errors.fecha_desde && <p className="text-[9px] text-red-600" role="alert">{errors.fecha_desde}</p>}
                        </div>
                        <div>
                            <label className="block text-[9px] font-medium text-slate-500" htmlFor="leave-period-end">Período hasta</label>
                            <input
                                aria-label="Filtrar solicitudes hasta esta fecha"
                                aria-invalid={Boolean(errors.fecha_hasta)}
                                className="w-full rounded-md border border-slate-100 bg-[#f8faff] px-2 py-2 text-[10px] text-slate-700 outline-none"
                                id="leave-period-end"
                                onChange={(e) => setPeriodEnd(e.target.value)}
                                type="date"
                                value={periodEnd}
                            />
                            {errors.fecha_hasta && <p className="text-[9px] text-red-600" role="alert">{errors.fecha_hasta}</p>}
                        </div>
                        <div className="flex gap-1">
                            <button
                                className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-[#eaf1fa] px-3 text-[10px] font-medium text-[#52789f] hover:bg-[#dce8f6]"
                                type="submit"
                            >
                                <Icon className="h-3.5 w-3.5" name="filter" />
                                Filtrar
                            </button>
                            {(filters.estado || filters.departamento_id || filters.employee_id || filters.leave_type_id || filters.fecha_desde || filters.fecha_hasta) && (
                                <button
                                    className="rounded-md px-2 text-[10px] text-slate-500 hover:bg-slate-100"
                                    onClick={clearFilter}
                                    type="button"
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </form>

                    {requests.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead className="bg-[#f3f6fb]">
                                    <tr>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Radicado</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Colaborador</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Tipo de Ausencia</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Período Solicitado</th>
                                        <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Días</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Aprobación / Observaciones</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Soporte / Historial</th>
                                        <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {requests.data.map((req) => (
                                        <tr className="hover:bg-[#f7faff]" key={req.id}>
                                            <td className="px-3 py-3 font-mono text-[10px] font-bold text-slate-700">#SOL-{req.id}</td>
                                            <td className="px-3 py-3">
                                                <span className="block text-[10px] font-semibold text-slate-800">{req.employee?.user?.name}</span>
                                                <span className="block text-[8px] text-slate-500">
                                                    {req.employee?.tipo_documento} {req.employee?.numero_documento}
                                                </span>
                                                <span className="block text-[8px] text-slate-400">
                                                    {req.employee?.department?.nombre} · {req.employee?.position?.nombre}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="block text-[10px] font-medium text-slate-800">{req.leave_type?.nombre}</span>
                                                <span className="block max-w-xs truncate text-[8px] text-slate-500" title={req.motivo}>
                                                    Motivo: {req.motivo}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-[10px] text-slate-700">
                                                {req.fecha_inicio} al {req.fecha_fin}
                                            </td>
                                            <td className="px-3 py-3 text-center font-bold text-[10px] text-slate-800">
                                                {req.dias_solicitados}
                                            </td>
                                            <td className="px-3 py-3"><StatusBadge status={req.estado} /></td>
                                            <td className="px-3 py-3 text-[9px]">
                                                {req.reviewer ? (
                                                    <div>
                                                        <span className="font-semibold text-slate-700">{req.reviewer?.name}</span>
                                                        <p className="max-w-xs truncate text-slate-500" title={req.observaciones_respuesta}>
                                                            {req.observaciones_respuesta}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="italic text-slate-400">Pendiente de revisión</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-[9px] text-slate-600">
                                                {req.support_download_url ? (
                                                    <a className="font-medium text-blue-700 underline" href={req.support_download_url}>
                                                        {req.support_original_name ?? 'Descargar soporte'}
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400">Sin soporte</span>
                                                )}
                                                <ul className="mt-1 space-y-0.5 text-[8px] text-slate-400">
                                                    {req.decisions?.map((decision) => (
                                                        <li key={decision.id}>
                                                            {decision.action} · {decision.actor_name} · {decision.decided_at}
                                                            {decision.observations && <span className="block break-words text-slate-500">{decision.observations}</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                {canManage && req.estado === 'Pendiente' && (
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            className="rounded bg-emerald-600 px-2 py-1 text-[9px] font-semibold text-white hover:bg-emerald-700"
                                                            onClick={() => openApprove(req)}
                                                            type="button"
                                                        >
                                                            Aprobar
                                                        </button>
                                                        <button
                                                            className="rounded bg-red-600 px-2 py-1 text-[9px] font-semibold text-white hover:bg-red-700"
                                                            onClick={() => openReject(req)}
                                                            type="button"
                                                        >
                                                            Rechazar
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8">
                            <EmptyState
                                compact
                                description="No se encontraron solicitudes registradas con los filtros seleccionados."
                                icon="calendar"
                                title="Sin solicitudes"
                            />
                        </div>
                    )}

                    {requests.last_page > 1 && (
                        <nav aria-label="Paginación de solicitudes" className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[9px]">
                            <span className="text-slate-500">Mostrando {requests.from}–{requests.to} de {requests.total}</span>
                            <div className="flex gap-1">
                                {previousPage?.url && (
                                    <button className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100" onClick={() => router.get(previousPage.url)}>Anterior</button>
                                )}
                                {pageLinks.map((p, idx) => p.url ? (
                                    <button
                                        className={`rounded px-2 py-1 ${p.active ? 'bg-[#17243a] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                        key={idx}
                                        onClick={() => router.get(p.url)}
                                    >
                                        {p.label}
                                    </button>
                                ) : null)}
                                {nextPage?.url && (
                                    <button className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100" onClick={() => router.get(nextPage.url)}>Siguiente</button>
                                )}
                            </div>
                        </nav>
                    )}
                </section>
            </div>

            {/* Modal Radicar Solicitud (TH) */}
            {createModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold text-slate-900">Radicar Solicitud de Ausencia</h2>
                            <button className="text-slate-400 hover:text-slate-600" onClick={() => setCreateModal(false)} type="button">
                                <Icon className="h-4 w-4" name="close" />
                            </button>
                        </div>

                        <form className="mt-3 space-y-3" onSubmit={handleCreateSubmit}>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Colaborador *</label>
                                <select
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                    onChange={(e) => createForm.setData('employee_id', e.target.value)}
                                    required
                                    value={createForm.data.employee_id}
                                >
                                    <option value="">-- Seleccionar colaborador --</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                                {createForm.errors.employee_id && <p className="mt-0.5 text-[9px] text-red-600">{createForm.errors.employee_id}</p>}
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Tipo de Permiso / Vacaciones *</label>
                                <select
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                    onChange={(e) => {
                                        createForm.setData('leave_type_id', e.target.value);
                                        createForm.setData('support_file', null);
                                    }}
                                    required
                                    value={createForm.data.leave_type_id}
                                >
                                    <option value="">-- Seleccionar tipo --</option>
                                    {leaveTypes.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.nombre} {t.descuenta_vacaciones ? '(Descuenta vacaciones)' : ''} {t.requires_attachment ? '(Soporte obligatorio)' : ''}
                                        </option>
                                    ))}
                                </select>
                                {createForm.errors.leave_type_id && <p className="mt-0.5 text-[9px] text-red-600">{createForm.errors.leave_type_id}</p>}
                            </div>

                            {selectedLeaveType?.requires_attachment && (
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">
                                        Soporte documental * (PDF, JPG o PNG; máximo 10 MB)
                                    </label>
                                    <input
                                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                        className="mt-1 block w-full text-xs text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-[10px]"
                                        onChange={(event) => createForm.setData('support_file', event.target.files?.[0] ?? null)}
                                        required
                                        type="file"
                                    />
                                    {createForm.errors.support_file && <p className="mt-0.5 text-[9px] text-red-600">{createForm.errors.support_file}</p>}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Fecha de Inicio *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => createForm.setData('fecha_inicio', e.target.value)}
                                        required
                                        type="date"
                                        value={createForm.data.fecha_inicio}
                                    />
                                    {createForm.errors.fecha_inicio && <p className="mt-0.5 text-[9px] text-red-600">{createForm.errors.fecha_inicio}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Fecha de Fin *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => createForm.setData('fecha_fin', e.target.value)}
                                        required
                                        type="date"
                                        value={createForm.data.fecha_fin}
                                    />
                                    {createForm.errors.fecha_fin && <p className="mt-0.5 text-[9px] text-red-600">{createForm.errors.fecha_fin}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Motivo / Justificación *</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                    onChange={(e) => createForm.setData('motivo', e.target.value)}
                                    placeholder="Detalle o soporte de la solicitud..."
                                    required
                                    rows={3}
                                    value={createForm.data.motivo}
                                />
                                {createForm.errors.motivo && <p className="mt-0.5 text-[9px] text-red-600">{createForm.errors.motivo}</p>}
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600" onClick={() => setCreateModal(false)} type="button">Cancelar</button>
                                <button className="rounded-md bg-[#07152b] px-3.5 py-1.5 text-xs font-semibold text-white" disabled={createForm.processing} type="submit">Radicar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {approveModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div aria-labelledby="approve-leave-title" aria-modal="true" className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" role="dialog">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold text-emerald-700" id="approve-leave-title">Aprobar Solicitud</h2>
                            <button
                                aria-label="Cerrar aprobación"
                                className="text-slate-400 hover:text-slate-600"
                                onClick={() => setApproveModal({ open: false, request: null })}
                                type="button"
                            >
                                <Icon className="h-4 w-4" name="close" />
                            </button>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-600">
                            Confirmas la aprobación para <span className="font-semibold">{approveModal.request?.employee?.user?.name}</span>.
                        </p>

                        <form className="mt-3 space-y-3" onSubmit={handleApproveSubmit}>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700" htmlFor="approval-observations">
                                    Observaciones (opcional)
                                </label>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500"
                                    id="approval-observations"
                                    maxLength={500}
                                    onChange={(e) => approveForm.setData('observaciones_respuesta', e.target.value)}
                                    placeholder="Registra una observación para el historial..."
                                    rows={3}
                                    value={approveForm.data.observaciones_respuesta}
                                />
                                {approveForm.errors.observaciones_respuesta && (
                                    <p className="mt-0.5 text-[9px] text-red-600">{approveForm.errors.observaciones_respuesta}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button
                                    className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
                                    onClick={() => setApproveModal({ open: false, request: null })}
                                    type="button"
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                                    disabled={approveForm.processing}
                                    type="submit"
                                >
                                    {approveForm.processing ? 'Aprobando…' : 'Confirmar aprobación'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Rechazar Solicitud */}
            {rejectModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold text-red-700">Rechazar Solicitud</h2>
                            <button className="text-slate-400 hover:text-slate-600" onClick={() => setRejectModal({ open: false, request: null })} type="button">
                                <Icon className="h-4 w-4" name="close" />
                            </button>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-600">
                            Indica el motivo del rechazo para la solicitud de <span className="font-semibold">{rejectModal.request?.employee?.user?.name}</span>. Quedará guardado en el expediente.
                        </p>

                        <form className="mt-3 space-y-3" onSubmit={handleRejectSubmit}>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Motivo del Rechazo *</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-red-500"
                                    onChange={(e) => rejectForm.setData('observaciones_respuesta', e.target.value)}
                                    placeholder="Razón del rechazo (ej: coincidencia con cierre operativo, falta de soporte)..."
                                    required
                                    rows={3}
                                    value={rejectForm.data.observaciones_respuesta}
                                />
                                {rejectForm.errors.observaciones_respuesta && (
                                    <p className="mt-0.5 text-[9px] text-red-600">{rejectForm.errors.observaciones_respuesta}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600" onClick={() => setRejectModal({ open: false, request: null })} type="button">Cancelar</button>
                                <button className="rounded-md bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700" disabled={rejectForm.processing} type="submit">Confirmar Rechazo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
