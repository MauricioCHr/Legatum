<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollNovelty extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'payroll_novelty_type_id',
        'payroll_period_id',
        'valor',
        'cantidad',
        'descripcion',
        'estado',
        'motivo_anulacion',
        'anulado_por',
        'fecha_anulacion',
        'registrado_por',
    ];

    protected function casts(): array
    {
        return [
            'valor' => 'decimal:2',
            'cantidad' => 'decimal:2',
            'fecha_anulacion' => 'datetime',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function noveltyType(): BelongsTo
    {
        return $this->belongsTo(PayrollNoveltyType::class, 'payroll_novelty_type_id');
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(PayrollPeriod::class, 'payroll_period_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrado_por');
    }

    public function annuler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'anulado_por');
    }
}
