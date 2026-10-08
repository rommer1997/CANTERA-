# LaCantera
## Whitepaper del proyecto · Versión 0.9

**Fecha de edición:** 8 de octubre de 2026

Edición con frontend publicado y ampliación de mensajería en validación; apertura de cuentas y medios pendientes.

Cantera propone organización gratuita de fútbol y una comunidad conectada con la actividad deportiva. La iniciativa tiene orientación sin finalidad lucrativa en esta etapa y busca patrocinio para sostener infraestructura. No acredita una entidad constituida, financiación confirmada, tracción real, auditoría independiente o servicio productivo abierto.

**Situación de esta edición:** implementación local ampliada; pruebas locales/emuladas documentadas; configuración remota cerrada. La web de LaCantera está publicada en https://lacantera.web.app con registro cerrado. La publicación del frontend no acredita el funcionamiento del backend nuevo ni el lanzamiento. Esta edición no declara el producto terminado para clientes ni el alcance multimedia completo.

## Resumen ejecutivo

El recorrido une persona/equipo, convocatoria, participación, celebración, resultado aportado por el organizador y contenido relacionado. Su primera utilidad es reunir jugadores y coordinar equipos sin una cuota de organización. Que el núcleo sea gratuito no hace gratuitos campo, transporte, arbitraje o equipación externos.

La revisión incluye equipos con plantilla privada y roles, incorporación por aprobación, respuestas y espera ordenada, avisos internos, edición con historial, recurrencia limitada, torneos, calendario y comunidad móvil. Los cruces canónicos de torneos y su integración están sujetos al cierre de validación. Fotos/reels cloud continúan denegados en servidor hasta financiar y comprobar un servicio de medios protegido; la demostración conserva medios locales identificados.

El responsable declarado es Rommer, persona física en Madrid, España, con contacto Rommer@garitocastizo.com. Antes de abrir siguen pendientes la revisión de esos datos y textos por el responsable, el backend actualizado, pruebas entre cuentas/dispositivos, recuperación y atención de derechos. Build y runtime fallan cerrados sin sus condiciones; un documento o un emulador no fabrica la aprobación de esos controles.

## 1. Misión y alcance

La misión es facilitar encuentros de fútbol y conservar su contexto comunitario para personas, grupos, equipos amateurs/profesionales y clubes. La visión internacional se apoya en país, ciudad y zona horaria; requiere capacidad de atención y revisión de cada ámbito de difusión.

Principios:

- Acceso gratuito al núcleo de organización, participación y texto.
- Identidad propia, datos reales y demostración separada.
- Resultados declarados distinguibles de verificación independiente.
- Permisos de servidor y mínima exposición de datos.
- Transparencia sobre funciones presentes, límites y financiación.
- Soporte y derechos operativos antes de declarar una apertura.

La beta inicial requiere mayoría de edad autodeclarada. El acceso juvenil queda pendiente de tutor, consentimiento, permisos y revisión correspondientes. No se presenta la autodeclaración como comprobación de edad o garantía de seguridad.

## 2. Problema, propuesta y competencia

Organizar un encuentro requiere coordinar disponibilidad, plazas, grupos, horarios y cambios. Registrar un torneo añade cruces, resultados y correcciones. Compartir esa actividad sin su contexto puede perder quién la organizó y qué se declaró.

Cantera propone reunir estas tareas alrededor del fútbol. La propuesta debe validarse con personas reales: una integración en código no demuestra utilidad, adopción o superioridad.

