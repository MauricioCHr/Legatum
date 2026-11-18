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
        Schema::create('generated_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departamentos')->nullOnDelete();
            $table->string('report_type', 80);
            $table->string('title', 180);
            $table->json('filters');
            $table->string('file_path');
            $table->unsignedInteger('rows_count')->default(0);
            $table->foreignId('regenerated_from_id')
                ->nullable()
                ->constrained('generated_reports')
                ->nullOnDelete();
            $table->timestamps();

            $table->index(['department_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('generated_reports');
    }
};
