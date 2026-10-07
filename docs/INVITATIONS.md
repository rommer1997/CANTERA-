# Conexiones e invitaciones privadas

## Comportamiento

En **Conexiones**, una cuenta completa crea un código y su QR para conectar con otra cuenta. El organizador de un **partido o torneo privado** también genera códigos desde su detalle. Cada código admite una persona, caduca a los diez minutos y puede cancelarse. Compartir abre la hoja nativa del dispositivo o WhatsApp/SMS; Cantera no envía mensajes automáticamente.

La persona invitada abre `/#/invite/CODIGO` o introduce el código en `/#/connect`. Necesita una cuenta con correo verificado, país, ciudad, mayoría de edad declarada y términos actuales aceptados. Se vuelve al enlace después de completar la cuenta. Aceptar una conexión crea dos contactos privados; cualquiera puede desconectar ambos. Seguir una cuenta sigue siendo una función pública independiente.

Aceptar un código de evento inscribe a la persona sólo si el encuentro sigue abierto, futuro, sin calendario cerrado y con una plaza disponible. No se consume un código al fallar la inscripción. La invitación no muestra título, lugar ni participantes antes del canje. Conectar con un organizador tampoco permite ver sus eventos privados.

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

La demo usa dos almacenes de este navegador y lleva una etiqueta visible. Sus códigos no funcionan en otros dispositivos y no acreditan una transacción cloud o uso con clientes reales. No se añaden perfiles de ejemplo al backend.

Después del despliegue de reglas, completar el recorrido entre dos cuentas reales y la administración antes de abrir el registro. La publicación anterior no contiene esta funcionalidad; el estado desplegado se registra en `RELEASE_2026-10-07.md`.
