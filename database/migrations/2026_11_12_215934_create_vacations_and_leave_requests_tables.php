<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('vacation_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')
                ->unique()
                ->constrained('employees')
                ->restrictOnDelete();
            $table->decimal('dias_totales_ganados', 5, 2)->default(15.00);
            $table->decimal('dias_disfrutados', 5, 2)->default(0.00);
            $table->decimal('dias_pendientes', 5, 2)->default(0.00);
            $table->decimal('dias_compensados', 5, 2)->default(0.00);
            $table->date('ultima_actualizacion')->nullable();
            $table->timestamps();
        });

        Schema::create('leave_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')
                ->constrained('employees')
                ->restrictOnDelete();
            $table->foreignId('leave_type_id')
                ->constrained('leave_types')
                ->restrictOnDelete();
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->decimal('dias_solicitados', 5, 2);
            $table->text('motivo');
            $table->string('estado', 20)->default('Pendiente')->index(); // 'Pendiente', 'Aprobada', 'Rechazada', 'Cancelada'
            $table->foreignId('aprobado_por')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('fecha_respuesta')->nullable();
            $table->text('observaciones_respuesta')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'estado']);
            $table->index(['estado', 'fecha_inicio']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_requests');
        Schema::dropIfExists('vacation_balances');
    }
};
