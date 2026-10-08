# Checklist de publicación legal y transparencia de Cantera

Versión 0.8 · 8 de octubre de 2026. Documento operativo interno, relacionado con [PLAN_CANTERA.md](../PLAN_CANTERA.md) y [WHITEPAPER.md](../WHITEPAPER.md). Las casillas de lanzamiento permanecen abiertas hasta comprobar el servicio final; la evidencia local y de CI se registra por separado. Este archivo no sustituye los textos públicos ni certifica cumplimiento internacional. La versión de aceptación de los términos en el código es `2026-10-08`.

## 0. Evidencia de esta entrega y puertas abiertas

La matriz vigente de implementación y pruebas está en [PLAN_CANTERA.md](../PLAN_CANTERA.md), [WHITEPAPER.md](../WHITEPAPER.md) y [COMPETITIVE_BASELINE.md](COMPETITIVE_BASELINE.md). Estos documentos distinguen pruebas locales, código preparado para la nube y funciones disponibles en producción. Las ejecuciones de CI anteriores se conservan como evidencia histórica y no acreditan el código actual hasta su nueva comprobación.

| Área | Estado de implementación | Pendiente para lanzamiento |
|---|---|---|
| Cuenta y comunidad | Perfil vacío, registro previo a apertura, proyección pública, seguimiento, feed y moderación preparados | Datos legales, Google Auth, reglas y recorrido entre cuentas cloud reales. |
| Equipos | Roles, invitación temporal, solicitud y aprobación, transferencia, baja y archivo | Reglas/índices remotos y ensayo entre cuentas reales; las listas de miembros son privadas. |
| Encuentros | Edición trazada, series, asistencia, espera ordenada, promoción, resultados, horarios por cruce y calendario | Comprobar en nube datos, permisos, avisos y concurrencia. |
| Derechos | Peticiones privadas y exportador manual preparado con simulación por defecto | Ensayo real, protocolo de respuesta y proceso de supresión; no existe borrado de cuenta automático. |
| Instalación | Manifest y caché de archivos estáticos preparados | Instalación, actualización y recuperación en navegador publicado; sin prometer escritura offline ni push. |
| Financiación | Esperar a patrocinador para medios | No activar facturación, Storage o funciones; las reglas preparadas rechazan subidas cloud. |

El estado actual se registra en [puesta en marcha](RELEASE_2026-10-07.md): Hosting publicado, Google habilitado y dominios autorizados. Las reglas anteriores y sus 18 índices se desplegaron con autorización el 7 de octubre. Las nuevas invitaciones y el chat de esta sesión requieren su despliegue concreto y verificación. El 8 de octubre runtime sigue ausente y la cuenta administradora ya tiene correo Google verificado y claim seguro; el acceso al panel está comprobado en el navegador. Registro cerrado; no hay acta aprobada. Las referencias al bloqueo inicial del 6 de octubre son históricas.

Decisión D-09: facturación, Storage y funciones esperan financiación de un patrocinador. La demostración explícita admite medios locales; el núcleo publicado mantiene cerradas las subidas cloud incluso si se cambia una bandera del cliente. Esta elección no implica un patrocinador confirmado.

La apertura requiere además [RELEASE_REVIEW.md](RELEASE_REVIEW.md), datos legales confirmados y las comprobaciones allí enumeradas. No se creó un acta de aprobación.

## 1. Información declarada y comprobaciones pendientes del responsable

| Dato | Situación | Evidencia de cierre |
|---|---|---|
| Nombre completo o denominación de quien presta el servicio | Nombre declarado por el propietario: Rommer; configurado el 7 de octubre | Confirmar que identifica adecuadamente al responsable y publicar los datos pertinentes. |
| Correo de soporte, privacidad y verificación | `Rommer@garitocastizo.com`, aportado y configurado el 7 de octubre | Buzón real atendido; recepción y respuesta pendientes de comprobar. |
| País de establecimiento | España; ciudad declarada Madrid | País configurado y revisión del ámbito aplicable pendiente. |
| Persona física o entidad; forma y datos de identificación pertinentes | Persona física, confirmado por el propietario | Iniciativa gratuita con orientación sin fines de lucro; no se afirma una entidad constituida. |
| Dirección y demás información obligatoria según ámbito | Pendiente de revisión | Información necesaria confirmada por el responsable. |
| Cuenta Firebase con privilegio administrativo | Pendiente de comprobar en nube | UID seguro, claim administrativo y recuperación verificadas. |
| Territorios e idiomas de difusión inicial | Visión global; operación por definir | Registro de ámbitos y capacidad de atención. |

