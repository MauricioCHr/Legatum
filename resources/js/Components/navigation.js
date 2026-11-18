const dashboard = {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    href: '/dashboard',
};

const navigationByRole = {
    Administrador: [
        {
            label: 'Principal',
            items: [dashboard],
        },
        {
            label: 'Gestión del talento',
            items: [
                { id: 'employees', label: 'Empleados', icon: 'users', href: '/empleados' },
                { id: 'departments', label: 'Departamentos', icon: 'building', href: '/departamentos' },
                { id: 'positions', label: 'Cargos', icon: 'briefcase', href: '/cargos' },
                { id: 'contracts', label: 'Contratos', icon: 'file', href: '/contratos' },
                { id: 'attendance', label: 'Asistencia', icon: 'clock', href: '/asistencia' },
                { id: 'leave', label: 'Vacaciones y permisos', icon: 'calendar', href: '/vacaciones/solicitudes' },
                { id: 'payroll', label: 'Nómina', icon: 'wallet', href: '/nomina/novedades' },
                { id: 'evaluations', label: 'Evaluaciones', icon: 'clipboard', href: '/evaluaciones' },
                { id: 'reports', label: 'Reportes', icon: 'chart', href: '/reportes' },
            ],
        },
        {
            label: 'Administración',
            items: [
                { id: 'users', label: 'Usuarios', icon: 'user', href: '/usuarios' },
                { id: 'roles-catalogs', label: 'Roles y catálogos', icon: 'settings', href: '/catalogos' },
                { id: 'settings', label: 'Configuración', icon: 'settings', href: '/catalogos' },
            ],
        },
    ],
    'Talento Humano': [
        {
            label: 'Principal',
            items: [dashboard],
        },
        {
            label: 'Gestión del talento',
            items: [
                { id: 'employees', label: 'Empleados', icon: 'users', href: '/empleados' },
                { id: 'contracts', label: 'Contratos', icon: 'file', href: '/contratos' },
                { id: 'attendance', label: 'Asistencia', icon: 'clock', href: '/asistencia' },
                { id: 'leave', label: 'Vacaciones y permisos', icon: 'calendar', href: '/vacaciones/solicitudes' },
                { id: 'payroll-news', label: 'Novedades de nómina', icon: 'wallet', href: '/nomina/novedades' },
                { id: 'evaluations', label: 'Evaluaciones', icon: 'clipboard', href: '/evaluaciones' },
                { id: 'reports', label: 'Reportes', icon: 'chart', href: '/reportes' },
            ],
        },
    ],
    'Jefe de área': [
        {
            label: 'Principal',
            items: [dashboard],
        },
        {
            label: 'Mi equipo',
            items: [
                { id: 'team', label: 'Equipo de trabajo', icon: 'users', href: '/equipo' },
                { id: 'team-attendance', label: 'Asistencia del equipo', icon: 'clock', href: '/asistencia/equipo' },
                { id: 'leave-approvals', label: 'Aprobaciones de vacaciones y permisos', icon: 'calendar', href: '/vacaciones/aprobaciones' },
                { id: 'team-evaluations', label: 'Evaluaciones de desempeño', icon: 'clipboard', href: '/evaluaciones' },
            ],
        },
    ],
    Nómina: [
        {
            label: 'Principal',
            items: [dashboard],
        },
        {
            label: 'Nómina',
            items: [
                { id: 'payroll-news', label: 'Novedades de nómina', icon: 'wallet', href: '/nomina/novedades' },
                { id: 'payroll-periods', label: 'Novedades consolidadas por período', icon: 'layers', href: '/nomina/periodos' },
            ],
        },
    ],
    Gerencia: [
        {
            label: 'Principal',
            items: [dashboard],
        },
        {
            label: 'Consulta gerencial',
            items: [
                { id: 'general-indicators', label: 'Indicadores generales', icon: 'chart', href: '/dashboard' },
                { id: 'employees-read', label: 'Consulta de empleados', icon: 'users', href: '/empleados' },
                { id: 'contracts-read', label: 'Consulta de contratos', icon: 'file', href: '/contratos' },
                { id: 'evaluations-read', label: 'Consulta de evaluaciones', icon: 'clipboard', href: '/evaluaciones' },
                { id: 'general-reports', label: 'Reportes generales', icon: 'chart', href: '/reportes' },
            ],
        },
    ],
    Empleado: [
        {
            label: 'Mi espacio',
            items: [
                { id: 'my-profile', label: 'Mi perfil', icon: 'user', href: '/mi-perfil' },
                { id: 'my-work-details', label: 'Mis datos laborales', icon: 'briefcase', href: '/mi-perfil' },
                { id: 'my-contract', label: 'Mi contrato', icon: 'file', href: '/mis-contratos' },
                { id: 'my-attendance', label: 'Mi asistencia', icon: 'clock', href: '/mi-asistencia' },
                { id: 'request-vacation', label: 'Solicitar vacaciones', icon: 'calendar', href: '/mis-vacaciones' },
                { id: 'request-permission', label: 'Solicitar permisos', icon: 'calendar', href: '/mis-vacaciones' },
                { id: 'my-requests', label: 'Mis solicitudes', icon: 'clipboard', href: '/mis-vacaciones' },
                { id: 'vacation-balance', label: 'Saldo de vacaciones', icon: 'layers', href: '/mis-vacaciones' },
                { id: 'my-evaluations', label: 'Mis evaluaciones', icon: 'clipboard', href: '/mis-evaluaciones' },
            ],
        },
    ],
};

export function navigationForRole(role) {
    return navigationByRole[role] ?? [];
}

export function quickAccessForRole(role) {
    return navigationForRole(role)
        .flatMap((section) => section.items)
        .filter((item) => item.id !== 'dashboard');
}
