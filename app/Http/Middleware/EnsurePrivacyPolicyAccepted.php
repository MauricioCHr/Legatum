<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePrivacyPolicyAccepted
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $exemptRoutes = ['privacy-policy.show', 'privacy-policy.accept', 'logout'];

        if (
            $user?->role?->name === 'Empleado'
            && ! $request->routeIs(...$exemptRoutes)
            && ! $user->privacyPolicyAcceptances()
                ->where('policy_version', (string) config('privacy.policy_version'))
                ->exists()
        ) {
            return redirect()->route('privacy-policy.show');
        }

        return $next($request);
    }
}
