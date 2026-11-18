import { useEffect, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import EmployeeFormModal from '../../Components/EmployeeFormModal';
import EmptyState from '../../Components/EmptyState';
import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

function initialsFor(name) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

function StatusBadge({ status }) {
    const isActive = status === 'Activo';

    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-medium ${
            isActive ? 'bg-[#eaf2fc] text-[#426b95]' : 'bg-slate-100 text-slate-600'
        }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-[#4f78a2]' : 'bg-slate-400'}`} />
            {status}
        </span>
    );
}

function FlashMessages({ flash }) {
    return (
        <>
            {flash?.success && (
                <div aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800" role="status">
                    {flash.success}
                </div>
            )}
            {flash?.error && (
                <div aria-live="assertive" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                    {flash.error}
                </div>
            )}
        </>
    );
}

function SummaryCard({ label, value, detail, icon, tone = 'blue' }) {
    const iconColors = tone === 'amber'
        ? 'bg-[#fbf4e7] text-[#a4834b]'
        : 'bg-[#eaf1fa] text-[#52789f]';

    return (
        <article className="relative overflow-hidden rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm shadow-slate-900/[0.03]">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-[22px] font-semibold leading-none text-slate-900">{value}</span>
                        <span className="text-[9px] text-slate-500">{detail}</span>
                    </div>
                </div>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconColors}`}>
                    <Icon className="h-4 w-4" name={icon} />
                </span>
            </div>
            <div className={`absolute inset-x-0 bottom-0 h-0.5 ${tone === 'amber' ? 'bg-[#d6b071]' : 'bg-[#6d94bb]'}`} />
        </article>
    );
}

function Detail({ label, value }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
            <dt className="flex min-w-0 items-center gap-1.5 text-[10px] text-slate-500">
                <span className="h-1 w-1 shrink-0 rounded-full bg-[#9aafc6]" />
                {label}
            </dt>
            <dd className="max-w-[62%] truncate text-right text-[10px] font-medium text-slate-700" title={value}>
                {value}
            </dd>
        </div>
    );
}

export default function Index({
    employees,
    availableUsers,
    departments,
    positions,
    documentTypes,
    filters,
    summary,
    canManage,
    flash,
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.estado ?? '');
    const [departmentId, setDepartmentId] = useState(filters.departamento_id?.toString() ?? '');
    const [positionId, setPositionId] = useState(filters.cargo_id?.toString() ?? '');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees.data[0]?.id ?? null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    useEffect(() => {
        setSearch(filters.search ?? '');
        setStatus(filters.estado ?? '');
        setDepartmentId(filters.departamento_id?.toString() ?? '');
        setPositionId(filters.cargo_id?.toString() ?? '');
    }, [filters]);

    useEffect(() => {
        if (!employees.data.some((employee) => employee.id === selectedEmployeeId)) {
            setSelectedEmployeeId(employees.data[0]?.id ?? null);
        }
    }, [employees.data, selectedEmployeeId]);

    function filterEmployees(event) {
        event.preventDefault();
        router.get('/empleados', {
            search,
            estado: status,
            departamento_id: departmentId,
            cargo_id: positionId,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    function clearFilters() {
        setSearch('');
        setStatus('');
        setDepartmentId('');
        setPositionId('');
        router.get('/empleados', {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    function openCreateForm() {
        setEditingEmployee(null);
        setIsFormOpen(true);
    }

    function openEditForm(employee) {
        setEditingEmployee(employee);
        setIsFormOpen(true);
    }

    function closeForm() {
        setIsFormOpen(false);
        setEditingEmployee(null);
    }

    function toggleStatus(employee) {
        const nextStatus = employee.estado === 'Activo' ? 'Inactivo' : 'Activo';
        const action = nextStatus === 'Inactivo' ? 'desactivar' : 'activar';

        if (!window.confirm(`¿Deseas ${action} a ${employee.user.name}?`)) {
            return;
        }

        router.patch(`/empleados/${employee.id}/estado`, { estado: nextStatus }, {
            preserveScroll: true,
            onStart: () => setIsUpdatingStatus(true),
            onFinish: () => setIsUpdatingStatus(false),
        });
    }

    const selectedEmployee = employees.data.find((employee) => employee.id === selectedEmployeeId)
        ?? employees.data[0]
        ?? null;
    const previousPage = employees.links[0];
    const nextPage = employees.links[employees.links.length - 1];
    const pageLinks = employees.links.slice(1, -1);
    const hasFilters = Boolean(filters.search || filters.estado || filters.departamento_id || filters.cargo_id);

    return (
        <AuthenticatedLayout title="Empleados">
            <div className="space-y-3">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#547da6]">
                            <span className="rounded bg-[#eaf1fa] px-1.5 py-0.5">Talento Humano</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">Comercializadora Andina S.A.S.</span>
                        </p>
                        <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[25px]">
                            Directorio de Empleados &amp;<br className="hidden sm:block" /> Talento Humano
                        </h1>
                        <p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-500">
                            Gestión centralizada de colaboradores, cargos y estado laboral.
                        </p>
                    </div>
                    {canManage && (
                        <button
                            className="inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#07152b] px-3 py-2 text-[10px] font-semibold text-white shadow-sm transition hover:bg-[#1a3150] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={availableUsers.length === 0}
                            onClick={openCreateForm}
                            title={availableUsers.length === 0 ? 'No hay cuentas de usuario disponibles para asociar' : undefined}
                            type="button"
                        >
                            <Icon className="h-3.5 w-3.5" name="plus" />
                            Nuevo Empleado
                        </button>
                    )}
                </header>

                <FlashMessages flash={flash} />

                {canManage && availableUsers.length === 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        No hay cuentas disponibles para asociar. Solicita al Administrador que cree una cuenta desde Gestión de usuarios.
                    </div>
                )}

                <section aria-label="Resumen de empleados" className="grid gap-2 sm:grid-cols-3">
                    <SummaryCard
                        detail="colaboradores"
                        icon="briefcase"
                        label="Total Colaboradores"
                        value={summary.total}
                    />
                    <SummaryCard
                        detail="en función"
                        icon="users"
                        label="Activos en Función"
                        value={summary.active}
                    />
                    <SummaryCard
                        detail="disponibles"
                        icon="building"
                        label="Departamentos"
                        tone="amber"
                        value={summary.departments}
                    />
                </section>

                <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm shadow-slate-900/[0.03]">
                    <form
                        className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-[minmax(190px,1.3fr)_minmax(145px,0.8fr)_minmax(135px,0.75fr)_auto] sm:items-center"
                        onSubmit={filterEmployees}
                    >
                        <label className="relative block min-w-0">
                            <span className="sr-only">Buscar por nombre, documento o correo</span>
                            <Icon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" name="search" />
                            <input
                                className="w-full rounded-md border border-slate-100 bg-[#f8faff] py-2 pl-8 pr-2 text-[10px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#7398bd] focus:ring-2 focus:ring-[#7398bd]/15"
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Buscar por nombre, documento o correo"
                                type="search"
                                value={search}
                            />
                        </label>
                        <label>
                            <span className="sr-only">Filtrar por departamento</span>
                            <select
                                className="w-full rounded-md border border-slate-100 bg-[#f8faff] px-2 py-2 text-[10px] text-slate-700 outline-none focus:border-[#7398bd] focus:ring-2 focus:ring-[#7398bd]/15"
                                onChange={(event) => setDepartmentId(event.target.value)}
                                value={departmentId}
                            >
                                <option value="">Departamento: Todos</option>
                                {departments.map((department) => (
                                    <option key={department.id} value={department.id}>{department.nombre}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span className="sr-only">Filtrar por cargo</span>
                            <select
                                className="w-full rounded-md border border-slate-100 bg-[#f8faff] px-2 py-2 text-[10px] text-slate-700 outline-none focus:border-[#7398bd] focus:ring-2 focus:ring-[#7398bd]/15"
                                onChange={(event) => setPositionId(event.target.value)}
                                value={positionId}
                            >
                                <option value="">Cargo: Todos</option>
                                {positions.map((position) => (
                                    <option key={position.id} value={position.id}>{position.nombre}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span className="sr-only">Filtrar por estado</span>
                            <select
                                className="w-full rounded-md border border-slate-100 bg-[#f8faff] px-2 py-2 text-[10px] text-slate-700 outline-none focus:border-[#7398bd] focus:ring-2 focus:ring-[#7398bd]/15"
                                onChange={(event) => setStatus(event.target.value)}
                                value={status}
                            >
                                <option value="">Estado: Todos</option>
                                <option value="Activo">Activo</option>
                                <option value="Inactivo">Inactivo</option>
                            </select>
                        </label>
                        <div className="flex gap-1.5">
                            <button
                                aria-label="Aplicar filtros"
                                className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-[#eaf1fa] px-2.5 text-[10px] font-medium text-[#52789f] transition hover:bg-[#dce8f6]"
                                type="submit"
                            >
                                <Icon className="h-3.5 w-3.5" name="filter" />
                                <span className="sm:hidden lg:inline">Filtrar</span>
                            </button>
                            {hasFilters && (
                                <button
                                    className="rounded-md px-2 text-[10px] text-slate-500 transition hover:bg-slate-100"
                                    onClick={clearFilters}
                                    type="button"
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="flex items-center gap-1.5 text-[9px] text-slate-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#4f78a2]" />
                            Mostrando {employees.from ?? 0}–{employees.to ?? 0} de {employees.total} colaboradores registrados
                        </p>
                        <p className="text-[9px] text-slate-500">
                            Comercializadora Andina S.A.S.
                        </p>
                    </div>

                    <div className="grid gap-2 px-2 pb-2 md:grid-cols-[minmax(0,1.4fr)_minmax(215px,0.8fr)]">
                        <section className="min-w-0 overflow-hidden rounded-lg border border-slate-100">
                            {employees.data.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[620px] border-collapse text-left">
                                        <thead>
                                            <tr className="bg-[#f3f6fb]">
                                                <th className="px-2.5 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Identificación</th>
                                                <th className="px-2.5 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Colaborador / Perfil</th>
                                                <th className="px-2.5 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Contacto corporativo</th>
                                                <th className="px-2.5 py-2 text-[8px] font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                                                <th className="px-2.5 py-2 text-right text-[8px] font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {employees.data.map((employee) => {
                                                const isSelected = selectedEmployee?.id === employee.id;

                                                return (
                                                    <tr
                                                        className={`transition hover:bg-[#f7faff] ${isSelected ? 'bg-[#f4f8fe]' : ''}`}
                                                        key={employee.id}
                                                    >
                                                        <td className="px-2.5 py-2.5">
                                                            <span className="block text-[9px] font-semibold text-slate-700">
                                                                {employee.tipo_documento} {employee.numero_documento}
                                                            </span>
                                                        </td>
                                                        <td className="px-2.5 py-2.5">
                                                            <div className="flex min-w-0 items-center gap-1.5">
                                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#17243a] text-[8px] font-semibold text-white">
                                                                    {initialsFor(employee.user.name)}
                                                                </span>
                                                                <span className="min-w-0">
                                                                    <button
                                                                        className="block max-w-full truncate text-left text-[9px] font-semibold text-slate-700 hover:text-[#426b95]"
                                                                        onClick={() => setSelectedEmployeeId(employee.id)}
                                                                        type="button"
                                                                    >
                                                                        {employee.user.name}
                                                                    </button>
                                                                    <span className="block max-w-36 truncate text-[8px] text-slate-500">
                                                                        {employee.department.nombre} · {employee.position.nombre}
                                                                    </span>
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-2.5 py-2.5">
                                                            <span className="block max-w-36 truncate text-[8px] text-slate-600">{employee.user.email}</span>
                                                            <span className="mt-0.5 block text-[8px] text-slate-500">{employee.telefono}</span>
                                                        </td>
                                                        <td className="px-2.5 py-2.5"><StatusBadge status={employee.estado} /></td>
                                                        <td className="px-2 py-2.5">
                                                            <div className="flex justify-end gap-0.5">
                                                                <Link
                                                                    aria-label={`Ver detalle de ${employee.user.name}`}
                                                                    className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-[#426b95]"
                                                                    href={`/empleados/${employee.id}`}
                                                                    title="Ver expediente"
                                                                >
                                                                    <Icon className="h-3.5 w-3.5" name="eye" />
                                                                </Link>
                                                                {canManage && (
                                                                    <>
                                                                        <button
                                                                            aria-label={`Editar ${employee.user.name}`}
                                                                            className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-[#426b95]"
                                                                            onClick={() => openEditForm(employee)}
                                                                            title="Editar empleado"
                                                                            type="button"
                                                                        >
                                                                            <Icon className="h-3.5 w-3.5" name="edit" />
                                                                        </button>
                                                                        <button
                                                                            aria-label={`${employee.estado === 'Activo' ? 'Desactivar' : 'Activar'} ${employee.user.name}`}
                                                                            className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-[#426b95] disabled:cursor-not-allowed disabled:opacity-50"
                                                                            disabled={isUpdatingStatus}
                                                                            onClick={() => toggleStatus(employee)}
                                                                            title={employee.estado === 'Activo' ? 'Desactivar empleado' : 'Activar empleado'}
                                                                            type="button"
                                                                        >
                                                                            <Icon className="h-3.5 w-3.5" name="power" />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="px-3 py-5">
                                    <EmptyState
                                        compact
                                        description={hasFilters
                                            ? 'Prueba modificar los filtros de búsqueda.'
                                            : 'Las fichas laborales registradas aparecerán aquí.'}
                                        icon="users"
                                        title="No hay empleados para mostrar"
                                    />
                                </div>
                            )}

                            {employees.last_page > 1 && (
                                <nav aria-label="Paginación de empleados" className="flex flex-col gap-2 border-t border-slate-100 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-[9px] text-slate-500">Mostrando {employees.from}–{employees.to} de {employees.total}</p>
                                    <div className="flex items-center justify-center gap-0.5">
                                        {previousPage.url ? (
                                            <Link aria-label="Página anterior" className="rounded p-1.5 text-slate-500 transition hover:bg-slate-100" href={previousPage.url}>
                                                <Icon className="h-3.5 w-3.5" name="chevronLeft" />
                                            </Link>
                                        ) : (
                                            <span className="rounded p-1.5 text-slate-300"><Icon className="h-3.5 w-3.5" name="chevronLeft" /></span>
                                        )}
                                        {pageLinks.map((page, index) => (
                                            page.url ? (
                                                <Link
                                                    aria-current={page.active ? 'page' : undefined}
                                                    className={`min-w-6 rounded px-1.5 py-1 text-center text-[9px] font-medium ${
                                                        page.active ? 'bg-[#17243a] text-white' : 'text-slate-500 transition hover:bg-slate-100'
                                                    }`}
                                                    href={page.url}
                                                    key={`${page.label}-${index}`}
                                                >
                                                    {page.label}
                                                </Link>
                                            ) : (
                                                <span className="px-1 text-[9px] text-slate-400" key={`${page.label}-${index}`}>{page.label}</span>
                                            )
                                        ))}
                                        {nextPage.url ? (
                                            <Link aria-label="Página siguiente" className="rounded p-1.5 text-slate-500 transition hover:bg-slate-100" href={nextPage.url}>
                                                <Icon className="h-3.5 w-3.5" name="chevronRight" />
                                            </Link>
                                        ) : (
                                            <span className="rounded p-1.5 text-slate-300"><Icon className="h-3.5 w-3.5" name="chevronRight" /></span>
                                        )}
                                    </div>
                                </nav>
                            )}
                        </section>

                        <aside className="min-w-0 rounded-lg border border-slate-100 bg-white p-3">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800">
                                    <Icon className="h-3.5 w-3.5 text-[#52789f]" name="clipboard" />
                                    Expediente Rápido
                                </h2>
                                {selectedEmployee && (
                                    <span className="rounded bg-[#eaf1fa] px-1.5 py-1 text-[7px] font-semibold uppercase tracking-wide text-[#52789f]">
                                        Ficha {selectedEmployee.estado}
                                    </span>
                                )}
                            </div>

                            {selectedEmployee ? (
                                <>
                                    <div className="mt-2 flex flex-col items-center rounded-lg bg-[#edf3fc] px-3 py-3 text-center">
                                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#07152b] text-sm font-semibold text-white">
                                            {initialsFor(selectedEmployee.user.name)}
                                        </span>
                                        <h3 className="mt-1.5 text-[12px] font-semibold text-slate-900">{selectedEmployee.user.name}</h3>
                                        <p className="mt-0.5 text-[9px] text-[#52789f]">{selectedEmployee.position.nombre}</p>
                                        <p className="mt-1 rounded-full bg-white px-2 py-0.5 text-[8px] text-slate-500">
                                            {selectedEmployee.department.nombre}
                                        </p>
                                    </div>

                                    <dl className="mt-1.5">
                                        <Detail label="Identificación" value={`${selectedEmployee.tipo_documento} ${selectedEmployee.numero_documento}`} />
                                        <Detail label="Correo" value={selectedEmployee.user.email} />
                                        <Detail label="Teléfono" value={selectedEmployee.telefono} />
                                        <Detail label="Fecha de Ingreso" value={selectedEmployee.fecha_contratacion} />
                                        <Detail label="Estado laboral" value={selectedEmployee.estado} />
                                    </dl>

                                    <div className="mt-2 grid gap-1.5">
                                        <Link
                                            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#416d98] px-2 py-2 text-[9px] font-semibold text-white transition hover:bg-[#335b82]"
                                            href={`/empleados/${selectedEmployee.id}`}
                                        >
                                            <Icon className="h-3 w-3" name="eye" />
                                            Abrir Expediente Completo
                                        </Link>
                                        {canManage && (
                                            <button
                                                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#eff4fb] px-2 py-2 text-[9px] font-semibold text-slate-700 transition hover:bg-[#e2ebf7]"
                                                onClick={() => openEditForm(selectedEmployee)}
                                                type="button"
                                            >
                                                <Icon className="h-3 w-3" name="edit" />
                                                Editar Colaborador
                                            </button>
                                        )}
                                    </div>

                                    <p className="mt-2 flex items-center justify-center gap-1 text-[8px] text-slate-400">
                                        <Icon className="h-2.5 w-2.5" name="lock" />
                                        Acceso protegido por permisos de usuario
                                    </p>
                                </>
                            ) : (
                                <EmptyState
                                    compact
                                    description="Selecciona un colaborador para consultar su resumen laboral."
                                    icon="user"
                                    title="Sin ficha seleccionada"
                                />
                            )}
                        </aside>
                    </div>
                </section>
            </div>

            {isFormOpen && (
                <EmployeeFormModal
                    availableUsers={availableUsers}
                    departments={departments}
                    documentTypes={documentTypes}
                    employee={editingEmployee}
                    onClose={closeForm}
                    positions={positions}
                />
            )}
        </AuthenticatedLayout>
    );
}
