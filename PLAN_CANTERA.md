# LaCantera: plan de producto y ejecución

Versión 1.1 · 13 de octubre de 2026. Estado consolidado del núcleo desplegado en piloto y preparación de apertura. La Comunidad distingue publicación escrita y logro; la nueva marca verde y esta ampliación están validadas localmente. Backend actualizado el 13 de octubre; la publicación de frontend y los índices finales se acreditan en el recibo de entrega. Relacionado con [Whitepaper 1.0](WHITEPAPER.md), [comparación competitiva](docs/COMPETITIVE_BASELINE.md) y [puerta de publicación](docs/RELEASE_REVIEW.md).

El alcance completo se define mediante resultados y controles verificables. No se atribuyen porcentajes de avance al código, a la documentación o a las pruebas. El núcleo de texto está publicado en Firebase Hosting con backend activo para dos cuentas autorizadas en el piloto. El registro público sigue cerrado. El [estado consolidado](docs/RELEASE_2026-10-13.md) recoge la última entrega verificada y las comprobaciones aún pendientes; una edición documental no acredita las mejoras de código posteriores.

## 1. Decisiones de producto

| Tema | Decisión y situación |
|---|---|
| Entrada | Organizar partidos y torneos de fútbol gratuitamente; conectar personas, grupos, equipos amateurs/profesionales y clubes. |
| Gratuidad | El núcleo de coordinación, participación y texto no introduce una cuota de organización. Campo, transporte o árbitros externos no se presumen gratuitos. |
| Financiación | El propietario eligió esperar patrocinador antes de habilitar infraestructura de medios/facturación. No hay patrocinio o fondos confirmados documentados. |
| Medios | Fotos/reels en demostración local; nuevas cargas cloud denegadas en servidor. Una futura apertura necesita financiación, cuotas, inspección de archivos y limpieza operativa. |
| Identidad | Perfil deportivo público; edad autodeclarada y aceptación en cuenta privada. Verificación manual por administrador, sin sello automático de talento o resultados. |
| Edad | Beta adulta, 18+ autodeclarado. Tutores, consentimiento juvenil y garantías por territorio siguen pendientes. |
| Alcance internacional | País, ciudad y zona horaria en eventos. La visión global no acredita idiomas, soporte o revisión normativa de todos los territorios. |
| Orientación | Iniciativa sin finalidad lucrativa en esta etapa. No equivale a asociación/fundación constituida. |
| Publicación | Dos puertas: build autorizada para apertura y runtime del servidor abierto. Ausencia/error de configuración falla cerrado. |
| Términos | Versión vigente `2026-10-08`; la fecha documental no sustituye el registro real de aceptación. |

## 2. Recorrido central

**Equipo o persona → evento → inscripción/respuesta → celebración → resultado del organizador → contenido relacionado → siguiente convocatoria.**

Una persona puede explorar lo público cuando el servicio esté abierto, acceder con su cuenta, completar el perfil y participar. Un equipo tiene ficha pública y plantilla privada. Compartir una invitación conserva su destino al iniciar sesión y genera una solicitud que un responsable debe revisar. No acredita representación oficial por escribir un nombre de equipo.

En móvil la navegación inferior y el creador compacto abren acciones rápidas. La comunidad prioriza publicaciones y sus controles; los reels usan visor vertical cuando hay medios reales. El escritorio mantiene la presentación inicial y columnas sociales. Las pantallas sin datos dicen qué falta y no convierten ejemplos en actividad real.

## 3. Matriz completa del alcance actual

La base de esta matriz se publicó en el piloto el 8 de octubre. Las ampliaciones del 13 de octubre se indican expresamente; su backend está desplegado y la entrega de frontend en piloto se acredita en el recibo correspondiente. Publicación y pruebas no equivalen a validación operativa completa: cada área ofrecida necesita su recorrido y permisos comprobados antes de abrir al público.

