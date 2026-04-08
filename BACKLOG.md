# Tareas Futuras (Backlog)

1. **Persistencia de Datos (Backend):** Actualmente, la aplicación funciona con datos simulados (`MOCK_PLAYERS`, `MOCK_SCOUT`) y estados locales. Si recargas la página, los cambios se pierden. **Mejora crítica:** Integrar una base de datos real (como Firebase Firestore o Supabase) para guardar perfiles, publicaciones, validaciones y mensajes.

2. **Autenticación Real:** La pantalla de inicio (Identity Hub) simula el inicio de sesión. **Mejora crítica:** Implementar Firebase Auth o Supabase Auth para manejar sesiones reales con Google, Apple y correo electrónico.

3. **Control de Acceso Basado en Roles (RBAC):** Actualmente, cualquier persona puede navegar a `/scout` o `/referee` cambiando la URL. **Planteamiento:** Crear "Rutas Protegidas" (Protected Routes) en React Router que verifiquen el rol del usuario autenticado antes de renderizar el panel correspondiente. Si un jugador intenta entrar al panel de scout, debe ser redirigido.

4. **Tiempo Real (WebSockets):** Para la "Consola en Vivo" del árbitro y el chat entre scouts y tutores, el HTTP tradicional no es suficiente. **Planteamiento:** Usar los listeners en tiempo real de Firestore (`onSnapshot`) o Supabase Realtime para que los eventos del partido y los mensajes aparezcan instantáneamente sin recargar.

5. **Procesamiento de Video (Highlights):** Subir videos directamente a una base de datos es ineficiente y costoso. **Planteamiento:** Integrar un servicio como AWS S3 o Mux para almacenar los videos, generar miniaturas automáticamente y transmitirlos en formato HLS (para que carguen rápido sin importar la conexión del usuario).