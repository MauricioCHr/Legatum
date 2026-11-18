import Icon from './Icon';

export default function DashboardPanel({ title, description, icon, children, className = '', id }) {
    const headingId = `${id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-heading`;

    return (
        <section
            aria-labelledby={headingId}
            className={`overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,27,51,0.04)] ${className}`}
            id={id}
        >
            <header className="flex items-start gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <Icon className="size-5" name={icon} />
                </span>
                <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-foreground" id={headingId}>
                        {title}
                    </h2>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
                </div>
            </header>
            <div className="p-5 sm:p-6">{children}</div>
        </section>
    );
}
