# Exportación de cuenta para el operador

`scripts/export-account.cjs` prepara un JSON de los datos conservados para un UID. Usa Firebase Admin SDK, las dependencias de `functions/` y Application Default Credentials (ADC) del operador autorizado. Lee el proyecto y la base **nombrada** de `firebase-applet-config.json`; no utiliza una base por defecto ni la sesión del navegador. Requiere Node 24 o posterior. No se ha ejecutado contra la nube durante su preparación.

La herramienta no necesita que la persona acepte una nueva versión de los términos, complete su perfil ni tenga una cuenta activa. La autorización técnica procede de las credenciales del operador. Antes de consultar y antes de entregar, el operador debe comprobar la identidad del solicitante, que el UID corresponde a esa identidad y que proyecto/base son los correctos. No basta con que alguien facilite un UID. Una identidad eliminada de Auth puede conservar documentos: en ese caso `account.auth` será `null` y hay que revisar manualmente la identificación.

## Procedimiento

1. Revisar la solicitud propia en la cola de derechos, comprobar la identidad mediante el canal privado acordado y vincular el UID a la cuenta. Marcar la solicitud como en tramitación con las herramientas de administración cuando corresponda.
2. Disponer de las dependencias de `functions/` y ADC autorizadas. `firebase login` por sí solo no configura necesariamente ADC. Comprobar localmente `firebase-applet-config.json` antes de usar la herramienta.
3. Ejecutar primero la simulación. También es el modo por defecto si no se añade `--apply`:

   ```sh
   node scripts/export-account.cjs --uid UID --dry-run
   ```

   La simulación consulta todos los registros relevantes y muestra únicamente proyecto, base y recuentos. No muestra UID, correos ni contenido; no crea ningún archivo y no modifica la nube.

4. Revisar los recuentos y las exclusiones indicadas abajo. Para crear el archivo local:

   ```sh
   node scripts/export-account.cjs --apply --uid UID --output output/private/cuenta.json
   ```

   La salida tiene que estar dentro de `output/private/`, ser `.json` y estar excluida de Git. Se crean carpetas privadas con permisos `0700` y un archivo `0600`. La herramienta rechaza enlaces simbólicos, rutas fuera de esa carpeta y archivos existentes. Para una segunda exportación, elegir otro nombre. No usar `public/`, adjuntarlo a un PR ni abrirlo mediante una URL pública.

5. Revisar el JSON de forma privada antes de entregarlo, especialmente el texto libre de publicaciones, incidencias, verificación e información pública de encuentros. La proyección elimina campos estructurados de otras personas; no interpreta ni anonimiza lo escrito dentro de un texto. Acordar con el titular un canal privado de entrega y comprobar otra vez la identidad. Registrar el cumplimiento y actualizar la solicitud sólo después de la entrega, utilizando la administración. El script no envía mensajes ni modifica el estado de la solicitud.
6. Retirar la copia local cuando deje de ser necesaria conforme al procedimiento de conservación que establezca el responsable. Esta carpeta está excluida de Git, pero no está cifrada por la herramienta ni protegida frente a las copias de seguridad del dispositivo.

## Contenido y límites

