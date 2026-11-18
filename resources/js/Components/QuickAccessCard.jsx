import { Link } from '@inertiajs/react';
import Icon from './Icon';

export default function QuickAccessCard({ item }) {
    const content = (
        <>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-5" name={item.icon} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{item.label}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                    {item.href ? 'Abrir módulo' : 'No disponible'}
                </span>
            </span>
            {item.href && <Icon className="h-4 w-4 text-slate-400" name="arrowUpRight" />}
        </>
    );

    const className = `group flex min-h-[84px] w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-all ${
        item.href
            ? 'hover:border-primary/30 hover:bg-accent/40'
            : 'cursor-not-allowed opacity-75'
    }`;

    if (item.href) {
        return (
            <Link className={className} href={item.href}>
                {content}
            </Link>
        );
    }

    return (
        <button
            aria-disabled="true"
            className={className}
            disabled
            title="Este módulo aún no está disponible"
            type="button"
        >
            {content}
        </button>
    );
}
