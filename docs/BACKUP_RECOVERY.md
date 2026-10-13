# Respaldo de la comunidad y ensayo de recuperación

Estas herramientas permiten obtener una instantánea de los documentos comunitarios y comprobar su restauración en un emulador local. No programan copias, no habilitan facturación ni implementan una recuperación en producción.

## Alcance y procedencia

La fuente está fijada al proyecto `gen-lang-client-0853130215` y a su base nombrada `ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb`. El script verifica ambos identificadores en `firebase-applet-config.json`; no acepta sustituirlos por argumentos o variables de entorno. Utiliza la sesión humana seleccionada en Firebase CLI, mediante `requireAuth` y `apiv2.Client`. No exporta tokens, claves, claims ni cuentas de Firebase Authentication.

Se incluyen los documentos de las 26 colecciones `community*` enumeradas en `ROOT_COLLECTIONS`, incluidas configuración, perfiles, cuentas moderadas, eventos, resultados, equipos, interacciones, invitaciones, derechos, conexiones y conversaciones. Sólo se admiten estas subcolecciones conocidas:

- `communityConnections/{uid}/members/{peerId}`.
- `communityEventAdmissions/{eventId}/members/{uid}`.
- `communityConversations/{conversationId}/messages/{messageId}`.

La revisión local del 13 de octubre de 2026 incorpora archivos privados de mensajes de un superviviente de una baja: `communityConversations/archive_<ID aleatorio>/messages/{messageId}`. Permanecen dentro de la misma colección y subcolección conocidas; el respaldo conserva sus campos como valores REST, incluido `archived: true`, sin convertirlos en un chat activo. Su tratamiento y exportación propia se describen en [ACCOUNT_RIGHTS.md](ACCOUNT_RIGHTS.md). Al recuperar, revisar también las bajas posteriores del titular del archivo: una copia anterior no debe reintroducir mensajes que ya haya solicitado retirar. Esta nota describe compatibilidad del esquema; no acredita un nuevo respaldo real ni una restauración en producción.

La enumeración usa páginas de 200 y `showMissing` para encontrar subcolecciones cuyos documentos padre no existen. No crea esos padres al restaurar. Una colección `community*` desconocida o un descendiente no revisado detienen el respaldo; no se obtiene una copia silenciosamente incompleta. Otras colecciones raíz quedan fuera y se informa su cantidad, sin leer sus documentos.

Todas las páginas comparten un `readTime` obtenido del servidor. [Firestore permite fijarlo en la enumeración de colecciones](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/listCollectionIds) y [en la de documentos](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/list). La ventana ordinaria es de una hora: un respaldo que la supere debe repetirse; no se habilita PITR. El límite operativo es de 100.000 documentos/padres virtuales y 256 MiB de JSON: superarlo provoca un error, nunca truncamiento.

Los campos se conservan como valores REST de Firestore. Esto evita convertir enteros de 64 bits a números JavaScript o perder bytes y precisión temporal. Se validan los tipos conocidos; las referencias a otros proyectos, bases o colecciones fuera del esquema se rechazan para revisión.

No se incluyen los archivos de fotos/vídeos, Firebase Auth, reglas, índices, Hosting, Functions ni colecciones antiguas ajenas a `community*`, incluidos `users/{uid}` y `users/{uid}/likes`. Conservar por separado la versión del repositorio que corresponde al respaldo. Los enlaces multimedia guardados en documentos siguen siendo enlaces; no son copias de sus archivos.

## Obtener un respaldo

Requisitos: Node 24+, dependencias del repositorio, sesión humana de Firebase CLI con lectura de la base autorizada y `output/private/` ignorado por Git. No se acepta `FIREBASE_TOKEN` ni ejecutar esta lectura con `FIRESTORE_EMULATOR_HOST` establecido.

Desde la raíz del repositorio, revisar primero el inventario:

```sh
node scripts/community-backup.cjs --dry-run
```

Esta simulación **sí lee la base de producción**, consume las lecturas correspondientes y muestra sólo cantidades; no guarda el archivo ni modifica la nube. Ejecutarla únicamente dentro de una tarea de respaldo autorizada.

Guardar la instantánea con un nombre nuevo:

```sh
node scripts/community-backup.cjs --apply --output output/private/respaldo-2026-10-08.json
```

`--apply` sólo autoriza la escritura del archivo local. La salida no puede salir de `output/private/`, reutilizar un nombre existente ni atravesar enlaces simbólicos. El directorio privado y sus descendientes tienen permisos `0700`; el JSON se crea de forma exclusiva con `0600`. La consola informa cantidades y resultado, sin nombres, mensajes, correos, rutas de documentos ni credenciales. Los cuerpos REST no se registran en los logs de Firebase CLI.

El manifiesto contiene versión de formato, procedencia exacta, esquema, instante de lectura, inventario, exclusiones y SHA-256 de todos los datos. El hash detecta alteraciones accidentales; no sustituye una firma ni demuestra quién produjo el archivo.

## Ensayo local de recuperación

El único destino permitido es **`http://127.0.0.1:8080`**, con un proyecto **`demo-*`** y la base **`(default)`**. El script no carga credenciales de producción, no acepta otros hosts/puertos y rechaza redirecciones. Usa el acceso de propietario del emulador local. No cambies el código para apuntar este comando a producción.

Coordinar el puerto antes de iniciar Firestore Emulator. Si ya hay uno ejecutándose, reutilizarlo con un proyecto de ensayo independiente. No limpiar otros proyectos ni su base. Por ejemplo, el proyecto `demo-cantera-recovery` mantiene los datos del ensayo separados del proyecto de pruebas `demo-cantera`.

