# Correcciones de auditoría de LaCantera — 15 de octubre de 2026

La versión corrige F01–F14 de la auditoría de producto conservando diseño y funciones. El usuario autoriza publicación en `https://lacantera.web.app` después de verificaciones.

## Fases entregadas

| Fase | Hallazgos | Cambio |
|---|---|---|
| 1. Integridad y confirmaciones | F01, F05, F09 | Resultado sólo tras inicio efectivo del cruce o inicio del torneo si no hay horario. Protección en UI, dominio y reglas. Confirmación de retirada legible y revisión explícita de cruces antes de fijar participantes/cerrar inscripciones. |
| 2. Accesos habituales | F02, F03, F04 | Mensajes persistente móvil, bandeja con último texto/fecha/pendiente real; Mensaje desde perfil conectado, invitación para otros y bloqueo secundario; Mis encuentros/Torneos/Tus equipos visibles. |
| 3. Continuidad y lenguaje | F06, F07, F08, F10, F11 | Agenda Próximos/Historial y Avisos separados, fecha correcta en contador, Marcar como leído, restablecer scroll/foco al cambiar acceso/sesión, comentarios con nombre accesible y alcance visible de búsquedas locales. |
| 4. Acabado y administración | F12, F13, F14 | Recuperación secundaria, sólo estado aplicable en admin, búsqueda por nombre y UID avanzado; organizador espaciado, iniciales homogéneas, enlace/código diferenciados, textos auxiliares y ubicación legibles, índice legal. |
| 5. Privacidad y verificación | Ampliación necesaria para F02 | Cursores privados de lectura sin texto ni confirmación visible al contacto, reglas propias, exportación sin UID ajeno, baja de cursores de la conversación retirada y respaldo compatible. |

## Pruebas locales

- TypeScript y build Firebase Hosting sin emuladores; modo demo, piloto y multimedia desactivados para producción.
- 335 pruebas unitarias y de integración con dobles locales, sin omisiones. Incluyen dominio temporal, navegación de acceso, aislamiento de identidad, lectura y derechos de cuenta.
- 81 pruebas de reglas en Auth/Firestore/Storage Emulator Suite. Incluyen resultados prematuros, aislamiento de marcas de lectura y permisos de mensajería existentes.
- 16 pruebas de limpieza de publicaciones; comprobación estática de la función. No se despliega ninguna función.
- CUA a 320×780, 390×844, 768×1024 y 1280×720/800. Ver `../design-qa.md` y capturas locales en `output/design/audit-corrections-2026-10-15/`.
- Firebase SDK real con Auth/Firestore emulados: torneo privado, invitados, revisión, cierre y resultado futuro bloqueado; chat entre dos cuentas, respuesta, pendientes y lectura propagada; QR de imagen → identidad → conexión aceptada. El contacto conectado no obtiene acceso al torneo privado ajeno. Datos e identidades sintéticos exclusivamente locales.

## Alcance de publicación

Únicamente Hosting target `cantera`, site `lacantera`, y reglas e índices de la base `ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb` del proyecto `gen-lang-client-0853130215`. Los dos índices nuevos son `communityMessageReads.userId` y `communityMessageReads.conversationId`, ambos con orden de documento, conservando los 30 índices existentes. No se habilitan pagos, Storage, Functions, nuevos administradores ni otra base. No se crean mensajes, posts, equipos o eventos de prueba en producción.

## Prueba pendiente en iPhone

1. Actualizar LaCantera y abrirla en Safari y desde su icono instalado. Confirmar sesión y navegación sin barras o botones tapados.
2. Iniciar Google con cuenta real si la sesión no existe; volver a una invitación después del acceso.
3. Leer un QR nuevo con la cámara, revisar identidad y aceptar; comprobar permiso concedido/denegado. El lector desde imagen ya pasó aquí.
4. Escribir/responder en chat y comentario; comprobar teclado virtual, envío y volver a mensajes sin solapamientos.
5. Si usas VoiceOver, revisar nombres de comentarios, estado de Avisos y confirmaciones. No se declara certificación de accesibilidad.

El núcleo gratuito conserva su alcance; subir fotos/reels cloud espera patrocinio. El aviso de tamaño del chunk Firebase sigue siendo una mejora de rendimiento pendiente, sin fallo de compilación.

## Cierre de publicación

Pendiente de registrar CI final y recibos de Hosting/reglas tras publicación. El acta anterior de apertura no sustituye estos recibos.
