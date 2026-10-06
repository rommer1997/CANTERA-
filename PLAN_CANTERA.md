# Cantera: plan de producto y ejecución

Versión 0.9 · 6 de octubre de 2026. Edición de trabajo pendiente del cierre de validación. Relacionado con [Whitepaper 0.8](WHITEPAPER.md), [comparación competitiva](docs/COMPETITIVE_BASELINE.md) y [puerta de publicación](docs/RELEASE_REVIEW.md).

El alcance completo se define mediante resultados y controles verificables. No se atribuyen porcentajes de avance al código, a la documentación o a las pruebas. Esta revisión amplía la implementación local; el servicio real permanece cerrado y la web pública conserva el prototipo anterior.

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
| Términos | Versión vigente `2026-10-06`; la fecha documental no sustituye el registro real de aceptación. |

## 2. Recorrido central

**Equipo o persona → evento → inscripción/respuesta → celebración → resultado del organizador → contenido relacionado → siguiente convocatoria.**

Una persona puede explorar lo público cuando el servicio esté abierto, acceder con su cuenta, completar el perfil y participar. Un equipo tiene ficha pública y plantilla privada. Compartir una invitación conserva su destino al iniciar sesión y genera una solicitud que un responsable debe revisar. No acredita representación oficial por escribir un nombre de equipo.

En móvil la navegación inferior y el creador compacto abren acciones rápidas. La comunidad prioriza publicaciones y sus controles; los reels usan visor vertical cuando hay medios reales. El escritorio mantiene la presentación inicial y columnas sociales. Las pantallas sin datos dicen qué falta y no convierten ejemplos en actividad real.

## 3. Matriz completa del alcance actual

«Código local» indica implementación presente, no servicio productivo validado. Todas las áreas ofrecidas deben quedar cubiertas por las pruebas finales y el recorrido real antes de marcar la apertura completa.

