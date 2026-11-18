<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role?->name === 'Talento Humano';
    }

    public function rules(): array
    {
        return [
            'estado' => ['required', Rule::in(['Activo', 'Inactivo'])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'estado.required' => 'El estado laboral es obligatorio.',
            'estado.in' => 'El estado laboral debe ser Activo o Inactivo.',
        ];
    }
}
