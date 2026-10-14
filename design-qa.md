# QA visual del rediseño de LaCantera

Fecha: 14 de octubre de 2026 (Europe/Madrid).

**final result: passed**

La comparación de Home, Comunidad, ficha de encuentro, perfil propio, equipos y acceso conserva la dirección visual seleccionada: tipografía sans geométrica, verde deportivo, superficies blancas, fotografía de fútbol y navegación compacta. La incidencia responsive de Comunidad a 320 px está resuelta y ya existen capturas comparables de creación nueva y perfil público. La conversación real de producción se ha comparado en escritorio, móvil y lista de contactos. No quedan incidencias P0/P1/P2 en las superficies inspeccionadas. Este informe no es un certificado de seguridad ni una afirmación de que fotos o reels estén habilitados en producción.

## Hallazgos

**No quedan P0/P1/P2 visuales abiertos en los estados comparables inspeccionados.** Comunidad a 320 px, creación nueva, perfil público y conversación real de producción se recapturaron y compararon después de las correcciones. Los P3 de abajo son refinamientos, no bloqueos.

La conversación conserva únicamente dos mensajes reales previamente guardados entre las cuentas del propietario. No se enviaron mensajes nuevos para obtener una captura. El estado local «Mensajes entre cuentas reales» era una restricción correcta de la demostración; se cerró el hueco de evidencia mediante las capturas autenticadas de producción.

## Fuente visual, normalización y estados

Fuente visual de verdad: `output/design/redesign-2026-10/reference-board.png`, 1212 × 1298 px; corresponde a la imagen elegida por el usuario. Los recortes `reference-*.png` conservan su composición. La referencia es un tablero con paneles reducidos, no capturas nativas de un único dispositivo; no se deduce un `deviceScaleFactor` real del tablero.

| Superficie | Recorte fuente | Implementación | Normalización y estado |
| --- | --- | --- | --- |
| Home | `reference-home.png`, 609 × 399 | `home-desktop-final.png`, 1280 × 838 | Fuente escalada proporcionalmente a 1280 px; visitante. Comparación `qa-home-final-paired.png`. |
| Comunidad | `reference-feed.png`, 230 × 443 | `feed-mobile-final.png`, 390 × 844; `feed-320-final.png`, 320 × 780 | Fuente escalada a 390/320 px sin recortar contenido; implementación demo etiquetada con publicación local. La captura final de 320 px elimina el aviso temporal y muestra publicación/acciones completas antes de la navegación. Pares `qa-feed-paired.png`, `qa-feed-320-final-paired.png`. |
| Perfil propio | `reference-profile.png`, 201 × 358 | `profile-mobile-final.png`, 390 × 844 | Fuente escalada a 390 px. Perfil local explícito, cifras derivadas de datos locales. Par `qa-profile-paired.png`. |
| Perfil público | `reference-profile.png`, 201 × 358 | `public-profile-mobile-final.png`, 390 × 844 | Fuente escalada a 390 px. Native `getScreenshot` validado por el agente principal: CSS 390 × 844, DPR 1, sin overflow. Comparación `qa-public-profile-final-paired.png`. |
| Equipos | `reference-teams.png`, 400 × 358 | `teams-mobile.png`, 390 × 844; `teams-desktop.png`, 1280 × 838 | Fuente desktop; versión móvil adaptada a dos tarjetas posibles, una a <=360 px. Capturas desplazadas con filtro nombre/nivel activo y un único equipo local; no se evalúa una supuesta población de ocho equipos. Pares `qa-teams-mobile-paired.png`, `qa-teams-paired.png`. |
| Encuentro | `reference-event.png`, 280 × 443 | `event-mobile-final.png`, 390 × 844; `event-desktop.png`, 1280 × 838 | Fuente escalada a 390 px. Ficha local de torneo propio con datos de prueba; no se compara la CTA de inscripción de un visitante con la gestión del propietario. Par `qa-event-paired.png`. |
| Formulario | `reference-create.png`, 208 × 443 | `create-new-390.png`, 390 × 844; `create-new-320.png`, 320 × 780 | Fuente escalada a ancho equivalente. Estado nuevo sin guardar, privacidad seleccionable y CTA «Publicar encuentro». Pares `qa-create-new-390-paired.png`, `qa-create-new-320-paired.png`. Las capturas anteriores de edición se conservan como historia, no prueba de creación. |
| Registro | `reference-registration.png`, 273 × 399 | `registration-desktop.png`, 1280 × 838 | Panel de origen escalado a 550 px y captura a 840 px sólo para la comparación de composición; no se presenta como igualdad de viewport. Par `qa-registration-paired.png`. |
| Acceso | `reference-login.png`, 293 × 398 | `login-desktop.png`, 1280 × 838 | Comparación de composición equivalente a Registro. La captura está desplazada y el logo del panel queda fuera del recorte visible; no se interpreta como un defecto de maquetación. Par `qa-login-paired.png`. |
| Mensajes reales | `reference-messages.png`, 389 × 358 | `messages-desktop-production.png`, 1280 × 838; `messages-mobile-production.png` y `messages-list-mobile-production.png`, 390 × 844 | Fuente desktop. Par desktop de composición con fuente a 650 px y captura a 1000 px; móvil conserva screenshot nativo y fuente a 390 px. DOM móvil CSS 390 × 844 / DPR 1 / sin overflow, confirmado por root. Pares `qa-messages-desktop-production-paired.png`, `qa-messages-mobile-production-paired.png`, `qa-messages-list-mobile-production-paired.png`. |

