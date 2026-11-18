import { useForm } from '@inertiajs/react';
import Icon from './Icon';

function FieldError({ message }) {
    if (!message) {
        return null;
    }

    return <p className="mt-1.5 text-xs text-red-600" role="alert">{message}</p>;
}

export default function UserFormModal({ roles, user = null, onClose }) {
    const isEditing = user !== null;
    const { data, setData, post, put, processing, errors } = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
        password: '',
        password_confirmation: '',
        role_id: user?.role_id?.toString() ?? '',
        is_active: user?.is_active ?? true,
    });

    function submit(event) {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: onClose,
        };

        if (isEditing) {
            put(`/usuarios/${user.id}`, options);
            return;
        }

        post('/usuarios', options);
    }

    const inputClassName = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#b99551] focus:ring-4 focus:ring-[#d7b26d]/15';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <section
                aria-labelledby="user-form-title"
                aria-modal="true"
                className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                role="dialog"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#92713a]">
                            Gestión de usuarios
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-900" id="user-form-title">
                            {isEditing ? 'Editar usuario' : 'Crear usuario'}
                        </h2>
                    </div>
                    <button
                        aria-label="Cerrar formulario"
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        onClick={onClose}
                        type="button"
                    >
                        <Icon className="h-5 w-5" name="close" />
                    </button>
                </header>

                <form className="space-y-5 px-5 py-5 sm:px-7 sm:py-6" onSubmit={submit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="user-name">
                                Nombre completo
                            </label>
                            <input
                                autoComplete="name"
                                className={inputClassName}
                                id="user-name"
                                onChange={(event) => setData('name', event.target.value)}
                                value={data.name}
                                required
                            />
                            <FieldError message={errors.name} />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="user-email">
                                Correo electrónico
                            </label>
                            <input
                                autoComplete="email"
                                className={inputClassName}
                                id="user-email"
                                onChange={(event) => setData('email', event.target.value)}
                                type="email"
                                value={data.email}
                                required
                            />
                            <FieldError message={errors.email} />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="user-role">
                                Rol
                            </label>
                            <select
                                className={inputClassName}
                                id="user-role"
                                onChange={(event) => setData('role_id', event.target.value)}
                                value={data.role_id}
                                required
                            >
                                <option value="">Selecciona un rol</option>
                                {roles.map((role) => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                            <FieldError message={errors.role_id} />
                        </div>

                        <div className="flex items-center rounded-xl border border-slate-200 px-3.5 py-2.5">
                            <label className="flex cursor-pointer items-center gap-3" htmlFor="user-active">
                                <input
                                    checked={data.is_active}
                                    className="h-4 w-4 rounded border-slate-300 accent-[#17243a] focus:ring-[#d7b26d]"
                                    id="user-active"
                                    onChange={(event) => setData('is_active', event.target.checked)}
                                    type="checkbox"
                                />
                                <span>
                                    <span className="block text-sm font-medium text-slate-700">Cuenta activa</span>
                                    <span className="mt-0.5 block text-xs text-slate-500">
                                        Permite iniciar sesión en el sistema
                                    </span>
                                </span>
                            </label>
                            <FieldError message={errors.is_active} />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="user-password">
                                {isEditing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                            </label>
                            <input
                                autoComplete="new-password"
                                className={inputClassName}
                                id="user-password"
                                onChange={(event) => setData('password', event.target.value)}
                                required={!isEditing}
                                type="password"
                                value={data.password}
                            />
                            <FieldError message={errors.password} />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="user-password-confirmation">
                                Confirmar contraseña
                            </label>
                            <input
                                autoComplete="new-password"
                                className={inputClassName}
                                id="user-password-confirmation"
                                onChange={(event) => setData('password_confirmation', event.target.value)}
                                required={!isEditing || data.password.length > 0}
                                type="password"
                                value={data.password_confirmation}
                            />
                        </div>
                    </div>

                    {errors.user && <p className="text-sm text-red-600" role="alert">{errors.user}</p>}

                    <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                        <button
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                            onClick={onClose}
                            type="button"
                        >
                            Cancelar
                        </button>
                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17243a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#243551] disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={processing}
                            type="submit"
                        >
                            {processing && <Icon className="h-4 w-4 animate-spin" name="loader" />}
                            {processing
                                ? 'Guardando...'
                                : isEditing ? 'Guardar cambios' : 'Crear usuario'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
