import { useState } from 'react';
import { router } from '@inertiajs/react';
import EmptyState from '../../Components/EmptyState';
import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function Consolidated({
    periods,
    currentPeriod,
    consolidatedEmployees,
    totals,
    canConsolidate,
    flash,
}) {
    const [periodId, setPeriodId] = useState(currentPeriod?.id ? String(currentPeriod.id) : '');

    function handlePeriodChange(newId) {
        setPeriodId(newId);
        router.get('/nomina/periodos', { period_id: newId }, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function handleConsolidate() {
        if (!currentPeriod) return;
        if (!window.confirm(`¿Confirmas la consolidación y cierre de novedades para "${currentPeriod.nombre}"? Una vez consolidado, no se podrán modificar o registrar novedades y quedará listo para liquidación en Nómina.`)) {
            return;
        }
        router.post(`/nomina/periodos/${currentPeriod.id}/consolidar`);
    }

    return (
        <AuthenticatedLayout title="Consolidado de Nómina">
            <div className="space-y-4">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#547da6]">
                            <span className="rounded bg-[#eaf1fa] px-1.5 py-0.5">Área de Nómina &amp; Liquidación</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">Comercializadora Andina S.A.S.</span>
                        </p>
                        <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[25px]">
                            Consolidado de Novedades por Período
                        </h1>
                        <p className="mt-1 text-[10px] text-slate-500">
                            Resumen consolidado por colaborador para entrega y consulta del área de Nómina.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {canConsolidate && currentPeriod?.estado === 'Abierto' && (
                            <button
                                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3.5 py-2 text-[10px] font-semibold text-white shadow-sm hover:bg-emerald-800"
                                onClick={handleConsolidate}
                                type="button"
                            >
                                <Icon className="h-3.5 w-3.5" name="check" />
                                Consolidar y Cerrar Período
                            </button>
                        )}
                        {currentPeriod?.estado === 'Consolidado' && (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-800">
                                <Icon className="h-3.5 w-3.5 text-emerald-600" name="shield" />
                                Período Consolidado
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

                {/* Period Selector Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-700">Período a Consultar:</label>
                        <select
                            className="rounded-md border border-slate-200 bg-[#f8faff] px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                            onChange={(e) => handlePeriodChange(e.target.value)}
                            value={periodId}
                        >
                            {periods.map((p) => (
                                <option key={p.id} value={p.id}>{p.nombre} ({p.estado})</option>
                            ))}
                        </select>
                    </div>

                    {currentPeriod && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400">Vigencia:</span>
                            <span className="font-semibold text-slate-800">{currentPeriod.fecha_inicio} al {currentPeriod.fecha_fin}</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-400">Estado:</span>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                currentPeriod.estado === 'Consolidado' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                                {currentPeriod.estado}
                            </span>
                        </div>
                    )}
                </div>

                {/* Totals Summary */}
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Total Devengos</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-emerald-700">
                                ${totals.total_devengos.toLocaleString('es-CO')}
                            </span>
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Ingresos</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Total Deducciones</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-red-600">
                                ${totals.total_deducciones.toLocaleString('es-CO')}
                            </span>
                            <span className="rounded bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700">Descuentos</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Neto Novedades</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-[#547da6]">
                                ${totals.neto.toLocaleString('es-CO')}
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700">Balance</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <span className="text-[9px] font-semibold uppercase text-slate-400">Colaboradores con Novedad</span>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-slate-800">{totals.empleados_con_novedad}</span>
                            <span className="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700">Personas</span>
                        </div>
                    </div>
                </section>

                {/* Consolidated Table */}
                <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                    {consolidatedEmployees.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead className="bg-[#f3f6fb]">
                                    <tr>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Colaborador</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Documento / Área</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Conceptos Detallados</th>
                                        <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Devengos ($)</th>
                                        <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Deducciones ($)</th>
                                        <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Neto Novedades ($)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {consolidatedEmployees.map((row) => (
                                        <tr className="hover:bg-[#f7faff]" key={row.employee.id}>
                                            <td className="px-3 py-3">
                                                <span className="block text-[11px] font-bold text-slate-800">{row.employee.name}</span>
                                                <span className="text-[9px] text-[#547da6]">{row.employee.position}</span>
                                            </td>
                                            <td className="px-3 py-3 text-[10px] text-slate-600">
                                                <span className="block">{row.employee.document}</span>
                                                <span className="text-[9px] text-slate-400">{row.employee.department}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {row.concepts.map((c) => (
                                                        <span
                                                            className={`rounded px-1.5 py-0.5 text-[8px] font-medium ${
                                                                c.tipo === 'Devengo' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                                                            }`}
                                                            key={c.id}
                                                            title={`${c.name}: $${c.valor.toLocaleString('es-CO')}`}
                                                        >
                                                            {c.name} {c.cantidad ? `(${c.cantidad})` : ''}: ${c.valor.toLocaleString('es-CO')}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-right font-semibold text-[10px] text-emerald-700">
                                                ${row.devengos.toLocaleString('es-CO')}
                                            </td>
                                            <td className="px-3 py-3 text-right font-semibold text-[10px] text-red-600">
                                                ${row.deducciones.toLocaleString('es-CO')}
                                            </td>
                                            <td className="px-3 py-3 text-right font-bold text-[11px] text-slate-900">
                                                ${row.neto.toLocaleString('es-CO')}
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
                                description="No hay novedades registradas ni consolidadas para este período."
                                icon="layers"
                                title="Sin novedades en este período"
                            />
                        </div>
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
