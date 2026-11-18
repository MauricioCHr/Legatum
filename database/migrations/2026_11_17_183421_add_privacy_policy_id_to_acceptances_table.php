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
        Schema::table('privacy_policy_acceptances', function (Blueprint $table) {
            $table->foreignId('privacy_policy_id')
                ->nullable()
                ->after('user_id')
                ->constrained('privacy_policies')
                ->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        throw new LogicException('Acceptance history must be preserved. Use a forward migration instead of rolling back this column.');
    }
};