| Área | Implementación y contrato | Evidencia/estado de esta revisión | Pendiente de apertura o ampliación |
|---|---|---|---|
| Acceso y sesión | Firebase Auth, Google, restauración y cierre; alta real vacía | Dominios verificados; dos cuentas Google admitidas en el piloto | Concluir recorrido completo entre cuentas/dispositivos. |
| Perfil propio | Nombre, biografía, entidad, ubicación, equipo/posición, nivel, mayoría de edad y términos | Dos perfiles completos comprobados; versión de aceptación `2026-10-08` | Revisión del responsable sobre identificación y operación legal. |
| Perfil público | Proyección exclusivamente deportiva, autor por enlace y actividad paginada | `communityPublicProfiles`; edad/consentimiento privados | Reglas desplegadas e inventario sin migración necesaria; cerrar permisos cruzados reales. |
| Directorio | Prefijos de nombre/ciudad/país consultados en servidor, paginación por cursor | Índices remotos READY, incluidos los de herramientas de derechos | Comprobar búsquedas reales; no búsqueda libre global/semántica. |
| Seguimiento/bloqueo | Relaciones reales, Siguiendo, bloqueo/desbloqueo y controles del propio actor | `CommunityContext.tsx`, `FeedPage.tsx` | Prueba con dos cuentas y casos de suspensión. |
| Conexiones | Códigos de 16 caracteres, diez minutos, un uso; QR, lector de cámara/imagen y aceptación recíproca | Interfaz y reglas publicadas en el piloto | Recorrido real, identidad de quien invita y ensayo físico de cámara. |
| Mensajería | Texto entre contactos recíprocos, páginas de 40, actualización y retirada propia | Desplegada en el piloto; permisos de lectura/escritura probados en emuladores | Conversación cloud real y revocación; sin adjuntos, llamadas, E2EE ni push. |
| Equipos/grupos | Ficha pública, plantilla privada, propietario/responsable/miembro | `TeamsContext.tsx`, `teamNormalization.ts`, reglas | Prueba real de privacidad y permisos cruzados. |
| Incorporación | Invitaciones con caducidad, solicitud pendiente y aprobación/rechazo; transferencia y salida | `TeamsPage.tsx`, `teamLogic.ts` | Canales/gestión real; no incorporación automática por enlace. |
| Partidos | Fútbol 5/7/11, 2–64 plazas, país/ciudad/recinto/zona, invitación, aforo y resultado | `EventsPage.tsx`, `logic.ts` | Concurrencia y estados con backend real. |
| RSVP/espera | Sí/no/tal vez para inscritos; espera ordenada, retirada y promoción; avisos internos de plaza | Transacciones y ledger publicados en el piloto | Reglas desplegadas; probar competencia real por plaza y destinatario correcto. |
| Cambios | Motivo, revisión e historial; ledger y avisos a inscritos/espera | `communityEventChanges`, `communityEventNotices` | Cierre de validación e integridad en nube real. |
| Recurrencia | 2–12 ocurrencias semanales/quincenales/mensuales con zona/DST | Expansión de fechas y creación conjunta | Son eventos independientes; no edición conjunta de temporada. |
| Torneos | Liga/eliminatoria 2–32, descansos, pases libres, avance y tabla | Generadores locales y cruces canónicos `communityFixtures` con pruebas emuladas superadas | Reglas de cada cruce desplegadas; cerrar recorrido nube antes de declarar validado. |
| Horario de cruce | Fecha/hora/zona/campo por encuentro generado | Ficha y `.ics` sólo para horarios reales | No inventar horarios ni crear rondas al importar un calendario. |
| Feed | Cronológico, Comunidad/Siguiendo, publicaciones escritas con título opcional y logros con título obligatorio; filtros reales y búsqueda sobre contenido cargado | Nuevos tipos `post`/`achievement` distintos, tarjetas y editor móvil compacto validados localmente el 13 de octubre | Backend actualizado; verificar entrega exacta del frontend en piloto. Sin recomendaciones o contenido ficticios. Fotos/reels sólo visibles al habilitarse o existir medios previos. |
| Interacciones | Likes propios, conteos de servidor por post, comentarios paginados, denuncia y retirada | Suscripción por post visible; sin ventana global de 1.000 interacciones | Verificar permisos, recuentos y errores reales. |
| Medios | Validación local de imagen/vídeo y persistencia demo; interfaz cloud bloqueada | Storage deniega nuevas cargas del cliente | Patrocinio, servicio confiable, límites y despliegue autorizado. |
| Verificación | Solicitud privada; admin aprueba/rechaza y modifica insignia de identidad | `communityVerifications`, custom claim `admin` | Identidad y panel del operador comprobados; atención y prueba de aprobación real. |
| Moderación | Denuncias de publicaciones/comentarios, bloqueo y suspensión; colas paginadas | Administración restringida y pendientes por estado | SLA operativo, reclamación y revisión humana reales. |
| Derechos | Solicitud exportar/suprimir, estados administrativos y herramientas del operador | Baja conservadora publicada; ampliación v2 de actividad del 13 de octubre validada en pruebas unitarias y Firestore Emulator | Ensayo de baja/exportación con actividad y revisión del responsable; ninguna baja de las dos cuentas reales. |
| PWA | Manifest, iconos, instalación admitida y caché estática versionada | `pwa-plugin.ts`; no cachea respuestas Firebase o medios | QA de instalación/actualización; sin escrituras offline ofrecidas. |
| Migración | ISO→Timestamp, prefijos públicos y participantIds, dry-run/relectura/cursor200 | Inventario previo al piloto: un perfil y ningún cambio necesario | Volver a inventariar si aparece legado; invalidaciones no se maquillan. |
| Limpieza | Trigger Gen2 de retirada de posts, transacciones/batches limitados y protección de archivos ajenos | 16 pruebas con dobles históricas; sin desplegar | Financiación, bucket/IAM y prueba real. No baja global/histórico automático. |
| Documentación | Términos, privacidad, almacenamiento, misión/patrocinio y whitepaper | Fuentes versionadas, sin identidad o acta inventadas | Revisión del responsable real y coincidencia con versión desplegada. |

