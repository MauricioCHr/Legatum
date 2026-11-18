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

export default function MyAttendance({ attendances, todayRecord, employee, filters, today, flash }) {
    const [startDate, setStartDate] = useState(filters.fecha_inicio ?? '');
    const [endDate, setEndDate] = useState(filters.fecha_fin ?? '');
    const [clocking, setClocking] = useState(false);

    function handleClock() {
        setClocking(true);
        router.post('/mi-asistencia/marcar', {}, {
            onFinish: () => setClocking(false),
        });
    }

    function handleFilter(e) {
        e.preventDefault();
        router.get('/mi-asistencia', {
            fecha_inicio: startDate,
            fecha_fin: endDate,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    const hasClockedIn = Boolean(todayRecord?.hora_entrada);
    const hasClockedOut = Boolean(todayRecord?.hora_salida);

    return (
        <AuthenticatedLayout title="Mi Asistencia">
            <div className="space-y-4">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#547da6]">
                            <span className="rounded bg-[#eaf1fa] px-1.5 py-0.5">Mi Espacio Personal</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">{employee?.user?.name}</span>
                        </p>
                        <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[25px]">
                            Registro de Asistencia y Jornada Diaria
                        </h1>
                        <p className="mt-1 text-[10px] text-slate-500">
                            Consulta tus horas de entrada y salida, puntualidad y reporte de tu jornada laboral.
                        </p>
                    </div>

                    {/* Clock-in / Clock-out Button */}
                    <div>
                        {!hasClockedIn ? (
                            <button
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                                disabled={clocking}
                                onClick={handleClock}
                                type="button"
                            >
                                <Icon className="h-4 w-4" name="clock" />
                                Marcar Entrada de Hoy
                            </button>
                        ) : !hasClockedOut ? (
                            <button
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
                                disabled={clocking}
                                onClick={handleClock}
                                type="button"
                            >
                                <Icon className="h-4 w-4" name="clock" />
                                Marcar Salida de Hoy
                            </button>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800">
                                <Icon className="h-4 w-4 text-emerald-600" name="check" />
                                Jornada de Hoy Completada
                            </span>
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

                {/* Today Status Widget */}
                <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <h2 className="text-xs font-bold text-slate-900">Estado de tu Jornada de Hoy ({today})</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
                        <div className="rounded-lg bg-slate-50 p-3">
                            <span className="block text-[9px] uppercase font-semibold text-slate-400">Hora de Entrada</span>
                            <span className="mt-1 block font-mono text-base font-bold text-slate-800">
                                {todayRecord?.hora_entrada ?? 'Pendiente de marcación'}
                            </span>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                            <span className="block text-[9px] uppercase font-semibold text-slate-400">Hora de Salida</span>
                            <span className="mt-1 block font-mono text-base font-bold text-slate-800">
                                {todayRecord?.hora_salida ?? (hasClockedIn ? 'En curso...' : 'Pendiente')}
                            </span>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                            <span className="block text-[9px] uppercase font-semibold text-slate-400">Estado</span>
                            <span className="mt-1 block font-semibold text-emerald-700">
                                {todayRecord?.estado ?? 'Sin registrar'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* History Table */}
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
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Entrada</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Salida</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Origen</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Observación</th>
                                        <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Retardo</th>
                                        <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Horas Extra</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {attendances.data.map((att) => (
                                        <tr className="hover:bg-[#f7faff]" key={att.id}>
                                            <td className="px-3 py-3 font-semibold text-[10px] text-slate-800">{att.fecha}</td>
                                            <td className="px-3 py-3 font-mono text-[10px] text-slate-700">{att.hora_entrada ?? '—'}</td>
                                            <td className="px-3 py-3 font-mono text-[10px] text-slate-700">{att.hora_salida ?? '—'}</td>
                                            <td className="px-3 py-3">
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-700">
                                                    {att.estado}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-[9px] text-slate-600">
                                                Entrada: {originLabel(att.origen_entrada)} · Salida: {originLabel(att.origen_salida)}
                                            </td>
                                            <td className="px-3 py-3 text-[9px] text-slate-600">{att.observaciones ?? '—'}</td>
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
                                description="No tienes registros de asistencia en el rango de fechas seleccionado."
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
