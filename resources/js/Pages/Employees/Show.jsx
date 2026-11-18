import { Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import Icon from '../../Components/Icon';

function Detail({ label, value }) {
    return (
        <div>
            <dt className="text-xs font-medium text-slate-400">{label}</dt>
            <dd className="mt-1 break-words text-sm font-medium text-slate-800">{value}</dd>
        </div>
    );
}

export default function Show({
    employee,
    activeContract,
    canManage,
    canManageAttendancePin,
    attendanceCode,
    hasAttendancePin,
    attendancePinUpdatedAt,
    flash,
}) {
    const isActive = employee.estado === 'Activo';
    const pinForm = useForm({
        pin: '',
        pin_confirmation: '',
    });

    function handlePinSubmit(event) {
        event.preventDefault();
        pinForm.put(`/empleados/${employee.id}/credenciales-marcacion`, {
            onSuccess: () => pinForm.reset(),
        });
    }

    return (
        <AuthenticatedLayout title="Detalle del empleado">
            <div className="w-full min-w-0 space-y-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#92713a]">
                            {canManage ? 'Gestión del talento' : 'Consulta gerencial'}
                        </p>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                            Detalle del empleado
                        </h1>
                    </div>
                    <Link
                        className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        href="/empleados"
                    >
                        <Icon className="h-4 w-4" name="chevronLeft" />
                        Volver al listado
                    </Link>
                </header>

                {flash?.success && (
                    <div aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div aria-live="assertive" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                        {flash.error}
                    </div>
                )}

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
                    <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                        <div className="flex items-center gap-4">
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#17243a]/[0.06] text-lg font-semibold text-[#17243a]">
                                {employee.user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                            </span>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">{employee.user.name}</h2>
                                <p className="mt-1 text-sm text-slate-500">{employee.user.email}</p>
                            </div>
                        </div>
                        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                            isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {employee.estado}
                        </span>
                    </div>

                    <dl className="grid gap-x-8 gap-y-6 px-5 py-6 sm:grid-cols-2 sm:px-7">
                        <Detail label="Tipo de documento" value={employee.tipo_documento} />
                        <Detail label="Número de documento" value={employee.numero_documento} />
                        <Detail label="Teléfono" value={employee.telefono} />
                        <Detail label="Dirección" value={employee.direccion} />
                        <Detail label="Fecha de nacimiento" value={employee.fecha_nacimiento} />
                        <Detail label="Fecha de contratación" value={employee.fecha_contratacion} />
                        <Detail label="Departamento" value={employee.departamento} />
                        <Detail label="Cargo" value={employee.cargo} />
                    </dl>
                </section>

                {activeContract && (
                    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#92713a]">Vinculación laboral</p>
                                <h2 className="mt-1 text-lg font-semibold text-slate-900">Contrato vigente</h2>
                            </div>
                            <Link
                                className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                                href={`/contratos/${activeContract.id}`}
                            >
                                Ver expediente contractual
                                <Icon className="h-4 w-4" name="chevronRight" />
                            </Link>
                        </div>
                        <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                            <Detail label="Número de contrato" value={activeContract.numero_contrato} />
                            <Detail label="Tipo de contrato" value={activeContract.tipo} />
                            <Detail
                                label="Salario básico mensual"
                                value={`$${Number(activeContract.salario).toLocaleString('es-CO')} COP`}
                            />
                            <Detail label="Fecha de inicio" value={activeContract.fecha_inicio} />
                            <Detail label="Fecha de vencimiento" value={activeContract.fecha_fin ?? 'Término indefinido'} />
                        </dl>
                    </section>
                )}

                {canManageAttendancePin && (
                    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#92713a]">Marcación pública</p>
                            <h2 className="mt-1 text-lg font-semibold text-slate-900">Código y PIN de asistencia</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Comparte el código con el empleado por un canal seguro. El PIN no se puede consultar; aquí puedes asignar uno nuevo.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg bg-slate-50 p-3">
                                <p className="text-xs font-medium text-slate-500">Código de marcación</p>
                                <p className="mt-1 font-mono text-lg font-semibold tracking-wider text-slate-900">
                                    {attendanceCode ?? 'Se generará al asignar el PIN'}
                                </p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                                <p className="text-xs font-medium text-slate-500">Estado del PIN</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {hasAttendancePin ? 'Configurado (valor oculto)' : 'Pendiente de asignar'}
                                </p>
                                {attendancePinUpdatedAt && (
                                    <p className="mt-1 text-xs text-slate-500">
                                        Último cambio: {new Date(attendancePinUpdatedAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                                    </p>
                                )}
                            </div>
                        </div>

                        <form className="grid gap-3 sm:grid-cols-2" onSubmit={handlePinSubmit}>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700" htmlFor="attendance-pin">
                                    Nuevo PIN (6 a 12 dígitos)
                                </label>
                                <input
                                    autoComplete="new-password"
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tracking-widest outline-none focus:border-[#547da6]"
                                    id="attendance-pin"
                                    inputMode="numeric"
                                    maxLength={12}
                                    onChange={(event) => pinForm.setData('pin', event.target.value.replace(/\D/g, ''))}
                                    required
                                    type="password"
                                    value={pinForm.data.pin}
                                />
                                {pinForm.errors.pin && <p className="mt-1 text-xs text-red-600">{pinForm.errors.pin}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700" htmlFor="attendance-pin-confirmation">
                                    Confirmar nuevo PIN
                                </label>
                                <input
                                    autoComplete="new-password"
                                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tracking-widest outline-none focus:border-[#547da6]"
                                    id="attendance-pin-confirmation"
                                    inputMode="numeric"
                                    maxLength={12}
                                    onChange={(event) => pinForm.setData('pin_confirmation', event.target.value.replace(/\D/g, ''))}
                                    required
                                    type="password"
                                    value={pinForm.data.pin_confirmation}
                                />
                                {pinForm.errors.pin_confirmation && (
                                    <p className="mt-1 text-xs text-red-600">{pinForm.errors.pin_confirmation}</p>
                                )}
                            </div>
                            <div className="sm:col-span-2">
                                <button
                                    className="rounded-lg bg-[#07152b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a3150] disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={pinForm.processing}
                                    type="submit"
                                >
                                    {pinForm.processing ? 'Guardando…' : hasAttendancePin ? 'Restablecer PIN' : 'Asignar código y PIN'}
                                </button>
                            </div>
                        </form>
                    </section>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
