# Acta de publicación del rediseño — LaCantera

Publicado el 14 de octubre de 2026 (Europe/Madrid) en https://lacantera.web.app.

## Fuente, compilación y pruebas

- Fuente funcional: commit `4bb5ed39bef6f317e4a7de29e8e59aef15660050` de `codex/cantera-community`, PR #1.
- [GitHub Actions 38484322221](https://github.com/rommer1997/CANTERA-/actions/runs/38484322221): completado con éxito sobre ese commit.
- TypeScript, build y pruebas: 327 unitarias y 79 de seguridad con emuladores en Node 24; 16 de limpieza en Node 22. Total 422, cero fallos, canceladas u omitidas en los tres bloques.
- Compilación específica para Firebase Hosting y preflight de publicación completados antes del despliegue. El build conserva la advertencia de tamaño del paquete Firebase, ya cargado como chunk separado; no se afirma haber eliminado esa dependencia.

## Destino y verificación publicada

- Proyecto `gen-lang-client-0853130215`, Hosting `lacantera` (target `cantera`).
- Hosting versión `5c3d5082a2aab168`, release `1791934058379000`, publicada `2026-10-13T23:27:38.379Z` (14 de octubre, 01:27 Madrid).
- A las `2026-10-13T23:27:48.139Z` se verificaron los 53 archivos del build mediante respuestas públicas y comparación exacta de bytes: todos coinciden. Incluye HTML, chunks JS/CSS, fuentes, PWA, documentos y siete imágenes nuevas.
- Base Firestore única autorizada: `ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb`. Ruleset `645f79ea-aa5c-47f7-a086-a4cf2e54718a`, SHA-256 `87249b749a962b098585cca8679fd68a297cf22fc2f92195db5c4d5a201dc541`, leído de vuelta y coincidente con el código.
- Los 30 índices existentes coinciden con la especificación y continúan `READY`. No se desplegaron índices nuevos.
- Consultas anónimas permitidas a perfiles públicos, publicaciones, eventos públicos y equipos activos: HTTP 200. Lectura anónima de perfil privado, encuentro privado y conversación privada: HTTP 403.
- Runtime mantiene `serviceStatus=open`, `mediaUploadsEnabled=false` y sin lista de piloto. No se repitió la operación de apertura ni se desplegaron Storage, Functions, facturación, dominios de Auth o roles.

## Verificación de uso real

Se actualizó la app mediante su aviso «Actualizar app», conservando la sesión de la cuenta propietaria. El nuevo diseño cargó en el dominio autorizado.

La conversación existente entre las dos cuentas del responsable se leyó en escritorio (1280 × 838) y móvil (390 × 844, DPR 1, sin desbordamiento horizontal). Se verificaron sus dos mensajes guardados y la navegación de regreso a la lista. No se enviaron mensajes nuevos ni se inventó actividad. Consola inspeccionada: sin errores.

En el encuentro privado técnico existente, con cero participantes, el organizador cambió la portada de día a «Bajo los focos», guardó una explicación técnica y recargó. El formulario cerró tras guardar y el DOM recargado mostró `/images/design-2026-10/event-night.webp` con la etiqueta «Imagen genérica». Se conservan fecha, privacidad y demás datos de la convocatoria. Este registro declara expresamente que no es un partido real. Consola inspeccionada: sin errores.

Comunidad se abrió en producción a 390 × 844 y cargó la nueva imagen ilustrativa. Su estado vacío corresponde a que aún no existen publicaciones públicas; la demo y sus pruebas permanecen sólo en el navegador local. Las capturas y comparaciones de [design-qa.md](../design-qa.md) documentan el pase visual; no se presentan como una prueba física nueva en iPhone.

## Alcance

Las portadas genéricas y sus cambios están operativos gratuitamente. La carga de archivos propios, vídeo y reels continúa pendiente de patrocinio/infraestructura multimedia. Los acuerdos de privacidad y operación, la firma «Powered by Rommer Volcanes» y las comprobaciones históricas de Safari se mantienen sin una nueva aceptación ni afirmaciones de copia de seguridad ejecutada.
