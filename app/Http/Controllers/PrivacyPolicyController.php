<?php

namespace App\Http\Controllers;

use App\Models\PrivacyPolicy;
use App\Models\PrivacyPolicyAcceptance;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PrivacyPolicyController extends Controller
{
    public function show(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $policy = PrivacyPolicy::query()
            ->where('version', (string) config('privacy.policy_version'))
            ->firstOrFail();
        $history = $user->privacyPolicyAcceptances()
            ->orderByDesc('accepted_at')
            ->orderByDesc('id')
            ->paginate(10)
            ->through(fn (PrivacyPolicyAcceptance $acceptance): array => [
                'id' => $acceptance->id,
                'version' => $acceptance->policy_version,
                'text' => $acceptance->policy_text,
                'accepted_at' => $acceptance->accepted_at,
            ]);

        return Inertia::render('PrivacyPolicy/Show', [
            'policy' => [
                'version' => $policy->version,
                'text' => $policy->text,
                'effective_at' => $policy->effective_at?->format('Y-m-d'),
                'responsible_name' => $policy->responsible_name,
                'responsible_identification' => $policy->responsible_identification,
                'contact_email' => $policy->contact_email,
                'contact_address' => $policy->contact_address,
            ],
            'isAccepted' => $user->privacyPolicyAcceptances()
                ->where('policy_version', $policy->version)
                ->exists(),
            'history' => $history,
        ]);
    }

    public function accept(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user?->role?->name === 'Empleado', 403);

        $request->validate([
            'accepted' => ['required', 'accepted'],
        ], [
            'accepted.accepted' => 'Debes aceptar la política para continuar.',
        ]);

        $policy = PrivacyPolicy::query()
            ->where('version', (string) config('privacy.policy_version'))
            ->firstOrFail();

        PrivacyPolicyAcceptance::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'policy_version' => $policy->version,
            ],
            [
                'privacy_policy_id' => $policy->id,
                'policy_text' => $policy->text,
                'accepted_at' => now(),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        );

        return to_route('leaves.my')->with('success', 'Tu aceptación de la política quedó registrada.');
    }
}
