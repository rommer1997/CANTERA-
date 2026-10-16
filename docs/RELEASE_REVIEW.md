# Apertura de la comunidad real

Revisión documental del 13 de octubre de 2026. **Núcleo gratuito abierto** en https://lacantera.web.app: Hosting público `49c3eff8612cbd95`, publicado a las 21:41:08.090 UTC y hashes verificados a las 21:42:27.497 UTC. Runtime `open`, lista de piloto retirada y medios desactivados; acceso público/privado comprobado por HTTP a las 21:46:26.051 UTC. [Recibos y límites detallados](RELEASE_2026-10-13.md). Este documento conserva los controles; el acta real está en `release-approved.json`.

Las compilaciones de preparación pueden usar `VITE_SERVICE_OPEN=false`; la versión pública comprobada usa `true`, con piloto/demo/medios desactivados. La configuración de servidor falla cerrada si falta. Compilar por sí solo no activa cuentas administradoras ni facturación.

Antes de una compilación con `VITE_SERVICE_OPEN=true`, el responsable debe aportar sus datos legales y un acta `docs/release-approved.json` de revisión real, con una antigüedad máxima de siete días. No se genera un acta de aprobación durante el desarrollo ni se deben marcar controles por el hecho de que pasen los emuladores.

Formato de referencia del acta (ejemplo vacío, no sustituye el acta real de las 21:36:34.538 UTC):

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

Operación: la cuenta y el acceso administrativo ya se comprobaron. El responsable eligió «Powered by Rommer Volcanes» como firma visible y aceptó la identificación publicable como Rommer Volcanes, persona física en España, con rommer@garitocastizo.com como contacto. Ante la revisión concreta de identificación, privacidad, recepción/atención del correo y operación manual con copias cifradas respondió «Revisado y aceptado; correo probado». La [revisión de apertura](PUBLIC_OPENING_REVIEW.md) y la [operación y conservación](OPERATING_POLICY.md) registran esa aceptación, sin afirmar cifrado ejecutado o auditoría técnica del buzón. La actualización de privacidad está incluida en la publicación pública comprobada, con términos del 8 de octubre conservados. La exportación y supresión se tramitan mediante el procedimiento de derechos; una solicitud pendiente no equivale a una supresión realizada.