La matriz es un inventario del alcance y de sus puertas, no una aprobación de cada control. La validación de la última entrega está en la sección 15. Reglas, índices, Hosting, Auth, administración y los perfiles del piloto se comprobaron en nube; el recorrido completo y la operación quedan por cerrar. No se reemplazan por el total de pruebas de CI.

## 4. Personas, permisos y equipos

Una cuenta individual puede crear y participar. `amateur`/`professional` es nivel declarado, no privilegio. Una cuenta grupo/club no se considera oficial sin revisión de identidad/representación.

El equipo separa ficha pública y plantilla privada. Propietario, responsable y miembro tienen facultades diferentes; la promoción de responsable no transfiere propiedad. Transferir cambia propietario y membresías de forma atómica. El propietario debe transferir antes de salir. Archivar cierra nuevas incorporaciones y conserva el historial; no cancela automáticamente los eventos asociados.

Un enlace de invitación permite solicitar acceso y caduca. La solicitud se aprueba o rechaza desde la gestión del equipo; no crea por sí sola un miembro. La lista de miembros no aparece en directorios públicos ni debe copiarse a exportaciones de otras cuentas. Los eventos asociados pueden ser organizados por roles autorizados.

## 5. Eventos, capacidad y disponibilidad

El organizador publica lugar, instante, zona IANA, formato, nivel, unidad de inscripción, plazas y condiciones. La plataforma organiza digitalmente: no reserva campo, asigna árbitro, contrata seguro o procesa pagos externos. Cualquier coste externo debe informarse en las condiciones de la convocatoria.

La capacidad significa jugadores o equipos según la modalidad. La inscripción comprueba fecha futura, estado, calendario, duplicación y aforo dentro de la operación. La lista de espera mantiene su orden y evita que una inscripción nueva salte a quien espera. Retirar un inscrito o ampliar/reabrir plazas puede promover al primero mientras el calendario y el estado lo admitan; la promoción genera aviso interno.

RSVP recoge sí/no/tal vez de participantes inscritos. No se presenta una intención como asistencia comprobada. Retiradas y cambios posteriores al cierre de calendario o al inicio del evento tienen límites; la interfaz deriva al organizador cuando no admite una modificación automática.

Editar exige motivo y conserva revisión/historial. Los cambios relevantes y promociones conservan registros durables de destinatarios. Los avisos y comprobantes de entrega se guardan juntos en lotes de cuatro pares. Si falla la conexión o se cierra la pestaña, el organizador puede recuperar los pendientes sin duplicarlos; el comprobante no revela la lectura privada. Esta recuperación requiere una acción del organizador y no envía correos/push. Un estado cancelado permanece visible y no registra actividad celebrada. Los resultados son declaraciones del organizador; confirmación bilateral, disputas y arbitraje independiente siguen pendientes.

## 6. Horarios, recurrencia y calendario

