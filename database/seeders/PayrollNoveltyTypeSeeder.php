<?php

namespace Database\Seeders;

use App\Models\PayrollNoveltyType;
use Illuminate\Database\Seeder;

class PayrollNoveltyTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            [
                'nombre' => 'Horas Extra Diurnas (HED)',
                'codigo' => 'hed',
                'tipo' => 'Devengo',
                'unidad_medida' => 'Horas',
                'descripcion' => 'Recargo del 25% sobre la hora ordinaria diurna.',
            ],
            [
                'nombre' => 'Horas Extra Nocturnas (HEN)',
                'codigo' => 'hen',
                'tipo' => 'Devengo',
                'unidad_medida' => 'Horas',
                'descripcion' => 'Recargo del 75% sobre la hora ordinaria nocturna.',
            ],
            [
                'nombre' => 'Horas Extra Festivas Diurnas (HEFD)',
                'codigo' => 'hefd',
                'tipo' => 'Devengo',
                'unidad_medida' => 'Horas',
                'descripcion' => 'Recargo del 100% sobre la hora festiva diurna.',
            ],
            [
                'nombre' => 'Horas Extra Festivas Nocturnas (HEFN)',
                'codigo' => 'hefn',
                'tipo' => 'Devengo',
                'unidad_medida' => 'Horas',
                'descripcion' => 'Recargo del 150% sobre la hora festiva nocturna.',
            ],
            [
                'nombre' => 'Recargo Nocturno Ordinario',
                'codigo' => 'rn',
                'tipo' => 'Devengo',
                'unidad_medida' => 'Horas',
                'descripcion' => 'Recargo del 35% en jornada nocturna habitual.',
            ],
            [
                'nombre' => 'Bonificación por Cumplimiento de Metas',
                'codigo' => 'bonificacion-metas',
                'tipo' => 'Devengo',
                'unidad_medida' => 'Valor',
                'descripcion' => 'Incentivo salarial por logro de indicadores comerciales u operativos.',
            ],
            [
                'nombre' => 'Comisión por Ventas',
                'codigo' => 'comision-ventas',
                'tipo' => 'Devengo',
                'unidad_medida' => 'Valor',
                'descripcion' => 'Comisión pactada sobre ventas y distribución efectivas.',
            ],
            [
                'nombre' => 'Retardo Injustificado',
                'codigo' => 'retardo',
                'tipo' => 'Deduccion',
                'unidad_medida' => 'Horas',
                'descripcion' => 'Deducción proporcional por llegadas tardías no justificadas.',
            ],
            [
                'nombre' => 'Ausencia Injustificada',
                'codigo' => 'ausencia-injustificada',
                'tipo' => 'Deduccion',
                'unidad_medida' => 'Dias',
                'descripcion' => 'Día no laborado sin causa válida ni autorización previa.',
            ],
            [
                'nombre' => 'Incapacidad Médica General (EPS)',
                'codigo' => 'incapacidad-general',
                'tipo' => 'Deduccion',
                'unidad_medida' => 'Dias',
                'descripcion' => 'Incapacidad de origen común certificada por EPS.',
            ],
            [
                'nombre' => 'Incapacidad Laboral (ARL)',
                'codigo' => 'incapacidad-arl',
                'tipo' => 'Deduccion',
                'unidad_medida' => 'Dias',
                'descripcion' => 'Incapacidad derivada de accidente de trabajo o enfermedad laboral.',
            ],
            [
                'nombre' => 'Permiso No Remunerado (PNR)',
                'codigo' => 'pnr',
                'tipo' => 'Deduccion',
                'unidad_medida' => 'Dias',
                'descripcion' => 'Días de suspensión de contrato por permiso no remunerado.',
            ],
            [
                'nombre' => 'Deducción por Anticipo o Préstamo',
                'codigo' => 'deduccion-prestamo',
                'tipo' => 'Deduccion',
                'unidad_medida' => 'Valor',
                'descripcion' => 'Cuota acordada de descuento de nómina por préstamos de empresa.',
            ],
        ];

        foreach ($types as $type) {
            PayrollNoveltyType::query()->firstOrCreate(
                ['codigo' => $type['codigo']],
                $type
            );
        }
    }
}
