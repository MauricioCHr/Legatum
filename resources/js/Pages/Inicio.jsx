import { Link } from '@inertiajs/react';
import DashboardMetricCard from '../Components/DashboardMetricCard';
import DashboardPanel from '../Components/DashboardPanel';
import { DashboardBarChart, DashboardDonut } from '../Components/DashboardCharts';
import EmptyState from '../Components/EmptyState';
import Icon from '../Components/Icon';
import QuickAccessCard from '../Components/QuickAccessCard';
import AuthenticatedLayout from '../Layouts/AuthenticatedLayout';

function formatToday() {
    return new Intl.DateTimeFormat('es-CO', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(new Date());
}

function PageHeader({ eyebrow, title, description, actions = [] }) {
    return (
        <div className="flex animate-fade-up flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
                {eyebrow && (
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-primary">{eyebrow}</p>
                )}
                <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h2>
                {description && (
                    <p className="mt-1.5 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">{description}</p>
                )}
            </div>
            {actions.length > 0 && (
                <div className="flex shrink-0 flex-wrap gap-2">
                    {actions.slice(0, 2).map((action) => (
                        <Link
                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            href={action.href}
                            key={action.href}
                        >
                            <Icon className="size-4" name={action.icon} />
                            {action.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

function WelcomeBanner({ name, description }) {
    const firstName = name?.trim().split(/\s+/)[0] ?? 'LEGATUM';

    return (
        <section className="relative animate-fade-up overflow-hidden rounded-xl bg-sidebar px-5 py-6 text-white sm:px-7">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{
                    backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            />
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-sidebar-primary opacity-25 blur-3xl" />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-xs font-medium capitalize text-white/60">{formatToday()}</p>
                    <h2 className="mt-1 text-pretty text-2xl font-semibold tracking-tight sm:text-3xl">Hola, {firstName}</h2>
                    <p className="mt-1 max-w-2xl text-pretty text-sm leading-relaxed text-white/70">{description}</p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/80">
                    <Icon className="size-4 text-sidebar-primary" name="shield" />
                    Panel de administración
                </span>
            </div>
        </section>
    );
}

function StatusBadge({ status }) {
    const classes = {
        Activo: 'bg-success/10 text-success ring-success/20',
        Activa: 'bg-success/10 text-success ring-success/20',
        Aprobada: 'bg-success/10 text-success ring-success/20',
        Registrada: 'bg-success/10 text-success ring-success/20',
        Pendiente: 'bg-warning/10 text-warning ring-warning/20',
        'En revisión': 'bg-info/10 text-info ring-info/20',
        Rechazada: 'bg-destructive/10 text-destructive ring-destructive/20',
        Inactivo: 'bg-muted text-muted-foreground ring-border',
        Cancelada: 'bg-muted text-muted-foreground ring-border',
        Vigente: 'bg-success/10 text-success ring-success/20',
        Abierto: 'bg-accent text-accent-foreground ring-primary/15',
        Consolidado: 'bg-info/10 text-info ring-info/20',
        Cerrado: 'bg-muted text-muted-foreground ring-border',
    };

    return (
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${classes[status] ?? 'bg-muted text-muted-foreground ring-border'}`}>
            <span className="size-1.5 rounded-full bg-current" />
            {status}
        </span>
    );
}

function RecordsTable({ rows = [], columns, emptyTitle, emptyDescription }) {
    if (rows.length === 0) {
        return (
            <div className="p-5">
                <EmptyState
                    compact
                    description={emptyDescription}
                    icon="file"
                    title={emptyTitle}
                />
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                    <tr className="border-y border-border bg-muted/50">
                        {columns.map((column) => (
                            <th
                                className={`whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${column.align === 'right' ? 'text-right' : ''}`}
                                key={column.key}
                                scope="col"
                            >
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                        <tr className="transition-colors hover:bg-accent/40" key={row.id}>
                            {columns.map((column) => (
                                <td className={`px-5 py-3 text-foreground ${column.align === 'right' ? 'text-right' : ''}`} key={column.key}>
                                    {column.render ? column.render(row) : row[column.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function QuickActions({ dashboard }) {
    if (!dashboard.quickActions?.length) {
        return null;
    }

    return (
        <DashboardPanel
            description="Accede directamente a las funciones permitidas para tu perfil."
            icon="layers"
            title="Accesos rápidos"
        >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {dashboard.quickActions.map((action) => (
                    <QuickAccessCard item={action} key={action.href} />
                ))}
            </div>
        </DashboardPanel>
    );
}

function MetricGrid({ metrics, columns = 4 }) {
    const gridColumns = {
        3: 'lg:grid-cols-3',
        4: 'lg:grid-cols-2 xl:grid-cols-4',
        5: 'lg:grid-cols-3 xl:grid-cols-5',
    };

    return (
        <section aria-label="Indicadores principales" className={`grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 ${gridColumns[columns]}`}>
            {metrics.map((metric) => (
                <DashboardMetricCard key={metric.label} {...metric} />
            ))}
        </section>
    );
}

function DepartmentPanel({ departments, totalEmployees }) {
    return (
        <DashboardPanel
            description="Colaboradores registrados en las áreas activas."
            icon="building"
            title="Colaboradores por departamento"
        >
            {departments.length > 0 ? (
                <DashboardBarChart data={departments} labelKey="name" valueKey="employees" />
            ) : (
                <EmptyState compact description="No hay departamentos activos con registros." icon="building" title="Sin datos por departamento" />
            )}
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                {totalEmployees} colaboradores en total
            </p>
        </DashboardPanel>
    );
}

function EmployeeColumns() {
    return [
        {
            key: 'name',
            label: 'Colaborador',
            render: (employee) => (
                <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{employee.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{employee.email}</p>
                </div>
            ),
        },
        { key: 'department', label: 'Departamento' },
        { key: 'position', label: 'Cargo' },
        { key: 'status', label: 'Estado', render: (employee) => <StatusBadge status={employee.status} /> },
        { key: 'hireDate', label: 'Ingreso' },
    ];
}

function AdminDashboard({ user, dashboard }) {
    const departments = dashboard.departments ?? [];
    const totalEmployees = dashboard.employeeStatuses?.reduce((total, item) => total + item.value, 0) ?? 0;
    const userStats = dashboard.userStats ?? [];

    return (
        <div className="flex flex-col gap-5">
            <WelcomeBanner name={user?.name} description={dashboard.description} />
            <MetricGrid columns={4} metrics={dashboard.metrics ?? []} />

            <div className="grid gap-4 lg:grid-cols-3">
                <DashboardPanel
                    className="animate-fade-up lg:col-span-2"
                    description={`Nuevas vinculaciones registradas durante ${new Date().getFullYear()}.`}
                    icon="chart"
                    title="Contrataciones registradas"
                >
                    <DashboardBarChart data={dashboard.hiringTrend ?? []} orientation="vertical" />
                </DashboardPanel>
                <DashboardPanel
                    className="animate-fade-up"
                    description="Distribución de colaboradores en áreas activas."
                    icon="building"
                    title="Estructura organizacional"
                >
                    <DashboardDonut
                        centerLabel="en áreas activas"
                        centerValue={departments.reduce((total, item) => total + item.employees, 0)}
                        data={departments.map((item) => ({ name: item.name, value: item.employees }))}
                    />
                </DashboardPanel>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <DashboardPanel
                    className="animate-fade-up overflow-hidden lg:col-span-2"
                    description="Registros incorporados recientemente al sistema."
                    icon="users"
                    title="Últimos registros"
                >
                    <RecordsTable
                        columns={EmployeeColumns()}
                        emptyDescription="Los colaboradores registrados aparecerán aquí."
                        emptyTitle="Sin registros recientes"
                        rows={dashboard.recentEmployees ?? []}
                    />
                </DashboardPanel>
                <div className="flex flex-col gap-4">
                    <DashboardPanel
                        className="animate-fade-up"
                        description="Estado de acceso de las cuentas existentes."
                        icon="shield"
                        title="Usuarios del sistema"
                    >
                        {userStats.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                {userStats.map((item) => {
                                    const total = userStats.reduce((sum, status) => sum + status.value, 0);
                                    const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;

                                    return (
                                        <div key={item.label}>
                                            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                                                <span className="text-muted-foreground">{item.label}</span>
                                                <span className="font-mono font-medium tabular-nums">{item.value}</span>
                                            </div>
                                            <div aria-label={`${item.label}: ${percentage}%`} className="h-1.5 overflow-hidden rounded-full bg-muted" role="img">
                                                <span
                                                    className={`block h-full rounded-full ${item.label === 'Activos' ? 'bg-success' : 'bg-muted-foreground/50'}`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <EmptyState compact description="No hay cuentas de usuario registradas." icon="users" title="Sin cuentas" />
                        )}
                    </DashboardPanel>
                    <ContractAlerts alerts={dashboard.alerts ?? []} />
                </div>
            </div>

            <QuickActions dashboard={dashboard} />
        </div>
    );
}

function ContractAlerts({ alerts }) {
    return (
        <DashboardPanel
            className="animate-fade-up"
            description="Contratos vigentes con fecha de finalización cercana."
            icon="clock"
            title="Próximos vencimientos"
        >
            {alerts.length > 0 ? (
                <ul className="flex flex-col gap-3">
                    {alerts.map((alert) => (
                        <li className="flex items-start justify-between gap-3" key={alert.id}>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">{alert.employee}</p>
                                <p className="truncate text-xs text-muted-foreground">{alert.type} · Vence {alert.expiration}</p>
                            </div>
                            <span className="shrink-0 rounded-md bg-warning/10 px-2 py-1 font-mono text-[11px] font-semibold text-warning">
                                {alert.days ?? '—'} d
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyState compact description="No hay contratos vigentes por vencer en los próximos 30 días." icon="file" title="Sin alertas" />
            )}
        </DashboardPanel>
    );
}

function TalentDashboard({ dashboard }) {
    const totalEmployees = dashboard.employeeStatuses?.reduce((total, item) => total + item.value, 0) ?? 0;

    return (
        <div className="flex flex-col gap-5">
            <PageHeader
                actions={dashboard.quickActions}
                description={dashboard.description}
                eyebrow="Talento Humano"
                title="Seguimiento del personal"
            />
            <MetricGrid columns={4} metrics={dashboard.metrics ?? []} />

            <div className="grid gap-4 lg:grid-cols-5">
                <div className="lg:col-span-3">
                    <DepartmentPanel departments={dashboard.departments ?? []} totalEmployees={totalEmployees} />
                </div>
                <DashboardPanel
                    className="animate-fade-up lg:col-span-2"
                    description="Contratos vigentes agrupados por tipo."
                    icon="file"
                    title="Distribución de contratos"
                >
                    <DashboardDonut centerLabel="contratos" data={dashboard.contractsByType ?? []} />
                </DashboardPanel>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <DashboardPanel
                    description="Cumpleaños próximos según la fecha registrada."
                    icon="calendar"
                    title="Próximos cumpleaños"
                >
                    {dashboard.birthdays?.length ? (
                        <ul className="flex flex-col gap-1">
                            {dashboard.birthdays.map((birthday) => (
                                <li className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60" key={birthday.name}>
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                                        {birthday.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{birthday.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">{birthday.department}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono text-xs font-medium">{birthday.date}</p>
                                        <p className="text-[11px] text-muted-foreground">en {birthday.days} días</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState compact description="No hay cumpleaños en los próximos 30 días." icon="calendar" title="Sin fechas próximas" />
                    )}
                </DashboardPanel>
                <div className="md:col-span-2 lg:col-span-2">
                    <ContractAlerts alerts={dashboard.alerts ?? []} />
                </div>
            </div>

            <DashboardPanel
                className="animate-fade-up overflow-hidden"
                description="Consulta de colaboradores y su estado actual."
                icon="users"
                title="Directorio de empleados"
            >
                <RecordsTable
                    columns={EmployeeColumns()}
                    emptyDescription="El directorio se mostrará cuando haya colaboradores registrados."
                    emptyTitle="Sin colaboradores"
                    rows={dashboard.recentEmployees ?? []}
                />
            </DashboardPanel>
            <QuickActions dashboard={dashboard} />
        </div>
    );
}

function TeamDashboard({ dashboard }) {
    const pendingCount = dashboard.metrics?.[2]?.value ?? 0;
    const team = dashboard.team ?? [];

    return (
        <div className="flex flex-col gap-5">
            <PageHeader
                actions={dashboard.quickActions}
                description={dashboard.description}
                eyebrow="Mi área"
                title="Gestión de mi equipo"
            />
            {pendingCount > 0 && (
                <div className="flex animate-fade-up flex-col gap-3 rounded-xl border border-warning/40 bg-warning/8 p-4 sm:flex-row sm:items-center">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/20 text-warning">
                        <Icon className="size-5" name="alert" />
                    </span>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">
                            {pendingCount} solicitudes pendientes de respuesta
                        </p>
                        <p className="text-xs text-muted-foreground">Solicitudes de vacaciones y permisos del equipo.</p>
                    </div>
                    <Link className="text-sm font-medium text-primary hover:underline" href="/vacaciones/aprobaciones">
                        Revisar solicitudes
                    </Link>
                </div>
            )}
            <MetricGrid columns={5} metrics={dashboard.metrics ?? []} />

            <DashboardPanel
                className="animate-fade-up overflow-hidden"
                description="Solicitudes pendientes enviadas por colaboradores de tu departamento."
                icon="calendar"
                title="Solicitudes que requieren atención"
            >
                <RecordsTable
                    columns={[
                        {
                            key: 'employee',
                            label: 'Colaborador',
                            render: (request) => (
                                <div>
                                    <p className="font-medium">{request.employee}</p>
                                    <p className="text-xs text-muted-foreground">Solicitud #{request.id}</p>
                                </div>
                            ),
                        },
                        { key: 'type', label: 'Tipo' },
                        {
                            key: 'period',
                            label: 'Período',
                            render: (request) => `${request.startDate} – ${request.endDate}`,
                        },
                        { key: 'days', label: 'Días' },
                        { key: 'status', label: 'Estado', render: (request) => <StatusBadge status={request.status} /> },
                        {
                            key: 'actions',
                            label: 'Acciones',
                            align: 'right',
                            render: () => (
                                <Link className="text-xs font-medium text-primary hover:underline" href="/vacaciones/aprobaciones">
                                    Gestionar
                                </Link>
                            ),
                        },
                    ]}
                    emptyDescription="Cuando el equipo envíe solicitudes pendientes, aparecerán aquí."
                    emptyTitle="No hay solicitudes pendientes"
                    rows={dashboard.teamRequests ?? []}
                />
            </DashboardPanel>

            <div className="grid gap-4 lg:grid-cols-2">
                <DashboardPanel description="Colaboradores activos asignados a tu departamento." icon="users" title="Resumen del equipo">
                    {team.length > 0 ? (
                        <ul className="flex flex-col gap-1">
                            {team.map((member) => (
                                <li className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60" key={member.id}>
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                                        {member.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{member.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">{member.position}</p>
                                    </div>
                                    <StatusBadge status={member.status} />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState compact description="No hay integrantes activos en tu departamento." icon="users" title="Sin integrantes" />
                    )}
                </DashboardPanel>
                <DepartmentPanel
                    departments={dashboard.departments ?? []}
                    totalEmployees={dashboard.employeeStatuses?.reduce((total, item) => total + item.value, 0) ?? 0}
                />
            </div>
            <QuickActions dashboard={dashboard} />
        </div>
    );
}

function PayrollDashboard({ dashboard }) {
    const period = dashboard.currentPeriod;

    return (
        <div className="flex flex-col gap-5">
            <PageHeader
                actions={dashboard.quickActions}
                description={dashboard.description}
                eyebrow="Nómina"
                title="Novedades y períodos"
            />
            {period && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-[0_1px_2px_rgba(15,27,51,0.04)]">
                    <div>
                        <p className="text-sm font-semibold text-foreground">{period.name}</p>
                        <p className="text-xs text-muted-foreground">{period.startDate} – {period.endDate}</p>
                    </div>
                    <StatusBadge status={period.status} />
                </div>
            )}
            <MetricGrid columns={4} metrics={dashboard.metrics ?? []} />

            <div className="grid gap-4 lg:grid-cols-5">
                <DashboardPanel
                    className="animate-fade-up lg:col-span-3"
                    description="Cantidad de novedades activas por tipo en el período actual."
                    icon="chart"
                    title="Tipos de novedad"
                >
                    <DashboardDonut centerLabel="novedades" data={dashboard.noveltiesByType ?? []} />
                </DashboardPanel>
                <DashboardPanel
                    className="animate-fade-up lg:col-span-2"
                    description="Períodos recientes y novedades registradas."
                    icon="calendar"
                    title="Resumen de períodos"
                >
                    {dashboard.periods?.length ? (
                        <ul className="flex flex-col gap-3">
                            {dashboard.periods.map((item) => (
                                <li className="rounded-lg border border-border p-3" key={item.name}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{item.name}</p>
                                            <p className="font-mono text-[11px] text-muted-foreground">{item.range}</p>
                                        </div>
                                        <StatusBadge status={item.status} />
                                    </div>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {item.novelties} novedades activas
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState compact description="Los períodos de nómina aparecerán aquí." icon="calendar" title="Sin períodos" />
                    )}
                </DashboardPanel>
            </div>

            <DashboardPanel
                className="animate-fade-up overflow-hidden"
                description="Novedades activas del período vigente."
                icon="wallet"
                title="Novedades recientes"
            >
                <RecordsTable
                    columns={[
                        {
                            key: 'employee',
                            label: 'Colaborador',
                            render: (novelty) => (
                                <div>
                                    <p className="font-medium">{novelty.employee}</p>
                                    <p className="text-xs text-muted-foreground">{novelty.department}</p>
                                </div>
                            ),
                        },
                        { key: 'type', label: 'Novedad' },
                        { key: 'date', label: 'Fecha' },
                        {
                            key: 'amount',
                            label: 'Valor',
                            align: 'right',
                            render: (novelty) => novelty.amount === null
                                ? '—'
                                : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(novelty.amount),
                        },
                        { key: 'status', label: 'Estado', render: (novelty) => <StatusBadge status={novelty.status} /> },
                    ]}
                    emptyDescription="No hay novedades activas para el período seleccionado."
                    emptyTitle="Sin novedades"
                    rows={dashboard.recentNovelties ?? []}
                />
            </DashboardPanel>
            <QuickActions dashboard={dashboard} />
        </div>
    );
}

function ManagementDashboard({ dashboard }) {
    const totalEmployees = dashboard.employeeStatuses?.reduce((total, item) => total + item.value, 0) ?? 0;

    return (
        <div className="flex flex-col gap-5">
            <PageHeader
                actions={dashboard.quickActions}
                description={dashboard.description}
                eyebrow="Vista ejecutiva"
                title="Indicadores organizacionales"
            />
            <MetricGrid columns={4} metrics={dashboard.metrics ?? []} />

            <div className="grid gap-4 lg:grid-cols-3">
                <DashboardPanel
                    className="animate-fade-up lg:col-span-2"
                    description={`Vinculaciones registradas durante ${new Date().getFullYear()}.`}
                    icon="chart"
                    title="Contrataciones por mes"
                >
                    <DashboardBarChart data={dashboard.hiringTrend ?? []} orientation="vertical" />
                </DashboardPanel>
                <DepartmentPanel departments={dashboard.departments ?? []} totalEmployees={totalEmployees} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <DashboardPanel
                    className="animate-fade-up"
                    description="Contratos vigentes agrupados por tipo."
                    icon="file"
                    title="Composición contractual"
                >
                    <DashboardDonut centerLabel="contratos vigentes" data={dashboard.contractsByType ?? []} />
                </DashboardPanel>
                <DashboardPanel
                    className="animate-fade-up"
                    description="Indicadores de estado laboral disponibles en el sistema."
                    icon="users"
                    title="Estado de la planta"
                >
                    <DashboardDonut
                        centerLabel="colaboradores"
                        centerValue={totalEmployees}
                        data={(dashboard.employeeStatuses ?? []).map((status) => ({
                            name: status.label,
                            value: status.value,
                        }))}
                    />
                </DashboardPanel>
            </div>
            <QuickActions dashboard={dashboard} />
        </div>
    );
}

function EmployeeDashboard({ dashboard }) {
    const profile = dashboard.profile;
    const contract = dashboard.contract;

    return (
        <div className="flex flex-col gap-5">
            <section className="animate-fade-up overflow-hidden rounded-xl border border-border bg-card">
                <div className="relative h-24 bg-sidebar sm:h-28">
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 opacity-[0.08]"
                        style={{
                            backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                            backgroundSize: '16px 16px',
                        }}
                    />
                </div>
                {profile ? (
                    <>
                        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <span className="relative -mt-10 flex size-20 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-semibold text-accent-foreground ring-4 ring-card">
                                    {profile.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                                </span>
                                <div>
                                    <h2 className="text-xl font-semibold tracking-tight">Bienvenido/a, {profile.name.split(/\s+/)[0]}</h2>
                                    <p className="text-sm text-muted-foreground">{profile.name} · {profile.position ?? 'Colaborador'}</p>
                                </div>
                            </div>
                            <Link className="inline-flex h-9 w-fit items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90" href="/mi-perfil">
                                <Icon className="size-4" name="user" />
                                Mi perfil
                            </Link>
                        </div>
                        <dl className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
                            {[
                                { icon: 'building', label: 'Departamento', value: profile.department ?? 'Sin asignar' },
                                { icon: 'briefcase', label: 'Cargo', value: profile.position ?? 'Sin asignar' },
                                { icon: 'calendar', label: 'Fecha de ingreso', value: profile.hireDate ?? 'No registrada' },
                                { icon: 'shield', label: 'Estado laboral', value: profile.status ?? 'Sin estado', status: true },
                            ].map((item, index) => (
                                <div
                                    className={`flex items-center gap-3 px-5 py-4 ${index % 2 === 1 ? 'border-l border-border' : ''} ${index >= 2 ? 'border-t border-border sm:border-t-0' : ''} ${index === 2 ? 'sm:border-l' : ''}`}
                                    key={item.label}
                                >
                                    <Icon className="size-4 shrink-0 text-muted-foreground" name={item.icon} />
                                    <div className="min-w-0">
                                        <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
                                        <dd className="truncate text-sm font-medium">
                                            {item.status ? <StatusBadge status={item.value} /> : item.value}
                                        </dd>
                                    </div>
                                </div>
                            ))}
                        </dl>
                    </>
                ) : (
                    <div className="p-5">
                        <EmptyState compact description="Vincula tu cuenta con un expediente de colaborador para ver los datos personales." icon="user" title="No hay expediente laboral asociado" />
                    </div>
                )}
            </section>

            <MetricGrid columns={3} metrics={dashboard.metrics ?? []} />

            <div className="grid gap-4 lg:grid-cols-3">
                <DashboardPanel
                    className="animate-fade-up overflow-hidden lg:col-span-2"
                    description="Estado de los trámites personales registrados."
                    icon="calendar"
                    title="Mis solicitudes"
                >
                    <RecordsTable
                        columns={[
                            {
                                key: 'type',
                                label: 'Solicitud',
                                render: (request) => (
                                    <div>
                                        <p className="font-medium">{request.type}</p>
                                        <p className="text-xs text-muted-foreground">#{request.id}</p>
                                    </div>
                                ),
                            },
                            { key: 'startDate', label: 'Desde' },
                            { key: 'endDate', label: 'Hasta' },
                            { key: 'days', label: 'Días' },
                            { key: 'status', label: 'Estado', render: (request) => <StatusBadge status={request.status} /> },
                        ]}
                        emptyDescription="Cuando registres una solicitud, podrás consultar aquí su estado."
                        emptyTitle="Aún no tienes solicitudes"
                        rows={dashboard.leaveRequests ?? []}
                    />
                </DashboardPanel>
                <DashboardPanel
                    description="Información del contrato vigente asociado a tu expediente."
                    icon="file"
                    title="Mi contrato"
                >
                    {contract ? (
                        <dl className="flex flex-col gap-4">
                            <div>
                                <dt className="text-xs text-muted-foreground">Tipo de contrato</dt>
                                <dd className="mt-1 text-sm font-medium">{contract.type ?? 'No especificado'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground">Fecha de inicio</dt>
                                <dd className="mt-1 text-sm font-medium">{contract.startDate ?? 'No registrada'}</dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground">Fecha de finalización</dt>
                                <dd className="mt-1 text-sm font-medium">{contract.endDate ?? 'Indefinida'}</dd>
                            </div>
                            <Link className="text-sm font-medium text-primary hover:underline" href="/mis-contratos">Consultar mis contratos</Link>
                        </dl>
                    ) : (
                        <EmptyState compact description="No hay un contrato vigente asociado a tu expediente." icon="file" title="Sin contrato vigente" />
                    )}
                </DashboardPanel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <DashboardPanel
                    className="animate-fade-up overflow-hidden"
                    description="Registros recientes de entrada y salida."
                    icon="clock"
                    title="Mi asistencia reciente"
                >
                    <RecordsTable
                        columns={[
                            { key: 'date', label: 'Fecha' },
                            { key: 'entry', label: 'Entrada', render: (item) => item.entry ?? '—' },
                            { key: 'exit', label: 'Salida', render: (item) => item.exit ?? 'Pendiente' },
                            { key: 'status', label: 'Estado', render: (item) => <StatusBadge status={item.status} /> },
                        ]}
                        emptyDescription="Tus marcas de asistencia aparecerán aquí."
                        emptyTitle="Sin registros de asistencia"
                        rows={(dashboard.recentAttendance ?? []).map((item, index) => ({ ...item, id: `${item.date}-${index}` }))}
                    />
                </DashboardPanel>
                <DashboardPanel description="Datos de contacto asociados a tu cuenta." icon="user" title="Información de contacto">
                    {profile ? (
                        <dl className="flex flex-col gap-4 text-sm">
                            <div className="flex items-center gap-2.5 text-muted-foreground">
                                <Icon className="size-4" name="mail" />
                                <span className="break-all">{profile.email ?? 'Correo no disponible'}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-muted-foreground">
                                <Icon className="size-4" name="phone" />
                                <span>{profile.phone ?? 'Teléfono no registrado'}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-muted-foreground">
                                <Icon className="size-4" name="users" />
                                <span>Jefe directo: {profile.manager ?? 'No asignado'}</span>
                            </div>
                        </dl>
                    ) : (
                        <EmptyState compact description="Asocia un expediente laboral para consultar tus datos." icon="user" title="Datos no disponibles" />
                    )}
                </DashboardPanel>
            </div>
            <QuickActions dashboard={dashboard} />
        </div>
    );
}

function DashboardContent({ user, dashboard }) {
    switch (dashboard?.role) {
        case 'admin':
            return <AdminDashboard dashboard={dashboard} user={user} />;
        case 'talento':
            return <TalentDashboard dashboard={dashboard} />;
        case 'manager':
            return <TeamDashboard dashboard={dashboard} />;
        case 'payroll':
            return <PayrollDashboard dashboard={dashboard} />;
        case 'management':
            return <ManagementDashboard dashboard={dashboard} />;
        case 'employee':
            return <EmployeeDashboard dashboard={dashboard} />;
        default:
            return (
                <EmptyState
                    description="No fue posible determinar el espacio de trabajo asociado a tu cuenta."
                    icon="shield"
                    title="Dashboard no disponible"
                />
            );
    }
}

export default function Inicio({ auth, dashboard }) {
    return (
        <AuthenticatedLayout title={dashboard?.title ?? 'Dashboard'}>
            <DashboardContent dashboard={dashboard} user={auth?.user} />
        </AuthenticatedLayout>
    );
}
