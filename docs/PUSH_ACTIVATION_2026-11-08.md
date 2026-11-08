# Activación de mensajes e invitaciones con avisos gratuitos

## Cambios preparados

Invitación directa a una cuenta conectada, bandeja de recibidas/enviadas, rechazo y cancelación, aceptación con plaza atómica y aviso al organizador. Las directas caducan a los siete días; los QR/códigos existentes siguen durando diez minutos. Los avisos de mensajes e invitaciones son opcionales por dispositivo, con preferencias separadas y baja al cerrar sesión. La pantalla bloqueada no muestra el texto del chat.

## Estado comprobado

- Código de aplicación y Worker en PR #2, rama `codex/lacantera-expo-redesign`. La CI del commit `917882b` pasó: [ejecución 42490015894](https://github.com/rommer1997/CANTERA-/actions/runs/42490015894). Las modificaciones posteriores deben tener su propia comprobación.
- Pruebas de ese cambio: 346 de dominio, 84 de reglas, 7 del Worker, una integración HTTP con Auth/Firestore Emulator y SQLite con esquema D1; además la suite de limpieza de Node 22 en CI. El proveedor de entrega está simulado; el payload se descifra independientemente con RFC 8291.
- Recorrido UI local con dos cuentas sintéticas: envío directo, bandeja correcta, aceptación y plaza confirmada. Ajustes revisados a 320 px sin desbordamiento horizontal. No se crearon personas ni encuentros sintéticos en producción.
- Cuenta Cloudflare `1d93ccbf1186b4d835d92df24396a197`: panel **Free, Current plan, $0** comprobado. No se cambió el plan.
- Worker publicado: `https://lacantera-push.garitocastizo.workers.dev`. D1 `lacantera-push`, ID `01055525-2120-4e22-aa12-5d6bf5a0e98e`, región WEUR; migración aplicada. Secretos VAPID cargados, nunca incorporados al repositorio. Cron cada minuto.
- Verificación HTTP del servidor real: `/config` 200 y `ready:true`; `/events` sin identidad devuelve 401; origen ajeno devuelve 403. Esto no demuestra recepción ni CPU durante un envío real.
- Reglas e índices de Firebase desplegados exclusivamente en `gen-lang-client-0853130215` / `ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb`. La configuración local y la remota contienen 33 índices, incluido `communityInvitations(recipientId, createdAt)`.
- Preflight remoto de las 14:39:24 UTC: diez GET, todos 200; reglas coincidentes, 33 índices READY y definiciones exactas, cero overrides efectivos, dominio Auth, Google y administrador existente verificados.
- Lectura pública de runtime: `serviceStatus: open`, `mediaUploadsEnabled: false`. No se cambió runtime, roles, Storage ni Functions.

## Operación que debe mantener el responsable

La política completa está en [OPERATING_POLICY.md](OPERATING_POLICY.md) y la ampliación técnica en [push-worker/README.md](../push-worker/README.md). Cloudflare recibe UID, suscripción del navegador y preferencias; el servidor consulta metadatos de Firebase con el permiso del usuario y excluye el texto del chat. Los proveedores de navegador entregan el aviso cifrado. D1 retira suscripciones tras treinta días sin renovación y las entregas caducan en una hora.

Las solicitudes de derechos incluyen D1: el operador debe completar su exportación o retirada, además de Firestore, antes de cerrar el expediente. La atención del correo, revisión de conservación y custodia cifrada siguen siendo manuales. No se garantiza entrega instantánea, capacidad ilimitada ni recepción si se agotan las cuotas gratuitas. No se amplía automáticamente a un plan de pago.

## Publicación pendiente

El acta aceptada por el responsable es del 13 de octubre. `scripts/check-release.mjs` exige que tenga menos de siete días y actualmente rechaza la compilación pública por esa fecha. Esta revisión técnica **no cambia la fecha de aceptación del responsable**. Falta renovar su revisión de la política, los compromisos manuales y el cambio de proveedor opcional para poder publicar la app con el endpoint configurado.

Tras publicar, realizar en iPhone instalado desde Safari y después Android:

1. Activar avisos en Perfil → Ajustes; cerrar la app y enviar un mensaje desde la otra cuenta.
2. Abrir el aviso; debe abrir la conversación de la cuenta destinataria, sin texto privado en pantalla bloqueada.
3. Enviar invitación directa a un encuentro privado; aceptar y comprobar el aviso al organizador y la plaza.
4. Desactivar mensajes, conservar invitaciones; después desactivar el dispositivo. Comprobar cierre/cambio de cuenta y bloqueo sin abrir datos ajenos.

Hasta comprobar la recepción física, mantenerla explícitamente pendiente en el recibo de entrega. No renovar de forma ficticia pruebas antiguas ni afirmar que los avisos ya llegan a usuarios.