Las capturas locales de 390 × 844 y 320 × 780 se tratan como salidas de densidad 1 suministradas por el agente principal. Este revisor no abrió navegador ni verificó por sí mismo el `deviceScaleFactor`. Los pares se generaron con Pillow, sin modificar el contenido de las capturas, únicamente escala proporcional y rótulos externos de comparación. El editor no alteró las imágenes de producto para hacerlas pasar.

## Cinco superficies de fidelidad

- **Fuentes y tipografía:** los titulares sans de gran peso, el verde de «mundo» y la jerarquía título/copy/botón reproducen la intención del tablero. Home final se inspeccionó también en `qa-home-typography-focused.png`: mantiene las dos líneas y la escala display corregida a 112 px. Los textos reales largos del perfil/evento envuelven limpiamente. El origen reducido/AI impide certificar una familia o antialiasing idénticos; no se inventa esa precisión. Formularios conservan texto de entrada de 16 px en móvil y cuerpos legibles. El truncado del compositor compacto indica un disparador, no un texto ya escrito.
- **Espaciado y ritmo:** Home vuelve a una composición equilibrada texto/foto; perfiles usan portada, avatar superpuesto, datos y acciones agrupados; equipos usan tarjetas centradas, filtros coherentes y CTA al detalle. Las diferencias de contenido local/real justifican menor densidad de tarjetas. La fila extra de Comunidad a 320 px está resuelta: personas permanece junto a las fuentes, portada de 156 px y CTA de publicación en el compositor. La primera tarjeta y sus acciones ya aparecen antes de la navegación inferior. La altura adicional de la galería en creación/edición corresponde a la función solicitada.
- **Colores y tokens:** verdes oscuros para marca/CTA, verde pálido para selección y fondo, blancos para tarjetas; campos, bordes y navegación conservan contraste visible. El botón Publicar ya tiene texto visible sobre blanco. No se observan nuevos botones blancos sin rótulo en capturas finales. Este pase es visual; la prueba de contraste computada y estados completos de foco corresponde al agente principal.
- **Calidad y fidelidad de imágenes:** Home conserva el jugador de espaldas y la luz de tarde; las portadas usan campos genéricos día/focos/torneo, sin nombres ni convocatorias falsas. Perfil usa balón y botas con etiqueta ilustrativa. Se ven recortes nítidos y consistentes; no hay halos o deformaciones evidentes. Las iniciales reales sustituyen únicamente una foto que esa cuenta no tiene, y los equipos no reciben escudos ficticios. La paleta y la fotografía mantienen la dirección elegida sin copiar identidades del tablero.
- **Copy y contenido:** «Del barrio al mundo», «Únete a la comunidad», «Bienvenido de vuelta» y Comunidad conservan el tono del diseño. Se han retirado cifras de usuarios, partidos/equipos inventados y ubicaciones simuladas. Datos demo están marcados como locales. El núcleo real utiliza Google; Apple, email/contraseña y llamadas/adjuntos no aparecen como funciones falsas. En producción las imágenes propias, vídeos y reels continúan sujetos a la financiación/infraestructura pendiente; las portadas estáticas gratuitas sí son seleccionables.

## Desviaciones aceptadas y límites

