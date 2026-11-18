<?php

namespace Database\Seeders;

use App\Models\ContractType;
use Illuminate\Database\Seeder;

class ContractTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            [
                'nombre' => 'Término Indefinido',
                'codigo' => 'termino-indefinido',
                'descripcion' => 'Contrato sin fecha estipulada de finalización conforme al Código Sustantivo del Trabajo.',
                'requiere_fecha_fin' => false,
            ],
            [
                'nombre' => 'Término Fijo',
                'codigo' => 'termino-fijo',
                'descripcion' => 'Contrato con límite temporal pactado de 1 a 3 años renovable.',
                'requiere_fecha_fin' => true,
            ],
            [
                'nombre' => 'Obra o Labor',
                'codigo' => 'obra-labor',
                'descripcion' => 'Contrato cuya duración está determinada por la culminación de la labor contratada.',
                'requiere_fecha_fin' => false,
            ],
            [
                'nombre' => 'Aprendizaje SENA',
                'codigo' => 'aprendizaje',
                'descripcion' => 'Contrato de aprendizaje lectivo o productivo bajo normativa SENA.',
                'requiere_fecha_fin' => true,
            ],
            [
                'nombre' => 'Prestación de Servicios',
                'codigo' => 'prestacion-servicios',
                'descripcion' => 'Contrato civil o comercial para actividades específicas e independientes.',
                'requiere_fecha_fin' => true,
            ],
        ];

        foreach ($types as $type) {
            ContractType::query()->firstOrCreate(
                ['codigo' => $type['codigo']],
                $type
            );
        }
    }
}
