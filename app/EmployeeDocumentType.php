<?php

namespace App;

enum EmployeeDocumentType: string
{
    case CedulaCiudadania = 'CC';
    case TarjetaIdentidad = 'TI';
    case CedulaExtranjeria = 'CE';
    case Pasaporte = 'PA';
    case PermisoProteccionTemporal = 'PPT';
    case RegistroCivil = 'RC';

    public function label(): string
    {
        return match ($this) {
            self::CedulaCiudadania => 'Cédula de ciudadanía (CC)',
            self::TarjetaIdentidad => 'Tarjeta de identidad (TI)',
            self::CedulaExtranjeria => 'Cédula de extranjería (CE)',
            self::Pasaporte => 'Pasaporte (PA)',
            self::PermisoProteccionTemporal => 'Permiso por Protección Temporal (PPT)',
            self::RegistroCivil => 'Registro civil (RC)',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $type): array => ['value' => $type->value, 'label' => $type->label()],
            self::cases(),
        );
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $type): string => $type->value, self::cases());
    }
}
