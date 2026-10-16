# LaCantera

Comunidad de fútbol para organizar partidos y torneos gratis, coordinar equipos y compartir actividad deportiva. Personas, grupos y clubes amateurs o profesionales pueden participar dentro de las condiciones de la beta adulta.

## Estado de esta revisión

**Edición del 13 de octubre de 2026:** el núcleo gratuito está desplegado en [lacantera.web.app](https://lacantera.web.app/) dentro de un piloto privado. El registro público sigue cerrado. El [estado consolidado](docs/RELEASE_2026-10-13.md) separa la entrega comprobada del 8 de octubre de las mejoras y validaciones de esta revisión; no declara el producto abierto o terminado para clientes.

La última publicación de frontend comprobada antes de esta revisión es `c7d9764ac1ea09116d8465135d36298efbe4d764`, con reglas de conexiones, encuentros privados y chat aplicadas en la base `ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb` del proyecto `gen-lang-client-0853130215`, región `eur3`, y **26 índices en estado READY**. Runtime existe con estado `pilot`. Hosting usa el sitio `lacantera` y el target `cantera`. Google Auth y los dominios autorizados están comprobados. La facturación sigue desactivada; no se han activado Storage ni Functions.

La cuenta administradora real tiene el permiso comprobado. El piloto admite actualmente dos cuentas Google verificadas, con perfiles completados personalmente. Tener dos perfiles no acredita todavía el recorrido completo entre cuentas: conexión, encuentro privado, chat, retirada de acceso y derechos deben quedar documentados con evidencia real.

La versión de aceptación desplegada es **`2026-10-08`**. El propietario ha declarado Rommer, persona física en Madrid, España, y `Rommer@garitocastizo.com`; estos datos están incorporados en la web. Quedan la revisión final del responsable, el canal de soporte atendido, las decisiones de conservación y la operación de derechos. No se ha fabricado una identidad jurídica, una aprobación o un patrocinador.

Los registros del [7 de octubre](docs/RELEASE_2026-10-07.md) y de la [entrega por fases del 8 de octubre](docs/RELEASE_2026-10-08.md) conservan snapshots anteriores a la activación. Cuando difieran, consultar el estado consolidado y el recibo de la revisión; no interpretar el runtime ausente o los 18 índices de esos snapshots como situación actual. El [PR #1](https://github.com/rommer1997/CANTERA-/pull/1) sigue en borrador.

**Actualización publicada en el piloto el 13 de octubre:** identidad de quien invita visible antes de aceptar, baja v2 con actividad compartida, publicaciones de texto con título opcional separadas de logros, Comunidad móvil más compacta y [marca verde con C blanca y balón clásico](docs/BRAND.md). Lint, build piloto de Firebase y 353 verificaciones locales pasan (277 unitarias y 76 de seguridad emulada). El backend se actualizó el 13 de octubre exclusivamente en la base nombrada: reglas releídas idénticas y 30 índices coincidentes. La relectura de las 20:00:42 UTC confirmó los **30 índices READY**. El [recibo de entrega](docs/RELEASE_2026-10-13.md) identifica la versión de frontend efectivamente publicada en piloto.

## Núcleo y cambios de esta revisión

| Área | Comportamiento presente | Límite de esta entrega |
|---|---|---|
| Cuenta | Acceso Google, restauración de sesión, perfil propio y aceptación versionada | Dos perfiles reales completados en el piloto; recorrido completo entre cuentas aún por cerrar. El alta real comienza vacía, sin jugador de ejemplo compartido. |
| Perfiles | Proyección deportiva pública separada de edad/aceptación privadas; seguimiento, fichas y actividad paginadas | Búsqueda por prefijos de nombre/ciudad/país en servidor. No es búsqueda semántica ni un censo completo de usuarios. |
| Conexiones e invitaciones | Contactos recíprocos por aceptación; códigos y QR de una persona, diez minutos, cancelables; lector con cámara o imagen local y enlace para entrar a partidos/torneos privados | Interfaz y reglas publicadas en el piloto. [Controles y comprobaciones](docs/INVITATIONS.md). El enlace no concede acceso por sí solo ni envía SMS automáticamente. |
| Mensajería | Chat de texto privado entre contactos recíprocos, actualización en vivo, páginas de 40 y retirada del mensaje propio | Desplegado en el piloto; recorrido cloud completo pendiente. Sin adjuntos, llamadas, cifrado de extremo a extremo ni push. |
| Equipos | Ficha pública; plantilla privada; propietario, responsables y miembros; invitaciones y solicitudes con aprobación | La invitación no incorpora automáticamente. Transferir propiedad, retirar miembros, salir y archivar tienen reglas propias. |
| Encuentros | Fútbol 5/7/11, país/ciudad/zona, aforo, inscripción y retirada, invitados del organizador, respuestas RSVP y privacidad fijada al crear | Partidos de 2–64 plazas; torneos de 2–32. No reserva campos ni procesa pagos. |
| Espera y avisos | Orden de espera, retirada y promoción al liberar/ampliar plazas; avisos internos al ascendido | Condicionado al estado y calendario del evento. No correo/push ni confirmación de lectura universal. |
| Edición | Motivo, revisión, historial consultable y ledger de cambios; avisos a participantes | No certifica resultados oficiales ni sustituye resolución de disputas. |
| Recurrencia | Crear 2–12 eventos semanales, quincenales o mensuales respetando zona y cambio horario | Cada ocurrencia es un evento independiente; no edición conjunta de una temporada. |
| Torneos | Liga, eliminatoria, pases libres, clasificación, horarios por cruce y resultados | Reglas publicadas en el piloto; liga de 32 cubierta en emuladores. El recorrido cloud completo de torneos queda por verificar. |
| Calendario | Exportación `.ics` del evento o cruces realmente programados | Descargar/importar archivo, sin sincronización bidireccional. |
| Comunidad | Comunidad/Siguiendo cronológico, publicaciones paginadas, enlaces y búsqueda sobre contenido cargado. Ampliación local: publicación escrita con título opcional y logro con título obligatorio | Los dos tipos escritos son persistentes distintos; el backend se actualizó el 13 de octubre y la entrega de frontend se acredita en el recibo de publicación. Sin recomendaciones simuladas; medios nuevos esperan patrocinio. |
| Interacción | Conteos de servidor por publicación, likes, comentarios paginados, denuncia y bloqueo | Retirar contenido propio o dejar de seguir no exige aceptar una versión nueva para ejercer esos controles. |
| Administración | Verificación manual, denuncias, suspensión de cuentas y colas pendientes paginadas | Claim `admin` y acceso al panel real comprobados; atención de casos y operación de soporte pendientes. |
| Derechos | Solicitud privada de exportación/supresión, revisión administrativa y herramientas del operador | La ampliación v2 del 13 de octubre admite baja con actividad compartida y está validada localmente, también en Firestore Emulator; no se ha ejecutado sobre las dos cuentas reales. Procedimiento y entrega efectiva deben cerrarse. |
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

La última entrega verificada superó TypeScript, compilación y **344 pruebas** en [Cantera CI sobre `c7d9764`](https://github.com/rommer1997/CANTERA-/actions/runs/37710502909): 257 de dominio/proveedores/herramientas, 71 de permisos emulados y 16 de limpieza con dobles. Esa ejecución corresponde al 8 de octubre; las modificaciones posteriores requieren su propia validación y recibo. CI no despliega ni acredita soporte o el uso cloud completo entre personas reales.

La revisión local del 13 de octubre superó `pnpm lint`, `pnpm test` (**277** casos), `pnpm test:security` (**76** casos) y la build piloto de Firebase. Son **353** verificaciones locales de dominio/herramientas y seguridad, sin sumar de nuevo las pruebas históricas de limpieza. Esos resultados siguen siendo locales. El backend de la revisión está publicado y releído; CI, estado final de índices y frontend se acreditan por su ejecución y recibo correspondientes.

El QA de interfaz del 13 de octubre comprobó la vista local a 320, 390 y 1440 px, publicación sin título, enlace directo, reacción, comentario, recarga, filtros y título obligatorio del logro. Es un recorrido del navegador local; no acredita acceso Google o permisos entre las dos cuentas cloud.

Los totales de 49, 58, 121, 156, 233 y 62 que aparecen en los registros previos son snapshots de otras fases, no el total actual ni una aprobación de apertura. Hubo comprobaciones visuales locales de coordinación y chat con usuarios sintéticos, y restauración de un perfil real en un emulador vacío; no fueron restauraciones sobre producción ni actividad deportiva real. Instalación, cámara y rendimiento en teléfonos/redes reales siguen pendientes de ensayo. La matriz completa está en [PLAN_CANTERA.md](PLAN_CANTERA.md). La instalación mantiene la política estricta de scripts revisados en `pnpm-workspace.yaml`.

## Demostración separada

Perfil → Probar en este dispositivo permite ensayar sin crear cuentas externas en desarrollo. Datos en `localStorage`, archivos en `IndexedDB` y aviso visible. No es una comunidad multiusuario ni sincroniza dispositivos. Los datos de prueba no se utilizan como cifras de usuarios o tracción. En producción se mantiene `VITE_ENABLE_DEMO=false`.

## Puertas de apertura

1. Identificar al responsable real y atender soporte, privacidad, verificación y derechos; revisar textos y conservación. Consultar [revisión de publicación](docs/RELEASE_REVIEW.md), [propuesta de operación revisable](docs/OPERATING_POLICY.md) y [checklist legal](docs/LEGAL_RELEASE_CHECKLIST.md).
2. Cerrar las pruebas de las mejoras de esta revisión, especialmente permisos por usuario, cruces canónicos, lista de espera/promoción, plantillas privadas y exportación. El inventario previo al piloto no necesitó migración; volver a inventariar si aparece legado y no mezclar fechas ISO y Timestamps en consultas.
3. Mantener y volver a comprobar las reglas, los 26 índices, Auth y administración de la base nombrada ya desplegados. Todo cambio nuevo debe validar ese mismo destino; no abrir otras bases ni publicar reglas generales.
4. Probar recorridos y permisos con dos cuentas reales y otro dispositivo, recuperación de datos, atención y exportación/supresión. Las solicitudes de derechos no equivalen a operaciones ya ejecutadas.
5. Registrar únicamente verificaciones reales en el acta exigida por `pnpm check:release`. `VITE_SERVICE_OPEN=false` permite preparar builds cerradas; una build abierta requiere datos reales y acta vigente. No se genera un acta aprobada durante desarrollo.
6. Tras comprobar el acta, publicar una build abierta con piloto desactivado y confirmar `communityConfiguration/runtime` en `open` por administración. Hoy está en `pilot`, limitado a las cuentas autorizadas. Si falta o está `setup`/`paused`, el servicio falla cerrado; una bandera del navegador no abre el backend.
7. Revisar el despliegue final y concluir el ensayo del núcleo antes de declararlo operativo al público. Los medios continúan bloqueados hasta patrocinio y validación de su servicio.

`scripts/migrate-community.cjs` usa Admin SDK desde `functions/`, ADC del operador y dry-run predeterminado. Relee cada documento en transacción, pagina por ID de 200 en 200, conserva instantes originales y prepara prefijos públicos e índices de participantes. No crea una fecha actual para un origen inválido ni reconstruye identidades. `scripts/project-public-profiles.cjs` prepara por separado la proyección deportiva. El inventario previo a la activación encontró un perfil y ninguna migración necesaria; no se ejecutó una transformación de datos en nube.

`scripts/export-account.cjs` prepara una exportación revisable por UID: sólo lectura cloud y salida privada local cuando se solicita explícitamente. Filtra datos ajenos y credenciales; no descarga los archivos multimedia ni borra registros. Requiere procedimiento del operador y comprobación real antes de cerrar la puerta de derechos.

`cleanupCommunityPost` en `functions/` dispone de pruebas offline y está pendiente de despliegue financiado e invocación real. Para el núcleo sin funciones cloud, las reglas desplegadas del piloto ocultan a terceros las interacciones de una publicación retirada y `scripts/cleanup-deleted-posts.cjs` permite limpiar físicamente likes/comentarios de IDs concretos: dry-run por defecto, lotes limitados y comprobación transaccional de que el padre siga ausente. No descarga ni borra medios y no sustituye la supresión de una cuenta. Consulta [ACCOUNT_RIGHTS.md](docs/ACCOUNT_RIGHTS.md).

## Viabilidad y pendientes

La comparación documental del 6 de octubre registra que Spond ofrece una [app gratuita de organización](https://www.spond.com/en-us/). LaCantera debe validar su utilidad concreta - fútbol, torneo y comunidad conectados - mediante un piloto real. La comparación documentada está en [COMPETITIVE_BASELINE.md](docs/COMPETITIVE_BASELINE.md); no se afirma que Cantera sea superior.

Siguen pendientes el recorrido cloud completo, la operación de soporte/derechos y revisión del responsable para abrir el núcleo. Financiación/servicio de medios, acceso juvenil con tutores, correo/push, idiomas y scouting son ampliaciones posteriores; el chat de texto ya forma parte del piloto. La aspiración internacional y sin finalidad lucrativa no acredita una entidad constituida, cobertura legal mundial o financiación confirmada.

## Documentación

- [Plan de ejecución y matriz de apertura](PLAN_CANTERA.md)
- [Whitepaper fuente](WHITEPAPER.md)
- [Comparación y piloto propuesto](docs/COMPETITIVE_BASELINE.md)
- [Puerta de revisión real](docs/RELEASE_REVIEW.md)
- [Estado consolidado y preparación del 13 de octubre](docs/RELEASE_2026-10-13.md)
- [Identidad visual](docs/BRAND.md)
- [Contrato de limpieza](functions/README.md)
