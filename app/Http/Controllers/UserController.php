<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'role_id' => ['nullable', 'integer', Rule::exists('roles', 'id')],
        ], [
            'search.max' => 'La búsqueda no puede superar los 100 caracteres.',
            'role_id.exists' => 'El rol seleccionado no es válido.',
        ]);

        $search = $filters['search'] ?? '';
        $roleId = isset($filters['role_id']) ? (int) $filters['role_id'] : null;

        $users = User::query()
            ->select(['id', 'name', 'email', 'role_id', 'is_active'])
            ->with('role:id,name')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($roleId !== null, fn ($query) => $query->where('role_id', $roleId))
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Users/Index', [
            'users' => $users,
            'roles' => Role::query()->orderBy('name')->get(['id', 'name']),
            'filters' => [
                'search' => $search,
                'role_id' => $roleId,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $role = Role::query()->findOrFail($data['role_id']);

        $user = new User([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);
        $user->is_active = $data['is_active'];
        $user->role()->associate($role);
        $user->save();

        return to_route('users.index')->with('success', 'El usuario se creó correctamente.');
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $data = $request->validated();
        $blockMessage = DB::transaction(function () use ($data, $request, $user): ?string {
            $administratorRole = Role::query()
                ->where('slug', 'administrador')
                ->lockForUpdate()
                ->firstOrFail();
            $user = User::query()->lockForUpdate()->findOrFail($user->getKey());
            $newRole = Role::query()->findOrFail($data['role_id']);

            $isActiveAdministrator = $user->role_id === $administratorRole->id && $user->is_active;
            $willRemainActiveAdministrator = $newRole->id === $administratorRole->id
                && $data['is_active'];

            if (
                $isActiveAdministrator
                && ! $willRemainActiveAdministrator
                && $this->activeAdministratorCount($administratorRole) <= 1
            ) {
                return 'No se puede desactivar ni cambiar el rol del último administrador activo.';
            }

            if ($user->id === $request->user()->id && ! $data['is_active']) {
                return 'No puedes desactivar tu propia cuenta mientras tienes una sesión activa.';
            }

            $user->fill([
                'name' => $data['name'],
                'email' => $data['email'],
            ]);
            $user->is_active = $data['is_active'];
            $user->role()->associate($newRole);

            if (! empty($data['password'])) {
                $user->password = Hash::make($data['password']);
            }

            $user->save();

            return null;
        });

        if ($blockMessage !== null) {
            return back()->with('error', $blockMessage);
        }

        return back()->with('success', 'Los cambios del usuario se guardaron correctamente.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $blockMessage = DB::transaction(function () use ($request, $user): ?string {
            $administratorRole = Role::query()
                ->where('slug', 'administrador')
                ->lockForUpdate()
                ->firstOrFail();
            $user = User::query()->lockForUpdate()->findOrFail($user->getKey());

            if ($user->id === $request->user()->id) {
                return 'No puedes eliminar tu propia cuenta.';
            }

            if ($user->employee()->exists()) {
                return 'No se puede eliminar una cuenta vinculada a una ficha de empleado.';
            }

            if (
                $user->role_id === $administratorRole->id
                && $user->is_active
                && $this->activeAdministratorCount($administratorRole) <= 1
            ) {
                return 'No se puede eliminar al último administrador activo.';
            }

            $user->delete();

            return null;
        });

        if ($blockMessage !== null) {
            return back()->with('error', $blockMessage);
        }

        return to_route('users.index')->with('success', 'El usuario se eliminó correctamente.');
    }

    private function activeAdministratorCount(Role $administratorRole): int
    {
        return User::query()
            ->where('role_id', $administratorRole->id)
            ->where('is_active', true)
            ->lockForUpdate()
            ->count();
    }
}
