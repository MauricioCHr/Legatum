# Guía de despliegue de LEGATUM

## Requisitos

- PHP 8.5 recomendado y probado; `composer.json` declara PHP `^8.3`.
- Composer 2 y Node.js/npm compatibles con las versiones fijadas en `package-lock.json`.
- MySQL/MariaDB para producción, con `pdo_mysql`; configurar una base de datos y un usuario con permisos limitados a esa base.
- Extensiones PHP requeridas por Laravel y DOMPDF, incluyendo OpenSSL, PDO, Mbstring, Tokenizer, XML, Ctype, Fileinfo y GD.
- Servidor web con la raíz del sitio apuntando exclusivamente a `public/`.
- Espacio privado persistente para `storage/`, en especial `storage/app/private` donde se guardan soportes de permisos.

## Configuración de producción

Crear el archivo de entorno fuera del control de versiones y definir como mínimo:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://dominio-de-la-organizacion
APP_KEY=

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=legatum
DB_USERNAME=legatum_app
DB_PASSWORD=

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local
LOG_LEVEL=warning

LEGATUM_ADMIN_NAME=
LEGATUM_ADMIN_EMAIL=
LEGATUM_ADMIN_PASSWORD=
LEGATUM_PRIVACY_POLICY_VERSION=1.0
```

Usar HTTPS, credenciales únicas y seguras, y un `APP_KEY` generado una sola vez. No regenerar una clave en una instalación existente: invalidaría datos cifrados y sesiones. No guardar `.env`, contraseñas ni claves en el repositorio o en imágenes públicas.

En una instalación nueva, generar `APP_KEY` una vez con `php artisan key:generate --force` después de crear el archivo `.env`. En una actualización, conservar la clave actual.

Antes de habilitar usuarios, reemplazar el texto borrador de `config/privacy.php` por la política aprobada por asesoría jurídica, definir el canal para ejercer derechos y confirmar las reglas de retención. La versión se configura con `LEGATUM_PRIVACY_POLICY_VERSION`; al cambiarla, cada empleado debe aceptar nuevamente. El texto y la versión deben quedar respaldados junto con la configuración del despliegue.

Los seeders requieren `LEGATUM_ADMIN_NAME`, `LEGATUM_ADMIN_EMAIL` y `LEGATUM_ADMIN_PASSWORD` para crear el administrador inicial. El seeder no cambia la contraseña ni el rol de una cuenta existente. Si el correo ya pertenece a otro rol, el seeder se detiene explícitamente; resolver esa identidad mediante un proceso administrativo autorizado, no cambiando el rol automáticamente.

## Instalación o actualización

1. Hacer copia de seguridad consistente de la base de datos y de `storage/app/private`; verificar que se puedan restaurar.
2. Desplegar el código y configurar las variables de entorno en el gestor de secretos del hosting.
3. Instalar dependencias y compilar los recursos:

   ```sh
   composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
   npm ci
   npm run build
   ```

4. Confirmar la conexión, el entorno y las migraciones pendientes:

   ```sh
   php artisan about
   php artisan migrate:status
   ```

5. Revisar cualquier migración nueva y aplicarla de forma incremental:

   ```sh
   php artisan migrate --force
   ```

   No usar `migrate:fresh`, `migrate:refresh`, `db:wipe` ni eliminar tablas o registros para desplegar. Las migraciones deben conservar la información preexistente. Si se requiere crear la cuenta inicial o cargar catálogos, ejecutar `php artisan db:seed --force` solo después de comprobar las variables requeridas y revisar el cambio previsto.

   Los PDFs históricos que no tengan rol de generación registrado quedan fuera del historial descargable, porque no es posible verificar con seguridad su contenido según el rol. Generarlos nuevamente desde el sistema crea un archivo con la autorización de rol actual; los registros históricos no se eliminan.

6. Optimizar la aplicación y validar salud:

   ```sh
   php artisan optimize
   php artisan route:list
   ```

   Comprobar el acceso HTTPS, inicio de sesión por rol, aceptación de privacidad, lectura de los cuatro reportes, generación/descarga PDF y carga/descarga autorizada de soportes.

## Archivos, colas y respaldos

- Los soportes se almacenan en el disco `local`, bajo `storage/app/private`, y se descargan mediante rutas autenticadas/autorizadas. No crear un enlace público a esa carpeta ni mover los soportes a `public/`.
- El disco privado y la base de datos deben ser persistentes y respaldarse con controles de acceso y cifrado adecuados. Probar restauraciones periódicamente y aplicar la política organizacional de retención.
- La configuración predeterminada usa sesiones, caché y colas en base de datos. Ejecutar un worker supervisado si se agregan trabajos en cola; para más de una instancia, utilizar almacenamiento compartido o servicios administrados compatibles y configurar sus secretos en el entorno.
- Configurar límites del proxy/servidor acordes con el límite de carga de 10 MB de la aplicación y mantener registros fuera del directorio público.

## Verificación previa a liberar tráfico

- Revisar `composer audit` y `npm audit` según la política de dependencias de la organización.
- Ejecutar la suite de pruebas automatizadas y `npm run build` en el mismo commit que se despliega.
- Confirmar que `APP_DEBUG=false`, que no hay secretos en logs y que el certificado HTTPS es válido.
- Revisar `storage/` y `bootstrap/cache/`: el proceso de aplicación necesita escritura; el resto del código debe permanecer de solo lectura cuando el hosting lo permita.
- Mantener un plan de reversión del código y restauración probada de base de datos/archivos. No revertir una migración eliminando datos: preparar una migración compensatoria si fuera necesaria.

En la auditoría ejecutada, `composer audit` y `npm audit --omit=dev` no reportaron vulnerabilidades. El árbol completo de npm sí reporta avisos HIGH de `picomatch` en herramientas de build; el registro consultado no ofrece una versión corregida y `npm audit fix --force` propone degradar Vite a una versión mayor anterior. Por eso esas herramientas están clasificadas como dependencias de desarrollo y la compilación debe ejecutarse en un entorno de CI controlado; no aplicar una degradación forzada sin validar compatibilidad. Repetir la auditoría y actualizar cuando el proveedor publique una corrección.
