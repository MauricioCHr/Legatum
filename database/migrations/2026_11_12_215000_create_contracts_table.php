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
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')
                ->constrained('employees')
                ->restrictOnDelete();
            $table->foreignId('contract_type_id')
                ->constrained('contract_types')
                ->restrictOnDelete();
            $table->string('numero_contrato', 50)->unique();
            $table->decimal('salario', 12, 2);
            $table->date('fecha_inicio');
            $table->date('fecha_fin')->nullable();
            $table->string('estado', 20)->default('Vigente')->index(); // 'Vigente', 'Vencido', 'Renovado', 'Anulado'
            $table->foreignId('parent_contract_id')
                ->nullable()
                ->constrained('contracts')
                ->nullOnDelete();
            $table->text('motivo_anulacion')->nullable();
            $table->text('observaciones')->nullable();
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'estado']);
            $table->index(['estado', 'fecha_fin']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
