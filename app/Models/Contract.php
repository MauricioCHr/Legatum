<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contract extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'contract_type_id',
        'numero_contrato',
        'salario',
        'fecha_inicio',
        'fecha_fin',
        'estado',
        'parent_contract_id',
        'motivo_anulacion',
        'observaciones',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'salario' => 'decimal:2',
            'fecha_inicio' => 'date:Y-m-d',
            'fecha_fin' => 'date:Y-m-d',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function contractType(): BelongsTo
    {
        return $this->belongsTo(ContractType::class);
    }

    public function parentContract(): BelongsTo
    {
        return $this->belongsTo(Contract::class, 'parent_contract_id');
    }

    public function renewals(): HasMany
    {
        return $this->hasMany(Contract::class, 'parent_contract_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeVigente(Builder $query): Builder
    {
        return $query->where('estado', 'Vigente');
    }

    public function scopeProximosAVencer(Builder $query, ?int $days = null): Builder
    {
        $days ??= (int) config('legatum.contract_expiry_days', 30);
        $today = Carbon::today()->toDateString();
        $limit = Carbon::today()->addDays($days)->toDateString();

        return $query->where('estado', 'Vigente')
            ->whereNotNull('fecha_fin')
            ->whereBetween('fecha_fin', [$today, $limit]);
    }

    public function getDiasRestantesAttribute(): ?int
    {
        if (! $this->fecha_fin) {
            return null;
        }

        return (int) Carbon::today()->diffInDays($this->fecha_fin, false);
    }
}
