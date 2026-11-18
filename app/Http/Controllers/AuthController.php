<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    // Mostrar formulario de inicio de sesión
    public function showLogin(): Response
    {
        return Inertia::render('Auth/Login');
    }

    // Procesar inicio de sesión
    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);
        $credentials['is_active'] = true;

        if (Auth::attempt($credentials, $request->boolean('remember'))) {

            $request->session()->regenerate();
            $request->session()->forget('url.intended');
            $landingRoute = $request->user()?->role?->name === 'Empleado'
                ? 'employees.me'
                : 'dashboard';

            return to_route($landingRoute);
        }

        return back()->withErrors([
            'email' => 'Las credenciales ingresadas son incorrectas.',
        ])->onlyInput('email');
    }

    // Cerrar sesión
    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/login');
    }
}
