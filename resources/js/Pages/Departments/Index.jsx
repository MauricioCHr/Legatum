import { useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import EmptyState from '../../Components/EmptyState';
import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function Index({
    departments,
    candidateManagers,
    filters,
    canManage,
    flash,
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState(null);

    const form = useForm({
        nombre: '',
        descripcion: '',
        jefe_id: '',
        is_active: true,
    });

    function openCreate() {
        setEditingDepartment(null);
        form.reset();
        form.clearErrors();
        form.setData({
            nombre: '',
            descripcion: '',
            jefe_id: '',
            is_active: true,
        });
        setModalOpen(true);
    }

    function openEdit(department) {
        setEditingDepartment(department);
        form.clearErrors();
        form.setData({
            nombre: department.nombre ?? '',
            descripcion: department.descripcion ?? '',
            jefe_id: department.jefe_id ? String(department.jefe_id) : '',
            is_active: Boolean(department.is_active),
        });
        setModalOpen(true);
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (editingDepartment) {
            form.put(`/departamentos/${editingDepartment.id}`, {
                onSuccess: () => setModalOpen(false),
            });
        } else {
            form.post('/departamentos', {
                onSuccess: () => setModalOpen(false),
            });
        }
    }

    function toggleStatus(department) {
        const action = department.is_active ? 'desactivar' : 'activar';
        if (!window.confirm(`¿Deseas ${action} el departamento "${department.nombre}"?`)) {
            return;
        }
        router.patch(`/departamentos/${department.id}/estado`);
    }

    function filterDepartments(e) {
        e.preventDefault();
        router.get('/departamentos', { search, status }, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function clearFilters() {
        setSearch('');
        setStatus('');
        router.get('/departamentos');
    }

    const previousPage = departments.links[0];
    const nextPage = departments.links[departments.links.length - 1];
    const pageLinks = departments.links.slice(1, -1);

    return (
        <AuthenticatedLayout title="Departamentos">
            <div className="space-y-4">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#547da6]">
                            <span className="rounded bg-[#eaf1fa] px-1.5 py-0.5">Catálogo Estructural</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">Comercializadora Andina S.A.S.</span>
                        </p>
                        <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[25px]">
                            Estructura de Departamentos
                        </h1>
                        <p className="mt-1 text-[10px] text-slate-500">
                            Gestión de áreas organizacionales, supervisores y distribución de cargos.
                        </p>
                    </div>

                    {canManage && (
                        <button
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#07152b] px-3.5 py-2 text-[10px] font-semibold text-white shadow-sm transition hover:bg-[#1a3150]"
                            onClick={openCreate}
                            type="button"
                        >
                            <Icon className="h-3.5 w-3.5" name="plus" />
                            Nuevo Departamento
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
                        className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-[minmax(200px,1.5fr)_minmax(140px,0.8fr)_auto] sm:items-center"
                        onSubmit={filterDepartments}
                    >
                        <label className="relative block">
                            <Icon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" name="search" />
                            <input
                                className="w-full rounded-md border border-slate-100 bg-[#f8faff] py-2 pl-8 pr-2 text-[10px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#7398bd]"
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar departamento por nombre o descripción"
                                type="search"
                                value={search}
                            />
                        </label>
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
                            {(filters.search || filters.status) && (
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

                    {departments.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="bg-[#f3f6fb]">
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Departamento</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Jefe de Área</th>
                                        <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Cargos</th>
                                        <th className="px-3 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-slate-500">Colaboradores</th>
                                        <th className="px-3 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                        <th className="px-3 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {departments.data.map((dept) => (
                                        <tr className="transition hover:bg-[#f7faff]" key={dept.id}>
                                            <td className="px-3 py-3">
                                                <span className="block text-[11px] font-semibold text-slate-800">{dept.nombre}</span>
                                                {dept.descripcion && (
                                                    <span className="mt-0.5 block max-w-sm truncate text-[9px] text-slate-500">{dept.descripcion}</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                {dept.manager ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#17243a] text-[8px] font-semibold text-white">
                                                            {dept.manager.user?.name?.slice(0, 1)}
                                                        </span>
                                                        <span className="text-[10px] font-medium text-slate-700">{dept.manager.user?.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] italic text-slate-400">Sin jefe asignado</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center text-[10px] font-semibold text-slate-700">
                                                {dept.positions_count}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <span className="inline-flex items-center justify-center rounded-full bg-[#eaf1fa] px-2 py-0.5 text-[9px] font-semibold text-[#426b95]">
                                                    {dept.employees_count}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ${
                                                    dept.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${dept.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                    {dept.is_active ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                {canManage && (
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#426b95]"
                                                            onClick={() => openEdit(dept)}
                                                            title="Editar departamento"
                                                            type="button"
                                                        >
                                                            <Icon className="h-3.5 w-3.5" name="edit" />
                                                        </button>
                                                        <button
                                                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#426b95]"
                                                            onClick={() => toggleStatus(dept)}
                                                            title={dept.is_active ? 'Desactivar departamento' : 'Activar departamento'}
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
                                description="No se encontraron departamentos registrados o que coincidan con la búsqueda."
                                icon="building"
                                title="Sin departamentos"
                            />
                        </div>
                    )}

                    {departments.last_page > 1 && (
                        <nav aria-label="Paginación de departamentos" className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[9px]">
                            <span className="text-slate-500">Mostrando {departments.from}–{departments.to} de {departments.total}</span>
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
                                {editingDepartment ? 'Editar Departamento' : 'Nuevo Departamento'}
                            </h2>
                            <button className="text-slate-400 hover:text-slate-600" onClick={() => setModalOpen(false)} type="button">
                                <Icon className="h-4 w-4" name="close" />
                            </button>
                        </div>

                        <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Nombre del departamento *</label>
                                <input
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#547da6]"
                                    onChange={(e) => form.setData('nombre', e.target.value)}
                                    placeholder="Ej: Distribución y Logística"
                                    required
                                    type="text"
                                    value={form.data.nombre}
                                />
                                {form.errors.nombre && <p className="mt-0.5 text-[9px] text-red-600">{form.errors.nombre}</p>}
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Jefe de Área (Supervisor)</label>
                                <select
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#547da6]"
                                    onChange={(e) => form.setData('jefe_id', e.target.value)}
                                    value={form.data.jefe_id}
                                >
                                    <option value="">-- Sin jefe asignado --</option>
                                    {candidateManagers.map((emp) => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                                {form.errors.jefe_id && <p className="mt-0.5 text-[9px] text-red-600">{form.errors.jefe_id}</p>}
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-slate-700">Descripción</label>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#547da6]"
                                    onChange={(e) => form.setData('descripcion', e.target.value)}
                                    placeholder="Funciones y alcance del área..."
                                    rows={3}
                                    value={form.data.descripcion}
                                />
                                {form.errors.descripcion && <p className="mt-0.5 text-[9px] text-red-600">{form.errors.descripcion}</p>}
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    checked={form.data.is_active}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#547da6]"
                                    id="dept_active"
                                    onChange={(e) => form.setData('is_active', e.target.checked)}
                                    type="checkbox"
                                />
                                <label className="text-[10px] text-slate-700" htmlFor="dept_active">
                                    Departamento activo en la organización
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
                                    {editingDepartment ? 'Guardar Cambios' : 'Crear Departamento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
