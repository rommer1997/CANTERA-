# Auditoría de backend, navegación y red social

Fecha: 13 de noviembre de 2026, Europe/Madrid. Revisión del repositorio, lecturas de producción y navegación real en el navegador integrado; las correcciones nuevas se prueban además en local. Las pruebas adversarias y los datos sintéticos se ejecutan en emuladores, no en cuentas públicas.

## Dictamen

LaCantera tiene un núcleo de comunidad funcional: publicaciones de texto y logros, perfiles, seguimiento, contactos recíprocos, chats privados, encuentros, torneos, equipos, invitaciones y moderación. Las pantallas principales tienen enlace directo. Eso no acredita una red social multimedia completa, disponibilidad garantizada o ausencia absoluta de vulnerabilidades.

El mayor trabajo pendiente está en operación y crecimiento: copias cifradas recurrentes con avisos de fallo, recuperación completa de identidades, protección de abuso más allá de las reglas, carga multimedia financiada, búsqueda global y enlaces con vista previa propia para cada contenido.

## Backend observado

| Comprobación | Evidencia de esta sesión |
| --- | --- |
| Base correcta | Firestore nombrado en `eur3`, Enterprise, tier gratuito; la segunda base del proyecto no se modificó. |
| Dominio de lanzamiento | A las 01:17 de Madrid, `lacantera.com.es` ya resuelve a Firebase y responde HTTPS 200 con validación de certificado normal. El dominio anterior también responde. Esto no sustituye un inicio de sesión Google y permisos push desde el nuevo origen en el iPhone. |
| Protección de borrado | Se activó y se leyó `DELETE_PROTECTION_ENABLED`; PITR sigue desactivado. |
| Datos | 31 documentos, 27 raíces revisadas, tres padres virtuales esperados para subcolecciones. Auditoría de invariantes sin incidencias en esa lectura consistente. No es validación exhaustiva de todos los campos. |
| Reglas e índices | Reglas remotas idénticas al repositorio; 33 índices READY con definiciones coincidentes. Sin nuevos permisos para usuarios ni administradores. |
| Identidad administrativa | Cuenta existente verificada y claim `admin` comprobados. Se corrigió el preflight que rechazaba un proveedor Google vinculado con correo distinto del principal. Se mantiene el control del correo principal esperado, UID, cuenta habilitada y claims; no se vincularon cuentas ni se concedieron roles. |
| D1 | Tres tablas y seis índices coinciden con `0001_push.sql`, aplicada el 8 de noviembre. `foreign_key_check` sin violaciones, cero escrituras durante la auditoría. |
| Dispositivos push | La consulta D1 devolvió cero suscripciones y entregas. No acredita recepción actual en un teléfono; repetir activación/recepción con la app cerrada en el origen que se vaya a usar. |
| Recuperación | Se restauraron los 31 documentos de una lectura actual en un proyecto `demo-*` local, verificando campos e integridad. Se retiró la copia del emulador. No se restauró producción ni se guardó un nuevo respaldo persistente. |
| Copias persistentes | La última copia JSON localizada en `output/private` es del 13 de octubre; esta carpeta no contiene copias `.lcb`. No se ha acreditado custodia externa/cifrada o una tarea automática actual. |

El preflight final de apertura en modo `--dry-run` devuelve `unchanged`, servicio abierto, Google habilitado y administrador existente verificado. No se volvió a escribir la configuración de apertura.

## Correcciones preparadas y verificadas

