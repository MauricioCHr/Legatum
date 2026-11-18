<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GeneratedReport extends Model
{
    protected $fillable = [
        'user_id',
        'generated_by_role',
        'department_id',
        'report_type',
        'title',
        'filters',
        'file_path',
        'rows_count',
        'regenerated_from_id',
    ];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'rows_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function regeneratedFrom(): BelongsTo
    {
        return $this->belongsTo(self::class, 'regenerated_from_id');
    }

    public function regenerations(): HasMany
    {
        return $this->hasMany(self::class, 'regenerated_from_id');
    }
}
