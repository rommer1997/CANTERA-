# Limpieza de publicaciones de Cantera

Backend preparado y probado localmente. **No desplegado**: todavía no elimina datos de la nube. No requiere ni incorpora archivos de credenciales; el adaptador utiliza la identidad gestionada de Cloud Functions al ejecutarse.

## Contrato

- Exportación: `cleanupCommunityPost` en `index.mjs`, Cloud Functions **Gen2**.
- Proyecto: `gen-lang-client-0853130215`.
- Base de datos exacta: `ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb`.
- Evento: eliminación de `communityPosts/{postId}`; no tiene endpoint de acciones para el cliente.
- Región: `europe-west1`, recomendada para la base de datos `eur3` auditada.
- Runtime: Node **22** (`engines.node` y `firebase.json`), ESM.
- Reintentos: `retry: true`; los errores temporales de Firestore o Storage se propagan.
- Recursos: máximo dos instancias, concurrencia uno por instancia, cero instancias mínimas, 256 MiB, timeout 540 segundos.

La función borra `communityLikes` y `communityComments` que tengan exactamente el `postId` eliminado. Consulta y elimina hasta **450 documentos por transacción**, vuelve a consultar hasta no encontrar resultados y comprueba el padre en cada transacción. Si el padre reaparece, conserva las nuevas interacciones. Las consultas de igualdad utilizan el índice de campo único de `postId`; no requieren un índice compuesto nuevo.

Después, elimina el archivo del bucket fijo `gen-lang-client-0853130215.firebasestorage.app`. Sólo admite `community/{authorId}/{postId}.{jpg,png,webp,mp4,webm}`, con identificadores seguros y extensión correspondiente a foto o reel. Nunca obtiene bucket ni ruta de `mediaUrl`. Una ruta ajena o inválida se conserva y genera un aviso; las interacciones válidas sí se limpian.

Storage usa `ignoreNotFound: true` y una precondición `ifGenerationMatch` para el archivo consultado. Un archivo subido después del evento, una publicación recreada o una generación reemplazada se conservan. La entrega duplicada del evento y el borrado previo desde el cliente son válidos; un fallo tras un lote exitoso continúa desde los documentos restantes en el próximo reintento.

## Verificación

Paquete y lock independientes del frontend. Desde la raíz del repositorio, con Node 22.13 o superior dentro de la rama 22 y pnpm 11.19.0:

```sh
pnpm --dir functions --ignore-workspace install --frozen-lockfile --ignore-scripts
pnpm --dir functions --ignore-workspace test
pnpm --dir functions --ignore-workspace check
```

**16/16 pruebas pasan con Node 22.23.3**, descargado de `nodejs.org` en `/tmp` y verificado con su checksum oficial; no se instaló globalmente. `node --check` pasa para el adaptador y el handler.

Las pruebas de `tests/cleanup.test.mjs` utilizan dobles de Firestore y Storage, sin llamadas a servicios reales. Comprueban lotes de 450, más de mil interacciones, reintentos tras progreso parcial, fallos 503, ausencia 404, preservación de documentos y rutas ajenas, identificadores de Firestore, recreación del padre, cambios de generación y la configuración exportada del adaptador Firebase real. No acreditan un despliegue ni una prueba de integración en la nube.

## Activación pendiente

Antes de activar esta función se necesitan el proyecto Firebase con facturación y APIs necesarias, el bucket creado y accesible, y una cuenta de ejecución con permisos sobre **esa base de datos y ese bucket**. Hay que desplegar el codebase `cantera-cleanup` de `firebase.json`, comprobar la entrega real del evento en una publicación de prueba y revisar que desaparezcan sus interacciones y su objeto de Storage. Esta implementación no activa facturación, cambia IAM ni despliega nada.

Los logs identifican publicación, resultado y cantidades, sin texto de publicaciones, comentarios, URLs de descarga ni tokens. Deben monitorizarse errores y los avisos `cleanup_media_path_rejected`, `cleanup_media_preserved` y `cleanup_event_rejected`: los errores reintentables pueden agotar la ventana de reintentos de la plataforma y requerir intervención operativa.

La limpieza es asíncrona. Sólo alcanza eliminaciones ocurridas **después** de activar el trigger; no barre huérfanos anteriores, perfiles, eventos, informes de moderación ni medios subidos que nunca llegaron a publicarse. Estos casos necesitan una política y un proceso separados. La retirada del objeto activo tampoco altera las políticas de borrado suave, versiones o copias de seguridad del bucket/base de datos; sus plazos deben revisarse antes de prometer un borrado físico definitivo.

## Fuentes oficiales

- [Runtime Node, ESM y opciones de ejecución](https://firebase.google.com/docs/functions/manage-functions).
- [Triggers Firestore, bases nombradas y entrega al menos una vez](https://firebase.google.com/docs/functions/firestore-events).
- [Región recomendada para `eur3`](https://firebase.google.com/docs/functions/locations).
- [Reintentos de funciones asíncronas](https://firebase.google.com/docs/functions/retries).
- [Dependencias y lockfiles de pnpm](https://firebase.google.com/docs/functions/handle-dependencies).
- [Borrado condicionado por generación de Storage](https://cloud.google.com/storage/docs/samples/storage-delete-file).
- [Retención por borrado suave de Storage](https://cloud.google.com/storage/docs/soft-delete).
