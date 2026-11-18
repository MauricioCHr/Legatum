<?php

namespace App\Models;

use Database\Factories\EmployeeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Employee extends Model
{
    /** @use HasFactory<EmployeeFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'tipo_documento',
        'numero_documento',
        'telefono',
        'direccion',
        'fecha_nacimiento',
        'fecha_contratacion',
        'departamento_id',
        'cargo_id',
        'estado',
    ];

    protected $attributes = [
        'estado' => 'Activo',
    ];

    protected $hidden = [
        'attendance_code',
        'attendance_pin_hash',
        'attendance_pin_updated_at',
        'attendance_pin_updated_by',
    ];

    protected function casts(): array
    {
        return [
            'fecha_nacimiento' => 'date:Y-m-d',
            'fecha_contratacion' => 'date:Y-m-d',
            'attendance_pin_updated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'departamento_id');
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class, 'cargo_id');
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class)->orderByDesc('fecha_inicio');
    }

    public function activeContract(): HasOne
    {
        return $this->hasOne(Contract::class)->where('estado', 'Vigente')->latestOfMany();
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class)->orderByDesc('fecha');
    }

    public function attendancePinUpdatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'attendance_pin_updated_by');
    }

    public function vacationBalance(): HasOne
    {
        return $this->hasOne(VacationBalance::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class)->orderByDesc('created_at');
    }

    public function payrollNovelties(): HasMany
    {
        return $this->hasMany(PayrollNovelty::class)->orderByDesc('created_at');
    }

    public function performanceEvaluations(): HasMany
    {
        return $this->hasMany(PerformanceEvaluation::class)->orderByDesc('created_at');
    }

    public function getOrCreateVacationBalance(): VacationBalance
    {
        return $this->vacationBalance
            ?? VacationBalance::query()->firstOrCreate(
                ['employee_id' => $this->id],
                [
                    'dias_totales_ganados' => 15.00,
                    'dias_disfrutados' => 0.00,
                    'dias_pendientes' => 0.00,
                    'dias_compensados' => 0.00,
                    'ultima_actualizacion' => now()->toDateString(),
                ]
            );
    }
}
