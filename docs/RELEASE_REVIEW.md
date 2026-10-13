# Apertura de la comunidad real

Revisión documental del 13 de octubre de 2026. Última publicación de preapertura a las 21:00:31.157 UTC, hashes verificados a las 21:01:08.876 UTC: piloto con dos cuentas y medios desactivados, Hosting `8b7af81c3a8152e1`. El preflight remoto confirma 30 índices READY y reglas coincidentes; [recibos históricos, validación actual y evidencias pendientes](RELEASE_2026-10-13.md). Este documento define controles, no un acta de aprobación.

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

Reglas e índices: el preflight de sólo lectura del 13 de octubre a las 20:58:32.964 UTC realizó diez GET con HTTP 200 en el proyecto/base nombrados. Confirma reglas idénticas, 30 índices READY con definiciones coincidentes y cero overrides efectivos; también dominio Auth, Google habilitado y administrador existente verificado. Mantener el destino, releer cualquier cambio nuevo y ejecutar los permisos cruzados con dos cuentas reales. Un resultado de emuladores no acredita por sí solo el estado remoto ni el recorrido completo.

Migración: el inventario previo al piloto no encontró cambios necesarios. La copia leída el 13 de octubre a las 20:13:59.432468 UTC se revisó sin aplicar migraciones: seis documentos dentro del alcance revisados, sin cambios ni bloqueos. Esa copia es anterior a las nuevas invitaciones y al encuentro técnico de esta sesión. Si aparece legado, convertir las fechas antiguas conservando su instante y añadir prefijos de búsqueda y la lista canónica de participantes. Las consultas no deben mezclar cadenas ISO y Timestamps de Firestore antes de abrir la comunidad. Preparar y revisar un inventario en modo de sólo lectura antes de aplicar cambios.

Operación: la cuenta y el acceso administrativo ya se comprobaron; cerrar atención y recuperación sin inferirlos de ese acceso. El responsable eligió «Powered by Rommer Volcanes» como firma visible; el texto legal compilado aún no se modificó. Debe revisar y aceptar la [propuesta concreta de apertura](PUBLIC_OPENING_REVIEW.md) y la [operación y conservación](OPERATING_POLICY.md), y comprobar recepción/respuesta del canal. Esas confirmaciones no se han recibido. La exportación y supresión se tramitan mediante el procedimiento de derechos; una solicitud pendiente no equivale a una supresión realizada.

La recuperación del 13 de octubre restauró y verificó siete documentos en un emulador vacío; no restauró producción, Auth o archivos. La prueba de baja usa APIs reales de Auth Emulator y Firestore Emulator con cuentas sintéticas y comprueba una gracia de 65 minutos avanzando sólo el reloj del ensayo. No se borraron las cuentas reales. La revisión local actual supera 307 pruebas unitarias y TypeScript; la suite completa previa supera 77 casos de seguridad emulada. La CI de 369 casos corresponde al commit anterior `1ae10e3`; la revisión actual aún requiere su propia ejecución. Estas pruebas no sustituyen la revisión del responsable ni la evidencia cloud entre cuentas.

Después de verificar el acta, ejecutar `pnpm check:release`, compilar con modo de prueba desactivado y confirmar el estado `open` de `communityConfiguration/runtime` mediante el procedimiento de [FIREBASE_HOSTING.md](FIREBASE_HOSTING.md). Las reglas e índices de la revisión del 13 de octubre ya se aplicaron y verificaron con autorización del propietario. El último Hosting de las 21:00:31.157 UTC, versión `8b7af81c3a8152e1`, continúa en piloto; no abrió el registro. El script de transición rechaza la ausencia de acta con `real-release-required` y no reintenta ni cambia el runtime en ese caso. No debe abrirse mediante un código cliente alternativo.

Fotos y vídeos continúan cerrados hasta patrocinio. El núcleo de coordinación y publicaciones de texto puede abrirse sin ellos cuando el resto de controles esté completo. La carga futura necesita cuotas y un servicio autorizado que valide los archivos; no basta con cambiar una variable de Vite.

## Ensayo privado previo a la apertura

La entrega de activación del 8 de octubre incorpora un [piloto privado](PILOT.md) de una a cinco cuentas Google verificadas, seleccionadas por UID tras comprobar su identidad en Auth. La compilación piloto exige `VITE_ENABLE_PILOT=true`, apertura pública, demo y medios desactivados. Las reglas restringen contenido y participación a las cuentas incluidas; no se genera un acta de apertura para realizar este ensayo. El responsable debe completar personalmente su perfil y aceptar las condiciones.

