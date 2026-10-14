# LaCantera — fidelidad al tablero elegido

14 de octubre de 2026, Europe/Madrid.

**final result: passed**

Este pase sustituye la valoración anterior, demasiado permisiva, por una comparación de composición, densidad y acabado. El cierre publicado compara la conversación existente con dos mensajes reales, sin enviar mensajes nuevos. La demo no simula conversaciones.

## Fuente, capturas y normalización

Fuente: imagen adjunta `codex-clipboard-0485365f-d8a6-4715-ac4b-d21a4ac88a3a.png`, 1212 × 1298 px, once paneles reducidos sin metadatos de viewport. Capturas nuevas de CUA en `output/design/fidelity-final-2026-10-14/`: escritorio 1280 × 838 y móvil 390 × 844 / 320 × 780, DPR 1, sin desbordamiento a 320 px. Las imágenes `compare-*.png` contienen la fuente y la implementación juntas, a escala proporcional y con rótulos externos. No se alteró el contenido del producto.

Home se compara completo. Acceso se compara también en móvil porque el tablero muestra paneles aislados; las capturas de escritorio incluyen el marco compartido y no permiten afirmar igualdad de densidad. Equipos y Explorar son adaptaciones de paneles desktop. La barra de demo identifica los registros locales. Instalación/bottom nav son funciones solicitadas que el tablero omite.

## Iteraciones y evidencia posterior

| Incidencia | Corrección | Capturas posteriores |
|---|---|---|
| P1 Perfil precedido de correo/título/salida | Portada e identidad primero; Ajustes separado, con edición, verificación, derechos y salida. | profile.png, settings.png, compare-profile.png |
| P1 Feed fragmentado | Encabezado integrado, fuentes/tipos en una fila, compositor compacto, aviso multimedia dentro del formulario. | feed.png, feed-320.png, feed-desktop.png, compare-feed.png |
| P1 Explorar retrasaba las tarjetas | Búsqueda primero, título/creación en una fila, chips desplazables, opciones de vista/tipo desplegables. | play.png y compare-play.png recapturado al cerrar |
| P2 Formulario largo y galería por delante | Lugar, fecha/hora y pares a 390 px; ubicación global y galería desplegables con resumen; privacidad junto al envío. | create.png, create-320.png, compare-create.png |
| P2 Acceso con imagen ancha/césped sin sujeto | Franja lateral 24–26%, recorte de login enfocado en botas. También lateral en móvil. | register-mobile.png, login-mobile.png, register.png, login.png |
| P2 Palabra del lateral partida | Texto 15 px y envoltura normal. | login-css-320.png y recaptura posterior al ampliar el ancho útil de la leyenda |
| P2 Directorio de equipos retrasado por gestión | Tus equipos desplegable; directorio visible antes. | teams-desktop.png, recaptura móvil al cerrar |
| P2 CTA de ficha lejos del organizador | Enlace visible a gestión/inscripción con foco del panel de destino. | event.png y prueba de foco ce-manage |

## Cinco superficies de fidelidad

- **Tipografía:** Manrope existente, titulares 800, tinta negra, auxiliares gris frío; entradas 16 px en móvil, botones mínimo 44 px. Se revisaron peso, escala, etiquetas, nombres largos y foco. No se deduce una familia exacta del tablero reducido. La rotura de palabra del lateral se corrigió y requiere recaptura.
- **Espaciado:** blanco dominante en móvil, radios contenidos, divisores finos, identidad unida a portada y menos contenedores. Controles globales del evento quedan accesibles y agrupados. Instalación se compacta a una fila de 44 px; no se elimina.
- **Colores:** verde #006747, tinta #111917, auxiliar #68737c, blancos y menta suave. Se mantienen señales de foco/selección/cancelación. Se deshabilitó la decoración geométrica previa de Explorar y no se añadieron dibujos o gradientes como sustitutos de imágenes.
- **Imágenes:** seis recursos genéricos ya generados/documentados, recortes dirigidos y marca aprobada. Iniciales representan cuentas sin foto; no se inventaron rostros, clubes o escudos. Portadas genéricas identificadas; galería conservada.
- **Contenido:** proveedores, datos y funciones reales. No se copian Apple/email, mapas simulados, cifras ni actividad ficticia. Ajustes no añade toggles de servicios inexistentes. Campo/ciudad/país, zona, privacidad, costes y patrocinio siguen accesibles.