La hora local y la zona determinan el instante UTC. Fechas inexistentes por cambio de hora se rechazan; una hora repetida permite escoger su ocurrencia. País/ciudad y catálogo de zonas ayudan al formulario sin convertir la ubicación en una dirección comprobada.

La creación recurrente produce entre 2 y 12 eventos semanales, quincenales o mensuales. Conserva la hora local al cruzar DST; en recurrencia mensual ajusta el día a un mes corto sin desplazar los posteriores. Cada ocurrencia es independiente. No se promete modificación simultánea de toda una serie ni un planificador anual completo.

`.ics` exporta el evento o los cruces con horario real, con identificadores/revisión y texto escapado. No es sincronización bidireccional ni inventa citas para rondas pendientes.

## 7. Torneos y resultados

Ligas y eliminatorias admiten 2–32 participantes. Una liga usa una vuelta y puntos 3/1/0; la tabla deriva de resultados registrados y conserva partidos pendientes. Los desempates se muestran por puntos, diferencia y goles; un empate restante no acredita un campeón independiente.

La eliminatoria genera pases libres para cantidades impares y exige marcador decisivo, sin empate. Cuando ya existe la ronda siguiente, corregir una anterior puede invalidar su estructura y permanece limitado. El resultado final incluye el marcador decisivo indicado por el organizador; no representa por separado juego y tanda de penaltis.

Los documentos canónicos de cruces y sus reglas están desplegados en el piloto. La suite de seguridad del 8 de octubre comprende 71 casos, incluidos los controles deportivos ya existentes y una liga de 32 equipos con 496 cruces. Los resultados emulados no sustituyen el ensayo real. No basta con validar el formulario o el generador local para declarar cerrado el contrato; el registro público sigue cerrado.

Un logro asociado a un resultado sigue siendo contenido del autor. Una insignia de identidad verificada no certifica el logro, el torneo o la capacidad deportiva.

## 8. Comunidad y relación social

El feed usa cronología y las relaciones de seguimiento existentes. Comunidad/Siguiendo, filtros por formato y paginación no inventan un algoritmo. La búsqueda del feed filtra publicaciones cargadas y explica su alcance; el directorio consulta prefijos en servidor y permite continuar la misma búsqueda con su cursor.

Autores y comentarios enlazan al perfil actual. Los enlaces a una publicación usan una consulta puntual aunque sea antigua. Los conteos por publicación proceden de agregación de servidor; sus comentarios se cargan en páginas. Invitados ven llamadas a acceder, sin recuentos de interacción ficticios cuando no tienen autorización para consultarlos.

La UI permite denunciar publicaciones/comentarios, ocultar, bloquear cuentas y retirar contenido propio. Borrar comentario/publicación, quitar like, dejar de seguir y tramitar derechos no se condicionan a aceptar términos nuevos. Crear contenido o nueva participación sí exige una cuenta activa y condiciones vigentes.

Fotos, reels y logros comparten contexto deportivo. El visor vertical muestra vídeos existentes con controles y pausa fuera de vista. No se crean historias, perfiles, clips o audiencias de relleno. Los medios demo son locales y se identifican como prueba.

## 9. Datos, privacidad y derechos

| Datos | Visibilidad prevista cuando se abra el servicio | Operación |
|---|---|---|
| Perfil deportivo y seguimiento | Públicos | Proyección whitelist, búsqueda/actividad con cursor. |
| Nombre inscrito y datos del evento | Públicos según convocatoria | Informados al participar; no afirmar ubicación privada en una convocatoria pública. |
| Edad/aceptación, bloqueos, derechos | Dueño/administración según recurso | No se trasladan a la proyección pública. |
| Plantilla de equipo | Miembros y administración según reglas | Ficha pública distinta de lista privada. |
| Solicitudes de acceso | Solicitante, responsables y administración según reglas | La solicitud no concede membresía. |
| Invitaciones de equipo | Invitación puntual para el usuario autenticado con su enlace; listado para responsables | El enlace permite solicitar acceso y puede compartirse; no revela la plantilla. |
| Verificación y denuncias | Solicitante o administración según recurso | Evidencia mínima; no publicar documentación sensible. |
| Publicaciones y archivos publicados | Públicos cuando se habiliten | Un enlace de descarga puede difundirse; no prometer confidencialidad del medio publicado. |