- Identidad propia de Firebase Auth: UID, contacto, estado, fechas y proveedores vinculados. No incluye contraseñas, hashes, salt, tokens, secretos de autenticación ni custom claims. Los factores registrados sólo aportan sus datos descriptivos y el teléfono propio cuando existe.
- Perfil privado y público, consentimiento conservado y moderación de la cuenta. También el documento legado `users/UID` y sus reacciones `likes`, cuando existen.
- Publicaciones, comentarios, reacciones, seguimientos salientes, bloqueos, solicitudes de derechos, avisos recibidos, verificaciones y reportes presentados por la cuenta. La bandeja se consulta únicamente por el destinatario solicitante; nunca se exportan los avisos ni las fechas de lectura de otras personas.
- Encuentros organizados, inscripciones actuales, espera y respuestas conservadas después de retirarse. Se consultan por UID y se incluyen mapas antiguos sin depender de la ventana de la interfaz. Los metadatos públicos, resultados y horarios se acompañan únicamente de la inscripción, respuesta y espera del solicitante. No se exportan listas de otros participantes, sus respuestas, la cola de UID ajenos ni los identificadores de otros jugadores en los cruces.
- Calendario actual de los encuentros vinculados: `fixtureRecords` proyecta explícitamente los registros de `communityFixtures` y esos marcadores sustituyen la copia antigua del documento del encuentro. Se conservan ronda, resultado, lugar, zona y fecha, sin identificadores ajenos de jugadores. `fixtureSource`, `fixtureExpectedCount` y `fixtureAvailableCount` permiten distinguir el origen y detectar registros canónicos ausentes; no se reemplazan por marcadores antiguos. Los encuentros anteriores que aún no declaran cruces canónicos pueden mantener `fixtureSource: "event-document"`.
- Cambios propios de encuentros y registros de cambios de los encuentros vinculados en `communityEventChanges`, sin `audienceIds`. También comprobantes de promociones enviados o recibidos por el solicitante, sin identidad estructurada del otro destinatario o remitente. Los comprobantes de distribución `communityEventDeliveries` se consultan sólo por el organizador (`actorId`). Si el destinatario es otra persona, se omiten su UID y la clave original del documento que pudiera contenerlo, sustituyéndola por `exportReference`. Estos comprobantes no contienen estados de lectura de la bandeja.
- Equipos propios o vinculados a una membresía/solicitud personal: metadatos públicos y sólo membresías y solicitudes propias. No incluye listas privadas de otros miembros ni sus solicitudes. Sólo se incluyen invitaciones creadas por el solicitante; el token de una invitación ajena usada en una solicitud se sustituye por `usedInvitation`.
- Invitaciones cortas de conexión o acceso a encuentros privados creadas por la cuenta (`ownerId`) o consumidas por ella (`usedBy`). Se conservan clase, evento vinculado, estado, creación y consumo, indicando `createdBySelf` y `usedBySelf`. No se entrega el código, la clave original del documento, `inviteId` ni el UID de la otra persona. Una invitación activa sigue siendo un secreto reutilizable hasta su consumo, cancelación o caducidad; la exportación no sirve para compartir ese acceso. `exportReference` identifica el registro sólo dentro del archivo.
- Contactos privados del solicitante, consultados únicamente en `communityConnections/UID/members`. Se exportan UID propio, fecha y referencia local de cada relación; se omiten el UID del contacto, la ruta original y el código consumido. `connectionReference` e `invitationReference` permiten vincular registros propios sin recuperar esas claves. No se consulta ni exporta la lista privada de contactos de la otra persona.
- Recibos propios de incorporación mediante invitación en `communityEventAdmissions/EVENT/members/UID`. Conservan UID propio, evento vinculado y fecha, con `usedInvitation` y, si se conserva la invitación personal relacionada, `invitationReference`. No incluyen el código ni otros miembros. Los recibos de distintos eventos permanecen separados aunque todos tengan el mismo UID como clave de documento.
- Mensajes escritos por el solicitante en conversaciones y en archivos privados que se hayan creado al tramitar la baja de su antiguo contacto. Sólo se exporta `senderId == UID`, texto y fecha, con referencias locales de mensaje/conversación. No se incluyen mensajes recibidos, la ruta, el ID del archivo ni la identidad estructurada de una cuenta retirada. El archivo no reabre el chat ni permite continuar una conversación con una cuenta eliminada.

Las lecturas se paginan en bloques de 200 sin un límite de 100 registros. Calendarios y cambios se consultan por cada `eventId` vinculado, además de los cambios de autoría propia, sin descargar toda la colección. Las invitaciones se consultan con dos filtros personales, por creador y por consumidor. Para los recibos se utiliza una consulta de grupo `members` filtrada por `userId == UID`, seguida de una comprobación de ruta exacta bajo `communityEventAdmissions`; las subcolecciones `members` de contactos, equipos o cualquier otro padre quedan excluidas. La consulta requiere el índice de grupo `members.userId`; si falta, la herramienta falla en lugar de descargar todos los miembros o todas las cuentas.