| Área | Código local y contrato | Evidencia/estado de esta revisión | Pendiente de apertura o ampliación |
|---|---|---|---|
| Acceso y sesión | Firebase Auth, Google, restauración y cierre; alta real vacía | `CommunityContext.tsx`, `ProfilePage.tsx` | Dominios y prueba entre cuentas reales. |
| Perfil propio | Nombre, biografía, entidad, ubicación, equipo/posición, nivel, mayoría de edad y términos | Perfil editable con versión `2026-10-06` | Responsable/contacto y operación legal identificados. |
| Perfil público | Proyección exclusivamente deportiva, autor por enlace y actividad paginada | `communityPublicProfiles`; edad/consentimiento privados | Migración, reglas y permisos reales comprobados. |
| Directorio | Prefijos de nombre/ciudad/país consultados en servidor, paginación por cursor | `PeoplePages.tsx`, `profileSearchTokens` | Validación de índices; no búsqueda libre global/semántica. |
| Seguimiento/bloqueo | Relaciones reales, Siguiendo, bloqueo/desbloqueo y controles del propio actor | `CommunityContext.tsx`, `FeedPage.tsx` | Prueba con dos cuentas y casos de suspensión. |
| Equipos/grupos | Ficha pública, plantilla privada, propietario/responsable/miembro | `TeamsContext.tsx`, `teamNormalization.ts`, reglas | Prueba real de privacidad y permisos cruzados. |
| Incorporación | Invitaciones con caducidad, solicitud pendiente y aprobación/rechazo; transferencia y salida | `TeamsPage.tsx`, `teamLogic.ts` | Canales/gestión real; no incorporación automática por enlace. |
| Partidos | Fútbol 5/7/11, 2–64 plazas, país/ciudad/recinto/zona, invitación, aforo y resultado | `EventsPage.tsx`, `logic.ts` | Concurrencia y estados con backend real. |
| RSVP/espera | Sí/no/tal vez para inscritos; espera ordenada, retirada y promoción; avisos internos de plaza | Transacciones y ledger de promoción en revisión | Probar reglas, competencia por plaza y destinatario correcto. |
| Cambios | Motivo, revisión e historial; ledger y avisos a inscritos/espera | `communityEventChanges`, `communityEventNotices` | Cierre de validación e integridad en nube real. |
| Recurrencia | 2–12 ocurrencias semanales/quincenales/mensuales con zona/DST | Expansión de fechas y creación conjunta | Son eventos independientes; no edición conjunta de temporada. |
| Torneos | Liga/eliminatoria 2–32, descansos, pases libres, avance y tabla | Generadores locales y cruces canónicos `communityFixtures` con pruebas emuladas superadas | Reglas de cada cruce y recorrido nube antes de declarar validado. |
| Horario de cruce | Fecha/hora/zona/campo por encuentro generado | Ficha y `.ics` sólo para horarios reales | No inventar horarios ni crear rondas al importar un calendario. |
| Feed | Cronológico, Comunidad/Siguiendo, formatos, búsqueda sobre publicaciones cargadas | Ventana inicial y páginas posteriores; consulta puntual de enlaces antiguos | No recomendaciones de talento ni alcance de búsqueda simulado. |
| Interacciones | Likes propios, conteos de servidor por post, comentarios paginados, denuncia y retirada | Suscripción por post visible; sin ventana global de 1.000 interacciones | Verificar permisos, recuentos y errores reales. |
| Medios | Validación local de imagen/vídeo y persistencia demo; interfaz cloud bloqueada | Storage deniega nuevas cargas del cliente | Patrocinio, servicio confiable, límites y despliegue autorizado. |
| Verificación | Solicitud privada; admin aprueba/rechaza y modifica insignia de identidad | `communityVerifications`, custom claim `admin` | Identidad del operador, atención y prueba real de aprobación. |
| Moderación | Denuncias de publicaciones/comentarios, bloqueo y suspensión; colas paginadas | Administración restringida y pendientes por estado | SLA operativo, reclamación y revisión humana reales. |
| Derechos | Solicitud exportar/suprimir, estados administrativos y exportador del operador | `requestRights`, `export-account.cjs`, pruebas offline | Cerrar procedimiento/documentación, entrega y supresión real. |
| PWA | Manifest, iconos, instalación admitida y caché estática versionada | `pwa-plugin.ts`; no cachea respuestas Firebase o medios | QA de instalación/actualización; sin escrituras offline ofrecidas. |
| Migración | ISO→Timestamp, prefijos públicos y participantIds, dry-run/relectura/cursor200 | 19 casos offline propios; nunca ejecutada en nube | Inventario y ejecución autorizada/revisada; invalidaciones no se maquillan. |
| Limpieza | Trigger Gen2 de retirada de posts, transacciones/batches limitados y protección de archivos ajenos | 16 pruebas con dobles históricas; sin desplegar | Financiación, bucket/IAM y prueba real. No baja global/histórico automático. |
| Documentación | Términos, privacidad, almacenamiento, misión/patrocinio y whitepaper | Fuentes versionadas, sin identidad o acta inventadas | Revisión del responsable real y coincidencia con versión desplegada. |

La matriz es un inventario del alcance y de sus puertas, no una aprobación de cada control. La validación local de esta ampliación está registrada en la sección 15; la validación de nube sigue pendiente. No se reemplaza por el total de pruebas del commit anterior.

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

Esta revisión incorpora documentos canónicos de cruces y comprobaciones de reglas en backend. 40 pruebas emuladas comprueban permisos y datos inválidos, incluida una liga de 32 equipos con 496 cruces. Los resultados no sustituyen el ensayo de nube real. No basta con validar el formulario o comprobar el generador local para declarar seguro ese contrato. El servicio sigue cerrado mientras se revisa.

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

El alta real no asigna un usuario demo. Perfil incompleto no aparece automáticamente en el directorio. La aceptación vigente es `2026-10-06`, con registro privado; beta 18+ autodeclarada no equivale a verificación de edad. No se habilitan menores hasta completar tutela, permisos y revisión por territorio.

La solicitud de derechos conserva estados pendiente/en trámite/completada/rechazada. El exportador Admin del operador reúne registros propios con cursor, filtra datos ajenos/credenciales y puede escribir un JSON privado local. No descarga binarios ni ejecuta una supresión. Solicitar, preparar o revisar no equivale a entregar ni eliminar. Retenciones, entrega segura, baja, copias y responsables siguen siendo puertas de operación por cerrar.

## 10. Arquitectura y fronteras

React/Vite y HashRouter; Firebase Auth, Firestore nombrado y Storage previsto. Las credenciales Admin permanecen fuera del cliente. El claim `admin` procede de entorno confiable, no de un campo editable o selector del perfil.

