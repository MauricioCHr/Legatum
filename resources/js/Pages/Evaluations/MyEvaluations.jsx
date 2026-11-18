import EmptyState from '../../Components/EmptyState';
import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function MyEvaluations({ employee, evaluations, flash }) {
    function getScoreBadge(score) {
        if (!score) return <span className="text-xs text-slate-400">Sin calificar</span>;
        const val = parseFloat(score);
        if (val >= 4.5) {
            return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">{val.toFixed(2)} — Excelente</span>;
        }
        if (val >= 3.8) {
            return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">{val.toFixed(2)} — Sobresaliente</span>;
        }
        if (val >= 3.0) {
            return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">{val.toFixed(2)} — Aceptable</span>;
        }
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">{val.toFixed(2)} — Requiere Mejora</span>;
    }

    return (
        <AuthenticatedLayout>
            <div className="w-full min-w-0 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Mis Evaluaciones de Desempeño
                        </h1>
                        <p className="text-sm text-slate-500">
                            Historial de valoraciones, retroalimentación y compromisos de crecimiento laboral en Comercializadora Andina S.A.S.
                        </p>
                    </div>

                    <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                            {employee.name.charAt(0)}
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-900">{employee.name}</div>
                            <div className="text-[11px] text-slate-500">{employee.department} • {employee.position}</div>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                {flash?.success && (
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
                        <Icon name="check" className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
                        <Icon name="alert" className="w-5 h-5 text-rose-600 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* Evaluations List */}
                {evaluations.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                        <EmptyState
                            title="No tienes evaluaciones de desempeño registradas"
                            description="Cuando se abra un período y tu líder de área complete tu evaluación, podrás revisar tus resultados y recomendaciones aquí."
                        />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {evaluations.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                            >
                                {/* Period Card Header */}
                                <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                Período Evaluado
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-slate-200">
                                                {item.period_status}
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-bold mt-1">{item.period_name}</h2>
                                        <p className="text-xs text-slate-300 mt-0.5">
                                            Rango: {item.period_dates}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {item.estado === 'Completada' ? (
                                            <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/10 text-right">
                                                <div className="text-xs text-slate-300 font-medium">Resultado Obtenido</div>
                                                <div className="text-2xl font-black text-white mt-0.5">
                                                    {item.calificacion_final} <span className="text-sm font-normal text-slate-400">/ 5.00</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30">
                                                Evaluación en proceso
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-6 space-y-6">
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pb-4 border-b border-slate-100">
                                        <div>
                                            Líder evaluador: <span className="font-semibold text-slate-800">{item.evaluator_name}</span>
                                        </div>
                                        {item.fecha_evaluacion && (
                                            <div>
                                                Fecha de sustentación: <span className="font-semibold text-slate-800">{item.fecha_evaluacion}</span>
                                            </div>
                                        )}
                                        <div>
                                            Estado: {getScoreBadge(item.calificacion_final)}
                                        </div>
                                    </div>

                                    {item.estado === 'Completada' ? (
                                        <>
                                            {/* Criteria Breakdown */}
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900 mb-3">
                                                    Desglose de Competencias y Criterios Evaluados
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {item.scores.map((s, idx) => (
                                                        <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <div className="font-bold text-slate-900 text-sm">{s.criteria_name}</div>
                                                                    <div className="text-xs text-slate-500">{s.criteria_description}</div>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <span className="text-base font-black text-slate-900">{parseFloat(s.calificacion).toFixed(1)}</span>
                                                                    <span className="text-xs text-slate-400"> / 5.0</span>
                                                                    <div className="text-[10px] text-slate-400">Peso {s.peso}%</div>
                                                                </div>
                                                            </div>

                                                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                                <div
                                                                    className="bg-slate-900 h-1.5 rounded-full"
                                                                    style={{ width: `${(parseFloat(s.calificacion) / 5) * 100}%` }}
                                                                />
                                                            </div>

                                                            {s.comentarios && (
                                                                <div className="text-xs text-slate-600 italic bg-white p-2 rounded border border-slate-100">
                                                                    "{s.comentarios}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Observations */}
                                            {item.observaciones && (
                                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                                        Observaciones y Retroalimentación del Líder
                                                    </h4>
                                                    <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                                                        {item.observaciones}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Improvement commitments */}
                                            {item.compromisos_mejora && (
                                                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-1">
                                                        Compromisos y Plan de Crecimiento para el Siguiente Período
                                                    </h4>
                                                    <p className="text-sm text-blue-800 whitespace-pre-line leading-relaxed">
                                                        {item.compromisos_mejora}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-center text-amber-800 text-sm">
                                            Tu líder de área aún no ha registrado la calificación para este período. Una vez concertada y completada la evaluación, podrás consultar aquí el detalle de tus puntuaciones y retroalimentación.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
