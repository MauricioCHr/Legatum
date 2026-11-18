<?php

namespace App\Http\Requests;

use App\Models\ContractType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContractRequest extends FormRequest
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
        $contractId = $this->route('contract')?->id ?? $this->route('contract');

        return [
            'contract_type_id' => ['required', 'integer', Rule::exists('contract_types', 'id')],
            'numero_contrato' => [
                'required',
                'string',
                'max:50',
                Rule::unique('contracts', 'numero_contrato')->ignore($contractId),
            ],
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
            'contract_type_id.required' => 'Debes seleccionar un tipo de contrato.',
            'salario.required' => 'El salario es obligatorio.',
            'fecha_inicio.required' => 'La fecha de inicio es obligatoria.',
            'fecha_fin.required' => 'La fecha de finalización es obligatoria para este tipo de contrato.',
            'fecha_fin.after' => 'La fecha de finalización debe ser posterior a la fecha de inicio.',
            'numero_contrato.unique' => 'Ya existe otro contrato con este número de radicado.',
        ];
    }
}
