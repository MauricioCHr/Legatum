<?php

namespace Database\Seeders;

use App\Models\EvaluationCriteria;
use Illuminate\Database\Seeder;

class EvaluationCriteriaSeeder extends Seeder
{
    public function run(): void
    {
        $criteria = [
            [
                'nombre' => 'Cumplimiento de Objetivos y Metas',
                'descripcion' => 'Capacidad de alcanzar las metas asignadas con eficiencia y en los tiempos establecidos.',
                'peso' => 25.00,
            ],
            [
                'nombre' => 'Calidad del Trabajo y Precisión Técnica',
                'descripcion' => 'Excelencia técnica, atención al detalle y apego a los estándares de la Comercializadora Andina.',
                'peso' => 25.00,
            ],
            [
                'nombre' => 'Trabajo en Equipo y Comunicación Asertiva',
                'descripcion' => 'Colaboración efectiva con compañeros de área, respeto, apoyo mutuo y comunicación clara.',
                'peso' => 20.00,
            ],
            [
                'nombre' => 'Puntualidad, Disciplina y Compromiso Institucional',
                'descripcion' => 'Acatamiento de horarios, normas laborales, asistencia y sentido de pertenencia con la empresa.',
                'peso' => 15.00,
            ],
            [
                'nombre' => 'Proactividad, Adaptabilidad y Solución de Problemas',
                'descripcion' => 'Iniciativa para resolver imprevistos operativos, adaptabilidad al cambio y propuestas de mejora.',
                'peso' => 15.00,
            ],
        ];

        foreach ($criteria as $item) {
            EvaluationCriteria::query()->firstOrCreate(
                ['nombre' => $item['nombre']],
                $item
            );
        }
    }
}
