<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('attendance-public', function (Request $request): array {
            $ipAddress = (string) $request->ip();
            $employeeName = $request->input('employee_name');
            $normalizedName = is_string($employeeName)
                ? mb_strtolower(preg_replace('/\s+/u', ' ', trim($employeeName)) ?? '', 'UTF-8')
                : '';

            return [
                Limit::perMinute(20)->by('attendance-ip:'.hash('sha256', $ipAddress)),
                Limit::perMinute(5)->by('attendance-attempt:'.hash('sha256', $ipAddress."\0".$normalizedName)),
            ];
        });
    }
}
