import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function Index({
    activeTab: initialTab,
    contractTypes,
    leaveTypes,
    payrollNoveltyTypes,
    evaluationCriteria,
    roles,
    canManage,
    flash,
}) {
    const [tab, setTab] = useState(initialTab || 'contract_types');
    const [modal, setModal] = useState({ open: false, type: null, item: null });

    // Forms for each catalog
    const contractTypeForm = useForm({
        nombre: '',
        descripcion: '',
        requiere_fecha_fin: false,
        is_active: true,
    });

    const leaveTypeForm = useForm({
        nombre: '',
        es_remunerado: true,
        descuenta_vacaciones: false,
        requires_attachment: false,
        dias_maximos: 15,
        descripcion: '',
        is_active: true,
    });

    const payrollNoveltyTypeForm = useForm({
        nombre: '',
        tipo: 'Devengo',
        unidad_medida: 'Valor',
        descripcion: '',
        is_active: true,
    });

    const evaluationCriteriaForm = useForm({
        nombre: '',
        descripcion: '',
        peso: 20.00,
        is_active: true,
    });

    function openModal(type, item = null) {
        setModal({ open: true, type, item });
        if (type === 'contract_types') {
            contractTypeForm.clearErrors();
            contractTypeForm.setData({
                nombre: item?.nombre ?? '',
                descripcion: item?.descripcion ?? '',
                requiere_fecha_fin: Boolean(item?.requiere_fecha_fin),
                is_active: item ? Boolean(item.is_active) : true,
            });
        } else if (type === 'leave_types') {
            leaveTypeForm.clearErrors();
            leaveTypeForm.setData({
                nombre: item?.nombre ?? '',
                es_remunerado: item ? Boolean(item.es_remunerado) : true,
                descuenta_vacaciones: Boolean(item?.descuenta_vacaciones),
                requires_attachment: Boolean(item?.requires_attachment),
                dias_maximos: item?.dias_maximos ?? 15,
                descripcion: item?.descripcion ?? '',
                is_active: item ? Boolean(item.is_active) : true,
            });
        } else if (type === 'payroll_novelty_types') {
            payrollNoveltyTypeForm.clearErrors();
            payrollNoveltyTypeForm.setData({
                nombre: item?.nombre ?? '',
                tipo: item?.tipo ?? 'Devengo',
                unidad_medida: item?.unidad_medida ?? 'Valor',
                descripcion: item?.descripcion ?? '',
                is_active: item ? Boolean(item.is_active) : true,
            });
        } else if (type === 'evaluation_criteria') {
            evaluationCriteriaForm.clearErrors();
            evaluationCriteriaForm.setData({
                nombre: item?.nombre ?? '',
                descripcion: item?.descripcion ?? '',
                peso: item?.peso ?? 20.00,
                is_active: item ? Boolean(item.is_active) : true,
            });
        }
    }

    function closeModal() {
        setModal({ open: false, type: null, item: null });
    }

    function handleContractTypeSubmit(e) {
        e.preventDefault();
        if (modal.item) {
            contractTypeForm.put(`/catalogos/tipos-contrato/${modal.item.id}`, {
                onSuccess: closeModal,
            });
        } else {
            contractTypeForm.post('/catalogos/tipos-contrato', {
                onSuccess: closeModal,
            });
        }
    }

    function handleLeaveTypeSubmit(e) {
        e.preventDefault();
        if (modal.item) {
            leaveTypeForm.put(`/catalogos/tipos-permiso/${modal.item.id}`, {
                onSuccess: closeModal,
            });
        } else {
            leaveTypeForm.post('/catalogos/tipos-permiso', {
                onSuccess: closeModal,
            });
        }
    }

    function handlePayrollNoveltyTypeSubmit(e) {
        e.preventDefault();
        if (modal.item) {
            payrollNoveltyTypeForm.put(`/catalogos/tipos-novedad/${modal.item.id}`, {
                onSuccess: closeModal,
            });
        } else {
            payrollNoveltyTypeForm.post('/catalogos/tipos-novedad', {
                onSuccess: closeModal,
            });
        }
    }

    function handleEvaluationCriteriaSubmit(e) {
        e.preventDefault();
        if (modal.item) {
            evaluationCriteriaForm.put(`/catalogos/criterios-evaluacion/${modal.item.id}`, {
                onSuccess: closeModal,
            });
        } else {
            evaluationCriteriaForm.post('/catalogos/criterios-evaluacion', {
                onSuccess: closeModal,
            });
        }
    }

    const tabs = [
        { id: 'contract_types', label: 'Tipos de Contrato', count: contractTypes.length, icon: 'file' },
        { id: 'leave_types', label: 'Tipos de Permiso y Vacaciones', count: leaveTypes.length, icon: 'calendar' },
        { id: 'payroll_novelty_types', label: 'Novedades de Nómina', count: payrollNoveltyTypes.length, icon: 'wallet' },
        { id: 'evaluation_criteria', label: 'Criterios de Evaluación', count: evaluationCriteria.length, icon: 'clipboard' },
        { id: 'roles', label: 'Roles Institucionales', count: roles.length, icon: 'shield' },
    ];

    return (
        <AuthenticatedLayout title="Roles y Catálogos">
            <div className="space-y-4">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#547da6]">
                            <span className="rounded bg-[#eaf1fa] px-1.5 py-0.5">Administración Central</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">Comercializadora Andina S.A.S.</span>
                        </p>
                        <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[25px]">
                            Catálogos Institucionales y Reglas de Negocio
                        </h1>
                        <p className="mt-1 text-[10px] text-slate-500">
                            Configuración de parámetros operativos para contratos, permisos, novedades, desempeño y seguridad.
                        </p>
                    </div>

                    {canManage && tab !== 'roles' && (
                        <button
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#07152b] px-3.5 py-2 text-[10px] font-semibold text-white shadow-sm transition hover:bg-[#1a3150]"
                            onClick={() => openModal(tab)}
                            type="button"
                        >
                            <Icon className="h-3.5 w-3.5" name="plus" />
                            Nuevo Registro
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

                {/* Tab Navigation */}
                <div className="flex flex-wrap gap-1 border-b border-slate-200">
                    {tabs.map((t) => {
                        const active = tab === t.id;
                        return (
                            <button
                                className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                                    active
                                        ? 'border-[#547da6] text-[#2b4d70]'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                type="button"
                            >
                                <Icon className="h-3.5 w-3.5" name={t.icon} />
                                {t.label}
                                <span className={`rounded-full px-1.5 py-0.2 text-[9px] ${
                                    active ? 'bg-[#eaf1fa] text-[#416b94]' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {t.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content: Contract Types */}
                {tab === 'contract_types' && (
                    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                        <table className="w-full border-collapse text-left">
                            <thead className="bg-[#f3f6fb]">
                                <tr>
                                    <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Tipo de Contrato</th>
                                    <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Código</th>
                                    <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">¿Requiere Fecha Fin?</th>
                                    <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Contratos</th>
                                    <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                    <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {contractTypes.map((item) => (
                                    <tr className="hover:bg-[#f7faff]" key={item.id}>
                                        <td className="px-3 py-3">
                                            <span className="block text-[11px] font-semibold text-slate-800">{item.nombre}</span>
                                            <span className="text-[9px] text-slate-500">{item.descripcion}</span>
                                        </td>
                                        <td className="px-3 py-3 font-mono text-[10px] text-slate-600">{item.codigo}</td>
                                        <td className="px-3 py-3 text-[10px]">
                                            {item.requiere_fecha_fin ? (
                                                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">Sí (Término fijo)</span>
                                            ) : (
                                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">No (Indefinido/Labor)</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-center text-[10px] font-semibold text-slate-700">{item.contracts_count}</td>
                                        <td className="px-3 py-3">
                                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {item.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            {canManage && (
                                                <button
                                                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#426b95]"
                                                    onClick={() => openModal('contract_types', item)}
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
                )}

                {/* Tab Content: Leave Types */}
                {tab === 'leave_types' && (
                    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                        <table className="w-full border-collapse text-left">
                            <thead className="bg-[#f3f6fb]">
                                <tr>
                                    <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Permiso / Licencia</th>
                                    <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Remuneración</th>
                                    <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Descuenta Vacaciones</th>
                                    <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Soporte Requerido</th>
                                    <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Días Máx.</th>
                                    <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Solicitudes</th>
                                    <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                    <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leaveTypes.map((item) => (
                                    <tr className="hover:bg-[#f7faff]" key={item.id}>
                                        <td className="px-3 py-3">
                                            <span className="block text-[11px] font-semibold text-slate-800">{item.nombre}</span>
                                            <span className="text-[9px] text-slate-500">{item.descripcion}</span>
                                        </td>
                                        <td className="px-3 py-3 text-[10px]">
                                            {item.es_remunerado ? (
                                                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">Remunerado</span>
                                            ) : (
                                                <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-medium text-red-700">No Remunerado</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-[10px]">
                                            {item.descuenta_vacaciones ? (
                                                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-700">Sí (Saldo Vac.)</span>
                                            ) : (
                                                <span className="text-slate-400">No</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-[10px]">
                                            {item.requires_attachment ? (
                                                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">Obligatorio</span>
                                            ) : (
                                                <span className="text-slate-400">No</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-center text-[10px] text-slate-700">{item.dias_maximos ?? '—'}</td>
                                        <td className="px-3 py-3 text-center text-[10px] font-semibold text-slate-700">{item.requests_count}</td>
                                        <td className="px-3 py-3">
                                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {item.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            {canManage && (
                                                <button
                                                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#426b95]"
                                                    onClick={() => openModal('leave_types', item)}
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
                )}

                {/* Tab Content: Payroll Novelty Types */}
                {tab === 'payroll_novelty_types' && (
                    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                        <table className="w-full border-collapse text-left">
                            <thead className="bg-[#f3f6fb]">
                                <tr>
                                    <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Novedad de Nómina</th>
                                    <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Clasificación</th>
                                    <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Unidad de Medida</th>
                                    <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Registros</th>
                                    <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                    <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {payrollNoveltyTypes.map((item) => (
                                    <tr className="hover:bg-[#f7faff]" key={item.id}>
                                        <td className="px-3 py-3">
                                            <span className="block text-[11px] font-semibold text-slate-800">{item.nombre}</span>
                                            <span className="text-[9px] text-slate-500">{item.descripcion}</span>
                                        </td>
                                        <td className="px-3 py-3 text-[10px]">
                                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                                                item.tipo === 'Devengo' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                            }`}>
                                                {item.tipo}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 font-medium text-[10px] text-slate-700">{item.unidad_medida}</td>
                                        <td className="px-3 py-3 text-center text-[10px] font-semibold text-slate-700">{item.novelties_count}</td>
                                        <td className="px-3 py-3">
                                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {item.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            {canManage && (
                                                <button
                                                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#426b95]"
                                                    onClick={() => openModal('payroll_novelty_types', item)}
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
                )}

                {/* Tab Content: Evaluation Criteria */}
                {tab === 'evaluation_criteria' && (
                    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                        <table className="w-full border-collapse text-left">
                            <thead className="bg-[#f3f6fb]">
                                <tr>
                                    <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Criterio de Evaluación</th>
                                    <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Ponderación / Peso</th>
                                    <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Evaluaciones</th>
                                    <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                    <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {evaluationCriteria.map((item) => (
                                    <tr className="hover:bg-[#f7faff]" key={item.id}>
                                        <td className="px-3 py-3">
                                            <span className="block text-[11px] font-semibold text-slate-800">{item.nombre}</span>
                                            <span className="text-[9px] text-slate-500">{item.descripcion}</span>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <span className="rounded bg-[#eaf1fa] px-2 py-0.5 text-[10px] font-bold text-[#426b95]">
                                                {item.peso}%
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center text-[10px] font-semibold text-slate-700">{item.scores_count}</td>
                                        <td className="px-3 py-3">
                                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {item.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            {canManage && (
                                                <button
                                                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#426b95]"
                                                    onClick={() => openModal('evaluation_criteria', item)}
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
                )}

                {/* Tab Content: Roles */}
                {tab === 'roles' && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {roles.map((r) => (
                            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm" key={r.id}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#eaf1fa] text-[#416b94]">
                                            <Icon className="h-4 w-4" name="shield" />
                                        </span>
                                        <h3 className="text-xs font-bold text-slate-900">{r.name}</h3>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600">
                                        {r.users_count} usuarios
                                    </span>
                                </div>
                                <p className="mt-2 text-[10px] text-slate-500">{r.description}</p>
                                <div className="mt-3 border-t border-slate-100 pt-2 text-[9px] text-[#547da6]">
                                    Slug: <code className="font-mono">{r.slug}</code>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal for Catalogs */}
            {modal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold text-slate-900">
                                {modal.item ? 'Editar Registro' : 'Nuevo Registro'}
                            </h2>
                            <button className="text-slate-400 hover:text-slate-600" onClick={closeModal} type="button">
                                <Icon className="h-4 w-4" name="close" />
                            </button>
                        </div>

                        {modal.type === 'contract_types' && (
                            <form className="mt-3 space-y-3" onSubmit={handleContractTypeSubmit}>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Nombre del tipo de contrato *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#547da6]"
                                        onChange={(e) => contractTypeForm.setData('nombre', e.target.value)}
                                        required
                                        type="text"
                                        value={contractTypeForm.data.nombre}
                                    />
                                    {contractTypeForm.errors.nombre && <p className="mt-0.5 text-[9px] text-red-600">{contractTypeForm.errors.nombre}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Descripción</label>
                                    <textarea
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#547da6]"
                                        onChange={(e) => contractTypeForm.setData('descripcion', e.target.value)}
                                        rows={2}
                                        value={contractTypeForm.data.descripcion}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        checked={contractTypeForm.data.requiere_fecha_fin}
                                        className="h-3.5 w-3.5 rounded text-[#547da6]"
                                        id="req_fin"
                                        onChange={(e) => contractTypeForm.setData('requiere_fecha_fin', e.target.checked)}
                                        type="checkbox"
                                    />
                                    <label className="text-[10px] text-slate-700" htmlFor="req_fin">
                                        Requiere fecha de finalización obligatoria (término fijo)
                                    </label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        checked={leaveTypeForm.data.requires_attachment}
                                        className="h-3.5 w-3.5 rounded text-[#547da6]"
                                        id="requires_attachment"
                                        onChange={(e) => leaveTypeForm.setData('requires_attachment', e.target.checked)}
                                        type="checkbox"
                                    />
                                    <label className="text-[10px] text-slate-700" htmlFor="requires_attachment">
                                        Exige adjuntar soporte documental para radicar la solicitud
                                    </label>
                                </div>
                                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                    <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600" onClick={closeModal} type="button">Cancelar</button>
                                    <button className="rounded-md bg-[#07152b] px-3.5 py-1.5 text-xs font-semibold text-white" disabled={contractTypeForm.processing} type="submit">Guardar</button>
                                </div>
                            </form>
                        )}

                        {modal.type === 'leave_types' && (
                            <form className="mt-3 space-y-3" onSubmit={handleLeaveTypeSubmit}>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Nombre del permiso / licencia *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#547da6]"
                                        onChange={(e) => leaveTypeForm.setData('nombre', e.target.value)}
                                        required
                                        type="text"
                                        value={leaveTypeForm.data.nombre}
                                    />
                                    {leaveTypeForm.errors.nombre && <p className="mt-0.5 text-[9px] text-red-600">{leaveTypeForm.errors.nombre}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-700">¿Es Remunerado?</label>
                                        <select
                                            className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                            onChange={(e) => leaveTypeForm.setData('es_remunerado', e.target.value === '1')}
                                            value={leaveTypeForm.data.es_remunerado ? '1' : '0'}
                                        >
                                            <option value="1">Sí (Con pago)</option>
                                            <option value="0">No (Sin pago)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-700">Días Máximos</label>
                                        <input
                                            className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                            onChange={(e) => leaveTypeForm.setData('dias_maximos', parseInt(e.target.value) || '')}
                                            type="number"
                                            value={leaveTypeForm.data.dias_maximos}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        checked={leaveTypeForm.data.descuenta_vacaciones}
                                        className="h-3.5 w-3.5 rounded text-[#547da6]"
                                        id="desc_vac"
                                        onChange={(e) => leaveTypeForm.setData('descuenta_vacaciones', e.target.checked)}
                                        type="checkbox"
                                    />
                                    <label className="text-[10px] text-slate-700" htmlFor="desc_vac">
                                        Descuenta del saldo de vacaciones anuales
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Descripción o marco normativo</label>
                                    <textarea
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#547da6]"
                                        onChange={(e) => leaveTypeForm.setData('descripcion', e.target.value)}
                                        rows={2}
                                        value={leaveTypeForm.data.descripcion}
                                    />
                                </div>
                                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                    <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600" onClick={closeModal} type="button">Cancelar</button>
                                    <button className="rounded-md bg-[#07152b] px-3.5 py-1.5 text-xs font-semibold text-white" disabled={leaveTypeForm.processing} type="submit">Guardar</button>
                                </div>
                            </form>
                        )}

                        {modal.type === 'payroll_novelty_types' && (
                            <form className="mt-3 space-y-3" onSubmit={handlePayrollNoveltyTypeSubmit}>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Nombre de la novedad *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#547da6]"
                                        onChange={(e) => payrollNoveltyTypeForm.setData('nombre', e.target.value)}
                                        required
                                        type="text"
                                        value={payrollNoveltyTypeForm.data.nombre}
                                    />
                                    {payrollNoveltyTypeForm.errors.nombre && <p className="mt-0.5 text-[9px] text-red-600">{payrollNoveltyTypeForm.errors.nombre}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-700">Clasificación *</label>
                                        <select
                                            className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                            onChange={(e) => payrollNoveltyTypeForm.setData('tipo', e.target.value)}
                                            value={payrollNoveltyTypeForm.data.tipo}
                                        >
                                            <option value="Devengo">Devengo (Suma)</option>
                                            <option value="Deduccion">Deducción (Resta)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-700">Unidad de medida *</label>
                                        <select
                                            className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                            onChange={(e) => payrollNoveltyTypeForm.setData('unidad_medida', e.target.value)}
                                            value={payrollNoveltyTypeForm.data.unidad_medida}
                                        >
                                            <option value="Valor">Valor en Pesos ($)</option>
                                            <option value="Horas">Horas</option>
                                            <option value="Dias">Días</option>
                                            <option value="Porcentaje">Porcentaje (%)</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Descripción o fórmula</label>
                                    <textarea
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#547da6]"
                                        onChange={(e) => payrollNoveltyTypeForm.setData('descripcion', e.target.value)}
                                        rows={2}
                                        value={payrollNoveltyTypeForm.data.descripcion}
                                    />
                                </div>
                                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                    <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600" onClick={closeModal} type="button">Cancelar</button>
                                    <button className="rounded-md bg-[#07152b] px-3.5 py-1.5 text-xs font-semibold text-white" disabled={payrollNoveltyTypeForm.processing} type="submit">Guardar</button>
                                </div>
                            </form>
                        )}

                        {modal.type === 'evaluation_criteria' && (
                            <form className="mt-3 space-y-3" onSubmit={handleEvaluationCriteriaSubmit}>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Nombre del criterio *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#547da6]"
                                        onChange={(e) => evaluationCriteriaForm.setData('nombre', e.target.value)}
                                        required
                                        type="text"
                                        value={evaluationCriteriaForm.data.nombre}
                                    />
                                    {evaluationCriteriaForm.errors.nombre && <p className="mt-0.5 text-[9px] text-red-600">{evaluationCriteriaForm.errors.nombre}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Ponderación / Peso (%) *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        max="100"
                                        min="0"
                                        onChange={(e) => evaluationCriteriaForm.setData('peso', parseFloat(e.target.value) || 0)}
                                        required
                                        step="0.5"
                                        type="number"
                                        value={evaluationCriteriaForm.data.peso}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Descripción y alcance evaluativo</label>
                                    <textarea
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#547da6]"
                                        onChange={(e) => evaluationCriteriaForm.setData('descripcion', e.target.value)}
                                        rows={2}
                                        value={evaluationCriteriaForm.data.descripcion}
                                    />
                                </div>
                                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                    <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600" onClick={closeModal} type="button">Cancelar</button>
                                    <button className="rounded-md bg-[#07152b] px-3.5 py-1.5 text-xs font-semibold text-white" disabled={evaluationCriteriaForm.processing} type="submit">Guardar</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