1. Protección de borrado de la base real activada.
2. Auditor `pnpm audit:backend --cloud`: sólo lectura, instante consistente, salida agregada, validación de pares, proyecciones, aforo, miembros, horarios, mensajes y reglas/índices. Las colecciones desconocidas detienen la lectura.
3. Migración de metadatos limitada al proyecto **y** la base autorizados; antes sólo exigía un proyecto no vacío y el nombre de base.
4. Corregido retorno al chat concreto tras acceder/completar perfil; retorno a Avisos preservado; destinos externos, rutas de administración y valores abusivos siguen rechazados.
5. Enlaces inexistentes muestran una pantalla de recuperación y conservan la URL; antes se redirigían silenciosamente al inicio.
6. Cabeceras contra enmarcado y detección incorrecta de tipos, política de referencias, restricción de objetos/base y permisos de cámara/geolocalización propios, sin micrófono. Esta CSP parcial no equivale a una política estricta completa de scripts.
7. Dependencias de producción: 13 avisos iniciales en la app y seis en las herramientas de Functions; tras actualizaciones y parches compatibles, las tres auditorías de producción (app, Functions y push) devuelven cero avisos conocidos. No implica que todos fueran explotables en los flujos actuales. Se añade a CI un bloqueo de avisos altos/críticos de producción.
8. El servidor de desarrollo escucha por defecto sólo en `127.0.0.1`. El acceso LAN, si se necesita para una prueba concreta, debe activarse expresamente; no confundir Vite con un servidor de producción. El servidor temporal de esta auditoría se detuvo al terminar.

Parches: DOMPurify 3.4.17 o superior por la dependencia de jsPDF; Vite 6.4.6; Firebase Admin 14.5.1; Firebase CLI 15.36.0 y dependencias transitivas compatibles. Los overrides de gRPC y body-parser quedan documentados para retirarlos cuando los padres incluyan el arreglo. No se ignoran los avisos en el auditor.

La revisión que incluye desarrollo devuelve cero avisos altos/críticos y cuatro moderados en el árbol de Firebase CLI (`uuid`, `@opentelemetry/core`, `glob`, `minimatch`). No forman parte del bundle público ni del Worker, pero siguen pendientes de correcciones compatibles de sus padres. No se fuerzan cambios de versión mayor para ocultarlos. CI bloquea nuevos avisos altos/críticos también en las herramientas del repositorio principal.