La falta de estos datos impide considerar final una política que necesita identificar a su responsable. Preparar textos revisables y configuración mientras se reciben; la versión pública no debe usar un nombre, correo, dirección o número de registro inventado. La descripción inicial es iniciativa de orientación no lucrativa; solo afirmar una condición jurídica acreditada.

## 2. Términos de uso y normas de comunidad

- [ ] Identifican al responsable, al servicio y a su canal de contacto real.
- [ ] Tienen versión y fecha, son accesibles antes del registro y se pueden volver a consultar.
- [ ] Explican acceso gratuito a las funciones esenciales y posibles costes externos declarados por organizadores.
- [ ] Distinguen coordinación digital de reserva de campo, arbitraje, seguro y permisos del encuentro.
- [ ] Describen inscripción, cambios, cierre, cancelación, retirada y disputa con el comportamiento real de la app.
- [ ] Definen identidad, representación de organizaciones y alcance limitado de las insignias.
- [ ] Informan de quién aporta el resultado y de qué significa un logro declarado.
- [ ] Incluyen normas de conducta, derechos de contenido, permisos de personas retratadas y reclamaciones.
- [ ] Explican moderación, suspensión, retirada y posibilidad de revisión de la decisión.
- [ ] La regla de apertura adulta provisional coincide con el registro y no promete tutela todavía inexistente.
- [ ] Responsabilidades, límites y cláusulas aplicables reciben revisión por ámbito sin renuncias indiscriminadas a derechos.
- [ ] El registro de aceptación, cuando corresponda, contiene versión y fecha y no se mezcla con marketing opcional.

## 3. Privacidad y flujo de datos

- [ ] Existe una matriz con finalidad, dato, acceso, conservación, proveedor y tratamiento aplicable.
- [ ] Incluye Auth, perfil, eventos, participantes, resultados, archivos, comentarios, reacciones, solicitudes y denuncias.
- [ ] Distingue datos públicos, datos accesibles a participantes, documentos de revisión y datos administrativos privados.
- [ ] Define conservación y eliminación por categoría; evita plazos genéricos no decididos.
- [ ] Ofrece un canal atendido para solicitudes e identifica cómo se comprueba la legitimación sin recopilar de más.
- [ ] La eliminación contempla archivos de Storage, referencias, copias y obligaciones de conservación pertinentes. El código de limpieza de post preparado no acredita baja de cuenta o limpieza histórica.
- [ ] La información de Firebase y otros proveedores coincide con la configuración y contratos reales.
- [ ] Regiones, transferencias y garantías se revisan según los proveedores y ámbitos elegidos.
- [ ] La seguridad de reglas y permisos tiene evidencia de prueba en el entorno que se publicará.
- [ ] No se afirma vender, anonimizar o no recopilar datos mediante frases que no se hayan comprobado.
- [ ] Informes a patrocinadores son agregados y no entregan datos personales por motivo del patrocinio.

