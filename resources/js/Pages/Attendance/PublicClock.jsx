import { Head, useForm } from '@inertiajs/react';

function BrandMark() {
    return (
        <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#07152b]">
                <svg aria-hidden="true" className="size-6 text-white" fill="none" viewBox="0 0 24 24">
                    <path d="M6 4v16h12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
                    <path d="M11 4v11h7" opacity="0.55" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
                </svg>
            </span>
            <span>
                <span className="block text-lg font-semibold tracking-[0.18em] text-slate-900">LEGATUM</span>
                <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">Marcación de asistencia</span>
            </span>
        </div>
    );
}

export default function PublicClock({ serverTime, flash }) {
    const form = useForm({
        employee_name: '',
        pin: '',
    });

    function submit(event) {
        event.preventDefault();
        form.post('/marcacion', {
            preserveScroll: true,
            onSuccess: (page) => {
                if (page.props.flash?.success) {
                    form.reset();
                }
            },
            onFinish: () => form.setData('pin', ''),
        });
    }

    return (
        <>
            <Head title="Marcación de asistencia | LEGATUM" />
            <main className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 py-10">
                <div className="w-full max-w-lg space-y-5">
                    <header className="flex items-center justify-between gap-4">
                        <BrandMark />
                        <time className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold tabular-nums text-slate-600">
                            {serverTime} · Colombia
                        </time>
                    </header>

                    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#547da6]">Registro personal</p>
                            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Marcación de asistencia</h1>
                            <p className="text-sm leading-6 text-slate-600">
                                Ingresa tu nombre y apellido y tu PIN personal. El sistema registrará entrada o salida según tu marcación abierta.
                            </p>
                        </div>

                        {flash?.success && (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
                                {flash.success}
                            </div>
                        )}
                        {flash?.error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                                {flash.error}
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={submit}>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-700" htmlFor="employee_name">
                                    Nombre y apellido
                                </label>
                                <input
                                    autoCapitalize="words"
                                    autoComplete="off"
                                    className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-base tracking-wider text-slate-900 outline-none transition focus:border-[#547da6] focus:ring-2 focus:ring-[#547da6]/20"
                                    id="employee_name"
                                    maxLength={255}
                                    onChange={(event) => form.setData('employee_name', event.target.value)}
                                    required
                                    type="text"
                                    value={form.data.employee_name}
                                />
                                {form.errors.employee_name && (
                                    <p className="text-sm text-red-600" role="alert">{form.errors.employee_name}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-700" htmlFor="pin">
                                    PIN personal
                                </label>
                                <input
                                    autoComplete="off"
                                    className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-base tracking-[0.35em] text-slate-900 outline-none transition focus:border-[#547da6] focus:ring-2 focus:ring-[#547da6]/20"
                                    id="pin"
                                    inputMode="numeric"
                                    maxLength={12}
                                    onChange={(event) => form.setData('pin', event.target.value.replace(/\D/g, ''))}
                                    required
                                    type="password"
                                    value={form.data.pin}
                                />
                                {form.errors.pin && (
                                    <p className="text-sm text-red-600" role="alert">{form.errors.pin}</p>
                                )}
                            </div>

                            <div className="pt-2">
                                <button
                                    className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={form.processing}
                                    type="submit"
                                >
                                    {form.processing ? 'Validando…' : 'Registrar marcación'}
                                </button>
                            </div>
                        </form>

                        <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
                            Si la marcación no se completa, verifica los datos o comunícate con Talento Humano. No compartas tu PIN.
                        </p>
                    </section>

                    <p className="text-center text-xs text-slate-500">
                        La fecha y hora se registran desde el servidor en la zona horaria de Colombia.
                    </p>
                </div>
            </main>
        </>
    );
}
