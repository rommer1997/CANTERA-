# Acabado coherente de LaCantera — 16 octubre 2026

## Alcance

Se extiende el acabado aprobado de Juega y Comunidad al producto: fondo blanco, verde #006747, bordes #dce5e1, textos secundarios #63717c, radios de 9–12 px, cabeceras de 34/29 px y controles táctiles de al menos 44 px. Inicio conserva su composición de landing. El CSS compartido tiene precedencia sobre los estilos de pantallas cargados de forma diferida.

Equipos: cabecera y Crear compactos, buscador único, filtros secundarios agrupados, pestañas Descubrir/Mis equipos con subrayado, tarjetas con identidad real y acciones de gestión separadas por importancia. Se conservan solicitudes, roles, miembros, invitaciones, edición, agenda, transferencia y archivo. El contador y el texto de búsqueda indican que corresponden a las páginas cargadas.

Mensajes: bandeja con búsqueda, vistas previas y pendientes reales; conversación con burbujas y compositor coherentes. En móvil el hilo ocupa el espacio entre cabecera y navegación, con el compositor por encima de la barra inferior. La recomendación de instalación se conserva en la bandeja y el resto del producto, y se aparta mientras se conversa. Se conservan historial, paginación, lectura privada, errores, bloqueo y eliminación con confirmación.

Perfiles propios y públicos: misma portada ilustrativa existente, escala de avatar/nombre, estadísticas, pestañas y ritmo de tarjetas. Ajustes queda en la esquina superior derecha. La edición enfoca el primer campo; Agenda respeta el enlace `?tab=activity` y se puede volver a Información. Se conservan edición, consentimientos, seguimiento, contacto, compartir, bloqueo, verificaciones y derechos.

Personas, Conexiones/QR, Avisos, detalles y formularios relacionados reciben los colores, bordes y controles comunes. No se cambia el contenido legal ni el estado de servicio. Multimedia sigue desactivada hasta patrocinio. No se añaden personas, clubes, precios, mapas ni distancias ficticias.

## Verificación local

- TypeScript y build de Hosting correctos. 336 pruebas de dominio aprobadas, incluida la nueva regresión de Agenda por enlace. El simulador de hooks del perfil incluye ahora el planificador de foco y el cambio de parámetros del navegador.
- Equipos con los datos demo existentes: filtros sin coincidencias, limpiar, Mis equipos y detalle. En emulador se crea un equipo sintético a 320 px, se abre/cierra edición y se comprueban las acciones de gestión. Nada de esto llega a producción.
- Auth/Firestore Emulator `demo-cantera-ux/(default)`, dos identidades sintéticas: pendiente, apertura/lectura, envío, recepción y respuesta. Perfil público → Mensaje → hilo conserva la conversación. Bloquear continúa accesible en Más opciones; no se bloquea ninguna cuenta real.
- Perfiles: edición enfoca Nombre público, Agenda cambia la URL, Ajustes muestra derechos sin modificar datos ni consentimientos. Invitaciones conserva QR/código y acceso a conexiones. Comprobación visual a 320/430/1280 px y mediciones de ancho; el compositor queda sobre la navegación a 320×780.

Capturas locales en `output/design/app-finish-2026-10-16/`. Las imágenes de emulador están identificadas como pruebas. No sustituyen una prueba física de Safari con teclado virtual, safe areas o cámara.

## Publicación

Publicada en https://lacantera.web.app el 16/10/2026 a las 09:58 Madrid. Fuente `92d43ee97c1e349bbe716cad93dc36e2a1fc8474`; [CI final aprobada](https://github.com/rommer1997/CANTERA-/actions/runs/38870263401): 336 pruebas de dominio, 81 de reglas y 16 de limpieza, **433 aprobadas**. Hosting `2917c33cae21e8da`, release `1792137484491000`. Los 54 archivos coinciden byte a byte con el build; recibo local `.audit/app-finish-hosting-2026-10-16.json`.

Se despliega únicamente Hosting. No se cambian reglas, índices, Functions, Storage, roles ni facturación. En producción se comprueban la actualización de la PWA, Equipos vacío con contador real, bandeja y conversación existentes sin enviar contenido, y el perfil real con su portada cargada. A 430×932 el compositor termina en y=852 y la navegación empieza en y=854,7. Consulta final de consola sin errores.

En el directorio a 320 px la identidad dispone del ancho de la tarjeta y la acción pasa a una segunda fila: se evita que Editar mi perfil comprima el nombre. Capturas públicas `equipos-publicado-430.png`, `mensajes-publicado-430.png`, `chat-publicado-430.png` y `perfil-publicado-430.png` en el directorio de evidencia. No se crean equipos, publicaciones ni mensajes de prueba en producción.

Pendiente en iPhone físico: comprobar la vista instalada y el teclado virtual al escribir en el chat y editar el perfil. La emulación de viewport no acredita estos comportamientos del sistema.
