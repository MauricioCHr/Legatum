import { useEffect, useRef, useState } from 'react';
import { ArrowRight, EyeOff, KeyRound } from 'lucide-react';
import { Head, useForm } from '@inertiajs/react';
import Icon from '../../Components/Icon';
import '../../../css/login.css';

const highlights = [
    {
        icon: 'briefcase',
        title: 'Gestión de talento humano',
        subtitle: 'Acceso a la información laboral',
        body: 'Colaboradores, departamentos y cargos en un solo espacio de trabajo.',
    },
    {
        icon: 'users',
        title: 'Expedientes de colaboradores',
        subtitle: 'Historial laboral centralizado',
        body: 'Contratos, novedades y documentos siempre actualizados y disponibles.',
    },
    {
        icon: 'building',
        title: 'Estructura organizacional',
        subtitle: 'Departamentos y cargos',
        body: 'Visualiza jerarquías y responsabilidades de toda la organización.',
    },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
    const [activeHighlight, setActiveHighlight] = useState(0);
    const [isHighlightPaused, setIsHighlightPaused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [capsLockEnabled, setCapsLockEnabled] = useState(false);
    const [clientErrors, setClientErrors] = useState({});
    const [isShaking, setIsShaking] = useState(false);
    const [notice, setNotice] = useState('');
    const [noticeVisible, setNoticeVisible] = useState(false);
    const noticeTimeoutRef = useRef(null);
    const shakeTimeoutRef = useRef(null);
    const brandPanelRef = useRef(null);
    const tiltCardRef = useRef(null);
    const { data, setData, post, processing, errors, clearErrors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (isHighlightPaused || prefersReducedMotion) {
            return undefined;
        }

        const rotationInterval = window.setInterval(() => {
            setActiveHighlight((current) => (current + 1) % highlights.length);
        }, 5000);

        return () => window.clearInterval(rotationInterval);
    }, [activeHighlight, isHighlightPaused]);

    useEffect(() => () => {
        window.clearTimeout(noticeTimeoutRef.current);
        window.clearTimeout(shakeTimeoutRef.current);
    }, []);

    function showNotice(message) {
        setNotice(message);
        setNoticeVisible(true);
        window.clearTimeout(noticeTimeoutRef.current);
        noticeTimeoutRef.current = window.setTimeout(() => setNoticeVisible(false), 3500);
    }

    function handleSubmit(event) {
        event.preventDefault();

        const nextErrors = {};
        const normalizedEmail = data.email.trim();

        if (!normalizedEmail) {
            nextErrors.email = 'El correo es obligatorio.';
        } else if (!emailPattern.test(normalizedEmail)) {
            nextErrors.email = 'Ingresa un correo válido.';
        }

        if (!data.password) {
            nextErrors.password = 'La contraseña es obligatoria.';
        }

        setClientErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            setIsShaking(false);
            window.requestAnimationFrame(() => setIsShaking(true));
            window.clearTimeout(shakeTimeoutRef.current);
            shakeTimeoutRef.current = window.setTimeout(() => setIsShaking(false), 450);
            return;
        }

        post('/login');
    }

    function handleEmailChange(event) {
        const email = event.target.value;

        setData('email', email);
        clearErrors('email');
        setClientErrors((current) => ({
            ...current,
            email: emailPattern.test(email.trim()) ? undefined : current.email,
        }));
    }

    function handlePasswordChange(event) {
        setData('password', event.target.value);
        clearErrors('password');
        setClientErrors((current) => ({
            ...current,
            password: event.target.value ? undefined : current.password,
        }));
    }

    function handleBrandPointerMove(event) {
        const panel = brandPanelRef.current;
        const card = tiltCardRef.current;

        if (!panel || !card) {
            return;
        }

        const bounds = panel.getBoundingClientRect();
        const positionX = (event.clientX - bounds.left) / bounds.width;
        const positionY = (event.clientY - bounds.top) / bounds.height;

        panel.style.setProperty('--spot-x', `${positionX * 100}%`);
        panel.style.setProperty('--spot-y', `${positionY * 100}%`);
        card.style.transform = `rotateX(${(positionY - 0.5) * -8}deg) rotateY(${(positionX - 0.5) * 10}deg)`;
    }

    function handleBrandPointerLeave() {
        if (tiltCardRef.current) {
            tiltCardRef.current.style.transform = 'rotateX(0) rotateY(0)';
        }
    }

    function handlePasswordKey(event) {
        setCapsLockEnabled(event.getModifierState?.('CapsLock') ?? false);
    }

    const emailError = clientErrors.email || errors.email;
    const passwordError = clientErrors.password || errors.password;
    const isEmailValid = emailPattern.test(data.email.trim());
    const activeCard = highlights[activeHighlight];

    return (
        <>
            <Head title="Iniciar sesión | LEGATUM">
                <meta name="theme-color" content="#111c33" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <div className="login-page relative min-h-dvh overflow-hidden bg-canvas font-sans text-slate-800">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-40 left-1/4 h-[36rem] w-[36rem] rounded-full bg-electric/10 blur-3xl" />
                    <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-gold/10 blur-3xl" />
                </div>

                <div className="relative mx-auto flex min-h-dvh max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:gap-10">
                    <header className="enter-down flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 shadow-[0_1px_2px_rgba(15,27,51,0.04),0_8px_24px_-12px_rgba(15,27,51,0.12)] backdrop-blur-xl sm:px-5">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-navy text-white shadow-md shadow-navy/20 transition-transform duration-300 hover:-rotate-6 hover:scale-105">
                                <Icon className="h-[18px] w-[18px]" name="layers" />
                            </div>
                            <span className="font-semibold tracking-tight text-navy">LEGATUM</span>
                            <span className="rounded-md bg-electric/10 px-2 py-0.5 text-[11px] font-semibold text-electric">HCM</span>
                            <span aria-hidden="true" className="hidden h-5 w-px bg-slate-200 sm:block" />
                            <span className="hidden truncate text-xs text-slate-500 sm:block">Comercializadora Andina S.A.S.</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            <span aria-hidden="true" className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                            <span className="hidden sm:inline">Entorno Corporativo</span>
                            <span className="sm:hidden">Activo</span>
                        </div>
                    </header>

                    <main className="enter grid flex-1 overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-30px_rgba(15,27,51,0.35)] ring-1 ring-slate-200/60 lg:mb-6 lg:grid-cols-[1fr_1.1fr]">
                        <section
                            aria-label="Presentación de LEGATUM HCM"
                            className="brand-spotlight relative isolate flex flex-col overflow-hidden bg-navy p-8 text-white sm:p-10 lg:p-12"
                            onPointerLeave={handleBrandPointerLeave}
                            onPointerMove={handleBrandPointerMove}
                            ref={brandPanelRef}
                        >
                            <div aria-hidden="true" className="brand-grid pointer-events-none absolute inset-0 -z-10 opacity-60" />
                            <div aria-hidden="true" className="spin-slow pointer-events-none absolute -bottom-32 -right-32 -z-10 h-[28rem] w-[28rem] rounded-full border border-white/5">
                                <span className="absolute left-1/2 top-8 h-2 w-2 rounded-full bg-gold shadow-[0_0_16px_4px_rgba(212,162,76,0.4)]" />
                            </div>
                            <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 -z-10 h-72 w-72 rounded-full border border-white/5" />
                            <div aria-hidden="true" className="float-slow pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-electric/30 blur-3xl" />

                            <div className="enter inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs backdrop-blur">
                                <Icon className="h-3.5 w-3.5 text-gold" name="layers" />
                                <span className="font-semibold">LEGATUM HCM</span>
                                <span aria-hidden="true" className="text-white/40">·</span>
                                <span className="text-white/70">Talento Humano</span>
                            </div>

                            <h1 className="enter d-1 mt-8 max-w-md text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                                Gestión inteligente del <span className="shine-text">talento humano</span>
                            </h1>
                            <p className="enter d-2 mt-4 max-w-md text-pretty text-sm leading-relaxed text-white/65">
                                Plataforma centralizada para la administración de colaboradores y su información laboral.
                            </p>

                            <div
                                className="relative mb-10 mt-12 flex-1 [perspective:1200px]"
                                onMouseEnter={() => setIsHighlightPaused(true)}
                                onMouseLeave={() => setIsHighlightPaused(false)}
                            >
                                <div
                                    className="relative mx-auto max-w-sm transition-transform duration-300 ease-out [transform-style:preserve-3d]"
                                    ref={tiltCardRef}
                                >
                                    <div aria-hidden="true" className="absolute inset-x-4 -top-6 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[11px] backdrop-blur-sm [transform:translateZ(-30px)]">
                                        <span className="flex items-center gap-1.5 font-medium text-gold">
                                            <Icon className="h-3.5 w-3.5" name="shield" />
                                            LEGATUM
                                        </span>
                                        <span className="rounded-full border border-white/15 px-2 py-0.5 text-white/50">Talento Humano</span>
                                    </div>

                                    <article aria-live="polite" className="relative rounded-2xl border border-white/15 bg-white/[0.08] p-5 shadow-2xl shadow-black/40 backdrop-blur-xl [transform:translateZ(20px)]">
                                        <div className="enter" key={activeCard.title} style={{ animationDuration: '.5s' }}>
                                            <div className="flex items-start gap-3">
                                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                                                    <Icon className="h-[18px] w-[18px]" name={activeCard.icon} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h2 className="text-sm font-semibold">{activeCard.title}</h2>
                                                    <p className="mt-0.5 text-xs text-white/55">{activeCard.subtitle}</p>
                                                </div>
                                                <span className="rounded-full border border-white/20 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white/80">LEGATUM</span>
                                            </div>
                                            <div className="my-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                            <p className="text-sm leading-relaxed text-white/80">{activeCard.body}</p>
                                        </div>
                                        <div className="mt-5 flex items-center justify-between">
                                            <span className="flex items-center gap-1.5 text-[11px] text-white/50">
                                                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
                                                Comercializadora Andina S.A.S.
                                            </span>
                                            <div aria-label="Funcionalidades destacadas" className="flex items-center gap-1.5" role="tablist">
                                                {highlights.map((highlight, index) => (
                                                    <button
                                                        aria-label={highlight.title}
                                                        aria-selected={index === activeHighlight}
                                                        className={`relative h-1.5 overflow-hidden rounded-full bg-white/15 transition-all duration-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${index === activeHighlight ? 'w-6' : 'w-1.5'}`}
                                                        key={highlight.title}
                                                        onClick={() => setActiveHighlight(index)}
                                                        role="tab"
                                                        type="button"
                                                    >
                                                        {index === activeHighlight && (
                                                            <span className={`absolute inset-y-0 left-0 rounded-full bg-gold ${isHighlightPaused ? 'w-full' : 'progress-run'}`} />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </article>

                                    <div aria-hidden="true" className="float absolute -bottom-5 -right-3 flex items-center gap-2 rounded-xl border border-white/15 bg-navy-light/90 px-3 py-2 text-[11px] shadow-xl backdrop-blur [transform:translateZ(50px)]">
                                        <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-400/15 text-emerald-300">
                                            <Icon className="h-3.5 w-3.5" name="shield" />
                                        </span>
                                        Sesión protegida
                                    </div>
                                </div>
                            </div>

                            <footer className="flex items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/55">
                                <span>Comercializadora Andina S.A.S.</span>
                                <span className="flex items-center gap-1.5 text-gold">
                                    <Icon className="h-3.5 w-3.5" name="lock" />
                                    Portal institucional
                                </span>
                            </footer>
                        </section>

                        <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-16">
                            <div className="w-full max-w-md">
                                <div>
                                    <p className="enter flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-electric">
                                        <Icon className="h-4 w-4" name="shield" />
                                        Portal de autenticación unificado
                                    </p>
                                    <h2 className="enter d-1 mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">Iniciar sesión</h2>
                                    <p className="enter d-2 mt-2 text-sm text-slate-500">
                                        Ingresa tus credenciales autorizadas para acceder a tu espacio corporativo.
                                    </p>

                                    <div className="enter d-3 group mt-7 flex items-center gap-3 rounded-2xl border border-electric/10 bg-gradient-to-r from-electric/[0.06] to-transparent p-3 transition-colors hover:border-electric/25">
                                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-electric shadow-sm ring-1 ring-slate-200/70 transition-transform duration-300 group-hover:scale-105">
                                            <KeyRound aria-hidden="true" className="h-[18px] w-[18px]" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-navy">Acceso corporativo</p>
                                            <p className="text-xs text-slate-500">Usa la cuenta asignada por tu organización</p>
                                        </div>
                                        <span className="hidden text-[10px] font-semibold tracking-wider text-slate-400 sm:block">LEGATUM</span>
                                    </div>

                                    <form className={`enter d-4 mt-6 space-y-5${isShaking ? ' shake' : ''}`} noValidate onSubmit={handleSubmit}>
                                        <div>
                                            <div className={`field relative${emailError ? ' invalid' : ''}`} id="emailField">
                                                <input
                                                    aria-describedby={emailError ? 'emailError' : undefined}
                                                    aria-invalid={Boolean(emailError)}
                                                    autoComplete="email"
                                                    className="field-input"
                                                    id="email"
                                                    inputMode="email"
                                                    name="email"
                                                    onChange={handleEmailChange}
                                                    placeholder=" "
                                                    type="email"
                                                    value={data.email}
                                                />
                                                <Icon className="field-icon pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" name="mail" />
                                                <label className="field-label" htmlFor="email">Correo electrónico corporativo</label>
                                                {isEmailValid && !emailError && (
                                                    <span aria-hidden="true" className="zoom-in absolute right-4 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-emerald-500 text-white">
                                                        <Icon className="h-3 w-3" name="check" strokeWidth={3} />
                                                    </span>
                                                )}
                                            </div>
                                            {emailError && (
                                                <p className="enter-down mt-1.5 flex items-center gap-1.5 text-xs text-rose-600" id="emailError" role="alert">
                                                    <Icon className="h-3.5 w-3.5" name="alert" />
                                                    <span>{emailError}</span>
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <div className="mb-2 flex justify-end">
                                                <button
                                                    className="text-xs font-medium text-electric underline-offset-4 transition-colors hover:text-navy hover:underline"
                                                    onClick={() => showNotice('Para recuperar el acceso, contacta al administrador de Talento Humano.')}
                                                    type="button"
                                                >
                                                    ¿Olvidaste tu contraseña?
                                                </button>
                                            </div>
                                            <div className={`field relative${passwordError ? ' invalid' : ''}`} id="passwordField">
                                                <input
                                                    aria-describedby={[
                                                        passwordError ? 'passwordError' : null,
                                                        capsLockEnabled ? 'capsWarning' : null,
                                                    ].filter(Boolean).join(' ') || undefined}
                                                    aria-invalid={Boolean(passwordError)}
                                                    autoComplete="current-password"
                                                    className="field-input pr-12"
                                                    id="password"
                                                    name="password"
                                                    onChange={handlePasswordChange}
                                                    onKeyDown={handlePasswordKey}
                                                    onKeyUp={handlePasswordKey}
                                                    onBlur={() => setCapsLockEnabled(false)}
                                                    placeholder=" "
                                                    type={isPasswordVisible ? 'text' : 'password'}
                                                    value={data.password}
                                                />
                                                <Icon className="field-icon pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" name="lock" />
                                                <label className="field-label" htmlFor="password">Contraseña de acceso</label>
                                                <button
                                                    aria-label={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                                    aria-pressed={isPasswordVisible}
                                                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-navy active:scale-90"
                                                    onClick={() => setIsPasswordVisible((visible) => !visible)}
                                                    type="button"
                                                >
                                                    {isPasswordVisible
                                                        ? <EyeOff aria-hidden="true" className="h-4 w-4" />
                                                        : <Icon className="h-4 w-4" name="eye" />}
                                                </button>
                                            </div>
                                            {passwordError && (
                                                <p className="enter-down mt-1.5 flex items-center gap-1.5 text-xs text-rose-600" id="passwordError" role="alert">
                                                    <Icon className="h-3.5 w-3.5" name="alert" />
                                                    <span>{passwordError}</span>
                                                </p>
                                            )}
                                            {capsLockEnabled && (
                                                <p className="enter-down mt-2 flex items-center gap-1.5 text-xs text-amber-600" id="capsWarning" role="status">
                                                    <Icon className="h-3.5 w-3.5" name="alert" />
                                                    Bloq Mayús está activado
                                                </p>
                                            )}
                                        </div>

                                        <label className="group flex w-fit cursor-pointer select-none items-center gap-3" htmlFor="remember">
                                            <span className="relative inline-flex">
                                                <input
                                                    checked={data.remember}
                                                    className="sr-only"
                                                    id="remember"
                                                    onChange={(event) => setData('remember', event.target.checked)}
                                                    type="checkbox"
                                                />
                                                <span aria-hidden="true" className="switch-track h-5 w-9 rounded-full bg-slate-200" />
                                                <span aria-hidden="true" className="switch-thumb absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
                                            </span>
                                            <span className="text-sm text-slate-600 transition-colors group-hover:text-navy">Recordar sesión en este equipo</span>
                                        </label>

                                        <button
                                            aria-busy={processing}
                                            className="btn-shine group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-electric to-navy text-sm font-semibold text-white shadow-lg shadow-navy/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-electric/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric active:translate-y-0 active:scale-[0.99] disabled:cursor-wait disabled:hover:translate-y-0"
                                            disabled={processing}
                                            type="submit"
                                        >
                                            {!processing ? (
                                                <span className="flex items-center gap-2">
                                                    Iniciar sesión
                                                    <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <Icon className="h-4 w-4 animate-spin motion-reduce:animate-none" name="loader" />
                                                    Verificando credenciales…
                                                </span>
                                            )}
                                        </button>

                                        <div aria-hidden="true" className="flex items-center gap-3 text-[11px] text-slate-400">
                                            <span className="h-px flex-1 bg-slate-200" />
                                            o
                                            <span className="h-px flex-1 bg-slate-200" />
                                        </div>

                                        <button
                                            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-navy transition-all duration-300 hover:border-electric/30 hover:bg-electric/[0.04] active:scale-[0.99] disabled:opacity-60"
                                            disabled={processing}
                                            onClick={() => showNotice('El inicio de sesión único no está configurado para esta organización.')}
                                            type="button"
                                        >
                                            <Icon className="h-4 w-4 text-electric" name="shield" />
                                            Inicio de sesión único (SSO)
                                        </button>
                                    </form>

                                    {notice && (
                                        <p className={`login-notice mt-3 text-center text-xs text-electric${noticeVisible ? ' is-visible' : ''}`} role="status">
                                            {notice}
                                        </p>
                                    )}

                                    <p className="mt-8 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-5 text-xs text-slate-400">
                                        <Icon className="h-3.5 w-3.5 text-gold" name="lock" />
                                        Acceso reservado a usuarios autorizados · Conexión cifrada
                                    </p>
                                </div>
                            </div>
                        </section>
                    </main>
                </div>
            </div>
        </>
    );
}
