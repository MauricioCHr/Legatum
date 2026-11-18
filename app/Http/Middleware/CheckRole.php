<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $roleName = $request->user()?->role?->name;
        $allowedRoles = array_map(static fn (string $role): string => trim($role), $roles);

        abort_unless(
            $roleName !== null && in_array($roleName, $allowedRoles, true),
            403,
            'Acceso denegado',
        );

        return $next($request);
    }
}