Spond ya ofrece una [app gratuita de organización](https://www.spond.com/en-us/) y [funciones de grupos y eventos](https://www.spond.com/features-for-teams-overview/). Gratuidad y coordinación básica no son diferenciadores suficientes. La [línea base competitiva](docs/COMPETITIVE_BASELINE.md) separa hechos de hipótesis y define un piloto comparativo, sin afirmar que Cantera sea mejor.

## 3. Producto presente y límites

| Área | Implementación local | Límite o condición pendiente |
|---|---|---|
| Cuenta | Google Auth, perfil propio, sesión y aceptación vigente | Dominios autorizados; recorrido entre cuentas reales pendiente; alta real vacía, sin jugador de ejemplo. |
| Identidad pública | Proyección deportiva, perfiles por enlace y seguimiento | Edad/aceptación privadas; completar migración/reglas y comprobar espejo real. |
| Búsqueda/actividad | Prefijos de nombre/ciudad/país en servidor y páginas por cursor | No búsqueda semántica ni resultados inventados después de una ventana local. |
| Equipos | Ficha pública, plantilla privada, propietario/responsable/miembro | No acredita representación institucional por sí sola. |
| Acceso al equipo | Invitaciones con caducidad y solicitudes aprobadas/rechazadas | Un enlace no incorpora automáticamente; operación y privacidad reales por comprobar. |
| Partidos | Fútbol 5/7/11, 2–64 plazas, condiciones, lugar, zona y aforo | No reserva campo, arbitraje, seguro o pagos. |
| RSVP/espera | Sí/no/tal vez para inscritos, espera ordenada y promoción con aviso interno | No asistencia certificada, correo/push o garantía de lectura del aviso. |
| Cambios | Motivo, revisión, historial/ledger y avisos a destinatarios | No resolución independiente de disputas. |
| Recurrencia | 2–12 eventos semanales/quincenales/mensuales | Cada ocurrencia es independiente; no gestión completa de temporada. |
| Torneos | Liga/eliminatoria 2–32, pases libres, resultados, tabla y horarios por cruce | Documentos canónicos/reglas e integración en cierre de validación. |
| Calendario | Archivo `.ics` de evento/cruces programados | No inventa horarios ni sincroniza bidireccionalmente. |
| Comunidad | Cronología Comunidad/Siguiendo, filtros, enlaces, páginas y visor móvil | Búsqueda del feed sólo en contenido cargado; no algoritmo de talento simulado. |
| Interacción | Conteos por post de servidor, comentarios paginados, denuncia, bloqueo y retirada | Conteos no autorizados no se sustituyen por ceros ficticios. |
| Medios | Archivos locales en demo; código y reglas cierran nuevas cargas cloud | Espera financiación, servicio confiable de inspección/cuotas y limpieza real. |
| Administración | Verificaciones, reportes y derechos pendientes paginados; suspensión y runtime | Claim seguro y panel comprobados en nube; atención operativa por comprobar. |
| Derechos | Solicitudes, exportador y supresión conservadora del operador | Retención compartida requiere revisión; pruebas offline no equivalen a supresión real. |
| Mensajes | Texto privado entre contactos mutuos, paginación y retirada propia | Sin medios, llamadas, cifrado de extremo a extremo o notificaciones push. |
| Respaldo | Instantánea comunitaria y recuperación limitada al emulador | Excluye Auth/archivos; no son copias programadas ni recuperación completa de producción. |
| PWA | Instalación admitida y caché versionada del armazón estático | Sin escrituras offline ofrecidas o caché de datos Firebase/medios mediante el SW. |

La [matriz completa del plan](PLAN_CANTERA.md) identifica código, evidencia y puertas para cada área. Esta tabla no constituye una aprobación de lanzamiento.

## 4. Reglas deportivas y coordinación

La capacidad representa jugadores o equipos según la modalidad, con límites visibles. Inscripción y espera revisan duplicación, estado, fecha y plazas dentro de la operación. La espera conserva orden; liberar/ampliar una plaza puede incorporar al primero mientras el calendario lo permite, con aviso interno.

Las modificaciones requieren motivo y versión. Su historial y avisos permiten consultar cambios. Los recibos privados y lotes de cuatro pares permiten recuperar entregas pendientes tras una interrupción sin duplicar avisos ni revelar el estado de lectura. El organizador inicia esa recuperación; no se presenta como entrega automática garantizada, push o correo. Cancelar conserva un estado distinto de celebrar. RSVP no certifica que una persona asistió.

La hora local y zona IANA se conservan al formar el instante UTC. Una hora inexistente por cambio estacional se rechaza; una repetida exige escoger ocurrencia. Las series de 2–12 eventos respetan zona y frecuencia, incluyendo meses cortos. El calendario exporta sólo horarios reales.

Liga y eliminatoria son funciones nativas de esta implementación, con 2–32 participantes. La liga usa puntos 3/1/0; la clasificación deriva de resultados existentes. La eliminatoria exige resultado decisivo y trata pases libres. Se limita corregir rondas anteriores después de generar la siguiente. No representa juego y tanda de penaltis por separado ni certifica resultados oficiales.

Los cruces canónicos de backend separan estructura, programación y resultado del simple formulario. Sus permisos/integridad y la lectura de documentos históricos deben quedar comprobados antes de abrir. Un generador local correcto no valida por sí mismo la escritura directa en servidor.

## 5. Identidad, equipos y verificación

Nivel amateur/profesional es información declarada. Cada equipo tiene propiedad y roles reales; la plantilla es privada aunque su ficha sea pública. Incorporar miembros exige aprobación. La transferencia de propiedad cambia los registros relacionados de forma atómica; archivar conserva historial y no cancela eventos automáticamente.

La verificación es manual, con solicitud privada y decisión administrativa confiable. Una insignia significa revisión de identidad/representación en el alcance descrito. No acredita talento, seguridad del evento, contratos, marcadores o derechos de cada contenido; los logros no adquieren certificación por pertenecer a un perfil verificado.

Sólo un custom claim de administración emitido desde entorno confiable permite aprobar. No se obtiene por editar el perfil, una variable o un selector. La atención, criterios de rechazo/revisión y conflictos de interés deben operar con personas reales antes de ofrecer una garantía de servicio.

## 6. Datos, privacidad y derechos

La versión vigente de términos es **`2026-10-08`**. Edad/aceptación no forman parte de la proyección pública. El perfil deportivo, relaciones públicas, convocatorias, nombres inscritos y publicaciones requieren información clara sobre su exposición. Un archivo publicado mediante enlace de descarga puede difundirse; no se promete confidencialidad de medios públicos.

Plantillas, solicitudes de equipo, bloqueos, verificación, denuncias y derechos tienen accesos específicos. No deben copiarse datos de otros integrantes a la exportación de una cuenta. La información pública y la administrativa no comparten una colección abierta general.

El formulario permite solicitar exportación o supresión; administración registra su tramitación. El exportador Admin reúne registros propios con cursor y whitelist, elimina campos ajenos/credenciales y puede generar un JSON local privado. No incluye binarios, no cambia datos cloud ni ejecuta baja. La herramienta de supresión congela la cuenta y revoca sesiones antes de esperar la caducidad de tokens; sólo ejecuta un plan revisado y se detiene ante historial compartido o esquema desconocido. La recuperación de respaldo sólo puede escribir en un emulador local. Entrega segura, decisiones de conservación y operación de copias siguen siendo procesos del responsable pendientes de comprobación real.

Retirar publicación/comentario, quitar like, dejar de seguir y solicitar derechos no fuerza una nueva aceptación de términos. Crear contenido o nueva participación requiere cuenta activa y condiciones vigentes. Estas distinciones deben seguir presentes en reglas y UI.

Se necesita el nombre legal, contacto atendido, país y forma real de operación del responsable. No se inventan datos de una asociación/fundación ni plazos o garantías que la operación todavía no puede acreditar. La revisión documental por ámbitos y el procedimiento de derechos no se cierran con un texto genérico.

## 7. Arquitectura y apertura

React/Vite, HashRouter, Firebase Auth y Firestore nombrado; Storage previsto. Admin SDK sólo en herramientas confiables del operador. La base exacta es `ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb`, región `eur3`.

Las fechas nuevas de creación/trámite se emiten como Timestamp de servidor. La frontera de UI normaliza documentos. La migración de legado conserva instantes ISO, añade prefijos públicos e índice de participantes y respeta `teamId`/historial/orden válido. Usa dry-run predeterminado, relectura en transacción y cursor de 200; datos inválidos se bloquean, sin fabricar una fecha actual. No se ha ejecutado en nube.

La PWA cachea exclusivamente el armazón estático versionado. No incorpora cacheado del service worker de respuestas Firebase o archivos públicos ni garantiza cuentas/escrituras sin red. Un icono instalado no equivale a una app nativa u operación offline completa.

La build abierta exige `check:release`, datos reales y acta reciente de verificaciones reales del proyecto/base. `VITE_SERVICE_OPEN=false` permite preparar builds cerradas. El runtime `setup/open/paused` añade control del servidor; falta/error falla cerrado. No se crea un acta aprobada en desarrollo ni se marcan verificaciones remotas por superar emuladores.

Fotos/reels cloud siguen denegados por código y Storage para nuevas cargas del cliente, incluso si cambia una variable local. Financiación futura no abre automáticamente el servicio: requiere un contrato de recepción con inspección/cuotas y permisos revisados.

## 8. Operación, moderación y limpieza

El operador atiende verificación, denuncias, suspensión, solicitudes de derechos, incidentes y recuperación. Las colas pendientes se paginan. El bloqueo y la retirada de contenido son controles concretos; no representan por sí solos un sistema completo de prevención de abuso o apelación.

Los avisos actuales son internos. Esta edición incorpora código de chat privado entre contactos recíprocos, con acceso condicionado a la conexión y los controles de ambas cuentas; su validación y despliegue se registran por separado. Correo/push, idiomas adicionales, arbitraje de resultados y tutela siguen pendientes. La ampliación debe acompañarse de presupuesto y capacidad de atención.

`cleanupCommunityPost` prepara una función Gen2 Node 22 en `europe-west1` para nuevos borrados en la base nombrada. Valida ruta, fecha/generación y padre recreado; elimina interacciones en lotes limitados e ignora archivos ya ausentes. Su despliegue financiado y prueba real siguen pendientes. No acredita limpieza histórica, baja global, medios nunca publicados o retirada de copias/retenciones.

## 9. Financiación y gobernanza

El compromiso de organización/texto gratuitos no significa infraestructura sin coste. Lecturas, escrituras, transferencia, almacenamiento, procesamiento y atención deben presupuestarse según uso real. Paginación y suscripciones acotadas reducen carga sin prometer servicio ilimitado.

El propietario decidió esperar patrocinador para medios, Storage, funciones y facturación. En esta edición no se documentan fondos o patrocinadores confirmados. La orientación sin finalidad lucrativa no constituye una personalidad jurídica registrada.

Un patrocinador no compra verificación ni influye en denuncias o recibe datos personales por financiar infraestructura. Las aportaciones, presencia de marca y conflictos deben identificarse. Un presupuesto o acuerdo esperado no se presenta como ingreso realizado. Moderación y confianza necesitan independencia y registro de decisiones.

## 10. Evaluación y piloto propuesto

El éxito debe observarse en eventos reales y continuidad voluntaria, no en visitantes ficticios o resultados de tests. Inscripción no equivale a asistencia; un estado declarado por el organizador no es prueba independiente de celebración.

Piloto propuesto después de cerrar apertura: grupos adultos durante cuatro semanas, tareas comparables con su herramienta actual y entrevistas. La cantidad final y metas se acuerdan con los grupos realmente disponibles; no hay participantes o resultados confirmados en esta edición.

Criterios propuestos: un partido y un torneo completan convocatoria, gestión y resultado; un equipo aprueba incorporación privada; una espera se promueve con aviso; se atiende una solicitud de derechos; un organizador repite voluntariamente. Medir tiempo/errores de tareas equivalentes sin anticipar un porcentaje de mejora. Acceso ajeno, pérdida de inscripción o derechos no atendibles impiden cerrar el piloto.

Registrar activación, celebración declarada/confirmada, repetición, ocupación, fallos, atención y coste con denominador, periodo y origen. No contar cuentas demo, fixtures sintéticos, pruebas, recargas o visitas de desarrollo como usuarios activos. La comparación técnica/operativa está en [COMPETITIVE_BASELINE.md](docs/COMPETITIVE_BASELINE.md).

## 11. Trazabilidad de requisitos y decisiones

| ID | Requisito | Condición de cierre |
|---|---|---|
| C-01 | Núcleo comunitario gratuito | Recorrido real sin cuota de organización y condiciones externas claras. |
| C-02 | Personas/grupos/amateurs/profesionales | Cuentas y roles propios con permisos correctos. |
| C-03 | País/ciudad/zona | Horarios y búsquedas comprobados en la versión publicada. |
| C-04 | Inscripción y aforo | Duplicados/concurrencia/espera sin sobreocupación ni salto de orden. |
| C-05 | Liga y eliminatoria | Generación, reglas canónicas, resultados y lectura completos entre cuentas reales. |
| C-06 | Reels/fotos/logros | Medios financiados y recibidos/servidos/retirados con límites; texto no acredita ese cierre. |
| C-07 | Verificación administrativa | Autoaprobación denegada y decisión real atendida/trazada. |
| C-08 | Moderación y reclamación | Caso real/controlado de reporte, revisión, retirada y respuesta. |
| C-09 | Servicio para usuarios reales | Dos cuentas/dispositivos y piloto, apertura autorizada y recuperación. |
| C-10 | Información coherente | Responsable real, términos vigentes e inventario/revisión de operación. |
| C-11 | Patrocinio transparente | Acuerdos reales e independencia de confianza, sin tracción inventada. |
| C-12 | Juventud protegida | Tutor/consentimiento/controles revisados antes de habilitar menores. |
| C-13 | Equipos y miembros privados | Roles, aprobación, transferencia/salida y privacidad comprobadas. |
| C-14 | Cambios, recurrencia y avisos | Historial/ledger, 2–12 ocurrencias, destinatarios correctos y calendario real. |
| C-15 | Derechos | Exportación/entrega/supresión y retenciones probadas por el operador. |
| C-16 | PWA y descubrimiento honesto | Armazón actualizado, paginación/prefijos y límites de offline/búsqueda claros. |

Decisiones mantenidas D-01 organización gratuita, D-02 alcance internacional, D-03 patrocinio/orientación no lucrativa, D-04 verificación manual, D-05 React/Firebase y demo aislada, D-06 apertura adulta provisional, D-07 límites conservadores, D-08 documentación con datos reales y D-09 esperar financiación de medios. Esta revisión agrega apertura cerrada por defecto y cruces canónicos como controles, sin conceder aprobaciones remotas.

## 12. Evidencia y límites de esta edición

### Evidencia histórica

La [ejecución CI 37384779319](https://github.com/rommer1997/CANTERA-/actions/runs/37384779319), sobre `54fd7e98c9469dac60e0fedd53594e778f7b9751`, superó TypeScript/build y 49 casos: 14 TS, 19 emulados y 16 de limpieza. La revisión social `c4880af6bdc107fa3f56ced9d106e82b07943bff` documentó 58 casos locales: 19 TS, 23 emulados y 16 de limpieza. **58 es una referencia histórica, no el total de esta ampliación.** Ninguna ejecución desplegó servicios o probó cuentas reales.

### Comprobaciones históricas de la revisión del 6 de octubre

| Control | Resultado registrado a 6 de octubre | Alcance |
|---|---|---|
| TypeScript | Superado | Comprobación estática local, sin despliegue. |
| Dominio/normalización/equipos/migración/exportación | 65/65 casos superados | Datos/dobles locales; no comunidad real. |
| Seguridad | 40/40 casos superados | Firestore/Storage emulados, proyecto `demo-*`; no reglas remotas activadas. |
| Limpieza | 16/16 casos superados | Dobles de datos/archivos; trigger sin invocación cloud. |
| Total de la ejecución registrada | 121 casos de alcances distintos | Snapshot de trabajo; nuevas ediciones necesitan su propia validación. |
| QA móvil | 390×844 y 320×740 sin overflow horizontal; editor abre/cierra y vista Reels | En captura de 390 px, primer post comienza aproximadamente a 245 px. No prueba de todas las combinaciones de navegador/dispositivo. |
| QA de coordinación | Invitación→perfil→solicitud→aprobación privada; dos miembros; evento de dos plazas; promoción FIFO; RSVP quizá; edición de recinto/historial y lectura de aviso | Modo local explícito. Se comprobaron cinco avisos y lectura de uno; no entrega cloud/push. |
| Compilación final | TypeScript y build cerrada superados | Sin apertura de registro; bloque Firebase 737,61 kB sin comprimir, medición real de rendimiento pendiente. |

La tabla registra resultados históricos de la ejecución del 6 de octubre y no declara terminado el QA de todos los cambios posteriores. El cierre de la revisión requiere consolidar las últimas modificaciones y registrar sus resultados finales. Los tests no constituyen tracción, aprobación de apertura o prueba de medios reales.

### Auditoría remota y puertas abiertas

La auditoría inicial del 6 de octubre encontró bloqueo total. El 7 de octubre, con autorización del propietario, se desplegaron las reglas anteriores y 18 índices, se autorizaron los dominios y se publicó LaCantera en Firebase Hosting. El 8 de octubre se confirmó por lectura remota que runtime sigue ausente, la cuenta elegida tiene correo Google verificado y el permiso de administrador comprobado; el acceso al panel de administración ya está comprobado en el navegador y las reglas remotas conservan la versión anterior a las invitaciones privadas. No se ha abierto el servicio. El registro detallado está en [puesta en marcha](docs/RELEASE_2026-10-07.md).

Puertas: comprobación del código publicado y cruces canónicos en nube; responsable/contacto/país y revisión de operación; derechos/recuperación; reglas/índices/migración autorizados; Auth/administrador; dos cuentas reales/otro dispositivo; acta y despliegue. Medios y funciones requieren además financiación y comprobación de servicio real.

## 13. Hoja de ruta y control documental

Primero cerrar validación local; después configuración autorizada y piloto de coordinación/texto; abrir sólo con revisión real y operación atendida. El chat de texto se incorpora a la entrega en validación. Medios financiados, tutela, push/correo, idiomas y scouting conservan sus propias condiciones de desarrollo y apertura. Esperar patrocinio no convierte el alcance multimedia en completado.

| Versión | Fecha | Registro |
|---|---|---|
| 0.6 | 6 de octubre de 2026 | CI histórica de 49 casos y lanzamiento pendiente. |
| 0.7 | 6 de octubre de 2026 | Comunidad/perfiles/seguimiento y rediseño; 58 casos locales históricos. |
| 0.8 | 6 de octubre de 2026 | Equipos, espera/avisos, edición/ledger, recurrencia, cruces canónicos en validación, derechos/PWA, paginación y apertura cerrada. Evidencia de trabajo separada de nube. |
| 0.9 | 8 de octubre de 2026 | Mensajería entre contactos, administración asignada, derechos y respaldo ampliados; validación final y apertura pendientes. |

La referencia inicial del repositorio es `79591442a6e8938f07b3c1154f1b363af5672cce`; la base social más reciente registrada es `c4880af6bdc107fa3f56ced9d106e82b07943bff`. Esta edición registra la copia de trabajo validada antes de publicar la ampliación. El commit y la ejecución de CI de entrega se consultan en la [propuesta de GitHub](https://github.com/rommer1997/CANTERA-/pull/1).

La fuente es `WHITEPAPER.md`; `public/whitepaper.md` debe ser idéntica byte a byte. El PDF se exporta por separado después de congelar la fuente. Una revisión documental o un archivo descargable no acredita despliegue, financiación, entidad registrada o cumplimiento internacional.

## 14. Entrega por fases del 8 de octubre

La sesión amplía el núcleo adulto gratuito. La corrección pública identifica fotos/reels como pendientes y explica la visibilidad privada de los encuentros. La mensajería es de texto entre dos contactos aceptados: no publica el historial, no envía push, no admite adjuntos y no ofrece cifrado de extremo a extremo. Retirar la conexión, bloquear, suspender o pausar corta acceso; reconectar puede recuperar mensajes conservados. El operador dispone de herramientas privilegiadas distintas de las reglas de los clientes.

La exportación contempla los mensajes propios, sin entregar mensajes de otra persona ni sus identificadores estructurados. La nueva herramienta de supresión requiere un plan privado revisado y bloquea datos compartidos o casos que necesitan una decisión operativa; no se ejecuta sobre cuentas reales por preparar el código. No elimina automáticamente la cuenta al registrar una solicitud.

La versión pública y la aceptación de condiciones deben coincidir; la versión del cliente es `2026-10-08`. Las pruebas y despliegues de esta sesión se documentan sólo después de realizarlos. La administración real ya está comprobada. La apertura sigue dependiendo del backend actualizado, recorridos entre cuentas, revisión del responsable, derechos y recuperación. El patrocinio de medios sigue pendiente, sin facturación, Storage ni Functions activados.

El cierre local del 8 de octubre supera TypeScript, build cerrado y 233 pruebas locales; las reglas nuevas superaron 62 casos emulados. La [entrega por fases](docs/RELEASE_2026-10-08.md) distingue esas comprobaciones del backend remoto y de la apertura a personas reales. La restauración sintética verificó ocho campos en un emulador; el respaldo real tomado antes del acceso administrativo contenía cero documentos comunitarios.
