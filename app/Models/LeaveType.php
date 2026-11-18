<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeaveType extends Model
{
    use HasFactory;

    protected $fillable = [
        'nombre',
        'codigo',
        'es_remunerado',
        'descuenta_vacaciones',
        'dias_maximos',
        'descripcion',
        'requires_attachment',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'es_remunerado' => 'boolean',
            'descuenta_vacaciones' => 'boolean',
            'dias_maximos' => 'integer',
            'requires_attachment' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function requests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }
}
