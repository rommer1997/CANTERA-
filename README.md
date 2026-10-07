# Cantera

Comunidad de fútbol para organizar partidos y torneos gratis, coordinar equipos y compartir actividad deportiva. Personas, grupos y clubes amateurs o profesionales pueden participar dentro de las condiciones de la beta adulta.

## Estado de esta revisión

**Edición del 7 de octubre de 2026: web publicada en [lacantera.web.app](https://lacantera.web.app/), con registro todavía en preparación.** Las reglas e índices de la base nombrada están aplicados y el dominio tiene acceso autorizado en Google Auth. El estado de esta puesta en marcha está en [RELEASE_2026-10-07.md](docs/RELEASE_2026-10-07.md). No se declara el producto terminado para clientes. El sitio anterior de Vercel no se ha retirado ni actualizado a producción.

El acceso se recuperó mediante el inicio de sesión del propietario el 7 de octubre. La base `ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb`, región `eur3`, estaba vacía y protegida con `deny-all`. Tras la autorización concreta del propietario se aplicaron las reglas revisadas y las 18 definiciones de índices; el contenido remoto de reglas coincide con el archivo local. Se añadieron `lacantera.web.app` y el dominio anterior autorizado `cantera-tau.vercel.app` a Auth conservando sus dominios previos. Google está habilitado. La facturación sigue desactivada.

El sitio `lacantera` está creado en el proyecto existente. La configuración y los comandos de [FIREBASE_HOSTING.md](docs/FIREBASE_HOSTING.md) apuntan únicamente a ese sitio mediante el target `cantera`.

La versión vigente de aceptación es **`2026-10-06`**. El propietario ha declarado Rommer, persona física, España y `Rommer@garitocastizo.com`; estos datos están incorporados en la web publicada. Queda identificar la cuenta administradora, probar el recorrido entre dos cuentas reales, comprobar el canal atendido y completar la revisión de operación, recuperación y derechos. No se ha fabricado una identidad jurídica, una aprobación o un patrocinador.

## Alcance implementado en código local

| Área | Comportamiento presente | Límite de esta entrega |
|---|---|---|
| Cuenta | Acceso Google, restauración de sesión, perfil propio y aceptación versionada | Integración sin prueba final con cuentas reales. El alta real comienza vacía, sin jugador de ejemplo compartido. |
| Perfiles | Proyección deportiva pública separada de edad/aceptación privadas; seguimiento, fichas y actividad paginadas | Búsqueda por prefijos de nombre/ciudad/país en servidor. No es búsqueda semántica ni un censo completo de usuarios. |
| Conexiones e invitaciones | Contactos recíprocos por aceptación; códigos y QR de una persona, diez minutos, cancelables; enlace para entrar a partidos/torneos privados | Implementados en esta revisión; [controles y comprobaciones](docs/INVITATIONS.md). No implica chat o envío automático de SMS. |
| Equipos | Ficha pública; plantilla privada; propietario, responsables y miembros; invitaciones y solicitudes con aprobación | La invitación no incorpora automáticamente. Transferir propiedad, retirar miembros, salir y archivar tienen reglas propias. |
| Encuentros | Fútbol 5/7/11, país/ciudad/zona, aforo, inscripción y retirada, invitados del organizador, respuestas RSVP y privacidad fijada al crear | Partidos de 2–64 plazas; torneos de 2–32. No reserva campos ni procesa pagos. |
| Espera y avisos | Orden de espera, retirada y promoción al liberar/ampliar plazas; avisos internos al ascendido | Condicionado al estado y calendario del evento. No correo/push ni confirmación de lectura universal. |
| Edición | Motivo, revisión, historial consultable y ledger de cambios; avisos a participantes | No certifica resultados oficiales ni sustituye resolución de disputas. |
| Recurrencia | Crear 2–12 eventos semanales, quincenales o mensuales respetando zona y cambio horario | Cada ocurrencia es un evento independiente; no edición conjunta de una temporada. |
| Torneos | Liga, eliminatoria, pases libres, clasificación, horarios por cruce y resultados | 40 pruebas de reglas emuladas superadas, incluida liga de 32; reglas y recorrido cloud real pendientes. |
| Calendario | Exportación `.ics` del evento o cruces realmente programados | Descargar/importar archivo, sin sincronización bidireccional. |
| Comunidad | Feed cronológico Comunidad/Siguiendo, formatos, publicaciones paginadas, enlaces puntuales y búsqueda sobre contenido cargado | No algoritmo de recomendaciones simulado. Visor vertical de reels sólo cuando hay archivos reales disponibles. |
| Interacción | Conteos de servidor por publicación, likes, comentarios paginados, denuncia y bloqueo | Retirar contenido propio o dejar de seguir no exige aceptar una versión nueva para ejercer esos controles. |
| Administración | Verificación manual, denuncias, suspensión de cuentas y colas pendientes paginadas | Claim `admin` confiable; cuenta administradora y operación reales pendientes. |
| Derechos | Solicitud privada de exportación/supresión, revisión administrativa y exportador del operador | Preparar una exportación no elimina la cuenta. Procedimiento, documentación y prueba real todavía deben cerrarse. |
| PWA | Instalación cuando el navegador la admite y caché versionada del armazón estático | No garantiza datos cloud sin red, no ofrece escrituras offline ni sincronización offline propia. |

Fotos/reels cloud permanecen cerrados hasta patrocinio. El código de producción deshabilita su creación y las reglas de Storage deniegan nuevas cargas del cliente, incluso si se altera la interfaz o una variable. La demostración explícita permite medios locales. Límites de la prueba: foto JPEG/PNG/WebP de 10 MiB; vídeo MP4/WebM de 50 MiB y 90 segundos. La inspección confiable del archivo, cuotas y financiación son requisitos de una futura apertura de medios.

## Desarrollo y pruebas

Node 24 o superior, pnpm fijado por `packageManager` y Java 21 o superior para emuladores.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm test
pnpm build
pnpm test:security
```

Local: `http://127.0.0.1:3000/`. HashRouter: `/#/play`, `/#/feed`, `/#/people`, `/#/people/ID`, `/#/teams`, `/#/teams/ID`, `/#/teams/join/INVITACION`, `/#/activity`, `/#/profile` y `/#/admin`. La navegación móvil usa accesos inferiores y un creador compacto; el feed ocupa la pantalla con contenido real. En escritorio se conserva el inicio de presentación.

`pnpm test` incluye lógica, normalización, equipos, migración y exportación mediante pruebas locales. `pnpm test:security` utiliza exclusivamente un proyecto emulado `demo-*`. El paquete `functions/` tiene pruebas separadas de limpieza con dobles, sin acceso a Firebase real. CI y comprobaciones locales no despliegan servicios.

**Evidencia histórica:** la [ejecución CI 37384779319](https://github.com/rommer1997/CANTERA-/actions/runs/37384779319), sobre `54fd7e98c9469dac60e0fedd53594e778f7b9751`, superó TypeScript, build y 49 casos: 14 de dominio/normalización, 19 emulados y 16 de limpieza. La revisión social `c4880af6bdc107fa3f56ced9d106e82b07943bff` documentó después 58 casos locales: 19 TS, 23 emulados y 16 de limpieza. Ambos registros pertenecen a entregas anteriores; **58 no es el total de esta ampliación**.

La entrega del 6 de octubre `b9a7522e0470bf52f4e5242543faf8558f3e9d86` superó [Cantera CI #22](https://github.com/rommer1997/CANTERA-/actions/runs/37534230311): 156 casos, con 100 TS, 40 de reglas emuladas y 16 de limpieza. La ampliación del 7 de octubre añade 21 pruebas offline de preparación Auth/limpieza manual y 3 de reglas; sus 121 pruebas TS, TypeScript y compilación cerrada pasan en local. Los emuladores se ejecutan en CI porque no hay JVM local; comprobar esa ejecución sobre el commit de entrega antes de desplegar. Los recorridos móviles de entregas anteriores son evidencia histórica, no pruebas de cuentas cloud reales. Firebase sigue en un bloque de 737,61 kB sin comprimir: el rendimiento en dispositivos y redes reales continúa pendiente de medición. La matriz completa está en [PLAN_CANTERA.md](PLAN_CANTERA.md). Un control pendiente no se marca superado por heredar una prueba histórica. La instalación mantiene la política estricta de scripts revisados en `pnpm-workspace.yaml`.

## Demostración separada

Perfil → Probar en este dispositivo permite ensayar sin crear cuentas externas en desarrollo. Datos en `localStorage`, archivos en `IndexedDB` y aviso visible. No es una comunidad multiusuario ni sincroniza dispositivos. Los datos de prueba no se utilizan como cifras de usuarios o tracción. En producción se mantiene `VITE_ENABLE_DEMO=false`.

## Puertas de apertura

1. Identificar al responsable real y atender soporte, privacidad, verificación y derechos; revisar textos y conservación. Consultar [revisión de publicación](docs/RELEASE_REVIEW.md) y [checklist legal](docs/LEGAL_RELEASE_CHECKLIST.md).
2. Cerrar todas las pruebas de esta revisión, especialmente permisos por usuario, cruces canónicos, lista de espera/promoción, plantillas privadas y exportación. Completar índices y la migración revisada antes de mezclar fechas ISO y Timestamps en consultas.
3. Aplicar y comprobar el cambio de reglas e índices de la base nombrada ya autorizado; no abrir otras bases ni publicar reglas generales. Configurar los dominios Auth pertinentes y verificar la cuenta administradora.
4. Probar recorridos y permisos con dos cuentas reales y otro dispositivo, recuperación de datos, atención y exportación/supresión. Las solicitudes de derechos no equivalen a operaciones ya ejecutadas.
5. Registrar únicamente verificaciones reales en el acta exigida por `pnpm check:release`. `VITE_SERVICE_OPEN=false` permite preparar builds cerradas; una build abierta requiere datos reales y acta vigente. No se genera un acta aprobada durante desarrollo.
6. Confirmar `communityConfiguration/runtime` abierto por administración. Si falta o está `setup`/`paused`, el servicio falla cerrado; una bandera del navegador no abre el backend.
7. Revisar el despliegue web y realizar el piloto antes de declarar el servicio operativo. Mientras espera patrocinio puede prepararse el núcleo de coordinación/texto; los medios continúan bloqueados.

`scripts/migrate-community.cjs` usa Admin SDK desde `functions/`, ADC del operador y dry-run predeterminado. Relee cada documento en transacción, pagina por ID de 200 en 200, conserva instantes originales y prepara prefijos públicos e índices de participantes. No crea una fecha actual para un origen inválido ni reconstruye identidades. `scripts/project-public-profiles.cjs` prepara por separado la proyección deportiva. Ninguno se ha ejecutado en nube en esta revisión.

`scripts/export-account.cjs` prepara una exportación revisable por UID: sólo lectura cloud y salida privada local cuando se solicita explícitamente. Filtra datos ajenos y credenciales; no descarga los archivos multimedia ni borra registros. Requiere procedimiento del operador y comprobación real antes de cerrar la puerta de derechos.

`cleanupCommunityPost` en `functions/` dispone de pruebas offline y está pendiente de despliegue financiado e invocación real. Para el núcleo sin funciones cloud, las reglas preparadas ocultan a terceros las interacciones de una publicación retirada y `scripts/cleanup-deleted-posts.cjs` permite limpiar físicamente likes/comentarios de IDs concretos: dry-run por defecto, lotes limitados y comprobación transaccional de que el padre siga ausente. No descarga ni borra medios y no sustituye la supresión de una cuenta. Consulta [ACCOUNT_RIGHTS.md](docs/ACCOUNT_RIGHTS.md).

## Viabilidad y pendientes

Spond ya ofrece una [app gratuita de organización](https://www.spond.com/en-us/). Cantera debe validar su utilidad concreta —fútbol, torneo y comunidad conectados— mediante un piloto real. La comparación documentada está en [COMPETITIVE_BASELINE.md](docs/COMPETITIVE_BASELINE.md); no se afirma que Cantera sea superior.

Siguen pendientes financiación/servicio de medios, comprobación de nube real, operación de soporte/derechos, acceso juvenil con tutores, chat privado, correo/push, idiomas y funciones especializadas de scouting. La aspiración internacional y sin finalidad lucrativa no acredita una entidad constituida, cobertura legal mundial o financiación confirmada.

## Documentación

- [Plan de ejecución y matriz de apertura](PLAN_CANTERA.md)
- [Whitepaper fuente](WHITEPAPER.md)
- [Comparación y piloto propuesto](docs/COMPETITIVE_BASELINE.md)
- [Puerta de revisión real](docs/RELEASE_REVIEW.md)
- [Contrato de limpieza](functions/README.md)
