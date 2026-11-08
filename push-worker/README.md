# Notificaciones gratuitas de LaCantera

Worker independiente de Firebase Functions, con Workers Free y D1. La app sigue en Firebase Hosting. No necesita Blaze, tarjeta ni credenciales administrativas de Google. No debe activarse Workers Paid como parte de este despliegue.

## Estado de esta entrega

Servidor desplegado el 8 de noviembre de 2026 en `https://lacantera-push.garitocastizo.workers.dev`, cuenta Cloudflare `1d93ccbf1186b4d835d92df24396a197`, plan Free comprobado en el panel. Base D1 `01055525-2120-4e22-aa12-5d6bf5a0e98e`, migración aplicada, dos secretos VAPID cargados y cron configurado. `/config` devuelve `ready: true`; se comprobaron rechazos 401 sin identidad y 403 desde un origen ajeno. Las reglas e índices de Firestore se han desplegado en la base indicada. La app ya está publicada; **la recepción push no está confirmada**. El endpoint inicial de Workers no respondía desde las redes comprobadas. Tras la autorización explícita de `pages:write`, se desplegó la misma API en `https://lacantera-push.pages.dev`; esta dirección devuelve 200/ready:true desde la conexión afectada, 401 sin sesión y 403 desde origen ajeno. Se prepara el cambio del build a Pages; consultar docs/RELEASE_2026-11-08.md antes de declarar la recepción operativa.

## Activación

Desde la raíz del repositorio, con Node 24 y pnpm:

1. `pnpm --dir push-worker --ignore-workspace install --frozen-lockfile --ignore-scripts`.
2. El responsable completa `wrangler login` y la autorización del navegador. Verificar con `pnpm --dir push-worker --ignore-workspace exec wrangler whoami` la cuenta elegida. Usar `WRANGLER_SEND_METRICS=false` en las llamadas de Wrangler.
3. Comprobar que la cuenta está en Workers Free. Crear únicamente la base `lacantera-push` mediante `wrangler d1 create lacantera-push`; copiar su ID real en `wrangler.jsonc`, sin cambiar los IDs de Firebase.
4. Aplicar `wrangler d1 migrations apply lacantera-push --remote`. Revisar que sólo contiene la nueva base y la migración `0001_push.sql`.
5. Ejecutar `node scripts/prepare-push-keys.mjs`. Conserva las claves existentes en `.audit/push-secrets/vapid.json`, con permisos 0600. **No imprimirlas, subirlas a GitHub ni regenerarlas después de registrar dispositivos.** Custodiar una copia cifrada según la política del operador.
6. Desde `push-worker`, `wrangler secret bulk < ../.audit/push-secrets/vapid.json`. Publicar con `wrangler deploy`. Los comandos aquí abreviados se ejecutan con el Wrangler fijado en este paquete, por ejemplo `pnpm --dir push-worker --ignore-workspace exec wrangler deploy` desde la raíz.
7. Leer `/config` con `Origin: https://lacantera.web.app`: debe devolver `ready: true` y sólo la clave **pública**. No considerar esa comprobación una prueba de entrega push.
8. Desplegar las reglas y el índice nuevos en la base Firestore **ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb** del proyecto **gen-lang-client-0853130215**, comprobar que el índice de `recipientId + createdAt` está listo, y compilar con `VITE_PUSH_API_URL=https://<worker-real>.workers.dev`. Publicar Hosting mediante el procedimiento de lanzamiento existente; no eludir su acta de revisión.
9. Realizar la prueba física descrita debajo antes de declarar los avisos operativos.

No añadir localhost a `ALLOWED_ORIGINS` en producción. Para el desarrollo, usar configuración separada y emuladores `demo-*`; jamás cargar tokens de producción en pruebas.

## Comportamiento y seguridad

