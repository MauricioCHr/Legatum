<?php

namespace App\Services;

use App\AttendanceMarkStatus;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AttendanceMarkingService
{
    public function markPublic(string $employeeName, string $pin): AttendanceMarkStatus
    {
        return DB::transaction(function () use ($employeeName, $pin): AttendanceMarkStatus {
            $normalizedName = $this->normalizeName($employeeName);

            if ($normalizedName === '') {
                return AttendanceMarkStatus::InvalidCredentials;
            }

            $employees = $this->findPublicCandidates($normalizedName);
            $verifiedEmployees = $employees->filter(function (Employee $employee) use ($normalizedName, $pin): bool {
                return $employee->estado === 'Activo'
                    && $this->normalizeName($employee->user?->name ?? '') === $normalizedName
                    && is_string($employee->attendance_pin_hash)
                    && Hash::check($pin, $employee->attendance_pin_hash);
            });

            if ($verifiedEmployees->count() !== 1) {
                return AttendanceMarkStatus::InvalidCredentials;
            }

            $employee = $verifiedEmployees->first();

            if (! $employee) {
                return AttendanceMarkStatus::InvalidCredentials;
            }

            $employee->loadMissing('user.role');

            if (
                $employee->user?->role?->name === 'Empleado'
                && ! $employee->user->privacyPolicyAcceptances()
                    ->where('policy_version', (string) config('privacy.policy_version'))
                    ->exists()
            ) {
                return AttendanceMarkStatus::PrivacyAcceptanceRequired;
            }

            $markedAt = CarbonImmutable::now('America/Bogota');
            $openAttendance = $this->findOpenAttendance($employee, $markedAt);

            if ($openAttendance) {
                return $this->recordExit($openAttendance, null, 'publico', $markedAt);
            }

            return $this->recordEntry($employee, null, 'publico', $markedAt);
        });
    }

    public function toggleForUser(Employee $employee, User $user): AttendanceMarkStatus
    {
        return DB::transaction(function () use ($employee, $user): AttendanceMarkStatus {
            $lockedEmployee = Employee::query()->lockForUpdate()->findOrFail($employee->getKey());

            if ($lockedEmployee->estado !== 'Activo') {
                return AttendanceMarkStatus::InactiveEmployee;
            }

            $markedAt = CarbonImmutable::now('America/Bogota');
            $openAttendance = $this->findOpenAttendance($lockedEmployee, $markedAt);

            if ($openAttendance) {
                return $this->recordExit($openAttendance, $user->id, 'autenticado', $markedAt);
            }

            return $this->recordEntry($lockedEmployee, $user->id, 'autenticado', $markedAt);
        });
    }

    private function findPublicCandidates(string $normalizedName): Collection
    {
        $tokens = explode(' ', $normalizedName);
        $pattern = implode('%', array_map(
            static fn (string $token): string => str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $token),
            $tokens,
        )).'%';

        if (
            DB::connection()->getDriverName() === 'sqlite'
            && preg_match('/[^\x00-\x7F]/', $normalizedName) === 1
        ) {
            $candidateIds = Employee::query()
                ->select(['id', 'user_id'])
                ->with('user:id,name')
                ->get()
                ->filter(fn (Employee $employee): bool => $this->normalizeName($employee->user?->name ?? '') === $normalizedName)
                ->pluck('id')
                ->all();
        } else {
            $candidateIds = Employee::query()
                ->whereHas('user', function ($query) use ($pattern): void {
                    $query->whereRaw("LOWER(TRIM(name)) LIKE ? ESCAPE '!'", [$pattern]);
                })
                ->pluck('id')
                ->all();
        }

        return Employee::query()
            ->whereKey($candidateIds)
            ->whereNotNull('attendance_pin_hash')
            ->with('user:id,name,role_id')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();
    }

    private function normalizeName(string $name): string
    {
        $normalizedName = preg_replace('/\s+/u', ' ', trim($name));

        return mb_strtolower($normalizedName ?? '', 'UTF-8');
    }

    private function recordEntry(
        Employee $employee,
        ?int $userId,
        string $origin,
        CarbonImmutable $markedAt,
    ): AttendanceMarkStatus {
        if (
            $this->findOpenAttendance($employee, $markedAt)
            || Attendance::query()
                ->where('employee_id', $employee->id)
                ->where('fecha', $markedAt->toDateString())
                ->exists()
        ) {
            return AttendanceMarkStatus::AlreadyRecorded;
        }

        $expectedAt = $markedAt->startOfDay()->setTime(8, 0);
        $minutesLate = $markedAt->greaterThan($expectedAt)
            ? (int) $expectedAt->diffInMinutes($markedAt)
            : 0;

        Attendance::query()->create([
            'employee_id' => $employee->id,
            'fecha' => $markedAt->toDateString(),
            'hora_entrada' => $markedAt->format('H:i:s'),
            'estado' => $minutesLate > 15 ? 'Retardo' : 'Presente',
            'minutos_retardo' => $minutesLate,
            'registrado_por' => $userId,
            'origen_entrada' => $origin,
        ]);

        return AttendanceMarkStatus::EntryRecorded;
    }

    private function recordExit(
        Attendance $attendance,
        ?int $userId,
        string $origin,
        CarbonImmutable $markedAt,
    ): AttendanceMarkStatus {
        $entryAt = CarbonImmutable::parse(
            $attendance->fecha->toDateString().' '.$attendance->hora_entrada,
            'America/Bogota',
        );
        $exitAt = $markedAt->lessThan($entryAt) ? $markedAt->addDay() : $markedAt;
        $workedHours = $entryAt->diffInSeconds($exitAt) / 3600;

        $attendance->update([
            'hora_salida' => $markedAt->format('H:i:s'),
            'horas_extra' => max(0, round($workedHours - 8, 2)),
            'origen_salida' => $origin,
        ]);

        return AttendanceMarkStatus::ExitRecorded;
    }

    private function findOpenAttendance(Employee $employee, CarbonImmutable $markedAt): ?Attendance
    {
        return Attendance::query()
            ->where('employee_id', $employee->id)
            ->whereNotNull('hora_entrada')
            ->whereNull('hora_salida')
            ->where('fecha', '>=', $markedAt->subDay()->toDateString())
            ->orderByDesc('fecha')
            ->lockForUpdate()
            ->first();
    }
}
