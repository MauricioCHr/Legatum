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
        Schema::table('departamentos', function (Blueprint $table) {
            $table->text('descripcion')->nullable()->after('nombre');
            $table->foreignId('jefe_id')
                ->nullable()
                ->after('descripcion')
                ->constrained('employees')
                ->nullOnDelete();
            $table->boolean('is_active')->default(true)->after('jefe_id');
        });

        Schema::table('cargos', function (Blueprint $table) {
            $table->foreignId('departamento_id')
                ->nullable()
                ->after('id')
                ->constrained('departamentos')
                ->restrictOnDelete();
            $table->text('descripcion')->nullable()->after('nombre');
            $table->boolean('is_active')->default(true)->after('descripcion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cargos', function (Blueprint $table) {
            $table->dropForeign(['departamento_id']);
            $table->dropColumn(['departamento_id', 'descripcion', 'is_active']);
        });

        Schema::table('departamentos', function (Blueprint $table) {
            $table->dropForeign(['jefe_id']);
            $table->dropColumn(['descripcion', 'jefe_id', 'is_active']);
        });
    }
};
