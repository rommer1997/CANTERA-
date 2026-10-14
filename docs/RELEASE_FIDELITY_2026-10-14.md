# LaCantera — publicación del ajuste de fidelidad

14 de octubre de 2026, Europe/Madrid. Sitio: https://lacantera.web.app.

## Resultado

Se recompuso la interfaz existente según el tablero elegido: blanco dominante, verde esmeralda, tipografía de mayor peso, controles de tamaño consistente, cabeceras integradas y menor fragmentación. Se mantienen funciones y datos reales; las cifras, personas, mapas, clubes y proveedores no implementados del tablero no se presentan como servicios reales.

- Perfil comienza por portada/identidad. Información y Actividad funcionan; cuenta, verificación, derechos y cierre de sesión están en Ajustes (`#/profile?tab=settings`).
- Comunidad agrupa el origen y los tipos de contenido; compositor compacto y explicación de medios dentro del formulario. Se preservan búsqueda, comentarios, reacciones, enlaces, denuncias y moderación.
- Explorar muestra búsqueda y tarjetas antes. Fecha/formato son chips desplazables; vista propia y tipo están en un desplegable. No se eliminó ningún filtro.
- Formulario conserva ubicación global, zona horaria, tipo/formato, organización por equipos, aforo, recurrencias, privacidad y galería. Fecha/hora se presentan por separado, con la misma conversión temporal y validación. La privacidad se indica también junto al envío.
- Ficha incluye acceso directo a gestión/inscripción y foco de teclado en el destino. Portada genérica sigue editable.
- Directorio de equipos prioriza descubrimiento; gestión propia permanece disponible. Acceso usa una franja fotográfica lateral; el chat conserva conversación y lista en escritorio e hilo separado en móvil.
- Instalación sigue recomendándose en cada visita de navegador, con una fila compacta. La marca y documentos aceptados no cambian.

## Fuente y comprobación

Fuente funcional inicial `bf65b44cf92687fdcb168b72e0eb2bc645548973`; fuente final publicada `49dbfd1d8d65d5a34ab0c45e6bcbff54d0bc5cf9` (ajuste de ancho de leyenda a 320 px y cierre de QA).

[CI final 38617559062](https://github.com/rommer1997/CANTERA-/actions/runs/38617559062): TypeScript/build y **423 pruebas**, todas aprobadas: 328 unitarias, 79 reglas con emuladores y 16 limpieza Node 22. Cero fallos, cancelaciones u omisiones. La regresión añadida demuestra que Ajustes permite edición/exportación sin cambiar identidad, reaceptar condiciones ni guardar automáticamente.

Hosting versión `e7c0aa5ad38a1024`, release `1792003416116000`, publicada `2026-10-14T18:43:36.116Z` (20:43 Madrid). Verificación a `2026-10-14T18:44:53.004Z`: los **53 archivos** públicos coinciden exactamente con el build, incluidos chunks, fuentes, PWA, imágenes y documentos.

## Navegador y QA

Capturas y comparaciones en `output/design/fidelity-final-2026-10-14/`; informe [design-qa.md](../design-qa.md) aprobado dentro del alcance funcional actual.

Se probó en la demo aislada la edición del perfil, Ajustes, filtros de Comunidad, creación/edición de encuentros, fecha/hora nativas y selección/guardado de la portada. Se verificó ausencia de desbordamiento a 320 px. La prueba local del 16 octubre, 19:30 Madrid, no es una convocatoria real y no se publicó en la comunidad.

En producción se actualizó la PWA conservando la sesión del responsable. Se comprobaron Perfil, Ajustes y correo privado dentro de Tu cuenta; Comunidad, Juega y Equipos con sus estados reales; ficha privada existente; y dos mensajes guardados de la conversación entre las cuentas del responsable, en escritorio y móvil. Consola inspeccionada sin errores. No se enviaron mensajes nuevos ni se cambiaron inscripciones, horarios o datos de convocatorias reales para conseguir capturas.

La franja de acceso se recapturó a 320 × 780 con dimensiones CSS verificadas; la leyenda cabe sin partir palabras. Se rechazó una captura anterior con recorte provocado por transición de viewport, y no se usó para cerrar el pase. No se afirma una prueba física nueva en iPhone ni cumplimiento completo de accesibilidad sólo mediante capturas.

## Alcance operativo

Sólo se desplegó Firebase Hosting en el target existente `cantera` / sitio `lacantera`. Reglas, índices, permisos, Auth, runtime abierto y medios desactivados no se modificaron. Fotos propias, vídeos y reels cloud siguen pendientes de patrocinio; el cambio de diseño no activa facturación, Storage ni Functions.

Se conserva el aviso de tamaño del chunk Firebase del build. La revisión no afirma una reproducción exacta de píxeles de un tablero de estados ficticios: las funciones reales, privacidad, controles táctiles e instalación justifican las diferencias documentadas.
