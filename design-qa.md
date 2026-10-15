# LaCantera — cierre de las correcciones de auditoría

15 de octubre de 2026, Europe/Madrid.

**final result: passed** — revisión visual local del alcance F01–F14. No equivale a una certificación WCAG ni a una prueba física en Safari. La verificación de publicación se registra en `docs/AUDIT_CORRECTIONS_2026-10-15.md`.

## Referencia y fidelidad

Se conserva el diseño aprobado: marca C con balón, verde/blanco/menta, Manrope, fotografías genéricas existentes, tarjetas, cabecera y cinco destinos inferiores. Referencia de acabado: tablero adjunto de once pantallas `codex-clipboard-0485365f-d8a6-4715-ac4b-d21a4ac88a3a.png`. No se generan ni sustituyen imágenes en este pase. Las funciones disponibles, los permisos de eventos privados y el cierre de multimedia hasta patrocinio se conservan.

La referencia inmediata de los defectos es `output/design/product-audit-2026-10-15/`; las capturas posteriores están en `output/design/audit-corrections-2026-10-15/`. Son capturas nuevas de CUA, con dimensiones verificadas en DOM. Escrituras de prueba sólo en localhost/demo o Firebase Emulator `demo-cantera-ux`, con identidades sintéticas. Los datos locales no se publican.

## Comparación visual

- `comparacion-retirada.png`: antes/después a 1280×720. La explicación ya tiene todo el ancho lateral y las dos acciones se apilan, en lugar de comprimirla entre botones. Prueba móvil adicional `23-retirada-movil.png`.
- `comparacion-registro.png`: antes/después a 1280×720. Cambiar de acceso a registro vuelve al comienzo de la pantalla. Se preservan la franja fotográfica y el retorno interno.
- `comparacion-feed.png`: antes/después a 320×780. Misma publicación con comentarios abiertos y enlace copiado, conservando tarjeta y formulario; texto auxiliar y nombre accesible más claros. La portada y navegación nueva se comprueban por separado en `28-feed-320.png`. Se conserva la misma escala; el encuadre vertical cambia por el espacio adicional de búsqueda y avisos.
- `comparacion-resultados.png`: antes/después a 1280×800. Diferentes torneos sintéticos; se compara el estado de resultado futuro, no el contenido. Sin entradas de marcador antes del comienzo.

Se normaliza sólo escala proporcional y rótulos externos. No se retoca el contenido de las pantallas. Los pares se inspeccionan junto a las capturas originales; no se afirma igualdad de píxel con el tablero reducido.

## Hallazgos corregidos durante este pase

| Área | Resultado y evidencia |
|---|---|
| Navegación móvil | Mensajes persistente y Perfil abajo; Feed/Personas/Equipos/QR accesibles. `13-bandeja-pendiente-movil.png`, `28-feed-320.png`. |
| Perfil público | Mensaje como acción principal del contacto y bloqueo en Más opciones. `16-perfil-contacto.png`. |
| Equipos y Juega | Pestañas visibles y filtros de fechas separados de formatos. `05-equipos-propios.png`, `06-equipos-descubrir.png`, `07-juega.png`, `29-equipos-320.png`, `31-juega-tablet.png`. |
| Organización | Gestión e invitación/enlace accesibles; recuperación secundaria. Revisión explícita de participantes y sistema antes de cerrar la convocatoria, con foco y margen bajo cabecera. `21-revision-cruces-movil.png`. |
| Agenda y avisos | Próximos/Historial, cuenta por fecha y cancelación; Avisos como destino de campana. `04-agenda.png`, `32-historial-movil.png`. |
| Chat | Vistas previas reales, fecha y pendientes; lectura sincronizada entre dos pestañas. `09-bandeja-emulador.png` a `15-lectura-sincronizada.png`. |
| QR | Entrada QR/código separada; decodificación local de una imagen, identidad previa y conexión aceptada. `25-invitacion-qr-emulador.png` a `27-qr-conexion-aceptada.png`. |
| Administración | Sólo transición de estado aplicable y búsqueda por nombre, identificador técnico secundario. `17-admin-estado.png`, `18-admin-buscar.png`. No se aplican decisiones a cuentas reales. |
| Legibilidad | Iniciales consistentes, organizador espaciado, auxiliares aumentados, ubicación con fondo opaco e índice legal con foco. `30-privacidad-indice-320.png`. |

La inspección detectó y corrigió una pestaña de Equipos sin estilo al entrar directamente, un título de confirmación bajo la cabecera y un alcance de búsqueda todavía recortado a 1×1 px por CSS cargado de forma diferida. Las capturas finales sustituyen esas iteraciones. En el build de producción se corrigió también el enlace de vuelta al registro a 320 px: ahora tiene 44 px de altura y no se parte en dos fragmentos, conservando su texto. Sin desbordamiento horizontal en las vistas comprobadas a 320, 390, 768 y 1280 px; no se deduce ausencia de overflow en cada estado imaginable.

## Controles y límites

Se prueban ambos caminos de la retirada local, revisión/cierre del torneo en Firebase SDK emulado, bloqueo de resultado futuro, aceptación QR de imagen entre dos cuentas, envío/respuesta y lectura del chat, cambio de identidad sin contenido anterior, selección administrativa y salto legal con foco. Los tests de reglas cubren accesos ajenos, bloqueos y resultados prematuros.

Pendiente de dispositivo físico: cámara/permiso QR en iPhone, instalación y actualización desde pantalla de inicio, Google OAuth real y teclado virtual/VoiceOver. Se prueba autenticación de identidades sintéticas mediante Auth Emulator; no se presenta como una nueva prueba de OAuth de Google. Multimedia cloud sigue cerrada hasta patrocinio, como condición de operación existente.
