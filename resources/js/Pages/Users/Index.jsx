import { useEffect, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import DeleteUserDialog from '../../Components/DeleteUserDialog';
import Icon from '../../Components/Icon';
import UserFormModal from '../../Components/UserFormModal';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

function StatusBadge({ isActive }) {
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            isActive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-500'
        }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {isActive ? 'Activa' : 'Inactiva'}
        </span>
    );
}

export default function Index({ auth, users, roles, filters, flash }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [roleId, setRoleId] = useState(filters.role_id?.toString() ?? '');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [deletingUser, setDeletingUser] = useState(null);
    const deleteForm = useForm({});
    const userId = auth?.user?.id;

    useEffect(() => {
        setSearch(filters.search ?? '');
        setRoleId(filters.role_id?.toString() ?? '');
    }, [filters]);

    function filterUsers(event) {
        event.preventDefault();
        router.get('/usuarios', { search, role_id: roleId }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    function clearFilters() {
        setSearch('');
        setRoleId('');
        router.get('/usuarios', {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    function openCreateForm() {
        setEditingUser(null);
        setIsFormOpen(true);
    }

    function openEditForm(user) {
        setEditingUser(user);
        setIsFormOpen(true);
    }

    function closeForm() {
        setIsFormOpen(false);
        setEditingUser(null);
    }

    function deleteUser() {
        deleteForm.delete(`/usuarios/${deletingUser.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingUser(null),
        });
    }

    const previousPage = users.links[0];
    const nextPage = users.links[users.links.length - 1];
    const pageLinks = users.links.slice(1, -1);

    return (
        <AuthenticatedLayout title="Gestión de usuarios">
            <div className="space-y-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#92713a]">
                            Administración
                        </p>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                            Gestión de usuarios
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Administra las cuentas, roles y estados de acceso al sistema.
                        </p>
                    </div>
                    <button
                        className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-[#17243a] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#243551]"
                        onClick={openCreateForm}
                        type="button"
                    >
                        <Icon className="h-4 w-4" name="plus" />
                        Nuevo usuario
                    </button>
                </header>

                {flash?.success && (
                    <div aria-live="polite" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" name="check" />
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div aria-live="assertive" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" name="alert" />
                        {flash.error}
                    </div>
                )}

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
                    <form
                        className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-end sm:p-5"
                        onSubmit={filterUsers}
                    >
                        <div className="min-w-0 flex-1">
                            <label className="mb-1.5 block text-xs font-medium text-slate-600" htmlFor="user-search">
                                Buscar usuario
                            </label>
                            <div className="relative">
                                <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" name="search" />
                                <input
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#b99551] focus:ring-4 focus:ring-[#d7b26d]/15"
                                    id="user-search"
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Nombre o correo electrónico"
                                    type="search"
                                    value={search}
                                />
                            </div>
                        </div>
                        <div className="sm:w-56">
                            <label className="mb-1.5 block text-xs font-medium text-slate-600" htmlFor="role-filter">
                                Filtrar por rol
                            </label>
                            <select
                                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#b99551] focus:ring-4 focus:ring-[#d7b26d]/15"
                                id="role-filter"
                                onChange={(event) => setRoleId(event.target.value)}
                                value={roleId}
                            >
                                <option value="">Todos los roles</option>
                                {roles.map((role) => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:flex-none"
                                type="submit"
                            >
                                <Icon className="h-4 w-4" name="filter" />
                                Filtrar
                            </button>
                            {(filters.search || filters.role_id) && (
                                <button
                                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                                    onClick={clearFilters}
                                    type="button"
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <h2 className="text-sm font-semibold text-slate-800">Cuentas registradas</h2>
                        <p className="text-xs text-slate-500">
                            {users.total} {users.total === 1 ? 'usuario' : 'usuarios'}
                        </p>
                    </div>

                    {users.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] border-collapse text-left">
                                <thead>
                                    <tr className="border-y border-slate-100 bg-slate-50/70">
                                        <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Usuario</th>
                                        <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Rol asignado</th>
                                        <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                        <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.data.map((user) => (
                                        <tr className="transition hover:bg-slate-50/60" key={user.id}>
                                            <td className="px-5 py-4">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#17243a]/[0.06] text-sm font-semibold text-[#17243a]">
                                                        {user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-sm font-medium text-slate-800">{user.name}</span>
                                                        <span className="mt-0.5 block truncate text-xs text-slate-500">{user.email}</span>
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {user.role?.name ?? 'Sin rol asignado'}
                                            </td>
                                            <td className="px-5 py-4">
                                                <StatusBadge isActive={user.is_active} />
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-1.5">
                                                    <button
                                                        aria-label={`Editar ${user.name}`}
                                                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                                                        onClick={() => openEditForm(user)}
                                                        title="Editar usuario"
                                                        type="button"
                                                    >
                                                        <Icon className="h-4 w-4" name="edit" />
                                                    </button>
                                                    <button
                                                        aria-label={`Eliminar ${user.name}`}
                                                        className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                                                        disabled={user.id === userId}
                                                        onClick={() => setDeletingUser(user)}
                                                        title={user.id === userId ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                                                        type="button"
                                                    >
                                                        <Icon className="h-4 w-4" name="trash" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center px-5 py-12 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
                                <Icon className="h-5 w-5" name="users" />
                            </span>
                            <h3 className="mt-4 text-sm font-semibold text-slate-800">No hay usuarios para mostrar</h3>
                            <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-500">
                                {filters.search || filters.role_id
                                    ? 'Prueba modificar los filtros de búsqueda.'
                                    : 'Las cuentas creadas aparecerán en este listado.'}
                            </p>
                        </div>
                    )}

                    {users.last_page > 1 && (
                        <nav aria-label="Paginación de usuarios" className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <p className="text-xs text-slate-500">
                                Mostrando {users.from}–{users.to} de {users.total}
                            </p>
                            <div className="flex items-center justify-center gap-1">
                                {previousPage.url ? (
                                    <Link
                                        aria-label="Página anterior"
                                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                                        href={previousPage.url}
                                    >
                                        <Icon className="h-4 w-4" name="chevronLeft" />
                                    </Link>
                                ) : (
                                    <span className="rounded-lg p-2 text-slate-300">
                                        <Icon className="h-4 w-4" name="chevronLeft" />
                                    </span>
                                )}
                                {pageLinks.map((page, index) => (
                                    page.url ? (
                                        <Link
                                            aria-current={page.active ? 'page' : undefined}
                                            className={`min-w-9 rounded-lg px-2.5 py-2 text-center text-xs font-medium ${
                                                page.active
                                                    ? 'bg-[#17243a] text-white'
                                                    : 'text-slate-500 transition hover:bg-slate-100'
                                            }`}
                                            href={page.url}
                                            key={`${page.label}-${index}`}
                                        >
                                            {page.label}
                                        </Link>
                                    ) : (
                                        <span className="px-1 text-xs text-slate-400" key={`${page.label}-${index}`}>
                                            {page.label}
                                        </span>
                                    )
                                ))}
                                {nextPage.url ? (
                                    <Link
                                        aria-label="Página siguiente"
                                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                                        href={nextPage.url}
                                    >
                                        <Icon className="h-4 w-4" name="chevronRight" />
                                    </Link>
                                ) : (
                                    <span className="rounded-lg p-2 text-slate-300">
                                        <Icon className="h-4 w-4" name="chevronRight" />
                                    </span>
                                )}
                            </div>
                        </nav>
                    )}
                </section>
            </div>

            {isFormOpen && (
                <UserFormModal
                    key={editingUser?.id ?? 'new'}
                    onClose={closeForm}
                    roles={roles}
                    user={editingUser}
                />
            )}
            <DeleteUserDialog
                onCancel={() => setDeletingUser(null)}
                onConfirm={deleteUser}
                processing={deleteForm.processing}
                user={deletingUser}
            />
        </AuthenticatedLayout>
    );
}
