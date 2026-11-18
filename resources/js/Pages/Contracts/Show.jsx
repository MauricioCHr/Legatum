import { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function Show({ contract, history, contractTypes, dias_restantes, canManage, flash }) {
    const isVigente = contract.estado === 'Vigente';
    const [editModal, setEditModal] = useState(false);
    const editForm = useForm({
        contract_type_id: contract.contract_type_id,
        numero_contrato: contract.numero_contrato,
        salario: contract.salario,
        fecha_inicio: contract.fecha_inicio?.slice(0, 10) ?? '',
        fecha_fin: contract.fecha_fin?.slice(0, 10) ?? '',
        estado: contract.estado,
        observaciones: contract.observaciones ?? '',
    });
    const selectedType = contractTypes.find((type) => String(type.id) === String(editForm.data.contract_type_id));

    function openEditModal() {
        editForm.clearErrors();
        editForm.setData({
            contract_type_id: contract.contract_type_id,
            numero_contrato: contract.numero_contrato,
            salario: contract.salario,
            fecha_inicio: contract.fecha_inicio?.slice(0, 10) ?? '',
            fecha_fin: contract.fecha_fin?.slice(0, 10) ?? '',
            estado: contract.estado,
            observaciones: contract.observaciones ?? '',
        });
        setEditModal(true);
    }

    function handleEditSubmit(event) {
        event.preventDefault();
        editForm.put(`/contratos/${contract.id}`, {
            onSuccess: () => setEditModal(false),
        });
    }

    return (
        <AuthenticatedLayout title={`Contrato ${contract.numero_contrato}`}>
            <div className="space-y-4">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Link className="rounded p-1 text-slate-500 hover:bg-slate-100" href="/contratos">
                                <Icon className="h-4 w-4" name="chevronLeft" />
                            </Link>
                            <span className="font-mono text-xs font-bold text-[#547da6]">{contract.numero_contrato}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                                isVigente ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                                {contract.estado}
                            </span>
                        </div>
                        <h1 className="mt-1 text-[22px] font-semibold text-slate-900">
                            Expediente Contractual — {contract.employee?.user?.name}
                        </h1>
                        <p className="text-[10px] text-slate-500">
                            {contract.employee?.department?.nombre} · {contract.employee?.position?.nombre}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        {canManage && (
                            <button
                                className="inline-flex items-center gap-1.5 rounded-md bg-[#07152b] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1a3150]"
                                onClick={openEditModal}
                                type="button"
                            >
                                <Icon className="h-3.5 w-3.5" name="edit" />
                                Editar Contrato
                            </button>
                        )}
                        <Link
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                            href={`/empleados/${contract.employee_id}`}
                        >
                            <Icon className="h-3.5 w-3.5" name="user" />
                            Ver Ficha del Empleado
                        </Link>
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

                {/* Expiration alert if close */}
                {isVigente && dias_restantes !== null && dias_restantes <= 30 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                        <div className="flex items-center gap-2 font-bold">
                            <Icon className="h-4 w-4 text-amber-600" name="alert" />
                            Contrato Próximo a Vencer
                        </div>
                        <p className="mt-1 text-[11px]">
                            Este contrato finaliza el <span className="font-semibold">{contract.fecha_fin}</span> (quedan {dias_restantes} días).
                        </p>
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                    {/* Contract Details */}
                    <div className="space-y-4 md:col-span-2">
                        <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                            <h2 className="text-xs font-bold text-slate-900">Condiciones Contractuales</h2>
                            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div className="border-b border-slate-100 pb-2">
                                    <dt className="text-[9px] font-semibold uppercase text-slate-400">Tipo de Contrato</dt>
                                    <dd className="mt-0.5 text-xs font-semibold text-slate-800">{contract.contract_type?.nombre}</dd>
                                </div>
                                <div className="border-b border-slate-100 pb-2">
                                    <dt className="text-[9px] font-semibold uppercase text-slate-400">Salario Básico Mensual</dt>
                                    <dd className="mt-0.5 text-xs font-bold text-emerald-700">
                                        ${Number(contract.salario).toLocaleString('es-CO')} COP
                                    </dd>
                                </div>
                                <div className="border-b border-slate-100 pb-2">
                                    <dt className="text-[9px] font-semibold uppercase text-slate-400">Fecha de Inicio</dt>
                                    <dd className="mt-0.5 text-xs font-semibold text-slate-800">{contract.fecha_inicio}</dd>
                                </div>
                                <div className="border-b border-slate-100 pb-2">
                                    <dt className="text-[9px] font-semibold uppercase text-slate-400">Fecha de Vencimiento</dt>
                                    <dd className="mt-0.5 text-xs font-semibold text-slate-800">
                                        {contract.fecha_fin ?? 'Término Indefinido'}
                                    </dd>
                                </div>
                                <div className="border-b border-slate-100 pb-2">
                                    <dt className="text-[9px] font-semibold uppercase text-slate-400">Estado del Contrato</dt>
                                    <dd className="mt-0.5 text-xs font-semibold text-slate-800">{contract.estado}</dd>
                                </div>
                                <div className="border-b border-slate-100 pb-2">
                                    <dt className="text-[9px] font-semibold uppercase text-slate-400">Registrado por</dt>
                                    <dd className="mt-0.5 text-xs text-slate-700">{contract.creator?.name ?? 'Sistema'}</dd>
                                </div>
                            </dl>

                            {contract.observaciones && (
                                <div className="mt-3 rounded-lg bg-slate-50 p-2.5">
                                    <span className="block text-[9px] font-bold uppercase text-slate-500">Observaciones y Cláusulas</span>
                                    <p className="mt-1 text-xs text-slate-700">{contract.observaciones}</p>
                                </div>
                            )}

                            {contract.motivo_anulacion && (
                                <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-red-800">
                                    <span className="block text-[9px] font-bold uppercase text-red-600">Motivo de Anulación</span>
                                    <p className="mt-1 text-xs">{contract.motivo_anulacion}</p>
                                </div>
                            )}
                        </section>

                        {/* History Timeline */}
                        <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                            <h2 className="text-xs font-bold text-slate-900">Historial Contractual del Colaborador</h2>
                            <p className="mt-0.5 text-[10px] text-slate-500">
                                Trazabilidad de renovaciones y contratos previos en Comercializadora Andina S.A.S.
                            </p>
                            <div className="mt-3 divide-y divide-slate-100">
                                {history.map((h) => (
                                    <div className="flex items-center justify-between py-2 text-xs" key={h.id}>
                                        <div>
                                            <span className="font-mono font-bold text-slate-800">{h.numero_contrato}</span>
                                            <span className="ml-2 text-slate-600">{h.contract_type?.nombre}</span>
                                            <span className="block text-[10px] text-slate-400">
                                                {h.fecha_inicio} al {h.fecha_fin ?? 'Indefinido'} · ${Number(h.salario).toLocaleString('es-CO')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                                                h.estado === 'Vigente' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {h.estado}
                                            </span>
                                            {h.id !== contract.id && (
                                                <Link className="text-[10px] text-[#547da6] hover:underline" href={`/contratos/${h.id}`}>
                                                    Ver
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Employee Profile Preview */}
                    <div className="space-y-4">
                        <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm text-center">
                            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#17243a] text-base font-bold text-white">
                                {contract.employee?.user?.name?.slice(0, 1)}
                            </span>
                            <h3 className="mt-2 text-sm font-bold text-slate-900">{contract.employee?.user?.name}</h3>
                            <p className="text-[10px] text-[#547da6]">{contract.employee?.position?.nombre}</p>
                            <p className="text-[9px] text-slate-500">{contract.employee?.department?.nombre}</p>

                            <div className="mt-3 border-t border-slate-100 pt-3 text-left text-xs space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-slate-400">Documento:</span>
                                    <span className="font-medium text-slate-700">{contract.employee?.tipo_documento} {contract.employee?.numero_documento}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-slate-400">Teléfono:</span>
                                    <span className="font-medium text-slate-700">{contract.employee?.telefono}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-slate-400">Ingreso:</span>
                                    <span className="font-medium text-slate-700">{contract.employee?.fecha_contratacion}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[10px] text-slate-400">Estado Laboral:</span>
                                    <span className="font-medium text-emerald-700">{contract.employee?.estado}</span>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {editModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold text-slate-900">Editar Contrato {contract.numero_contrato}</h2>
                            <button className="text-slate-400 hover:text-slate-600" onClick={() => setEditModal(false)} type="button">
                                <Icon className="h-4 w-4" name="close" />
                            </button>
                        </div>

                        <form className="mt-4 space-y-3" onSubmit={handleEditSubmit}>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Tipo de Contrato *</label>
                                    <select
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm"
                                        onChange={(event) => editForm.setData('contract_type_id', event.target.value)}
                                        required
                                        value={editForm.data.contract_type_id}
                                    >
                                        {contractTypes.map((type) => (
                                            <option key={type.id} value={type.id}>{type.nombre}</option>
                                        ))}
                                    </select>
                                    {editForm.errors.contract_type_id && <p className="mt-1 text-xs text-red-600">{editForm.errors.contract_type_id}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Número de Contrato *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm"
                                        onChange={(event) => editForm.setData('numero_contrato', event.target.value)}
                                        required
                                        value={editForm.data.numero_contrato}
                                    />
                                    {editForm.errors.numero_contrato && <p className="mt-1 text-xs text-red-600">{editForm.errors.numero_contrato}</p>}
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Salario mensual *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm"
                                        min="0"
                                        onChange={(event) => editForm.setData('salario', event.target.value)}
                                        required
                                        step="1000"
                                        type="number"
                                        value={editForm.data.salario}
                                    />
                                    {editForm.errors.salario && <p className="mt-1 text-xs text-red-600">{editForm.errors.salario}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Fecha de Inicio *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm"
                                        onChange={(event) => editForm.setData('fecha_inicio', event.target.value)}
                                        required
                                        type="date"
                                        value={editForm.data.fecha_inicio}
                                    />
                                    {editForm.errors.fecha_inicio && <p className="mt-1 text-xs text-red-600">{editForm.errors.fecha_inicio}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">
                                        Fecha de Fin{selectedType?.requiere_fecha_fin ? ' *' : ''}
                                    </label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm"
                                        onChange={(event) => editForm.setData('fecha_fin', event.target.value)}
                                        required={Boolean(selectedType?.requiere_fecha_fin)}
                                        type="date"
                                        value={editForm.data.fecha_fin}
                                    />
                                    {editForm.errors.fecha_fin && <p className="mt-1 text-xs text-red-600">{editForm.errors.fecha_fin}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Observaciones</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm"
                                    onChange={(event) => editForm.setData('observaciones', event.target.value)}
                                    rows={3}
                                    value={editForm.data.observaciones}
                                />
                                {editForm.errors.observaciones && <p className="mt-1 text-xs text-red-600">{editForm.errors.observaciones}</p>}
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600" onClick={() => setEditModal(false)} type="button">
                                    Cancelar
                                </button>
                                <button className="rounded-md bg-[#07152b] px-4 py-2 text-sm font-semibold text-white" disabled={editForm.processing} type="submit">
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
