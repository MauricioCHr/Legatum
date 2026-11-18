<?php

namespace Database\Seeders;

use App\Models\LeaveType;
use Illuminate\Database\Seeder;

class LeaveTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            [
                'nombre' => 'Vacaciones Anuales',
                'codigo' => 'vacaciones',
                'es_remunerado' => true,
                'descuenta_vacaciones' => true,
                'dias_maximos' => 15,
                'descripcion' => 'Descanso remunerado correspondiente a 15 días hábiles por año laborado.',
            ],
            [
                'nombre' => 'Permiso Personal Remunerado',
                'codigo' => 'permiso-remunerado',
                'es_remunerado' => true,
                'descuenta_vacaciones' => false,
                'dias_maximos' => 3,
                'descripcion' => 'Permiso para diligencias personales o familiares con pago salarial.',
            ],
            [
                'nombre' => 'Permiso Personal No Remunerado',
                'codigo' => 'permiso-no-remunerado',
                'es_remunerado' => false,
                'descuenta_vacaciones' => false,
                'dias_maximos' => 30,
                'descripcion' => 'Licencia ordinaria no remunerada solicitada voluntariamente.',
            ],
            [
                'nombre' => 'Calamidad Doméstica',
                'codigo' => 'calamidad-domestica',
                'es_remunerado' => true,
                'descuenta_vacaciones' => false,
                'dias_maximos' => 5,
                'descripcion' => 'Suceso familiar grave que amerita ausencia justificada del trabajador.',
                'requires_attachment' => true,
            ],
            [
                'nombre' => 'Cita Médica / EPS',
                'codigo' => 'cita-medica',
                'es_remunerado' => true,
                'descuenta_vacaciones' => false,
                'dias_maximos' => 1,
                'descripcion' => 'Asistencia a consulta o procedimiento médico con soporte de la entidad de salud.',
                'requires_attachment' => true,
            ],
            [
                'nombre' => 'Licencia de Luto',
                'codigo' => 'licencia-luto',
                'es_remunerado' => true,
                'descuenta_vacaciones' => false,
                'dias_maximos' => 5,
                'descripcion' => '5 días hábiles remunerados por fallecimiento de familiar en grados de ley (Ley 1280).',
                'requires_attachment' => true,
            ],
            [
                'nombre' => 'Licencia de Maternidad / Paternidad',
                'codigo' => 'licencia-maternidad-paternidad',
                'es_remunerado' => true,
                'descuenta_vacaciones' => false,
                'dias_maximos' => 126,
                'descripcion' => 'Licencia parental remunerada cubierta conforme a ley.',
                'requires_attachment' => true,
            ],
        ];

        foreach ($types as $type) {
            LeaveType::query()->firstOrCreate(
                ['codigo' => $type['codigo']],
                $type
            );
        }
    }
}
