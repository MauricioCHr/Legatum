<?php

namespace App\Http\Controllers;

use App\Models\ContractType;
use App\Models\EvaluationCriteria;
use App\Models\LeaveType;
use App\Models\PayrollNoveltyType;
use App\Models\Role;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CatalogController extends Controller
{
    public function index(Request $request): Response
    {
        $activeTab = (string) $request->input('tab', 'contract_types');

        return Inertia::render('Catalogs/Index', [
            'activeTab' => $activeTab,
            'contractTypes' => ContractType::query()->withCount('contracts')->orderBy('nombre')->get(),
            'leaveTypes' => LeaveType::query()->withCount('requests')->orderBy('nombre')->get(),
            'payrollNoveltyTypes' => PayrollNoveltyType::query()->withCount('novelties')->orderBy('nombre')->get(),
            'evaluationCriteria' => EvaluationCriteria::query()->withCount('scores')->orderBy('nombre')->get(),
            'roles' => Role::query()->withCount('users')->orderBy('id')->get(),
            'canManage' => $request->user()?->role?->name === 'Administrador',
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function storeContractType(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:100', 'unique:contract_types,nombre'],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'requiere_fecha_fin' => ['boolean'],
        ]);

        $data['codigo'] = Str::slug($data['nombre']);
        ContractType::query()->create($data);

        return back()->with('success', 'Tipo de contrato registrado correctamente.');
    }

    public function updateContractType(Request $request, ContractType $contractType): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:100', Rule::unique('contract_types', 'nombre')->ignore($contractType->id)],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'requiere_fecha_fin' => ['boolean'],
            'is_active' => ['boolean'],
        ]);

        $contractType->update($data);

        return back()->with('success', 'Tipo de contrato actualizado correctamente.');
    }

    public function storeLeaveType(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:100', 'unique:leave_types,nombre'],
            'es_remunerado' => ['boolean'],
            'descuenta_vacaciones' => ['boolean'],
            'requires_attachment' => ['boolean'],
            'dias_maximos' => ['nullable', 'integer', 'min:1', 'max:365'],
            'descripcion' => ['nullable', 'string', 'max:500'],
        ]);

        $data['codigo'] = Str::slug($data['nombre']);
        LeaveType::query()->create($data);

        return back()->with('success', 'Tipo de permiso registrado correctamente.');
    }

    public function updateLeaveType(Request $request, LeaveType $leaveType): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:100', Rule::unique('leave_types', 'nombre')->ignore($leaveType->id)],
            'es_remunerado' => ['boolean'],
            'descuenta_vacaciones' => ['boolean'],
            'requires_attachment' => ['boolean'],
            'dias_maximos' => ['nullable', 'integer', 'min:1', 'max:365'],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ]);

        $leaveType->update($data);

        return back()->with('success', 'Tipo de permiso actualizado correctamente.');
    }

    public function storePayrollNoveltyType(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:100', 'unique:payroll_novelty_types,nombre'],
            'tipo' => ['required', Rule::in(['Devengo', 'Deduccion'])],
            'unidad_medida' => ['required', Rule::in(['Horas', 'Dias', 'Valor', 'Porcentaje'])],
            'descripcion' => ['nullable', 'string', 'max:500'],
        ]);

        $data['codigo'] = Str::slug($data['nombre']);
        PayrollNoveltyType::query()->create($data);

        return back()->with('success', 'Tipo de novedad de nómina registrado correctamente.');
    }

    public function updatePayrollNoveltyType(Request $request, PayrollNoveltyType $payrollNoveltyType): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:100', Rule::unique('payroll_novelty_types', 'nombre')->ignore($payrollNoveltyType->id)],
            'tipo' => ['required', Rule::in(['Devengo', 'Deduccion'])],
            'unidad_medida' => ['required', Rule::in(['Horas', 'Dias', 'Valor', 'Porcentaje'])],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ]);

        $payrollNoveltyType->update($data);

        return back()->with('success', 'Tipo de novedad actualizado correctamente.');
    }

    public function storeEvaluationCriteria(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:100', 'unique:evaluation_criteria,nombre'],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'peso' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        EvaluationCriteria::query()->create($data);

        return back()->with('success', 'Criterio de evaluación registrado correctamente.');
    }

    public function updateEvaluationCriteria(Request $request, EvaluationCriteria $evaluationCriteria): RedirectResponse
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:100', Rule::unique('evaluation_criteria', 'nombre')->ignore($evaluationCriteria->id)],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'peso' => ['required', 'numeric', 'min:0', 'max:100'],
            'is_active' => ['boolean'],
        ]);

        $evaluationCriteria->update($data);

        return back()->with('success', 'Criterio de evaluación actualizado correctamente.');
    }
}
