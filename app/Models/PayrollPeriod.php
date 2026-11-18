<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollPeriod extends Model
{
    use HasFactory;

    protected $fillable = [
        'codigo',
        'nombre',
        'fecha_inicio',
        'fecha_fin',
        'estado',
        'consolidado_por',
        'fecha_consolidacion',
        'observaciones',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio' => 'date:Y-m-d',
            'fecha_fin' => 'date:Y-m-d',
            'fecha_consolidacion' => 'datetime',
        ];
    }

    public function novelties(): HasMany
    {
        return $this->hasMany(PayrollNovelty::class);
    }

    public function consolidator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'consolidado_por');
    }
}