El JSON incluye versión del formato, recuentos y hora de inicio/fin: las consultas sucesivas no constituyen una instantánea transaccional de toda la cuenta. No recupera documentos borrados ni versiones históricas sustituidas. Sólo proyecta campos explícitos del esquema actual; los campos nuevos requieren revisar la proyección y sus pruebas. No descarga binarios de fotos o vídeos: conserva las referencias de las publicaciones propias. `historySource: "event-document-cache"` identifica la caché pública de historial; los registros independientes conservados se encuentran en `collections.communityEventChanges`.

Si una consulta, un índice, las credenciales o la escritura privada fallan, no se declara una exportación completada. Los errores sólo muestran etapa y código técnico, sin mensajes del SDK que puedan contener identificadores. Revisar el acceso y los índices del proyecto con las herramientas administrativas antes de repetir; no sustituir las consultas por una descarga sin filtrar de la base.

## Borrado

### Publicaciones retiradas sin Functions

El borrado del documento de una publicación no elimina por sí mismo sus likes/comentarios. Las reglas preparadas impiden que terceros consulten esas interacciones cuando el padre ya no existe; sus autores conservan consulta y retirada propias y la administración conserva acceso para tramitar derechos. Esta protección requiere desplegar las reglas autorizadas; no se atribuye al estado remoto todavía pendiente.

El operador puede revisar IDs concretos de publicaciones retiradas mediante:

```sh
node scripts/cleanup-deleted-posts.cjs --post ID --dry-run
```

Para la eliminación física, después de revisar y autorizar ese alcance, sustituir `--dry-run` por `--apply`. Requiere ADC autorizadas y dependencias Admin de `functions/`, sin desplegar Functions ni activar facturación. Cada lote verifica transaccionalmente que la publicación siga ausente; si reaparece, sus interacciones quedan protegidas. Máximo 20 IDs explícitos, 200 documentos por lote y 8 lotes globales por defecto; `--max-batches` admite hasta 32. Si se agota el presupuesto, el resumen indica desde qué posición de la lista continuar: omitir los IDs anteriores ya revisados para que los primeros vacíos no consuman repetidamente el límite. La herramienta no imprime IDs, texto, correos ni credenciales y no borra publicaciones activas ni archivos.

Una simulación o una ejecución limitada no acredita que toda la limpieza esté completada. Comprobar el resumen y repetir con los IDs pendientes hasta concluir. Este mantenimiento no sustituye la supresión completa de una cuenta.

### Cuenta completa

El exportador anterior no borra datos. `scripts/erase-account.cjs` permite al operador preparar un plan y aplicar una **supresión limitada al esquema conocido**, con revisión previa y reanudación. No es una eliminación recursiva general ni resuelve por sí sola todos los casos de conservación.

Estado de esta revisión, **13 de octubre de 2026**: el plan de supresión tiene formato **v2**, incorpora el tratamiento compartido descrito a continuación y se ha validado localmente con dobles de datos y transacciones de Firestore Emulator, incluida una base demo nombrada. No se ha aplicado una baja con esta revisión sobre cuentas reales ni se acredita un despliegue nuevo, la aprobación del responsable o la apertura pública.

El procedimiento preparado el **8 de octubre de 2026** bloqueaba de forma general conversaciones, referencias de coordinación, historial deportivo, seguimientos entrantes e interacciones ajenas. Esa descripción explica el alcance histórico de v1; no describe el plan v2 actual. Los planes y diarios v1 no se reutilizan: hay que preparar y revisar un plan nuevo con la versión del repositorio correspondiente.

Primero verificar la identidad y solicitud del titular, el UID exacto, proyecto y base nombrada. Usar las mismas dependencias Admin/ADC que el exportador. Preparar un plan de sólo lectura de nube:

```sh
node scripts/erase-account.cjs --uid UID --dry-run --output output/private/supresion-plan.json
```