El piloto permite reunir evidencia del recorrido entre cuentas reales. Hay un encuentro privado para prueba técnica del 14 de octubre a las 18:00 de Madrid, sin presentarlo como partido real; todavía no se acredita la conexión, chat o admisión/revocación entre las dos cuentas cloud. El reintento físico de QR/Safari está pendiente. No se marca automáticamente `twoAccounts`, soporte, revisión legal ni derechos como comprobados. Pasar del piloto al acceso público conserva todos los controles de este documento; una compilación abierta rechaza la bandera de piloto.

## Historial de configuración del 7 de octubre

En la configuración inicial del 7 de octubre, la identificación/contacto declarados se incorporaron, se recuperó el acceso a Firebase y se verificaron la primera versión de reglas, 18 índices y dominios. El [registro del 7 de octubre](RELEASE_2026-10-07.md) es histórico: la activación posterior dejó 26 índices y runtime `pilot`; no usar aquel snapshot como estado actual.

El destino elegido y publicado es `lacantera.web.app`, con el target `cantera` limitado al sitio `lacantera`. `pnpm build:hosting` utiliza los mismos datos de Vite y las mismas comprobaciones de apertura, y declara Firebase como alojamiento en la ficha de proveedores. Consulta [FIREBASE_HOSTING.md](FIREBASE_HOSTING.md) para publicación y prueba previa. No se ha retirado la web anterior ni se ha abierto automáticamente el registro. La entrega vigente es el piloto actualizado del 13 de octubre; las cifras y permisos del 7/8 de octubre de este historial no son el inventario actual.

Los scripts con Firebase CLI respetan la cuenta elegida para esta carpeta. Tras iniciar sesión con la cuenta propietaria mediante `pnpm exec firebase login:add`, seleccionar esa cuenta con `pnpm exec firebase login:use CORREO_DE_LA_CUENTA` si no es ya la cuenta activa. No entregar códigos, claves ni tokens en el chat. Comprobar permisos antes de ejecutar cualquier cambio.

El dominio Auth se prepara conservando los dominios actuales:

```sh
node scripts/prepare-auth-domain.cjs --domain cantera-tau.vercel.app --dry-run
```

Sólo tras revisar el resultado y autorizar el cambio, `--apply` añade ese dominio y vuelve a consultar la lista. No habilita proveedores, no crea cuentas, no concede administración y no modifica facturación. La API no admite precondición sobre la lista; evitar cambios simultáneos desde la consola al aplicar.

La limpieza física de likes/comentarios retirados tiene una alternativa manual con simulación por defecto y sin Functions. Las reglas desplegadas del piloto cierran la lectura de interacciones huérfanas a terceros, manteniendo acceso y retirada propios. El procedimiento está en [ACCOUNT_RIGHTS.md](ACCOUNT_RIGHTS.md).


La [entrega por fases del 8 de octubre](RELEASE_2026-10-08.md) incluye una fase inicial anterior a la activación. La última entrega comprobada del día publicó reglas de invitaciones/eventos privados/chat, 26 índices READY y Hosting piloto. El acceso administrativo y dos perfiles reales están comprobados. Tener esos perfiles no marca `twoAccounts`, soporte, derechos o revisión legal como completados. La revisión del 13 de octubre actualizó backend y Hosting, con 30 índices READY; consultar el [recibo exacto](RELEASE_2026-10-13.md) antes de registrar una aprobación.

## Registro público que se prepara

La apertura solicitada admite cualquier cuenta Google elegible, con mayoría de edad autodeclarada y perfil/condiciones completados personalmente. Deja de limitarse a la lista de UIDs del piloto, pero no concede verificación o permisos administrativos por registrarse. El núcleo se ofrece gratis: coordinación, texto/logros y chat entre contactos; fotos/reels y los demás servicios fuera del alcance siguen cerrados.

Para realizar la transición deben coincidir una build pública comprobada (`VITE_SERVICE_OPEN=true`, piloto/demo/medios desactivados), el acta real vigente y runtime `open`. En el piloto actual las consultas anónimas de contenido siguen denegadas; publicar otra build o actualizar documentación no abre por sí solo el backend. Registrar la versión exacta, la relectura de reglas/índices/runtime, dominios y pruebas de acceso del servicio final. No marcar identidad, soporte, Safari, recorrido entre dos cuentas o derechos como superados sin su evidencia real.
