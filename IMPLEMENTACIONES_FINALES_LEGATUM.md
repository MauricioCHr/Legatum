# Implementaciones finales de LEGATUM

## Alcance de esta fase

Esta fase completó la política de privacidad versionada y la marcación pública de asistencia, conservando los registros y las migraciones existentes. No rehizo los reportes PDF ni desplegó la aplicación. La matriz completa de requisitos y sus estados está en [MATRIZ_CUMPLIMIENTO.md](./MATRIZ_CUMPLIMIENTO.md); la guía de instalación y despliegue existente está en [GUIA_DESPLIEGUE.md](./GUIA_DESPLIEGUE.md).

## Funcionalidades implementadas

- Política de privacidad persistida por versión, con aceptación obligatoria para empleados, asociación de cada aceptación con su versión e historial consultable.
- Seeder de política idempotente: repetirlo conserva una sola fila por versión y no sobrescribe el texto previamente persistido.
- Marcación pública de entrada y salida con código aleatorio y PIN verificado mediante hash. No se exponen datos personales en la pantalla ni al responder a credenciales incorrectas.
- Limitación de intentos, consulta del estado de aceptación vigente y uso de la hora del servidor en la zona horaria configurada para la marcación.
- Reutilización de la tabla de asistencia existente, con origen registrado para entrada y salida.
- Correcciones de asistencia con motivo obligatorio y registro de valores anteriores/nuevos, actor y fecha.
- Se mantienen los soportes privados obligatorios para los tipos de permiso que los requieren, así como el historial de decisiones de permisos ya existente.

## Migraciones y conservación de datos

Se revisó el SQL con `migrate --pretend` y se aplicaron únicamente estas migraciones incrementales:

- `2026_11_17_183419_create_privacy_policies_table`
- `2026_11_17_183421_add_privacy_policy_id_to_acceptances_table`
- `2026_11_17_183423_add_public_attendance_marking_and_correction_audit`

La verificación de `migrate:status` confirmó las tres migraciones aplicadas. No se ejecutaron `migrate:fresh`, `migrate:refresh`, `db:wipe` ni otros comandos destructivos.

La base activa `legatum` tenía y conserva 1 usuario, 0 empleados, 0 asistencias, 0 solicitudes de permiso y 7 tipos de permiso. También conserva los conteos de aceptaciones y decisiones existentes (0 en la verificación previa y posterior); se creó una política vigente y no se generaron registros de corrección. La ausencia de empleados en esta base impide validar una marcación real con cuentas operativas; el flujo se validó con pruebas automatizadas.

`PrivacyPolicySeeder` se ejecutó dos veces. La tabla quedó con una sola política de la versión configurada.

## Verificación ejecutada

| Comprobación | Resultado |
|---|---|
| Suite completa, Herd PHP 8.5.0 (`vendor/bin/phpunit`) | 133 pruebas aprobadas; 0 fallidas; 1583 aserciones |
| Build de producción (`npm run build`) | Aprobado; Vite transformó 2686 módulos |
| Pint sobre los archivos PHP afectados | Aprobado. `--dirty` no está disponible porque el workspace no es un repositorio Git |
| `composer audit` | Sin avisos |
| `npm audit --omit=dev` | 0 vulnerabilidades en dependencias de producción |
| `npm audit` completo | 8 avisos HIGH vinculados a `picomatch` en dependencias de desarrollo/build; no hay versión corregida publicada y `--force` propone un downgrade incompatible de Vite |

El intento de ejecutar Pint con `--dirty` no alteró archivos; se aplicó Pint directamente a los archivos PHP afectados. Después se volvió a ejecutar la suite completa, que aprobó.

## Verificación funcional específica (2026-11-17)

Las pruebas se ejecutaron con la configuración de [phpunit.xml](./phpunit.xml): `DB_CONNECTION=sqlite` y `DB_DATABASE=:memory:`. Los adjuntos usaron `Storage::fake` en discos local y público. Por tanto, las solicitudes, aceptaciones, asistencias y archivos de prueba no se escribieron en la base operativa ni en almacenamiento persistente.

