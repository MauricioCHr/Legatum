<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role?->name === 'Administrador';
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:100', Rule::unique('departamentos', 'nombre')],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'jefe_id' => ['nullable', 'integer', Rule::exists('employees', 'id')],
            'is_active' => ['boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre del departamento es obligatorio.',
            'nombre.unique' => 'Ya existe un departamento con este nombre.',
            'nombre.max' => 'El nombre no puede superar los 100 caracteres.',
            'jefe_id.exists' => 'El colaborador seleccionado no es válido.',
        ];
    }
}
