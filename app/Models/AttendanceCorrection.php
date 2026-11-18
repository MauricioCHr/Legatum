<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceCorrection extends Model
{
    protected $fillable = [
        'attendance_id',
        'user_id',
        'actor_name',
        'actor_role',
        'original_values',
        'corrected_values',
        'reason',
        'corrected_at',
    ];

    protected function casts(): array
    {
        return [
            'original_values' => 'array',
            'corrected_values' => 'array',
            'corrected_at' => 'datetime',
        ];
    }

    public function attendance(): BelongsTo
    {
        return $this->belongsTo(Attendance::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
