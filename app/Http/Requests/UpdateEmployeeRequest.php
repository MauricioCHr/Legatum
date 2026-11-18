<?php

namespace App\Http\Requests;

use App\EmployeeDocumentType;
use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role?->name === 'Talento Humano';
    }

    public function rules(): array
    {
        $employee = $this->route('employee');
        $documentTypes = EmployeeDocumentType::values();

        if ($employee instanceof Employee && ! in_array($employee->tipo_documento, $documentTypes, true)) {
            $documentTypes[] = $employee->tipo_documento;
        }

        return [
            'tipo_documento' => ['required', 'string', Rule::in($documentTypes)],
            'numero_documento' => [
                'required',
                'string',
                'max:100',
                Rule::unique('employees', 'numero_documento')->ignore($employee),
            ],
            'telefono' => ['required', 'string', 'max:50'],
            'direccion' => ['required', 'string', 'max:1000'],
            'fecha_nacimiento' => ['required', 'date'],
            'fecha_contratacion' => ['required', 'date'],
            'departamento_id' => ['required', 'integer', 'exists:departamentos,id'],
            'cargo_id' => ['required', 'integer', 'exists:cargos,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'tipo_documento.required' => 'El tipo de documento es obligatorio.',
            'tipo_documento.in' => 'Selecciona un tipo de documento válido.',
            'numero_documento.required' => 'El número de documento es obligatorio.',
            'numero_documento.unique' => 'Este número de documento ya está registrado.',
            'telefono.required' => 'El teléfono es obligatorio.',
            'direccion.required' => 'La dirección es obligatoria.',
            'fecha_nacimiento.required' => 'La fecha de nacimiento es obligatoria.',
            'fecha_nacimiento.date' => 'La fecha de nacimiento no es válida.',
            'fecha_contratacion.required' => 'La fecha de contratación es obligatoria.',
            'fecha_contratacion.date' => 'La fecha de contratación no es válida.',
            'departamento_id.required' => 'Selecciona un departamento.',
            'departamento_id.exists' => 'El departamento seleccionado no existe.',
            'cargo_id.required' => 'Selecciona un cargo.',
            'cargo_id.exists' => 'El cargo seleccionado no existe.',
        ];
    }
}
