import Icon from '../../Components/Icon';
import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';

export default function MyContracts({ employee, contracts, activeContract }) {
    return (
        <AuthenticatedLayout title="Mi Contrato">
            <div className="space-y-4">
                <header>
                    <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#547da6]">
                        <span className="rounded bg-[#eaf1fa] px-1.5 py-0.5">Mi Espacio Personal</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">Comercializadora Andina S.A.S.</span>
                    </p>
                    <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[25px]">
                        Mi Contrato y Vinculación Laboral
                    </h1>
                    <p className="mt-1 text-[10px] text-slate-500">
                        Consulta las condiciones contractuales, salario, vigencia e historial de tu relación laboral con la empresa.
                    </p>
                </header>

                {activeContract ? (
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm md:col-span-2 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <span className="font-mono text-xs font-bold text-[#547da6]">{activeContract.numero_contrato}</span>
                                    <h2 className="text-sm font-bold text-slate-900">{activeContract.contract_type?.nombre}</h2>
                                </div>
                                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                    {activeContract.estado}
                                </span>
                            </div>

                            <dl className="grid gap-3 sm:grid-cols-2 text-xs">
                                <div>
                                    <dt className="text-[9px] font-semibold uppercase text-slate-400">Salario Básico Mensual</dt>
                                    <dd className="mt-1 text-base font-bold text-emerald-700">
                                        ${Number(activeContract.salario).toLocaleString('es-CO')} COP
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[9px] font-semibold uppercase text-slate-400">Fecha de Inicio</dt>
                                    <dd className="mt-1 font-semibold text-slate-800">{activeContract.fecha_inicio}</dd>
                                </div>
                                <div>
                                    <dt className="text-[9px] font-semibold uppercase text-slate-400">Fecha de Vencimiento</dt>
                                    <dd className="mt-1 font-semibold text-slate-800">
                                        {activeContract.fecha_fin ?? 'Término Indefinido'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[9px] font-semibold uppercase text-slate-400">Cargo Desempeñado</dt>
                                    <dd className="mt-1 font-semibold text-slate-800">{employee.position?.nombre}</dd>
                                </div>
                            </dl>

                            {activeContract.observaciones && (
                                <div className="rounded-lg bg-slate-50 p-3">
                                    <span className="block text-[9px] font-bold uppercase text-slate-500">Observaciones y Cláusulas</span>
                                    <p className="mt-1 text-xs text-slate-700">{activeContract.observaciones}</p>
                                </div>
                            )}
                        </div>

                        {/* Summary side card */}
                        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
                            <h3 className="text-xs font-bold text-slate-900">Datos Corporativos</h3>
                            <div className="text-xs space-y-2">
                                <div>
                                    <span className="block text-[9px] text-slate-400">Empresa:</span>
                                    <span className="font-semibold text-slate-800">Comercializadora Andina S.A.S.</span>
                                </div>
                                <div>
                                    <span className="block text-[9px] text-slate-400">Ubicación:</span>
                                    <span className="font-semibold text-slate-800">Ipiales, Nariño, Colombia</span>
                                </div>
                                <div>
                                    <span className="block text-[9px] text-slate-400">Departamento:</span>
                                    <span className="font-semibold text-slate-800">{employee.department?.nombre}</span>
                                </div>
                                <div>
                                    <span className="block text-[9px] text-slate-400">Fecha de Contratación Original:</span>
                                    <span className="font-semibold text-slate-800">{employee.fecha_contratacion}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-slate-100 bg-white p-8 text-center shadow-sm">
                        <Icon className="mx-auto h-8 w-8 text-slate-400" name="file" />
                        <h3 className="mt-2 text-sm font-bold text-slate-800">Sin Contrato Activo</h3>
                        <p className="mt-1 text-xs text-slate-500">Actualmente no cuentas con un contrato vigente registrado en el sistema.</p>
                    </div>
                )}

                {/* Historial Contractual */}
                <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-900">Historial Contractual ({contracts.length})</h3>
                    <p className="text-[10px] text-slate-500">Registro de todas las etapas y renovaciones contractuales.</p>

                    <div className="mt-3 divide-y divide-slate-100">
                        {contracts.map((c) => (
                            <div className="flex items-center justify-between py-2.5 text-xs" key={c.id}>
                                <div>
                                    <span className="font-mono font-bold text-slate-800">{c.numero_contrato}</span>
                                    <span className="ml-2 font-medium text-slate-700">{c.contract_type?.nombre}</span>
                                    <p className="text-[10px] text-slate-400">
                                        Vigencia: {c.fecha_inicio} al {c.fecha_fin ?? 'Indefinido'} · Salario: ${Number(c.salario).toLocaleString('es-CO')}
                                    </p>
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                                    c.estado === 'Vigente' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {c.estado}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
