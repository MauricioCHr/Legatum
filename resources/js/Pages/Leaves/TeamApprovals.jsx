import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import EmptyState from '../../Components/EmptyState';
import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function TeamApprovals({ department, requests, flash }) {
    const [rejectModal, setRejectModal] = useState({ open: false, request: null });

    const rejectForm = useForm({
        observaciones_respuesta: '',
    });

    function handleApprove(req) {
        if (!window.confirm(`¿Aprobar solicitud de ${req.dias_solicitados} días para ${req.employee?.user?.name}?`)) {
            return;
        }
        router.post(`/vacaciones/solicitudes/${req.id}/aprobar`, {
            observaciones_respuesta: 'Aprobado por Jefe de Área',
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

    return (
        <AuthenticatedLayout title="Aprobaciones de Vacaciones y Permisos">
            <div className="space-y-4">
                <header>
                    <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#547da6]">
                        <span className="rounded bg-[#eaf1fa] px-1.5 py-0.5">Jefatura Inmediata</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{department?.nombre ?? 'Mi Área'}</span>
                    </p>
                    <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[25px]">
                        Aprobación de Vacaciones y Permisos del Equipo
                    </h1>
                    <p className="mt-1 text-[10px] text-slate-500">
                        Revisa, aprueba o rechaza solicitudes de ausencia de los colaboradores de tu departamento.
                    </p>
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

                <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                    {requests.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead className="bg-[#f3f6fb]">
                                    <tr>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Colaborador</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Tipo de Permiso</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Período</th>
                                        <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Días</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Observaciones</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Soporte / Historial</th>
                                        <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Decisión</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {requests.data.map((req) => (
                                        <tr className="hover:bg-[#f7faff]" key={req.id}>
                                            <td className="px-3 py-3">
                                                <span className="block text-[10px] font-semibold text-slate-800">{req.employee?.user?.name}</span>
                                                <span className="text-[8px] text-slate-400">{req.employee?.position?.nombre}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="block text-[10px] font-medium text-slate-800">{req.leave_type?.nombre}</span>
                                                <span className="block max-w-xs truncate text-[8px] text-slate-500" title={req.motivo}>
                                                    {req.motivo}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-[10px] text-slate-700">
                                                {req.fecha_inicio} al {req.fecha_fin}
                                            </td>
                                            <td className="px-3 py-3 text-center font-bold text-[10px] text-slate-800">
                                                {req.dias_solicitados}
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                                                    req.estado === 'Pendiente' ? 'bg-amber-50 text-amber-700' :
                                                    req.estado === 'Aprobada' ? 'bg-emerald-50 text-emerald-700' :
                                                    req.estado === 'Rechazada' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {req.estado}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-[9px] text-slate-500">
                                                {req.observaciones_respuesta ?? '—'}
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
                                                        </li>
                                                    ))}
                                                </ul>
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                {req.estado === 'Pendiente' ? (
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            className="rounded bg-emerald-600 px-2.5 py-1 text-[9px] font-semibold text-white hover:bg-emerald-700"
                                                            onClick={() => handleApprove(req)}
                                                            type="button"
                                                        >
                                                            Aprobar
                                                        </button>
                                                        <button
                                                            className="rounded bg-red-600 px-2.5 py-1 text-[9px] font-semibold text-white hover:bg-red-700"
                                                            onClick={() => openReject(req)}
                                                            type="button"
                                                        >
                                                            Rechazar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] text-slate-400">Procesada</span>
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
                                description="No hay solicitudes de vacaciones o permisos pendientes en tu equipo."
                                icon="calendar"
                                title="Sin solicitudes pendientes"
                            />
                        </div>
                    )}
                </section>
            </div>

            {/* Modal Rechazo */}
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
                            Registra la justificación del rechazo para <span className="font-semibold">{rejectModal.request?.employee?.user?.name}</span>.
                        </p>

                        <form className="mt-3 space-y-3" onSubmit={handleRejectSubmit}>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Motivo del Rechazo *</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-red-500"
                                    onChange={(e) => rejectForm.setData('observaciones_respuesta', e.target.value)}
                                    placeholder="Razón del rechazo..."
                                    required
                                    rows={3}
                                    value={rejectForm.data.observaciones_respuesta}
                                />
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
