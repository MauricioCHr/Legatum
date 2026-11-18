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
        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 50)->unique();
            $table->string('nombre', 100);
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->string('estado', 20)->default('Abierto')->index(); // 'Abierto', 'Consolidado', 'Cerrado'
            $table->foreignId('consolidado_por')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('fecha_consolidacion')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();
        });

        Schema::create('payroll_novelties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')
                ->constrained('employees')
                ->restrictOnDelete();
            $table->foreignId('payroll_novelty_type_id')
                ->constrained('payroll_novelty_types')
                ->restrictOnDelete();
            $table->foreignId('payroll_period_id')
                ->constrained('payroll_periods')
                ->restrictOnDelete();
            $table->decimal('valor', 12, 2)->nullable();
            $table->decimal('cantidad', 8, 2)->nullable();
            $table->text('descripcion');
            $table->string('estado', 20)->default('Activa')->index(); // 'Activa', 'Anulada'
            $table->text('motivo_anulacion')->nullable();
            $table->foreignId('anulado_por')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('fecha_anulacion')->nullable();
            $table->foreignId('registrado_por')
                ->constrained('users')
                ->restrictOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'payroll_period_id']);
            $table->index(['payroll_period_id', 'estado']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_novelties');
        Schema::dropIfExists('payroll_periods');
    }
};
