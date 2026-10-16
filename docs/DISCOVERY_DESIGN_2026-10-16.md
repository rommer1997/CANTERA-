# Juega y Comunidad — 16 de octubre de 2026

La revisión sustituye la acumulación de controles de las dos pantallas por la jerarquía de las referencias móviles aportadas por el usuario: `codex-clipboard-11b89c21-47a3-4651-82a6-df672db1a4ad.png` (Juega) y `codex-clipboard-32516b39-f815-47b3-8929-dc5b2c4d0667.png` (Comunidad). Las capturas IMG_9440/9441 representan la experiencia anterior que el usuario rechaza.

## Diseño implementado

Juega: ubicación compacta, título/Crear, búsqueda con filtro, pestañas Explorar/Mis encuentros con subrayado y tres selectores nativos (fecha/formato/nivel). País, ciudad, partido/torneo y sólo próximos/abiertos se agrupan en el panel de filtros. Las tarjetas muestran fecha, formato, título, lugar y miniatura a la derecha; debajo, inscripciones reales, plazas disponibles y acceso a detalle/gestión. Hay dos columnas en escritorio y una en móvil. El estado vacío usa la colección de la vista activa: los encuentros privados propios no provocan un falso aviso de filtros en Explorar.

Comunidad: cabecera blanca con Personas, búsqueda, compositor, pestañas Comunidad/Siguiendo y filtros de contenido. Se elimina la portada fotográfica y la navegación duplicada. El estado vacío tiene una composición centrada. La sección de personas consulta el directorio público existente y permite seguir usando la operación real; Equipos, invitaciones/QR y Mensajes mantienen acceso propio. El lateral de encuentros se conserva en escritorio.

Se mantiene la marca aprobada, las imágenes genéricas ya existentes, el acceso persistente a Mensajes y las cinco secciones inferiores. No se copian precios, distancias, mapas, caras ni clubes ficticios de las referencias. La publicación multimedia sigue cerrada hasta patrocinio; texto y logros conservan su compositor y validaciones. La búsqueda del feed continúa siendo sobre contenido cargado, con nombre accesible y alcance visible al buscar; no simula un buscador global de personas.

## Verificación

CUA sobre localhost con datos de prueba existentes: formato sin coincidencias, restaurar, tipo Torneo, Mis encuentros y fechas; abrir creación, cerrar y recuperar foco; abrir compositor, cambiar a Logro y cerrar; mostrar/ocultar comentarios; búsqueda sin coincidencias y acceso a personas. Vistas comprobadas a 320×780, 390×844, 430×932 y 1280×800. No se crean registros de prueba en producción.

335 pruebas locales aprobadas y TypeScript/build correctos. CI final del commit `ab3a0630de2325a988d265253cb6a9d083bfdd60`: 335 pruebas de dominio, 81 de reglas y 16 de limpieza, 432 aprobadas sin fallos. El backend no cambia: no se despliegan reglas, índices, Storage, Functions, roles ni facturación. Las reglas completas se verifican además en CI. El aviso conocido del chunk Firebase permanece; no es un fallo de compilación.

Evidencia local en `output/design/discovery-2026-10-16/`. Las capturas de demo se identifican como pruebas; no se presentan como comunidad pública real. La revisión de viewport no sustituye la cámara ni el teclado físico de Safari.

## Publicación

Publicada en https://lacantera.web.app el 16 de octubre de 2026 a las 06:43 Madrid (04:43 UTC). Fuente `ab3a0630de2325a988d265253cb6a9d083bfdd60`; [CI aprobada](https://github.com/rommer1997/CANTERA-/actions/runs/38851843424). Hosting `618738acccf9d446`, release `1792125785946000`. Los 54 archivos del build coinciden byte a byte con los servidos por Hosting; recibo local `.audit/discovery-hosting-2026-10-16.json`.

Se despliega únicamente Hosting. Comprobación de backend de sólo lectura: reglas coinciden con el repositorio, 32 índices READY, servicio abierto y multimedia desactivada.

CUA en producción con la sesión existente: actualización PWA, Explorar vacío correcto, dos encuentros privados propios con sus fechas reales, Comunidad vacía, recomendación de la otra cuenta real, compositor sin enviar y retorno del foco. No se crean publicaciones, conexiones ni mensajes. Comunidad a 320 px tiene ancho de documento 320 px; consulta de consola sin errores. Capturas `juega-publicado-explorar-430.png`, `juega-publicado-mios-430.png` y `comunidad-publicada-430.png` en el directorio de evidencia indicado.

Queda para el iPhone físico comprobar los selectores nativos y el teclado con esta distribución; la cámara, OAuth y la instalación física no se repiten en esta sesión.