Sin `--output` sólo se muestran recuentos, bloqueos y la huella del plan. Con `--output` se crea exclusivamente un archivo privado `0600` en una carpeta `0700` excluida de Git; no se sobrescriben archivos. El plan contiene UID, rutas, acciones, huellas previas y posteriores y destinos/alias aleatorios, sin texto, correos ni credenciales. Las rutas de invitaciones contienen códigos y el plan permite relacionar el origen con un archivo o alias: también es material confidencial. Revisarlo de forma privada, no adjuntarlo a un PR ni servirlo desde `public/`.

La planificación mantiene bloqueos para una cuenta administradora, la propiedad/gestión de equipos y la organización de un encuentro que no esté completado o cancelado. Resolver primero la transferencia explícita y sus obligaciones con el responsable; archivar un equipo no elimina por sí solo su propiedad. También bloquea medios que requieren tratamiento independiente, colecciones raíz o descendientes no revisados, campos de esquema desconocidos, participantes/espera incoherentes, archivos con propietario o mensajes inesperados, destinos ocupados y rutas compartidas cuyo ID contenga el UID. No amplía el alcance ni elimina referencias de terceros para reparar silenciosamente un documento inconsistente. Volver a generar y revisar un plan nuevo después de resolver el caso.

El plan v2 admite estas acciones compartidas concretas:

- Retirar seguimientos hacia la cuenta y bloqueos que la señalan: elimina sólo esos registros de relación, conservando las demás relaciones de sus autores. Los dos extremos de un contacto privado siguen retirándose de forma atómica.
- Retirar el UID, nombre de inscripción, RSVP y espera en un encuentro ajeno. Si hay cruces canónicos o antiguos que necesitan conservar una plaza deportiva, sustituye la plaza por un alias aleatorio propio del encuentro y el rótulo «Cuenta eliminada», manteniendo rondas y marcadores. Para un encuentro propio completado/cancelado, sustituye también la identidad estructurada del organizador. El alias es una medida técnica para retirar referencias directas, no una garantía de anonimización del evento completo.
- Retirar el UID de `audienceIds` de cambios y sustituir la autoría propia conservada cuando corresponda; retirar comprobantes destinados al solicitante y vaciar su identidad estructurada como autor/actor en promociones y entregas que permanecen para otra persona. El texto y las fechas compartidas se conservan. No envía nuevos avisos ni promueve automáticamente la lista de espera al liberar una plaza: el organizador debe revisar la convocatoria y su cola.
- Retirar publicaciones propias y su texto. Cuando una publicación tiene comentarios escritos por otras personas, conservar un documento mínimo de publicación retirada sin identidad ni texto del solicitante para mantener esos comentarios; retirar sus reacciones vinculadas. No borra el texto de comentarios ajenos para resolver la baja.
- Retirar el UID del roster de un piloto, si está presente. Si el roster queda vacío, el runtime pasa a `paused`; no abre el servicio ni modifica claims.

Ninguna de estas acciones interpreta los nombres o referencias personales escritos dentro de títulos, descripciones, resultados, comentarios o mensajes de terceros. Esa revisión específica, los medios y las copias conservadas siguen siendo parte del caso de derechos. No se inventa un plazo legal de conservación; revisar con el responsable los criterios de [OPERATING_POLICY.md](OPERATING_POLICY.md), que siguen siendo una propuesta hasta su aprobación y operación efectiva.

Un plan sin bloqueos puede retirar documentos propios de perfiles, publicaciones de texto, comentarios, reacciones, seguimientos salientes, bloqueos propios, avisos, verificaciones, reportes y solicitudes de derechos; membresías personales sin gestión, solicitudes e invitaciones de equipo propias; códigos propios, contactos con sus dos extremos, recibos de admisión, mensajes propios y datos legados del usuario. Los registros de operación/moderación/derechos incluidos deben haberse revisado antes de aprobar su retirada. La herramienta no conserva automáticamente un expediente adicional ni modifica una solicitud como «completada».

Para una invitación consumida que pertenece a otra persona, conserva el documento y su estado `used`, pero vacía únicamente `usedBy` y `usedAt`. Así retira el vínculo personal sin reactivar el código ni borrar el registro del otro creador.

