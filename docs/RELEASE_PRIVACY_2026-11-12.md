# Directorio y sugerencias: publicación del 12 de noviembre de 2026

## Cambio publicado

El visitante sin cuenta y la cuenta que aún no ha completado el registro no reciben recomendaciones ni pueden consultar el directorio de personas y equipos. Se exige perfil completo, correo verificado, condiciones vigentes y cuenta no suspendida. Una consulta pendiente se descarta si cambia la identidad o su elegibilidad.

Las reglas distinguen la consulta del directorio (`list`, incluidas agregaciones) de la lectura individual (`get`). Los perfiles deportivos públicos enlazados y las identidades públicas de organizadores y autores conservan su comportamiento. Este cambio no convierte todos los perfiles en privados.

Se publicaron las reglas únicamente en la base `ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb` del proyecto `gen-lang-client-0853130215` y el frontend en https://lacantera.web.app. Fuente: `5b945882c38b75ecec3ed1d5e4afa3d68f8429a0`. No se modificaron roles, facturación ni infraestructura multimedia.

## Verificación

- [CI del cambio aprobada](https://github.com/rommer1997/CANTERA-/actions/runs/43260132514): cliente, reglas, compilación, avisos y limpieza.
- Las 23 pruebas locales de sesión pasan, incluidas las nuevas comprobaciones de registro incompleto y resultados tardíos al cambiar de cuenta.
- El control de lanzamiento y `build:hosting` pasaron antes de publicar.
- La petición REST anónima al directorio de producción devolvió `403 PERMISSION_DENIED`, sin documentos.
- `index.html` y los bundles publicados de aplicación, Comunidad y Personas coinciden byte por byte con el build comprobado.
- En la vista anónima del mismo build se comprobó el acceso «Entrar o crear cuenta», sin nombres recomendados. No se cerró la sesión real del responsable para hacer esta prueba.

Evidencias locales en `.audit/privacy-production-verification.json`, `.audit/privacy-guest-directory.png` y los logs de despliegue. La comprobación visual anónima se hizo en la previsualización local; la denegación de Firebase y los archivos publicados se comprobaron contra producción. No se presenta como una prueba física nueva en iPhone.

## Pieza promocional

Se creó aparte del frontend un proyecto editable de HyperFrames en `../promo-tiktok`, con exportación MP4 vertical de 22 segundos, 1080 × 1920, H.264, 30 fps. Reutiliza logo, tipografía e imagen de campo existentes y un QR real a la web. Describe organización gratuita, conexiones, equipos, mensajes e invitaciones; no promete cargas de fotos o vídeos ni presenta identidades o métricas ficticias. El máster es visual, sin pista de audio, para añadir música desde TikTok. No se ha publicado en ninguna red social.
