import { useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import EmptyState from '../../Components/EmptyState';
import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function Index({
    novelties,
    periods,
    currentPeriod,
    summary,
    noveltyTypes,
    employees,
    filters,
    canManage,
    flash,
}) {
    const [periodId, setPeriodId] = useState(filters.period_id ?? '');
    const [employeeId, setEmployeeId] = useState(filters.employee_id ?? '');
    const [typeId, setTypeId] = useState(filters.type_id ?? '');
    const [status, setStatus] = useState(filters.estado ?? '');

    // Modals
    const [createModal, setCreateModal] = useState(false);
    const [annulModal, setAnnulModal] = useState({ open: false, novelty: null });

    const createForm = useForm({
        employee_id: '',
        payroll_period_id: currentPeriod?.id ? String(currentPeriod.id) : '',
        payroll_novelty_type_id: '',
        valor: '',
        cantidad: '',
        descripcion: '',
    });

    const annulForm = useForm({
        motivo_anulacion: '',
    });

    function handleCreateSubmit(e) {
        e.preventDefault();
        createForm.post('/nomina/novedades', {
            onSuccess: () => {
                setCreateModal(false);
                createForm.reset();
            },
        });
    }

    function handleAnnulSubmit(e) {
        e.preventDefault();
        annulForm.patch(`/nomina/novedades/${annulModal.novelty.id}/anular`, {
            onSuccess: () => setAnnulModal({ open: false, novelty: null }),
        });
    }

    function handleFilter(e) {
        e.preventDefault();
        router.get('/nomina/novedades', {
            period_id: periodId,
            employee_id: employeeId,
            type_id: typeId,
            estado: status,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function clearFilter() {
        setPeriodId('');
        setEmployeeId('');
        setTypeId('');
        setStatus('');
        router.get('/nomina/novedades');
    }

    const previousPage = novelties.links[0];
    const nextPage = novelties.links[novelties.links.length - 1];
    const pageLinks = novelties.links.slice(1, -1);

    return (
        <AuthenticatedLayout title="Novedades de Nómina">
            <div className="space-y-4">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#547da6]">
                            <span className="rounded bg-[#eaf1fa] px-1.5 py-0.5">Gestión de Novedades</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">Comercializadora Andina S.A.S.</span>
                        </p>
                        <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[25px]">
                            Registro y Control de Novedades de Nómina
                        </h1>
                        <p className="mt-1 text-[10px] text-slate-500">
                            Registro de horas extra, bonificaciones, incapacidades, retardos y deducciones para procesamiento de nómina.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Link
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                            href="/nomina/periodos"
                        >
                            <Icon className="h-3.5 w-3.5" name="layers" />
                            Consolidado por Período
                        </Link>
                        {canManage && (
                            <button
                                className="inline-flex items-center gap-1.5 rounded-md bg-[#07152b] px-3.5 py-2 text-[10px] font-semibold text-white shadow-sm transition hover:bg-[#1a3150]"
                                onClick={() => {
                                    createForm.reset();
                                    createForm.setData({
                                        employee_id: '',
                                        payroll_period_id: currentPeriod?.id ? String(currentPeriod.id) : '',
                                        payroll_novelty_type_id: '',
                                        valor: '',
                                        cantidad: '',
                                        descripcion: '',
                                    });
                                    createForm.clearErrors();
                                    setCreateModal(true);
                                }}
                                type="button"
                            >
                                <Icon className="h-3.5 w-3.5" name="plus" />
                                Registrar Novedad
                            </button>
                        )}
                    </div>
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

                {/* Summary Metrics */}
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Total Devengos (Período)</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-xl font-bold text-emerald-700">
                                ${summary.total_devengos.toLocaleString('es-CO')}
                            </span>
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">+ Suma</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Total Deducciones (Período)</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-xl font-bold text-red-600">
                                ${summary.total_deducciones.toLocaleString('es-CO')}
                            </span>
                            <span className="rounded bg-red-50 px-1.5 py-0.5 text-[8px] font-bold text-red-700">- Resta</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Novedades Activas</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-xl font-bold text-slate-800">{summary.total_novedades}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-600">Registros</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Estado del Período</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-base font-bold text-slate-800">{currentPeriod?.nombre ?? 'General'}</span>
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                currentPeriod?.estado === 'Abierto' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                                {currentPeriod?.estado ?? '—'}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Filter and Table */}
                <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                    <form
                        className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-[minmax(140px,1.2fr)_minmax(140px,1fr)_minmax(130px,1fr)_minmax(110px,0.8fr)_auto] sm:items-center"
                        onSubmit={handleFilter}
                    >
                        <select
                            className="rounded-md border border-slate-100 bg-[#f8faff] px-2 py-2 text-[10px] text-slate-700 outline-none"
                            onChange={(e) => setPeriodId(e.target.value)}
                            value={periodId}
                        >
                            <option value="">Período: Todos</option>
                            {periods.map((p) => (
                                <option key={p.id} value={p.id}>{p.nombre} ({p.estado})</option>
                            ))}
                        </select>
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
                            onChange={(e) => setTypeId(e.target.value)}
                            value={typeId}
                        >
                            <option value="">Tipo de Concepto: Todos</option>
                            {noveltyTypes.map((t) => (
                                <option key={t.id} value={t.id}>{t.nombre} ({t.tipo})</option>
                            ))}
                        </select>
                        <select
                            className="rounded-md border border-slate-100 bg-[#f8faff] px-2 py-2 text-[10px] text-slate-700 outline-none"
                            onChange={(e) => setStatus(e.target.value)}
                            value={status}
                        >
                            <option value="">Estado: Todos</option>
                            <option value="Activa">Activa</option>
                            <option value="Anulada">Anulada</option>
                        </select>
                        <div className="flex gap-1">
                            <button
                                className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-[#eaf1fa] px-3 text-[10px] font-medium text-[#52789f] hover:bg-[#dce8f6]"
                                type="submit"
                            >
                                <Icon className="h-3.5 w-3.5" name="filter" />
                                Filtrar
                            </button>
                            {(filters.period_id || filters.employee_id || filters.type_id || filters.estado) && (
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

                    {novelties.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead className="bg-[#f3f6fb]">
                                    <tr>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Colaborador</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Concepto / Novedad</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Clasificación</th>
                                        <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Valor / Monto</th>
                                        <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Cantidad</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Período</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                        <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {novelties.data.map((nov) => (
                                        <tr className="hover:bg-[#f7faff]" key={nov.id}>
                                            <td className="px-3 py-3">
                                                <span className="block text-[10px] font-semibold text-slate-800">{nov.employee?.user?.name}</span>
                                                <span className="block text-[8px] text-slate-400">
                                                    {nov.employee?.department?.nombre} · {nov.employee?.position?.nombre}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="block text-[10px] font-medium text-slate-800">{nov.novelty_type?.nombre}</span>
                                                <span className="block max-w-xs truncate text-[8px] text-slate-500" title={nov.descripcion}>
                                                    {nov.descripcion}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                                                    nov.novelty_type?.tipo === 'Devengo' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                                }`}>
                                                    {nov.novelty_type?.tipo}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-right font-bold text-[10px] text-slate-900">
                                                {nov.valor !== null ? `$${Number(nov.valor).toLocaleString('es-CO')}` : '—'}
                                            </td>
                                            <td className="px-3 py-3 text-center text-[10px] text-slate-700">
                                                {nov.cantidad !== null ? `${nov.cantidad} ${nov.novelty_type?.unidad_medida}` : '—'}
                                            </td>
                                            <td className="px-3 py-3 text-[9px] text-slate-600">
                                                {nov.period?.nombre}
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                                                    nov.estado === 'Activa' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {nov.estado}
                                                </span>
                                                {nov.estado === 'Anulada' && (
                                                    <p className="mt-0.5 text-[8px] text-slate-400" title={nov.motivo_anulacion}>
                                                        {nov.motivo_anulacion}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                {canManage && nov.estado === 'Activa' && nov.period?.estado === 'Abierto' && (
                                                    <button
                                                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                                        onClick={() => {
                                                            setAnnulModal({ open: true, novelty: nov });
                                                            annulForm.clearErrors();
                                                            annulForm.setData({ motivo_anulacion: '' });
                                                        }}
                                                        title="Anular novedad antes del cierre"
                                                        type="button"
                                                    >
                                                        <Icon className="h-3.5 w-3.5" name="close" />
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
                                description="No se encontraron novedades de nómina para los criterios seleccionados."
                                icon="wallet"
                                title="Sin novedades de nómina"
                            />
                        </div>
                    )}
                </section>
            </div>

            {/* Modal Registrar Novedad */}
            {createModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold text-slate-900">Registrar Novedad de Nómina</h2>
                            <button className="text-slate-400 hover:text-slate-600" onClick={() => setCreateModal(false)} type="button">
                                <Icon className="h-4 w-4" name="close" />
                            </button>
                        </div>

                        <form className="mt-3 space-y-3" onSubmit={handleCreateSubmit}>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Período de Nómina *</label>
                                <select
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                    onChange={(e) => createForm.setData('payroll_period_id', e.target.value)}
                                    required
                                    value={createForm.data.payroll_period_id}
                                >
                                    <option value="">-- Seleccionar período --</option>
                                    {periods.filter((p) => p.estado === 'Abierto').map((p) => (
                                        <option key={p.id} value={p.id}>{p.nombre} (Abierto)</option>
                                    ))}
                                </select>
                            </div>

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

                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Tipo de Novedad *</label>
                                <select
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                    onChange={(e) => createForm.setData('payroll_novelty_type_id', e.target.value)}
                                    required
                                    value={createForm.data.payroll_novelty_type_id}
                                >
                                    <option value="">-- Seleccionar concepto --</option>
                                    {noveltyTypes.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.nombre} [{t.tipo}] ({t.unidad_medida})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Valor en Pesos ($)</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        min="0"
                                        onChange={(e) => createForm.setData('valor', e.target.value)}
                                        placeholder="Ej: 150000"
                                        step="1000"
                                        type="number"
                                        value={createForm.data.valor}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Cantidad (Horas/Días)</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        min="0"
                                        onChange={(e) => createForm.setData('cantidad', e.target.value)}
                                        placeholder="Ej: 4.5"
                                        step="0.5"
                                        type="number"
                                        value={createForm.data.cantidad}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Descripción o Justificación *</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                    onChange={(e) => createForm.setData('descripcion', e.target.value)}
                                    placeholder="Indica el soporte o detalle de la novedad..."
                                    required
                                    rows={2}
                                    value={createForm.data.descripcion}
                                />
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600" onClick={() => setCreateModal(false)} type="button">Cancelar</button>
                                <button className="rounded-md bg-[#07152b] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1a3150]" disabled={createForm.processing} type="submit">Guardar Novedad</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Anular Novedad */}
            {annulModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold text-red-700">Anular Novedad de Nómina</h2>
                            <button className="text-slate-400 hover:text-slate-600" onClick={() => setAnnulModal({ open: false, novelty: null })} type="button">
                                <Icon className="h-4 w-4" name="close" />
                            </button>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-600">
                            Estás anulando la novedad <span className="font-semibold">{annulModal.novelty?.novelty_type?.nombre}</span> de <span className="font-semibold">{annulModal.novelty?.employee?.user?.name}</span>.
                        </p>

                        <form className="mt-3 space-y-3" onSubmit={handleAnnulSubmit}>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Motivo de Anulación *</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-red-500"
                                    onChange={(e) => annulForm.setData('motivo_anulacion', e.target.value)}
                                    placeholder="Indica la razón de anulación..."
                                    required
                                    rows={3}
                                    value={annulForm.data.motivo_anulacion}
                                />
                                {annulForm.errors.motivo_anulacion && (
                                    <p className="mt-0.5 text-[9px] text-red-600">{annulForm.errors.motivo_anulacion}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600" onClick={() => setAnnulModal({ open: false, novelty: null })} type="button">Cancelar</button>
                                <button className="rounded-md bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700" disabled={annulForm.processing} type="submit">Confirmar Anulación</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