En chats, la ruta canónica `communityConversations/UID:PEER` contiene ambas identidades y no puede conservarse sin tratarla. El plan elimina mensajes de `senderId == UID`. Copia exclusivamente los mensajes escritos por el superviviente a `communityConversations/archive_<32 caracteres hexadecimales aleatorios>/messages/MESSAGE`, con un padre `{id, participantIds: [PEER], createdAt, archived: true}`. El ID aleatorio no deriva del UID retirado; los documentos nuevos no incluyen la ruta ni el ID de conversación original. Cada mensaje se copia y su original se retira en la misma transacción, comprobando las huellas exactas del mensaje, padre y destino. El padre original se retira después de los mensajes; una colisión o cambio aborta sin reemplazar texto ajeno. La reanudación admite sólo copias ya confirmadas con el mismo contenido y destino.

Este archivo privado no es un chat activo y las reglas del cliente no conceden lectura directa de su nueva ruta. El operador puede exportar **sólo el texto propio del superviviente** tras verificar su identidad mediante el exportador anterior. La baja posterior del superviviente retira sus mensajes archivados y ese padre. Si aparecen otros participantes, mensajes de otros autores, campos o descendientes desconocidos, se detiene para revisión. El archivo puede contener referencias personales dentro del texto de su autor: no se afirma que ese texto quede anonimizado ni se elimina indiscriminadamente.

La detección de contactos espejo huérfanos requiere el índice de grupo `members.peerId`. Los recibos requieren `members.userId` y los mensajes `messages.senderId`. Además, la revisión v2 depende de cuatro índices explícitos preparados en [firestore.indexes.json](../firestore.indexes.json): `communityFixtures.ownerId`, `communityEventChanges.audienceIds` con `CONTAINS`, `communityEventDeliveries.recipientId` y `communityConversations.participantIds` con `CONTAINS`, con orden de documento. Prepararlos localmente no acredita que estén desplegados y `READY` en la base Enterprise: comprobarlo antes de operar. Una consulta/indexación que falle aborta; nunca se sustituye por una descarga sin filtro de todos los contactos, recibos, chats o cuentas.

Aplicar sólo después de revisar y autorizar ese alcance, coordinando una ventana de mantenimiento en la que `communityConfiguration/runtime.serviceStatus` no sea `open`, todos los demás operadores se abstengan de modificar la cuenta y no haya tareas Admin que escriban sus documentos. La herramienta **no pausa la app por sí sola** ni ejecuta el cambio de infraestructura:

```sh
node scripts/erase-account.cjs --uid UID --apply --plan output/private/supresion-plan.json --confirm HUELLA_SHA256_DEL_PLAN --journal output/private/supresion-ejecucion.json --max-batches 8
```

`--apply` necesita UID, plan, huella exacta y diario distinto. La configuración debe coincidir con el proyecto y base nombrada de `functions/config.mjs`; no utiliza la base por defecto. Antes de modificar datos vuelve a leer el alcance y exige que coincida con lo revisado. Bloquea un administrador; nunca retira su claim para saltarse ese control.

La primera aplicación deshabilita Auth y revoca sus sesiones renovables. Registra una prueba de esa congelación y devuelve `waiting-token-expiry` durante **65 minutos**, sin borrar documentos en esa espera. Deshabilitar Auth/revocar la renovación no garantiza la caducidad inmediata de los tokens ya emitidos; la espera conservadora cubre ese intervalo. No reducirla ni editar fechas del diario. Si Auth ya estaba ausente al planificar, no necesita congelar una identidad inexistente.

Repetir el mismo comando después de la espera o de un resultado parcial. Cada ejecución admite de 1 a 32 lotes (8 por defecto), normalmente de 50 acciones y como máximo 100 acciones por lote. Trasladar un mensaje añade lectura de su padre/destino y puede generar hasta tres escrituras: padre de archivo, copia y retirada del original. No confundir acciones con número total de documentos de la transacción. Los dos extremos de cada contacto se procesan juntos, incluso cuando sólo queda un espejo. La verificación final de las rutas originales y los destinos también se reparte en lotes.

