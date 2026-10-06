# Cantera

Comunidad de fútbol con organización gratuita de partidos y torneos y un feed de reels, fotos y logros. Personas, grupos y clubes amateurs o profesionales pueden participar. Los eventos abiertos especifican país, ciudad y zona horaria.

## Estado de esta entrega

La interfaz y los recorridos están implementados, con integración Firebase y un entorno local separado. **No está declarada lista para clientes ni publicada en producción**: faltan activación autorizada de las reglas, dominio de acceso Google, Storage con financiación habilitada, identidad legal del responsable y comprobación con cuentas reales. La aprobación del cambio de reglas está pendiente después de que la revisión automática rechazase la modificación del bloqueo total actual.

El proyecto Firebase existente contiene la base nombrada `ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb` en la región `eur3`. La auditoría del 6 de octubre de 2026 encontró reglas remotas deny-all, ninguna cubeta de almacenamiento y facturación deshabilitada. No se han modificado esos servicios en esta entrega. Google Auth tampoco incluye todavía `cantera-tau.vercel.app` entre sus dominios autorizados.

## Funciones implementadas

- Perfil propio con nombre público, país/ciudad, entidad, nivel, equipo, descripción y aceptación versionada de términos.
- Perfiles públicos navegables, directorio de personas/grupos/clubes y seguimiento persistente. El directorio carga páginas de 40; cada perfil consulta sus publicaciones y eventos en páginas de 20, con contadores de relaciones consultados en el servidor.
- Acceso Google y restauración de sesión mediante Firebase Auth; cierre de sesión real.
- Partidos de fútbol 5/7/11, nivel amateur/profesional, inscripción de personas/equipos, aforo, cierre/cancelación, invitados del organizador, enlace compartido e invitación `.ics`.
- Torneos de liga o eliminación directa, calendario y resultados, clasificación, pases libres y avance automático de rondas. Hasta 32 participantes; partidos hasta 64 plazas. El marcador decisivo de eliminatorias incluye los penaltis cuando proceda y no admite empate.
- Feed cronológico con reel MP4/WebM (50 MiB y 90 s), foto JPEG/PNG/WebP (10 MiB) y logro escrito, asociación a evento, likes, comentarios, enlaces, ocultar, denuncia y retirada propia.
- Feed social con Comunidad/Siguiendo, autores y comentarios enlazados a perfiles y búsqueda sobre publicaciones mostradas; identidad de blanco, negro y rojo. En móvil conserva navegación inferior, creación y agenda; en escritorio mantiene la landing de inicio.
- Solicitudes de verificación privadas y administración protegida por custom claim `admin`, aprobaciones y moderación.
- Términos, privacidad, política de almacenamiento, misión y patrocinio; whitepaper descargable. Sin analítica o seguimiento publicitario añadido, sin fuentes remotas.

## Desarrollo y comprobaciones

Requiere Node 24 o superior y pnpm. El paquete fija pnpm 11; Java 21 o superior para los emuladores.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm test
pnpm build
pnpm test:security
```

La interfaz local está en `http://127.0.0.1:3000/`. Las rutas usan HashRouter: `/#/play`, `/#/feed`, `/#/people`, `/#/people/ID`, `/#/profile` y `/#/admin`.

