# Tutorial de instalación — 8 de noviembre de 2026

## Actualización de dominio — 13 de noviembre de 2026

El responsable solicitó actualizar todos los vídeos a `lacantera.com.es`. Se actualizan las variantes cuadrada y vertical, tanto en el texto de la guía como en las direcciones visibles de Safari mediante capas editables sobre las capturas originales. Se mantienen los controles, los siete estados, los 36 segundos y la ausencia de audio. La variante cuadrada sigue siendo la utilizada en la app; la vertical se conserva como descarga histórica con la dirección actualizada.

Se revisan los fotogramas de los pasos 1 y 5, donde se muestran las direcciones, y las exportaciones H.264 de 1080 × 1080 y 1080 × 1920 a 30 fps. Las portadas se extraen de los nuevos MP4. Esta modificación no acredita una nueva instalación física de Safari ni la activación del DNS del dominio. Las secciones posteriores conservan el historial de la entrega original.

## Entrega

- Vídeo cuadrado `public/tutorial/ios/instalar-lacantera-iphone-compacto.mp4`: 36 segundos, 1080 × 1080, 30 fps, H.264/yuv420p, sin audio, 2.870 KB aproximadamente. Metadatos MP4 antes de los fotogramas (`moov` antes de `mdat`) para reproducción progresiva.
- Seis recortes WebP de las cinco capturas IMG_9622–IMG_9626, portada cuadrada `poster-compacto.webp` y subtítulos opcionales en español.
- Integración en «Ver cómo» → «iPhone / iPad»: portada con botón de reproducción manual, descarga y transcripción de cinco pasos con imágenes. `preload="none"`, sin reproducción automática. El foco pasa al reproductor cuando comienza; si falla, se ofrece reintento, descarga y pasos estáticos.
- Fuente editable y recursos locales en `media/install-ios/`. Script de recorte en `scripts/prepare-installation-images.py`. No se añade ninguna dependencia al paquete de la app.

## Adaptación del formato

La primera entrega vertical sigue conservada como archivo, pero la app utiliza la nueva composición cuadrada 1:1. No se recorta el MP4 vertical con CSS: los siete estados se recomponen en el lienzo cuadrado para ampliar los controles de Safari y eliminar espacio vacío. El reproductor usa ancho completo y altura automática; ocupa 360 × 360 px a 393 px de pantalla y aproximadamente 286 × 286 px a 320 px.

Se acortan la introducción y la nota de Safari y se lleva su ayuda al pie, junto a «Entendido». En los dos tamaños probados el pie queda visible con los pasos estáticos cerrados. Los pasos siguen desplegándose y desplazándose dentro del diálogo cuando se necesitan.

## Secuencia

| Segundos | Pantalla |
| --- | --- |
| 0–3 | Presentación |
| 3–8,5 | Menú junto a la dirección de Safari |
| 8,5–14,5 | Compartir |
| 14,5–20,5 | Añadir a pantalla de inicio |
| 20,5–26 | Abrir como app web |
| 26–31,5 | Nombre y botón Añadir |
| 31,5–36 | Abrir LaCantera desde su icono |

Se mantienen los píxeles de Safari: recorte y acercamiento, sin reconstruir los controles. Se excluyen hora, batería, saludo personal, teclado y extensiones. El icono «L» de la confirmación pertenece a la captura original y no se ha sustituido. Referencia: [guía oficial de Apple](https://support.apple.com/es-es/guide/iphone/iphea86e5236/ios).

## Verificación

- HyperFrames `check`: pasa, sin errores ni avisos de ejecución; 41/41 comprobaciones de contraste AA. Revisados los ocho fotogramas de composición y los siete estados de escena extraídos del MP4 real.
- Avisos revisados: tres apariciones deliberadas del mismo logo estático; vídeo deliberadamente sin audio. Los solapamientos informativos corresponden a la disolución entre escenas, no a contenido estable.
- Mapa de animación: 57 interpolaciones; banderas de colisión solo en los contenedores durante las disoluciones, y `paced-slow` solo en la barra de progreso de 36 segundos. Las pausas de lectura son deliberadas. Sin banderas de salida de pantalla.
- Navegador local: reproducción real hasta el último segundo; duración de 36 segundos, sin error multimedia. El botón de inicio entrega el foco al vídeo. Guía y seis imágenes cargadas a 320 y 393 px de ancho; a 320 px, ancho interior y desplazable del diálogo coinciden (319 px). Recomendación, selección de Android/ordenador y devolución del foco a «Ver cómo» conservadas.
- TypeScript sin errores; 340 pruebas de dominio pasan. Compilación de revisión con servicio cerrado y modo demo desactivado.

Evidencias locales generadas en `output/tutorial/` (ignoradas en Git). El vídeo es un recurso estático, no habilita Storage, facturación ni permisos nuevos.

## Pendiente

Comprobar en un iPhone real la nueva portada, reproducción vertical/pantalla completa y vuelta a la guía. Las acciones de instalación se basan en las capturas aportadas y en las pruebas de instalación anteriores del usuario; esta sesión no simula una nueva instalación física de iOS.

Esta entrega no publica en producción ni renueva el acta de apertura. Está preparada para la revisión del mismo PR de diseño.
