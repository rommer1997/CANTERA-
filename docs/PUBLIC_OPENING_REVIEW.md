# Revisión final de apertura de LaCantera

13 de octubre de 2026 · revisión aceptada expresamente por el responsable y **núcleo gratuito abierto** en https://lacantera.web.app. El acta y los recibos públicos se identifican abajo; este documento registra la evidencia y no sustituye esas operaciones.

La firma visible elegida es **Powered by Rommer Volcanes**. El responsable ha aceptado que la ficha de privacidad identifique a **Rommer Volcanes**, persona física en España, con **rommer@garitocastizo.com** como contacto; confirmó recepción y atención con «Revisado y aceptado; correo probado». La actualización de privacidad está incluida en la publicación pública verificada; conserva la versión de términos del 8 de octubre. La firma de autoría y la identificación del responsable cumplen funciones distintas; no se solicita ni publica un DNI.

## Núcleo gratuito abierto

Registro con Google para cualquier persona mayor de 18 años que complete su propio perfil y acepte las condiciones. El núcleo es gratuito: equipos, partidos y torneos, asistencia, calendario, publicaciones escritas/logros, seguimiento, comentarios, conexiones por código/QR, chat y moderación. Los perfiles deportivos, publicaciones y encuentros públicos son públicos; los perfiles privados, plantillas y encuentros privados conservan sus permisos.

Fotos/reels cloud, menores/tutores y correo/push automáticos siguen pendientes. La apertura no activa facturación, Storage, Functions ni nuevos administradores.

## Operación que debe poder atender el responsable

- Revisar correo y colas de moderación/derechos cada día laborable; objetivo inicial de soporte de cinco días laborables.
- Atender derechos en un mes, con las extensiones justificadas y comunicadas que procedan.
- Revisar mensualmente datos cerrados: retiradas, invitaciones caducadas y evidencia innecesaria dentro de los criterios de 30 días; avisos de encuentros hasta 90 días tras su cierre.
- Exportaciones entregadas: retirar la copia local en siete días. Archivos de trabajo y respaldos: revisión y límite ordinario de 30 días, en almacenamiento cifrado bajo control del responsable.
- Revisar trimestralmente la necesidad del historial compartido. Resolver propiedad activa y revisar referencias personales en texto al tramitar bajas; no borrar derechos de terceros.

La [política operativa completa](OPERATING_POLICY.md) concreta los casos y reservas aceptados. Son operaciones manuales; los intervalos no son tareas automáticas ya activas. El compromiso de custodia cifrada está aceptado, pero el cifrado de copias existentes no está acreditado por el ensayo local; los permisos restrictivos de una copia no equivalen a cifrado.

## Proveedores y datos

Firestore utiliza `eur3`. Authentication procesa en Estados Unidos y Hosting usa infraestructura global. Google tiene sus propios criterios, incluida retirada de los sistemas vivos/copias de Auth dentro de 180 días tras solicitar eliminar al usuario. LaCantera no controla ni sustituye estos plazos del proveedor. No incorpora seguimiento publicitario.

## Evidencia técnica actual

