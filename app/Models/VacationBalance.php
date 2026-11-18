<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VacationBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'dias_totales_ganados',
        'dias_disfrutados',
        'dias_pendientes',
        'dias_compensados',
        'ultima_actualizacion',
    ];

    protected function casts(): array
    {
        return [
            'dias_totales_ganados' => 'decimal:2',
            'dias_disfrutados' => 'decimal:2',
            'dias_pendientes' => 'decimal:2',
            'dias_compensados' => 'decimal:2',
            'ultima_actualizacion' => 'date',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function getDiasDisponiblesAttribute(): float
    {
        return (float) max(0, $this->dias_totales_ganados - $this->dias_disfrutados - $this->dias_compensados - $this->dias_pendientes);
    }
}