El alta real no asigna un usuario demo. Perfil incompleto no aparece automáticamente en el directorio. La aceptación vigente es `2026-10-08`, con registro privado; beta 18+ autodeclarada no equivale a verificación de edad. No se habilitan menores hasta completar tutela, permisos y revisión por territorio.

La solicitud de derechos conserva estados pendiente/en trámite/completada/rechazada. El exportador Admin del operador reúne registros propios con cursor, filtra datos ajenos/credenciales y puede escribir un JSON privado local. No descarga binarios ni ejecuta una supresión. Solicitar, preparar o revisar no equivale a entregar ni eliminar. La ampliación local del 13 de octubre prepara la redacción de referencias del usuario en historial compartido y el archivo privado de mensajes exclusivamente ajenos bajo ID aleatorio, sin UID de la cuenta borrada, para exportación del titular superviviente. Propiedad de equipo, administración, organización activa o esquemas desconocidos siguen exigiendo transferencia/revisión. La validación local de v2 incluye actividad compartida y transacciones en Firestore Emulator; los ensayos operativos y de respaldo se registran por separado; no se ejecuta una baja cloud de las dos cuentas del piloto. La [propuesta de operación](docs/OPERATING_POLICY.md) concreta criterios de conservación, atención y proveedores para revisión del responsable; redactarla no acredita que estén operando. Retenciones, entrega segura, copias y revisión del responsable siguen siendo controles de operación por cerrar.

## 10. Arquitectura y fronteras

React/Vite y HashRouter; Firebase Auth, Firestore nombrado y Storage previsto. Las credenciales Admin permanecen fuera del cliente. El claim `admin` procede de entorno confiable, no de un campo editable o selector del perfil.

La nube nueva usa Timestamp de servidor para creación, cambios y trámites; la UI normaliza en su frontera y admite legado compatible. La migración prepara fechas antiguas preservando el instante, sin `Date.now()` de sustitución. Añade prefijos a perfiles públicos existentes e índices de participantes desde mapas válidos, preservando `teamId`, orden válido y datos deportivos. Relee en transacción, usa cursor de 200 y bloquea documentos inválidos; el inventario previo al piloto no necesitó ninguna transformación cloud.

La PWA cachea el armazón estático y versiona sus contenidos. No cachea datos privados, respuestas Firebase o medios mediante el service worker, ni ofrece una cola propia de escrituras sin red. Instalar la web no equivale a una aplicación nativa o a una cuenta usable offline.

La limpieza preparada reacciona a nuevos borrados de publicaciones. Valida rutas, fechas y generación del archivo y comprueba padres recreados; procesa interacciones en lotes limitados. No limpia huérfanos anteriores ni realiza una baja global. Su despliegue y operación esperan financiación.

## 11. Administración y apertura cerrada por defecto

Colas de verificaciones, denuncias y derechos consultan pendientes y permiten cargar más. Administración puede tramitar, suspender y controlar `communityConfiguration/runtime`. Los avisos del usuario son internos; no se asume envío por correo o push.

`VITE_SERVICE_OPEN=false` permite compilar preparación. Una build abierta pasa por `check:release`: datos reales del responsable y acta de verificaciones reales del proyecto/base, con vigencia máxima de siete días. La ausencia de acta o controles falla la comprobación. No se crean actas aprobadas con resultados de emulador.

El runtime `setup`/`pilot`/`open`/`paused` agrega la puerta del servidor. `pilot` exige una build específica y restringe el acceso a los UIDs de cuentas Google verificadas seleccionadas por el operador. Falta/error equivale a preparación, nunca apertura. `VITE_ENABLE_MEDIA_UPLOADS` no permite sortear Storage: las nuevas cargas del cliente se deniegan hasta disponer de un contrato financiado y protegido. Sponsorización no cambia automáticamente reglas, IAM, facturación o permisos.

## 12. Financiación y límites de coste

El núcleo de organización/texto permanece gratuito como decisión de producto. La infraestructura tiene costes y cuotas del proveedor: lecturas, escrituras, almacenamiento, distribución, procesamiento y atención. Las páginas/cursors y suscripciones por publicación reducen cargas innecesarias; no garantizan coste cero a cualquier escala.

Antes de financiar medios: presupuesto por escenarios reales, límites por usuario, servicio confiable de recepción/inspección, conservación, retirada y observación de consumo. No se presume vídeo ilimitado ni una cuota gratuita permanente. Las alertas requieren atención y no sustituyen un límite técnico.

