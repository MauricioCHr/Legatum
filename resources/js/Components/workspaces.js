const workspaces = {
    Administrador: {
        name: 'Administración',
        description: 'Administración general de la plataforma.',
        icon: 'shield',
    },
    'Talento Humano': {
        name: 'Talento Humano',
        description: 'Espacio de trabajo de gestión de personas.',
        icon: 'users',
    },
    'Jefe de área': {
        name: 'Jefatura de área',
        description: 'Espacio de seguimiento para tu área.',
        icon: 'briefcase',
    },
    Nómina: {
        name: 'Nómina',
        description: 'Espacio de trabajo del área de nómina.',
        icon: 'wallet',
    },
    Gerencia: {
        name: 'Gerencia',
        description: 'Espacio de consulta gerencial.',
        icon: 'grid',
    },
    Empleado: {
        name: 'Mi espacio',
        description: 'Espacio personal del colaborador.',
        icon: 'user',
    },
};

export function workspaceForRole(role) {
    if (typeof role === 'string' && Object.hasOwn(workspaces, role)) {
        return workspaces[role];
    }

    return {
        name: 'Espacio de trabajo',
        description: 'Tu perfil aún no tiene un área asignada.',
        icon: 'user',
    };
}