La nube nueva usa Timestamp de servidor para creación, cambios y trámites; la UI normaliza en su frontera y admite legado compatible. La migración prepara fechas antiguas preservando el instante, sin `Date.now()` de sustitución. Añade prefijos a perfiles públicos existentes e índices de participantes desde mapas válidos, preservando `teamId`, orden válido y datos deportivos. Relee en transacción, usa cursor de 200 y bloquea documentos inválidos; no se ha ejecutado en nube.

La PWA cachea el armazón estático y versiona sus contenidos. No cachea datos privados, respuestas Firebase o medios mediante el service worker, ni ofrece una cola propia de escrituras sin red. Instalar la web no equivale a una aplicación nativa o a una cuenta usable offline.

La limpieza preparada reacciona a nuevos borrados de publicaciones. Valida rutas, fechas y generación del archivo y comprueba padres recreados; procesa interacciones en lotes limitados. No limpia huérfanos anteriores ni realiza una baja global. Su despliegue y operación esperan financiación.

## 11. Administración y apertura cerrada por defecto

Colas de verificaciones, denuncias y derechos consultan pendientes y permiten cargar más. Administración puede tramitar, suspender y controlar `communityConfiguration/runtime`. Los avisos del usuario son internos; no se asume envío por correo o push.

`VITE_SERVICE_OPEN=false` permite compilar preparación. Una build abierta pasa por `check:release`: datos reales del responsable y acta de verificaciones reales del proyecto/base, con vigencia máxima de siete días. La ausencia de acta o controles falla la comprobación. No se crean actas aprobadas con resultados de emulador.

El runtime `setup`/`open`/`paused` agrega la puerta del servidor. Falta/error equivale a preparación, nunca apertura. `VITE_ENABLE_MEDIA_UPLOADS` no permite sortear Storage: las nuevas cargas del cliente se deniegan hasta disponer de un contrato financiado y protegido. Sponsorización no cambia automáticamente reglas, IAM, facturación o permisos.

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
| Ampliaciones | Idiomas, chat/push, tutela, disputas y scouting | Necesidad demostrada, presupuesto y permisos/control correspondientes. |

El alcance completo original exige coordinación real de partidos/torneos, equipos y contexto social en los formatos ofrecidos, con persistencia, permisos, soporte, verificación manual y documentación coherente. El núcleo de texto puede abrir primero si pasa sus controles. Esperar financiación de medios no autoriza anunciar el alcance multimedia completado.

## 14. Comparación y piloto propuesto

