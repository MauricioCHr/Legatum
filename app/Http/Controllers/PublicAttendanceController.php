<?php

namespace App\Http\Controllers;

use App\AttendanceMarkStatus;
use App\Services\AttendanceMarkingService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class PublicAttendanceController extends Controller
{
    public function show(Request $request): Response
    {
        return Inertia::render('Attendance/PublicClock', [
            'serverTime' => CarbonImmutable::now('America/Bogota')->format('H:i'),
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function mark(Request $request, AttendanceMarkingService $attendanceMarkingService): RedirectResponse
    {
        $validator = Validator::make($request->only(['employee_name', 'pin']), [
            'employee_name' => ['required', 'string', 'max:255'],
            'pin' => ['required', 'string', 'regex:/\A[0-9]{6,12}\z/'],
        ], [
            'employee_name.required' => 'Ingresa tu nombre y apellido.',
            'employee_name.string' => 'El nombre y apellido debe ser texto.',
            'employee_name.max' => 'El nombre y apellido no puede superar 255 caracteres.',
            'pin.required' => 'Ingresa tu PIN personal.',
            'pin.regex' => 'El PIN debe tener entre 6 y 12 dígitos.',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator);
        }

        $data = $validator->validated();
        $status = $attendanceMarkingService->markPublic($data['employee_name'], $data['pin']);
        $genericError = 'No se pudo validar la marcación. Verifica el nombre y el PIN o comunícate con Talento Humano.';

        return match ($status) {
            AttendanceMarkStatus::EntryRecorded => to_route('attendance.public.show')
                ->with('success', 'Entrada registrada correctamente.'),
            AttendanceMarkStatus::ExitRecorded => to_route('attendance.public.show')
                ->with('success', 'Salida registrada correctamente.'),
            AttendanceMarkStatus::AlreadyRecorded => to_route('attendance.public.show')
                ->with('error', 'Ya existe una marcación para hoy o una entrada reciente está abierta.'),
            AttendanceMarkStatus::NoOpenEntry => to_route('attendance.public.show')
                ->with('error', 'No hay una entrada abierta para registrar salida.'),
            AttendanceMarkStatus::InvalidCredentials => to_route('attendance.public.show')
                ->with('error', $genericError),
            AttendanceMarkStatus::InactiveEmployee => to_route('attendance.public.show')
                ->with('error', $genericError),
            AttendanceMarkStatus::PrivacyAcceptanceRequired => to_route('attendance.public.show')
                ->with('error', $genericError),
        };
    }
}