La revisión de obligaciones y ámbitos debe partir de responsable, usuarios y operaciones reales. En el ámbito de la Unión Europea, el [texto oficial del RGPD](https://eur-lex.europa.eu/eli/reg/2016/679/oj) permite comprobar disposiciones pertinentes; su enlace no acredita que todas las tareas anteriores estén resueltas.

## 4. Cookies, localStorage, IndexedDB y terceros

Inventario de partida obtenido del código local; revisar de nuevo tras cambios y en el navegador publicado. Algunos elementos son preferencias o datos locales, no cookies. Su clasificación depende de la finalidad efectiva y de la revisión correspondiente.

| Elemento | Uso observado o previsto | Comprobación antes de publicar |
|---|---|---|
| Firebase Auth | Estado de autenticación y sesión | Inspeccionar persistencia real, servicios externos, cierre de sesión y documentos del proveedor. |
| `cantera-theme` en localStorage | Tema visual | Confirmar duración, borrado y que se limita a esta preferencia. |
| Idioma, si se persiste | Preferencia de idioma | Identificar clave y mecanismo reales; no inventar una clave inexistente. |
| `cantera-hidden-{UID}` en localStorage | Publicaciones ocultas por una persona | Comprobar aislamiento entre usuarios y procedimiento para restablecer. |
| `cantera_tour_completed` en localStorage | Ayuda introductoria vista en una pantalla heredada | Comprobar si permanece en el servicio final y documentar su finalidad. |
| `cantera-teams-v1` en localStorage | Equipos y sus miembros sólo en demostración | Aislamiento local y ausencia de uso productivo. |
| Caché `cantera-shell-*` del service worker | Archivos estáticos para abrir la interfaz instalada | No almacena datos de Firebase, APIs ni medios. Comprobar actualización publicada. |
| Repositorio local de demostración | Perfiles, eventos y publicaciones en el dispositivo | Claves reales, uso exclusivo de desarrollo y mecanismo de vaciado. |
| `cantera-media-v1` en IndexedDB | Medios locales de demostración | Confirmar que no se activa en producción y que puede borrarse. |
| `acceptedTermsVersion` y `acceptedTermsAt` | Perfil de cuenta: versión `2026-10-08` y momento de aceptación; repositorio local solo en demo | Comprobar grabación y lectura cloud tras activación; no confundir esta aceptación con marketing. |
| Proveedores de medios y enlaces externos | Archivos Firebase o recursos de terceros | Auditar solicitudes y lo que cargan antes y después de interactuar. |
| Tipografía | Fuentes remotas de Google retiradas del código de esta entrega | Confirmar ausencia de solicitudes de fuentes externas en el navegador publicado. |
| Analítica o marketing | No se habilitan por defecto en esta edición | Verificar ausencia real de etiquetas, píxeles y recursos que los activen indirectamente. |

- [ ] El inventario incluye nombre, proveedor, finalidad, mecanismo, duración o condición de borrado y clasificación revisada.
- [ ] La política distingue cookies de otros mecanismos equivalentes de almacenamiento y acceso.
- [ ] La web informa del almacenamiento necesario de sesión y preferencias con términos claros.
- [ ] No se muestra «no usamos cookies» sin auditar SDK y terceros en el sitio desplegado.
- [ ] Las opciones de aceptación/rechazo corresponden a mecanismos que existen; no se usan botones decorativos.
- [ ] Cualquier tecnología opcional que exija permiso permanece desactivada hasta el permiso válido correspondiente.
- [ ] Cambiar o retirar una preferencia tiene efecto técnico real y accesible.
- [ ] La interfaz no confunde aceptar términos con permitir analítica o publicidad.
- [ ] El modo de demostración y sus medios locales se explican solo donde se habilite expresamente para desarrollo.

La revisión española puede utilizar la [guía de cookies de la AEPD](https://www.aepd.es/guias/guia-cookies.pdf) y la auditoría de proveedores consulta su información oficial, como [privacidad de Firebase](https://firebase.google.com/support/privacy). Debe comprobarse el ámbito relevante antes de convertir una conclusión en una regla global.

## 5. Menores, contenido y eventos físicos

- [ ] El acceso adulto provisional se aplica y se comunica con honestidad; autodeclaración no se describe como edad comprobada.
- [ ] No se habilita acceso juvenil hasta completar tutor, consentimiento, retirada y límites de interacción revisados.
- [ ] Eventos y perfiles evitan mostrar datos personales y ubicación innecesarios.
- [ ] Existe recepción y actuación ante imágenes no consentidas, privacidad y reclamaciones de derechos de contenido.
- [ ] Publicar música o vídeo no presupone que Cantera proporciona una licencia para ese material.
- [ ] El organizador conoce las gestiones físicas que debe realizar y explica costes y requisitos.
- [ ] Canal y protocolo de incidencias coinciden con la capacidad real de atención.

## 6. Patrocinio y situación jurídica

- [ ] Se confirma y describe la forma real del proyecto antes de contratar o recibir aportaciones bajo una denominación institucional.
- [ ] El uso de «sin finalidad lucrativa» refleja la orientación inicial sin atribuir un registro o exención no acreditados.
- [ ] Acuerdos identifican aportación, duración, destino, uso de marca, entregables e independencia.
- [ ] No se presenta como patrocinador a una organización con la que no hay acuerdo autorizado.
- [ ] La marca patrocinada se identifica claramente en su presencia pública.
- [ ] Financiación no compra verificación, acceso a datos, resultados o trato favorable de moderación.
- [ ] Registro económico y obligaciones aplicables se revisan según responsable y forma jurídica.
- [ ] Whitepaper refleja financiación confirmada y resultados medidos; no expectativas presentadas como hechos.
- [ ] Se respeta la espera de patrocinio: no activar facturación, Storage, funciones o subidas cloud hasta financiación confirmada y activaciones pertinentes autorizadas.
- [ ] La información pública distingue funciones habilitadas, medios de prueba local y medios cloud pendientes; el núcleo permanece gratuito.

## 7. Evidencia y aprobación de publicación

| Control | Evidencia necesaria | Responsable | Estado |
|---|---|---|---|
| Identificación y contacto | Datos confirmados; respuesta a un envío de prueba | Propietario | Pendiente |
| Revisión documental | Versión de términos, privacidad, almacenamiento y normas | Propietario y revisión competente según ámbito | Pendiente |
| Auditoría de almacenamiento | Inventario y observación del navegador del sitio final | Desarrollo | Código inventariado; auditoría final pendiente |
| Registro e información | Flujo probado con versión correcta y enlaces accesibles | Desarrollo/producto | UI y aceptación integradas; datos legales y prueba cloud pendientes |
| Derechos y eliminación | Petición de prueba y efecto en datos/archivos | Operación/desarrollo | Limpieza de post preparada con 16 pruebas con dobles, también superadas en CI; despliegue y recorrido de derechos pendientes |
| CI de código | Ejecución alojada sobre commit identificado | Desarrollo | Ver matriz vigente del plan y ejecución CI del commit de entrega; sin despliegue ni cuentas reales |
| Permisos y admin | Intentos de acciones no autorizadas denegados | Desarrollo/operación | Reglas ampliadas con pruebas de emulador; ver matriz vigente. Reglas nuevas remotas pendientes; claim y panel administrativo comprobados |
| Moderación y soporte | Caso de prueba recibido, atendido y trazado | Administrador | Pendiente |
| Publicación | URL, versión de código, fecha y documentos efectivos | Responsable de lanzamiento | Pendiente |

La publicación se considera lista cuando los datos están completos, las revisiones necesarias realizadas y las pruebas corresponden al código y configuración publicados. La evidencia contiene fecha y entorno sin datos sensibles. Si cambia el responsable, el proveedor, una finalidad, un mecanismo de almacenamiento o un recorrido importante, revisar los controles afectados y actualizar las versiones.

| Versión documental | Fecha | Cambio |
|---|---|---|
| 0.1 | 5 de octubre de 2026 | Datos pendientes, controles y primer inventario de publicación. |
| 0.2 | 6 de octubre de 2026 | Evidencia local/emuladores, UI legal y aceptación vigente, auditoría Firebase y autorización de despliegue pendiente. |
| 0.3 | 6 de octubre de 2026 | Normalización, recorridos comprobados en navegador local e integración continua con resultado GitHub todavía pendiente. |
| 0.4 | 6 de octubre de 2026 | Limpieza de posts preparada con 16 pruebas adicionales y CI backend Node 22; no declara eliminación operativa ni baja completa. |
| 0.5 | 6 de octubre de 2026 | Decisión de esperar patrocinador, subidas cloud desactivadas y QA local de reproducción MP4 2 s y rechazo 91 s. |
| 0.6 | 6 de octubre de 2026 | Registra una ejecución histórica de CI; mantiene pendientes los controles de nube, datos reales, financiación y publicación. |
| 0.7 | 6 de octubre de 2026 | Términos 2026-10-06, equipos privados, coordinación y derechos preparados; evidencia vigente en plan/whitepaper y puerta de apertura explícita. |

Estado de publicación: **pendiente**. La orientación sin finalidad lucrativa no implica una entidad constituida. Las cuentas juveniles siguen fuera de la primera apertura hasta contar con tutela, controles y revisión.

| 0.8 | 8 de octubre de 2026 | Términos 2026-10-08, mensajería, administración comprobada, derechos y respaldo ampliados; apertura y revisión operativa pendientes. |
