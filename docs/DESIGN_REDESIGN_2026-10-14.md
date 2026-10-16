# Rediseño de LaCantera — 14 de octubre de 2026

La referencia elegida se aplica al núcleo gratuito existente: Inicio, acceso, Comunidad, equipos, encuentros, perfiles y mensajes usan superficies blancas, verde deportivo, fotografía ilustrativa y navegación compacta. La composición se adapta a escritorio y móvil; los datos corresponden a cuentas y registros existentes, sin copiar las cifras, usuarios o equipos ficticios del tablero.

## Portadas gratuitas de encuentros

- Tres imágenes genéricas: campo de día, campo nocturno y campo para torneos.
- El organizador puede elegirlas al crear un partido o torneo y reemplazar su elección desde la edición.
- La selección se guarda como `coverId` cerrado a `day`, `night` o `tournament`. Las reglas permiten cambiarla sólo al propietario y rechazan URLs u otros valores.
- Los encuentros antiguos conservan una portada predeterminada. La exportación y la eliminación de cuentas admiten la nueva selección y preservan los registros de otros participantes.
- La subida de fotos propias, vídeos y reels continúa pendiente de patrocinio e infraestructura multimedia; este cambio no activa facturación, Storage ni Functions.

Los seis recursos ilustrativos, sus prompts y hashes están documentados en [DESIGN_ASSET_PROMPTS.md](DESIGN_ASSET_PROMPTS.md).

## Validación previa al despliegue

Completadas: TypeScript, compilación para Firebase Hosting, 327 pruebas unitarias, 79 pruebas de seguridad con emuladores y 16 pruebas de limpieza de cuentas. Total: 422 pruebas aprobadas.

En el navegador local se comprobaron creación/edición y persistencia de portada, publicación de texto, reacciones, comentarios y filtros de equipos. Los datos de revisión se guardaron exclusivamente en la demo local, identificada como tal. Se compararon capturas con la referencia, incluidas anchuras móviles de 320 y 390 px. La evidencia y las iteraciones figuran en [design-qa.md](../design-qa.md).

Al preparar este commit queda pendiente el pase visual de una conversación real tras publicar el nuevo frontend en el dominio autorizado. No se atribuye a la demo un chat real ni una prueba física de este rediseño en Safari. El acta de despliegue posterior documentará los resultados en producción.

El lanzamiento público, los textos aceptados de privacidad y las pruebas históricas de QR/instalación se mantienen. Este rediseño no modifica la política de acceso ni abre nuevamente el servicio.
