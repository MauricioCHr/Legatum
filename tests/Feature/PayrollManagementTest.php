<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\PayrollNovelty;
use App\Models\PayrollNoveltyType;
use App\Models\PayrollPeriod;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PayrollNoveltyTypeSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(PayrollNoveltyTypeSeeder::class);
    }

    private function createEmployee(array $attributes = []): Employee
    {
        return Employee::factory()->create($attributes);
    }

    private function createUserWithRole(string $roleName): User
    {
        $role = Role::query()->where('name', $roleName)->firstOrFail();

        return User::factory()->for($role)->create();
    }

    public function test_talento_humano_can_record_novelty_and_annul(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee();

        $period = PayrollPeriod::create([
            'codigo' => '2026-11-Q1',
            'nombre' => 'Primera Quincena Noviembre 2026',
            'fecha_inicio' => '2026-11-01',
            'fecha_fin' => '2026-11-15',
            'estado' => 'Abierto',
        ]);

        $type = PayrollNoveltyType::first();

        $response = $this->actingAs($thUser)->post(route('payroll.store'), [
            'payroll_period_id' => $period->id,
            'employee_id' => $employee->id,
            'payroll_novelty_type_id' => $type->id,
            'cantidad' => 1,
            'valor' => 150000,
            'descripcion' => 'Bono acordado por cumplimiento',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('payroll_novelties', [
            'employee_id' => $employee->id,
            'estado' => 'Activa',
        ]);

        $novelty = PayrollNovelty::where('employee_id', $employee->id)->first();

        // Annul
        $annulResponse = $this->actingAs($thUser)->patch(route('payroll.annul', $novelty), [
            'motivo_anulacion' => 'Error en monto',
        ]);

        $annulResponse->assertRedirect();
        $novelty->refresh();
        $this->assertEquals('Anulada', $novelty->estado);
        $this->assertEquals('Error en monto', $novelty->motivo_anulacion);
    }

    public function test_nomina_role_is_strictly_read_only(): void
    {
        $nominaUser = $this->createUserWithRole('Nómina');
        $employee = $this->createEmployee();

        $period = PayrollPeriod::create([
            'codigo' => '2026-11-Q2',
            'nombre' => 'Segunda Quincena Noviembre 2026',
            'fecha_inicio' => '2026-11-16',
            'fecha_fin' => '2026-11-30',
            'estado' => 'Abierto',
        ]);

        $type = PayrollNoveltyType::first();

        // Nómina can view index & consolidated
        $indexResponse = $this->actingAs($nominaUser)->get(route('payroll.index'));
        $indexResponse->assertOk();

        $periodsResponse = $this->actingAs($nominaUser)->get(route('payroll.consolidated'));
        $periodsResponse->assertOk();

        // Nómina CANNOT create novelty
        $storeResponse = $this->actingAs($nominaUser)->post(route('payroll.store'), [
            'payroll_period_id' => $period->id,
            'employee_id' => $employee->id,
            'payroll_novelty_type_id' => $type->id,
            'concepto' => 'Intento nómina',
            'valor' => 50000,
        ]);
        $storeResponse->assertForbidden();

        // Nómina CANNOT consolidate period
        $consolidateResponse = $this->actingAs($nominaUser)->post(route('payroll.consolidate', $period));
        $consolidateResponse->assertForbidden();
    }

    public function test_cannot_add_novelty_to_closed_period(): void
    {
        $thUser = $this->createUserWithRole('Talento Humano');
        $employee = $this->createEmployee();

        $period = PayrollPeriod::create([
            'codigo' => '2026-10-Q2',
            'nombre' => 'Segunda Quincena Octubre 2026',
            'fecha_inicio' => '2026-10-16',
            'fecha_fin' => '2026-10-31',
            'estado' => 'Consolidado',
        ]);

        $type = PayrollNoveltyType::first();

        $response = $this->actingAs($thUser)->post(route('payroll.store'), [
            'payroll_period_id' => $period->id,
            'employee_id' => $employee->id,
            'payroll_novelty_type_id' => $type->id,
            'descripcion' => 'Hora extra tardía',
            'valor' => 45000,
        ]);

        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('payroll_novelties', [
            'descripcion' => 'Hora extra tardía',
        ]);
    }
}
