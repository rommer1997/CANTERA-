# LaCantera — rediseño con las guías de Expo

29 de octubre de 2026. Rama `codex/lacantera-expo-redesign`; base funcional `codex/cantera-community` (`9c0fceb`).

## Diseño y alcance

Se aplican las guías oficiales de https://github.com/expo/skills —overview, design-system, native-ui y animation— a la aplicación web React/Vite existente. Se conserva el runtime web y la PWA: no se añade una migración a React Native, una dependencia Expo ni un servicio de pago.

La interfaz utiliza los tokens compartidos existentes: verde bosque, papel cálido y acento lima; espaciado de cuatro puntos, radios y movimiento nombrados. Inicio diferencia visitantes y cuentas conectadas. La portada tiene composición editorial y el espacio privado muestra agenda y publicaciones reales. Una barra lateral organiza el escritorio; la navegación móvil mantiene sus cinco destinos, con área táctil y margen inferior. Juega, Comunidad, Equipos y Mensajes comparten cabeceras. Las tarjetas, perfiles, ajustes, formularios y diálogos adoptan las mismas superficies y jerarquía. En móvil, los equipos utilizan filas de ancho completo para mantener legibles los nombres largos. El logo aprobado se conserva.

No se incorporan usuarios, equipos, precios, encuentros o estadísticas ficticios al producto. Las imágenes existentes son ilustrativas o proceden del evento. Las cuentas incompletas tienen un acceso directo al perfil, sin aceptar condiciones por ellas. La carga inicial no se presenta como ausencia de contenido ni como cierre confirmado del servicio.

Se conservan rutas, filtros, inscripción/retirada, torneos, equipos, invitaciones QR, chat, publicaciones/logros, moderación y derechos de cuenta. Se corrige además una colisión de claves React entre el compositor y las recomendaciones de Comunidad descubierta durante la revisión. Los microgestos se limitan a controles y diálogos; se respeta movimiento reducido.

## Verificación realizada

- TypeScript y 340 pruebas de dominio aprobadas localmente, incluidas cuatro nuevas sobre carga, errores, cuenta incompleta y exclusión de contenido privado ajeno/oculto/bloqueado del inicio.
- Compilación de revisión correcta con `VITE_SERVICE_OPEN=false VITE_ENABLE_DEMO=false pnpm build`. Este artefacto no es una publicación ni sustituye el build de Hosting.
- Revisión CUA de portada, inicio, Juega, Comunidad, Equipos, Mensajes y Perfil entre 320, 390, 430 y 1440 px. Sin desbordamiento del documento en las dimensiones comprobadas. Se revisan contraste de CTA, foco de diálogo, tamaños táctiles y posición del compositor sobre la navegación.
- Formulario de encuentro vacío: validación requerida y retorno de foco; no se crea un encuentro ficticio en producción. Acceso directo a publicar comprobado.
- Auth/Firestore emulados en proyecto `demo-cantera-ux`: dos cuentas sintéticas, recepción de un mensaje local, creación de equipo, detalle con título largo, edición de perfil y Agenda. Los registros sintéticos permanecen en el entorno local; ninguna prueba escribe en producción.
- Consulta de nube de solo lectura el 29 de octubre: proyecto/base correctos, mismas reglas y 32 índices READY, dominio lacantera autorizado, servicio abierto y carga multimedia desactivada. No se cambian permisos, reglas, índices, facturación ni almacenamiento.

Capturas locales reales en `output/design/expo-2026-10-29/`: `landing-desktop.png`, `home-desktop.png`, `community-mobile.png`, `teams-mobile.png`, `chat-mobile.png` y `profile-mobile.png`. Las imágenes con cuentas sintéticas identifican expresamente el entorno local.

## Publicación pendiente

El build de Hosting se detiene en el control existente `scripts/check-release.mjs`: el acta `docs/release-approved.json` fue aprobada el 13 de octubre y el control exige menos de siete días. Se conserva el acta y su evidencia sin renovar su fecha por cuenta del operador. La versión pública del 16 de octubre permanece intacta. Esta rama se entrega para revisión antes de renovar expresamente el acta y publicar exclusivamente Hosting.

La instalación/actualización PWA, cámara QR, teclado de chat, safe areas y VoiceOver de este nuevo diseño requieren una comprobación física en iPhone Safari. La prueba de navegador con tamaño móvil no sustituye esa comprobación.
