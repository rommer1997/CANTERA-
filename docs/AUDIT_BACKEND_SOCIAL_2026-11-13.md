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
9. La comprobación visual posterior detectó una colisión CSS en el botón Google: texto `#1f1f1f` sobre verde `#006747` (aprox. 2,45:1). Se restaura su estilo blanco con borde previsto en el diseño original, en acceso y registro, sin cambiar la autenticación ni los otros botones.

Parches: DOMPurify 3.4.17 o superior por la dependencia de jsPDF; Vite 6.4.6; Firebase CLI 15.36.0 y dependencias transitivas compatibles de Firebase Admin 14.5.0. Los overrides de gRPC y body-parser quedan documentados para retirarlos cuando los padres incluyan el arreglo. No se ignoran los avisos en el auditor. CI rechazó Admin 14.5.1 por la antigüedad mínima del paquete: se conserva 14.5.0 con su árbol transitivo corregido, sin excluir el paquete ni reducir esa política.

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

366 pruebas de dominio/operador pasan y TypeScript compila. En el ensayo final aislado pasan 86 pruebas de seguridad más la integración HTTP de push con Firebase emulado. Las herramientas de Functions pasan 16 pruebas. El Worker añade una prueba de creación de esquema en SQLite, rechazo de referencias/estados inválidos y borrado en cascada. Las auditorías `--prod` no devuelven avisos conocidos al terminar la actualización.