El patrocinador no compra verificación, resuelve denuncias ni recibe datos personales como contrapartida. Toda presencia de marca se identifica y cualquier conflicto se registra. No se publican acuerdos, logos, ingresos o audiencia no confirmados.

## 13. Hoja de ruta por puertas verificables

| Etapa | Entregable | Condición para cerrar |
|---|---|---|
| Definición | Gratuidad, adulto inicial, identidad, territorios y soporte | Decisiones documentadas y responsable real identificado. |
| Validación local | Cuentas, equipos, eventos, torneo, feed, permisos y herramientas operativas | Todas las suites de esta revisión y QA pasan con alcance registrado; corregir cada fallo material. |
| Configuración real | Reglas/índices, migración, Auth, administración y recuperación | Autorización específica y prueba de cada cambio en proyecto/base correctos. |
| Piloto de núcleo | Equipos y organizadores reales usan agenda, plazas, espera, torneos y texto | Recorridos entre cuentas/dispositivos y atención reales; resultados observados, no demo. |
| Apertura limitada | Build/servidor abiertos, documentos y derechos operativos | Acta basada en verificaciones reales y revisión de publicación completa. |
| Medios financiados | Fotos/reels recibidos, servidos y retirados con límites | Patrocinador/financiación, servicio confiable, cuotas, almacenamiento y limpieza reales. |
| Ampliaciones | Idiomas, push/correo, tutela, disputas y scouting | Necesidad demostrada, presupuesto y permisos/control correspondientes. |

El alcance completo original exige coordinación real de partidos/torneos, equipos y contexto social en los formatos ofrecidos, con persistencia, permisos, soporte, verificación manual y documentación coherente. El núcleo de texto puede abrir primero si pasa sus controles. Esperar financiación de medios no autoriza anunciar el alcance multimedia completado.

## 14. Comparación y piloto propuesto

