# Apertura de la comunidad real

Revisión documental del 13 de octubre de 2026. Última publicación verificada: piloto del 8 de octubre; [estado consolidado y evidencias pendientes](RELEASE_2026-10-13.md). Este documento define controles, no un acta de aprobación.

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

Reglas e índices: las reglas del piloto y 26 índices READY se comprobaron el 8 de octubre en el proyecto/base nombrados. Mantener el destino, releer cualquier cambio nuevo y ejecutar los permisos cruzados con dos cuentas reales. Un resultado de emuladores no acredita por sí solo el estado remoto ni el recorrido completo.

Migración: el inventario previo al piloto no encontró cambios necesarios. Si aparece legado, convertir las fechas antiguas conservando su instante y añadir prefijos de búsqueda y la lista canónica de participantes. Las consultas no deben mezclar cadenas ISO y Timestamps de Firestore antes de abrir la comunidad. Preparar y revisar un inventario en modo de sólo lectura antes de aplicar cambios.

Operación: documentar la cuenta administradora, la asistencia y la recuperación de datos. La exportación y supresión se tramitan mediante el procedimiento de derechos; una solicitud pendiente no equivale a una supresión realizada. Probar el procedimiento con datos de ensayo antes del lanzamiento.

Después de verificar el acta, ejecutar `pnpm check:release`, compilar con modo de prueba desactivado y confirmar el estado `open` de `communityConfiguration/runtime` desde una cuenta administradora. Las reglas e índices de la activación del piloto del 8 de octubre ya se aplicaron y verificaron con autorización del propietario. No debe abrirse mediante un código cliente alternativo.

Fotos y vídeos continúan cerrados hasta patrocinio. El núcleo de coordinación y publicaciones de texto puede abrirse sin ellos cuando el resto de controles esté completo. La carga futura necesita cuotas y un servicio autorizado que valide los archivos; no basta con cambiar una variable de Vite.

## Ensayo privado previo a la apertura

La entrega de activación del 8 de octubre incorpora un [piloto privado](PILOT.md) de una a cinco cuentas Google verificadas, seleccionadas por UID tras comprobar su identidad en Auth. La compilación piloto exige `VITE_ENABLE_PILOT=true`, apertura pública, demo y medios desactivados. Las reglas restringen contenido y participación a las cuentas incluidas; no se genera un acta de apertura para realizar este ensayo. El responsable debe completar personalmente su perfil y aceptar las condiciones.

El piloto permite reunir evidencia del recorrido entre cuentas reales. No marca automáticamente `twoAccounts`, soporte, revisión legal ni derechos como comprobados. Pasar del piloto al acceso público conserva todos los controles de este documento; una compilación abierta rechaza la bandera de piloto.

## Historial de configuración del 7 de octubre

En la configuración inicial del 7 de octubre, la identificación/contacto declarados se incorporaron, se recuperó el acceso a Firebase y se verificaron la primera versión de reglas, 18 índices y dominios. El [registro del 7 de octubre](RELEASE_2026-10-07.md) es histórico: la activación posterior dejó 26 índices y runtime `pilot`; no usar aquel snapshot como estado actual.

El destino elegido y publicado es `lacantera.web.app`, con el target `cantera` limitado al sitio `lacantera`. `pnpm build:hosting` utiliza los mismos datos de Vite y las mismas comprobaciones de apertura, y declara Firebase como alojamiento en la ficha de proveedores. Consulta [FIREBASE_HOSTING.md](FIREBASE_HOSTING.md) para publicación y prueba previa. No se ha retirado la web anterior ni se ha abierto automáticamente el registro.

Los scripts con Firebase CLI respetan la cuenta elegida para esta carpeta. Tras iniciar sesión con la cuenta propietaria mediante `pnpm exec firebase login:add`, seleccionar esa cuenta con `pnpm exec firebase login:use CORREO_DE_LA_CUENTA` si no es ya la cuenta activa. No entregar códigos, claves ni tokens en el chat. Comprobar permisos antes de ejecutar cualquier cambio.

El dominio Auth se prepara conservando los dominios actuales:

```sh
node scripts/prepare-auth-domain.cjs --domain cantera-tau.vercel.app --dry-run
```

Sólo tras revisar el resultado y autorizar el cambio, `--apply` añade ese dominio y vuelve a consultar la lista. No habilita proveedores, no crea cuentas, no concede administración y no modifica facturación. La API no admite precondición sobre la lista; evitar cambios simultáneos desde la consola al aplicar.

La limpieza física de likes/comentarios retirados tiene una alternativa manual con simulación por defecto y sin Functions. Las reglas desplegadas del piloto cierran la lectura de interacciones huérfanas a terceros, manteniendo acceso y retirada propios. El procedimiento está en [ACCOUNT_RIGHTS.md](ACCOUNT_RIGHTS.md).


La [entrega por fases del 8 de octubre](RELEASE_2026-10-08.md) incluye una fase inicial anterior a la activación. La última entrega comprobada del día publicó reglas de invitaciones/eventos privados/chat, 26 índices READY y Hosting piloto. El acceso administrativo y dos perfiles reales están comprobados. Tener esos perfiles no marca `twoAccounts`, soporte, derechos o revisión legal como completados; consultar el estado consolidado antes de registrar una aprobación.
