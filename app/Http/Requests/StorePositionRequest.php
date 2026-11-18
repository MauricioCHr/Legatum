<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePositionRequest extends FormRequest
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
            'nombre' => ['required', 'string', 'max:100', Rule::unique('cargos', 'nombre')],
            'departamento_id' => ['nullable', 'integer', Rule::exists('departamentos', 'id')],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre del cargo es obligatorio.',
            'nombre.unique' => 'Ya existe un cargo con este nombre.',
            'nombre.max' => 'El nombre no puede superar los 100 caracteres.',
            'departamento_id.exists' => 'El departamento seleccionado no es válido.',
        ];
    }
}
