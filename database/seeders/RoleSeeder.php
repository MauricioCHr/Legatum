<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            [
                'name' => 'Administrador',
                'slug' => 'administrador',
                'description' => 'Control total del sistema y gestión de usuarios.',
            ],
            [
                'name' => 'Talento Humano',
                'slug' => 'talento-humano',
                'description' => 'Gestión del personal y procesos de talento humano.',
            ],
            [
                'name' => 'Jefe de área',
                'slug' => 'jefe-area',
                'description' => 'Supervisión y gestión de empleados de su área.',
            ],
            [
                'name' => 'Nómina',
                'slug' => 'nomina',
                'description' => 'Gestión de nómina y pagos de empleados.',
            ],
            [
                'name' => 'Gerencia',
                'slug' => 'gerencia',
                'description' => 'Consulta de información y reportes gerenciales.',
            ],
            [
                'name' => 'Empleado',
                'slug' => 'empleado',
                'description' => 'Acceso a información personal y funcionalidades propias.',
            ],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(
                ['slug' => $role['slug']],
                $role
            );
        }
    }
}