Validar archivo y plan sin enviar ninguna petición:

```sh
node scripts/restore-backup-emulator.cjs --input output/private/respaldo-2026-10-08.json --project demo-cantera-recovery --dry-run
```

Aplicar el ensayo sólo cuando el emulador esté disponible:

```sh
node scripts/restore-backup-emulator.cjs --input output/private/respaldo-2026-10-08.json --project demo-cantera-recovery --apply
```

Antes de escribir, se comprueba que **todos** los documentos de destino estén ausentes. Cada escritura mantiene además `currentDocument.exists=false`; un documento creado concurrentemente detiene el lote sin sobrescribirlo. Las [escrituras de cada `commit` son atómicas](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/commit), pero el conjunto de varios lotes no es una transacción única. Si un lote posterior falla puede quedar una restauración parcial en el emulador. No se reintenta automáticamente ni se borra el destino.

Los lotes no superan 100 escrituras ni 8 MiB. Tras escribir, se leen de nuevo todos los documentos y se comparan sus campos; la consola indica `fieldsVerified: true` sólo si coinciden. Las referencias internas se remapean al proyecto del emulador. Los metadatos de documento `createTime` y `updateTime` los genera el destino; los timestamps almacenados como campos de negocio sí se conservan.

[Firestore almacena timestamps con precisión de microsegundos](https://firebase.google.com/docs/firestore/reference/rest/v1/Value). El manifiesto no recorta los valores recibidos, pero el plan rechaza antes de escribir una precisión superior no representable, para impedir un redondeo silencioso de archivos importados o modificados.

## Evidencias y límites operativos

Las pruebas offline están en `tests/community-backup.test.ts` y cubren tipos REST, integridad, 201 documentos paginados, padres virtuales, esquemas desconocidos, permisos y enlaces del sistema de archivos, bloqueo de destinos de nube, simulación sin red, conflictos y verificación posterior. El ensayo real con datos sintéticos debe registrarse con su resultado y fecha, sin publicar archivos privados.

Ensayo del 8 de octubre de 2026: se aplicó una instantánea sintética de un documento únicamente a `demo-cantera-recovery/(default)` en `127.0.0.1:8080`. La lectura posterior confirmó los ocho campos, incluidos Timestamp con microsegundos, Int64 máximo, bytes, referencia remapeada, mapa y lista vacíos y punto geográfico. Resultado: `written: 1`, `integrityVerified: true`, `fieldsVerified: true`. No se leyó producción ni se incluyeron cuentas reales. Una prueba previa con nanosegundos detectó el redondeo del emulador; el plan ahora impide ese caso antes de escribir.

Ensayo del **13 de octubre de 2026** con una copia real del piloto: `community-backup.cjs` leyó únicamente el proyecto/base autorizados y guardó `output/private/respaldo-preapertura-2026-10-13.json`. Instante de servidor: `2026-10-13T20:13:59.432468Z` (22:13 en Madrid). Inventario: 7 documentos en 26 colecciones revisadas, sin padres ausentes ni colecciones raíz excluidas: configuración, dos perfiles privados, dos públicos, un encuentro privado y una invitación. La migración de metadatos revisó seis documentos del snapshot, todos sin cambios ni bloqueos; la invitación queda fuera de ese procedimiento de migración.

La misma copia se restauró sólo en `demo-cantera-release-recovery-20261013/(default)` en `127.0.0.1:8080`, comprobando primero un destino vacío y después los campos normalizados de todos los documentos. Resultado: `documents: 7`, `written: 7`, `chunks: 1`, `integrityVerified: true`, `fieldsVerified: true`. SHA-256 del manifiesto: `80ea9119beccc4679bb9594c79aef9be9bb194b0b4a25f34d90af7f52ff7ed35`. El emulador se cerró al terminar. Los comprobantes técnicos privados se conservan bajo `.audit/preopening-backup-saved-2026-10-13.json`, `.audit/preopening-snapshot-inventory-2026-10-13.json` y `.audit/preopening-restore-rehearsal-2026-10-13.log`. No hubo escrituras en la nube, cambios en Auth ni restauración de producción.

Este ensayo acredita la copia y recuperación local de los documentos presentes en ese instante; no certifica restauración de Authentication, permisos, archivos multimedia o la aplicación completa. La copia todavía no contenía contactos, conversaciones ni admisiones reales. Los archivos de chat de bajas se prueban con fixtures en el ensayo separado de [derechos](ACCOUNT_RIGHTS.md); no se atribuyen al inventario real de esta copia. Antes de abrir siguen pendientes la revisión del responsable sobre custodia, exclusiones y recuperación, y mantener un respaldo acorde con los cambios posteriores del piloto. El ensayo no es un acta de apertura pública.

Los respaldos contienen datos personales y mensajes privados. `0600` limita el acceso local, pero no cifra el archivo. El responsable debe definir almacenamiento cifrado bajo su control, acceso, conservación y eliminación, y comprobar si la carpeta se sincroniza con servicios externos antes de usarla. No subir los JSON a Git, Pages, incidencias, capturas o canales de soporte. Una solicitud de supresión también exige revisar las copias conservadas y evitar reintroducir datos eliminados al recuperar.

No hay ejecución recurrente, retención automática, rotación, copia externa, monitorización de fallos, RPO/RTO garantizados, importación de Auth ni restauración de producción implementados por estos scripts.