La recuperación del 13 de octubre restauró y verificó siete documentos en un emulador vacío; no restauró producción, Auth o archivos. La prueba de baja usa APIs reales de Auth Emulator y Firestore Emulator con cuentas sintéticas y comprueba una gracia de 65 minutos avanzando sólo el reloj del ensayo. No se borraron las cuentas reales. La revisión local supera 307 pruebas unitarias y TypeScript; la suite completa previa supera 77 casos de seguridad emulada. El commit `d84ad11d5695dd070635a8be37a68e574f13c219` tiene [CI real con 400 pruebas aprobadas](https://github.com/rommer1997/CANTERA-/actions/runs/38467876358): 307 unitarias, 77 de seguridad y 16 de limpieza con Node 22, ambos jobs con `success`. La CI de 369 casos queda como referencia histórica de `1ae10e3`. No extender el resultado de `d84ad11` a commits posteriores. Estas pruebas no sustituyen la revisión del responsable ni el recorrido cloud completo entre cuentas.

Después de verificar el acta, ejecutar `pnpm check:release`, compilar con modo de prueba desactivado y confirmar el estado `open` de `communityConfiguration/runtime` mediante el procedimiento de [FIREBASE_HOSTING.md](FIREBASE_HOSTING.md). Esta transición ya se ejecutó: Hosting `49c3eff8612cbd95`, runtime `open` verificado y lista de dos cuentas piloto retirada. Las reglas e índices de la revisión del 13 de octubre ya se aplicaron y verificaron con autorización del propietario. El script de transición rechaza la ausencia de acta con `real-release-required` y no reintenta ni cambia el runtime en ese caso. No debe abrirse mediante un código cliente alternativo.

Fotos y vídeos continúan cerrados hasta patrocinio. El núcleo de coordinación y publicaciones de texto se abrió sin ellos tras sus controles. La carga futura necesita cuotas y un servicio autorizado que valide los archivos; no basta con cambiar una variable de Vite.

## Ensayo privado previo a la apertura

La entrega de activación del 8 de octubre incorpora un [piloto privado](PILOT.md) de una a cinco cuentas Google verificadas, seleccionadas por UID tras comprobar su identidad en Auth. La compilación piloto exige `VITE_ENABLE_PILOT=true`, apertura pública, demo y medios desactivados. Las reglas restringen contenido y participación a las cuentas incluidas; no se genera un acta de apertura para realizar este ensayo. El responsable debe completar personalmente su perfil y aceptar las condiciones.

El piloto permite reunir evidencia del recorrido entre cuentas reales. Hay un encuentro privado para prueba técnica del 14 de octubre a las 18:00 de Madrid, sin presentarlo como partido real. La relectura del 13 de octubre a las 21:13:20.038 UTC confirma visibilidad privada y un participante: el UID de la segunda cuenta Gmail verificada del piloto. La conexión se comprobó por separado a las 21:20:51.310 UTC: invitación consumida por la otra cuenta y dos registros recíprocos válidos, con fechas de servidor. En el chat real se vio el envío a las 23:21 de Madrid y la respuesta del contacto a las 23:24. El responsable confirmó instalación/acceso en Safari y, al salir del encuentro privado y reabrirlo, informó «no podemos cargar este encuentro». La relectura de las 21:34:24.024 UTC confirma encuentro privado existente, cero participantes y segunda cuenta fuera del mapa/lista. El comprobante de admisión se conserva, sin conceder lectura por sí solo según las reglas desplegadas. El control de retirada queda comprobado, sin afirmar borrado físico de ese registro. No se convierte una aceptación de operación en evidencia de cifrado. Pasar del piloto al acceso público conserva todos los controles de este documento; una compilación abierta rechaza la bandera de piloto.

## Historial de configuración del 7 de octubre

En la configuración inicial del 7 de octubre, la identificación/contacto declarados se incorporaron, se recuperó el acceso a Firebase y se verificaron la primera versión de reglas, 18 índices y dominios. El [registro del 7 de octubre](RELEASE_2026-10-07.md) es histórico: la activación posterior dejó 26 índices y runtime `pilot`; no usar aquel snapshot como estado actual.

El destino elegido y publicado es `lacantera.web.app`, con el target `cantera` limitado al sitio `lacantera`. `pnpm build:hosting` utiliza los mismos datos de Vite y las mismas comprobaciones de apertura, y declara Firebase como alojamiento en la ficha de proveedores. Consulta [FIREBASE_HOSTING.md](FIREBASE_HOSTING.md) para publicación y prueba previa. El registro no se abrió por configurar el dominio: la transición pública posterior del 13 de octubre tiene acta, Hosting/runtime y permisos comprobados por separado. Las cifras y permisos del 7/8 de octubre de este historial no son el inventario actual.

Los scripts con Firebase CLI respetan la cuenta elegida para esta carpeta. Tras iniciar sesión con la cuenta propietaria mediante `pnpm exec firebase login:add`, seleccionar esa cuenta con `pnpm exec firebase login:use CORREO_DE_LA_CUENTA` si no es ya la cuenta activa. No entregar códigos, claves ni tokens en el chat. Comprobar permisos antes de ejecutar cualquier cambio.

El dominio Auth se prepara conservando los dominios actuales:

```sh
node scripts/prepare-auth-domain.cjs --domain cantera-tau.vercel.app --dry-run
```

Sólo tras revisar el resultado y autorizar el cambio, `--apply` añade ese dominio y vuelve a consultar la lista. No habilita proveedores, no crea cuentas, no concede administración y no modifica facturación. La API no admite precondición sobre la lista; evitar cambios simultáneos desde la consola al aplicar.

La limpieza física de likes/comentarios retirados tiene una alternativa manual con simulación por defecto y sin Functions. Las reglas desplegadas del piloto cierran la lectura de interacciones huérfanas a terceros, manteniendo acceso y retirada propios. El procedimiento está en [ACCOUNT_RIGHTS.md](ACCOUNT_RIGHTS.md).


La [entrega por fases del 8 de octubre](RELEASE_2026-10-08.md) incluye una fase inicial anterior a la activación. La última entrega comprobada del día publicó reglas de invitaciones/eventos privados/chat, 26 índices READY y Hosting piloto. El acceso administrativo y dos perfiles reales están comprobados. Tener esos perfiles no marca `twoAccounts`, soporte, derechos o revisión legal como completados. La revisión del 13 de octubre actualizó backend y Hosting, con 30 índices READY; consultar el [recibo exacto](RELEASE_2026-10-13.md) antes de registrar una aprobación.

## Registro público activado

La apertura solicitada admite cualquier cuenta Google elegible, con mayoría de edad autodeclarada y perfil/condiciones completados personalmente. Deja de limitarse a la lista de UIDs del piloto, pero no concede verificación o permisos administrativos por registrarse. El núcleo se ofrece gratis: coordinación, texto/logros y chat entre contactos; fotos/reels y los demás servicios fuera del alcance siguen cerrados.

La transición verificada reúne build pública (`VITE_SERVICE_OPEN=true`, piloto/demo/medios desactivados), acta real vigente y runtime `open`. Las consultas anónimas de perfiles públicos, publicaciones, encuentros públicos y equipos activos devuelven HTTP 200; los accesos anónimos a perfil privado, encuentro privado y conversación devuelven HTTP 403. La comprobación de las 21:46:26.051 UTC confirma medios `false` y lista de piloto ausente. La relectura de las 21:50:36.573 UTC conserva esos estados y sitúa la activación en `updatedAt=2026-10-13T21:44:24.205Z`, con `updateTime=2026-10-13T21:44:24.237061Z`. En la sesión real del responsable se consumió «Actualizar app», desapareció el aviso de preparación, se conservaron dos mensajes y se comprobó privacidad del 13 de octubre con nombre, España y correo correctos. Publicar otra build o actualizar documentación no abre por sí solo el backend; preservar la versión exacta y los recibos para cambios futuros.

La revisión documental `f06eaa0ed6fa0073f90c08a82718efcac2405204` tiene [ejecución 38469379525](https://github.com/rommer1997/CANTERA-/actions/runs/38469379525) y [ejecución 38469373732](https://github.com/rommer1997/CANTERA-/actions/runs/38469373732) con `success`; el resultado de 400 pruebas del código se conserva atribuido al commit `d84ad11` indicado arriba. El código publicado `955ba08ef3f2ca1c2cfd56d35e7254f5b7744040` superó TypeScript, `check:release`, build pública y [CI real de 412 pruebas](https://github.com/rommer1997/CANTERA-/actions/runs/38472750381): 319 unitarias, 77 de seguridad emulada y 16 de limpieza Node 22, sin fallos ni casos omitidos, ambos jobs con `success`. La [CI 38472744451](https://github.com/rommer1997/CANTERA-/actions/runs/38472744451) también finalizó con `success`; no extender esas ejecuciones a commits posteriores. El acta real se registró a las 21:36:34.538 UTC a nombre de Rommer Volcanes, con los nueve controles en el proyecto/base autorizados. La custodia sigue siendo manual: la herramienta local tiene doce casos de ensayo, sin afirmar cifrado de copias reales. Los recibos de publicación/runtime y permisos ya acreditan apertura pública.
