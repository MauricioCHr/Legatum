<?php

namespace Database\Seeders;

use App\Models\Position;
use Illuminate\Database\Seeder;

class PositionSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            'Ejemplo - Asesor comercial',
            'Ejemplo - Analista de operaciones',
            'Ejemplo - Auxiliar administrativo',
        ] as $name) {
            Position::query()->firstOrCreate(['nombre' => $name]);
        }
    }
}
