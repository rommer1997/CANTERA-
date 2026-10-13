# Revisión final de apertura de LaCantera

13 de octubre de 2026 · candidato para revisión del responsable. Este documento no aprueba ni activa el servicio.

La firma visible elegida es **Powered by Rommer Volcanes**. Se propone que la ficha de privacidad identifique a Rommer Volcanes como responsable persona física en España, con `rommer@garitocastizo.com` como contacto. El texto legal compilado aún no se modificó y la recepción/atención de ese correo no está confirmada. La firma de autoría y la identificación del responsable cumplen funciones distintas; no se solicita ni publica un DNI.

## Qué se abrirá

Registro con Google para cualquier persona mayor de 18 años que complete su propio perfil y acepte las condiciones. El núcleo es gratuito: equipos, partidos y torneos, asistencia, calendario, publicaciones escritas/logros, seguimiento, comentarios, conexiones por código/QR, chat y moderación. Los perfiles deportivos, publicaciones y encuentros públicos son públicos; los perfiles privados, plantillas y encuentros privados conservan sus permisos.

Fotos/reels cloud, menores/tutores y correo/push automáticos siguen pendientes. La apertura no activa facturación, Storage, Functions ni nuevos administradores.

## Operación que debe poder atender el responsable

- Revisar correo y colas de moderación/derechos cada día laborable; objetivo inicial de soporte de cinco días laborables.
- Atender derechos en un mes, con las extensiones justificadas y comunicadas que procedan.
- Revisar mensualmente datos cerrados: retiradas, invitaciones caducadas y evidencia innecesaria dentro de los criterios de 30 días; avisos de encuentros hasta 90 días tras su cierre.
- Exportaciones entregadas: retirar la copia local en siete días. Archivos de trabajo y respaldos: revisión y límite ordinario de 30 días, en almacenamiento cifrado bajo control del responsable.
- Revisar trimestralmente la necesidad del historial compartido. Resolver propiedad activa y revisar referencias personales en texto al tramitar bajas; no borrar derechos de terceros.

La [política operativa completa](OPERATING_POLICY.md) concreta los casos y reservas. Son operaciones manuales; los intervalos no son tareas automáticas ya activas. La custodia cifrada propuesta no está acreditada por el ensayo local; los permisos restrictivos de una copia no equivalen a cifrado.

## Proveedores y datos

Firestore utiliza `eur3`. Authentication procesa en Estados Unidos y Hosting usa infraestructura global. Google tiene sus propios criterios, incluida retirada de los sistemas vivos/copias de Auth dentro de 180 días tras solicitar eliminar al usuario. LaCantera no controla ni sustituye estos plazos del proveedor. No incorpora seguimiento publicitario.

## Evidencia técnica actual

- Preflight remoto del 13 de octubre a las 20:58:32.964 UTC: diez GET con HTTP 200, sin escrituras; reglas coincidentes, 30 índices READY con definiciones exactas y cero overrides efectivos, dominio Auth, Google habilitado y administrador existente verificado.
- 307 pruebas unitarias y TypeScript pasan en la revisión local actual; la suite completa previa supera 77 casos de seguridad emulada. El último conjunto de CI completo era 369 casos en el commit anterior `1ae10e3`; la revisión actual requiere su propia ejecución.
- Copia de producción restaurada en emulador vacío: siete documentos, integridad y campos comprobados. El snapshot de las 20:13:59.432468 UTC es anterior a las invitaciones y al encuentro técnico de esta sesión; no se restauró producción ni se ensayó la recuperación de Auth o archivos.
- Exportación/supresión ensayadas con APIs reales de Auth Emulator y Firestore Emulator, únicamente cuentas sintéticas. La gracia de 65 minutos se verifica avanzando sólo el reloj inyectado del ensayo; no se eliminaron las cuentas reales del piloto.
- Último Hosting publicado a las 21:00:31.157 UTC, hashes verificados a las 21:01:08.876 UTC: versión `8b7af81c3a8152e1`, release `1791925231157000`, piloto con dos cuentas y medios desactivados. Incluye esperas de invitación de 20 segundos, reintento, compatibilidad de transporte iOS, aislamiento de sesiones/paginación administrativa y correo visible sólo para su titular, comprobado en el perfil real del responsable después de actualizar la app. La respuesta durante el reintento físico todavía no acredita una conexión aceptada; el resultado cloud y la prueba completa de QR/Safari siguen pendientes.
- Se preparó un encuentro privado para prueba técnica del 14 de octubre a las 18:00 de Madrid, sin anunciarlo como partido real. No acredita aún conexión, chat ni admisión/revocación entre las dos cuentas cloud.

Los [recibos y límites detallados](RELEASE_2026-10-13.md) distinguen cada publicación histórica de la validación local más reciente. El procedimiento de apertura rechaza la ausencia de acta real y no modifica el runtime en ese caso.

## Pendiente antes de activar

Completar y registrar conexión, chat y acceso/revocación privados entre las dos cuentas reales; cámara/instalación Safari; confirmación de que el correo se recibe y se atiende; aceptación de esta operación y del texto final de privacidad por el responsable. Sólo entonces se registra el acta real y se ejecuta la transición al público.
