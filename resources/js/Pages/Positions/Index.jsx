import { useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import EmptyState from '../../Components/EmptyState';
import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function Index({
    positions,
    departments,
    filters,
    canManage,
    flash,
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [departmentId, setDepartmentId] = useState(filters.departamento_id ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPosition, setEditingPosition] = useState(null);

    const form = useForm({
        nombre: '',
        departamento_id: '',
        descripcion: '',
        is_active: true,
    });

    function openCreate() {
        setEditingPosition(null);
        form.reset();
        form.clearErrors();
        form.setData({
            nombre: '',
            departamento_id: '',
            descripcion: '',
            is_active: true,
        });
        setModalOpen(true);
    }

    function openEdit(position) {
        setEditingPosition(position);
        form.clearErrors();
        form.setData({
            nombre: position.nombre ?? '',
            departamento_id: position.departamento_id ? String(position.departamento_id) : '',
            descripcion: position.descripcion ?? '',
            is_active: Boolean(position.is_active),
        });
        setModalOpen(true);
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (editingPosition) {
            form.put(`/cargos/${editingPosition.id}`, {
                onSuccess: () => setModalOpen(false),
            });
        } else {
            form.post('/cargos', {
                onSuccess: () => setModalOpen(false),
            });
        }
    }

    function toggleStatus(position) {
        const action = position.is_active ? 'desactivar' : 'activar';
        if (!window.confirm(`¿Deseas ${action} el cargo "${position.nombre}"?`)) {
            return;
        }
        router.patch(`/cargos/${position.id}/estado`);
    }

    function filterPositions(e) {
        e.preventDefault();
        router.get('/cargos', { search, departamento_id: departmentId, status }, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function clearFilters() {
        setSearch('');
        setDepartmentId('');
        setStatus('');
        router.get('/cargos');
    }

    const previousPage = positions.links[0];
    const nextPage = positions.links[positions.links.length - 1];
    const pageLinks = positions.links.slice(1, -1);

    return (
        <AuthenticatedLayout title="Cargos">
            <div className="space-y-4">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#547da6]">
                            <span className="rounded bg-[#eaf1fa] px-1.5 py-0.5">Catálogo Estructural</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">Comercializadora Andina S.A.S.</span>
                        </p>
                        <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[25px]">
                            Cargos y Perfiles Laborales
                        </h1>
                        <p className="mt-1 text-[10px] text-slate-500">
                            Definición de posiciones de trabajo, vinculación con departamentos y colaboradores asignados.
                        </p>
                    </div>

                    {canManage && (
                        <button
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#07152b] px-3.5 py-2 text-[10px] font-semibold text-white shadow-sm transition hover:bg-[#1a3150]"
                            onClick={openCreate}
                            type="button"
                        >
                            <Icon className="h-3.5 w-3.5" name="plus" />
                            Nuevo Cargo
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

                <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm shadow-slate-900/[0.03]">
                    <form
                        className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-[minmax(180px,1.4fr)_minmax(140px,1fr)_minmax(120px,0.7fr)_auto] sm:items-center"
                        onSubmit={filterPositions}
                    >
                        <label className="relative block">
                            <Icon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" name="search" />
                            <input
                                className="w-full rounded-md border border-slate-100 bg-[#f8faff] py-2 pl-8 pr-2 text-[10px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#7398bd]"
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar cargo por nombre o descripción"
                                type="search"
                                value={search}
                            />
                        </label>
                        <select
                            className="rounded-md border border-slate-100 bg-[#f8faff] px-2 py-2 text-[10px] text-slate-700 outline-none"
                            onChange={(e) => setDepartmentId(e.target.value)}
                            value={departmentId}
                        >
                            <option value="">Departamento: Todos</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>{d.nombre}</option>
                            ))}
                        </select>
                        <select
                            className="rounded-md border border-slate-100 bg-[#f8faff] px-2 py-2 text-[10px] text-slate-700 outline-none"
                            onChange={(e) => setStatus(e.target.value)}
                            value={status}
                        >
                            <option value="">Estado: Todos</option>
                            <option value="1">Activo</option>
                            <option value="0">Inactivo</option>
                        </select>
                        <div className="flex gap-1.5">
                            <button
                                className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-[#eaf1fa] px-3 text-[10px] font-medium text-[#52789f] hover:bg-[#dce8f6]"
                                type="submit"
                            >
                                <Icon className="h-3.5 w-3.5" name="filter" />
                                Filtrar
                            </button>
                            {(filters.search || filters.departamento_id || filters.status) && (
                                <button
                                    className="rounded-md px-2 text-[10px] text-slate-500 hover:bg-slate-100"
                                    onClick={clearFilters}
                                    type="button"
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </form>

                    {positions.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="bg-[#f3f6fb]">
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Cargo</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Departamento</th>
                                        <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Colaboradores</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                        <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {positions.data.map((pos) => (
                                        <tr className="transition hover:bg-[#f7faff]" key={pos.id}>
                                            <td className="px-3 py-3">
                                                <span className="block text-[11px] font-semibold text-slate-800">{pos.nombre}</span>
                                                {pos.descripcion && (
                                                    <span className="mt-0.5 block max-w-sm truncate text-[9px] text-slate-500">{pos.descripcion}</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                {pos.department ? (
                                                    <span className="inline-flex items-center gap-1 rounded bg-[#eef4fc] px-2 py-0.5 text-[9px] font-medium text-[#416b94]">
                                                        {pos.department.nombre}
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] italic text-slate-400">Sin departamento</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <span className="inline-flex items-center justify-center rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[9px] font-semibold text-slate-700">
                                                    {pos.employees_count}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ${
                                                    pos.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${pos.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                    {pos.is_active ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                {canManage && (
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#426b95]"
                                                            onClick={() => openEdit(pos)}
                                                            title="Editar cargo"
                                                            type="button"
                                                        >
                                                            <Icon className="h-3.5 w-3.5" name="edit" />
                                                        </button>
                                                        <button
                                                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#426b95]"
                                                            onClick={() => toggleStatus(pos)}
                                                            title={pos.is_active ? 'Desactivar cargo' : 'Activar cargo'}
                                                            type="button"
                                                        >
                                                            <Icon className="h-3.5 w-3.5" name="power" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-6">
                            <EmptyState
                                compact
                                description="No se encontraron cargos registrados o que coincidan con los filtros."
                                icon="briefcase"
                                title="Sin cargos"
                            />
                        </div>
                    )}

                    {positions.last_page > 1 && (
                        <nav aria-label="Paginación de cargos" className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[9px]">
                            <span className="text-slate-500">Mostrando {positions.from}–{positions.to} de {positions.total}</span>
                            <div className="flex gap-1">
                                {previousPage?.url && (
                                    <Link className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100" href={previousPage.url}>Anterior</Link>
                                )}
                                {pageLinks.map((p, idx) => p.url ? (
                                    <Link
                                        className={`rounded px-2 py-1 ${p.active ? 'bg-[#17243a] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                        href={p.url}
                                        key={idx}
                                    >
                                        {p.label}
                                    </Link>
                                ) : null)}
                                {nextPage?.url && (
                                    <Link className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100" href={nextPage.url}>Siguiente</Link>
                                )}
                            </div>
                        </nav>
                    )}
                </section>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-bold text-slate-900">
                                {editingPosition ? 'Editar Cargo' : 'Nuevo Cargo'}
                            </h2>
                            <button className="text-slate-400 hover:text-slate-600" onClick={() => setModalOpen(false)} type="button">
                                <Icon className="h-4 w-4" name="close" />
                            </button>
                        </div>

                        <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Nombre del cargo *</label>
                                <input
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#547da6]"
                                    onChange={(e) => form.setData('nombre', e.target.value)}
                                    placeholder="Ej: Asesor Comercial de Ventas"
                                    required
                                    type="text"
                                    value={form.data.nombre}
                                />
                                {form.errors.nombre && <p className="mt-0.5 text-[9px] text-red-600">{form.errors.nombre}</p>}
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Departamento correspondiente</label>
                                <select
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#547da6]"
                                    onChange={(e) => form.setData('departamento_id', e.target.value)}
                                    value={form.data.departamento_id}
                                >
                                    <option value="">-- Sin departamento específico --</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>{d.nombre}</option>
                                    ))}
                                </select>
                                {form.errors.departamento_id && <p className="mt-0.5 text-[9px] text-red-600">{form.errors.departamento_id}</p>}
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Descripción o responsabilidades</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#547da6]"
                                    onChange={(e) => form.setData('descripcion', e.target.value)}
                                    placeholder="Funciones clave y perfil requerido..."
                                    rows={3}
                                    value={form.data.descripcion}
                                />
                                {form.errors.descripcion && <p className="mt-0.5 text-[9px] text-red-600">{form.errors.descripcion}</p>}
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    checked={form.data.is_active}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#547da6]"
                                    id="pos_active"
                                    onChange={(e) => form.setData('is_active', e.target.checked)}
                                    type="checkbox"
                                />
                                <label className="text-[10px] text-slate-700" htmlFor="pos_active">
                                    Cargo activo en la estructura laboral
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                                <button
                                    className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                                    onClick={() => setModalOpen(false)}
                                    type="button"
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="rounded-md bg-[#07152b] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1a3150] disabled:opacity-50"
                                    disabled={form.processing}
                                    type="submit"
                                >
                                    {editingPosition ? 'Guardar Cambios' : 'Crear Cargo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