1. Las cifras ficticias del tablero se sustituyen en Home por beneficios verdaderos y en perfiles/equipos por datos del registro correspondiente. La prueba local nunca se confunde con población de producción.
2. No se copia el mapa decorativo como si representara encuentros cercanos reales. La tarjeta lleva una imagen ilustrativa y enlaza al descubrimiento existente.
3. Se mantiene la autenticación real con Google y se omiten proveedores/campos aún no implementados. El usuario llega luego a su perfil deportivo.
4. Los avatares de iniciales y la ausencia de escudos falsos respetan cuentas y equipos todavía sin foto/logo propio.
5. En Comunidad, Comunidad/Siguiendo y tipos de publicación son filtros reales; no se reproducen tabs estáticas que sugieran una consulta que no existe. El buscador explica su alcance sobre contenido cargado.
6. La galería del encuentro agrega una función real solicitada: tres portadas genéricas reemplazables desde edición. Se distingue de la carga de archivos propios, todavía deshabilitada en cloud.
7. La navegación inferior móvil y los objetivos táctiles mayores amplían algunos controles respecto al tablero reducido. Es una adaptación funcional. La fila adicional identificada a 320 px se corrigió y se recapturó.

## Historial de comparación e iteraciones

| Incidencia previa | Corrección | Evidencia posterior | Resultado del pase |
| --- | --- | --- | --- |
| P1: Publicar aparecía como rectángulo blanco sin rótulo visible en la portada verde. | Color del rótulo/icono corregido en el botón blanco. | `qa-feed-before-paired.png` frente a `qa-feed-paired.png` y `qa-feed-320-paired.png`. | Resuelta visualmente a 390/320 px. |
| P2: Cabecera propia separaba eyebrow, título y cierre de sesión en varios bloques, retrasando la tarjeta de identidad. | Cabecera compactada; título y cierre en una fila, eliminado eyebrow redundante. | `qa-profile-before-paired.png` frente a `qa-profile-paired.png`. | Resuelta en la captura final. |
| P2: Home necesitaba escala display mayor y equilibrio del área fotográfica. | Agente principal ajustó H1 a 112 px y foto a 510 px y eliminó icono de perfil duplicado. | `home-desktop-final.png`, `qa-home-final-paired.png`, `qa-home-typography-focused.png`. | Pase posterior sin P1/P2 de composición. |
| P2: Comunidad creaba una fila adicional de descubrimiento a 320 px y retrasaba el post. | Personas en la misma fila, portada de 156 px, CTA móvil en compositor y recaptura sin aviso temporal. | `qa-feed-320-paired.png` frente a `qa-feed-320-final-paired.png`; post/acciones completos visibles. | Resuelta tras comparación. |
| Hueco de estado: capturas create eran de edición. | Se abrió un encuentro nuevo sin guardar a 390/320 px. | `qa-create-new-390-paired.png`, `qa-create-new-320-paired.png`. | Resuelto; campos, privacidad y galería reales legibles, CTA inferior visible. |
| Hueco de densidad: perfil público 390 × 255 con canvas escalado. | Native `getScreenshot` y cierre del banner de instalación; CSS 390 × 844 / DPR 1 / overflow false registrados por root. | `qa-public-profile-final-paired.png`, `public-profile-mobile-final.png`. | Resuelto; portada, avatar, nombre, recuentos y acciones legibles al ancho real. |
| Hueco de estado: la demostración no contiene una conversación real. | Se abrió en producción la conversación existente entre las cuentas del propietario, sin enviar mensajes nuevos, y se comprobó Volver a mensajes. | Tres pares `qa-messages-*-production-paired.png`; CSS móvil 390 × 844 / DPR 1 / sin overflow. | Resuelto; lista/conexión real, dos mensajes, composer y navegación legibles. Consola de producción `errors: []` según root. |

La inspección se basó en fuentes e implementaciones abiertas juntas mediante `view_image`; no en memoria del código. Los controles y textos se leen en los pares móviles a su ancho normalizado. Home tiene además el recorte focal de tipografía. Los recapturados de creación y perfil público ya tienen estado/escala comparables. La conversación real de producción se comparó también en tres estados: split desktop, conversación móvil y lista móvil, cerrando el último hueco de evidencia.

## Interacciones y accesibilidad: cobertura de este pase

Este revisor no operó navegador. El agente principal informa estas comprobaciones UI sobre un entorno local explícitamente etiquetado:

