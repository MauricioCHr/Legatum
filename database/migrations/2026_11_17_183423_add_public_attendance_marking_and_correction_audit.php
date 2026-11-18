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
        Schema::table('employees', function (Blueprint $table) {
            $table->string('attendance_code', 12)->nullable()->unique();
            $table->string('attendance_pin_hash')->nullable();
            $table->timestamp('attendance_pin_updated_at')->nullable();
            $table->foreignId('attendance_pin_updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->string('origen_entrada', 30)->nullable();
            $table->string('origen_salida', 30)->nullable();
        });

        Schema::create('attendance_corrections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_id')
                ->constrained('attendances')
                ->restrictOnDelete();
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('actor_name');
            $table->string('actor_role', 50);
            $table->json('original_values');
            $table->json('corrected_values');
            $table->text('reason');
            $table->timestamp('corrected_at');
            $table->timestamps();

            $table->index(['attendance_id', 'corrected_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new LogicException('Attendance credentials and correction history are retained records. Use a forward migration instead of rolling back.');
    }
};