Las trazas agregadas se conservan bajo `.audit/backend-*-2026-11-13.*`: integridad de nube, correspondencia de esquema D1, recuperación, dependencias, preflight y pruebas. No se publican snapshots, tokens, suscripciones ni chats en el repositorio. La versión de código `fa6c93932b6f7ce1c42b8f9e748622fcd2b8fdff` pasa las tres tareas de CI de la PR [43342081693](https://github.com/rommer1997/CANTERA-/actions/runs/43342081693) y de push 43342073792. Se publicaron Hosting y únicamente las reglas de la base configurada. Los dos dominios responden por HTTPS con HTML, JavaScript principal y service worker idénticos al build; imagen PNG 1200 × 630, robots y sitemap responden con contenido y tipo correctos. Una lectura posterior confirma 31 documentos sin incidencias de integridad, reglas coincidentes e índices 33/33 listos. No se escribieron documentos deportivos en producción durante estas comprobaciones.

## Ajustes de lanzamiento tras la revisión editorial

El responsable confirma que todavía no hay encuentros reales confirmados. No se han creado partidos, equipos, perfiles ni publicaciones de relleno en producción. Las pruebas del formulario y sus filtros usan exclusivamente un entorno local aislado. También confirma que `hola@lacantera.com.es` no existe: se conserva el correo operativo actual.

- Metadatos Open Graph y Twitter disponibles en el HTML inicial, sin depender de JavaScript. Imagen propia `public/og-image.png`, PNG 1200 × 630, con logo y fotografía ya existentes. Fuente editable en `media/og-card/index.html`.
- Descripción concreta del servicio en portada; marca centrada en «El fútbol nos reúne» y «Del barrio al mundo». Edad mínima de 18 años visible, sin anuncio de una fecha para menores.
- Sello de la portada enlazado a Juega. Crédito en español y copyright con año actual. Retirado el enlace de descarga del Markdown editable del whitepaper.
- Cookies explica las finalidades reales sin referencias a pruebas locales ni nombres de APIs del navegador. Se informa de la preferencia de visita e instalación, sin identificador de seguimiento.
- La recomendación de instalación se muestra con perfil registrado o en una sesión posterior de navegador. Recargar o cambiar de ruta no convierte la primera sesión en segunda. Cerrar el aviso se respeta durante esa sesión; el tutorial sigue accesible manualmente desde la información de la app. No se requiere instalar para utilizar el servicio.
- Retirado el segundo acceso a publicar del feed anónimo. Etiquetas de búsqueda simplificadas, manteniendo paginación y la indicación «esta vista» donde el resultado no representa todo el directorio.
- Nivel de juego independiente de la categoría amateur/profesional. Nuevo campo opcional `communityEvents.skillLevel`: `any`, `beginner`, `intermediate`, `advanced`. Los documentos antiguos sin ese campo se presentan como «Todos los niveles»; no se infiere habilidad a partir de su categoría. Sin migración masiva ni índices nuevos. Exportación y reconocimiento del esquema de supresión conservan el campo válido.
- Reglas validan los cuatro valores y mantienen edición exclusiva del organizador con historial. Un participante no puede añadir ni cambiar ese nivel al inscribirse.
- `robots.txt` y `sitemap.xml` son archivos reales. El sitemap contiene únicamente la URL canónica de portada: no introduce rutas limpias inexistentes ni URLs privadas. Se mantiene HashRouter y los enlaces actuales.

### Límites que permanecen

El sitemap y Open Graph de portada no resuelven la indexación individual ni generan imágenes propias para cada partido/publicación. Eso requiere una fase de rutas normales y respuestas HTML públicas específicas, con pruebas de privacidad y compatibilidad de enlaces. El acceso por email, el correo con dominio propio, los contenidos reales de lanzamiento y la financiación multimedia siguen pendientes; no se anuncian como implementados.

La existencia y descarga HTTP de metadatos e imagen se comprueba en el despliegue. La presentación final y caché de WhatsApp/Facebook deben comprobarse en sus propios clientes; una respuesta HTTP correcta no acredita por sí sola la vista previa de esas plataformas.

Fuentes técnicas: [Open Graph](https://ogp.me/) y [sitemaps de Google](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).


### Comprobación pendiente en clientes sociales

El depurador de Meta se abrió con la URL de portada, pero exige iniciar sesión en Facebook. No se ha probado la vista previa de Facebook ni enviado un mensaje en WhatsApp en nombre del responsable. Queda por pegar el enlace en un chat propio y comprobar título, descripción e imagen; actualizar la caché en el depurador si conserva la portada anterior. Las verificaciones de HTTP y dimensiones sí están completadas.


## Revisión pública A–F solicitada el 13 de noviembre

Se mantienen Firebase, la autenticación y las reglas de datos. Las modificaciones del contexto de comunidad y de los validadores son únicamente textos; la instrumentación se realiza en la interfaz después de que una acción termine correctamente.

| Bloque | Resultado | Archivos principales |
|---|---|---|
| A1 | Whitepaper retirado de la web, generador impedido de republicarlo, rutas retiradas responden 404 y la PWA purga/bloquea sus copias. Se conserva el documento de trabajo del repositorio. | `CommunityPages.tsx`, `firebase.json`, `scripts/pwa-plugin.ts`, `scripts/build_whitepaper_pdf.py`, eliminación de dos archivos de `public/` |
| A2 | Búsquedas, directorio y avisos simplificados; sin jerga de almacenamiento en la política ni avisos de patrocinio en el menú de creación. Cookies tiene versión 2026-11-13. | `PeoplePages.tsx`, `TeamsPage.tsx`, `MessagesPage.tsx`, `FeedPage.tsx`, `CommunityPages.tsx`, `legal.ts` |
| A3 | Español de España y vocabulario «partido», conservando la distinción de torneos. | Componentes y mensajes de `src/community/`; ensayos afectados por el cambio editorial |
| B1 | Umami Cloud elegido y configurado por el responsable. Captura propia por API para enviar rutas categorizadas en cada cambio de hash; sin scripts automáticos, consultas, códigos ni IDs de cuenta. Sin envíos con No rastrear, control global de privacidad, desarrollo o localhost. | `src/config/publicSite.ts`, `analytics.ts`, `src/main.tsx`, `legal.ts`, `CommunityPages.tsx` |
| B2 | Eventos JoinClick, GoogleLoginClick, RegistrationCompleted, MatchCreated y MatchShared. Creación de series cuenta cada partido después de guardar; las ediciones no cuentan como altas. Compartir mide enlace/código copiado, interfaz de compartir completada o enlace a WhatsApp/SMS abierto; no acredita entrega a un destinatario. | `analytics.ts`, `ProfilePage.tsx`, `EventsPage.tsx`, `InvitationDialog.tsx`, `CommunityPages.tsx` |
| C1 | H1 compacto, propuesta concreta, organizar con retorno después de registro y buscar partido; gratuidad y +18 en la primera pantalla. | `clubhouse-home.tsx`, `launch-polish.css` |
| C2 | Tres pasos y tres espacios explícitos para capturas reales, sin simular pantallas ni actividad. | `clubhouse-home.tsx`, `src/config/publicSite.ts`, `public/images/screens/*.svg`, `launch-polish.css` |
| C3 | FAQ de cuatro preguntas con details/summary nativos. | `LandingFaq.tsx`, `clubhouse-home.tsx`, `launch-polish.css` |
| C4 | El sello de la portada ya era un enlace a Juega; se conserva y se comprueba. | `clubhouse-home.tsx` |
| C5 | Instagram y TikTok aportados por el responsable; X oculto mientras no exista. Contacto de feedback con el correo vigente y asunto correcto. | `PublicFooterLinks.tsx`, `src/config/publicSite.ts`, `CommunityPages.tsx` |
| C6 | Marca «Del barrio al mundo» y acceso «El fútbol nos une.»; imagen social regenerada con la foto existente. | `CommunityPages.tsx`, `ProfilePage.tsx`, `clubhouse-home.tsx`, `index.html`, `media/og-card/index.html`, `public/og-image.png` |
| D1 | Recomendación únicamente con perfil completo, tras registrarse o volver a visitar; cierre persistente treinta días. Botón «Cómo instalar» y tutorial manual disponible. Se mantiene la instalación nativa cuando el navegador la ofrece. | `installation.ts`, `InstallRecommendation.tsx`, `ProfilePage.tsx`, `CommunityPages.tsx`, `legal.ts` |
| D2 | Una sola barra de disponibilidad, priorizando actualizar. Un visitante sin controlador previo no recibe aviso de versión antigua. Se conserva «Recargar app» para pestañas antiguas cuando otra pestaña ya activó la actualización, sin descartar formularios automáticamente. | `AppAvailability.tsx`, `CommunityPages.tsx` |
| E1 | Google blanco, texto #1f1f1f, borde 1,5 px, 52 px de alto, radio 14 y foco visible. Contraste de texto aproximado 16,48:1. | `launch-polish.css` |
| E2 | Acceso móvil con imagen decorativa de portada a 300 px, degradado, titular y tarjeta blanca superpuesta; sin segundo logo. | `ProfilePage.tsx`, `launch-polish.css` |
| E3 | Dos columnas desde 768 px, imagen nunca menor de 280 px y menor espacio vacío; misma foto y lema. | `launch-polish.css` |
| E4 | Marco superior consistente en todas las páginas públicas. Mensajes fuera del menú anónimo; Crear lleva al registro conservando el destino. | `CommunityPages.tsx`, `launch-polish.css` |
| F1 | Tamaños CSS inferiores a 12 px elevados; texto secundario y opacidades corregidos. | Hojas de estilo de `src/community/`, especialmente `app-finish.css`, `clubhouse.css`, `launch-polish.css` |
| F2 | Etiquetas a 14 px/peso 600 y ejemplos de entrada más claros sin ser mayores. | `launch-polish.css` |

### Verificación de esta revisión

La compilación de producción y TypeScript pasan. Hay 374 pruebas de dominio/interfaz/operador en verde, incluidas las nuevas pruebas de analítica, cierre de instalación, primera instalación y retirada HTTP/caché de documentos. El aviso de Vite por un chunk mayor de 500 kB ya existía; no se han añadido avisos nuevos de compilación.

En 375×812, 768×1024 y 1366×800 se comprueban portada, acceso sin sesión, proyecto y cookies: doce casos con scrollWidth igual al ancho solicitado y sin textos visibles menores de 12 px. Las acciones de portada y Google están en la primera pantalla. El texto sobre fondos planos de esas páginas supera 4,5:1 (mínimo medido 5,67:1); las fotografías y sus degradados se inspeccionan visualmente y no se presentan como una certificación WCAG completa. Se guardan capturas y mediciones sin datos privados en `.audit/public-polish-2026-11-13/`.

El endpoint de Umami Cloud acepta una vista de verificación con el Website ID proporcionado y CORS habilitado. Su respuesta de sesión no se conserva ni se reutiliza. Esto comprueba aceptación HTTP; la lectura del panel del titular y la comparación de totales quedan fuera de la comprobación de este cliente.

### Datos pendientes y decisiones

- **[DECIDIR]** Entregar las 2–3 capturas reales de C2. Las fuentes, textos alternativos y el indicador `pending` están centralizados en `src/config/publicSite.ts`.
- X permanece sin enlace, conforme a la confirmación del responsable de que todavía no hay cuenta; `TODO_X_URL` queda preparado en esa misma configuración.
- **[DECIDIR]** El texto «Al continuar aceptas…» no describe el flujo vigente: entrar con Google identifica la cuenta y las condiciones se aceptan explícitamente al completar el perfil. Se conserva «Consulta los términos y la privacidad» para mantener ese flujo sin alterar autenticación ni consentimientos. Cambiarlo requiere decidir primero otro flujo de aceptación.
- La pastilla de acceso usa 12 px, aplicando el mínimo de F1 frente a los 11 px propuestos en E2.
- La política dice «sin datos identificativos de tu cuenta», no promete que Umami no reciba IP o agente del navegador: su procesamiento de conexión se informa expresamente. No se envían campos de identificación de personas ni se conservan identificadores analíticos en el dispositivo.

Fuentes del adaptador: [API de Umami](https://docs.umami.is/docs/api/sending-stats), [configuración del tracker](https://docs.umami.is/docs/tracker-configuration) y [privacidad de Umami Cloud](https://umami.is/privacy).

### Inventario completo de archivos de esta revisión

- `firebase.json`
- `index.html`
- `media/og-card/index.html`
- `public/Cantera-Whitepaper.pdf`
- `public/images/screens/crear-partido.svg`
- `public/images/screens/equipo.svg`
- `public/images/screens/lista-jugadores.svg`
- `public/og-image.png`
- `public/whitepaper.md`
- `scripts/build_whitepaper_pdf.py`
- `scripts/pwa-plugin.ts`
- `src/community/ActivityPage.tsx`
- `src/community/AppAvailability.tsx`
- `src/community/CommunityContext.tsx`
- `src/community/CommunityPages.tsx`
- `src/community/ConnectionsPage.tsx`
- `src/community/DirectInvitations.tsx`
- `src/community/EventsPage.tsx`
- `src/community/FeedPage.tsx`
- `src/community/InstallRecommendation.tsx`
- `src/community/InvitationDialog.tsx`
- `src/community/LandingFaq.tsx`
- `src/community/MessagesPage.tsx`
- `src/community/MobileHome.tsx`
- `src/community/PeoplePages.tsx`
- `src/community/ProfilePage.tsx`
- `src/community/PublicFooterLinks.tsx`
- `src/community/QrScanner.tsx`
- `src/community/TeamsPage.tsx`
- `src/community/analytics.ts`
- `src/community/app-finish.css`
- `src/community/audit-fixes.css`
- `src/community/brand.css`
- `src/community/clubhouse-home.tsx`
- `src/community/clubhouse.css`
- `src/community/community.css`
- `src/community/design-refresh.css`
- `src/community/discovery-design.css`
- `src/community/events.css`
- `src/community/feed.css`
- `src/community/fidelity.css`
- `src/community/installation.ts`
- `src/community/invitations.css`
- `src/community/launch-polish.css`
- `src/community/legal.ts`
- `src/community/local.ts`
- `src/community/logic.ts`
- `src/community/messages.css`
- `src/community/mobile.css`
- `src/community/people.css`
- `src/community/qr-scanner.css`
- `src/community/teams.css`
- `src/config/publicSite.ts`
- `src/core/i18n/LanguageContext.tsx`
- `src/main.tsx`
- `tests/account-erasure-auth.security.test.mjs`
- `tests/account-erasure.test.ts`
- `tests/account-export.test.ts`
- `tests/account-messages-export.test.ts`
- `tests/analytics.test.ts`
- `tests/clubhouse-home.test.ts`
- `tests/community-backup.test.ts`
- `tests/delivery-batches.test.ts`
- `tests/event-covers.test.ts`
- `tests/firebase-hosting.test.ts`
- `tests/installation.test.ts`
- `tests/invitation-demo.test.ts`
- `tests/invitation-identity.test.ts`
- `tests/invitation-qr.test.ts`
- `tests/local-media-cache.test.ts`
- `tests/logic.test.ts`
- `tests/manage-pilot.test.ts`
- `tests/messaging-pilot.test.ts`
- `tests/messaging-security.test.mjs`
- `tests/messaging.test.ts`
- `tests/open-community.test.ts`
- `tests/pilot-security.test.mjs`
- `tests/private-events.test.ts`
- `tests/profile-onboarding.test.ts`
- `tests/profile-session.test.ts`
- `tests/pwa.test.ts`
- `tests/qr-scanner.test.ts`
- `tests/security.test.mjs`
- `tests/social.test.ts`
- `vite.config.ts`


### Publicación comprobada de la revisión A–F

Se publica el código `e04642981251fa6156a15cf71577c92af9bbd1b3` tras CI completa correcta: [43348122030](https://github.com/rommer1997/CANTERA-/actions/runs/43348122030). Despliegue limitado a `hosting:cantera`; no se despliegan reglas, índices, Functions ni Worker, ni se modifican documentos de usuarios.

La comprobación final de HTTPS, HTML, JavaScript principal, service worker, imagen social, robots y sitemap coincide byte a byte con el build en `lacantera.com.es` y `lacantera.web.app`. Los dos documentos retirados responden 404 en ambos orígenes. La vista de producción a 375×812 confirma Google de 52 px, fondo blanco, sin avisos superiores para la cuenta anónima, sin desbordamiento y con «Inicia sesión» antes de la barra inferior (el bloque termina en 728,18 px y la barra comienza a 732 px). Se conserva el retorno a la creación del partido después del registro.

El informe visual local completo está en `.audit/public-polish-2026-11-13/revision.html`; las mediciones verifican además que la anchura real del navegador coincide con cada tamaño solicitado. Una última regla elimina un margen heredado con `!important` del antiguo acceso, no solo el borde duplicado del separador.