El colector y el plan mantienen un presupuesto global deduplicado de **5000 registros/referencias**: las consultas propias, contactos, mensajes de todos los subárboles, destinos de archivo y referencias de colección comparten ese límite. Una consulta individual tampoco puede excederlo. El resultado no se trunca; superarlo detiene la planificación para revisar un procedimiento acotado, sin aumentar límites ni multiplicar 5000 registros por cada conversación.

Cada lote lee transaccionalmente el estado de mantenimiento y cada documento: si cambió su huella, identidad, propiedad o un espejo previsto como ausente reaparece, aborta el lote. Las huellas de Timestamp conservan `seconds` y `nanoseconds` exactos; no convierten a un ISO milisegundo que pueda ocultar un cambio. Las redacciones tienen una huella posterior revisada y las copias a archivo se verifican antes de retirar el origen. Una promoción a administrador, reactivación de Auth, cambio de identidad, nuevo registro o residuo bloquea la continuación. Las modificaciones de Auth y Firestore no forman una transacción conjunta: por eso la coordinación entre operadores es una condición necesaria, especialmente para impedir cambios de claims durante el paso final.

El diario privado se reemplaza atómicamente después de cada lote y permite repetir borrados ya confirmados o una redacción ya aplicada. Se mantiene un bloqueo local por diario para evitar dos procesos simultáneos con el mismo archivo; no lanzar la misma cuenta usando otro diario. Tras una interrupción anormal puede quedar `.lock`: comprobar primero que no siga ejecutándose ningún proceso antes de retirarlo manualmente. Conservar plan y diario íntegros para la revisión. Los recuentos describen operaciones observadas y asentadas en el diario; un commit seguido de un fallo local puede haberse aplicado antes de quedar contado.

Si aparecen cambios, archivos incompletos o referencias nuevas, no editar la huella ni la lista de rutas para forzar la ejecución. Revisar el estado actual con una nueva simulación y acordar la recuperación con el responsable. La cuenta puede quedar deshabilitada y parcialmente retirada; no se reactiva automáticamente ni se revierte el borrado.

Auth se elimina **al final**, después de consultar de nuevo los datos personales del esquema y verificar las rutas originales, incluidos los espejos que desaparecieron de la subcolección propia. Un resultado `completed` con `completeKnownScope: true` acredita ese alcance técnico, no una certificación de todos los datos posibles: revisar también respaldos, archivos/medios externos, copias locales, contenido libre de otras personas, nuevas colecciones, expedientes conservados y obligaciones decididas por el responsable. Marcar o comunicar el cumplimiento sólo cuando esa revisión y la entrega correspondiente hayan terminado. No hay un envío automático al solicitante.

Las pruebas específicas se encuentran en [account-erasure.test.ts](../tests/account-erasure.test.ts), [account-erasure.security.test.mjs](../tests/account-erasure.security.test.mjs), [account-erasure-auth.security.test.mjs](../tests/account-erasure-auth.security.test.mjs) y [account-messages-export.test.ts](../tests/account-messages-export.test.ts). La integración de Firestore Emulator valida dos bajas sucesivas, conservación/exportación del mensaje del superviviente, retirada de su archivo, resultados deportivos y cambios submilisegundo. Las pruebas con dobles cubren carreras, diario perdido, reanudación, presupuesto entre varios subárboles y esquemas incoherentes.

El ensayo adicional del 13 de octubre de 2026 usa llamadas SDK reales a **Authentication Emulator y Firestore Emulator**, con dos identidades sintéticas en un proyecto `demo-*` y una base local nombrada. Antes de usar el SDK o escribir, exige hosts `127.0.0.1` para ambos emuladores y rechaza un proyecto de nube. Comprueba mediante `getUser` la cuenta deshabilitada y la revocación confirmada, verifica que la primera ejecución conserve los documentos durante la espera y elimina Auth sólo después de retirar/verificar Firestore. También confirma la exportación propia del superviviente y la retirada de su archivo en su segunda baja. Resultado local: una prueba completa pasa; comprobante privado `.audit/account-erasure-auth-emulator-2026-10-13.log`. El reloj de gracia se adelanta únicamente mediante la función inyectada del test: no reduce la espera del procedimiento real ni modifica fechas de un diario de producción. Los emuladores se cerraron al terminar.

