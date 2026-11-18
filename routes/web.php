
<?php

use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\ContractController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\LeaveRequestController;
use App\Http\Controllers\PayrollNoveltyController;
use App\Http\Controllers\PerformanceEvaluationController;
use App\Http\Controllers\PositionController;
use App\Http\Controllers\PrivacyPolicyController;
use App\Http\Controllers\PublicAttendanceController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Redirección principal según el rol del usuario
Route::get('/', function () {
    $user = auth()->user();

    if (!$user) {
        return redirect()->route('login');
    }

    if ($user->role?->name === 'Empleado') {
        return redirect()->route('employees.me');
    }

    return redirect()->route('dashboard');
});

// Rutas para usuarios no autenticados
Route::middleware('guest')->group(function () {

    Route::get('/login', [AuthController::class, 'showLogin'])
        ->name('login');

    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1')
        ->name('login.store');

});

Route::get('/marcacion', [PublicAttendanceController::class, 'show'])
    ->name('attendance.public.show');

Route::post('/marcacion', [PublicAttendanceController::class, 'mark'])
    ->middleware('throttle:attendance-public')
    ->name('attendance.public.mark');

// Rutas protegidas
Route::middleware(['auth', 'active', 'privacy.accepted'])->group(function () {

    Route::get('/politica-de-datos', [PrivacyPolicyController::class, 'show'])
        ->name('privacy-policy.show');

    Route::post('/politica-de-datos/aceptar', [PrivacyPolicyController::class, 'accept'])
        ->name('privacy-policy.accept');

    Route::get('/dashboard', DashboardController::class)
        ->middleware('role:Administrador,Talento Humano,Jefe de área,Nómina,Gerencia')
        ->name('dashboard');

    Route::get('/mi-perfil', [EmployeeController::class, 'me'])
        ->middleware('role:Empleado,Administrador,Talento Humano,Jefe de área,Nómina,Gerencia')
        ->name('employees.me');

    Route::get('/equipo', [EmployeeController::class, 'team'])
        ->middleware('role:Jefe de área,Administrador,Talento Humano')
        ->name('employees.team');

    Route::prefix('empleados')
        ->name('employees.')
        ->middleware('role:Administrador,Talento Humano,Gerencia')
        ->controller(EmployeeController::class)
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/{employee}', 'show')->name('show');

            Route::middleware('role:Talento Humano')->group(function () {
                Route::post('/', 'store')->name('store');
                Route::put('/{employee}', 'update')->name('update');
                Route::patch('/{employee}/estado', 'updateStatus')->name('status');
            });

            Route::put('/{employee}/credenciales-marcacion', 'updateAttendancePin')
                ->middleware('role:Administrador')
                ->name('attendance-pin');
        });

    Route::get('/mis-contratos', [ContractController::class, 'myContracts'])
        ->middleware('role:Empleado')
        ->name('contracts.my');

    Route::prefix('contratos')
        ->name('contracts.')
        ->controller(ContractController::class)
        ->group(function () {
            Route::get('/', 'index')
                ->middleware('role:Administrador,Talento Humano,Gerencia')
                ->name('index');

            Route::get('/{contract}', 'show')
                ->middleware('role:Administrador,Talento Humano,Gerencia,Empleado')
                ->name('show');

            Route::middleware('role:Talento Humano')->group(function () {
                Route::post('/', 'store')->name('store');
                Route::put('/{contract}', 'update')->name('update');
                Route::post('/{contract}/renovar', 'renew')->name('renew');
                Route::patch('/{contract}/anular', 'annul')->name('annul');
            });
        });

    Route::get('/mi-asistencia', [AttendanceController::class, 'myAttendance'])
        ->middleware('role:Empleado')
        ->name('attendance.my');

    Route::post('/mi-asistencia/marcar', [AttendanceController::class, 'clock'])
        ->middleware('role:Empleado')
        ->name('attendance.clock');

    Route::get('/asistencia/equipo', [AttendanceController::class, 'team'])
        ->middleware('role:Jefe de área,Talento Humano,Administrador')
        ->name('attendance.team');

    Route::prefix('asistencia')
        ->name('attendance.')
        ->controller(AttendanceController::class)
        ->group(function () {
            Route::get('/', 'index')
                ->middleware('role:Administrador,Talento Humano')
                ->name('index');

            Route::middleware('role:Talento Humano')->group(function () {
                Route::post('/', 'store')->name('store');
                Route::put('/{attendance}', 'update')->name('update');
            });
        });

    Route::get('/mis-vacaciones', [LeaveRequestController::class, 'myRequests'])
        ->middleware('role:Empleado')
        ->name('leaves.my');

    Route::get('/vacaciones/aprobaciones', [LeaveRequestController::class, 'teamRequests'])
        ->middleware('role:Jefe de área,Talento Humano,Administrador')
        ->name('leaves.team');

    Route::prefix('vacaciones/solicitudes')
        ->name('leaves.')
        ->controller(LeaveRequestController::class)
        ->group(function () {
            Route::get('/', 'index')
                ->middleware('role:Administrador,Talento Humano')
                ->name('index');

            Route::post('/', 'store')
                ->middleware('role:Administrador,Talento Humano,Empleado')
                ->name('store');

            Route::get('/{leaveRequest}/soporte', 'downloadSupport')
                ->middleware('role:Administrador,Talento Humano,Jefe de área,Empleado')
                ->name('support');

            Route::post('/{leaveRequest}/aprobar', 'approve')
                ->middleware('role:Talento Humano,Jefe de área,Administrador')
                ->name('approve');

            Route::post('/{leaveRequest}/rechazar', 'reject')
                ->middleware('role:Talento Humano,Jefe de área,Administrador')
                ->name('reject');

            Route::post('/{leaveRequest}/cancelar', 'cancel')
                ->middleware('role:Empleado,Talento Humano,Administrador')
                ->name('cancel');
        });

    Route::prefix('nomina')
        ->name('payroll.')
        ->controller(PayrollNoveltyController::class)
        ->group(function () {
            Route::get('/novedades', 'index')
                ->middleware('role:Talento Humano,Nómina,Administrador')
                ->name('index');

            Route::get('/periodos', 'consolidated')
                ->middleware('role:Talento Humano,Nómina,Administrador')
                ->name('consolidated');

            Route::middleware('role:Talento Humano,Administrador')->group(function () {
                Route::post('/novedades', 'store')->name('store');
                Route::patch('/novedades/{novelty}/anular', 'annul')->name('annul');
                Route::post('/periodos/{period}/consolidar', 'consolidatePeriod')->name('consolidate');
            });
        });

    Route::get('/mis-evaluaciones', [PerformanceEvaluationController::class, 'myEvaluations'])
        ->middleware('role:Empleado')
        ->name('evaluations.my');

    Route::prefix('evaluaciones')
        ->name('evaluations.')
        ->controller(PerformanceEvaluationController::class)
        ->group(function () {
            Route::get('/', 'index')
                ->middleware('role:Administrador,Talento Humano,Jefe de área,Gerencia')
                ->name('index');

            Route::middleware('role:Administrador,Talento Humano')->group(function () {
                Route::post('/periodos', 'storePeriod')->name('periods.store');
                Route::patch('/periodos/{period}/estado', 'togglePeriodStatus')->name('periods.status');
            });

            Route::middleware('role:Administrador,Talento Humano,Jefe de área')->group(function () {
                Route::post('/{evaluation}/calificar', 'evaluate')->name('evaluate');
            });
        });

    Route::prefix('reportes')
        ->name('reports.')
        ->middleware('role:Administrador,Talento Humano,Jefe de área,Nómina,Gerencia')
        ->controller(ReportController::class)
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/exportar', 'export')->name('export');
            Route::post('/generar-pdf', 'generate')->name('generate');
            Route::get('/{generatedReport}/descargar', 'download')->name('download');
            Route::post('/{generatedReport}/regenerar', 'regenerate')->name('regenerate');
        });

    Route::prefix('departamentos')
        ->name('departments.')
        ->controller(DepartmentController::class)
        ->group(function () {
            Route::get('/', 'index')
                ->middleware('role:Administrador,Talento Humano,Gerencia')
                ->name('index');

            Route::middleware('role:Administrador')->group(function () {
                Route::post('/', 'store')->name('store');
                Route::put('/{department}', 'update')->name('update');
                Route::patch('/{department}/estado', 'toggleStatus')->name('status');
            });
        });

    Route::prefix('cargos')
        ->name('positions.')
        ->controller(PositionController::class)
        ->group(function () {
            Route::get('/', 'index')
                ->middleware('role:Administrador,Talento Humano,Gerencia')
                ->name('index');

            Route::middleware('role:Administrador')->group(function () {
                Route::post('/', 'store')->name('store');
                Route::put('/{position}', 'update')->name('update');
                Route::patch('/{position}/estado', 'toggleStatus')->name('status');
            });
        });

    Route::prefix('catalogos')
        ->name('catalogs.')
        ->controller(CatalogController::class)
        ->group(function () {
            Route::get('/', 'index')
                ->middleware('role:Administrador')
                ->name('index');

            Route::middleware('role:Administrador')->group(function () {
                Route::post('/tipos-contrato', 'storeContractType')->name('contract-types.store');
                Route::put('/tipos-contrato/{contractType}', 'updateContractType')->name('contract-types.update');
                Route::post('/tipos-permiso', 'storeLeaveType')->name('leave-types.store');
                Route::put('/tipos-permiso/{leaveType}', 'updateLeaveType')->name('leave-types.update');
                Route::post('/tipos-novedad', 'storePayrollNoveltyType')->name('payroll-novelty-types.store');
                Route::put('/tipos-novedad/{payrollNoveltyType}', 'updatePayrollNoveltyType')->name('payroll-novelty-types.update');
                Route::post('/criterios-evaluacion', 'storeEvaluationCriteria')->name('evaluation-criteria.store');
                Route::put('/criterios-evaluacion/{evaluationCriteria}', 'updateEvaluationCriteria')->name('evaluation-criteria.update');
            });
        });

    Route::post('/logout', [AuthController::class, 'logout'])
        ->name('logout');

    Route::prefix('usuarios')
        ->name('users.')
        ->middleware('role:Administrador')
        ->controller(UserController::class)
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::put('/{user}', 'update')->name('update');
            Route::delete('/{user}', 'destroy')->name('destroy');
        });

});
