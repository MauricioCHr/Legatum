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
        Schema::create('evaluation_periods', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->date('fecha_inicio');
            $table->date('fecha_fin');
            $table->enum('estado', ['Borrador', 'Abierto', 'Cerrado'])->default('Borrador');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('performance_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_period_id')->constrained('evaluation_periods')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('evaluator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('calificacion_final', 4, 2)->nullable();
            $table->enum('estado', ['Pendiente', 'Completada'])->default('Pendiente');
            $table->text('observaciones')->nullable();
            $table->text('compromisos_mejora')->nullable();
            $table->timestamp('fecha_evaluacion')->nullable();
            $table->timestamps();

            $table->unique(['evaluation_period_id', 'employee_id']);
        });

        Schema::create('evaluation_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('performance_evaluation_id')->constrained('performance_evaluations')->cascadeOnDelete();
            $table->foreignId('evaluation_criteria_id')->constrained('evaluation_criteria')->cascadeOnDelete();
            $table->decimal('calificacion', 4, 2);
            $table->text('comentarios')->nullable();
            $table->timestamps();

            $table->unique(['performance_evaluation_id', 'evaluation_criteria_id'], 'eval_scores_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_scores');
        Schema::dropIfExists('performance_evaluations');
        Schema::dropIfExists('evaluation_periods');
    }
};
