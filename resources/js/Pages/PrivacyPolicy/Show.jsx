import { Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

function formatAcceptedAt(value) {
    return new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/Bogota',
    }).format(new Date(value));
}

export default function Show({ policy, isAccepted, history }) {
    const form = useForm({ accepted: false });

    function handleSubmit(event) {
        event.preventDefault();
        form.post('/politica-de-datos/aceptar');
    }

    return (
        <AuthenticatedLayout title="Política de tratamiento de datos">
            <main className="mx-auto max-w-3xl space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <header className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#547da6]">
                        Versión {policy.version} · Vigencia {policy.effective_at ?? 'pendiente de configurar'}
                    </p>
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                        Política de tratamiento de datos personales
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Para continuar como empleado, lee y acepta esta política. La aceptación quedará registrada con la versión y fecha correspondientes.
                    </p>
                </header>

                <section
                    aria-label="Contenido de la política"
                    className="max-h-[55vh] overflow-y-auto whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                    {policy.text}
                </section>

                <dl className="grid gap-3 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700 sm:grid-cols-2">
                    <div>
                        <dt className="font-semibold text-slate-700 dark:text-slate-200">Responsable</dt>
                        <dd className="mt-1 text-slate-600 dark:text-slate-300">
                            {policy.responsible_name || 'Pendiente de configurar'}
                            {policy.responsible_identification && ` · ${policy.responsible_identification}`}
                        </dd>
                    </div>
                    <div>
                        <dt className="font-semibold text-slate-700 dark:text-slate-200">Canal de contacto</dt>
                        <dd className="mt-1 break-words text-slate-600 dark:text-slate-300">
                            {policy.contact_email || policy.contact_address
                                ? [policy.contact_email, policy.contact_address].filter(Boolean).join(' · ')
                                : 'Pendiente de configurar'}
                        </dd>
                    </div>
                </dl>

                {isAccepted ? (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" role="status">
                        Ya aceptaste esta versión de la política.
                    </p>
                ) : (
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <label className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                            <input
                                checked={form.data.accepted}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#547da6] focus:ring-[#547da6]"
                                onChange={(event) => form.setData('accepted', event.target.checked)}
                                type="checkbox"
                            />
                            <span>He leído y acepto la política de tratamiento de datos personales.</span>
                        </label>
                        {form.errors.accepted && (
                            <p className="text-sm text-red-600" role="alert">{form.errors.accepted}</p>
                        )}
                        <button
                            className="rounded-md bg-[#07152b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a3150] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!form.data.accepted || form.processing}
                            type="submit"
                        >
                            {form.processing ? 'Registrando…' : 'Aceptar y continuar'}
                        </button>
                    </form>
                )}

                <section aria-labelledby="privacy-history-title" className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white" id="privacy-history-title">
                            Historial de aceptación
                        </h2>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Solo tú puedes consultar tus versiones aceptadas y sus fechas.
                        </p>
                    </div>
                    {history.data.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Aún no hay aceptaciones registradas.</p>
                    ) : (
                        <ul className="space-y-2">
                            {history.data.map((acceptance) => (
                                <li className="rounded-lg border border-slate-200 p-3 dark:border-slate-700" key={acceptance.id}>
                                    <details>
                                        <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-200">
                                            Versión {acceptance.version} · {formatAcceptedAt(acceptance.accepted_at)}
                                        </summary>
                                        <p className="mt-3 whitespace-pre-line text-xs leading-5 text-slate-600 dark:text-slate-300">
                                            {acceptance.text}
                                        </p>
                                    </details>
                                </li>
                            ))}
                        </ul>
                    )}
                    {history.links.length > 3 && (
                        <nav aria-label="Paginación del historial de privacidad" className="flex flex-wrap gap-2 text-xs">
                            {history.links.map((link, index) => (
                                link.url ? (
                                    <Link
                                        className={`rounded px-2 py-1 ${link.active ? 'bg-[#07152b] text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                                        href={link.url}
                                        key={index}
                                    >
                                        <span>
                                            {link.label.includes('Previous') || link.label.includes('Anterior')
                                                ? 'Anterior'
                                                : link.label.includes('Next') || link.label.includes('Siguiente')
                                                    ? 'Siguiente'
                                                    : link.label}
                                        </span>
                                    </Link>
                                ) : null
                            ))}
                        </nav>
                    )}
                </section>
            </main>
        </AuthenticatedLayout>
    );
}
