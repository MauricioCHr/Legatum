import Icon from './Icon';

export default function DashboardMetricCard({ label, value, icon, subtitle = 'Registros disponibles' }) {
    const displayValue = Number.isFinite(value)
        ? new Intl.NumberFormat('es-CO').format(value)
        : (value ?? '—');

    return (
        <article className="group min-w-0 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-[0_1px_2px_rgba(15,27,51,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_8px_24px_-12px_rgba(15,27,51,0.18)] sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-sm font-medium text-muted-foreground">{label}</p>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary transition-transform duration-300 group-hover:scale-105 sm:size-11">
                    <Icon className="size-5" name={icon} />
                </span>
            </div>
            <p className="mt-3 break-words font-mono text-3xl font-semibold tracking-tight text-foreground tabular-nums sm:text-4xl">{displayValue}</p>
            <p className="mt-2 truncate text-sm text-muted-foreground">{subtitle}</p>
        </article>
    );
}
