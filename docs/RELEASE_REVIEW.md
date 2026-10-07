# Apertura de la comunidad real

La compilación de una versión de preparación está permitida. `VITE_SERVICE_OPEN` se mantiene en `false` y la configuración del servidor falla cerrada si falta. No activa Firebase, una cuenta administradora ni la facturación.

Antes de una compilación con `VITE_SERVICE_OPEN=true`, el responsable debe aportar sus datos legales y un acta `docs/release-approved.json` de revisión real, con una antigüedad máxima de siete días. No se genera un acta de aprobación durante el desarrollo ni se deben marcar controles por el hecho de que pasen los emuladores.

Formato del acta (estos valores son pendientes, no aprobaciones):

```json
{
  "approvedBy": "",
  "approvedAt": "",
  "projectId": "gen-lang-client-0853130215",
  "databaseId": "ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb",
  "checks": {
    "rulesAndIndexes": false,
    "migration": false,
    "twoAccounts": false,
    "admin": false,
    "authDomain": false,
    "backupRestore": false,
    "support": false,
    "legalAndPrivacy": false,
    "accountRights": false
  }
}
```

Reglas e índices: comprobar el proyecto y la base nombrada; revisar el despliegue y ejecutar las pruebas de permisos con dos cuentas reales. Los controles de emuladores no acreditan el estado remoto.

Migración: convertir las fechas antiguas conservando su instante, añadir prefijos de búsqueda y la lista canónica de participantes. Las consultas no deben mezclar cadenas ISO y Timestamps de Firestore antes de abrir la comunidad. Preparar y revisar un inventario en modo de sólo lectura antes de aplicar cambios.

Operación: documentar la cuenta administradora, la asistencia y la recuperación de datos. La exportación y supresión se tramitan mediante el procedimiento de derechos; una solicitud pendiente no equivale a una supresión realizada. Probar el procedimiento con datos de ensayo antes del lanzamiento.

Después de verificar el acta, ejecutar `pnpm check:release`, compilar con modo de prueba desactivado y confirmar el estado `open` de `communityConfiguration/runtime` desde una cuenta administradora. El propietario autorizó el cambio concreto de reglas e índices el 7 de octubre y ya se aplicó y verificó. No debe abrirse mediante un código cliente alternativo.

Fotos y vídeos continúan cerrados hasta patrocinio. El núcleo de coordinación y publicaciones de texto puede abrirse sin ellos cuando el resto de controles esté completo. La carga futura necesita cuotas y un servicio autorizado que valide los archivos; no basta con cambiar una variable de Vite.

## Configuración preparada el 7 de octubre

La identificación y el contacto declarados por el propietario están incorporados en la publicación. El acceso a Firebase se recuperó mediante el propietario y se aplicaron y verificaron las reglas, los 18 índices y los dominios. Consulta las comprobaciones y los pasos que siguen pendientes en [RELEASE_2026-10-07.md](RELEASE_2026-10-07.md).

El destino elegido y publicado es `lacantera.web.app`, con el target `cantera` limitado al sitio `lacantera`. `pnpm build:hosting` utiliza los mismos datos de Vite y las mismas comprobaciones de apertura, y declara Firebase como alojamiento en la ficha de proveedores. Consulta [FIREBASE_HOSTING.md](FIREBASE_HOSTING.md) para publicación y prueba previa. No se ha retirado la web anterior ni se ha abierto automáticamente el registro.

Los scripts con Firebase CLI respetan la cuenta elegida para esta carpeta. Tras iniciar sesión con la cuenta propietaria mediante `pnpm exec firebase login:add`, seleccionar esa cuenta con `pnpm exec firebase login:use CORREO_DE_LA_CUENTA` si no es ya la cuenta activa. No entregar códigos, claves ni tokens en el chat. Comprobar permisos antes de ejecutar cualquier cambio.

El dominio Auth se prepara conservando los dominios actuales:

```sh
node scripts/prepare-auth-domain.cjs --domain cantera-tau.vercel.app --dry-run
```

Sólo tras revisar el resultado y autorizar el cambio, `--apply` añade ese dominio y vuelve a consultar la lista. No habilita proveedores, no crea cuentas, no concede administración y no modifica facturación. La API no admite precondición sobre la lista; evitar cambios simultáneos desde la consola al aplicar.

La limpieza física de likes/comentarios retirados tiene una alternativa manual con simulación por defecto y sin Functions. Las reglas preparadas cierran la lectura de interacciones huérfanas a terceros, manteniendo acceso y retirada propios. El procedimiento está en [ACCOUNT_RIGHTS.md](ACCOUNT_RIGHTS.md).
