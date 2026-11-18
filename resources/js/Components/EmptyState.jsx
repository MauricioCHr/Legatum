import Icon from './Icon';

export default function EmptyState({ icon, title, description, compact = false }) {
    return (
        <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 text-center ${compact ? 'py-6' : 'py-10'}`}>
            <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon className="size-5" name={icon} />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
    );
}
