# Piloto privado de LaCantera

El piloto permite probar el recorrido real con **1–5 cuentas de Google verificadas**, incluida la cuenta administradora `rommer@garitocastizo.com`. No abre el registro público, habilita archivos ni activa facturación, Storage o Functions. Los clientes ajenos al listado no pueden participar en el piloto.

El operador usa una sesión humana de Firebase CLI ya autorizada, seleccionada para esta carpeta. La herramienta sólo admite el proyecto `gen-lang-client-0853130215`, la base nombrada `ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb` y el documento `communityConfiguration/runtime`. No otorga permisos de administración.

Primero revisa sin escribir:

```sh
node scripts/manage-pilot.cjs --email rommer@garitocastizo.com
```

Para incluir otra cuenta real, ésta debe haberse identificado con Google en LaCantera; repite `--email` con su correo. El operador debe contar con autorización para incorporarla. La herramienta comprueba el correo y el UID devueltos por Auth, el proveedor Google, la verificación del correo, la habilitación de la cuenta y el permiso existente del responsable. El resumen impreso sólo contiene cantidades y estado.

Tras revisar el resultado, el mismo comando con `--apply` publica únicamente el estado `pilot`. Requiere reglas y frontend compatibles previamente desplegados. Sólo permite partir de un documento ausente o en estado `setup`, `paused` o `pilot`, y rechaza medios activos, estados abiertos o esquemas desconocidos.

Los participantes ya incluidos se conservan, se comprueba también su identidad y el total no puede superar cinco. El documento público almacena UIDs, no una lista de correos. La escritura utiliza una precondición de existencia o `updateTime` y hora del servidor para impedir sobrescribir cambios concurrentes. No reintenta escrituras; ante un error, revisa el estado remoto antes de repetir. La retirada de participantes y la apertura general requieren otra acción de administración revisada.
