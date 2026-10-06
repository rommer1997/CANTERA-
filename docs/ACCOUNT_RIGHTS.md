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

Las lecturas se paginan en bloques de 200 sin un límite de 100 registros. Calendarios y cambios se consultan por cada `eventId` vinculado, además de los cambios de autoría propia, sin descargar toda la colección. El JSON incluye versión del formato, recuentos y hora de inicio/fin: las consultas sucesivas no constituyen una instantánea transaccional de toda la cuenta. No recupera documentos borrados ni versiones históricas sustituidas. Sólo proyecta campos explícitos del esquema actual; los campos nuevos requieren revisar la proyección y sus pruebas. No descarga binarios de fotos o vídeos: conserva las referencias de las publicaciones propias. `historySource: "event-document-cache"` identifica la caché pública de historial; los registros independientes conservados se encuentran en `collections.communityEventChanges`.

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

Esta herramienta **no borra datos**, no cambia Auth, no concede permisos y no despliega servicios. Las solicitudes de eliminación quedan para revisión del operador. Antes de automatizarlas hay que acordar cómo transferir o cerrar equipos y encuentros organizados, tratar resultados compartidos y conservar o retirar registros de coordinación y moderación. La exportación no acredita por sí sola que una solicitud de borrado esté resuelta.