Las pruebas de seguridad sólo se ejecutan en un proyecto emulado `demo-*`, nunca contra producción. Comprueban permisos por usuario, consentimiento, privacidad, límites, última plaza concurrente, aprobación administrativa y almacenamiento. La [ejecución de GitHub Actions del 6 de octubre de 2026](https://github.com/rommer1997/CANTERA-/actions/runs/37384779319), sobre el commit `54fd7e98c9469dac60e0fedd53594e778f7b9751`, superó ambos trabajos: TypeScript, compilación, 14 pruebas de dominio/normalización, 19 de seguridad emulada y 16 de limpieza con dobles de datos/archivos, 49 en total. La integración continua de `.github/workflows/ci.yml` separa app Node 24/Java 21 y backend Node 22. Este resultado no despliega servicios ni prueba cuentas reales.

El rediseño social del 6 de octubre amplía las comprobaciones a 19 pruebas de dominio/normalización y 23 de seguridad emulada. Con las 16 del backend, la suite contiene 58 casos. TypeScript y compilación también pasan localmente. La ejecución de CI correspondiente a cada commit se consulta en el [PR de la entrega](https://github.com/rommer1997/CANTERA-/pull/1); no sustituye el recorrido con cuentas reales.

La instalación mantiene la política estricta de pnpm: `pnpm-workspace.yaml` autoriza únicamente las versiones revisadas de esbuild y bloquea los scripts opcionales revisados de las otras dependencias. Las dependencias nuevas con scripts requieren una decisión explícita.

## Entorno local separado

En desarrollo, Perfil → Probar en este dispositivo permite usar la app sin crear cuentas externas. Los datos se conservan en `localStorage` y los archivos en `IndexedDB`, con un aviso visible. No es una comunidad multiusuario ni se publica en Firebase. El modo elegido sobrevive a recargas. En producción permanece deshabilitado salvo activación explícita `VITE_ENABLE_DEMO=true`, que no debe utilizarse para clientes reales.

## Decisión de financiación

El responsable eligió esperar a un patrocinador antes de financiar Storage. No se ha activado facturación. En nube, las cargas de fotos/reels quedan desactivadas por defecto con `VITE_ENABLE_MEDIA_UPLOADS=false`, con un aviso en el creador; el logro escrito sigue disponible. El entorno demo permite probar archivos locales. Activar la variable requiere primero financiar y comprobar almacenamiento, permisos, cuotas y limpieza. La app no se presenta como lanzamiento completo mientras esos requisitos estén pendientes.

## Preparación de producción

1. Completar `.env.local`/variables Vercel a partir de `.env.example`: responsable real, contacto público y país; revisar las políticas legales y publicar plazos de conservación y garantías de proveedores. No requiere Gemini ni una clave de IA.
2. Revisar y autorizar `firestore.rules`; después desplegar sólo la base de Cantera y los índices de `firestore.indexes.json`. La cuenta privada reside en `communityProfiles`; el directorio sólo consulta la proyección deportiva `communityPublicProfiles`. Preparar las proyecciones de cuentas existentes con `scripts/project-public-profiles.cjs --dry-run` y aplicar sólo tras revisar y autorizar los totales. Requiere Node 24, dependencias de `functions` y credenciales Admin del propietario ya autorizadas; no se ha ejecutado en nube. Omite cuentas incompletas o sin mayoría de edad/términos vigentes y no imprime sus datos. El archivo de configuración no incluye otras bases del mismo proyecto. No publicar reglas abiertas generales.
3. Autorizar `cantera-tau.vercel.app` y los dominios finales en Firebase Auth manteniendo los actuales. Para pruebas locales, autorizar localhost/127.0.0.1 según corresponda.
4. El responsable debe habilitar el plan que permita Storage, crear la cubeta y seleccionar región/alertas de presupuesto. Este paso puede generar costes. Después desplegar `storage.rules` y confirmar el nombre real de la cubeta en configuración. Los medios publicados son públicos, también mediante sus enlaces de descarga.
5. Desplegar el backend `cantera-cleanup` preparado en `functions/` y comprobar el borrado asíncrono de una publicación real, sus likes/comentarios y su archivo. Revisar cuenta de ejecución, errores, reintentos, copias y retenciones. [Contrato y pruebas del backend](functions/README.md). Requiere infraestructura financiada; no se ha desplegado.
6. El propietario accede una vez con su cuenta. Desde una sesión Firebase CLI autorizada, otorgarle el claim `admin` usando `scripts/manage-admin.cjs --email CORREO --apply`, tras verificar su identidad. No hay un selector de administrador en el cliente. El script conserva otros claims. Volver a iniciar sesión para renovar el token.
7. Ejecutar `pnpm check:release`, TypeScript, pruebas y build. La comprobación de variables no sustituye las pruebas de nube.
8. Probar con dos cuentas reales: crear y editar perfil, buscar y abrir la otra cuenta, seguir/dejar de seguir, feed Siguiendo, crear evento, inscribir al segundo, última plaza, cancelar, subir y leer foto/reel, like/comentario, solicitud privada y aprobación, denuncia y retirada. Verificar permisos también con acceso directo a Firestore y que edad/aceptación no aparecen en lecturas públicas.
9. Desplegar primero en un entorno de revisión Vercel; comprobar escritorio/móvil y enlaces. Publicar en producción sólo después del checklist de [publicación legal](docs/LEGAL_RELEASE_CHECKLIST.md) y los controles operativos del plan.

## Límites que requieren trabajo antes de un lanzamiento amplio

- El listado general cloud carga como máximo 100 eventos y publicaciones y 1000 interacciones recientes. Los detalles de eventos/publicaciones por enlace tienen consulta puntual; directorio y actividad por perfil están paginados. Falta ampliar la paginación y agregación del feed general y sus interacciones para volúmenes mayores; sus contadores corresponden a esa ventana. Los recuentos de seguidores/seguidos se consultan por separado con agregación de servidor.
- Inspección del archivo en servidor, transcodificación, cuotas por usuario, control antiabuso/App Check, bloqueo de cuentas y limpieza automática aún pendientes. MIME/tamaño se comprueban en Storage, duración del vídeo en cliente.
- Calendarios y marcadores del organizador no constituyen verificación oficial. Los permisos se hacen cumplir en reglas; la validación de cada fixture requiere servicio de servidor para universalizarla.
- El backend de limpieza con reintentos y 16 pruebas está implementado, pendiente de despliegue. Hasta activarlo, una retirada no garantiza la eliminación de likes/comentarios o de un archivo cuyo borrado falle. No barre huérfanos anteriores ni medios nunca publicados. Las retenciones, copias y peticiones de derechos/baja requieren un proceso del responsable configurado y operativo.
- Menores, equipos con plantilla y permisos de varios gestores, chat, avisos por correo/push, otras lenguas y funcionalidades originales de scouting siguen en la hoja de ruta. Esta primera versión de cuentas requiere mayoría de edad; no es una protección infantil completa.

## Documentación

- [Plan 0 → 100 %](PLAN_CANTERA.md)
- [Whitepaper](WHITEPAPER.md)
- [Checklist legal](docs/LEGAL_RELEASE_CHECKLIST.md)
- [Guía oficial de requisitos de Storage](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)
