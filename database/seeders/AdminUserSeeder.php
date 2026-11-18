<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $name = config('legatum.admin_name');
        $email = config('legatum.admin_email');
        $password = config('legatum.admin_password');

        if (
            ! is_string($name)
            || trim($name) === ''
            || ! is_string($email)
            || filter_var($email, FILTER_VALIDATE_EMAIL) === false
            || ! is_string($password)
            || $password === ''
        ) {
            throw new RuntimeException(
                'Configura LEGATUM_ADMIN_NAME, LEGATUM_ADMIN_EMAIL y LEGATUM_ADMIN_PASSWORD válidos en .env antes de ejecutar los seeders.'
            );
        }

        $role = Role::query()->where('slug', 'administrador')->firstOrFail();

        $admin = User::query()->firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
            ]
        );

        if ($admin->wasRecentlyCreated) {
            $admin->role()->associate($role);
            $admin->email_verified_at = now();
            $admin->save();

            return;
        }

        if ($admin->role_id !== $role->id) {
            throw new RuntimeException(
                'El correo configurado para el administrador ya pertenece a un usuario con otro rol. Usa un correo nuevo para evitar modificar una cuenta existente.'
            );
        }
    }
}