Spond ya ofrece [organización gratuita](https://www.spond.com/en-us/) y [herramientas para grupos y eventos](https://www.spond.com/features-for-teams-overview/). Gratuidad y recordatorios básicos no bastan para justificar una sustitución. El foco propuesto de Cantera es unir fútbol, torneos y actividad pública; es una hipótesis, no una superioridad comprobada. [Matriz y fuentes](docs/COMPETITIVE_BASELINE.md).

Piloto propuesto: grupos adultos que acepten probar el servicio durante cuatro semanas, después de cerrar seguridad/apertura. Registrar tareas comparables, dispositivo, tiempo, errores y entrevistas. Este piloto de utilidad con grupos aún no se ha realizado. Las dos cuentas de ensayo técnico autorizadas no acreditan grupos inscritos o adopción.

Criterios de éxito propuestos: al menos un partido y un torneo reales completan creación, inscripción, gestión y resultado sin asistencia de desarrollo; se comprueba una promoción de espera con aviso, aprobación de equipo y una solicitud de derechos; el organizador repite voluntariamente una convocatoria y explica su utilidad. Comparar el tiempo y fallos de las mismas tareas con su herramienta actual, sin anticipar mejoras numéricas. Cualquier acceso ajeno, pérdida de inscripción o incapacidad de atender derechos impide cerrar el piloto.

Medir denominadores y origen: cuentas reales activas, convocatorias celebradas/canceladas, continuidad de organizadores, errores, atención y coste observado. No contar visitas del desarrollo, fixtures sintéticos, perfiles demo o recargas como tracción.

## 15. Última entrega verificada y evidencia histórica

La entrega `c7d9764ac1ea09116d8465135d36298efbe4d764` del 8 de octubre superó [CI 37710502909](https://github.com/rommer1997/CANTERA-/actions/runs/37710502909): **344 pruebas** (257 locales, 71 de permisos emulados y 16 de limpieza con dobles), TypeScript y build. Una ejecución aprobada no valida cambios posteriores ni las tareas operativas.

| Control verificado el 8 de octubre | Evidencia y alcance | Pendiente para abrir |
|---|---|---|
| Reglas e índices remotos | Reglas del piloto leídas y coincidentes; 26 índices READY en la base nombrada | Relectura y validación de cualquier cambio nuevo, permisos entre cuentas reales. |
| Auth y administración | Google habilitado, dominios autorizados, claim y panel del responsable comprobados | Atención real de casos y soporte. |
| Runtime y perfiles | Estado `pilot`, dos cuentas Google autorizadas y dos perfiles completados personalmente | Conexión, encuentro privado, chat, revocación y derechos completos entre cuentas. |
| Hosting/PWA | Versión publicada `de7a8e1c52ede866`; hashes de HTML/assets/manifest/SW/whitepaper comprobados; actualización de app ensayada en navegador | Instalación y cámara en teléfonos físicos; rendimiento con redes reales. |
| Respaldo | Un perfil real restaurado y verificado en emulador vacío | Revisión operativa, periodicidad y límites de recuperación; no fue una restauración de producción. |
| Apertura pública | Registro cerrado, sin acta aprobada | Revisión del responsable, soporte, conservación, derechos, recorrido y acta real vigente. |

### Validación local y actualización de backend del 13 de octubre

`pnpm lint`, build piloto de Firebase, **277 pruebas unitarias** y **76 de seguridad emulada** pasan: 353 verificaciones locales, sin volver a sumar las pruebas históricas de limpieza. Cubren el nuevo tipo escrito `post`, la baja v2 con actividad y los permisos de la revisión; no se adjudican a CI o nube hasta verificar su ejecución/publicación. El backend se actualizó sólo en la base nombrada; las reglas se releen idénticas y los 30 índices coinciden. La relectura de las 20:00:42 UTC confirmó los **30 índices READY**. El [recibo de entrega](docs/RELEASE_2026-10-13.md) acredita la publicación exacta del frontend en piloto.

El QA local de interfaz a 320, 390 y 1440 px comprobó escritura sin título, enlace directo, reacción, comentario, recarga, filtros y el título requerido de logro. No es una prueba de login Google ni del recorrido cloud entre las dos cuentas.

La [marca verde](docs/BRAND.md) responde a la dirección del propietario: C blanca propia con balón clásico como punto, nombre LaCantera y derivados PWA. El feed conserva acciones sociales y páginas existentes, oculta filtros multimedia sin habilitación ni archivos previos y reduce el estado vacío. Ningún post o audiencia de relleno acompaña el diseño. Instalación/cámara en Safari físico, recorrido entre dos cuentas reales, correo e identificación publicable siguen pendientes.

### Snapshots anteriores, no estado actual

| Control histórico del 6 de octubre | Resultado de aquel snapshot | Límite |
|---|---|---|
| TypeScript/build | TypeScript y compilación cerrada superados | Consolidar las últimas modificaciones y registrar entorno/resultado. |
| Pruebas TS | 65/65 superadas: dominio, normalización, equipos, migración y exportación | Snapshot de la copia de trabajo; nuevas ediciones necesitan validación propia. |
| Seguridad emulada | 40/40 superadas en la ejecución registrada | Proyecto `demo-*`; no reglas remotas activadas ni cuentas reales. |
| Backend de limpieza | 16/16 superadas con dobles | Trigger sin desplegar/invocar en nube. |
| Navegador | Compilación cerrada comprobada sin errores de consola; aislamiento de evidencia entre dos cuentas locales; móvil 390×844/320×740 sin overflow; editor/visor; equipo privado, aprobación, evento/plazas, espera FIFO, RSVP, edición/historial y avisos | Modo local; primer post en captura390 a unos245px, cinco avisos y uno leído. No entrega cloud/push. |
| Firebase real | Auditoría indica servicio cerrado | Configuración autorizada y dos cuentas, recuperación/derechos y administración. |
| Medios reales | Esperan financiación; create cliente denegado | Servicio de subida/inspección/cuotas y retirada probados. |
| Publicación | No realizada de esta revisión | Acta real, dominio y comprobación del sitio final. |

La ejecución histórica del 6 de octubre sumó **121 casos** de alcances distintos: 65 TS + 40 emulados + 16 con dobles. TypeScript y la compilación cerrada final pasaron en ese snapshot. No acreditó cobertura total, cuentas reales o apertura. En aquel snapshot faltaban datos del responsable y acta; no representa el estado de administración o runtime del piloto posterior.

Histórico separado: [CI 37384779319](https://github.com/rommer1997/CANTERA-/actions/runs/37384779319) sobre `54fd7e98c9469dac60e0fedd53594e778f7b9751` superó TypeScript/build y 49 casos: 14 TS, 19 emulados, 16 de limpieza. La revisión social `c4880af6bdc107fa3f56ced9d106e82b07943bff` documentó 58 casos locales: 19 TS, 23 emulados y 16 de limpieza. **Son evidencias históricas, no el total ni la aprobación de la ampliación actual.** La CI no despliega ni prueba cuentas reales.

QA histórico del dispositivo: liga/copa de tres, corrección/recarga, foto/logro con like/comentario y MP4 sintético reproducido/persistente; MP4 de 91 segundos rechazado. Son datos de prueba locales, no campeonatos celebrados, vídeos cloud o usuarios activos.

## 16. Servicio real y requisitos abiertos

La auditoría inicial del 6 de octubre encontró bloqueo total. El 7 de octubre se aplicaron la primera versión de reglas, 18 índices y dominios Auth. La activación posterior del 8 de octubre publicó las reglas de conexiones/encuentros privados/chat, dejó 26 índices READY y desplegó el frontend del piloto. Runtime está en `pilot`; ya no está ausente. La administración real y dos perfiles del piloto se comprobaron. Estos hechos se consolidan en [RELEASE_2026-10-13.md](docs/RELEASE_2026-10-13.md); los registros previos se conservan como historial.

Quedan para abrir: recorrido completo entre cuentas y otro dispositivo, revisión del responsable de textos y conservación, soporte atendido, derechos y recuperación. Datos declarados del responsable: Rommer, Madrid, España, persona física y Rommer@garitocastizo.com. No se inventan entidad constituida, datos legales adicionales o una aprobación. Medios y Functions esperan financiación. Menores, scouting, correo/push e idiomas adicionales quedan fuera del núcleo adulto inicial.

La preparación del 13 de octubre corrige coherencia documental, identificación de invitaciones, procedimiento de bajas con actividad y Comunidad. La validación local registrada en la sección 15 pasa; publicación y controles operativos reales siguen pendientes. Ningún porcentaje, documento o total de tests sustituye los resultados de nube y la operación humana.

## 17. Versiones y trazabilidad

| Versión | Fecha | Alcance documental |
|---|---|---|
| 0.7 | 6 de octubre de 2026 | Registro de CI histórico de 49 casos y puertas cloud pendientes. |
| 0.8 | 6 de octubre de 2026 | Perfil público/seguimiento y rediseño social; 58 casos locales históricos. |
| 0.9 | 6 de octubre de 2026 | Equipos, espera/avisos, cambios, recurrencia, cruces canónicos en validación, derechos, PWA, paginación y apertura cerrada. Sin anticipar resultados finales. |
| 1.0 | 8 de octubre de 2026 | Chat privado, administración asignada, supresión conservadora y recuperación local; piloto desplegado y CI de 344 casos registrada. |
| 1.1 | 13 de octubre de 2026 | Estado consolidado, bajas v2, publicación escrita/logro distintos y marca verde; 353 verificaciones locales aprobadas, backend actualizado y entrega de frontend registrada por recibo; sin acta ficticia. |

Cada requisito debe enlazar a código, prueba y entorno. Una edición documental no cierra un control; la aprobación de apertura exige la operación efectivamente comprobada. El whitepaper público reproduce la fuente Markdown; el PDF se genera por separado después de congelar esa fuente.

## 18. Historial de la sesión por fases del 8 de octubre

1. Contrato público: corregir anuncios de medios, privacidad y documentación descargable.
2. Funciones: chat privado entre contactos recíprocos y herramientas de gestión de cuenta, sin servicios de pago.
3. Verificación: TypeScript, dominio, reglas emuladas, interfaz móvil y revisión de los procedimientos de datos.
4. Puesta en marcha: publicar el frontend verificado; aplicar sólo permisos concretos autorizados; abrir únicamente tras comprobar administración, cuentas reales y revisión del responsable.

El chat corta acceso y envío al retirar conexión, bloquear, suspender o pausar. Los historiales conservados pueden volver a consultarse al reconectar. No hay cifrado de extremo a extremo, adjuntos, push ni lista global de conversaciones. La exportación sólo incluye mensajes propios, con referencias locales de conversación. En aquel cierre, las bajas compartidas exigían transferencia o revisión. La ampliación del 13 de octubre se describe en la sección 9 y requiere su propio ensayo; no se declara completada por preparar una solicitud.