- Crear torneo con portada nocturna, editar a portada de día y recargar: conserva la elección.
- Publicar texto sin título, añadir un me gusta y un comentario: la tarjeta muestra 1/1, datos sólo locales.
- Crear un equipo de prueba local; filtros nombre/nivel: Profesional muestra 0 y Amateur muestra 1.
- Creación nueva a 390/320 px; las portadas y privacidad son seleccionables y el botón inferior permanece visible.
- Perfil público recapturado a 390 × 844, DPR 1, sin overflow; portada etiquetada, avatar de inicial y datos/acciones legibles.

Consola antes del intento de Google: `[]`, según inspección del agente principal. El acceso Google del entorno localhost falló por dominio no autorizado; es la restricción esperada del proveedor y no se amplió Firebase Auth para esta revisión. No se atribuye a la captura del botón un acceso local exitoso. El agente principal revisó después el chat real en `lacantera.web.app` con la cuenta propietaria existente: dos mensajes guardados, Volver a mensajes con la lista/conexión real, DOM móvil de ancho 390 px sin overflow y consola de producción `errors: []`. El revisor visual inspeccionó las tres capturas juntas con su fuente.

Se observan etiquetas legibles, foco visible en formularios, objetivos móviles amplios y estados de demo separados de producción. No se detecta navegación persistentemente ocultada. En la conversación móvil, el botón volver, el historial y el compositor permanecen visibles; la lista se presenta en su propia pantalla en lugar de forzar dos columnas a 390 px. Instalar PWA/cámara/seguridad tienen pruebas históricas; este pase no pretende repetirlas a partir de imágenes.

## Comprobación final de Mensajes

- Tipografía/ritmo: encabezados y nombres legibles, lista compacta en escritorio y pantalla independiente en móvil. Los mensajes largos envuelven dentro de sus burbujas sin recortar texto.
- Colores: mensajes propios verdes, respuesta recibida sobre verde/gris pálido, superficies blancas y separadores suaves. El botón de envío vacío aparece deshabilitado; no se confunde con una acción activa.
- Contenido: la prueba técnica y «Recibido» son los mensajes existentes de las cuentas reales del propietario. No se copian nombres, conversaciones, estados online, llamadas o adjuntos ficticios del tablero.
- Responsive: desktop conserva lista/conversación; móvil oculta la lista dentro del hilo y muestra un botón volver. La recaptura de lista contiene la conexión real y su búsqueda. CSS móvil 390 × 844, DPR 1, sin overflow según DOM verificado por root.
- Evidencia conjunta: `qa-messages-desktop-production-paired.png`, `qa-messages-mobile-production-paired.png`, `qa-messages-list-mobile-production-paired.png`, abiertas mediante `view_image`. Los controles son legibles en esos pares; no hizo falta un recorte adicional para esta región.

## Persistencia de portadas en producción

Root comprobó en el encuentro privado técnico existente, sin participantes, la selección «Bajo los focos», guardado con motivo técnico, cierre del formulario y recarga. El DOM posterior contiene `.ce-event-cover img` con `src='/images/design-2026-10/event-night.webp'` y etiqueta «Imagen genérica». Consola `errors: []`. Evidencia proporcionada: `cover-picker-production.png`, `event-cover-production-saved.png`.

Esta prueba no crea convocatorias públicas ficticias ni cambia horario o privacidad. La galería estática gratuita es reemplazable por el organizador; no se presenta como carga de archivos propios. No se activaron Storage, facturación, reels ni nuevos proveedores de autenticación.

## Cierre de QA

1. Comunidad mínima, creación nueva y perfil público comparados después de sus correcciones.
2. Chat real comparado en tres estados con lectura de mensajes existentes, navegación y consola verificadas por root.
3. Portada genérica persistida y recargada en un encuentro privado de prueba en producción.
4. Sin P0/P1/P2 abiertos en este pase: `final result: passed`. Los límites funcionales y las restricciones de datos reales permanecen documentados; un pase visual no elimina esas restricciones.

## Pulido posterior (P3)

- Unificar el tratamiento visual del foco en la búsqueda de Equipos: ahora el input interno muestra una segunda cápsula dentro del campo completo. Usar `:focus-within` en el contenedor y evitar doble contorno mantiene accesibilidad con menos ruido.
- Tras obtener imágenes propias financiadas, conservar siempre la portada gratuita y su etiqueta cuando no exista un archivo del organizador. No sustituirla por una imagen arbitraria que parezca un evento real.
- Un estado de ficha para visitante y un grupo con nombre largo ayudarán a validar los textos de CTA, sin añadir cuentas o estadísticas ficticias a producción.
