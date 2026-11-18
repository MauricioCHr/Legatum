<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PerformanceEvaluation extends Model
{
    use HasFactory;

    protected $fillable = [
        'evaluation_period_id',
        'employee_id',
        'evaluator_id',
        'calificacion_final',
        'estado',
        'observaciones',
        'compromisos_mejora',
        'fecha_evaluacion',
    ];

    protected function casts(): array
    {
        return [
            'calificacion_final' => 'decimal:2',
            'fecha_evaluacion' => 'datetime',
        ];
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(EvaluationPeriod::class, 'evaluation_period_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }

    public function scores(): HasMany
    {
        return $this->hasMany(EvaluationScore::class);
    }
}
