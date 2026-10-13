# Revisión de diseño: Comunidad y marca LaCantera

Fecha: 2026-10-13.

## Alcance y referencia

El usuario eligió una dirección propia: fondo verde, C blanca y balón clásico como punto. No seleccionó una de las tres maquetas completas de Comunidad. Por tanto, la comparación de fidelidad se aplica al símbolo generado; la disposición del feed se verifica como evolución de la aplicación existente, sin atribuirle una falsa correspondencia con una maqueta elegida.

Referencia visual: `output/design/lacantera-c-balon-original.png` (1254 × 1254 px). Captura real: `output/design/comunidad-nueva-local-escritorio.png` (1440 × 1000 px, viewport CSS igual). Comparación conjunta: `output/design/comparacion-logo-comunidad.png`. Comparación de detalle: `output/design/comparacion-logo-detalle.png`: referencia y recorte de 37 × 37 px de la cabecera normalizados a 200 × 200. La ampliación del recorte se usa para detectar cambios de forma, no para juzgar nitidez a tamaño nativo.

Capturas móviles reales: `output/design/comunidad-nueva-local-movil.png` (390 × 844 px) y `output/design/comunidad-nueva-local-320.png` (320 × 740 px). CSS y píxeles coinciden; no hay marco de dispositivo ni densidad duplicada. En ambos tamaños scrollWidth coincide con innerWidth. La fila de filtros tiene desplazamiento horizontal propio; los controles persistentes no quedan fuera de la pantalla.

Estado: perfil y publicaciones expresamente sintéticos en el modo local aislado. Las capturas no acreditan actividad de clientes, ni dos cuentas conectadas en producción. En local aparecen Foto/Reel por el entorno de prueba; la configuración del piloto real sigue con cargas multimedia desactivadas.

## Hallazgos y superficies de fidelidad

No se observan diferencias P0/P1/P2 entre el símbolo elegido y su implementación. La C y el balón proceden del mismo raster generado. El redondeo de la máscara es intencional para cabecera e instalación.

- Tipografía: se mantiene Manrope local, con LaCantera escrito con L y C mayúsculas. Jerarquía, peso y ajuste de líneas legibles en 320, 390 y 1440 px. El texto de la marca es editable y está fuera del símbolo original, que no contiene letras adicionales.
- Espaciado: cabecera compacta, editor accesible arriba, selector Comunidad/Siguiendo y tarjetas continuas. En móvil se conservan navegación inferior y separación del contenido; escritorio distribuye cuenta, feed y encuentros en tres columnas.
- Colores: verde como acento, fondos claros y tinta verde oscura; estados semánticos conservan sus colores de error/aviso. Se retiró el punto rojo de la marca. El color del símbolo se mantiene en las imágenes; las diferencias de captura no se interpretan como una sustitución del asset.
- Imagen: icono de cabecera de 32/36 px legible; el balón es deliberadamente un punto pequeño. Iconos PWA derivados del raster, sin dibujos CSS ni reinterpretación vectorial. Los archivos SVG son contenedores del raster, no un original vectorial.
- Contenido: publicación normal con título opcional y logros con título requerido; no contadores inventados ni fotos/personas de muestra en producción. Búsqueda indica su alcance sobre publicaciones cargadas.

## Interacciones comprobadas

En navegador, modo local aislado: abrir editor con foco en el texto, publicar sin título, enlace directo automático, reaccionar, comentar, recargar y recuperar publicación/reacción/comentario, filtrar Publicaciones, crear logro y validar que el título sea obligatorio. Consola del feed: sin errores en la revisión. El popup Google del emulador no fue accesible desde el navegador integrado; esto no se presenta como validación de autenticación real.

La persistencia y permisos de nube se validan aparte con las pruebas de provider y reglas Firestore; no se equipara la prueba local de UI a una prueba completa de clientes en producción.

## Historial de comparación

Primera comparación conjunta completa y de detalle: sin ajustes visuales P0/P1/P2 pendientes. Durante revisión funcional se aisló el editor por cuenta mediante su key; no es una iteración de fidelidad visual. Cámara QR e instalación reales de iPhone/Safari siguen pendientes de la prueba del usuario.

## Seguimiento de pulido

[P3] Si se prepara papelería o impresión, producir y revisar un original vectorial del símbolo. Los PNG actuales sirven para la aplicación y PWA, pero no se presentan como un archivo de imprenta.

## Comprobación posterior de la entrega real

Hosting `e535e22f00e65d96` publicado en `https://lacantera.web.app/#/feed`. Capturas: `output/design/comunidad-publicada-movil.png` y `output/design/comunidad-publicada-editor.png` (390 × 844 px). Sesión real del responsable, feed vacío real y medios desactivados. Se comprobó la actualización PWA, los tres filtros de texto y el editor de título opcional; Escape cierra y devuelve el foco. Sin errores de consola. No se creó contenido de prueba en producción. Mantiene el mismo símbolo comparado previamente y no revela las publicaciones locales.

final result: passed