- Cada persona activa sus dispositivos mediante un botón; no se solicita permiso automáticamente. Hay preferencias independientes para mensajes e invitaciones/aceptaciones.
- El Worker verifica la firma, emisor, audiencia, caducidad y correo verificado del token Firebase. Comprueba cuenta completa, comunidad abierta/piloto y moderación mediante Firestore REST con el token del propio usuario.
- Las consultas usan máscaras de campos: el Worker no lee el cuerpo del chat. El remitente sólo aporta identificadores; el servidor obtiene destinatario y permiso del registro guardado. Las reglas originales siguen rechazando bloqueos y desconexiones.
- El payload Web Push va cifrado. El aviso visible es genérico y no contiene texto del chat, nombre ni título privado del encuentro. El clic sólo permite rutas internas y comprueba la vinculación local de cuenta.
- Las invitaciones directas son para una cuenta conectada, duran hasta siete días y se pueden rechazar/cancelar. El encuentro debe seguir abierto, no haber empezado y tener plazas al aceptar. El QR existente conserva sus diez minutos y un solo uso.
- Al salir se deshabilita primero la vinculación local, se retira PushManager y se intenta borrar la suscripción del servidor. Un fallo de red puede retrasar esta última retirada; el proveedor invalidado devuelve 410 y el cron la elimina. Un aviso que ya estuviera en tránsito puede aparecer genérico.
- D1 conserva suscripciones hasta treinta días sin renovación. El cliente renueva, como máximo una vez al día al volver a usar la app, sólo dispositivos ya activados. No vuelve a dar de alta una suscripción borrada.
- La cola expira en una hora; registra eventos por dispositivo para evitar duplicados de aplicación, reintenta errores transitorios hasta cinco veces y elimina los payloads al terminar. El cron limpia los registros vencidos cada minuto. No se garantiza una única entrega del sistema operativo.
- Antes de llegar al servidor, el cliente conserva hasta cincuenta referencias durante diez minutos y reintenta al reconectar/reabrir. Si se cierra sin que el servidor reciba el aviso, puede no llegar hasta volver a abrir. El mensaje o invitación original permanece en Firestore.

## Capacidad sin pago

A fecha de revisión, [Workers Free](https://developers.cloudflare.com/workers/platform/pricing/) incluye 100.000 peticiones/día y 10 ms de CPU por invocación. [D1 Free](https://developers.cloudflare.com/d1/platform/pricing/) incluye 5 millones de filas leídas/día, 100.000 escritas/día y 5 GB totales. Las cuotas pertenecen a la cuenta y se comparten con otros proyectos. Firebase conserva sus propios límites de lecturas.

Esta implementación limita cada emisor a 60 eventos/minuto, cada destinatario a 20/minuto y cinco dispositivos por cuenta; procesa lotes de tres. El cron recupera tres entregas por minuto y las solicitudes nuevas también drenan la cola. No es una promesa de capacidad global: medir CPU, profundidad/antigüedad de cola y uso D1 en el Worker real. Si Free no basta, mantener los avisos internos y avisar al responsable; **no cambiar de plan automáticamente**. El build y las pruebas locales no demuestran el presupuesto de CPU de producción.

## Derechos, conservación y retirada operativa

Las peticiones de acceso/baja siguen llegando a Administración y al correo público. El exportador/borrador de Firestore incluye las invitaciones directas recibidas; **D1 requiere además este paso del operador**, antes de marcar completada la solicitud:

1. Verificar identidad y obtener el UID de Firebase, nunca buscar por nombre público. Admitir únicamente UIDs que cumplan `^[A-Za-z0-9_-]{1,128}$`. Seleccionar sólo `lacantera-push` en la cuenta comprobada.
2. Para acceso, consultar de forma privada `subscriptions WHERE uid = '<UID_VERIFICADO>'` y `deliveries WHERE actor_uid = '<UID_VERIFICADO>' OR recipient_uid = '<UID_VERIFICADO>'`. Exportar sólo datos de esa persona; eliminar IDs de terceros. Los endpoints y claves de suscripción son confidenciales: no publicarlos en tickets, terminal compartido ni Git. Guardar con 0600, cifrar y entregar por el canal aprobado.
3. Para baja, tras revisar el alcance, borrar `deliveries WHERE actor_uid = '<UID_VERIFICADO>' OR recipient_uid = '<UID_VERIFICADO>'` y después `subscriptions WHERE uid = '<UID_VERIFICADO>'`. Las claves foráneas borran también las entregas de sus dispositivos. Limpiar `rate_limits` sólo para los prefijos exactos `events:<UID>:`, `recipient:<UID>:` y `register:<UID>:` o esperar su caducidad de dos minutos. Nunca ejecutar un DELETE sin WHERE ni hacer coincidir UIDs parcialmente.
4. Verificar contadores cero para ese UID en ambas tablas. Registrar sólo UID, fecha, resultado y referencia privada, sin endpoints/claves. La retirada D1 no borra mensajes ni eventos de terceros.
5. Las copias/restauraciones D1 siguen la conservación del proveedor; aplicar de nuevo las bajas al restaurar antes de reactivar el servicio. No declarar una purga de backups que no se haya comprobado.

La persona puede retirar todos sus dispositivos con `DELETE /subscriptions` y `{ "all": true }` autenticado; la UI actual retira sólo el dispositivo en uso. No se exponen endpoints de administración ni secretos VAPID al cliente.

## Verificación

- `pnpm lint`, `pnpm test` desde la raíz.
- `pnpm --dir push-worker --ignore-workspace check` y `test`.
- `wrangler deploy --dry-run`: empaquetado, sin publicar.
- CI inicia Auth/Firestore/Storage Emulator en un proyecto `demo-*`, ejecuta las reglas y la integración HTTP Firebase → Worker → SQLite con el esquema D1. Los tokens sin firma sólo se aceptan en el adaptador **de prueba**, no en el Worker desplegado.
- La prueba criptográfica descifra el payload con RFC 8291 y verifica VAPID. La prueba HTTP no utiliza un proveedor real ni demuestra recepción en iOS.

### Prueba física final (dos cuentas)

En iPhone con iOS 16.4 o posterior, abrir LaCantera **desde el icono añadido a inicio** y activar los avisos en Perfil → Ajustes. Apple exige app instalada e interacción para pedir permiso ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)).

