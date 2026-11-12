# Dominio propio de LaCantera

El responsable ha autorizado conectar `lacantera.com.es` a Firebase Hosting, conservar el acceso con Google y adaptar las notificaciones al nuevo dominio. El dominio está registrado en DonDominio hasta el 12 de noviembre de 2027, con renovación manual. Esta operación no contrata alojamiento, certificados de pago ni planes adicionales.

## Configuración

- Sitio existente `lacantera`, proyecto `gen-lang-client-0853130215`. No se cambia Firestore, usuarios ni roles.
- Dominio personalizado creado en Hosting con certificado `GROUPED` del plan Spark. Los registros se obtuvieron de la respuesta real de Firebase: A del dominio raíz a `199.36.158.100`, TXT `hosting-site=lacantera` y TXT ACME en `_acme-challenge`. Se sustituyó únicamente el ANAME de parking del dominio raíz. Se conservaron el SPF y los demás registros existentes.
- `lacantera.com.es` añadido a `authorizedDomains` mediante el script existente y lectura posterior de verificación, conservando los once dominios anteriores.
- Google mantiene el proveedor, el cliente OAuth y el helper Firebase existentes. La app usa `signInWithPopup`, no redirección de sesión; añadir el dominio autorizado no requiere sustituir el cliente ni registrar otro callback OAuth.
- Pages y el Worker de reintentos admiten únicamente `https://lacantera.com.es` y `https://lacantera.web.app`. Se mantienen D1, VAPID y los dispositivos ya inscritos. Ningún origen de desarrollo se añade a producción.
- Los QR de ambas direcciones se admiten entre las dos instalaciones. Los enlaces nuevos se generan con el origen real de la ventana. Manifest, service worker e iconos usan rutas relativas al dominio.

## Pruebas y publicación

Se añaden pruebas que decodifican un QR real del dominio nuevo y verifican la compatibilidad con la dirección anterior, rechazando HTTP, sufijos falsos y puertos ajenos. Las pruebas del servidor comprueban ambas configuraciones de producción, preflight CORS, rechazo de orígenes ajenos y rechazo de operaciones sin identidad.

El resultado final del despliegue, la CI y las comprobaciones de DNS/HTTPS se documentarán después de ejecutarlos. La creación del dominio en Hosting y la configuración DNS no equivalen a un certificado activo.

## Instalación en el teléfono

La sesión, la instalación PWA y el permiso push son independientes para cada origen. La app anterior no se redirige automáticamente, para conservar sus enlaces e instalaciones. Cuando HTTPS esté activo, abrir `https://lacantera.com.es` en Safari, entrar con la misma cuenta, añadir esa dirección a la pantalla de inicio y activar los avisos desde la nueva instalación. Los datos pertenecen al mismo proyecto Firebase: no se debe crear otra cuenta ni copiar perfiles.

Antes de retirar el icono anterior, desactivar sus notificaciones si no se quieren recibir avisos duplicados en las dos instalaciones. El ensayo físico del dominio anterior no acredita la recepción ni el clic desde el nuevo: se comprobarán con el iPhone bloqueado, un mensaje y una invitación privada.

## Reversión

La dirección `https://lacantera.web.app` sigue activa. Revertir el build no exige cambiar la base de datos. Si hubiera que retirar el dominio nuevo, revisar primero sus dispositivos y enlaces compartidos; conservar los registros y el recurso de Hosting mientras se resuelve cualquier incidencia de DNS o certificado.
