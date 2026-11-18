import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import EmptyState from '../../Components/EmptyState';
import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function Index({
    periods,
    currentPeriod,
    evaluations,
    criteria,
    departments,
    stats,
    periodComparison,
    isJefe,
    managedDepartment,
    canManagePeriods,
    canEvaluate,
    filters,
    flash,
}) {
    const [periodId, setPeriodId] = useState(filters.period_id ?? '');
    const [departmentId, setDepartmentId] = useState(filters.department_id ?? '');
    const [status, setStatus] = useState(filters.estado ?? '');

    // Modals
    const [createPeriodModal, setCreatePeriodModal] = useState(false);
    const [detailModal, setDetailModal] = useState({ open: false, eval: null });
    const [evalModal, setEvalModal] = useState({ open: false, eval: null });

    // Period creation form
    const periodForm = useForm({
        nombre: '',
        descripcion: '',
        fecha_inicio: '',
        fecha_fin: '',
        estado: 'Abierto',
        auto_assign_active_employees: true,
    });

    // Evaluation scoring form
    const [evalScores, setEvalScores] = useState({});
    const [evalComments, setEvalComments] = useState({});
    const [generalObs, setGeneralObs] = useState('');
    const [commitments, setCommitments] = useState('');
    const [evalSubmitting, setEvalSubmitting] = useState(false);

    function openEvaluationModal(item) {
        // Initialize scores with existing scores if any, or 4.0 default
        const initialScores = {};
        const initialComments = {};
        criteria.forEach(c => {
            const existing = item.scores?.find(s => s.criteria_id === c.id);
            initialScores[c.id] = existing ? existing.calificacion : 4.0;
            initialComments[c.id] = existing ? (existing.comentarios || '') : '';
        });
        setEvalScores(initialScores);
        setEvalComments(initialComments);
        setGeneralObs(item.observaciones || '');
        setCommitments(item.compromisos_mejora || '');
        setEvalModal({ open: true, eval: item });
    }

    function calculatePreviewScore() {
        let totalWeight = 0;
        let weightedSum = 0;
        criteria.forEach(c => {
            const weight = parseFloat(c.peso) || 1.0;
            const score = parseFloat(evalScores[c.id]) || 0;
            totalWeight += weight;
            weightedSum += score * weight;
        });
        return totalWeight > 0 ? (weightedSum / totalWeight).toFixed(2) : '0.00';
    }

    function handleEvaluationSubmit(e) {
        e.preventDefault();
        setEvalSubmitting(true);

        const payloadScores = criteria.map(c => ({
            criteria_id: c.id,
            calificacion: parseFloat(evalScores[c.id]) || 3.0,
            comentarios: evalComments[c.id] || null,
        }));

        router.post(`/evaluaciones/${evalModal.eval.id}/calificar`, {
            scores: payloadScores,
            observaciones: generalObs,
            compromisos_mejora: commitments,
        }, {
            onSuccess: () => {
                setEvalModal({ open: false, eval: null });
                setEvalSubmitting(false);
            },
            onError: () => setEvalSubmitting(false),
        });
    }

    function handlePeriodSubmit(e) {
        e.preventDefault();
        periodForm.post('/evaluaciones/periodos', {
            onSuccess: () => {
                setCreatePeriodModal(false);
                periodForm.reset();
            },
        });
    }

    function handleTogglePeriodStatus(newStatus) {
        if (!currentPeriod) return;
        if (confirm(`¿Estás seguro de cambiar el estado del período a '${newStatus}'?`)) {
            router.patch(`/evaluaciones/periodos/${currentPeriod.id}/estado`, {
                estado: newStatus,
            });
        }
    }

    function handleFilter(e) {
        e.preventDefault();
        router.get('/evaluaciones', {
            period_id: periodId,
            department_id: departmentId,
            estado: status,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function clearFilter() {
        setPeriodId('');
        setDepartmentId('');
        setStatus('');
        router.get('/evaluaciones');
    }

    function getScoreBadge(score) {
        if (!score) return <span className="text-xs text-slate-400">Sin calificar</span>;
        const val = parseFloat(score);
        if (val >= 4.5) {
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">{val.toFixed(2)} — Excelente</span>;
        }
        if (val >= 3.8) {
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">{val.toFixed(2)} — Sobresaliente</span>;
        }
        if (val >= 3.0) {
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">{val.toFixed(2)} — Aceptable</span>;
        }
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">{val.toFixed(2)} — Requiere Mejora</span>;
    }

    return (
        <AuthenticatedLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Evaluaciones de Desempeño
                        </h1>
                        <p className="text-sm text-slate-500">
                            {isJefe
                                ? `Gestión de evaluaciones de los colaboradores del área: ${managedDepartment || 'Mi equipo'}`
                                : 'Seguimiento por competencias, criterios y cumplimiento de metas en Comercializadora Andina S.A.S.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {canManagePeriods && (
                            <button
                                type="button"
                                onClick={() => setCreatePeriodModal(true)}
                                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition"
                            >
                                <Icon name="plus" className="w-4 h-4" />
                                Nuevo período
                            </button>
                        )}
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

                {/* Current Period Control Banner */}
                {currentPeriod ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Período en consulta
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                        currentPeriod.estado === 'Abierto'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : currentPeriod.estado === 'Cerrado'
                                            ? 'bg-slate-100 text-slate-700'
                                            : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {currentPeriod.estado}
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 mt-1">
                                    {currentPeriod.nombre}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {currentPeriod.descripcion || 'Sin descripción'} • Vigencia: {currentPeriod.fecha_inicio} al {currentPeriod.fecha_fin}
                                </p>
                            </div>

                            {canManagePeriods && (
                                <div className="flex items-center gap-2">
                                    {currentPeriod.estado === 'Borrador' && (
                                        <button
                                            type="button"
                                            onClick={() => handleTogglePeriodStatus('Abierto')}
                                            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                                        >
                                            Abrir período
                                        </button>
                                    )}
                                    {currentPeriod.estado === 'Abierto' && (
                                        <button
                                            type="button"
                                            onClick={() => handleTogglePeriodStatus('Cerrado')}
                                            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
                                        >
                                            Cerrar período
                                        </button>
                                    )}
                                    {currentPeriod.estado === 'Cerrado' && (
                                        <button
                                            type="button"
                                            onClick={() => handleTogglePeriodStatus('Abierto')}
                                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                                        >
                                            Reabrir período
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Metric Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100">
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <span className="text-xs font-medium text-slate-500">Total a evaluar</span>
                                <p className="text-xl font-bold text-slate-900 mt-1">{stats.total}</p>
                            </div>
                            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                                <span className="text-xs font-medium text-emerald-700">Completadas</span>
                                <p className="text-xl font-bold text-emerald-700 mt-1">{stats.completadas}</p>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                                <span className="text-xs font-medium text-amber-700">Pendientes</span>
                                <p className="text-xl font-bold text-amber-700 mt-1">{stats.pendientes}</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                <span className="text-xs font-medium text-blue-700">Promedio general</span>
                                <p className="text-xl font-bold text-blue-700 mt-1">
                                    {stats.promedio > 0 ? `${stats.promedio} / 5.00` : '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                        No hay períodos de evaluación registrados. Crea un período para habilitar las evaluaciones de desempeño.
                    </div>
                )}

                {/* Filter Bar */}
                <form onSubmit={handleFilter} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Período</label>
                        <select
                            value={periodId}
                            onChange={(e) => setPeriodId(e.target.value)}
                            className="w-full text-sm rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                        >
                            {periods.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre} ({p.estado})</option>
                            ))}
                        </select>
                    </div>

                    {!isJefe && (
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Departamento</label>
                            <select
                                value={departmentId}
                                onChange={(e) => setDepartmentId(e.target.value)}
                                className="w-full text-sm rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                            >
                                <option value="">Todos los departamentos</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>{d.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="w-40">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full text-sm rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                        >
                            <option value="">Todos</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="Completada">Completada</option>
                        </select>
                    </div>

                    <div className="flex items-end gap-2 pt-5">
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
                        >
                            Filtrar
                        </button>
                        <button
                            type="button"
                            onClick={clearFilter}
                            className="px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                            Limpiar
                        </button>
                    </div>
                </form>

                {/* Evaluations Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {evaluations.length === 0 ? (
                        <EmptyState
                            title="No hay evaluaciones registradas en este período"
                            description="Selecciona otro período o asigna colaboradores para evaluar."
                            actionLabel={canManagePeriods ? 'Crear período' : undefined}
                            onAction={canManagePeriods ? () => setCreatePeriodModal(true) : undefined}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">Colaborador</th>
                                        <th className="py-3 px-4">Departamento / Cargo</th>
                                        <th className="py-3 px-4">Evaluador</th>
                                        <th className="py-3 px-4 text-center">Calificación</th>
                                        <th className="py-3 px-4 text-center">Estado</th>
                                        <th className="py-3 px-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {evaluations.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/75 transition">
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-slate-900">{item.employee_name}</div>
                                                <div className="text-xs text-slate-400">CC {item.employee_document}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="text-slate-800">{item.department}</div>
                                                <div className="text-xs text-slate-400">{item.position}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-xs text-slate-700">{item.evaluator_name}</span>
                                                {item.fecha_evaluacion && (
                                                    <div className="text-[11px] text-slate-400">{item.fecha_evaluacion}</div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {getScoreBadge(item.calificacion_final)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    item.estado === 'Completada'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {item.estado}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right space-x-2">
                                                {item.estado === 'Pendiente' && canEvaluate && currentPeriod?.estado === 'Abierto' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openEvaluationModal(item)}
                                                        className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
                                                    >
                                                        Calificar
                                                    </button>
                                                )}
                                                {item.estado === 'Completada' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setDetailModal({ open: true, eval: item })}
                                                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                                                    >
                                                        Ver detalle
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Period Comparison Card */}
                {periodComparison && periodComparison.length > 1 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <Icon name="chart" className="w-5 h-5 text-slate-500" />
                            Comparativa Histórica entre Períodos
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="py-2.5 px-3">Período</th>
                                        <th className="py-2.5 px-3 text-center">Estado</th>
                                        <th className="py-2.5 px-3 text-center">Evaluaciones</th>
                                        <th className="py-2.5 px-3 text-center">Completadas</th>
                                        <th className="py-2.5 px-3 text-center">Promedio General</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {periodComparison.map(p => (
                                        <tr key={p.id}>
                                            <td className="py-2.5 px-3 font-medium text-slate-900">{p.nombre}</td>
                                            <td className="py-2.5 px-3 text-center">
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                                                    {p.estado}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">{p.total}</td>
                                            <td className="py-2.5 px-3 text-center">{p.completadas}</td>
                                            <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                                                {p.promedio > 0 ? `${p.promedio} / 5.00` : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Calificar Evaluación */}
            {evalModal.open && evalModal.eval && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto my-8">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Calificar Evaluación de Desempeño
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {evalModal.eval.employee_name} • {evalModal.eval.department} ({evalModal.eval.position})
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEvalModal({ open: false, eval: null })}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <Icon name="x" className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Live Score Banner */}
                        <div className="my-4 p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                            <div>
                                <span className="text-xs text-slate-300 font-medium uppercase tracking-wider">
                                    Puntaje Ponderado en Tiempo Real
                                </span>
                                <div className="text-2xl font-black mt-0.5">
                                    {calculatePreviewScore()} <span className="text-sm font-normal text-slate-400">/ 5.00</span>
                                </div>
                            </div>
                            <div className="text-right text-xs text-slate-300 max-w-xs">
                                Escala: 1.0 (Bajo) a 5.0 (Excelente). La calificación final pondera automáticamente los porcentajes institucionales.
                            </div>
                        </div>

                        <form onSubmit={handleEvaluationSubmit} className="space-y-6">
                            {/* Criteria List */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-800">
                                    Criterios de Evaluación por Competencias
                                </h4>
                                {criteria.map((c) => (
                                    <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-900 text-sm">{c.nombre}</span>
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700">
                                                        Peso: {parseFloat(c.peso)}%
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5">{c.descripcion}</p>
                                            </div>
                                            <div className="w-24 text-right shrink-0">
                                                <span className="text-lg font-black text-slate-900">
                                                    {parseFloat(evalScores[c.id] || 0).toFixed(1)}
                                                </span>
                                                <span className="text-xs text-slate-400"> / 5.0</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <input
                                                type="range"
                                                min="1.0"
                                                max="5.0"
                                                step="0.1"
                                                value={evalScores[c.id] || 4.0}
                                                onChange={(e) => setEvalScores(prev => ({ ...prev, [c.id]: e.target.value }))}
                                                className="w-full accent-slate-900 h-2 bg-slate-200 rounded-lg cursor-pointer"
                                            />
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="Comentario u observación puntual para este criterio (opcional)"
                                            value={evalComments[c.id] || ''}
                                            onChange={(e) => setEvalComments(prev => ({ ...prev, [c.id]: e.target.value }))}
                                            className="w-full text-xs rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* General Observations */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Observaciones Generales del Evaluador
                                </label>
                                <textarea
                                    rows="3"
                                    placeholder="Fortalezas demostradas, logros del período, actitud..."
                                    value={generalObs}
                                    onChange={(e) => setGeneralObs(e.target.value)}
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                                />
                            </div>

                            {/* Improvement Commitments */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Compromisos y Plan de Mejora Concertado
                                </label>
                                <textarea
                                    rows="3"
                                    placeholder="Metas de aprendizaje, optimizaciones operativas para el próximo período..."
                                    value={commitments}
                                    onChange={(e) => setCommitments(e.target.value)}
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setEvalModal({ open: false, eval: null })}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={evalSubmitting}
                                    className="px-5 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition disabled:opacity-50"
                                >
                                    {evalSubmitting ? 'Guardando...' : 'Completar y Guardar Evaluación'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Ver Detalle de Evaluación */}
            {detailModal.open && detailModal.eval && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Resultado de Evaluación de Desempeño
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {detailModal.eval.employee_name} • {detailModal.eval.department}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetailModal({ open: false, eval: null })}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <Icon name="x" className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-5 my-5">
                            {/* Score banner */}
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                                <div>
                                    <span className="text-xs text-slate-500 font-medium">Calificación Final</span>
                                    <div className="text-2xl font-black text-slate-900 mt-0.5">
                                        {detailModal.eval.calificacion_final} / 5.00
                                    </div>
                                    <div className="mt-1">
                                        {getScoreBadge(detailModal.eval.calificacion_final)}
                                    </div>
                                </div>
                                <div className="text-right text-xs text-slate-500">
                                    <div>Evaluado por: <span className="font-semibold text-slate-800">{detailModal.eval.evaluator_name}</span></div>
                                    <div>Fecha: <span className="text-slate-700">{detailModal.eval.fecha_evaluacion}</span></div>
                                </div>
                            </div>

                            {/* Scores list */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Detalle por Criterios
                                </h4>
                                {detailModal.eval.scores?.map((s, idx) => (
                                    <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-white shadow-xs">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-semibold text-slate-800">{s.criteria_name}</span>
                                            <span className="font-bold text-slate-900">{parseFloat(s.calificacion).toFixed(1)} / 5.0</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                                            <div
                                                className="bg-slate-900 h-1.5 rounded-full"
                                                style={{ width: `${(parseFloat(s.calificacion) / 5) * 100}%` }}
                                            />
                                        </div>
                                        {s.comentarios && (
                                            <p className="text-xs text-slate-500 italic mt-2">"{s.comentarios}"</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Observations */}
                            {detailModal.eval.observaciones && (
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <h5 className="text-xs font-bold text-slate-700 mb-1">Observaciones del evaluador</h5>
                                    <p className="text-sm text-slate-600 whitespace-pre-line">{detailModal.eval.observaciones}</p>
                                </div>
                            )}

                            {/* Commitments */}
                            {detailModal.eval.compromisos_mejora && (
                                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                                    <h5 className="text-xs font-bold text-blue-900 mb-1">Compromisos y plan de mejora</h5>
                                    <p className="text-sm text-blue-800 whitespace-pre-line">{detailModal.eval.compromisos_mejora}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setDetailModal({ open: false, eval: null })}
                                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Crear Período */}
            {createPeriodModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">
                                Nuevo Período de Evaluación
                            </h3>
                            <button
                                type="button"
                                onClick={() => setCreatePeriodModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <Icon name="x" className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handlePeriodSubmit} className="space-y-4 my-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Nombre del período</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Evaluación Anual 2026 - II Semestre"
                                    value={periodForm.data.nombre}
                                    onChange={(e) => periodForm.setData('nombre', e.target.value)}
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                                />
                                {periodForm.errors.nombre && <p className="text-xs text-rose-500 mt-1">{periodForm.errors.nombre}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Descripción / Objetivos</label>
                                <textarea
                                    rows="2"
                                    placeholder="Alcance, lineamientos o instrucciones para los evaluadores..."
                                    value={periodForm.data.descripcion}
                                    onChange={(e) => periodForm.setData('descripcion', e.target.value)}
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Fecha de inicio</label>
                                    <input
                                        type="date"
                                        required
                                        value={periodForm.data.fecha_inicio}
                                        onChange={(e) => periodForm.setData('fecha_inicio', e.target.value)}
                                        className="w-full text-sm rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                                    />
                                    {periodForm.errors.fecha_inicio && <p className="text-xs text-rose-500 mt-1">{periodForm.errors.fecha_inicio}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Fecha de finalización</label>
                                    <input
                                        type="date"
                                        required
                                        value={periodForm.data.fecha_fin}
                                        onChange={(e) => periodForm.setData('fecha_fin', e.target.value)}
                                        className="w-full text-sm rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                                    />
                                    {periodForm.errors.fecha_fin && <p className="text-xs text-rose-500 mt-1">{periodForm.errors.fecha_fin}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Estado inicial</label>
                                <select
                                    value={periodForm.data.estado}
                                    onChange={(e) => periodForm.setData('estado', e.target.value)}
                                    className="w-full text-sm rounded-lg border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                                >
                                    <option value="Abierto">Abierto (Listo para calificar)</option>
                                    <option value="Borrador">Borrador (Solo configuración)</option>
                                </select>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={periodForm.data.auto_assign_active_employees}
                                        onChange={(e) => periodForm.setData('auto_assign_active_employees', e.target.checked)}
                                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                                    />
                                    <span className="text-xs text-slate-700 font-medium">
                                        Crear automáticamente la ficha de evaluación pendiente para todos los empleados activos
                                    </span>
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setCreatePeriodModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={periodForm.processing}
                                    className="px-5 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition disabled:opacity-50"
                                >
                                    {periodForm.processing ? 'Creando...' : 'Crear Período'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
