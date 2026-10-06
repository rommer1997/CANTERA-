# Cantera: plan de producto y ejecución de 0 a 100 %

Fecha de actualización: 6 de octubre de 2026. Responsable de producto y administrador inicial: propietario de Cantera.

Versión del plan: 0.8. Documentos relacionados: [Whitepaper 0.7](WHITEPAPER.md) y [checklist de publicación legal](docs/LEGAL_RELEASE_CHECKLIST.md).

Este documento define el producto completo, su primera versión y las condiciones para lanzarlo. Los porcentajes describen hitos del plan; **no indican que ese porcentaje esté construido, probado o publicado**. La interfaz comunitaria y su integración Firebase están implementadas en la copia local. TypeScript, compilación, 14 pruebas de dominio/normalización, 19 de seguridad con emuladores y 16 de limpieza con dobles de datos/archivos han pasado también en la [ejecución de GitHub Actions del 6 de octubre](https://github.com/rommer1997/CANTERA-/actions/runs/37384779319): 49 pruebas en total, con alcances distintos. El navegador integrado también permitió comprobar recorridos locales de liga, copa y feed. La auditoría del servicio real encontró configuración que todavía impide el lanzamiento. La sección 22 distingue esta evidencia de las tareas pendientes; la CI no despliega servicios ni prueba cuentas reales, y no se declara la aplicación lista para clientes ni desplegada en producción.

## 1. Decisiones confirmadas y decisiones pendientes

| Tema | Decisión |
|---|---|
| Público | Personas individuales, grupos de amigos, equipos amateurs y profesionales, clubes, academias y organizaciones reconocidas. |
| Alcance geográfico | Visión y disponibilidad internacional; eventos localizables por país y ciudad. La difusión inicial se concentra donde haya organizadores activos. |
| Producto inicial | Organizar partidos y torneos gratis, participar y compartir reels, fotos y logros. |
| Verificación | Quien desee verificar su cuenta contacta con el administrador de Cantera mediante una solicitud. El propietario decide manualmente. |
| Modelo económico | Crear, descubrir y gestionar eventos y usar el feed básico permanece gratuito. |
| Financiación inicial | Iniciativa sin finalidad lucrativa en esta etapa, con búsqueda de patrocinio para sostener el servicio. Esta orientación no acredita una asociación o fundación registrada. |
| Activación de medios e infraestructura facturable | Decisión del propietario de 6 de octubre: esperar a un patrocinador. No activar facturación, Storage ni funciones hasta disponer de financiación; `VITE_ENABLE_MEDIA_UPLOADS=false` por defecto en producción. La demostración conserva medios locales. |
| Calidad de entrega | Objetivo de aplicación final para usuarios reales: textos de uso, privacidad y almacenamiento, soporte, datos persistentes y operaciones probadas. Una demostración es solo una herramienta de desarrollo. |
| Documentación pública | Whitepaper versionado con misión, gobernanza, financiación y trazabilidad de requisitos, decisiones y pruebas. |
| Primera tecnología | Aprovechar React/Vite, Firebase Auth, Firestore y Storage; separar claramente demostración y nube. |
| Menores | La visión incluye cantera juvenil. Hasta tener tutor, consentimiento y revisión por territorio, la beta exige mayoría de edad autodeclarada. La declaración no equivale a comprobación de edad. |
| Contacto del administrador | Configurar un canal real de soporte y un UID administrador; no inventar un correo ni usar uno de ejemplo en producción. |
| Lanzamiento internacional | Revisar requisitos aplicables, idiomas, privacidad y soporte antes de promocionar el servicio en cada territorio. No asumir que un único formulario resuelve todos los países. |

## 2. Visión y propuesta de valor

Cantera ayuda a convertir personas que quieren jugar en una comunidad que organiza encuentros, registra su actividad y la comparte. El punto de entrada es útil incluso para alguien que no busca ser fichado: encontrar un partido, reunir jugadores o gestionar un torneo sin pagar una suscripción.

El recorrido central conecta **evento → participación → resultado → contenido → siguiente evento**. Un partido conserva sus participantes, su resultado y las publicaciones asociadas. Un perfil muestra actividad deportiva y logros con su contexto. Un club puede organizar un torneo y descubrir a quienes participaron; un jugador puede mostrar lo que hizo sin depender de una puntuación inventada.

La gratuidad de la organización en Cantera no significa que un campo, un árbitro, transporte o equipación sean gratuitos. El organizador debe declarar cualquier coste externo y sus condiciones antes de la inscripción. La primera beta organiza el encuentro; no reserva campos ni procesa cobros. No debe mostrar un evento como gratuito si participar exige un pago externo oculto.

## 3. Públicos y permisos

| Público | Necesidad principal | Acciones |
|---|---|---|
| Persona individual | Encontrar dónde jugar y mostrar actividad | Crear perfil, publicar, entrar o salir de un evento y crear uno. |
| Grupo informal | Reunir jugadores y fijar un encuentro | Nombrar un responsable, compartir invitación y controlar plazas. |
| Equipo amateur | Organizar amistosos y torneos | Crear equipo, gestionar responsables y plantilla, inscribir al equipo. |
| Equipo profesional o club | Organizar actividad y mostrar identidad oficial | Gestionar eventos, equipo y contenido; solicitar verificación de representación. |
| Academia u organización reconocida | Convocar participantes desde una cuenta institucional | Crear organización, designar gestores, organizar eventos y solicitar verificación. |
| Scout | Descubrir actividad y perfiles | Consultar perfiles, guardar favoritos y solicitar contacto cuando exista ese flujo. |
| Tutor | Supervisar actividad de un menor | Dar o retirar consentimientos y revisar interacciones en la fase juvenil. |
| Administrador | Mantener confianza y operación | Revisar verificaciones y denuncias, retirar contenido y gestionar incidencias. |

El nivel amateur/profesional es información deportiva declarada, no un permiso ni una verificación. Una cuenta puede jugar y organizar. Los permisos dependen de la propiedad del recurso, de la pertenencia a una organización y de privilegios administrativos seguros.

## 4. Primera versión y producto completo

### Primera beta funcional

- Perfil personal con nombre, ciudad, país, nivel, posición y equipo declarado.
- Acceso real con Google cuando esté configurada la nube y restauración de la sesión al recargar.
- Partidos y torneos de fútbol 5, 7 y 11, con inscripción individual o por nombre de equipo bajo responsabilidad de una persona.
- País, ciudad, recinto, fecha, zona horaria, plazas, nivel y reglas visibles.
- Inscripción, retirada, cierre y cancelación; edición y resultados reservados al organizador.
- Partidos de 2 a 64 inscripciones; torneos de 2 a 32 participantes, con el mismo límite en formulario, validación y generación de calendarios.
- Feed con reels, fotos y logros, comentarios y reacciones básicas.
- Solicitud de verificación manual desde el perfil y estado visible de su tramitación.
- Experiencia adaptable a móvil, estados vacíos, errores comprensibles y modo demostración explícito.

Un nombre de equipo en una inscripción no acredita representación oficial. Las páginas institucionales, plantillas y permisos de varios gestores son una siguiente fase; la beta permite que su responsable organice desde su cuenta.

### Producto completo del alcance inicial

Añade organizaciones y equipos con gestores, notificaciones, listas de espera, resolución de disputas, herramientas completas de administración, moderación, procesamiento de medios, consentimiento de tutores, privacidad internacional revisada, analítica operativa y despliegue con recuperación comprobada. Las funciones de scouting amplían la comunidad una vez que esta genera actividad real.

Reservas de campos, pagos, escrow, aplicaciones nativas, retransmisión en directo, clasificaciones deportivas automáticas y recomendaciones de inteligencia artificial no forman parte de este primer 100 %. Se pueden planificar después con necesidades y costes validados.

## 5. Experiencia y navegación

La entrada móvil ofrece agenda y accesos a jugar, organizar y comunidad; la navegación inferior contiene Inicio, Juega, Crear, Comunidad y Perfil. En escritorio se conserva la landing y la cabecera añade Gente para descubrir cuentas. «Crear» permite elegir Partido, Torneo, Reel, Foto o Logro; los medios cloud permanecen pendientes de patrocinio. La verificación y el soporte se encuentran en el perfil; las herramientas administrativas aparecen solo a cuentas autorizadas.

Las rutas deben permitir compartir enlaces a eventos, publicaciones, perfiles y, después, equipos. Abrir un enlace conserva su destino durante el inicio de sesión. Nadie necesita crear una cuenta para entender qué ofrece Cantera; las acciones de escritura sí exigen una cuenta válida. La visibilidad pública de participantes y ubicación se decide de forma explícita para cada tipo de evento.

### Registro

1. La persona accede y ve si está en demostración o conectada a la nube.
2. Crea su perfil, país y ciudad y declara su nivel; acepta las condiciones aplicables.
3. La beta requiere mayoría de edad autodeclarada. Si no se cumple, explica que el acceso juvenil depende del flujo de tutores todavía pendiente.
4. Puede descubrir eventos, participar o publicar. Los cambios sobreviven a la recarga en el entorno elegido.
5. Si representa una organización o quiere verificar su identidad, envía una solicitud al administrador.

## 6. Partidos: recorrido y reglas

El organizador define título, fútbol 5/7/11, nivel, modalidad de inscripción, país, ciudad, recinto, fecha, hora local, zona horaria IANA, capacidad, descripción y reglas. Los eventos abiertos requieren país y ciudad. Se guarda el instante en UTC y se muestra la hora con la zona del evento; la zona del navegador no debe mover silenciosamente el horario del organizador. Los horarios ambiguos por cambios estacionales deben poder comprobarse antes de publicar.

La capacidad cuenta **jugadores** en inscripción individual y **equipos** en inscripción por equipos. El formulario y el contador deben nombrar la misma unidad. El número de futbolistas que caben en el campo no tiene que ser igual al total de convocados: puede haber suplentes o varias rotaciones.

La base actual acepta aforos de 2 a 64 para partidos y de 2 a 32 para torneos. El formulario y la validación rechazan torneos de más de 32, igual que el generador. Los 64 posibles inscritos de un partido no se presentan como capacidad de un torneo.

1. El organizador crea un evento abierto y comparte el enlace.
2. Un participante revisa ubicación, horario, requisitos y costes externos, si existen.
3. Se inscribe una vez; puede retirarse mientras las reglas del evento lo permitan.
4. Dos personas que intentan tomar la última plaza no deben superar la capacidad. La operación tiene que validar el estado y la capacidad de manera atómica.
5. El organizador cierra inscripciones, confirma los detalles y comunica cambios.
6. Tras el encuentro, registra el resultado o la actividad y publica contenido asociado.

Los cambios de recinto, horario o coste después de una inscripción requieren aviso y posibilidad de retirada. Cancelar conserva un estado visible y el motivo, y no finge que el encuentro ocurrió. Más adelante, una lista de espera admite al siguiente participante cuando haya una plaza, con un plazo de confirmación.

No se asignan árbitros, seguros, permisos del recinto ni reservas de forma automática. El evento debe indicar quién se responsabiliza de estas gestiones cuando sean necesarias.

## 7. Torneos: recorrido y resultados

El responsable configura modalidad de inscripción, participantes máximos, formato, reglas de puntuación y desempate, lugar y horario. Cierra la lista antes de generar el calendario. Una vez iniciada la competición, cambiar participantes exige un procedimiento explícito y una versión nueva del calendario.

### Liga

- Primera versión: de 2 a 32 participantes y una vuelta, cada participante contra todos los demás; doble vuelta como ampliación.
- Con número impar, una jornada de descanso; sin enfrentamientos contra sí mismo ni parejas duplicadas.
- Regla base declarada: victoria 3 puntos, empate 1, derrota 0; cualquier variante debe estar configurada antes de empezar.
- Tabla con partidos jugados, victorias, empates, derrotas, goles a favor y en contra, diferencia y puntos.
- Desempate documentado: puntos, diferencia de goles y goles a favor; un empate restante se resuelve según la regla publicada, sin inventar un campeón.
- El resultado solo puede contener marcadores enteros no negativos y participantes del encuentro.

### Eliminatoria

- Generar cruces y rondas con una política de sorteo o cabezas de serie visible.
- Primera versión: de 2 a 32 participantes, cuadro con pases libres hasta completar la potencia de dos siguiente y avance de ronda al resolverse sus encuentros.
- Cada partido que avanza de ronda necesita un ganador. La base actual rechaza un marcador igualado y solicita el marcador decisivo, incluidos los penaltis si se usaron; todavía no representa marcador de juego y tanda por separado. La versión completa debe distinguirlos y publicar la regla de desempate.
- No avanzar un participante por defecto cuando faltan marcadores; no permitir un campeón con una final sin resolver.
- La base actual bloquea la corrección de resultados de rondas que ya generaron la siguiente. La versión completa debe permitir al administrador revisar o invalidar los encuentros posteriores afectados mediante un procedimiento auditado.

### Confianza en los resultados

La beta distingue «resultado publicado por el organizador» de una comprobación independiente. Posteriormente, representantes de ambos lados pueden confirmar o disputar el marcador y el administrador puede resolver con evidencia. Cada corrección conserva quién cambió qué y cuándo.

Un torneo terminado puede ofrecer «Publicar un logro» con el evento y resultado como referencia. Esa publicación **no adquiere verificación automática**, aunque el organizador o la cuenta del autor estén verificados.

## 8. Feed original: contenido con contexto deportivo

El feed combina tres formatos en una identidad común. Su diferencia útil es la conexión con actividad real: una publicación puede enlazar al partido o torneo, y un evento puede reunir los contenidos de sus participantes.

| Formato | Presentación | Campos y comportamiento |
|---|---|---|
| Reel | Vídeo vertical con controles y contexto del autor | Texto, vídeo, evento opcional, silencio inicial, pausa fuera de pantalla y carga progresiva. |
| Foto | Imagen amplia y texto | Imagen, pie, autor y evento opcional; texto alternativo cuando sea posible. |
| Logro | Tarjeta deportiva que se conserva en el perfil | Título, descripción, fecha y referencia a un evento o evidencia opcional. Mostrar si es declarado por el autor. |

La entrega social usa orden cronológico, filtros por formato y las vistas Comunidad/Siguiendo con relaciones persistentes. La búsqueda opera sobre las publicaciones mostradas y explica su alcance. Cada autor enlaza a su perfil público; el directorio permite buscar nombre, país y ciudad entre las cuentas cargadas, con paginación. Los filtros globales de ubicación/evento y las recomendaciones requieren más trabajo; no se presentan como funciones ya disponibles. No presentar un feed pequeño como un algoritmo que entiende el talento.

Las reacciones y comentarios se vinculan a un usuario autenticado y respetan bloqueos y retirada del contenido. Compartir utiliza un enlace estable. El autor puede eliminar su publicación; una eliminación debe contemplar también el archivo almacenado y las referencias. Los estados de envío y fallo deben evitar publicaciones duplicadas.

### Subidas de la beta

- Foto: máximo 10 MB; permitir únicamente formatos admitidos y decodificables, por ejemplo JPEG, PNG o WebP.
- Vídeo: máximo 50 MB y 90 segundos; primera compatibilidad con MP4/WebM reproducibles en los navegadores admitidos.
- Comprobar tamaño y tipo antes de enviar y en las reglas de Storage; comprobar duración en el cliente y, para lanzamiento público, en procesamiento confiable de servidor.
- No confiar solamente en la extensión ni en el tipo MIME declarado. Un archivo rechazado debe explicar qué corregir.
- Minimizar metadatos innecesarios, generar versiones adecuadas al móvil y limpiar subidas abandonadas.
- Usar Storage para el archivo y Firestore para los metadatos; no guardar vídeo en un documento ni base64 grande en almacenamiento local.
- El modo demostración debe indicar si sus medios solo se conservan en ese dispositivo. Nunca prometer sincronización entre dispositivos para datos locales.

Los límites son operativos y se pueden ajustar según uso real. El cliente puede comprobar tamaño y duración para mejorar la experiencia, pero la protección del servicio exige validar también en la capa que recibe y procesa los archivos. [Reglas de Cloud Storage](https://firebase.google.com/docs/storage/security/rules-conditions).

## 9. Verificación manual y contacto con el administrador

Toda cuenta empieza como `unverified`. «Solicitar verificación» abre un formulario dirigido al administrador con tipo de cuenta, motivo, forma de contacto y enlaces oficiales o pruebas mínimas de representación. Al enviarlo pasa a `pending`. El propietario revisa la solicitud, puede pedir información, aprobarla o rechazarla con motivo. La aprobación cambia el perfil a `verified`; la insignia explica su alcance.

La solicitud tiene su propio historial: abierta, información solicitada, aprobada, rechazada o retirada. Un rechazo devuelve el perfil a no verificado sin perder el historial. Se puede revocar una verificación si cambia la representación, hay suplantación o deja de cumplirse su criterio.

La insignia significa que el administrador revisó la identidad o la representación descrita. No certifica capacidad deportiva, marcadores, contratos, seguridad del evento ni derechos de autor de cada publicación. Un logro necesita una comprobación separada si en el futuro se ofrece ese sello.

Solo un administrador autorizado puede cambiar la condición de verificación. El usuario no puede autoasignarse `verified`, cambiar su rol para obtenerlo ni fabricar un sello en una publicación. El privilegio `admin` se asigna mediante Firebase Admin en un entorno confiable; no mediante una variable del navegador ni un campo editable del perfil. [Custom claims de Firebase](https://firebase.google.com/docs/auth/admin/custom-claims).

En la beta, un formulario interno deja constancia de la petición. Antes del lanzamiento se necesita un buzón realmente atendido y un canal para responder; el propietario debe configurar su contacto. No publicar documentación sensible en el perfil. Solicitar únicamente evidencia necesaria y definir su acceso y plazo de borrado.

## 10. Menores, privacidad y confianza

El producto juvenil exige un recorrido específico: perfil del menor vinculado a un tutor, comprobación de la relación, consentimiento versionado, permisos de publicación y participación, retirada del consentimiento y controles de contacto. Debe contemplar que la edad relevante, el consentimiento y las obligaciones cambian por territorio.

Hasta completar ese recorrido, la beta pide mayoría de edad autodeclarada y no se promociona como segura o habilitada para menores. Esta medida técnica inicial no sustituye una revisión jurídica ni una estrategia de garantía de edad adecuada al público real.

Requisitos de la fase juvenil: datos mínimos; evitar teléfonos y direcciones personales públicos; no mostrar ubicación en directo; permitir al tutor gestionar solicitudes de contacto; limitar mensajes de desconocidos; denunciar y bloquear con facilidad; atender peticiones de retirada de imágenes y datos. El acceso y la difusión de recintos o listas de participantes debe revisarse según el tipo de evento y su audiencia.

Antes de difusión global, definir responsable del servicio, políticas de privacidad y uso, conservación y borrado, tratamiento de transferencias de datos, consentimiento para medición cuando corresponda y procedimiento de atención a derechos en los territorios objetivo. La elección de región de Firebase y de proveedores se toma tras esta revisión; no se migra una base de datos por una suposición.

## 11. Moderación, abuso y derechos del contenido

El lanzamiento público necesita normas breves y accesibles: respeto, ausencia de acoso y discriminación, no suplantación, no exposición de datos personales y permiso para el contenido que se publica. Quien suba música, imágenes de personas o grabaciones de eventos debe tener los derechos y permisos necesarios. Cantera no ofrece una biblioteca musical comercial autorizada por defecto.

El usuario puede denunciar una cuenta, evento, comentario o publicación con categoría y contexto. El administrador ve una cola, prioriza casos urgentes, toma una decisión y registra el motivo. Las opciones incluyen ocultar temporalmente, retirar, advertir, suspender y restablecer tras revisión. Un bloqueo impide interacciones previstas por la política, no solo oculta un botón.

Se necesitan canales de reclamación por derechos de autor, suplantación y privacidad, una vía de apelación y un protocolo para incidentes graves. El propietario fija quién atiende y el objetivo de respuesta; no mostrar atención permanente si no existe. La herramienta de moderación automática puede ayudar después, pero las decisiones y reclamaciones deben poder revisarse.

Controlar envíos repetidos, creación masiva de eventos y comentarios, medios excesivos y abuso de consultas. Las restricciones se aplican al servicio y al servidor, no solo al formulario. Para contenido retirado, evitar que una URL directa pública siga dando acceso cuando la política exige la retirada.

## 12. Arquitectura y separación de entornos

| Capa | Primera solución | Condición de funcionamiento real |
|---|---|---|
| Interfaz | React, TypeScript, Vite y rutas existentes | Pantallas conectadas al repositorio de datos y errores visibles. |
| Identidad | Firebase Auth | Proveedor configurado, dominios autorizados, sesión restaurada y UID propio. |
| Datos | Firestore | Reglas, índices y operaciones de concurrencia probadas. |
| Medios | Cloud Storage | Bucket configurado, reglas, acceso y borrado de archivos probados. |
| Operaciones sensibles | Reglas y servidor confiable | Administrador, moderación, límites y resultados protegidos. |
| Publicación web | Vercel existente | Variables del entorno correctas y rutas de la SPA accesibles directamente. |
| Demostración | Repositorio local aislado | Indicador persistente, datos del dispositivo y ninguna escritura a la nube. |

El modo se elige explícitamente. Un error de permisos, conexión o guardado en nube no debe convertirse silenciosamente en éxito local. Las colecciones y claves de la demostración se separan de producción. Desarrollo, pruebas y producción tienen configuraciones distintas; se identifica el entorno que está viendo el usuario.

La aplicación destinada a clientes reales abre el entorno de servicio configurado, sin generar perfiles ni actividad ficticia cuando falta la nube. La demostración se habilita explícitamente para desarrollo y pruebas, y no sustituye el lanzamiento. La base de consulta cloud tiene límites de 100 publicaciones, 100 eventos y 1.000 interacciones; antes de crecimiento real necesita paginación, filtros de servidor, índices y carga incremental. Un límite de lectura no es una política de conservación ni justifica que desaparezca actividad antigua de la experiencia.

Restaurar Auth con un observador evita perder la identidad al recargar. Los listeners se cancelan cuando no se usan. Listados y feed tienen paginación y límites. La inscripción utiliza transacciones o una operación equivalente del servidor para comprobar plazas y estado de forma conjunta. [Transacciones de Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions).

Las reglas de seguridad validan propiedades, campos permitidos y transiciones; proteger una ruta React mejora la interfaz, pero no protege por sí solo la base de datos. Claves de servicio y credenciales administrativas permanecen fuera del cliente. Los datos declarados no determinan permisos administrativos.

## 13. Modelo de datos y evolución

Los tipos iniciales de `src/community/types.ts` representan perfiles, eventos, participantes, encuentros, publicaciones, comentarios y clasificación. Son la base para la beta; hay que ampliarlos de manera versionada conforme llegan equipos, permisos y auditoría.

| Entidad | Datos esenciales | Evolución necesaria |
|---|---|---|
| Perfil | UID, nombre, país/ciudad, nivel, biografía, equipo declarado y declaración de edad | Estado de verificación administrado, preferencias de privacidad y tutor. |
| Organización/equipo | ID, nombre, tipo, país/ciudad y responsable | Gestores con permisos, miembros, enlaces oficiales y verificación de representación. |
| Evento | ID, dueño, tipo, formato, país/ciudad, recinto, `startAt` UTC, `timeZone`, capacidad, modalidad y reglas | Visibilidad, costes externos, fases del evento y edición auditada. |
| Inscripción | Evento, participante/responsable, nombre presentado y fecha | Estado, equipo real, confirmación, lista de espera y cancelación. |
| Encuentro | Torneo, ronda, participantes y marcador | Horario, ganador por desempate, confirmaciones, disputa y versión del resultado. |
| Publicación | Autor, tipo, título/texto, archivo, fecha y evento opcional | Visibilidad, estado de moderación, miniatura, duración y evidencia del logro. |
| Comentario/reacción | Publicación, autor y fecha | Estado, bloqueo y límites de frecuencia. |
| Verificación | Solicitante, tipo, contacto, evidencia y estado | Revisor, motivos, historial y caducidad cuando proceda. |
| Denuncia | Denunciante, recurso, motivo y estado | Prioridad, decisión, revisión y auditoría privada. |
| Notificación | Destinatario, tipo, recurso y estado de lectura | Preferencias, deduplicación y envío externo optativo. |

Los participantes y encuentros pueden empezar embebidos para una beta pequeña con límites explícitos. Antes de escalar o permitir varios gestores, normalizarlos en subcolecciones con reglas por recurso, evitar documentos que crecen sin límite y conservar identificadores estables. Migrar sin perder inscripciones, enlaces ni historial.

Separar estado de inscripciones (`open`, `closed`, `cancelled` en la beta) de fase deportiva: programado, en curso, terminado o cancelado. «Cerrado» no significa «completado». Guardar fechas confiables del servidor en nube y no aceptar como autoridad el reloj del dispositivo. Cambios en el perfil no deben alterar el UID o la propiedad de eventos ya creados.

## 14. Seguridad y pruebas de permisos

La matriz mínima contempla visitante, usuario A, usuario B, organizador y administrador. Cada persona puede editar sus datos permitidos y su contenido; un organizador gestiona únicamente sus eventos; el administrador gestiona verificaciones y moderación. La persona inscrita no puede editar el recinto o el marcador, y tampoco modificar la inscripción ajena.

Las pruebas deben enviar operaciones a las reglas y API, no limitarse a comprobar que un botón está oculto. Casos críticos: autoasignación de administrador, autoaprobación de verificación, edición de resultado ajeno, alteración de capacidad, doble inscripción, escritura en colecciones no autorizadas y sustitución de archivos de otra cuenta.

La cuenta del propietario debe tener privilegio concedido por un procedimiento seguro y recuperable. Añadir un moderador en el futuro exige un permiso separado de administración total. Mantener auditoría de acciones sensibles sin guardar secretos ni pruebas privadas en registros públicos.

## 15. Notificaciones y operación

La beta puede mostrar actualizaciones en pantalla. La siguiente fase incorpora bandeja interna con nueva inscripción, plaza disponible, cambio/cancelación, nuevo calendario, resultado corregido, comentario relevante y respuesta de verificación. Correo y push se añaden con preferencias y una infraestructura configurada; no prometer avisos si todavía no hay envío.

El administrador necesita un panel con verificaciones pendientes, denuncias, actividad anómala y estado del servicio. Debe existir una guía para recuperar acceso, suspender una cuenta, retirar un archivo, corregir un evento y restaurar datos. Backups y recuperación se comprueban con un ejercicio real, no solo con una opción activada.

Separar soporte, moderación y gestión de infraestructura aunque al principio los atienda la misma persona. La documentación explica responsabilidades del organizador, condiciones de los eventos y significado de los sellos. Si el volumen supera la capacidad de atención del propietario, incorporar apoyo antes de ampliar difusión.

## 16. Plan de ejecución por hitos

Los hitos son acumulativos. Un hito se cierra por criterios comprobados, no por el tiempo invertido ni por haber dibujado la pantalla.

| Hito del plan | Trabajo | Criterio de aceptación |
|---|---|---|
| 0–10 %: definir | Acordar propuesta gratuita, públicos, alcance mundial, campos obligatorios, responsabilidades y beta adulta provisional. | Este plan, decisiones registradas y lista clara de funciones y límites. |
| 10–25 %: base | Corregir compilación, integrar comunidad y rutas, crear repositorio de datos separado demo/nube y restaurar identidad. | La app compila y abre; una recarga conserva sesión/perfil según entorno; un fallo cloud no se oculta. |
| 25–40 %: partidos | Crear, buscar por país/ciudad, compartir, inscribir, retirar, cerrar y cancelar. | Dos cuentas pueden usar un mismo evento real sin duplicarse ni superar las plazas. |
| 40–55 %: torneos | Cerrar participantes, generar liga/eliminatoria, registrar resultados y mostrar tabla o rondas. | Formatos admitidos comprobados; marcadores válidos; ningún campeón surge de datos incompletos. |
| 55–65 %: feed | Reels, fotos, logros, enlaces a eventos, comentarios y reacciones. | Subidas reales con límites; reproducción móvil; otra cuenta ve la publicación; borrado no deja residuos públicos. |
| 65–75 %: confianza | Solicitudes manuales, administrador seguro, moderación, denuncias y bloqueo. | Usuario no puede verificarse; propietario revisa y decide; retirada funciona en UI y acceso directo. |
| 75–85 %: producto piloto | Organizaciones y gestores, avisos internos, reglas de resultados, privacidad y soporte operativo. | Un club organiza con permisos correctos; los cambios llegan a inscritos; existe respuesta a una incidencia. |
| 85–95 %: lanzamiento | Configurar nube y web, comprobar reglas e índices, rendimiento móvil, restauración y métricas. | Recorrido completo en producción con dos cuentas y dispositivos; soporte y presupuesto operativos. |
| 95–100 %: estabilizar y ampliar | Resolver fallos del piloto, completar tutela juvenil antes de abrirla y verificar operación internacional prevista. | Se cumplen todas las condiciones de la definición de 100 % y no quedan impedimentos de lanzamiento del alcance. |

La primera entrega local trabaja los hitos de base, partidos, torneos y feed. Su ejecución no convierte automáticamente los hitos de confianza, despliegue y menores en trabajo terminado. El calendario se estima después de observar las primeras tareas y disponer del acceso a Firebase y Vercel; evitar prometer una fecha a partir de un prototipo.

La decisión de esperar al patrocinador introduce una puerta explícita de financiación para medios cloud y funciones. Se puede seguir preparando código y comprobaciones y completar los pasos autorizados de perfiles, eventos y logros escritos. Una publicación inicial sin medios deberá comunicar ese alcance: el plan completo no se marca al 100 % mientras una función comprometida siga pendiente de financiación, activación y prueba.

## 17. Validación que decide si el producto funciona

### Recorrido completo

1. Cuenta A crea perfil y evento en un país, ciudad y zona horaria concreta.
2. Cuenta B abre el enlace en otro navegador, se identifica y se inscribe.
3. A cierra el torneo, genera calendario y registra resultados; B ve el cambio tras recargar o mediante actualización real.
4. B publica foto, reel o logro referido al evento; A puede verlo e interactuar.
5. B solicita verificación; solo el propietario puede aprobar y dejar constancia.
6. B denuncia contenido de prueba; el administrador lo retira y el recurso deja de estar disponible según la política.
7. Se verifica que una acción denegada no modifica datos ni muestra éxito.

### Casos críticos

- Última plaza con dos solicitudes simultáneas y reintento de una inscripción ya creada.
- Liga con número par e impar: parejas únicas, descansos y clasificación correcta.
- Eliminatoria con tamaños admitidos, final pendiente, empate y corrección de una ronda anterior.
- Horarios en dos zonas IANA y en cambio estacional; conservar el instante publicado.
- Archivo justo bajo y sobre el límite, formato no admitido, vídeo demasiado largo e interrupción de subida.
- Solicitud duplicada de verificación, rechazo, revocación e intento de modificar el estado por cliente.
- Pérdida de conexión, permisos denegados, sesión caducada, lista vacía y enlaces directos tras recargar.
- Flujo en móvil, uso por teclado, nombres accesibles, contraste y controles de reproducción.
- Cierre de sesión en un dispositivo compartido; datos privados inaccesibles a otra cuenta.

Aplicar pruebas unitarias a reglas de torneos y conversiones de fecha, pruebas de seguridad con emuladores y pruebas del recorrido en la web desplegada. Comprobar TypeScript y compilación de producción. El resultado de cada verificación debe registrar entorno y limitaciones.

## 18. Métricas y validación con comunidad real

La métrica principal es **eventos efectivamente celebrados con participantes confirmados por semana**. Las inscripciones son una señal de intención; no cuentan por sí solas como asistencia. La confirmación puede venir del organizador y, posteriormente, de ambas partes.

Medir sin coleccionar datos innecesarios:

- Activación: perfil creado y primera inscripción, evento o publicación útil.
- Oferta: organizadores activos, eventos abiertos y eventos celebrados por ciudad/país.
- Utilidad: tiempo hasta primera inscripción, plazas ocupadas, cancelaciones y ausencias declaradas.
- Retención: organizadores que repiten y participantes que vuelven a jugar.
- Contenido: autores activos, publicaciones asociadas a eventos y visitas que llevan a participar.
- Confianza: denuncias, tiempo de revisión, decisiones revertidas y solicitudes de verificación resueltas.
- Operación: errores de guardado, fallos de subida, consumo de almacenamiento y soporte por evento.

Empezar con un piloto acompañado de organizadores reales de diferentes perfiles. La web puede admitir varios países, pero concentrar invitaciones y seguimiento en pocas comunidades permite reunir oferta y participantes. No confundir alcance global con actividad suficiente en cada ciudad.

Definir una meta numérica tras medir el primer grupo y su tamaño real. Pedir ejemplos de partidos celebrados, razones de cancelación y problemas de coordinación. Validar interés con actividad repetida antes de ampliar funciones y presupuesto.

## 19. Gratuidad, sostenibilidad y presupuesto

El núcleo gratuito incluye perfil, eventos, inscripción, calendario y resultados básicos, publicación y lectura del feed, contacto de verificación y herramientas esenciales de denuncia. No bloquear estas acciones tras un pago para que el producto cumpla su promesa.

La orientación inicial es sin finalidad lucrativa y la vía prioritaria de financiación es el patrocinio identificado para cubrir costes de servicio y desarrollo. No describir Cantera como asociación, fundación, ONG reconocida o entidad de utilidad pública sin documentación que lo acredite. Cualquier formalización, gestión de aportaciones y obligación contable se define con los datos reales del responsable y asesoramiento pertinente.

**Decisión confirmada del 6 de octubre:** esperar al patrocinador antes de activar facturación, Storage o funciones. La preparación local y la CI continúan sin activar esos servicios. El propietario debe confirmar financiación suficiente y los pasos de activación pertinentes antes de cambiar esta decisión o habilitar subidas cloud. Un acuerdo esperado, una propuesta enviada o un logo de colaborador no equivalen a fondos confirmados.

Preparar un dossier de patrocinio con misión, públicos, necesidades, presupuesto y entregables medibles: apoyo a la infraestructura o a una comunidad de eventos, presencia de marca claramente identificada e informe agregado de actividad. Todavía no hay patrocinadores ni financiación garantizados. Antes de aceptar una colaboración se acuerdan duración, aportación, uso de marca, independencia y condiciones de salida.

La verificación manual no se compra, el patrocinador no decide denuncias y no recibe datos personales por financiar Cantera. El contenido patrocinado se identifica y se separa del orden orgánico; no prometer rendimiento deportivo, fichajes ni audiencia no medida. El propietario registra conflictos de interés y recusa decisiones cuando corresponda. Una futura fuente de financiación diferente exige una decisión documentada que respete el núcleo gratuito y la misión.

El presupuesto depende del uso y del plan real de los proveedores. Preparar un escenario pequeño, medio y de crecimiento con cuentas activas, consultas por sesión, publicaciones, duración de vídeo, visualizaciones, almacenamiento, transferencia, funciones de servidor y horas de moderación. Consultar tarifas oficiales al elegir configuración; este plan no inventa precios ni asume que una cuota gratuita cubre vídeo ilimitado.

Fórmula de trabajo: coste mensual = infraestructura fija + lecturas/escrituras + almacenamiento + distribución de medios + procesamiento + servicios externos + atención y moderación. Revisar unidades, región y condiciones del proveedor. Las alertas presupuestarias requieren atención; los límites técnicos deben reducir abuso y carga, porque una alerta por sí sola no garantiza detener gasto.

Antes de abrir subidas a cualquiera: paginar feed, cargar vídeos solo cuando se necesitan, limitar tamaño/duración, limpiar archivos huérfanos, acordar conservación y vigilar consumo. Habilitar facturación o contratar servicios es una configuración real pendiente cuando no esté comprobada.

## 20. Checklist de lanzamiento y definición de 100 %

### Producto

- [ ] Identidad propia y sesión restaurada; ninguna cuenta termina en un jugador de ejemplo compartido.
- [ ] País, ciudad y zona horaria correctos en eventos; enlaces compartibles y búsqueda útil.
- [ ] Partidos, inscripciones y capacidad funcionan entre cuentas reales.
- [ ] Liga y eliminatoria soportadas con sus límites visibles; resultados y correcciones coherentes.
- [ ] Reels, fotos y logros se guardan, reproducen, relacionan y borran correctamente.
- [ ] Equipos/organizaciones tienen responsables y permisos reales cuando se ofrecen como tales.
- [ ] Cuenta verificada y logro comprobado tienen significados distintos y no se autoasignan.

### Servicio

- [ ] Firebase Auth, Firestore, Storage, reglas e índices desplegados y comprobados.
- [ ] UID del propietario y privilegios administrativos configurados de forma segura.
- [ ] Soporte y solicitudes de verificación llegan a un canal atendido.
- [ ] Denuncias, bloqueos, retirada y apelación tienen un responsable y procedimiento.
- [ ] Medios y consumo tienen límites; secretos de servidor no aparecen en la web.
- [ ] Privacidad, condiciones, derechos de contenido y operación internacional revisados para el lanzamiento previsto.
- [ ] Responsable, contacto, país de establecimiento y forma de entidad completados con datos reales.
- [ ] Términos, privacidad y política de cookies/almacenamiento accesibles, versionados y coherentes con el código desplegado.
- [ ] Almacenamiento local y servicios de terceros inventariados; marketing y analítica no esencial desactivados salvo configuración y tratamiento revisados.
- [ ] Whitepaper vigente publicado como documentación del proyecto, con situación jurídica y límites reales; patrocinios identificados e independientes de verificación y moderación.
- [ ] La beta adulta está descrita con honestidad; el acceso juvenil espera un tutor y consentimiento funcionales.
- [ ] Si se habilitan menores, recorrido de tutor y controles pertinentes probados antes de admitirlos.
- [ ] Avisos ofrecidos por el producto llegan y respetan preferencias.
- [ ] Datos recuperables: copia, restauración y eliminación probadas.
- [ ] Web publicada comprobada en móvil y escritorio con dos cuentas y otro dispositivo.
- [ ] Métricas, errores y presupuesto se pueden observar sin invadir privacidad.

**100 % del alcance inicial** significa que una persona o responsable de equipo puede organizar gratuitamente un partido o torneo, otros pueden inscribirse, celebrar y registrar la actividad, compartirla en los tres formatos, y usar un servicio publicado con datos persistentes, permisos correctos, soporte y verificación manual. La apertura juvenil y las capacidades institucionales prometidas necesitan sus recorridos completos antes de contarse como terminadas. No significa que se haya construido una red social del tamaño de TikTok ni que todas las funciones futuras estén incluidas.

La entrega debe declarar por separado: construido localmente, probado localmente, comprobado en CI, probado con Firebase real, desplegado, pendiente y limitado. Hasta verificar la nube y el servicio público, describir el resultado como **base funcional local con lanzamiento pendiente**. Mantener este plan actualizado con evidencia cuando cada hito se cierre.

## 21. Documentación de uso y trazabilidad para clientes reales

La publicación necesita términos de uso, política de privacidad, información de cookies y almacenamiento, normas de comunidad y canales de soporte. No copiar textos genéricos que prometan funciones inexistentes. Cada texto identifica su versión y fecha, describe al responsable real, el servicio gratuito, responsabilidades del organizador y del participante, contenido, verificación, reclamaciones, suspensión y derechos aplicables sin convertirlos en una renuncia indiscriminada.

La política de privacidad debe reflejar el flujo real de Auth, perfiles, eventos, imágenes/vídeos, comentarios, solicitudes y denuncias. Definir para cada finalidad qué datos se necesitan, quién accede, su conservación y cómo se atienden solicitudes. Los plazos y bases aplicables deben revisarse después de conocer responsable, ubicación y territorios de operación; no se improvisan como parte de una pantalla.

El almacenamiento necesario incluye lo que efectivamente usan sesión y preferencias. Inventariar tema, idioma, elementos ocultos, ayuda introductoria y archivos de la demostración cuando existan. La información debe distinguir cookies, localStorage e IndexedDB, el papel de Firebase y los posibles servicios de terceros. La edición inicial no incorpora marketing ni analítica no esencial por defecto. Evaluar los mecanismos efectivos antes de afirmar que se necesita o no un consentimiento concreto. [Guía de cookies de la AEPD](https://www.aepd.es/guias/guia-cookies.pdf).

No mezclar aceptación de términos, información sobre privacidad y permisos opcionales. Registrar la versión de términos aceptada cuando el flujo lo requiera y permitir consultar la versión vigente. Introducir un cambio material exige actualizar documento, versión, tratamiento técnico y aviso pertinente, no solo cambiar la fecha del pie de página.

La trazabilidad utiliza identificadores de requisitos y decisiones del [whitepaper](WHITEPAPER.md), enlaces a tareas/código y evidencia fechada del entorno donde se probó. El checklist de publicación registra datos faltantes, revisión y responsable de cerrar cada punto. Una versión documental no demuestra que el producto esté listo, registrado o desplegado.

## 22. Evidencia de la entrega y situación real a 6 de octubre de 2026

### Construido localmente y verificado también en integración continua

La interfaz integra inicio, perfil, eventos, detalle con invitación y calendario, feed de tres formatos, solicitudes y administración, misión/patrocinio, y páginas de términos, privacidad y almacenamiento. Las rutas legales son `/legal/terms`, `/legal/privacy` y `/legal/cookies`; la versión de aceptación del código permanece `2026-10-05`. Actualizar la fecha de este plan no modifica esa versión ni constituye una nueva aceptación.

| Verificación | Resultado de esta entrega | Alcance y referencia |
|---|---|---|
| TypeScript | Superado localmente y en GitHub Actions | `pnpm lint`, comprobación estática. |
| Compilación | Superada localmente y en GitHub Actions | `pnpm build`, generación de paquete; no acredita publicación. |
| Dominio y normalización | 14 pruebas superadas | 6 de `tests/logic.test.ts` y 8 de `tests/normalization.test.ts`: torneos, inscripción, zonas/DST, registros corruptos, rutas de medios y reconstrucción sin privilegios extra. |
| Reglas de datos y archivos | 19 pruebas superadas | `tests/security.test.mjs`, emuladores Firestore y Storage de un proyecto `demo-*`; incluye base nombrada, concurrencia de última plaza, privacidad, consentimiento, admin y archivos. |
| Límites del formulario y lógica | Integrados | Torneos máximo 32, partidos máximo 64; zona horaria y país/ciudad obligatorios. |
| Información y almacenamiento | Integrados en UI/código | Textos de uso y privacidad, preferencias y prueba local explícita. No se añadió marketing ni analítica; se retiraron las fuentes remotas de Google. |
| QA de interfaz | Recorridos locales comprobados en navegador integrado | Liga de 3, copa de 3 con pase libre/final/campeón, foto/logro e interacciones y reel MP4 sintético de 2 s; persistencia tras recarga. MP4 de 91 s rechazado. |
| Integración continua | Ambos trabajos superados en GitHub Actions | Ejecución `37384779319` sobre el commit `54fd7e98c9469dac60e0fedd53594e778f7b9751`; 49 pruebas, sin despliegue ni cuentas reales. |
| Limpieza de publicaciones | Código, sintaxis y 16 pruebas superadas localmente y en CI Node 22 | `functions/cleanup.mjs`, adaptador `functions/index.mjs` y `functions/tests/cleanup.test.mjs`; dobles de datos/archivos. Comprobaciones locales con Node 24.19 y Node 22.23.3; trigger sin desplegar ni invocar en nube. |

### Comprobaciones del navegador local

En el modo local explícito se comprobó una liga de 3 participantes: generación, goles, empate, clasificación, corrección de resultado y persistencia al recargar. Se comprobó una copa de 3 con pase libre, final y campeón. En el feed se publicó una foto y un logro, se añadió un «me gusta» y un comentario, y se conservó el estado después de recargar. También se publicó, decodificó y reprodujo sin error un reel MP4 sintético de 2 segundos, conservado tras recarga. Un MP4 de 91 segundos fue rechazado con el aviso del límite de 90 segundos.

Esta evidencia corresponde al navegador integrado y datos del dispositivo. No constituye prueba con cuentas cloud, carga de vídeo en producción o sincronización entre dispositivos. Las pruebas del recorrido real con dos cuentas siguen abiertas; las de medios cloud esperan además la financiación elegida por el propietario.

### Comprobación automática observada en GitHub

La [ejecución `37384779319`](https://github.com/rommer1997/CANTERA-/actions/runs/37384779319) del 6 de octubre de 2026, sobre el commit `54fd7e98c9469dac60e0fedd53594e778f7b9751`, terminó correctamente en sus dos trabajos. La app con Node 24 y Java 21 instaló las dependencias del lockfile con pnpm, comprobó TypeScript, ejecutó las 14 pruebas de dominio/normalización, compiló y superó las 19 pruebas de Firestore/Storage emulados en `demo-cantera`. El trabajo separado Node 22 instaló el lockfile de `functions` sin scripts, comprobó sintaxis y superó sus 16 pruebas con dobles: 49 pruebas en total. El workflow conserva permiso de lectura de repositorio, sin credenciales de producción ni pasos de despliegue. Su resultado no prueba cuentas reales, subidas cloud ni invocación del trigger.

La política estricta de instalación mantiene decisiones explícitas en `pnpm-workspace.yaml`: autoriza las dos versiones revisadas de esbuild y bloquea los demás scripts opcionales revisados. Un script nuevo no queda autorizado por esta entrega.

Las versiones de acciones se eligieron consultando sus fuentes oficiales el 6 de octubre: [checkout](https://github.com/actions/checkout), [pnpm/setup](https://github.com/pnpm/setup) y [setup-java](https://github.com/actions/setup-java). `pnpm/setup` prepara pnpm y Node conjuntamente. Mantener el workflow dentro de la revisión normal del código y registrar el resultado de cada versión comprobada.

Los 19 casos prueban reglas emuladas y no implican que estén activas en el proyecto real. La duración de vídeo se comprueba en cliente; inspección confiable de servidor, transcodificación, cuotas, protección contra abuso, bloqueo de cuentas y procesamiento completo siguen pendientes. La limpieza automática de publicaciones dispone ahora de código y pruebas, pero su activación y comprobación cloud están pendientes. Las consultas cloud mantienen límites de 100 eventos, 100 publicaciones y 1.000 interacciones. Equipos con varios gestores, avisos, chat, acceso juvenil y recorridos originales de scouting permanecen en la hoja de ruta.

### Backend de limpieza preparado, todavía no operativo

`cleanupCommunityPost` es un adaptador Gen2 de borrado de documentos en `communityPosts/{postId}`, limitado a la base nombrada de Cantera y región `europe-west1`, con reintentos. El handler elimina likes y comentarios ligados al post en lotes de hasta 450 mediante transacciones que comprueban que no se haya recreado el padre. Para el medio comprueba ruta del autor/publicación, fecha y generación del objeto; ignora la ausencia del archivo y conserva generaciones posteriores. No utiliza una URL del usuario para elegir bucket o ruta arbitraria.

Las 16 pruebas usan dobles locales, cubren varias páginas, eventos repetidos, fallos/reintentos, IDs válidos, recreación del padre y preservación de medios ajenos o reemplazados, con comparación temporal hasta nanosegundos. Las comprobaciones locales pasaron con Node 24.19 y también con Node 22.23.3, correspondiente al runtime declarado. No se ejecutaron contra datos cloud ni prueban una invocación del trigger en producción.

La función no se ha desplegado y su activación espera al patrocinio conforme a la decisión del propietario. Después de confirmar financiación y autorizar los pasos pertinentes habrá que disponer de facturación y servicios, confirmar el bucket real en `functions/config.mjs`, configurar permisos de ejecución sobre esa base y bucket, desplegar la función y comprobar el borrado con datos controlados. Esta reacción a nuevos borrados no constituye una limpieza histórica de huérfanos, medios nunca publicados, denuncias o un proceso completo de baja de cuenta. Tampoco modifica borrado suave, versiones o copias; sus plazos necesitan revisión. La operación debe atender errores y avisos del handler. El contrato y los pasos están en [functions/README.md](functions/README.md).

### Auditoría de Firebase real

La consulta del 6 de octubre de 2026 encontró la base nombrada `ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb` en `eur3`, con reglas remotas de bloqueo total (`deny-all`). No se encontraron buckets de almacenamiento y la facturación está deshabilitada. La lista de dominios autorizados de Google Auth no incluye `cantera-tau.vercel.app`. Estas observaciones pertenecen a la auditoría del servicio real; no se corrigieron durante esta entrega.

### Autorización de cambio de seguridad

La revisión automática de aprobación rechazó desplegar las reglas nuevas de Firestore: sustituir el bloqueo total remoto por acceso a nuevas colecciones, incluidas lecturas públicas, es un cambio de seguridad que necesita autorización humana precisa. La solicitud de aprobación se formuló en el chat y sigue pendiente. **No se desplegaron las reglas.** Las pruebas superadas no reemplazan esa autorización; este documento tampoco la concede.

El cambio propuesto se limita a la base nombrada de Cantera y a las reglas incluidas en el repositorio; debe revisarse su alcance concreto antes de autorizarlo. Tras autorización se puede aplicar y comprobar, conservando evidencia de las reglas anteriores. El dominio Auth, la habilitación de facturación, creación de Storage y concesión de privilegio al propietario son configuraciones separadas que también requieren completar el acceso y decisiones pertinentes.

### Pasos que quedan para servicio público

1. Resolver la autorización del cambio de reglas y comprobarlas en la base real después del despliegue.
2. Completar dominio Google Auth y preparación de presupuesto. Storage, facturación y funciones esperan patrocinador; después de financiación confirmada y activación autorizada, identificar bucket real, desplegar reglas/función y probar medios.
3. Completar responsable, correo, país, forma real de operación, revisiones y claim del administrador.
4. Publicar la versión web y probar el recorrido con dos cuentas y otro dispositivo, incluidos permisos, solicitudes, contenido y retirada.
5. Cerrar los límites y procesos necesarios para el volumen previsto, sin habilitar menores hasta completar tutela y revisión.

Estado: **código integrado, comprobado localmente y en CI; activación cloud y lanzamiento pendientes**. La vocación sin finalidad lucrativa y el patrocinio son decisiones de proyecto; todavía no se acredita una entidad constituida o financiación confirmada.

Las subidas de medios en producción están desactivadas por defecto mediante `VITE_ENABLE_MEDIA_UPLOADS=false`. El modo de prueba explícito conserva fotos y vídeos solo en el dispositivo. Cambiar la bandera no crea Storage ni activa la función: requiere cerrar financiación, configuración y pruebas. El núcleo gratuito se mantiene; el coste de infraestructura pendiente no se traslada a una cuota de organización.

## 23. Registro de actualización documental

| Versión del plan | Fecha | Cambio |
|---|---|---|
| 0.7 | 6 de octubre de 2026 | Registra ambos trabajos de GitHub Actions superados sobre `54fd7e98c9469dac60e0fedd53594e778f7b9751`, 49 pruebas y política explícita de scripts de dependencias. Mantiene abiertas las puertas de lanzamiento, financiación y datos reales. |
| 0.8 | 6 de octubre de 2026 | Feed social, perfiles públicos, seguimiento, directorio y actividad paginados, interfaz móvil y nueva identidad. Separación de edad/aceptación en cuenta privada y proyección deportiva pública; 19 pruebas TS y 23 de seguridad emulada, más 16 de backend. Registra migración/índices y pruebas cloud pendientes. |

## 24. Entrega social y visual del 6 de octubre de 2026

El feed reúne Comunidad/Siguiendo, autores navegables, creación compacta y búsqueda de publicaciones mostradas. Juega ofrece Explorar/Mis encuentros, filtros y una ficha con navegación por información, participantes, cruces y clasificación. La identidad usa superficies blancas, texto negro y acento rojo, sin fuentes externas ni contenido de relleno. La landing de escritorio y la navegación móvil conservan sus recorridos.

Las rutas `/people` y `/people/:profileId` consultan datos deportivos públicos y actividad del autor en páginas. Los seguidores/seguidos se cuentan mediante consultas de agregación, sin inferir totales desde el feed. Las relaciones de seguimiento son públicas. La declaración de edad y el registro de aceptación residen en `communityProfiles`, restringido a dueño/administrador; `communityPublicProfiles` sólo proyecta datos deportivos. Un alta Auth incompleta no publica una ficha. Altas completas, cambios y verificación administrativa mantienen el espejo mediante lotes/transacciones y reglas comprobadas en emuladores.

Las nuevas pruebas verifican la proyección sin campos privados, seguimiento inválido o ajeno, compatibilidad de la prueba local anterior, persistencia de cuentas de prueba y coherencia del espejo. Pasan 19 pruebas TS y 23 emuladas; el backend conserva 16 pruebas. TypeScript y build pasan. Ninguna de estas comprobaciones usa cuentas reales ni constituye un despliegue.

Para activar en nube se requieren los índices por autor/organizador incluidos en `firestore.indexes.json` y una revisión de las cuentas existentes. La migración `scripts/project-public-profiles.cjs` está preparada con modo sólo lectura por defecto y `--apply` explícito; copia exclusivamente campos deportivos de cuentas completas con condiciones vigentes. No se ha ejecutado. Reglas, dominio Auth, responsable/contacto/país, privilegio del propietario y pruebas con dos cuentas siguen pendientes. Medios cloud y funciones continúan esperando patrocinador. El listado general y sus interacciones aún necesitan ampliar paginación/agregación antes de crecer.