- Preflight remoto del 13 de octubre a las 20:58:32.964 UTC: diez GET con HTTP 200, sin escrituras; reglas coincidentes, 30 índices READY con definiciones exactas y cero overrides efectivos, dominio Auth, Google habilitado y administrador existente verificado.
- 307 pruebas unitarias y TypeScript pasan en la revisión local; la suite completa previa supera 77 casos de seguridad emulada. El commit `d84ad11d5695dd070635a8be37a68e574f13c219` obtuvo [CI real con 400 pruebas aprobadas](https://github.com/rommer1997/CANTERA-/actions/runs/38467876358): 307 unitarias, 77 de seguridad emulada y 16 de limpieza con Node 22; ambos jobs finalizaron con `success`. La CI de 369 casos de `1ae10e3` queda como antecedente histórico; la nueva ejecución se atribuye únicamente a `d84ad11`.
- La actualización documental posterior `f06eaa0ed6fa0073f90c08a82718efcac2405204` tiene ejecuciones [38469379525](https://github.com/rommer1997/CANTERA-/actions/runs/38469379525) y [38469373732](https://github.com/rommer1997/CANTERA-/actions/runs/38469373732) con `success`. Esa evidencia corresponde a aquel commit; no se atribuye a cambios posteriores de privacidad o de herramientas locales.
- Copia de producción restaurada en emulador vacío: siete documentos, integridad y campos comprobados. El snapshot de las 20:13:59.432468 UTC es anterior a las invitaciones y al encuentro técnico de esta sesión; no se restauró producción ni se ensayó la recuperación de Auth o archivos.
- Exportación/supresión ensayadas con APIs reales de Auth Emulator y Firestore Emulator, únicamente cuentas sintéticas. La gracia de 65 minutos se verifica avanzando sólo el reloj inyectado del ensayo; no se eliminaron las cuentas reales del piloto.
- Hosting histórico de preparación de las 21:00:31.157 UTC, hashes verificados a las 21:01:08.876 UTC: versión `8b7af81c3a8152e1`, piloto con dos cuentas. Incluía esperas de invitación de 20 segundos, reintento, transporte iOS, aislamiento de sesiones/paginación y correo visible sólo para su titular. La instalación en pantalla de inicio y el acceso/uso en Safari se confirman por la respuesta expresa del responsable; la versión pública posterior se identifica abajo.
- Encuentro privado para prueba técnica del 14 de octubre a las 18:00 de Madrid, sin anunciarlo como partido real. La consulta del 13 de octubre a las 21:13:20.038 UTC confirma visibilidad privada y un participante, el UID de la segunda cuenta Gmail verificada del piloto. Ese snapshot de evento no probaba el QR de conexión; la conexión se verificó después por separado.
- Consulta de las 21:20:51.310 UTC: nueva invitación de conexión consumida por la otra cuenta y dos registros recíprocos existentes, con titulares, contactos y fechas de servidor correctos. El chat de ensayo mostró «Mensaje enviado» a las 23:21 de Madrid y la respuesta del contacto «Recibido» a las 23:24. Son comprobaciones reales del piloto, sin mensajes o aceptación simulados.
- Tras salir del encuentro privado y reabrir su enlace, el responsable informó «no podemos cargar este encuentro». La relectura cloud de las 21:34:24.024 UTC confirma evento todavía privado, cero participantes y segunda cuenta fuera del mapa/lista. El comprobante histórico de admisión permanece, sin conceder lectura por sí solo en las reglas desplegadas. Se acredita retirada de acceso, sin afirmar borrado físico del comprobante.

Los [recibos y límites detallados](RELEASE_2026-10-13.md) distinguen cada publicación histórica de la validación local más reciente. El procedimiento de apertura rechaza la ausencia de acta real y no modifica el runtime en ese caso.

## Aceptación y apertura comprobadas

El responsable respondió **«Revisado y aceptado; correo probado»** a la revisión que incluía identificación, privacidad, recepción/atención de correo y operación manual con copias cifradas. También confirmó instalación y acceso/uso en Safari. Es aceptación humana real de esos compromisos, sin afirmar cifrado ya ejecutado ni una auditoría del buzón por el agente.

La retirada del acceso privado está verificada en interfaz y base. El acta real se registró separadamente en `release-approved.json` a las 21:36:34.538 UTC, a nombre de Rommer Volcanes y en el proyecto/base autorizados. La custodia cifrada sigue siendo un compromiso manual aceptado, con herramienta local de protección y doce casos de ensayo; no se afirma que ninguna copia real o FileVault ya estén cifrados.

La publicación pública de las **21:41:08.090 UTC** es la versión Hosting **`49c3eff8612cbd95`**, release **`1791927668090000`**, desde **`955ba08ef3f2ca1c2cfd56d35e7254f5b7744040`**. La relectura de las 21:42:27.497 UTC confirma todos los archivos coincidentes por hashes, incluida privacidad y whitepaper 1.1. La build pasó `check:release`, TypeScript y build pública. La [CI real 38472750381](https://github.com/rommer1997/CANTERA-/actions/runs/38472750381) del commit exacto `955ba08` superó **412 pruebas: 319 unitarias, 77 de seguridad emulada y 16 de limpieza con Node 22**, sin fallos ni casos omitidos; ambos jobs con `success`. La [38472744451](https://github.com/rommer1997/CANTERA-/actions/runs/38472744451) también finalizó con `success`. No se extienden estos resultados a commits posteriores.

La transición devolvió `action=applied`, `verified=true`, runtime **`open`**, retirada de las dos restricciones de cuenta piloto y medios `false`. La prueba HTTP anónima de las **21:46:26.051 UTC** confirma lectura de perfiles públicos (dos reales), publicaciones (cero), encuentros públicos (cero) y equipos activos (cero), todos HTTP 200. Perfil privado, encuentro privado y conversación responden HTTP 403. Los resultados vacíos son reales; no se añadió actividad ficticia. El registro Google del núcleo gratuito ya está abierto para personas elegibles, con perfil/condiciones completados por cada titular. Fotos/reels siguen esperando patrocinio.

La relectura de runtime de las **21:50:36.573 UTC** confirma apertura y conserva medios desactivados/lista de piloto ausente. La activación tiene fecha de servidor **`2026-10-13T21:44:24.205Z`** y `updateTime` **`2026-10-13T21:44:24.237061Z`**. En la sesión real del responsable se consumió «Actualizar app», desapareció el aviso de preparación y se conservaron los dos mensajes de ensayo. El aviso de privacidad mostró versión del 13 de octubre, Rommer Volcanes, España y el correo correcto.
