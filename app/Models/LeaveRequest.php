<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeaveRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'fecha_inicio',
        'fecha_fin',
        'dias_solicitados',
        'motivo',
        'estado',
        'aprobado_por',
        'fecha_respuesta',
        'observaciones_respuesta',
        'support_path',
        'support_original_name',
        'support_mime_type',
        'support_size',
    ];

    protected $hidden = ['support_path'];

    protected $appends = ['support_download_url'];

    protected function casts(): array
    {
        return [
            'fecha_inicio' => 'date:Y-m-d',
            'fecha_fin' => 'date:Y-m-d',
            'dias_solicitados' => 'decimal:2',
            'fecha_respuesta' => 'datetime',
            'support_size' => 'integer',
        ];
    }

    public function getSupportDownloadUrlAttribute(): ?string
    {
        return $this->support_path
            ? route('leaves.support', ['leaveRequest' => $this->id])
            : null;
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprobado_por');
    }

    public function approver(): BelongsTo
    {
        return $this->reviewer();
    }

    public function decisions(): HasMany
    {
        return $this->hasMany(LeaveRequestDecision::class)->orderBy('decided_at')->orderBy('id');
    }
}
