<?php

namespace Database\Seeders;

use App\Models\PayrollPeriod;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class PayrollPeriodSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();
        $year = $now->year;
        $month = $now->month;

        // Current open period (Primera Quincena del mes actual)
        PayrollPeriod::query()->firstOrCreate(
            ['codigo' => sprintf('%04d-%02d-Q1', $year, $month)],
            [
                'nombre' => sprintf('Primera Quincena de %s %04d', $now->locale('es')->monthName, $year),
                'fecha_inicio' => Carbon::create($year, $month, 1)->toDateString(),
                'fecha_fin' => Carbon::create($year, $month, 15)->toDateString(),
                'estado' => 'Abierto',
                'observaciones' => 'Período en curso para reporte y recolección de novedades.',
            ]
        );

        // Previous consolidated period
        $prev = (clone $now)->subMonth();
        PayrollPeriod::query()->firstOrCreate(
            ['codigo' => sprintf('%04d-%02d-Q2', $prev->year, $prev->month)],
            [
                'nombre' => sprintf('Segunda Quincena de %s %04d', $prev->locale('es')->monthName, $prev->year),
                'fecha_inicio' => Carbon::create($prev->year, $prev->month, 16)->toDateString(),
                'fecha_fin' => (clone $prev)->endOfMonth()->toDateString(),
                'estado' => 'Consolidado',
                'fecha_consolidacion' => Carbon::create($prev->year, $prev->month, 16)->addDays(15),
                'observaciones' => 'Período consolidado y transmitido a Nómina.',
            ]
        );
    }
}
