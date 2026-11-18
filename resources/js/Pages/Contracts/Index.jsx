import { useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import EmptyState from '../../Components/EmptyState';
import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

function StatusBadge({ status }) {
    const styles = {
        Vigente: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Vencido: 'bg-red-50 text-red-700 border-red-200',
        Renovado: 'bg-blue-50 text-blue-700 border-blue-200',
        Anulado: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {status}
        </span>
    );
}

export default function Index({
    contracts,
    expiringContracts,
    summary,
    candidateEmployees,
    contractTypes,
    filters,
    canManage,
    flash,
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.estado ?? '');
    const [contractTypeId, setContractTypeId] = useState(filters.contract_type_id ?? '');
    const [expiring, setExpiring] = useState(Boolean(filters.expiring));

    // Modals
    const [createModal, setCreateModal] = useState(false);
    const [renewModal, setRenewModal] = useState({ open: false, contract: null });
    const [annulModal, setAnnulModal] = useState({ open: false, contract: null });

    const createForm = useForm({
        employee_id: '',
        contract_type_id: '',
        salario: '',
        fecha_inicio: '',
        fecha_fin: '',
        estado: 'Vigente',
        observaciones: '',
    });

    const renewForm = useForm({
        contract_type_id: '',
        salario: '',
        fecha_inicio: '',
        fecha_fin: '',
        observaciones: '',
    });

    const annulForm = useForm({
        motivo_anulacion: '',
    });

    const selectedCreateType = contractTypes.find((type) => String(type.id) === String(createForm.data.contract_type_id));
    const selectedRenewType = contractTypes.find((type) => String(type.id) === String(renewForm.data.contract_type_id));

    function openRenew(contract) {
        setRenewModal({ open: true, contract });
        renewForm.clearErrors();
        renewForm.setData({
            contract_type_id: contract.contract_type_id,
            salario: contract.salario,
            fecha_inicio: contract.fecha_fin ? contract.fecha_fin : '',
            fecha_fin: '',
            observaciones: `Renovación de contrato ${contract.numero_contrato}`,
        });
    }

    function openAnnul(contract) {
        setAnnulModal({ open: true, contract });
        annulForm.clearErrors();
        annulForm.setData({ motivo_anulacion: '' });
    }

    function handleCreateSubmit(e) {
        e.preventDefault();
        createForm.post('/contratos', {
            onSuccess: () => {
                setCreateModal(false);
                createForm.reset();
            },
        });
    }

    function handleRenewSubmit(e) {
        e.preventDefault();
        renewForm.post(`/contratos/${renewModal.contract.id}/renovar`, {
            onSuccess: () => setRenewModal({ open: false, contract: null }),
        });
    }

    function handleAnnulSubmit(e) {
        e.preventDefault();
        annulForm.patch(`/contratos/${annulModal.contract.id}/anular`, {
            onSuccess: () => setAnnulModal({ open: false, contract: null }),
        });
    }

    function handleFilter(e) {
        e.preventDefault();
        router.get('/contratos', {
            search,
            estado: status,
            contract_type_id: contractTypeId,
            expiring: expiring ? '1' : '',
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function clearFilter() {
        setSearch('');
        setStatus('');
        setContractTypeId('');
        setExpiring(false);
        router.get('/contratos');
    }

    const previousPage = contracts.links[0];
    const nextPage = contracts.links[contracts.links.length - 1];
    const pageLinks = contracts.links.slice(1, -1);

    return (
        <AuthenticatedLayout title="Contratos">
            <div className="space-y-4">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#547da6]">
                            <span className="rounded bg-[#eaf1fa] px-1.5 py-0.5">Gestión Contractual</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">Comercializadora Andina S.A.S.</span>
                        </p>
                        <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[25px]">
                            Registro y Control de Contratos Laborales
                        </h1>
                        <p className="mt-1 text-[10px] text-slate-500">
                            Administración de vinculaciones, vigencias, renovaciones e historial laboral de colaboradores.
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
                            Nuevo Contrato
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
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Vigentes</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-slate-900">{summary.vigentes}</span>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Activos</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Próximos a Vencer (30 Días)</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-amber-600">{summary.proximos_a_vencer}</span>
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">Alerta</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Vencidos</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-red-600">{summary.vencidos}</span>
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700">Finalizados</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Anulados</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-slate-600">{summary.anulados}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">Histórico</span>
                        </div>
                    </div>
                </section>

                {/* Visual Alert Box for Expiring Contracts */}
                {expiringContracts.length > 0 && (
                    <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white">
                                <Icon className="h-3.5 w-3.5" name="alert" />
                            </span>
                            <h2 className="text-xs font-bold text-amber-900">
                                Alerta de Vencimiento de Contratos ({expiringContracts.length})
                            </h2>
                        </div>
                        <p className="mt-1 text-[10px] text-amber-800">
                            Los siguientes contratos a término fijo están próximos a vencer dentro de los próximos 30 días. Requieren preaviso o trámite de renovación:
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {expiringContracts.map((c) => (
                                <div className="rounded-lg border border-amber-200 bg-white p-2.5 shadow-xs" key={c.id}>
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-slate-800 text-[11px]">{c.employee_name}</span>
                                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                                            {c.dias_restantes === 0 ? 'Vence hoy' : `${c.dias_restantes} días restantes`}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-[9px] text-slate-500">
                                        Tipo: <span className="font-medium text-slate-700">{c.contract_type}</span> · Radicado: {c.numero_contrato}
                                    </p>
                                    <p className="text-[9px] text-slate-500">
                                        Vencimiento: <span className="font-medium text-slate-700">{c.fecha_vencimiento}</span>
                                    </p>
                                    <div className="mt-2 flex justify-end gap-1">
                                        <Link
                                            className="rounded bg-[#eaf1fa] px-2 py-0.5 text-[8px] font-semibold text-[#547da6] hover:bg-[#dce8f6]"
                                            href={`/contratos/${c.id}`}
                                        >
                                            Ver Ficha
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Filter and Table */}
                <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                    <form
                        className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-[minmax(180px,1.3fr)_minmax(130px,0.8fr)_minmax(150px,1fr)_auto_auto] sm:items-center"
                        onSubmit={handleFilter}
                    >
                        <label className="relative block">
                            <Icon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" name="search" />
                            <input
                                className="w-full rounded-md border border-slate-100 bg-[#f8faff] py-2 pl-8 pr-2 text-[10px] text-slate-800 outline-none"
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por colaborador o # contrato..."
                                type="search"
                                value={search}
                            />
                        </label>
                        <select
                            className="rounded-md border border-slate-100 bg-[#f8faff] px-2 py-2 text-[10px] text-slate-700 outline-none"
                            onChange={(e) => setStatus(e.target.value)}
                            value={status}
                        >
                            <option value="">Estado: Todos</option>
                            <option value="Vigente">Vigente</option>
                            <option value="Vencido">Vencido</option>
                            <option value="Renovado">Renovado</option>
                            <option value="Anulado">Anulado</option>
                        </select>
                        <select
                            className="rounded-md border border-slate-100 bg-[#f8faff] px-2 py-2 text-[10px] text-slate-700 outline-none"
                            onChange={(e) => setContractTypeId(e.target.value)}
                            value={contractTypeId}
                        >
                            <option value="">Tipo: Todos</option>
                            {contractTypes.map((t) => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                        </select>
                        <div className="flex items-center gap-1.5 px-2">
                            <input
                                checked={expiring}
                                className="h-3.5 w-3.5 rounded text-[#547da6]"
                                id="flt_expiring"
                                onChange={(e) => setExpiring(e.target.checked)}
                                type="checkbox"
                            />
                            <label className="text-[10px] text-slate-600 whitespace-nowrap" htmlFor="flt_expiring">
                                Solo por vencer
                            </label>
                        </div>
                        <div className="flex gap-1">
                            <button
                                className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-[#eaf1fa] px-3 text-[10px] font-medium text-[#52789f] hover:bg-[#dce8f6]"
                                type="submit"
                            >
                                <Icon className="h-3.5 w-3.5" name="filter" />
                                Filtrar
                            </button>
                            {(filters.search || filters.estado || filters.contract_type_id || filters.expiring) && (
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

                    {contracts.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead className="bg-[#f3f6fb]">
                                    <tr>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Radicado</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Colaborador</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Tipo de Contrato</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Salario</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Vigencia</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                        <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {contracts.data.map((c) => (
                                        <tr className="hover:bg-[#f7faff]" key={c.id}>
                                            <td className="px-3 py-3 font-mono text-[10px] font-bold text-slate-800">{c.numero_contrato}</td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#17243a] text-[8px] font-semibold text-white">
                                                        {c.employee?.user?.name?.slice(0, 1)}
                                                    </span>
                                                    <div>
                                                        <span className="block text-[10px] font-semibold text-slate-800">{c.employee?.user?.name}</span>
                                                        <span className="block text-[8px] text-slate-400">
                                                            {c.employee?.department?.nombre} · {c.employee?.position?.nombre}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-[10px] text-slate-700">{c.contract_type?.nombre}</td>
                                            <td className="px-3 py-3 font-semibold text-[10px] text-slate-900">
                                                ${Number(c.salario).toLocaleString('es-CO')}
                                            </td>
                                            <td className="px-3 py-3 text-[10px]">
                                                <span className="block text-slate-700">Inicio: {c.fecha_inicio}</span>
                                                <span className="block text-slate-500">
                                                    {c.fecha_fin ? `Fin: ${c.fecha_fin}` : 'Indefinido'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3"><StatusBadge status={c.estado} /></td>
                                            <td className="px-3 py-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Link
                                                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#426b95]"
                                                        href={`/contratos/${c.id}`}
                                                        title="Ver expediente contractual"
                                                    >
                                                        <Icon className="h-3.5 w-3.5" name="eye" />
                                                    </Link>

                                                    {canManage && c.estado === 'Vigente' && (
                                                        <>
                                                            <button
                                                                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-emerald-700"
                                                                onClick={() => openRenew(c)}
                                                                title="Renovar contrato"
                                                                type="button"
                                                            >
                                                                <Icon className="h-3.5 w-3.5" name="layers" />
                                                            </button>
                                                            <button
                                                                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-red-700"
                                                                onClick={() => openAnnul(c)}
                                                                title="Anular contrato"
                                                                type="button"
                                                            >
                                                                <Icon className="h-3.5 w-3.5" name="close" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
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
                                description="No se encontraron contratos registrados bajo los criterios seleccionados."
                                icon="file"
                                title="Sin contratos"
                            />
                        </div>
                    )}

                    {contracts.last_page > 1 && (
                        <nav aria-label="Paginación de contratos" className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[9px]">
                            <span className="text-slate-500">Mostrando {contracts.from}–{contracts.to} de {contracts.total}</span>
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

            {/* Modal: Crear Contrato */}
            {createModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold text-slate-900">Registrar Nuevo Contrato Laboral</h2>
                            <button className="text-slate-400 hover:text-slate-600" onClick={() => setCreateModal(false)} type="button">
                                <Icon className="h-4 w-4" name="close" />
                            </button>
                        </div>

                        <form className="mt-3 space-y-3" onSubmit={handleCreateSubmit}>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Colaborador *</label>
                                    <select
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => createForm.setData('employee_id', e.target.value)}
                                        required
                                        value={createForm.data.employee_id}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {candidateEmployees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.name}{emp.position ? ` — ${emp.position}` : ''}{emp.department ? ` · ${emp.department}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {createForm.errors.employee_id && <p className="mt-0.5 text-[9px] text-red-600">{createForm.errors.employee_id}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Tipo de Contrato *</label>
                                    <select
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => createForm.setData('contract_type_id', e.target.value)}
                                        required
                                        value={createForm.data.contract_type_id}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {contractTypes.map((t) => (
                                            <option key={t.id} value={t.id}>{t.nombre}</option>
                                        ))}
                                    </select>
                                    {renewForm.errors.contract_type_id && <p className="mt-0.5 text-[9px] text-red-600">{renewForm.errors.contract_type_id}</p>}
                                    {createForm.errors.contract_type_id && <p className="mt-0.5 text-[9px] text-red-600">{createForm.errors.contract_type_id}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Salario Básico Mensual ($) *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => createForm.setData('salario', e.target.value)}
                                        placeholder="Ej: 1600000"
                                        required
                                        step="1000"
                                        type="number"
                                        value={createForm.data.salario}
                                    />
                                    {createForm.errors.salario && <p className="mt-0.5 text-[9px] text-red-600">{createForm.errors.salario}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Estado Inicial</label>
                                    <select
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => createForm.setData('estado', e.target.value)}
                                        value={createForm.data.estado}
                                    >
                                        <option value="Vigente">Vigente</option>
                                        <option value="Vencido">Vencido</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
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
                                    <label className="block text-[10px] font-semibold text-slate-700">
                                        Fecha de Vencimiento (Fin){selectedCreateType?.requiere_fecha_fin ? ' *' : ''}
                                    </label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => createForm.setData('fecha_fin', e.target.value)}
                                        required={Boolean(selectedCreateType?.requiere_fecha_fin)}
                                        type="date"
                                        value={createForm.data.fecha_fin}
                                    />
                                    {!selectedCreateType?.requiere_fecha_fin && (
                                        <span className="text-[8px] text-slate-400">Dejar vacío para término indefinido</span>
                                    )}
                                    {createForm.errors.fecha_fin && <p className="mt-0.5 text-[9px] text-red-600">{createForm.errors.fecha_fin}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Observaciones o Cláusulas Especiales</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                    onChange={(e) => createForm.setData('observaciones', e.target.value)}
                                    placeholder="Jornada, periodo de prueba, etc..."
                                    rows={2}
                                    value={createForm.data.observaciones}
                                />
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600" onClick={() => setCreateModal(false)} type="button">Cancelar</button>
                                <button className="rounded-md bg-[#07152b] px-3.5 py-1.5 text-xs font-semibold text-white" disabled={createForm.processing} type="submit">Guardar Contrato</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Renovar Contrato */}
            {renewModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold text-slate-900">
                                Renovar Contrato ({renewModal.contract?.numero_contrato})
                            </h2>
                            <button className="text-slate-400 hover:text-slate-600" onClick={() => setRenewModal({ open: false, contract: null })} type="button">
                                <Icon className="h-4 w-4" name="close" />
                            </button>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-500">
                            El contrato actual para <span className="font-semibold text-slate-800">{renewModal.contract?.employee?.user?.name}</span> pasará a estado Renovado y se generará una nueva vigencia contractual manteniendo el historial.
                        </p>

                        <form className="mt-3 space-y-3" onSubmit={handleRenewSubmit}>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Tipo de Contrato *</label>
                                <select
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                    onChange={(e) => renewForm.setData('contract_type_id', e.target.value)}
                                    required
                                    value={renewForm.data.contract_type_id}
                                >
                                    {contractTypes.map((t) => (
                                        <option key={t.id} value={t.id}>{t.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Nuevo Salario ($) *</label>
                                <input
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                    onChange={(e) => renewForm.setData('salario', e.target.value)}
                                    required
                                    type="number"
                                    value={renewForm.data.salario}
                                />
                                {renewForm.errors.salario && <p className="mt-0.5 text-[9px] text-red-600">{renewForm.errors.salario}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Nueva Fecha de Inicio *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => renewForm.setData('fecha_inicio', e.target.value)}
                                        required
                                        type="date"
                                        value={renewForm.data.fecha_inicio}
                                    />
                                    {renewForm.errors.fecha_inicio && <p className="mt-0.5 text-[9px] text-red-600">{renewForm.errors.fecha_inicio}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">
                                        Nueva Fecha de Fin{selectedRenewType?.requiere_fecha_fin ? ' *' : ''}
                                    </label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => renewForm.setData('fecha_fin', e.target.value)}
                                        required={Boolean(selectedRenewType?.requiere_fecha_fin)}
                                        type="date"
                                        value={renewForm.data.fecha_fin}
                                    />
                                    {renewForm.errors.fecha_fin && <p className="mt-0.5 text-[9px] text-red-600">{renewForm.errors.fecha_fin}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Observaciones</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                    onChange={(e) => renewForm.setData('observaciones', e.target.value)}
                                    rows={2}
                                    value={renewForm.data.observaciones}
                                />
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600" onClick={() => setRenewModal({ open: false, contract: null })} type="button">Cancelar</button>
                                <button className="rounded-md bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white" disabled={renewForm.processing} type="submit">Efectuar Renovación</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Anular Contrato */}
            {annulModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold text-red-700">Anular Contrato ({annulModal.contract?.numero_contrato})</h2>
                            <button className="text-slate-400 hover:text-slate-600" onClick={() => setAnnulModal({ open: false, contract: null })} type="button">
                                <Icon className="h-4 w-4" name="close" />
                            </button>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-600">
                            Esta acción cambiará el estado a <span className="font-semibold text-red-600">Anulado</span>. Se conservará el registro histórico con el motivo justificado.
                        </p>

                        <form className="mt-3 space-y-3" onSubmit={handleAnnulSubmit}>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Motivo de Anulación *</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-red-500"
                                    onChange={(e) => annulForm.setData('motivo_anulacion', e.target.value)}
                                    placeholder="Indica la razón de la anulación (ej: error en radicación, renuncia antes de inicio, etc.)..."
                                    required
                                    rows={3}
                                    value={annulForm.data.motivo_anulacion}
                                />
                                {annulForm.errors.motivo_anulacion && <p className="mt-0.5 text-[9px] text-red-600">{annulForm.errors.motivo_anulacion}</p>}
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600" onClick={() => setAnnulModal({ open: false, contract: null })} type="button">Cancelar</button>
                                <button className="rounded-md bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700" disabled={annulForm.processing} type="submit">Confirmar Anulación</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