1. Conectar A y B. Activar B, cerrar la app/bloquear el móvil y enviar desde A un mensaje. Debe llegar un aviso genérico y abrir la conversación de B al tocarlo.
2. A invita directamente a B a un encuentro privado. Comprobar el aviso, aceptar con B y comprobar la plaza y el aviso de aceptación en A.
3. Comprobar que C no puede abrir/aceptar esa invitación, que cancelar impide el acceso y que desconectar/bloquear impide nuevos envíos.
4. Desactivar mensajes y comprobar que las invitaciones siguen llegando. Desactivar este dispositivo y comprobar que no recibe nuevos avisos. Probar salida y cambio de cuenta sin abrir conversaciones ajenas.
5. Repetir recepción/clic en Android Chrome. Registrar fecha, versión y resultado, sin datos privados.

Hasta completar despliegue y esta prueba no afirmar que las notificaciones están activadas en producción.


## Entrada HTTP de Pages (desplegada)

El paquete HTTP equivalente está en `src/pages.mjs`, con configuración estándar en `pages/wrangler.jsonc`. Se compila desde la raíz con `node scripts/build-push-pages.mjs`, sin publicar nada. El resultado queda en `.audit/push-pages` y no contiene claves privadas. La CI incluye esa compilación.

El responsable autorizó expresamente añadir únicamente `pages:write`, conservando los alcances existentes. No se añadieron permisos de DNS ni facturación. Para repetir la operación: fijar la cuenta con `CLOUDFLARE_ACCOUNT_ID=1d93ccbf1186b4d835d92df24396a197` y usar `--cwd pages`. El proyecto `lacantera-push` ya existe con producción `main`. Para un proyecto nuevo, esta versión de Wrangler puede delegar la creación en Workers: comprobar el destino y usar la opción de creación directa de Pages para conservar el endpoint requerido. A continuación, cargar el mismo par VAPID mediante `wrangler pages secret bulk --cwd pages --project-name lacantera-push` con entrada privada y desplegar mediante `wrangler pages deploy --cwd pages --project-name lacantera-push --branch main`, usando el pnpm/Wrangler fijados de `push-worker`. El Worker existente conserva el cron y comparte D1; no duplicar el programador ni crear otra base.

Comprobar la nueva dirección y sus controles de acceso antes de cambiar `VITE_PUSH_API_URL`. La mera compilación local no demuestra que Pages esté publicado ni que resulte accesible desde una red afectada. No cambiar DNS ni activar un plan de pago para probar esta alternativa.
