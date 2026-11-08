# Tutorial de instalación de LaCantera

Composición editable de 36 segundos, vertical (1080 × 1920, 30 fps), creada con HyperFrames 0.9.19. Los recursos y la tipografía son locales; la composición no carga servicios externos ni añade música o voz.

## Editar y exportar

Desde esta carpeta, con Node 24+, pnpm, FFmpeg/FFprobe y Chrome de HyperFrames disponibles:

```sh
pnpm dlx hyperframes@0.9.19 browser ensure
pnpm dlx hyperframes@0.9.19 check
pnpm dlx hyperframes@0.9.19 snapshot --at 1.5,5.5,11,17,23,28.5,34 --output ../../output/tutorial/frames
pnpm dlx hyperframes@0.9.19 render --quality high --fps 30 --workers 1 --output ../../output/tutorial/instalar-lacantera-master.mp4
ffmpeg -i ../../output/tutorial/instalar-lacantera-master.mp4 -c copy -movflags +faststart ../../public/tutorial/ios/instalar-lacantera-iphone.mp4
```

`index.html` contiene los textos, la composición y la línea de tiempo pausada registrada en `window.__timelines.main`. `DESIGN.md` define la identidad. Revisa los fotogramas después de cambiar tiempos, texto o recortes, y actualiza también los subtítulos VTT y la transcripción de la app.

## Procedencia

Las cinco capturas IMG_9622–IMG_9626 fueron aportadas por el propietario de LaCantera. `scripts/prepare-installation-images.py`, desde la raíz del repositorio, reproduce sus seis recortes con Pillow. Se excluyen hora, batería, saludo personal, teclado y extensiones. No se redibuja la interfaz de Safari. El icono provisional «L» que aparece en la confirmación pertenece a la captura original.

Recursos: marca existente `public/cantera-mark.svg`; Manrope Variable de la dependencia existente `@fontsource-variable/manrope` (licencia OFL incluida); GSAP 3.15.0 distribuido con HyperFrames (aviso de licencia conservado en el archivo, [licencia del proveedor](https://gsap.com/standard-license)). No se añade GSAP al paquete de la app: solo se sirve el MP4 y sus imágenes.

Referencia del recorrido: [Apple: añadir un sitio web a la pantalla de inicio del iPhone](https://support.apple.com/es-es/guide/iphone/iphea86e5236/ios). La posición y apariencia de los controles dependen de la versión y el diseño de Safari; la guía indica ambas posibilidades para Compartir.

La reproducción es manual y sin sonido. La app ofrece subtítulos opcionales y los cinco pasos con imágenes, sin animación automática.
