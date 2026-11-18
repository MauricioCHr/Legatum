<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('leave_types', function (Blueprint $table) {
            $table->boolean('requires_attachment')->default(false);
        });

        DB::table('leave_types')
            ->whereIn('codigo', [
                'calamidad-domestica',
                'cita-medica',
                'licencia-luto',
                'licencia-maternidad-paternidad',
            ])
            ->update(['requires_attachment' => true]);

        Schema::table('leave_requests', function (Blueprint $table) {
            $table->string('support_path')->nullable();
            $table->string('support_original_name')->nullable();
            $table->string('support_mime_type', 100)->nullable();
            $table->unsignedBigInteger('support_size')->nullable();
        });

        Schema::create('leave_request_decisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('leave_request_id')
                ->constrained('leave_requests')
                ->restrictOnDelete();
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('actor_name');
            $table->string('actor_role', 50);
            $table->string('action', 30);
            $table->text('observations')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('decided_at');
            $table->timestamps();

            $table->index(['leave_request_id', 'decided_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_request_decisions');

        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn([
                'support_path',
                'support_original_name',
                'support_mime_type',
                'support_size',
            ]);
        });

        Schema::table('leave_types', function (Blueprint $table) {
            $table->dropColumn('requires_attachment');
        });
    }
};
