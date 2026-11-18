<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'fecha',
        'hora_entrada',
        'hora_salida',
        'estado',
        'minutos_retardo',
        'horas_extra',
        'observaciones',
        'justificacion_correccion',
        'corregido_por',
        'fecha_correccion',
        'registrado_por',
        'origen_entrada',
        'origen_salida',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date:Y-m-d',
            'minutos_retardo' => 'integer',
            'horas_extra' => 'decimal:2',
            'fecha_correccion' => 'datetime',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function correctedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'corregido_por');
    }

    public function registeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrado_por');
    }

    public function corrections(): HasMany
    {
        return $this->hasMany(AttendanceCorrection::class)->orderByDesc('corrected_at');
    }
}
