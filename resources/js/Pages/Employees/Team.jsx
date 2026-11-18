import { Link } from '@inertiajs/react';
import EmptyState from '../../Components/EmptyState';
import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function Team({ department, team, flash }) {
    return (
        <AuthenticatedLayout title="Mi Equipo de Trabajo">
            <div className="space-y-4">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#547da6]">
                            <span className="rounded bg-[#eaf1fa] px-1.5 py-0.5">Jefatura de Área</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">{department ? department.nombre : 'Sin departamento asignado'}</span>
                        </p>
                        <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[25px]">
                            Equipo de Trabajo
                        </h1>
                        <p className="mt-1 text-[10px] text-slate-500">
                            Colaboradores asignados bajo tu supervisión en Comercializadora Andina S.A.S.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Link
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#eaf1fa] px-3 py-2 text-[10px] font-semibold text-[#547da6] hover:bg-[#dce8f6]"
                            href="/asistencia/equipo"
                        >
                            <Icon className="h-3.5 w-3.5" name="clock" />
                            Asistencia del equipo
                        </Link>
                        <Link
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#07152b] px-3 py-2 text-[10px] font-semibold text-white shadow-sm hover:bg-[#1a3150]"
                            href="/vacaciones/aprobaciones"
                        >
                            <Icon className="h-3.5 w-3.5" name="calendar" />
                            Solicitudes por aprobar
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

                <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                    {team.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead className="bg-[#f3f6fb]">
                                    <tr>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Colaborador</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Cargo</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Documento</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Contacto</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                        <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {team.data.map((member) => (
                                        <tr className="hover:bg-[#f7faff]" key={member.id}>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#17243a] text-[9px] font-semibold text-white">
                                                        {member.user?.name?.slice(0, 1)}
                                                    </span>
                                                    <div>
                                                        <span className="block text-[11px] font-semibold text-slate-800">{member.user?.name}</span>
                                                        <span className="block text-[9px] text-slate-400">{member.user?.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-[10px] text-slate-700">{member.position?.nombre}</td>
                                            <td className="px-3 py-3 text-[10px] text-slate-600">{member.tipo_documento} {member.numero_documento}</td>
                                            <td className="px-3 py-3 text-[10px] text-slate-600">{member.telefono}</td>
                                            <td className="px-3 py-3">
                                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                                                    member.estado === 'Activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {member.estado}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <Link
                                                    className="inline-flex items-center gap-1 rounded bg-[#eaf1fa] px-2.5 py-1 text-[9px] font-semibold text-[#547da6] hover:bg-[#dce8f6]"
                                                    href={`/empleados/${member.id}`}
                                                >
                                                    <Icon className="h-3 w-3" name="eye" />
                                                    Ficha
                                                </Link>
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
                                description="No hay colaboradores asignados actualmente a este departamento o equipo."
                                icon="users"
                                title="Sin colaboradores en tu equipo"
                            />
                        </div>
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
