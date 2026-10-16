# Juega y Comunidad — 16 de octubre de 2026

La revisión sustituye la acumulación de controles de las dos pantallas por la jerarquía de las referencias móviles aportadas por el usuario: `codex-clipboard-11b89c21-47a3-4651-82a6-df672db1a4ad.png` (Juega) y `codex-clipboard-32516b39-f815-47b3-8929-dc5b2c4d0667.png` (Comunidad). Las capturas IMG_9440/9441 representan la experiencia anterior que el usuario rechaza.

## Diseño implementado

Juega: ubicación compacta, título/Crear, búsqueda con filtro, pestañas Explorar/Mis encuentros con subrayado y tres selectores nativos (fecha/formato/nivel). País, ciudad, partido/torneo y sólo próximos/abiertos se agrupan en el panel de filtros. Las tarjetas muestran fecha, formato, título, lugar y miniatura a la derecha; debajo, inscripciones reales, plazas disponibles y acceso a detalle/gestión. Hay dos columnas en escritorio y una en móvil.

Comunidad: cabecera blanca con Personas, búsqueda, compositor, pestañas Comunidad/Siguiendo y filtros de contenido. Se elimina la portada fotográfica y la navegación duplicada. El estado vacío tiene una composición centrada. La sección de personas consulta el directorio público existente y permite seguir usando la operación real; Equipos, invitaciones/QR y Mensajes mantienen acceso propio. El lateral de encuentros se conserva en escritorio.

Se mantiene la marca aprobada, las imágenes genéricas ya existentes, el acceso persistente a Mensajes y las cinco secciones inferiores. No se copian precios, distancias, mapas, caras ni clubes ficticios de las referencias. La publicación multimedia sigue cerrada hasta patrocinio; texto y logros conservan su compositor y validaciones. La búsqueda del feed continúa siendo sobre contenido cargado, con nombre accesible y alcance visible al buscar; no simula un buscador global de personas.

## Verificación

CUA sobre localhost con datos de prueba existentes: formato sin coincidencias, restaurar, tipo Torneo, Mis encuentros y fechas; abrir creación, cerrar y recuperar foco; abrir compositor, cambiar a Logro y cerrar; mostrar/ocultar comentarios; búsqueda sin coincidencias y acceso a personas. Vistas comprobadas a 320×780, 390×844, 430×932 y 1280×800. No se crean registros de prueba en producción.

335 pruebas locales aprobadas y TypeScript/build correctos. El backend no cambia: no se despliegan reglas, índices, Storage, Functions, roles ni facturación. Las reglas completas se verifican además en CI. El aviso conocido del chunk Firebase permanece; no es un fallo de compilación.

Evidencia local en `output/design/discovery-2026-10-16/`. Las capturas de demo se identifican como pruebas; no se presentan como comunidad pública real. La revisión de viewport no sustituye la cámara ni el teclado físico de Safari.

## Publicación

Pendiente de registrar el recibo del paquete final y las capturas públicas tras la publicación.
