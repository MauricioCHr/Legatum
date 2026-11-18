import { useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import EmptyState from '../../Components/EmptyState';
import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

function StatusBadge({ status }) {
    const map = {
        Presente: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Retardo: 'bg-amber-50 text-amber-700 border-amber-200',
        'Ausencia Injustificada': 'bg-red-50 text-red-700 border-red-200',
        'Permiso Remunerado': 'bg-blue-50 text-blue-700 border-blue-200',
        'Permiso No Remunerado': 'bg-orange-50 text-orange-700 border-orange-200',
        Incapacidad: 'bg-purple-50 text-purple-700 border-purple-200',
        Vacaciones: 'bg-teal-50 text-teal-700 border-teal-200',
    };
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {status}
        </span>
    );
}

export default function Index({
    attendances,
    summary,
    departments,
    employees,
    filters,
    canManage,
    today,
    flash,
}) {
    const [employeeId, setEmployeeId] = useState(filters.employee_id ?? '');
    const [departmentId, setDepartmentId] = useState(filters.departamento_id ?? '');
    const [status, setStatus] = useState(filters.estado ?? '');
    const [startDate, setStartDate] = useState(filters.fecha_inicio ?? '');
    const [endDate, setEndDate] = useState(filters.fecha_fin ?? '');

    // Modals
    const [createModal, setCreateModal] = useState(false);
    const [editModal, setEditModal] = useState({ open: false, item: null });

    const createForm = useForm({
        employee_id: '',
        fecha: today,
        hora_entrada: '08:00',
        hora_salida: '17:00',
        estado: 'Presente',
        minutos_retardo: 0,
        horas_extra: 0,
        observaciones: '',
    });

    const editForm = useForm({
        hora_entrada: '',
        hora_salida: '',
        estado: 'Presente',
        minutos_retardo: 0,
        horas_extra: 0,
        justificacion_correccion: '',
        observaciones: '',
    });

    function openEdit(item) {
        setEditModal({ open: true, item });
        editForm.clearErrors();
        editForm.setData({
            hora_entrada: item.hora_entrada ? item.hora_entrada.slice(0, 5) : '',
            hora_salida: item.hora_salida ? item.hora_salida.slice(0, 5) : '',
            estado: item.estado,
            minutos_retardo: item.minutos_retardo ?? 0,
            horas_extra: item.horas_extra ?? 0,
            justificacion_correccion: '',
            observaciones: item.observaciones ?? '',
        });
    }

    function handleCreateSubmit(e) {
        e.preventDefault();
        createForm.post('/asistencia', {
            onSuccess: () => {
                setCreateModal(false);
                createForm.reset();
            },
        });
    }

    function handleEditSubmit(e) {
        e.preventDefault();
        editForm.put(`/asistencia/${editModal.item.id}`, {
            onSuccess: () => setEditModal({ open: false, item: null }),
        });
    }

    function handleFilter(e) {
        e.preventDefault();
        router.get('/asistencia', {
            employee_id: employeeId,
            departamento_id: departmentId,
            estado: status,
            fecha_inicio: startDate,
            fecha_fin: endDate,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function clearFilter() {
        setEmployeeId('');
        setDepartmentId('');
        setStatus('');
        setStartDate('');
        setEndDate('');
        router.get('/asistencia');
    }

    const previousPage = attendances.links[0];
    const nextPage = attendances.links[attendances.links.length - 1];
    const pageLinks = attendances.links.slice(1, -1);
    const originLabel = (origin) => ({
        publico: 'Público',
        autenticado: 'Interno',
        manual: 'Manual',
        corregido: 'Corregido',
    }[origin] ?? 'Histórico');
    const correctionSummary = (values) => [
        `Entrada: ${values.hora_entrada ?? '—'}`,
        `Salida: ${values.hora_salida ?? '—'}`,
        `Estado: ${values.estado ?? '—'}`,
    ].join(' · ');

    return (
        <AuthenticatedLayout title="Asistencia">
            <div className="space-y-4">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#547da6]">
                            <span className="rounded bg-[#eaf1fa] px-1.5 py-0.5">Control Horario &amp; Jornada</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">Comercializadora Andina S.A.S.</span>
                        </p>
                        <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[25px]">
                            Registro de Asistencia y Novedades de Jornada
                        </h1>
                        <p className="mt-1 text-[10px] text-slate-500">
                            Seguimiento de entradas, salidas, retardos, horas extra y ausentismo laboral.
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
                            Registrar Marcación / Novedad
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

                {/* Metrics Summary */}
                <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Puntuales / Presentes</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-xl font-bold text-emerald-700">{summary.presentes}</span>
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">A tiempo</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Retardos</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-xl font-bold text-amber-600">{summary.retardos}</span>
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">Con demora</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Ausencias Injustificadas</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-xl font-bold text-red-600">{summary.ausencias}</span>
                            <span className="rounded bg-red-50 px-1.5 py-0.5 text-[8px] font-bold text-red-700">Faltas</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Permisos / Incapacidades</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-xl font-bold text-blue-600">{summary.permisos_incapacidades}</span>
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[8px] font-bold text-blue-700">Justificadas</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Total Horas Extra</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-xl font-bold text-[#547da6]">{summary.total_horas_extra}h</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-600">Acumulado</span>
                        </div>
                    </div>
                </section>

                {/* Filters & Table */}
                <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                    <form
                        className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-[minmax(140px,1fr)_minmax(130px,1fr)_minmax(120px,0.8fr)_minmax(110px,0.8fr)_minmax(110px,0.8fr)_auto] sm:items-center"
                        onSubmit={handleFilter}
                    >
                        <select
                            className="rounded-md border border-slate-100 bg-[#f8faff] px-2 py-2 text-[10px] text-slate-700 outline-none"
                            onChange={(e) => setEmployeeId(e.target.value)}
                            value={employeeId}
                        >
                            <option value="">Colaborador: Todos</option>
                            {employees.map((e) => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
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
                            onChange={(e) => setStatus(e.target.value)}
                            value={status}
                        >
                            <option value="">Estado: Todos</option>
                            <option value="Presente">Presente</option>
                            <option value="Retardo">Retardo</option>
                            <option value="Ausencia Injustificada">Ausencia Injustificada</option>
                            <option value="Permiso Remunerado">Permiso Remunerado</option>
                            <option value="Permiso No Remunerado">Permiso No Remunerado</option>
                            <option value="Incapacidad">Incapacidad</option>
                            <option value="Vacaciones">Vacaciones</option>
                        </select>
                        <input
                            className="rounded-md border border-slate-100 bg-[#f8faff] px-2 py-1.5 text-[10px] text-slate-700 outline-none"
                            onChange={(e) => setStartDate(e.target.value)}
                            title="Fecha Inicio"
                            type="date"
                            value={startDate}
                        />
                        <input
                            className="rounded-md border border-slate-100 bg-[#f8faff] px-2 py-1.5 text-[10px] text-slate-700 outline-none"
                            onChange={(e) => setEndDate(e.target.value)}
                            title="Fecha Fin"
                            type="date"
                            value={endDate}
                        />
                        <div className="flex gap-1">
                            <button
                                className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-[#eaf1fa] px-3 text-[10px] font-medium text-[#52789f] hover:bg-[#dce8f6]"
                                type="submit"
                            >
                                <Icon className="h-3.5 w-3.5" name="filter" />
                                Filtrar
                            </button>
                            {(filters.employee_id || filters.departamento_id || filters.estado || filters.fecha_inicio || filters.fecha_fin) && (
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

                    {attendances.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead className="bg-[#f3f6fb]">
                                    <tr>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Fecha</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Colaborador</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Entrada</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Salida</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Incidencia / observación</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Origen</th>
                                        <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Retardo</th>
                                        <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Horas Extra</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Historial / Corrección</th>
                                        <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {attendances.data.map((att) => (
                                        <tr className="hover:bg-[#f7faff]" key={att.id}>
                                            <td className="px-3 py-3 font-semibold text-[10px] text-slate-800">{att.fecha}</td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17243a] text-[8px] font-semibold text-white">
                                                        {att.employee?.user?.name?.slice(0, 1)}
                                                    </span>
                                                    <div>
                                                        <span className="block text-[10px] font-semibold text-slate-800">{att.employee?.user?.name}</span>
                                                        <span className="block text-[8px] text-slate-400">
                                                            {att.employee?.department?.nombre} · {att.employee?.position?.nombre}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 font-mono text-[10px] text-slate-700">{att.hora_entrada ?? '—'}</td>
                                            <td className="px-3 py-3 font-mono text-[10px] text-slate-700">{att.hora_salida ?? '—'}</td>
                                            <td className="px-3 py-3"><StatusBadge status={att.estado} /></td>
                                            <td className="max-w-48 px-3 py-3 text-[9px] text-slate-600" title={att.observaciones ?? undefined}>
                                                {att.observaciones ?? '—'}
                                            </td>
                                            <td className="px-3 py-3 text-[9px] text-slate-600">
                                                <span className="block">Entrada: {originLabel(att.origen_entrada)}</span>
                                                <span className="block">Salida: {originLabel(att.origen_salida)}</span>
                                            </td>
                                            <td className="px-3 py-3 text-center text-[10px]">
                                                {att.minutos_retardo > 0 ? (
                                                    <span className="font-semibold text-amber-600">{att.minutos_retardo} min</span>
                                                ) : (
                                                    <span className="text-slate-400">0</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center text-[10px]">
                                                {Number(att.horas_extra) > 0 ? (
                                                    <span className="font-bold text-[#547da6]">{att.horas_extra}h</span>
                                                ) : (
                                                    <span className="text-slate-400">0</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                {att.corrections?.length > 0 ? (
                                                    <details className="max-w-xs">
                                                        <summary className="cursor-pointer text-[9px] font-semibold text-[#547da6]">
                                                            Ver historial ({att.corrections.length})
                                                        </summary>
                                                        <ul className="mt-2 space-y-2">
                                                            {att.corrections.map((correction) => (
                                                                <li className="rounded border border-slate-200 p-2 text-[8px] text-slate-600" key={correction.id}>
                                                                    <p className="font-semibold text-slate-800">
                                                                        {correction.actor_name} · {correction.corrected_at}
                                                                    </p>
                                                                    <p className="mt-1">Antes: {correctionSummary(correction.original_values)}</p>
                                                                    <p>Después: {correctionSummary(correction.corrected_values)}</p>
                                                                    <p className="mt-1">Motivo: {correction.reason}</p>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </details>
                                                ) : att.corregido_por ? (
                                                    <div>
                                                        <span className="rounded bg-amber-50 px-1 py-0.5 text-[8px] font-semibold text-amber-700">
                                                            Corregido por {att.corrected_by?.name}
                                                        </span>
                                                        <p className="mt-0.5 max-w-xs truncate text-[8px] text-slate-500" title={att.justificacion_correccion}>
                                                            Motivo: {att.justificacion_correccion}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-[8px] text-slate-400">Registro original</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                {canManage && (
                                                    <button
                                                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#547da6]"
                                                        onClick={() => openEdit(att)}
                                                        title="Corregir registro con justificación"
                                                        type="button"
                                                    >
                                                        <Icon className="h-3.5 w-3.5" name="edit" />
                                                    </button>
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
                                description="No se encontraron registros de asistencia para los filtros y fechas seleccionadas."
                                icon="clock"
                                title="Sin registros de asistencia"
                            />
                        </div>
                    )}

                    {attendances.last_page > 1 && (
                        <nav aria-label="Paginación de asistencia" className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[9px]">
                            <span className="text-slate-500">Mostrando {attendances.from}–{attendances.to} de {attendances.total}</span>
                            <div className="flex gap-1">
                                {previousPage?.url && (
                                    <Link className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100" href={previousPage.url}>Anterior</Link>
                                )}
                                {pageLinks.map((p, idx) => p.url ? (
                                    <Link
                                        className={`rounded px-2 py-1 ${p.active ? 'bg-[#17243a] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                        href={p.url}
                                        key={idx}
                                    >
                                        {p.label}
                                    </Link>
                                ) : null)}
                                {nextPage?.url && (
                                    <Link className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100" href={nextPage.url}>Siguiente</Link>
                                )}
                            </div>
                        </nav>
                    )}
                </section>
            </div>

            {/* Modal Crear Registro */}
            {createModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold text-slate-900">Registrar Asistencia / Incidencia</h2>
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
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Fecha *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => createForm.setData('fecha', e.target.value)}
                                        required
                                        type="date"
                                        value={createForm.data.fecha}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Estado *</label>
                                    <select
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => createForm.setData('estado', e.target.value)}
                                        value={createForm.data.estado}
                                    >
                                        <option value="Presente">Presente</option>
                                        <option value="Retardo">Retardo</option>
                                        <option value="Ausencia Injustificada">Ausencia Injustificada</option>
                                        <option value="Permiso Remunerado">Permiso Remunerado</option>
                                        <option value="Permiso No Remunerado">Permiso No Remunerado</option>
                                        <option value="Incapacidad">Incapacidad</option>
                                        <option value="Vacaciones">Vacaciones</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Hora de Entrada</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => createForm.setData('hora_entrada', e.target.value)}
                                        type="time"
                                        value={createForm.data.hora_entrada}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Hora de Salida</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => createForm.setData('hora_salida', e.target.value)}
                                        type="time"
                                        value={createForm.data.hora_salida}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Minutos Retardo</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        min="0"
                                        onChange={(e) => createForm.setData('minutos_retardo', parseInt(e.target.value) || 0)}
                                        type="number"
                                        value={createForm.data.minutos_retardo}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Horas Extra</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        min="0"
                                        onChange={(e) => createForm.setData('horas_extra', parseFloat(e.target.value) || 0)}
                                        step="0.5"
                                        type="number"
                                        value={createForm.data.horas_extra}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Observaciones</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                    onChange={(e) => createForm.setData('observaciones', e.target.value)}
                                    rows={2}
                                    value={createForm.data.observaciones}
                                />
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600" onClick={() => setCreateModal(false)} type="button">Cancelar</button>
                                <button className="rounded-md bg-[#07152b] px-3.5 py-1.5 text-xs font-semibold text-white" disabled={createForm.processing} type="submit">Guardar Registro</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Corregir Registro con Justificación */}
            {editModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold text-slate-900">
                                Corregir Asistencia — {editModal.item?.employee?.user?.name}
                            </h2>
                            <button className="text-slate-400 hover:text-slate-600" onClick={() => setEditModal({ open: false, item: null })} type="button">
                                <Icon className="h-4 w-4" name="close" />
                            </button>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">
                            Fecha de jornada: <span className="font-semibold text-slate-800">{editModal.item?.fecha}</span>. Toda modificación queda auditada con justificación obligatoria.
                        </p>

                        <form className="mt-3 space-y-3" onSubmit={handleEditSubmit}>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Hora Entrada</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => editForm.setData('hora_entrada', e.target.value)}
                                        type="time"
                                        value={editForm.data.hora_entrada}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Hora Salida</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => editForm.setData('hora_salida', e.target.value)}
                                        type="time"
                                        value={editForm.data.hora_salida}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-semibold text-slate-700">Estado</label>
                                    <select
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none"
                                        onChange={(e) => editForm.setData('estado', e.target.value)}
                                        value={editForm.data.estado}
                                    >
                                        <option value="Presente">Presente</option>
                                        <option value="Retardo">Retardo</option>
                                        <option value="Ausencia Injustificada">Ausencia Injustificada</option>
                                        <option value="Permiso Remunerado">Permiso Remunerado</option>
                                        <option value="Permiso No Remunerado">Permiso No Remunerado</option>
                                        <option value="Incapacidad">Incapacidad</option>
                                        <option value="Vacaciones">Vacaciones</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Min. Retardo</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none"
                                        min="0"
                                        onChange={(e) => editForm.setData('minutos_retardo', parseInt(e.target.value) || 0)}
                                        type="number"
                                        value={editForm.data.minutos_retardo}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Horas Extra</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none"
                                        min="0"
                                        onChange={(e) => editForm.setData('horas_extra', parseFloat(e.target.value) || 0)}
                                        step="0.5"
                                        type="number"
                                        value={editForm.data.horas_extra}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-amber-900">
                                    Justificación de la corrección * (Obligatoria)
                                </label>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-amber-300 bg-amber-50/40 px-2.5 py-1.5 text-xs outline-none focus:border-amber-500"
                                    onChange={(e) => editForm.setData('justificacion_correccion', e.target.value)}
                                    placeholder="Indica el motivo de la corrección (ej: olvido de marcación en biométrico, justificado por jefe inmediato)..."
                                    required
                                    rows={3}
                                    value={editForm.data.justificacion_correccion}
                                />
                                {editForm.errors.justificacion_correccion && (
                                    <p className="mt-0.5 text-[9px] text-red-600">{editForm.errors.justificacion_correccion}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600" onClick={() => setEditModal({ open: false, item: null })} type="button">Cancelar</button>
                                <button className="rounded-md bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700" disabled={editForm.processing} type="submit">Guardar Corrección Auditada</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
