<?php

namespace App\Http\Requests;

use App\Models\ContractType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role?->name === 'Talento Humano';
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'employee_id' => ['required', 'integer', Rule::exists('employees', 'id')],
            'contract_type_id' => ['required', 'integer', Rule::exists('contract_types', 'id')],
            'numero_contrato' => ['nullable', 'string', 'max:50', Rule::unique('contracts', 'numero_contrato')],
            'salario' => ['required', 'numeric', 'min:0'],
            'fecha_inicio' => ['required', 'date'],
            'fecha_fin' => [
                Rule::requiredIf(fn (): bool => (bool) ContractType::query()
                    ->whereKey($this->input('contract_type_id'))
                    ->value('requiere_fecha_fin')),
                'nullable',
                'date',
                'after:fecha_inicio',
            ],
            'estado' => ['required', Rule::in(['Vigente', 'Vencido', 'Renovado', 'Anulado'])],
            'observaciones' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'employee_id.required' => 'Debes seleccionar un colaborador.',
            'employee_id.exists' => 'El colaborador seleccionado no es válido.',
            'contract_type_id.required' => 'Debes seleccionar un tipo de contrato.',
            'contract_type_id.exists' => 'El tipo de contrato no es válido.',
            'salario.required' => 'El salario es obligatorio.',
            'salario.numeric' => 'El salario debe ser un valor numérico.',
            'fecha_inicio.required' => 'La fecha de inicio es obligatoria.',
            'fecha_fin.required' => 'La fecha de finalización es obligatoria para este tipo de contrato.',
            'fecha_fin.after' => 'La fecha de finalización debe ser posterior a la fecha de inicio.',
            'numero_contrato.unique' => 'Ya existe un contrato con este número de radicado.',
        ];
    }
}
