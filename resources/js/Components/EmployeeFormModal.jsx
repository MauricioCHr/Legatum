import { useForm } from '@inertiajs/react';
import Icon from './Icon';

function FieldError({ message }) {
    if (!message) {
        return null;
    }

    return <p className="mt-1.5 text-xs text-red-600" role="alert">{message}</p>;
}

export default function EmployeeFormModal({
    employee = null,
    availableUsers,
    departments,
    positions,
    documentTypes,
    onClose,
}) {
    const isEditing = employee !== null;
    const hasLegacyDocumentType = isEditing
        && employee.tipo_documento
        && !documentTypes.some((documentType) => documentType.value === employee.tipo_documento);
    const { data, setData, post, put, processing, errors } = useForm({
        user_id: employee?.user_id?.toString() ?? '',
        tipo_documento: employee?.tipo_documento ?? '',
        numero_documento: employee?.numero_documento ?? '',
        telefono: employee?.telefono ?? '',
        direccion: employee?.direccion ?? '',
        fecha_nacimiento: employee?.fecha_nacimiento ?? '',
        fecha_contratacion: employee?.fecha_contratacion ?? '',
        departamento_id: employee?.departamento_id?.toString() ?? '',
        cargo_id: employee?.cargo_id?.toString() ?? '',
    });

    function submit(event) {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: onClose,
        };

        if (isEditing) {
            put(`/empleados/${employee.id}`, options);
            return;
        }

        post('/empleados', options);
    }

    const inputClassName = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#b99551] focus:ring-4 focus:ring-[#d7b26d]/15';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <section
                aria-labelledby="employee-form-title"
                aria-modal="true"
                className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                role="dialog"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#92713a]">
                            Gestión de empleados
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-900" id="employee-form-title">
                            {isEditing ? 'Editar empleado' : 'Registrar empleado'}
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
                    {!isEditing ? (
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="employee-user">
                                Cuenta de usuario
                            </label>
                            <select
                                className={inputClassName}
                                id="employee-user"
                                onChange={(event) => setData('user_id', event.target.value)}
                                required
                                value={data.user_id}
                            >
                                <option value="">Selecciona una cuenta disponible</option>
                                {availableUsers.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} — {user.email}
                                    </option>
                                ))}
                            </select>
                            <FieldError message={errors.user_id} />
                            <p className="mt-1.5 text-xs text-slate-500">
                                El nombre y el correo se obtendrán de esta cuenta. No se creará ni modificará una cuenta de usuario.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-xs font-medium text-slate-500">Cuenta asociada</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">{employee.user?.name}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{employee.user?.email}</p>
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="employee-document-type">
                                Tipo de documento *
                            </label>
                            <select
                                className={inputClassName}
                                id="employee-document-type"
                                onChange={(event) => setData('tipo_documento', event.target.value)}
                                required
                                value={data.tipo_documento}
                            >
                                <option value="">Selecciona un tipo de documento</option>
                                {hasLegacyDocumentType && (
                                    <option value={employee.tipo_documento}>
                                        {employee.tipo_documento} (tipo existente)
                                    </option>
                                )}
                                {documentTypes.map((documentType) => (
                                    <option key={documentType.value} value={documentType.value}>
                                        {documentType.label}
                                    </option>
                                ))}
                            </select>
                            <FieldError message={errors.tipo_documento} />
                            {hasLegacyDocumentType && (
                                <p className="mt-1.5 text-xs text-slate-500">
                                    Este valor existente se conservará a menos que selecciones un tipo oficial.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="employee-document-number">
                                Número de documento
                            </label>
                            <input
                                className={inputClassName}
                                id="employee-document-number"
                                onChange={(event) => setData('numero_documento', event.target.value)}
                                required
                                value={data.numero_documento}
                            />
                            <FieldError message={errors.numero_documento} />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="employee-phone">
                                Teléfono
                            </label>
                            <input
                                className={inputClassName}
                                id="employee-phone"
                                onChange={(event) => setData('telefono', event.target.value)}
                                required
                                type="tel"
                                value={data.telefono}
                            />
                            <FieldError message={errors.telefono} />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="employee-birth-date">
                                Fecha de nacimiento
                            </label>
                            <input
                                className={inputClassName}
                                id="employee-birth-date"
                                onChange={(event) => setData('fecha_nacimiento', event.target.value)}
                                required
                                type="date"
                                value={data.fecha_nacimiento}
                            />
                            <FieldError message={errors.fecha_nacimiento} />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="employee-address">
                                Dirección
                            </label>
                            <textarea
                                className={inputClassName}
                                id="employee-address"
                                onChange={(event) => setData('direccion', event.target.value)}
                                required
                                rows="2"
                                value={data.direccion}
                            />
                            <FieldError message={errors.direccion} />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="employee-hire-date">
                                Fecha de contratación
                            </label>
                            <input
                                className={inputClassName}
                                id="employee-hire-date"
                                onChange={(event) => setData('fecha_contratacion', event.target.value)}
                                required
                                type="date"
                                value={data.fecha_contratacion}
                            />
                            <FieldError message={errors.fecha_contratacion} />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="employee-department">
                                Departamento
                            </label>
                            <select
                                className={inputClassName}
                                id="employee-department"
                                onChange={(event) => setData('departamento_id', event.target.value)}
                                required
                                value={data.departamento_id}
                            >
                                <option value="">Selecciona un departamento</option>
                                {departments.map((department) => (
                                    <option key={department.id} value={department.id}>{department.nombre}</option>
                                ))}
                            </select>
                            <FieldError message={errors.departamento_id} />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="employee-position">
                                Cargo
                            </label>
                            <select
                                className={inputClassName}
                                id="employee-position"
                                onChange={(event) => setData('cargo_id', event.target.value)}
                                required
                                value={data.cargo_id}
                            >
                                <option value="">Selecciona un cargo</option>
                                {positions.map((position) => (
                                    <option key={position.id} value={position.id}>{position.nombre}</option>
                                ))}
                            </select>
                            <FieldError message={errors.cargo_id} />
                        </div>
                    </div>

                    {isEditing && (
                        <p className="text-xs text-slate-500">
                            El estado laboral se cambia desde el listado y es independiente del estado de la cuenta.
                        </p>
                    )}

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
                                : isEditing ? 'Guardar cambios' : 'Registrar empleado'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
