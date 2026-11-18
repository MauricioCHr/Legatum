const chartColors = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];

export function DashboardDonut({ data = [], centerValue, centerLabel = 'registros' }) {
    const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
    let start = 0;
    const gradient = total > 0
        ? data.map((item, index) => {
            const end = start + (Number(item.value || 0) / total) * 100;
            const segment = `${chartColors[index % chartColors.length]} ${start}% ${end}%`;
            start = end;
            return segment;
        }).join(', ')
        : 'var(--muted) 0% 100%';

    return (
        <div className="flex flex-col items-center gap-5 xl:flex-row">
            <div
                aria-label={total > 0 ? `Distribución de ${total} registros` : 'Sin datos para mostrar'}
                className="relative flex size-44 shrink-0 items-center justify-center rounded-full"
                role="img"
                style={{ background: `conic-gradient(${gradient})` }}
            >
                <div className="flex size-32 flex-col items-center justify-center rounded-full bg-card">
                    <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
                        {centerValue ?? total}
                    </span>
                    <span className="text-xs text-muted-foreground">{centerLabel}</span>
                </div>
            </div>
            {data.length > 0 ? (
                <ul className="flex w-full min-w-0 flex-col gap-2.5">
                    {data.map((item, index) => (
                        <li className="flex items-center gap-2.5 text-sm" key={item.name}>
                            <span
                                aria-hidden="true"
                                className="size-2.5 shrink-0 rounded-sm"
                                style={{ background: chartColors[index % chartColors.length] }}
                            />
                            <span className="min-w-0 truncate text-muted-foreground">{item.name}</span>
                            <span className="ml-auto font-mono text-xs font-medium tabular-nums text-foreground">
                                {item.value}
                            </span>
                            <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
                                {total > 0 ? `${Math.round((item.value / total) * 100)}%` : '0%'}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">No hay registros para mostrar.</p>
            )}
        </div>
    );
}

export function DashboardBarChart({
    data = [],
    labelKey = 'name',
    valueKey = 'value',
    orientation = 'horizontal',
}) {
    const maximum = Math.max(1, ...data.map((item) => Number(item[valueKey] || 0)));

    if (data.length === 0) {
        return <p className="py-8 text-center text-sm text-muted-foreground">No hay datos para el período seleccionado.</p>;
    }

    if (orientation === 'vertical') {
        return (
            <div className="grid min-h-64 grid-cols-3 items-end gap-3 sm:grid-cols-6 xl:grid-cols-12" role="img" aria-label="Registros por período">
                {data.map((item) => {
                    const value = Number(item[valueKey] || 0);
                    const height = Math.max(4, Math.round((value / maximum) * 100));

                    return (
                        <div className="flex min-w-0 flex-col items-center gap-2" key={item[labelKey]}>
                            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{value}</span>
                            <div className="flex h-44 w-full items-end overflow-hidden rounded-t-md bg-muted/70">
                                <span
                                    className="w-full rounded-t-md bg-primary transition-[height] duration-700"
                                    style={{ height: `${height}%` }}
                                />
                            </div>
                            <span className="max-w-full truncate text-[11px] capitalize text-muted-foreground">
                                {item[labelKey]}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {data.map((item) => {
                const value = Number(item[valueKey] || 0);
                const width = Math.round((value / maximum) * 100);

                return (
                    <div key={item[labelKey]}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate font-medium text-foreground">{item[labelKey]}</span>
                            <span className="shrink-0 font-mono font-medium tabular-nums text-muted-foreground">{value}</span>
                        </div>
                        <div
                            aria-label={`${item[labelKey]}: ${value}`}
                            className="h-2.5 overflow-hidden rounded-full bg-muted"
                            role="img"
                        >
                            <span
                                className="block h-full rounded-full bg-primary transition-[width] duration-700"
                                style={{ width: `${width}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
