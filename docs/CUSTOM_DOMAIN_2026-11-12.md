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

Código publicado: `1a8ee356d1dd6083f1ce513d83dab78ffff7256a`.

- [CI completa aprobada](https://github.com/rommer1997/CANTERA-/actions/runs/43324454695): TypeScript, cliente, compilación, reglas, integración HTTP en emuladores, Worker y limpieza. En local pasaron 353 pruebas del cliente y diez del Worker; la integración del Worker que requiere emuladores se ejecutó en CI.
- [Conectividad desde GitHub aprobada](https://github.com/rommer1997/CANTERA-/actions/runs/43324454809) después de publicar la configuración nueva de Pages. El primer intento, anterior al despliegue, devolvió el rechazo esperado del nuevo origen; se repitió después de desplegar y pasó.
- Worker actualizado, versión `6e06ee2d-e01e-4e9e-a07f-5e0e733c3323`; cron existente conservado. Pages publicado en producción, despliegue `b6eda9de`. La API de producción devuelve 200/`ready:true` y preflight 204 para las dos direcciones, 401 sin identidad y 403 para un dominio con sufijo falso. Se comprobó que la clave VAPID pública coincide con la anterior; no se regeneraron claves.
- Hosting desplegado y ocho archivos comprobados byte por byte contra el build, incluidos HTML, manifest, service worker, icono y lector QR. La versión `.web.app` devuelve 200.
- Google habilitado, dominio nuevo autorizado y los anteriores conservados. La preparación OAuth con `Origin` y `Referer` del dominio nuevo devuelve 200 y URL en `accounts.google.com`; el helper existente devuelve 200. No acredita un acceso real desde el nuevo sitio mientras su DNS no resuelva. Un ensayo adicional con la credencial de la CLI devolvió `INVALID_IDP_RESPONSE` en ambas direcciones: no se cuenta como prueba de acceso y no permite atribuir un fallo específico al dominio nuevo.

## Espera externa y comprobación pendiente

A las **23:00 UTC del 12 de noviembre** (00:00 del día 13 en Madrid), ambos servidores de DonDominio responden con el A y los TXT correctos, pero el servidor autoritativo `n3ns.nic.es` aún devuelve `NXDOMAIN` para la delegación del nuevo dominio. Firebase conserva `HOST_UNHOSTED`, `OWNERSHIP_MISSING` y `CERT_VALIDATING`. El acceso HTTP dirigido a la IP de Firebase produce la redirección a HTTPS esperada; esa comprobación no demuestra resolución pública ni un certificado válido.

La creación del dominio en Hosting y la configuración DNS no equivalen a un certificado activo. [DonDominio explica la publicación por intervalos de los dominios .es](https://www.dondominio.com/es/help/314/actualizacion-los-servidores-dns-los-dominios-es/); los horarios que describe no son una garantía de activación. No se cambian nuevamente los servidores DNS para intentar acelerar el proceso.

Cuando el registro publique la delegación, comprobar resolución pública, estado `CERT_ACTIVE`, HTTPS sin omitir validación y coincidencia de la app servida. Después comprobar acceso con Google y activación/recepción/clic push desde la nueva instalación física. Hasta entonces **la migración no se declara terminada**. La dirección `.web.app` continúa disponible y sus dispositivos se conservan.

Evidencias locales: `.audit/custom-domain-dns-verification.json`, `.audit/domain-hosting-get.json`, `.audit/custom-domain-auth-verification.json`, `.audit/custom-domain-push-verification.json`, `.audit/custom-domain-hosting-verification.json` y logs de pruebas/despliegue. Las herramientas de diagnóstico de Hosting están en `.audit/domain-hosting.cjs` (GET por defecto) y `.audit/check-custom-domain-auth.cjs`; reutilizan la sesión autorizada de Firebase CLI sin imprimir credenciales.

## Instalación en el teléfono

La sesión, la instalación PWA y el permiso push son independientes para cada origen. La app anterior no se redirige automáticamente, para conservar sus enlaces e instalaciones. Cuando HTTPS esté activo, abrir `https://lacantera.com.es` en Safari, entrar con la misma cuenta, añadir esa dirección a la pantalla de inicio y activar los avisos desde la nueva instalación. Los datos pertenecen al mismo proyecto Firebase: no se debe crear otra cuenta ni copiar perfiles.

Antes de retirar el icono anterior, desactivar sus notificaciones si no se quieren recibir avisos duplicados en las dos instalaciones. El ensayo físico del dominio anterior no acredita la recepción ni el clic desde el nuevo: se comprobarán con el iPhone bloqueado, un mensaje y una invitación privada.

## Reversión

La dirección `https://lacantera.web.app` sigue activa. Revertir el build no exige cambiar la base de datos. Si hubiera que retirar el dominio nuevo, revisar primero sus dispositivos y enlaces compartidos; conservar los registros y el recurso de Hosting mientras se resuelve cualquier incidencia de DNS o certificado.
