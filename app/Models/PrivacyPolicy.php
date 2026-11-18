<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PrivacyPolicy extends Model
{
    protected $fillable = [
        'version',
        'text',
        'effective_at',
        'responsible_name',
        'responsible_identification',
        'contact_email',
        'contact_address',
    ];

    protected function casts(): array
    {
        return [
            'effective_at' => 'date:Y-m-d',
        ];
    }

    public function acceptances(): HasMany
    {
        return $this->hasMany(PrivacyPolicyAcceptance::class);
    }
}