## Verificación funcional

Información/Actividad y agenda; Ajustes/Tu cuenta/editar conservan datos. Una prueba de regresión demuestra que solicitar exportación desde Ajustes no cambia identidad, consentimiento ni guarda el perfil automáticamente. Comunidad/Siguiendo cambia de vista. El compositor permanece montado.

Creación y edición locales mediante controles nativos: fecha 16 octubre, 19:30 Madrid, portada nocturna; ficha e historial reflejan el guardado. Gestionar encuentro enfoca ce-manage. No se pulsaron cancelaciones/cierres reales. Sin desbordamiento horizontal en feed/formulario a 320 px. TypeScript/build y 328 unitarias pasan; no se atribuyen pruebas de reglas repetidas a un cambio visual.

Durante HMR se observó un aviso de React al cambiar el tamaño de dependencias de un efecto. Se recargó el documento para revisar la versión completa; el cierre publicado comprobará consola sin HMR. No se afirma prueba física nueva en iPhone ni accesibilidad completa desde imágenes.

## Cierre publicado

Frontend funcional bf65b44cf92687fdcb168b72e0eb2bc645548973 publicado y actualizado mediante Actualizar app. Perfil y Ajustes reales: profile-production.png/settings-production.png; correo confirmado únicamente dentro de Tu cuenta. Comunidad/Explorar/Equipos reales: feed-production.png/play-production.png/teams-production.png; estados vacíos corresponden a ausencia de registros públicos, no se inventa contenido.

Chat real: messages-desktop-production.png (1280 × 838) y messages-mobile-production.png (390 × 844), sin overflow. Pares compare-messages.png / compare-messages-mobile.png abiertos juntos con la fuente. Se conservaron dos mensajes guardados; no se envió, borró ni alteró una conversación. Consola de producción: errors []. La adaptación móvil muestra un hilo y acceso de vuelta a la lista en vez de dos columnas comprimidas.

Acceso móvil corregido: login-css-320.png, 320 × 780, DOM 320 × 780 y scrollX=0. Se rechazó login-mobile.png como prueba definitiva al detectar un recorte de cabecera causado por transición de viewport. La nueva captura incluye la marca y se obtiene con screenshot del tab a su tamaño CSS. El área útil de la leyenda se amplió para conservar la palabra completa. No se infiere el viewport de un tab oculto a partir del tamaño de otro; las dimensiones DOM se verifican antes de capturar.

Se compararon fuente/implementación juntas, incluidas capturas publicadas. No quedan diferencias P0/P1/P2 accionables dentro del alcance funcional actual. Permanece P3 la escritura del lateral como texto de UI sobre fotografía en lugar del tratamiento manuscrito del tablero. Las diferencias de proveedores, campos necesarios, contenido real, avatares sin foto e instalación son restricciones explícitas; no son igualdad de píxel inventada.

CI final 38617559062 de 49dbfd1d8d65d5a34ab0c45e6bcbff54d0bc5cf9: 423 pruebas (328 unitarias, 79 reglas en emuladores, 16 limpieza Node 22), todas aprobadas sin omisiones. Se conserva el aviso de tamaño del chunk Firebase del build. El ajuste final de ancho de la leyenda cambia CSS solamente y está recompilado/publicado: Hosting e7c0aa5ad38a1024, 53 archivos idénticos al build. No se despliegan reglas, índices, roles ni facturación.