Referencias: [DOMPurify](https://github.com/advisories/GHSA-cg2g-xh64-v4q7), [gRPC](https://github.com/advisories/GHSA-m9gg-hp2v-232j), [body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828). Las herramientas de Functions se conservan preparadas; esta tarea no activa su despliegue, Storage ni facturación.

## Enlaces de pantallas y recursos

Se utiliza `HashRouter`. Las rutas siguientes se añaden al origen, por ejemplo `https://lacantera.web.app/#/feed`. Al usar `lacantera.com.es`, se mantiene la misma parte `/#/...`; el enlace no elimina los controles de acceso.

| Pantalla/recurso | Ruta | Acceso y estado |
| --- | --- | --- |
| Inicio | `/#/` | Público, navegación real revisada. |
| Juega | `/#/play` | Directorio público de eventos públicos. |
| Mi agenda | `/#/play?view=mine` | Sesión; revisada la navegación desde perfil. |
| Partido o torneo | `/#/play/{eventId}` | Enlace por evento; privado sólo para propietario/participantes autorizados. Cubierto por pruebas de reglas. |
| Crear partido/torneo | `/#/play?create=1&type=match` o `type=tournament` | Intención de creación; el formulario es un diálogo y el parámetro `create` se consume al abrirse. No conserva un borrador al recargar. |
| Comunidad | `/#/feed` | Feed público con acciones según sesión. |
| Publicación, foto, vídeo o logro | `/#/feed?post={postId}` | Enlace por publicación, carga directa independiente de la primera página. Fotos/reels nuevos siguen deshabilitados. No se creó un post público para la auditoría. |
| Crear contenido | `/#/feed?create=post` o `achievement` | Intención que abre el compositor, no un borrador persistente compartible. |
| Personas | `/#/people` | Directorio exige cuenta elegible; visitante ve acceso, sin sugerencias de personas. |
| Perfil público | `/#/people/{uid}` | Enlace individual compartible; sólo proyección pública. |
| Mi cuenta/registro/acceso | `/#/profile`, `?intent=login` | Estado según sesión; destino de retorno interno validado. |
| Ajustes/agenda/verificación | `/#/profile?tab=settings`, `activity`, `verify` | Privados; no se comparten como perfiles públicos. |
| Equipos | `/#/teams`, `?view=mine`, `?create=1` | Directorio y gestión conservan estado de vista/intención. |
| Equipo | `/#/teams/{teamId}` | Equipo con enlace propio; plantilla/gestión restringidas según permisos. |
| Invitación a equipo | `/#/teams/join/{inviteId}` | Caducidad, revocación y solicitud comprobadas en pruebas. |
| Conexiones | `/#/connect`, `?tab=invitations` | Privado; escaneo, código y bandejas. |
| Invitación personal/evento | `/#/invite/{code}` | Código secreto temporal; autenticación, destinatario y consumo atómico. |
| Mensajes y chat | `/#/messages`, `/#/messages/{pair}` | Sólo participantes conectados y elegibles; enlace directo no concede acceso. |
| Avisos | `/#/activity` | Bandeja privada. |
| Administración | `/#/admin` | Claim administrativo, no basta iniciar con Google. |
| Proyecto/legal | `/#/about`, `/#/legal/terms`, `privacy`, `cookies` | Públicos; documentos inexistentes llevan a recuperación. |

Los filtros locales del feed, sus menús, cuadros de confirmación y algunas secciones desplegables no tienen URL independiente. No son pantallas de contenido nuevas. Los formularios móviles ocupan casi toda la pantalla, pero siguen siendo diálogos; si se requieren borradores recuperables o compartir una configuración exacta de búsqueda, hay que diseñar esa persistencia.

Los fragmentos `#` funcionan en el navegador, pero el servidor recibe la misma página base. Por tanto no hay metadatos Open Graph individuales por post/evento ni una página HTML distinta para cada perfil. Una red social orientada a difusión necesita una ruta pública estable con metadatos por contenido, excluyendo siempre eventos/chats privados. No se presenta como resuelto por añadir etiquetas genéricas.

## Recorrido visual y accesibilidad

Capturas reales guardadas e inspeccionadas en `.audit/backend-social-2026-11-13/`, fuera de Git. Móvil: 393 × 852; equipos y pruebas sin sesión: escritorio. Las pruebas sin sesión se hacen con un proyecto Firebase `demo-*` aislado. No se inició una cuenta nueva ni se enviaron mensajes a terceros.

| Paso | Pantalla/acción | Salud observada | Captura |
| --- | --- | --- | --- |
| 1 | Equipos y entrada a crear | Navegación clara, directorio vacío real y CTA visible. | `01-teams-desktop.jpg` |
| 2 | Comunidad | Jerarquía social, compositor, seguimiento y personas; sin desbordamiento horizontal a 393 px. Feed vacío en producción. | `02-feed-mobile.jpg` |
| 3 | Perfil propio | Información, agenda, ajustes y perfil público diferenciados. | `03-profile-mobile.jpg` |
| 4 | Ajustes | Grupos de opciones claros; el estado push debe verificarse en dispositivo compatible. La captura inicial contiene la consulta en curso y no acredita activación. | `04-settings-mobile.jpg` |
| 5 | Mensajes | Conversaciones y búsqueda comprensibles; el chat abierto tiene URL específica y controles privados. | `05-messages-mobile.jpg` |
| 6 | Conexiones | QR, código, enlace, mensaje y perfil localizables; el formulario requiere desplazamiento en móvil. | `06-connect-mobile.jpg` |
| 7 | Juega | Filtros agrupados, dos vistas y acción en vacío. No se muestran eventos privados en explorar. | `07-play-mobile.jpg` |
| 8 | Crear | Acciones por intención, ordenadas y sin habilitar multimedia no financiada. | `08-create-mobile.jpg` |
| 9 | Formulario de partido | Campos agrupados y publicación fija al pie; el contenido se desplaza. Foco visible en el primer campo. | `09-event-form-mobile.jpg` |
| 10 | Perfil público | Enlace compartible y estado vacío cargado; no presenta consentimientos ni datos privados. | `10-public-profile-mobile.jpg` |
| 11 | Chat sin sesión | Bloqueo correcto; al ir al acceso conserva `/messages/alice%3Abob`. Prueba local. | `11-private-chat-guest-local.jpg` |
| 12 | Personas sin sesión | No muestra directorio ni sugerencias. Prueba local. | `12-people-guest-local.jpg` |
| 13 | Enlace roto | Nueva recuperación con Inicio/Comunidad, sin ocultar la URL errónea. Prueba local. | `13-not-found-local.jpg` |
| 14 | Administración | Cuenta actual accede al estado abierto y colas; no se accionaron suspensión o pausa. | `14-admin-mobile.jpg` |
| 15 | Inicio | Entrada a jugar, organizar, equipos y contenido coherente con la comunidad. Sin desbordamiento a 393 px. | `15-home-mobile.jpg` |

La navegación móvil mantiene cinco destinos y creación central. Las etiquetas y estados observados ayudan a distinguir seguir de conectar; los controles sensibles no aparecen como enlaces públicos. El árbol accesible muestra nombres en búsqueda, fecha, formato y acciones. Se conserva el diseño actual.

Pendientes de accesibilidad: VoiceOver real, ampliación de texto, teclado virtual sobre el compositor y formularios, contraste/targets exhaustivos de todas las variantes y estados de error. Las capturas no certifican WCAG. Repetir QR, Google y avisos con la app instalada en el iPhone después de actualizar.

## Prioridades para cerrar la operación

| Prioridad | Trabajo | Criterio de cierre |
| --- | --- | --- |
| Alta | Copias cifradas recientes, recurrentes y externas; monitorizar fallos | Restauración comprobada, claves custodiadas por separado, retención y bajas respetadas. El ensayo actual no sustituye esa operación. |
| Alta | Antispam/abuso y cuotas | Los límites de Firestore validan datos, pero no constituyen un límite central de frecuencia para altas/posts. El servidor push sí limita frecuencia. Diseñar App Check y controles de servidor antes de aumentar la exposición. |
| Alta | Revisar dispositivos push del origen de lanzamiento | Activación real y recepción con iPhone bloqueado; hoy D1 no devuelve suscripciones. No confundir una bandeja interna con push registrado. |
| Media | Multimedia | Financiación, almacenamiento, miniaturas/transcodificación, límites, moderación y borrado íntegro. No anunciar subida de fotos/reels como disponible hoy. |
| Media | Búsqueda social global y metadatos por contenido | La búsqueda del feed/equipos se limita a lo cargado; no es un buscador de todo el histórico. Enlaces sociales deben generar vista previa pública específica. |
| Media | Capa de repositorios y migración de identidad | Contratos por dominio, importación aislada, equivalencia de permisos y corte ensayado. Ver `BACKEND_ARCHITECTURE.md`. |
| Media | Observabilidad y carga | Medición de errores/latencia y ensayo de concurrencia/carga representativo de 500 usuarios; no inferir capacidad sólo por número de cuentas. |

No se activaron pagos, servicios de pago, nuevas credenciales administrativas, Storage o Functions. No se ampliaron los permisos de Wrangler para resolver su consulta fallida de Time Travel.

## Validación técnica

361 pruebas de dominio/operador pasan y TypeScript compila. En el ensayo final aislado pasan 85 pruebas de seguridad más la integración HTTP de push con Firebase emulado. Las herramientas de Functions pasan 16 pruebas. El Worker añade una prueba de creación de esquema en SQLite, rechazo de referencias/estados inválidos y borrado en cascada. Las auditorías `--prod` no devuelven avisos conocidos al terminar la actualización.

Las trazas agregadas se conservan bajo `.audit/backend-*-2026-11-13.*`: integridad de nube, correspondencia de esquema D1, recuperación, dependencias, preflight y pruebas. No se publican snapshots, tokens, suscripciones ni chats en el repositorio. El despliegue de Hosting y la CI del commit final se registrarán después de pasar; esta sección por sí sola no afirma que ya esté publicado.
