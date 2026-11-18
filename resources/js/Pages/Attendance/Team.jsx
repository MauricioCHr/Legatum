import { useState } from 'react';
import { router } from '@inertiajs/react';
import EmptyState from '../../Components/EmptyState';
import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

function originLabel(origin) {
    return {
        publico: 'Público',
        autenticado: 'Interno',
        manual: 'Manual',
        corregido: 'Corregido',
    }[origin] ?? 'Histórico';
}

export default function Team({ department, attendances, filters, flash }) {
    const [startDate, setStartDate] = useState(filters.fecha_inicio ?? '');
    const [endDate, setEndDate] = useState(filters.fecha_fin ?? '');
    const [status, setStatus] = useState(filters.estado ?? '');

    function handleFilter(e) {
        e.preventDefault();
        router.get('/asistencia/equipo', {
            fecha_inicio: startDate,
            fecha_fin: endDate,
            estado: status,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    return (
        <AuthenticatedLayout title="Asistencia del Equipo">
            <div className="space-y-4">
                <header>
                    <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#547da6]">
                        <span className="rounded bg-[#eaf1fa] px-1.5 py-0.5">Supervisión de Área</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{department?.nombre ?? 'Mi Área'}</span>
                    </p>
                    <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[25px]">
                        Asistencia y Puntualidad de mi Equipo
                    </h1>
                    <p className="mt-1 text-[10px] text-slate-500">
                        Consulta de cumplimiento horario, horas trabajadas y ausentismo de colaboradores a tu cargo.
                    </p>
                </header>

                {flash?.success && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        {flash.success}
                    </div>
                )}

                <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                    <form className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3" onSubmit={handleFilter}>
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
                            <option value="Incapacidad">Incapacidad</option>
                            <option value="Vacaciones">Vacaciones</option>
                        </select>
                        <button
                            className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-[#eaf1fa] px-3 text-[10px] font-medium text-[#52789f] hover:bg-[#dce8f6]"
                            type="submit"
                        >
                            <Icon className="h-3.5 w-3.5" name="filter" />
                            Filtrar
                        </button>
                    </form>

                    {attendances.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead className="bg-[#f3f6fb]">
                                    <tr>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Fecha</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Colaborador</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Cargo</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Entrada</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Salida</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Incidencia / observación</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Origen</th>
                                        <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Retardo</th>
                                        <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Horas Extra</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {attendances.data.map((att) => (
                                        <tr className="hover:bg-[#f7faff]" key={att.id}>
                                            <td className="px-3 py-3 font-semibold text-[10px] text-slate-800">{att.fecha}</td>
                                            <td className="px-3 py-3 text-[10px] font-semibold text-slate-800">{att.employee?.user?.name}</td>
                                            <td className="px-3 py-3 text-[10px] text-slate-600">{att.employee?.position?.nombre}</td>
                                            <td className="px-3 py-3 font-mono text-[10px] text-slate-700">{att.hora_entrada ?? '—'}</td>
                                            <td className="px-3 py-3 font-mono text-[10px] text-slate-700">{att.hora_salida ?? '—'}</td>
                                            <td className="px-3 py-3">
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-700">
                                                    {att.estado}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-[9px] text-slate-600">{att.observaciones ?? '—'}</td>
                                            <td className="px-3 py-3 text-[9px] text-slate-600">
                                                <span className="block">Entrada: {originLabel(att.origen_entrada)}</span>
                                                <span className="block">Salida: {originLabel(att.origen_salida)}</span>
                                            </td>
                                            <td className="px-3 py-3 text-center text-[10px]">
                                                {att.minutos_retardo > 0 ? `${att.minutos_retardo} min` : '—'}
                                            </td>
                                            <td className="px-3 py-3 text-center text-[10px] font-semibold text-slate-700">
                                                {Number(att.horas_extra) > 0 ? `${att.horas_extra}h` : '—'}
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
                                description="No hay registros de asistencia para tu equipo en este rango."
                                icon="clock"
                                title="Sin registros de asistencia"
                            />
                        </div>
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
