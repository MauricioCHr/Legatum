import Icon from './Icon';

export default function DeleteUserDialog({ user, processing, onCancel, onConfirm }) {
    if (!user) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <section
                aria-labelledby="delete-user-title"
                aria-modal="true"
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
                role="dialog"
            >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <Icon className="h-5 w-5" name="alert" />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-slate-900" id="delete-user-title">
                    Eliminar usuario
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                    ¿Estás seguro de que deseas eliminar la cuenta de <span className="font-medium text-slate-700">{user.name}</span>?
                    Esta acción no se puede deshacer.
                </p>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        onClick={onCancel}
                        type="button"
                    >
                        Cancelar
                    </button>
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={processing}
                        onClick={onConfirm}
                        type="button"
                    >
                        {processing ? 'Eliminando...' : 'Eliminar cuenta'}
                    </button>
                </div>
            </section>
        </div>
    );
}
