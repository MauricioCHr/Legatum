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

export default function MyRequests({ employee, balance, requests, leaveTypes, flash }) {
    const [createModal, setCreateModal] = useState(false);

    const form = useForm({
        leave_type_id: leaveTypes[0]?.id ?? '',
        fecha_inicio: '',
        fecha_fin: '',
        motivo: '',
        support_file: null,
    });

    const selectedLeaveType = leaveTypes.find((type) => Number(type.id) === Number(form.data.leave_type_id));

    function handleSubmit(e) {
        e.preventDefault();
        form.post('/vacaciones/solicitudes', {
            onSuccess: () => {
                setCreateModal(false);
                form.reset();
            },
        });
    }

    function handleCancel(req) {
        if (!window.confirm('¿Deseas cancelar esta solicitud pendiente?')) {
            return;
        }
        router.post(`/vacaciones/solicitudes/${req.id}/cancelar`);
    }

    return (
        <AuthenticatedLayout title="Mis Vacaciones y Permisos">
            <div className="space-y-4">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#547da6]">
                            <span className="rounded bg-[#eaf1fa] px-1.5 py-0.5">Mi Espacio Personal</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">{employee?.user?.name}</span>
                        </p>
                        <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[25px]">
                            Mis Vacaciones, Permisos y Licencias
                        </h1>
                        <p className="mt-1 text-[10px] text-slate-500">
                            Consulta tu saldo de vacaciones acumuladas, radica solicitudes y haz seguimiento al estado de aprobación.
                        </p>
                    </div>

                    <button
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#07152b] px-3.5 py-2 text-[10px] font-semibold text-white shadow-sm transition hover:bg-[#1a3150]"
                        onClick={() => {
                            form.reset();
                            form.clearErrors();
                            setCreateModal(true);
                        }}
                        type="button"
                    >
                        <Icon className="h-3.5 w-3.5" name="plus" />
                        Nueva Solicitud
                    </button>
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

                {/* Vacation Balance Cards */}
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Días Disponibles</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-emerald-700">{balance.dias_disponibles}</span>
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Para disfrute</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Días Totales Ganados</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-slate-800">{balance.dias_totales_ganados}</span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700">Por ley</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Días Disfrutados</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-blue-600">{balance.dias_disfrutados}</span>
                            <span className="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700">Gozados</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Días en Solicitud Pendiente</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-amber-600">{balance.dias_pendientes}</span>
                            <span className="rounded bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">En trámite</span>
                        </div>
                    </div>
                </section>

                {/* Requests Table */}
                <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-4 py-3">
                        <h2 className="text-xs font-bold text-slate-900">Historial de Mis Solicitudes</h2>
                    </div>

                    {requests.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead className="bg-[#f3f6fb]">
                                    <tr>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Radicado</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Tipo de Permiso</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Período</th>
                                        <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Días</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Observaciones del Revisor</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Soporte</th>
                                        <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {requests.data.map((req) => (
                                        <tr className="hover:bg-[#f7faff]" key={req.id}>
                                            <td className="px-3 py-3 font-mono text-[10px] font-bold text-slate-700">#SOL-{req.id}</td>
                                            <td className="px-3 py-3">
                                                <span className="block text-[10px] font-medium text-slate-800">{req.leave_type?.nombre}</span>
                                                <span className="block max-w-xs truncate text-[8px] text-slate-500">{req.motivo}</span>
                                            </td>
                                            <td className="px-3 py-3 text-[10px] text-slate-700">{req.fecha_inicio} al {req.fecha_fin}</td>
                                            <td className="px-3 py-3 text-center font-bold text-[10px] text-slate-800">{req.dias_solicitados}</td>
                                            <td className="px-3 py-3"><StatusBadge status={req.estado} /></td>
                                            <td className="px-3 py-3 text-[9px] text-slate-500">
                                                {req.observaciones_respuesta ?? (req.estado === 'Pendiente' ? 'En espera de aprobación...' : '—')}
                                                {req.decisions?.length > 0 && (
                                                    <ul className="mt-1 space-y-0.5 text-[8px] text-slate-400">
                                                        {req.decisions.map((decision) => (
                                                            <li key={decision.id}>
                                                                {decision.action} · {decision.actor_name} · {decision.decided_at}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-[9px]">
                                                {req.support_download_url ? (
                                                    <a className="font-medium text-blue-700 underline" href={req.support_download_url}>
                                                        {req.support_original_name ?? 'Descargar'}
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400">Sin soporte</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                {req.estado === 'Pendiente' && (
                                                    <button
                                                        className="rounded bg-slate-100 px-2 py-1 text-[9px] font-medium text-slate-600 hover:bg-slate-200"
                                                        onClick={() => handleCancel(req)}
                                                        type="button"
                                                    >
                                                        Cancelar Solicitud
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
                                description="Aún no has radicado solicitudes de vacaciones o permisos."
                                icon="calendar"
                                title="Sin solicitudes registradas"
                            />
                        </div>
                    )}
                </section>
            </div>

            {/* Modal Nueva Solicitud */}
            {createModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold text-slate-900">Solicitar Vacaciones o Permiso</h2>
                            <button className="text-slate-400 hover:text-slate-600" onClick={() => setCreateModal(false)} type="button">
                                <Icon className="h-4 w-4" name="close" />
                            </button>
                        </div>

                        <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Tipo de Ausencia *</label>
                                <select
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                    onChange={(e) => {
                                        form.setData('leave_type_id', e.target.value);
                                        form.setData('support_file', null);
                                    }}
                                    required
                                    value={form.data.leave_type_id}
                                >
                                    {leaveTypes.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.nombre} {t.descuenta_vacaciones ? `(Saldo disponible: ${balance.dias_disponibles} días)` : ''}
                                        </option>
                                    ))}
                                </select>
                                {form.errors.leave_type_id && <p className="mt-0.5 text-[9px] text-red-600">{form.errors.leave_type_id}</p>}
                            </div>

                            {selectedLeaveType?.requires_attachment && (
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">
                                        Soporte documental * (PDF, JPG o PNG; máximo 10 MB)
                                    </label>
                                    <input
                                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                        className="mt-1 block w-full text-xs text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-[10px]"
                                        onChange={(event) => form.setData('support_file', event.target.files?.[0] ?? null)}
                                        required
                                        type="file"
                                    />
                                    {form.errors.support_file && <p className="mt-0.5 text-[9px] text-red-600">{form.errors.support_file}</p>}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Fecha de Inicio *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => form.setData('fecha_inicio', e.target.value)}
                                        required
                                        type="date"
                                        value={form.data.fecha_inicio}
                                    />
                                    {form.errors.fecha_inicio && <p className="mt-0.5 text-[9px] text-red-600">{form.errors.fecha_inicio}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-700">Fecha de Fin *</label>
                                    <input
                                        className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                        onChange={(e) => form.setData('fecha_fin', e.target.value)}
                                        required
                                        type="date"
                                        value={form.data.fecha_fin}
                                    />
                                    {form.errors.fecha_fin && <p className="mt-0.5 text-[9px] text-red-600">{form.errors.fecha_fin}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Motivo / Justificación *</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none"
                                    onChange={(e) => form.setData('motivo', e.target.value)}
                                    placeholder="Indica la justificación de tu solicitud..."
                                    required
                                    rows={3}
                                    value={form.data.motivo}
                                />
                                {form.errors.motivo && <p className="mt-0.5 text-[9px] text-red-600">{form.errors.motivo}</p>}
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600" onClick={() => setCreateModal(false)} type="button">Cancelar</button>
                                <button className="rounded-md bg-[#07152b] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1a3150]" disabled={form.processing} type="submit">Enviar Solicitud</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
