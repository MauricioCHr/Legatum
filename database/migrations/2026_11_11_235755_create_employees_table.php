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
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->unique()
                ->constrained('users')
                ->restrictOnDelete();
            $table->string('tipo_documento', 50);
            $table->string('numero_documento', 100)->unique();
            $table->string('telefono', 50);
            $table->text('direccion');
            $table->date('fecha_nacimiento');
            $table->date('fecha_contratacion');
            $table->foreignId('departamento_id')
                ->constrained('departamentos')
                ->restrictOnDelete();
            $table->foreignId('cargo_id')
                ->constrained('cargos')
                ->restrictOnDelete();
            $table->string('estado', 16)->default('Activo')->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
