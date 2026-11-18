import { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Icon from '../Components/Icon';
import { navigationForRole } from '../Components/navigation';
import { workspaceForRole } from '../Components/workspaces';

function initials(name = '') {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'L';
}

export default function AuthenticatedLayout({ title, children }) {
    const [isNavigationOpen, setIsNavigationOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const page = usePage();
    const user = page.props.auth?.user;
    const currentPath = page.url.split(/[?#]/)[0];
    const navigationSections = navigationForRole(user?.role);
    const workspace = workspaceForRole(user?.role);
    const homeHref = user?.role === 'Empleado' ? '/mis-vacaciones' : '/dashboard';
    const currentItem = navigationSections
        .flatMap((section) => section.items.map((item) => ({ ...item, section: section.label })))
        .find((item) => item.href && (
            currentPath === item.href.split(/[?#]/)[0]
            || currentPath.startsWith(`${item.href.split(/[?#]/)[0]}/`)
        ));
    const pageTitle = currentPath === '/dashboard'
        ? 'Panel principal'
        : (title || currentItem?.label || workspace.name);
    const pageSection = currentItem?.section ?? workspace.name;

    return (
        <>
            <Head title={`${title} | LEGATUM`} />

            <div className="flex min-h-dvh bg-background text-foreground">
                {isNavigationOpen && (
                    <button
                        aria-label="Cerrar navegación"
                        className="fixed inset-0 z-40 bg-sidebar/55 backdrop-blur-[2px] md:hidden"
                        onClick={() => setIsNavigationOpen(false)}
                        type="button"
                    />
                )}

                <aside
                    className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-[transform,width] duration-300 ease-out md:sticky md:top-0 md:h-dvh md:translate-x-0 ${
                        isCollapsed ? 'md:w-[76px]' : 'md:w-64'
                    } ${isNavigationOpen ? 'translate-x-0' : '-translate-x-full'}`}
                    id="primary-navigation"
                >
                    <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-5">
                        <Link
                            aria-label="LEGATUM, panel principal"
                            className="flex min-w-0 items-center gap-2.5"
                            href={homeHref}
                            onClick={() => setIsNavigationOpen(false)}
                        >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                                <svg aria-hidden="true" className="size-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <path d="M6 4v16h12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
                                    <path d="M11 4v11h7" opacity="0.55" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
                                </svg>
                            </span>
                            <span className={`min-w-0 transition-all duration-300 ${isCollapsed ? 'md:w-0 md:opacity-0' : ''}`}>
                                <span className="block text-[15px] font-semibold tracking-[0.18em] text-white">LEGATUM</span>
                                <span className="block truncate text-[10px] font-medium uppercase tracking-wider text-sidebar-muted">
                                    Gestión de Talento Humano
                                </span>
                            </span>
                        </Link>
                        <button
                            aria-label="Cerrar menú"
                            className="rounded-md p-1.5 text-sidebar-muted transition hover:bg-sidebar-accent hover:text-white md:hidden"
                            onClick={() => setIsNavigationOpen(false)}
                            type="button"
                        >
                            <Icon className="size-5" name="close" />
                        </button>
                    </div>

                    <div className={`px-4 pt-4 ${isCollapsed ? 'md:px-3' : ''}`}>
                        <div className={`rounded-lg border border-sidebar-border bg-sidebar-accent/60 px-3 py-2 ${isCollapsed ? 'md:px-0 md:text-center' : ''}`}>
                            <p className={`text-[10px] font-medium uppercase tracking-wider text-sidebar-muted ${isCollapsed ? 'md:hidden' : ''}`}>
                                Espacio de trabajo
                            </p>
                            <p className="truncate text-xs font-semibold text-white">
                                <span className={isCollapsed ? 'md:hidden' : ''}>{workspace.name}</span>
                                {isCollapsed && <span className="hidden md:inline">{user?.role?.slice(0, 3)}</span>}
                            </p>
                        </div>
                    </div>

                    <nav
                        aria-label="Navegación principal"
                        className="flex-1 space-y-5 overflow-y-auto px-3 py-4"
                    >
                        {navigationSections.map((section) => (
                            <section key={section.label}>
                                <p className={`mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted ${isCollapsed ? 'md:h-0 md:overflow-hidden md:opacity-0' : ''}`}>
                                    {section.label}
                                </p>
                                <div className="flex flex-col gap-0.5">
                                    {section.items.map((item) => {
                                        if (!item.href) {
                                            return (
                                                <div
                                                    aria-disabled="true"
                                                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-muted/80 ${isCollapsed ? 'md:justify-center md:px-0' : ''}`}
                                                    key={item.id}
                                                    title="Módulo disponible en una próxima etapa"
                                                >
                                                    <Icon className="size-[18px] shrink-0 text-sidebar-muted" name={item.icon} />
                                                    <span className={isCollapsed ? 'md:sr-only' : ''}>{item.label}</span>
                                                    <Icon className={`ml-auto size-3 shrink-0 text-sidebar-muted ${isCollapsed ? 'md:hidden' : ''}`} name="lock" />
                                                </div>
                                            );
                                        }

                                        const itemPath = item.href.split(/[?#]/)[0];
                                        const isActive = currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);

                                        return (
                                            <Link
                                                aria-current={isActive ? 'page' : undefined}
                                                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${
                                                    isActive
                                                        ? 'bg-sidebar-accent text-white'
                                                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white'
                                                } ${isCollapsed ? 'md:justify-center md:px-0' : ''}`}
                                                href={item.href}
                                                key={item.id}
                                                onClick={() => setIsNavigationOpen(false)}
                                                title={isCollapsed ? item.label : undefined}
                                            >
                                                {isActive && (
                                                    <span
                                                        aria-hidden="true"
                                                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary"
                                                    />
                                                )}
                                                <Icon
                                                    className={`size-[18px] shrink-0 transition-colors ${isActive ? 'text-sidebar-primary' : 'text-sidebar-muted group-hover:text-white'}`}
                                                    name={item.icon}
                                                />
                                                <span className={`min-w-0 flex-1 truncate ${isCollapsed ? 'md:sr-only' : ''}`}>
                                                    {item.label}
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </nav>

                    <div className="border-t border-sidebar-border p-3">
                        <div className={`flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-2.5 ${isCollapsed ? 'md:justify-center md:bg-transparent md:p-0' : ''}`}>
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-white">
                                {initials(user?.name)}
                            </span>
                            <div className={`min-w-0 flex-1 ${isCollapsed ? 'md:hidden' : ''}`}>
                                <p className="truncate text-xs font-semibold text-white">{user?.name ?? 'Usuario'}</p>
                                <p className="truncate text-[11px] text-sidebar-muted">{user?.email ?? 'Correo no disponible'}</p>
                            </div>
                            <Link
                                aria-label="Cerrar sesión"
                                className={`rounded-md p-1.5 text-sidebar-muted transition hover:bg-sidebar-accent hover:text-white ${isCollapsed ? 'md:hidden' : ''}`}
                                href="/logout"
                                method="post"
                            >
                                <Icon className="size-4" name="logout" />
                            </Link>
                        </div>
                        <button
                            aria-expanded={!isCollapsed}
                            aria-label={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
                            className="mt-2 hidden w-full items-center justify-center gap-2 rounded-lg py-1.5 text-xs text-sidebar-muted transition-colors hover:bg-sidebar-accent/60 hover:text-white md:flex"
                            onClick={() => setIsCollapsed((collapsed) => !collapsed)}
                            type="button"
                        >
                            <Icon className={`size-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} name="chevronLeft" />
                            <span className={isCollapsed ? 'md:hidden' : ''}>Contraer menú</span>
                        </button>
                    </div>
                </aside>

                <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur-md md:px-6">
                        <button
                            aria-controls="primary-navigation"
                            aria-expanded={isNavigationOpen}
                            aria-label="Abrir navegación"
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground md:hidden"
                            onClick={() => setIsNavigationOpen(true)}
                            type="button"
                        >
                            <Icon className="size-5" name="menu" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <p className="hidden text-[11px] font-medium text-muted-foreground sm:block">
                                {user?.role ?? 'LEGATUM'} <span className="text-border">/</span> {pageSection}
                            </p>
                            <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">{pageTitle}</h1>
                        </div>
                        <span className="hidden rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground sm:inline-flex">
                            {workspace.description}
                        </span>
                        <Link
                            aria-label="Ir a mi perfil"
                            className="flex shrink-0 items-center gap-2 rounded-lg p-1.5 transition hover:bg-muted"
                            href="/mi-perfil"
                        >
                            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                                {initials(user?.name)}
                            </span>
                            <span className="hidden text-left md:block">
                                <span className="block max-w-36 truncate text-xs font-semibold text-foreground">{user?.name}</span>
                                <span className="block text-[11px] text-muted-foreground">{user?.role}</span>
                            </span>
                        </Link>
                    </header>

                    <main className="app-content mx-auto w-full min-w-0 flex-1 px-4 py-5 sm:px-5 md:px-6 lg:px-8 lg:py-7">
                        {children}
                    </main>

                    <footer className="border-t border-border px-4 py-4 text-xs text-muted-foreground md:px-8">
                        LEGATUM · Gestión de Talento Humano
                    </footer>
                </div>
            </div>
        </>
    );
}
