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

Publicado el **15 de octubre de 2026 a las 10:09 Madrid** (08:09 UTC).

- Fuente funcional: `83c2a1991fd9d9b4525f40abb38a56c482e26d98`. [CI final](https://github.com/rommer1997/CANTERA-/actions/runs/38703360228): 335 unitarias, 81 reglas emuladas y 16 limpieza Node 22, todas aprobadas sin fallos, omisiones ni cancelaciones; TypeScript y build aprobados.
- Hosting site `lacantera`, versión `820fd1a828211254`, release `1792051760586000`. Los **55 archivos** servidos coinciden byte a byte con el build local.
- Base nominal correcta, reglas `9d5c9c51-b081-4c87-8d76-6a0761351e05`, SHA-256 `03f92814313a51e0384aa7748b545353a431d75bc2442b0cd3789563c0a77df4`; contenido idéntico al código. **32 índices READY**, definiciones iguales a las revisadas. Dominio autorizado; runtime abierto y multimedia desactivada.
- Recibos detallados locales, excluidos de Git: `.audit/audit-corrections-hosting-2026-10-15.json`, `.audit/audit-corrections-cloud-2026-10-15.json` y `.audit/audit-corrections-ci-2026-10-15.log`.

Comprobación CUA con sesión real: actualizar la app; Mensajes persistente, vista previa «Recibido», pendiente inicial y lectura guardada; Mensaje desde perfil conectado abre el historial de dos mensajes. No se envían mensajes nuevos ni se borra contenido. Agenda muestra 0 próximos y los dos encuentros pasados sólo en Historial; Mis encuentros muestra las dos convocatorias privadas existentes. Avisos usa «Marcar como leído»; administración muestra sólo Pausar y conserva el servicio abierto. Feed mantiene el estado vacío real, navegación interna y alcance visible de búsqueda.

El cierre visual de Inicio comprueba blanco `rgb(255,255,255)` sobre fondo opaco `rgb(22,61,44)` en la ubicación, documento de 390×844 sin desbordamiento horizontal y consola sin entradas de error en la consulta final. `37-inicio-produccion.png`, `39-chat-produccion.png`, `40-agenda-produccion.png`, `41-perfil-contacto-produccion.png` y `42-juega-produccion.png` documentan el cierre localmente. La actualización final sólo cambia el contraste de Inicio; el resto de recorridos se comprobó en el paquete inmediatamente anterior de la misma entrega.

No se atribuyen estos resultados a una prueba física nueva de iPhone. El acta anterior de apertura no sustituye los recibos de esta entrega.
