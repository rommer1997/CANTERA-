# Conexiones e invitaciones privadas

## Comportamiento

En **Conexiones**, una cuenta completa crea un código y su QR para conectar con otra cuenta. El organizador de un **partido o torneo privado** también genera códigos desde su detalle. Cada código admite una persona, caduca a los diez minutos y puede cancelarse. Compartir abre la hoja nativa del dispositivo o WhatsApp/SMS; Cantera no envía mensajes automáticamente.

La persona invitada abre `/#/invite/CODIGO`, introduce el código o pulsa **Escanear QR** en `/#/connect`. Puede activar la cámara o elegir una imagen guardada. El lector procesa la imagen en el dispositivo, sin subirla, y abre únicamente la ruta de una invitación de LaCantera; escanear no acepta ni inscribe automáticamente. Necesita una cuenta con correo verificado, país, ciudad, mayoría de edad declarada y términos actuales aceptados. Se vuelve al enlace después de completar la cuenta. Aceptar una conexión crea dos contactos privados; cualquiera puede desconectar ambos. Seguir una cuenta sigue siendo una función pública independiente.

Aceptar un código de evento inscribe a la persona sólo si el encuentro sigue abierto, futuro, sin calendario cerrado y con una plaza disponible. La persona elige el nombre público de su inscripción (jugador, grupo o equipo). No se consume un código al fallar la inscripción. La invitación no muestra título, lugar ni participantes antes del canje. Conectar con un organizador tampoco permite ver sus eventos privados.

La privacidad se fija al crear el encuentro. Los privados se consultan por su organización, participantes y administrador; quedan fuera de búsqueda, feed, perfiles públicos y agenda pública del equipo. No pueden vincularse a una publicación pública. Los participantes acceden al mismo calendario y resultados del encuentro después de inscribirse.

## Controles

- Código aleatorio de 16 símbolos, 80 bits de entropía y alfabeto sin caracteres ambiguos. No se permite listar invitaciones de terceros.
- Caducidad autorizada por `createdAt` del servidor + diez minutos. El contador del navegador es informativo.
- Consumo transaccional de `communityInvitations`, dos documentos recíprocos en `communityConnections/UID/members/PEER`, o inscripción y comprobante en `communityEventAdmissions/EVENT/members/UID`.
- Reglas comprueban canje único, correo verificado, perfil elegible, bloqueos y capacidad. Una transacción fallida no concede acceso ni consume el código.
- Reintentos de un canje ya completado requieren que la relación o inscripción siga existiendo. Un código usado no restaura un acceso retirado.
- Al perder permiso o cambiar de cuenta se retiran detalle, calendario e historial de las cachés de interfaz. Los avisos privados ya entregados pueden permanecer en la bandeja; las nuevas entregas requieren membresía actual.
- Cancelar un código y desconectar no requiere aceptar nuevas condiciones ni que el servicio esté abierto.

No se activa facturación, Storage, Functions, chat o envío de SMS. Fotos y vídeos cloud siguen pendientes de patrocinio.

## Verificación y límites

Las pruebas de dominio cubren generación, formato, normalización, caducidad, reintentos y conexiones. Las reglas se prueban en Firestore emulado, incluyendo canje concurrente, aforo, consultas privadas, recibos y suplantación. Registrar el resultado exacto del CI antes de desplegar.

En navegador se verificó con dos cuentas locales la conexión recíproca, copia del código, inscripción por código en un torneo privado con nombre de equipo propio y retirada del acceso al abandonar el encuentro. El diálogo se comprobó a 390×844 y 320×740; sin desbordamiento horizontal, con desplazamiento interno en la pantalla pequeña. Estas son pruebas aisladas, no cuentas reales.

El lector se probó con imágenes PNG generadas para este ensayo: un QR de invitación abre la ruta interna con su código, y un QR de un dominio ajeno muestra un rechazo sin navegar. El lector a 320×740 y la cabecera a 820×1000 no desbordan horizontalmente. Las pruebas de cámara usan dobles locales (permisos tardíos, cierre, navegación, segundo plano y selección de imagen); no se ha probado aún la cámara de un teléfono físico.

La actualización de la PWA conserva los módulos de las pestañas anteriores hasta actualizarse o cerrarse. Otra pestaña ofrece «Recargar app» sin recargar automáticamente sus formularios. Diez pruebas aisladas comprueban el cambio de versión, los módulos diferidos, la limpieza de cachés y que Firebase, cuentas y medios quedan fuera de esa caché estática.

La demo usa dos almacenes de este navegador y lleva una etiqueta visible. Sus códigos no funcionan en otros dispositivos y no acreditan una transacción cloud o uso con clientes reales. No se añaden perfiles de ejemplo al backend.

Después del despliegue de reglas, completar el recorrido entre dos cuentas reales y la administración antes de abrir el registro. La publicación anterior no contiene esta funcionalidad; el estado desplegado se registra en `RELEASE_2026-10-07.md`.
