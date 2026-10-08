# Publicación de Cantera en Firebase Hosting

La migración preparada sirve el frontend de Vite con Firebase Hosting estático. La configuración de `firebase.json` publica `dist`, recompila antes de cada publicación y conserva las configuraciones existentes de Firestore, Storage y Functions. No hay servidor de aplicación ni integración de App Hosting.

## Destino y estado

El proyecto existente es `gen-lang-client-0853130215`. El propietario eligió **[lacantera.web.app](https://lacantera.web.app/)**; el sitio `lacantera` se creó en ese proyecto y la web está publicada allí desde el 7 de octubre. `.firebaserc` asigna el target `cantera` exclusivamente a `lacantera`, y `firebase.json` utiliza ese target. Los comandos especifican el proyecto y el target; el sitio predeterminado del proyecto queda fuera del despliegue.

El acceso inicial devolvía 403; se recuperó con la sesión del propietario. `lacantera.web.app` ya está autorizado en Firebase Auth y Google está habilitado. El registro sigue en preparación: publicar el alojamiento no completa la prueba entre cuentas ni la revisión del lanzamiento. No se ha creado otro proyecto. Firebase asigna subdominios `SITE_ID.web.app`; consulta la [gestión de varios sitios](https://firebase.google.com/docs/hosting/multisites).

## Preparación y publicación

Se necesitan Node 24, pnpm y una sesión de Firebase CLI con permisos sobre el proyecto. No compartas contraseñas, códigos de acceso, claves privadas o tokens. Si Firebase devuelve 403, corrige la cuenta seleccionada y sus permisos antes de reintentar; cambiar el alojamiento no corrige el acceso al backend.

Desde la raíz del repositorio:

```sh
pnpm exec firebase login:add
pnpm exec firebase login:use CORREO_DE_LA_CUENTA_AUTORIZADA
pnpm exec firebase hosting:sites:list --project gen-lang-client-0853130215
pnpm lint
pnpm test
pnpm run build:hosting
```

`build:hosting` compila con `VITE_HOSTING_PROVIDER=firebase`, conservando el control de apertura de `pnpm build`. Las variables `VITE_*` se incorporan al JavaScript que recibe el usuario. Se mantienen los datos públicos del responsable y la configuración pública de Firebase en el entorno de compilación; no se copian secretos del servidor al frontend. Las variables de Vercel no se transfieren automáticamente al equipo o al proceso que compile para Firebase.

Los controles de compilación utilizan la misma resolución del entorno de producción que Vite, incluida la prioridad de las variables del proceso sobre los archivos `.env`. Una apertura explícita requiere el acta real aunque un archivo local indique cierre; los controles no sustituyen los permisos ni las pruebas remotas.

Para una revisión temporal o para publicar en el sitio confirmado:

```sh
pnpm run hosting:preview
pnpm run hosting:deploy
```

Los scripts especifican el proyecto anterior y el target `cantera`. `hosting:deploy` utiliza `--only hosting:cantera` y el paso `hosting.predeploy` ejecuta `pnpm run build:hosting` para impedir una publicación con un `dist` de otra compilación. `hosting:preview` utiliza `--only cantera`; el CLI lo resuelve al mismo target y no añade dominios automáticamente a Firebase Auth. Una revisión publicada sí puede consumir las cuotas de Hosting; su URL y fecha de expiración las devuelve Firebase. Estos comandos no modifican reglas, índices, cuentas, administradores ni datos de la aplicación.

No utilices `firebase init` sobre esta configuración ni `firebase deploy` sin `--only`: pueden sustituir configuración o incluir servicios adicionales. Las reglas e índices del backend se aplican mediante un despliegue separado y limitado a la base autorizada.

## Rutas, actualización y comprobación

Cantera usa navegación con `#/...`; el fragmento de la URL lo procesa el navegador. Hosting devuelve el `index.html` para las rutas de aplicación, conservando los archivos estáticos existentes. Los assets ausentes bajo `/assets/` devuelven 404, para evitar servir HTML como si fuera un fragmento de JavaScript.

El HTML, `sw.js`, el manifest y los archivos sin hash requieren revalidación. Sólo los archivos de `/assets/` con el hash de ocho caracteres generado por Vite reciben un año de caché inmutable. La PWA conserva su mecanismo de actualización del shell: un service worker nuevo espera la activación que ofrece la interfaz. Estas cabeceras no almacenan respuestas de Firebase, perfiles, cuentas o contenido privado. La [configuración oficial de Hosting](https://firebase.google.com/docs/hosting/full-config) describe el orden de las cabeceras y las reglas de reescritura.

Después de publicar, comprueba la URL exacta devuelta por Firebase: HTML y manifest, cabeceras de caché, enlaces compartidos con `#/`, instalación en móvil y aviso de nueva versión. Confirma el dominio real en Firebase Auth y prueba registro, aceptación legal, inicio de sesión y acceso con dos cuentas reales antes de abrir el servicio. Una publicación correcta del frontend no acredita esos flujos del backend.

Comprobación realizada sobre la web publicada: HTML, manifest, service worker y asset versionado devuelven 200 con sus tipos y cabeceras esperados; un asset retirado devuelve 404. La navegación `#/` y los datos del responsable se verificaron en navegador, y la consola no mostró avisos o errores. La instalación y actualización en teléfonos físicos y los recorridos con cuentas reales siguen pendientes.

Cambiar de dominio crea un origen distinto para el navegador. Las sesiones y datos locales de prueba no se trasladan; una PWA instalada desde Vercel sigue abriendo el dominio anterior y hay que instalarla desde la nueva URL. Los datos que ya existan en el mismo proyecto de Firebase no se migran por publicar otro frontend. Actualiza los enlaces públicos una vez comprobado el sitio nuevo y retira el despliegue anterior cuando el cambio esté validado.

## Uso gratuito y límites

Hosting tiene cuotas gratuitas por proyecto y permite alojar la aplicación estática sin activar los servicios de pago preparados en el código. Sus cuotas se comparten entre sitios, versiones y canales; no equivalen a uso ilimitado. En Spark, superar la transferencia gratuita puede suspender el sitio hasta el siguiente periodo. Revisa el consumo en la consola conforme crezca el uso. Véase [cuotas y precios de Hosting](https://firebase.google.com/docs/hosting/usage-quotas-pricing).

Esta publicación no activa Blaze, facturación, Storage para archivos de usuarios ni Functions. Fotos y vídeos siguen pendientes de patrocinio. Los archivos que componen el frontend en Hosting y las subidas de contenido de usuarios a Firebase Storage son servicios diferentes.

## Verificación local incorporada

`tests/firebase-hosting.test.ts` arranca en un puerto local temporal la misma capa HTTP utilizada por el emulador de Hosting. Comprueba el fallback de la SPA, la revalidación de HTML/PWA, el caché de archivos versionados y el 404 de assets retirados. Usa archivos de prueba y no consulta ni modifica servicios remotos. No sustituye la comprobación del despliegue, Auth y Firestore reales.

`tests/release-environment.test.ts` comprueba la discrepancia entre flags del proceso y archivos locales, así como el rechazo de actas incompletas, proyecto distinto y activación de demo/medios. Las actas de ensayo se crean únicamente en carpetas temporales aisladas; no se genera una aprobación del proyecto.