| Área | Pruebas ejecutadas | Resultado |
|---|---|---|
| Tratamiento de datos | `PrivacyPolicyConsentTest.php` | 4 aprobadas; 64 aserciones |
| Soportes de permisos | `LeaveRequestManagementTest.php` | 12 aprobadas; 102 aserciones |
| Marcación pública | `PublicAttendanceTest.php` | 8 aprobadas; 98 aserciones |
| Módulo de asistencia | `AttendanceManagementTest.php` | 5 aprobadas; 41 aserciones |
| Suite dirigida | Los cuatro archivos anteriores | 29 aprobadas; 0 fallidas; 305 aserciones |
| Suite completa final | Todos los tests | 133 aprobadas; 0 fallidas; 1583 aserciones |

Comprobaciones cubiertas:

- **Datos personales:** empleado sin aceptación es redirigido desde solicitudes, consulta de asistencia y marcación autenticada; puede consultar y aceptar la política; la fila registra usuario, versión, texto y hora exacta congelada en el test. Una versión nueva exige otra aceptación y conserva intacta la anterior, incluido su timestamp. Las rutas directas protegidas también rechazan la operación.
- **Soportes:** PDF permitido se guarda en `storage/app/private` mediante el disco `local`, no aparece en el disco público, y se descarga por el endpoint protegido. El dueño, Talento Humano y un jefe del mismo departamento acceden; otro empleado recibe 404. La ausencia de soporte obligatorio, una extensión `.exe` (incluso con contenido PDF) y un archivo mayor de 10 MB se rechazan. También se probó que una solicitud sin soporte no se aprueba ni genera una decisión de aprobación.
- **Marcación:** `/marcacion` responde sin sesión y no incluye props de empleado; empleados y dashboard redirigen al login si se intentan abrir sin autenticación. Se registraron entrada y salida con hora congelada en `America/Bogota`, ignorando fecha/hora manipuladas por el cliente, y las marcas aparecen en `attendance.index`. Se rechazaron PIN incorrecto, salida sin entrada y entrada duplicada; el sexto intento superó el límite y devolvió 429.
- **Conservación:** antes y después se consultó `legatum` y se compararon conteos y fingerprints SHA-256 de las filas ordenadas en `users`, `employees`, `attendances`, `leave_requests`, aceptaciones, decisiones, tipos de permiso, políticas y correcciones. Todos los conteos y fingerprints fueron idénticos: 1 usuario, 0 empleados/asistencias/solicitudes/aceptaciones/decisiones/correcciones, 7 tipos de permiso y 1 política. Los fixtures y soportes fueron descartables y aislados al entorno de pruebas.

En una ejecución inicial, la aserción de `getVisibility()` sobre el disco falso devolvió `public` y falló. Esa propiedad del adaptador local no comprobaba si el archivo se publicaba por HTTP; se sustituyó por verificaciones del root privado, ausencia en el disco público y descarga mediante la ruta autorizada. La ejecución final descrita arriba pasó.

## Seguridad y limitaciones pendientes

- La política configurada sigue siendo un borrador: asesoría jurídica debe aprobar el texto, los datos del responsable y el canal de contacto antes de habilitar a empleados.
- La organización debe definir retención y eliminación de soportes de permisos y registros de asistencia.
- La revisión automatizada de seguridad de código no pudo completarse: el agente especializado falló al iniciar porque no había un endpoint de modelo disponible. No se ha hecho una revisión manual sustitutiva ni se declara que el código esté libre de vulnerabilidades.
- El aviso de `picomatch` corresponde a la cadena de herramientas de desarrollo/build. La auditoría de producción no reporta vulnerabilidades. Se comprobó que no hay una versión posterior corregida publicada y que el arreglo forzado propone Vite 6, incompatible con los plugins instalados que requieren Vite 8. Por decisión del usuario se conserva Vite 8 y se difiere la corrección hasta que exista una actualización compatible.
- La aceptación por Talento Humano/Gerencia, las comprobaciones manuales con datos anonimizados y las pruebas de rendimiento con volumen representativo siguen pendientes.
- La aplicación no se desplegó. La preparación de infraestructura, secretos, HTTPS, respaldos y restauración debe completarse en el entorno de hosting siguiendo la guía existente.