Spond ya ofrece [organización gratuita](https://www.spond.com/en-us/) y [herramientas para grupos y eventos](https://www.spond.com/features-for-teams-overview/). Gratuidad y recordatorios básicos no bastan para justificar una sustitución. El foco propuesto de Cantera es unir fútbol, torneos y actividad pública; es una hipótesis, no una superioridad comprobada. [Matriz y fuentes](docs/COMPETITIVE_BASELINE.md).

Piloto propuesto: grupos adultos que acepten probar el servicio durante cuatro semanas, después de cerrar seguridad/apertura. Registrar tareas comparables, dispositivo, tiempo, errores y entrevistas. No hay grupos, participantes o resultados confirmados en esta edición.

Criterios de éxito propuestos: al menos un partido y un torneo reales completan creación, inscripción, gestión y resultado sin asistencia de desarrollo; se comprueba una promoción de espera con aviso, aprobación de equipo y una solicitud de derechos; el organizador repite voluntariamente una convocatoria y explica su utilidad. Comparar el tiempo y fallos de las mismas tareas con su herramienta actual, sin anticipar mejoras numéricas. Cualquier acceso ajeno, pérdida de inscripción o incapacidad de atender derechos impide cerrar el piloto.

Medir denominadores y origen: cuentas reales activas, convocatorias celebradas/canceladas, continuidad de organizadores, errores, atención y coste observado. No contar visitas del desarrollo, fixtures sintéticos, perfiles demo o recargas como tracción.

## 15. Matriz de comprobación y evidencia histórica

| Control de esta ampliación | Estado documental | Cierre requerido |
|---|---|---|
| TypeScript/build | TypeScript y compilación cerrada superados | Consolidar las últimas modificaciones y registrar entorno/resultado. |
| Pruebas TS | 65/65 superadas: dominio, normalización, equipos, migración y exportación | Snapshot de la copia de trabajo; nuevas ediciones necesitan validación propia. |
| Seguridad emulada | 40/40 superadas en la ejecución registrada | Proyecto `demo-*`; no reglas remotas activadas ni cuentas reales. |
| Backend de limpieza | 16/16 superadas con dobles | Trigger sin desplegar/invocar en nube. |
| Navegador | Compilación cerrada comprobada sin errores de consola; aislamiento de evidencia entre dos cuentas locales; móvil 390×844/320×740 sin overflow; editor/visor; equipo privado, aprobación, evento/plazas, espera FIFO, RSVP, edición/historial y avisos | Modo local; primer post en captura390 a unos245px, cinco avisos y uno leído. No entrega cloud/push. |
| Firebase real | Auditoría indica servicio cerrado | Configuración autorizada y dos cuentas, recuperación/derechos y administración. |
| Medios reales | Esperan financiación; create cliente denegado | Servicio de subida/inspección/cuotas y retirada probados. |
| Publicación | No realizada de esta revisión | Acta real, dominio y comprobación del sitio final. |

La ejecución actual registrada suma **121 casos** de alcances distintos: 65 TS + 40 emulados + 16 con dobles. TypeScript y la compilación cerrada final pasan. No se acredita cobertura total, cuentas reales o apertura. La comprobación de lanzamiento falla por los datos legales y el acta real pendientes, como corresponde al servicio cerrado.

Histórico separado: [CI 37384779319](https://github.com/rommer1997/CANTERA-/actions/runs/37384779319) sobre `54fd7e98c9469dac60e0fedd53594e778f7b9751` superó TypeScript/build y 49 casos: 14 TS, 19 emulados, 16 de limpieza. La revisión social `c4880af6bdc107fa3f56ced9d106e82b07943bff` documentó 58 casos locales: 19 TS, 23 emulados y 16 de limpieza. **Son evidencias históricas, no el total ni la aprobación de la ampliación actual.** La CI no despliega ni prueba cuentas reales.

QA histórico del dispositivo: liga/copa de tres, corrección/recarga, foto/logro con like/comentario y MP4 sintético reproducido/persistente; MP4 de 91 segundos rechazado. Son datos de prueba locales, no campeonatos celebrados, vídeos cloud o usuarios activos.

## 16. Servicio real y requisitos abiertos

Auditoría del 6 de octubre: base nombrada en `eur3`, reglas remotas `deny-all`, sin bucket, facturación deshabilitada y dominio Vercel aún no autorizado en Auth. No se ha aplicado un cambio remoto. La revisión automática rechazó sustituir el bloqueo total por acceso a colecciones públicas/privadas; la autorización específica pendiente no la concede este documento.

Puertas abiertas: comprobar la versión publicada y cruces canónicos en nube; identificar responsable/contacto/país y atención; revisión de textos/retenciones/derechos; reglas/índices/migración autorizados; dominios/administración; dos cuentas reales/otro dispositivo; recuperación; acta y despliegue final. Medios y funciones esperan además financiación y comprobación real.

El prototipo público anterior no demuestra que estos nuevos recorridos estén disponibles. No hay una declaración de producto listo para clientes ni una aprobación legal mundial. Los documentos deben actualizarse con evidencia antes de publicar una afirmación diferente.

## 17. Versiones y trazabilidad

| Versión | Fecha | Alcance documental |
|---|---|---|
| 0.7 | 6 de octubre de 2026 | Registro de CI histórico de 49 casos y puertas cloud pendientes. |
| 0.8 | 6 de octubre de 2026 | Perfil público/seguimiento y rediseño social; 58 casos locales históricos. |
| 0.9 | 6 de octubre de 2026 | Equipos, espera/avisos, cambios, recurrencia, cruces canónicos en validación, derechos, PWA, paginación y apertura cerrada. Sin anticipar resultados finales. |

Cada requisito debe enlazar a código, prueba y entorno. Una edición documental no cierra un control; la aprobación de apertura exige la operación efectivamente comprobada. El whitepaper público reproduce la fuente Markdown; el PDF se genera por separado después de congelar esa fuente.
