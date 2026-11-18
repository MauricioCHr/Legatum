<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Position;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Employee>
 */
class EmployeeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'tipo_documento' => fake()->randomElement(['CC', 'CE', 'Pasaporte']),
            'numero_documento' => fake()->unique()->numerify('########'),
            'telefono' => fake()->numerify('3#########'),
            'direccion' => fake()->streetAddress(),
            'fecha_nacimiento' => fake()->dateTimeBetween('-65 years', '-18 years')->format('Y-m-d'),
            'fecha_contratacion' => fake()->date(),
            'departamento_id' => Department::factory(),
            'cargo_id' => Position::factory(),
            'estado' => 'Activo',
        ];
    }
}
