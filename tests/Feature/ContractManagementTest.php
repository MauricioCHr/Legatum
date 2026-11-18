<?php

namespace Tests\Feature;

use App\Models\Contract;
use App\Models\ContractType;
use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\ContractTypeSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContractManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->seed(ContractTypeSeeder::class);
    }

    public function test_human_resources_can_create_renew_and_annul_contracts(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee();
        $contractType = ContractType::query()->firstOrFail();

        // 1. Create contract
        $response = $this->actingAs($thUser)->post(route('contracts.store'), [
            'employee_id' => $employee->id,
            'contract_type_id' => $contractType->id,
            'salario' => 2000000,
            'fecha_inicio' => Carbon::today()->toDateString(),
            'fecha_fin' => Carbon::today()->addMonths(6)->toDateString(),
            'estado' => 'Vigente',
            'observaciones' => 'Contrato inicial prueba',
        ]);
        $response->assertRedirect(route('contracts.index'));

        $this->assertDatabaseHas('contracts', [
            'employee_id' => $employee->id,
            'estado' => 'Vigente',
            'salario' => 2000000,
        ]);

        $contract = Contract::query()->where('employee_id', $employee->id)->firstOrFail();

        // 2. Renew contract
        $renewResponse = $this->actingAs($thUser)->post(route('contracts.renew', $contract), [
            'contract_type_id' => $contractType->id,
            'salario' => 2200000,
            'fecha_inicio' => Carbon::today()->addMonths(6)->addDay()->toDateString(),
            'fecha_fin' => Carbon::today()->addMonths(18)->toDateString(),
            'observaciones' => 'Renovado por excelente rendimiento',
        ]);
        $renewResponse->assertRedirect();

        $this->assertSame('Renovado', $contract->fresh()->estado);
        $this->assertDatabaseHas('contracts', [
            'employee_id' => $employee->id,
            'parent_contract_id' => $contract->id,
            'salario' => 2200000,
            'estado' => 'Vigente',
        ]);

        // 3. Annul contract
        $newContract = Contract::query()->where('parent_contract_id', $contract->id)->firstOrFail();
        $annulResponse = $this->actingAs($thUser)->patch(route('contracts.annul', $newContract), [
            'motivo_anulacion' => 'Anulado por mutuo acuerdo',
        ]);
        $annulResponse->assertRedirect();

        $this->assertSame('Anulado', $newContract->fresh()->estado);
        $this->assertSame('Anulado por mutuo acuerdo', $newContract->fresh()->motivo_anulacion);
    }

    public function test_employee_can_consult_only_own_contracts(): void
    {
        $employeeUser = $this->createUserWithRole('Empleado');
        $employee = $this->createEmployee(['user_id' => $employeeUser->id]);
        $contractType = ContractType::query()->firstOrFail();

        $ownContract = Contract::query()->create([
            'employee_id' => $employee->id,
            'contract_type_id' => $contractType->id,
            'numero_contrato' => 'CT-PROP-001',
            'salario' => 1500000,
            'fecha_inicio' => Carbon::today()->toDateString(),
            'estado' => 'Vigente',
        ]);

        $otherEmployee = $this->createEmployee();
        $otherContract = Contract::query()->create([
            'employee_id' => $otherEmployee->id,
            'contract_type_id' => $contractType->id,
            'numero_contrato' => 'CT-AJEN-001',
            'salario' => 3000000,
            'fecha_inicio' => Carbon::today()->toDateString(),
            'estado' => 'Vigente',
        ]);

        // Own contracts view
        $this->actingAs($employeeUser)
            ->get(route('contracts.my'))
            ->assertOk();

        // Show own contract
        $this->actingAs($employeeUser)
            ->get(route('contracts.show', $ownContract))
            ->assertOk();

        // Attempt to show other employee's contract -> Forbidden
        $this->actingAs($employeeUser)
            ->get(route('contracts.show', $otherContract))
            ->assertForbidden();
    }

    public function test_expiring_soon_alert_scope(): void
    {
        $employee = $this->createEmployee();
        $contractType = ContractType::query()->firstOrFail();

        // Expiring in 10 days
        $expiringContract = Contract::query()->create([
            'employee_id' => $employee->id,
            'contract_type_id' => $contractType->id,
            'numero_contrato' => 'CT-EXP-001',
            'salario' => 1800000,
            'fecha_inicio' => Carbon::today()->subMonths(11)->toDateString(),
            'fecha_fin' => Carbon::today()->addDays(10)->toDateString(),
            'estado' => 'Vigente',
        ]);

        // Expiring in 90 days (not soon)
        $farContract = Contract::query()->create([
            'employee_id' => $employee->id,
            'contract_type_id' => $contractType->id,
            'numero_contrato' => 'CT-FAR-001',
            'salario' => 1800000,
            'fecha_inicio' => Carbon::today()->toDateString(),
            'fecha_fin' => Carbon::today()->addDays(90)->toDateString(),
            'estado' => 'Vigente',
        ]);

        $expiringList = Contract::proximosAVencer(30)->get();

        $this->assertTrue($expiringList->contains('id', $expiringContract->id));
        $this->assertFalse($expiringList->contains('id', $farContract->id));
    }

    public function test_human_resources_can_update_contract_and_persist_changes(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee();
        $contractType = ContractType::query()->firstOrFail();
        $contract = Contract::query()->create([
            'employee_id' => $employee->id,
            'contract_type_id' => $contractType->id,
            'numero_contrato' => 'CT-EDIT-001',
            'salario' => 1800000,
            'fecha_inicio' => Carbon::today()->toDateString(),
            'estado' => 'Vigente',
        ]);

        $this->actingAs($thUser)
            ->get(route('contracts.show', $contract))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Contracts/Show')
                ->where('canManage', true)
                ->has('contractTypes'));

        $this->actingAs($thUser)
            ->put(route('contracts.update', $contract), [
                'contract_type_id' => $contractType->id,
                'numero_contrato' => 'CT-EDIT-001',
                'salario' => 2100000,
                'fecha_inicio' => Carbon::today()->toDateString(),
                'fecha_fin' => Carbon::today()->addMonths(3)->toDateString(),
                'estado' => 'Vigente',
                'observaciones' => 'Cambio salarial autorizado',
            ])
            ->assertRedirect(route('contracts.show', $contract));

        $this->assertDatabaseHas('contracts', [
            'id' => $contract->id,
            'employee_id' => $employee->id,
            'salario' => 2100000,
            'observaciones' => 'Cambio salarial autorizado',
        ]);
    }

    public function test_fixed_term_contract_requires_an_end_date(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee();
        $fixedTermType = ContractType::query()->where('requiere_fecha_fin', true)->firstOrFail();

        $this->actingAs($thUser)
            ->from(route('contracts.index'))
            ->post(route('contracts.store'), [
                'employee_id' => $employee->id,
                'contract_type_id' => $fixedTermType->id,
                'salario' => 2000000,
                'fecha_inicio' => Carbon::today()->toDateString(),
                'estado' => 'Vigente',
            ])
            ->assertRedirect(route('contracts.index'))
            ->assertSessionHasErrors('fecha_fin');

        $this->assertSame(0, Contract::query()->count());

        $contract = Contract::query()->create([
            'employee_id' => $employee->id,
            'contract_type_id' => $fixedTermType->id,
            'numero_contrato' => 'CT-FIXED-EDIT',
            'salario' => 2000000,
            'fecha_inicio' => Carbon::today()->toDateString(),
            'estado' => 'Vigente',
        ]);

        $this->actingAs($thUser)
            ->from(route('contracts.show', $contract))
            ->put(route('contracts.update', $contract), [
                'contract_type_id' => $fixedTermType->id,
                'numero_contrato' => 'CT-FIXED-EDIT',
                'salario' => 2100000,
                'fecha_inicio' => Carbon::today()->toDateString(),
                'estado' => 'Vigente',
            ])
            ->assertRedirect(route('contracts.show', $contract))
            ->assertSessionHasErrors('fecha_fin');

        $this->assertSame(2000000.0, (float) $contract->fresh()->salario);
    }

    public function test_contract_search_and_status_filters_are_applied_together(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee();
        $contractType = ContractType::query()->firstOrFail();

        Contract::query()->create([
            'employee_id' => $employee->id,
            'contract_type_id' => $contractType->id,
            'numero_contrato' => 'CT-FILTER-OLD',
            'salario' => 1800000,
            'fecha_inicio' => Carbon::today()->subYear()->toDateString(),
            'estado' => 'Vencido',
        ]);

        $this->actingAs($thUser)
            ->get(route('contracts.index', ['search' => 'CT-FILTER', 'estado' => 'Vigente']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('contracts.data', 0));
    }

    private function createEmployee(array $attributes = []): Employee
    {
        return Employee::factory()->create($attributes);
    }

    private function createUserWithRole(string $roleName): User
    {
        $role = Role::query()->where('name', $roleName)->firstOrFail();
        $user = User::factory()->for($role)->create();
        $this->acceptCurrentPrivacyPolicy($user);

        return $user;
    }
}