Ninguna de estas pruebas acredita una supresión de una cuenta real de producción ni una entrega/respuesta a un titular. Son evidencias técnicas locales; no sustituyen la prueba real de soporte, la revisión específica de conservación/custodia o un acta pública.

### Invitaciones, contactos y recibos privados

La caducidad a los diez minutos, la cancelación de un código y la retirada de un contacto son controles de acceso; no acreditan la eliminación física de todos los datos de una cuenta. No existe una tarea TTL desplegada. El exportador sólo consulta estas colecciones; la herramienta de supresión operativa anterior las trata con un plan explícito y revisado, sin ejecutarse automáticamente por una solicitud.

Al tramitar la supresión, el operador debe revisar por UID las invitaciones creadas y los consumos propios, los contactos actuales y sus recibos de admisión. Los códigos activos creados por la cuenta deben quedar inutilizables antes de retirar su identidad. El tratamiento de invitaciones compartidas que pertenecen a otro creador exige revisar qué datos propios se retiran y qué comprobantes se conservan; no debe resolverse borrando indiscriminadamente documentos ajenos. El responsable debe definir y aplicar su política de conservación de forma explícita.

Cada contacto tiene dos documentos: `communityConnections/UID/members/PEER` y `communityConnections/PEER/members/UID`. La retirada requiere eliminar los dos extremos en el mismo lote o transacción, comprobando sus identidades. Conservar la lista de pares autorizados durante la revisión permite verificar también el espejo; borrar únicamente la subcolección del solicitante deja datos residuales en la cuenta del contacto. La función de retirada de contactos de la app realiza esa retirada del par, pero no sustituye el procedimiento completo de supresión de cuenta.

Los recibos propios se localizan por `userId == UID` y por la ruta exacta `communityEventAdmissions/EVENT/members/UID`, sin ampliar la consulta a otros miembros. Antes de borrar el recibo hay que tratar por separado la inscripción, RSVP, espera y resultados del encuentro según el procedimiento acordado. El recibo no es la inscripción del evento: borrar uno no borra automáticamente el otro. Revisar también las referencias propias `usedBy` que permanezcan en invitaciones consumidas. Registrar los cambios concretos y verificar los residuos antes de declarar resuelta la solicitud; no basta con eliminar Firebase Auth.

En modo de prueba, invitaciones y contactos se guardan aparte en `cantera-invitations-v1` dentro del navegador. Esos datos locales no los consulta el exportador Admin ni se sincronizan con la nube; su retirada requiere tratar también ese almacén de la demo cuando corresponda.

## Marcadores privados de lectura — revisión del 15 de octubre

`communityMessageReads` conserva sólo `userId`, `conversationId`, `lastReadAt`, `lastReadMessageId` y `updatedAt`. La exportación consulta `userId == UID`, valida la pareja canónica y entrega el cursor con una referencia de exportación que no revela el identificador del contacto. No incluye texto de mensajes.

La supresión consulta los marcadores de cada conversación canónica vinculada mediante `conversationId == ID`, además de los propios. Retira ambos cursores porque la ruta original deja de existir; no traslada el cursor del superviviente al archivo ni elimina por ello sus textos. Se validan pareja, propietario y ruta exacta antes de retirar, con la misma huella y presupuesto acotado del plan. Las conversaciones ajenas quedan fuera. El respaldo revisado incluye esta colección. Estas herramientas no ejecutan bajas ni copias automáticamente.

Las consultas nuevas requieren los índices explícitos de colección `communityMessageReads.userId` y `communityMessageReads.conversationId`, ambos con orden ascendente de documento. Comprobar estado `READY` en la base Enterprise antes de operar.
