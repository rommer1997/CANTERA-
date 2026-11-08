# LaCantera — fidelidad a las cinco referencias móviles

Fecha: 8 de noviembre de 2026. **final result: passed**.

## Fuentes y normalización

La fuente visual son las cinco imágenes seleccionadas por el usuario, de 852 × 1846 px:

- Inicio: `/Users/usuario/Documents/Chuchelandia-Fotos-Flow/PROYECTOS-AUTOGUARDADOS/LaCantera_ fútbol amateur en Madrid-1.png`.
- Juega: `/Users/usuario/Documents/Chuchelandia-Fotos-Flow/PROYECTOS-AUTOGUARDADOS/Encuentra tu partido en Madrid.png`.
- Comunidad: `/Users/usuario/Documents/Chuchelandia-Fotos-Flow/PROYECTOS-AUTOGUARDADOS/LaCantera_ comunidad de fútbol amateur-3.png`.
- Tu gente: `/var/folders/h8/csnlrb6j5xn4j0nk7cnz006r0000gn/T/codex-clipboard-0136e263-8f8b-4058-a01a-995be1f01cf4.png`.
- Crear: `/var/folders/h8/csnlrb6j5xn4j0nk7cnz006r0000gn/T/codex-clipboard-25f3e417-6eca-42f7-ab27-d77aa43308a3.png`.

Implementación inspeccionada en el navegador integrado: `http://localhost:4174`, proyecto Auth/Firestore emulado `demo-cantera-ux`. Usuario sintético identificado con una conexión, tres encuentros y dos publicaciones de prueba. No se utiliza la cuenta ni la base de producción para estas acciones.

Se normalizan las fuentes a 393 × 852 para compararlas con un viewport DOM confirmado de 393 × 852 CSS px. El navegador de este equipo reporta DPR 0,75: la capacidad se ajustó a 295 × 639 para obtener ese viewport. Las capturas originales contienen un margen exterior blanco adicional; las copias de comparación recortan exclusivamente ese margen hasta el rectángulo visible del viewport, sin pintar ni alterar la interfaz. También se comprueban 320 × 780, 1024 × 900 y 1440 × 1000 CSS px. No se simulan status bar, batería ni chrome de Safari.

Evidencia completa en `output/design/reference-2026-11-08/`: `home-reference.png`, `play-reference.png`, `feed-reference.png`, `connect-reference.png`, `create-reference.png`; las capturas `*-final-raw.png`, sus copias `*-final.png` y las comparaciones conjuntas `*-comparison-final.png`. Las comparaciones enfocadas `home-focus.png`, `play-focus.png`, `feed-focus.png`, `connect-focus.png` y `create-focus.png` permiten evaluar imágenes, tipos, controles y agrupación. El montaje `app-review.png` contiene exclusivamente capturas reales del entorno local.

## Hallazgos corregidos e historial

1. [P1, corregido] La propuesta previa usaba fondo cálido y navegación flotante oscura. Se sustituyen por superficies claras, barra inferior blanca, botón circular verde y punto de selección, siguiendo las nuevas fuentes.
2. [P2, corregido] La primera comparación tenía filas de agenda excesivamente altas, metadatos del hero en dos líneas y repetición del encuentro destacado. Se compactan las fechas y filas, se conserva la línea de participantes cuando cabe y se excluye el destacado de las filas siguientes. Evidencia anterior: `home-comparison-pass1.png`; posterior: `home-comparison-final.png`, `home-focus.png`.
3. [P2, corregido] Comunidad dejaba un salto vacío entre título y pestañas, mostraba filtros como una fila permanente y alargaba la tarjeta enlazada. Se limita la cabecera a una línea, se conservan búsqueda/filtros en controles desplegables y se sitúa el CTA del encuentro en su foto. Evidencia anterior: `feed-comparison-pass1.png`; posterior: `feed-comparison-final.png`, `feed-focus.png`.
4. [P2, corregido] Tu gente heredaba dirección vertical en la cabecera y el buscador, y el botón Unirme se estiraba por el margen de la etiqueta. Se explicitan filas horizontales y se igualan alturas del código y la acción. Evidencia anterior: `connect-pass1-raw.png`; posterior: `connect-comparison-final.png`.
5. [P2, corregido] Crear conservaba los márgenes laterales nativos de dialog y filas demasiado altas. Se hace ancho completo en móvil, se destaca el partido y se compactan los dos grupos sin eliminar destinos. Evidencia anterior: `create-comparison-pass1.png`; posterior: `create-comparison-final.png`, `create-focus.png`.
6. [P2, corregido] Juega acumulaba cabecera de marca y ubicación y sobraba separación antes de resultados. La ubicación pasa a la cabecera móvil con el mismo control funcional, se reduce el salto y se compacta el pie de las tarjetas. Evidencia anterior: `play-pass1-raw.png`; posterior: `play-comparison-final.png`, `play-focus.png`.

Las comparaciones finales completas y enfocadas se abren y revisan después de cada corrección. No quedan P0/P1/P2 accionables dentro del alcance de estas referencias y de las funciones existentes.

## Cinco superficies de fidelidad

- **Tipografía:** se conserva Manrope Variable local, con títulos de peso alto, texto secundario gris y controles de 14–16 px. Se revisan interlineado, nombres largos y envoltura a 320 px. La fuente exacta del mock no viene identificada; no se afirma una equivalencia tipográfica exacta. Los cuerpos de entrada mantienen 16 px para evitar el zoom automático de Safari.
- **Espacio y composición:** márgenes móviles de 16 px, hero fotográfico de aproximadamente 250 px, fotos horizontales en tarjetas de partidos, separadores de feed y listas, hoja Crear con grupos y navegación fija fuera del contenido. Se priorizan áreas táctiles utilizables frente a algunos controles más pequeños del mock. El compositor de chat termina en y=748 con la navegación en y=772 en 393 × 852: no queda tapado.
- **Colores:** tokens compartidos claros (`#f7f9f7`, blanco), verde `#006747`, texto `#071b17`, secundario `#627078`, líneas `#d7dfdd` y lima `#d6f65c`. La textura verde de la imagen no se recrea con dibujos o imágenes nuevas; el color del control usa el token de marca. Se mantienen foco visible y estados seleccionados.
- **Imágenes:** se reutilizan los WebP y el logo existentes sin cambiar sus bytes. No se usan capturas rasterizadas como interfaz. El recorte de la foto nocturna es el del recurso actual, que difiere del campo dibujado en la referencia. El organizador conserva la elección de portada. No se reemplazan fotos reales por nuevas caras ni se atribuyen imágenes genéricas a participantes reales.
- **Texto y contenido:** se replican los títulos y la agrupación aplicables. Horarios, nombres, plazas, equipos y contadores proceden de los registros; no se inventan distancias ni actividad pública. «Tu agenda» y «Partidos para ti» se usan cuando corresponde en vez de prometer proximidad calculada. Las invitaciones son los códigos activos creados por la cuenta: el backend actual no tiene una bandeja de solicitudes entrantes entre personas como la ilustrada con Ana y David. La aceptación mediante QR/código conserva su verificación explícita.

## Interacciones y estados verificados

Navegación entre Inicio/Juega/Comunidad/Perfil y destinos secundarios; Crear → partido y Crear → publicación; validación requerida del nombre del encuentro y retorno de foco al cerrar; filtros de ubicación desde la cabecera, fecha/formato (3 resultados → 1 → 3); búsqueda del feed sin coincidencias y recuperación; filtro Logros y vuelta a Todo; me gusta local y apertura de comentarios; conexión → conversación existente; buscador de conexiones con resultado vacío; creación y reapertura de código con QR/contador; pestaña de invitaciones con cuenta real de códigos activos; código inválido con error; apertura y cierre del lector QR sin conceder permisos de cámara.

Se conservan los estados de carga/error, elegibilidad y mantenimiento, las marcas de privacidad, la gestión de organizadores y las acciones de desconexión, moderación y derechos. Consola del navegador consultada sin errores. TypeScript, 340 pruebas de aplicación y build de revisión correctos; el build de revisión usa apertura y modo demo desactivados y no se publica.

## Diferencias intencionales y límites

Las capturas de QA muestran una franja que identifica el emulador; no se oculta para que la prueba no parezca producción. Esta franja cambia la posición vertical frente al mock y no aparece en una compilación pública. Las cuentas sin foto usan sus iniciales existentes; no se incorporan las caras de ejemplo. No se fabrican las dos invitaciones pendientes ni el grupo fotografiado del mock. Se conserva la funcionalidad de seguir cuentas y el aviso sobre cargas multimedia pendientes de financiación. La adaptación de escritorio conserva una barra lateral, ya que las fuentes proporcionadas sólo especifican móvil.

[P3] La tipografía exacta y la textura fotográfica del verde del mock pueden ajustarse en una iteración de identidad; los recursos actuales y las proporciones principales ya se conservan. La instalación/actualización PWA, cámara QR real, teclado, safe areas y VoiceOver requieren prueba física en iPhone: esta revisión no la sustituye.

Publicación no realizada. El acta de apertura y el control de release quedan intactos, igual que reglas, índices, permisos, almacenamiento y facturación. Historial anterior: `docs/DESIGN_QA_HISTORY_2026-10-29.md`.

## Checklist de cierre

- [x] Comparación conjunta de las cinco fuentes y las capturas finales.
- [x] Revisión enfocada de tarjetas, fotos, tipos, menú Crear y conexión.
- [x] Corrección y nueva captura de los P1/P2 encontrados.
- [x] Navegación, formularios, filtros y flujos principales conservados.
- [x] Comprobación móvil, tablet, escritorio y consola.
- [ ] Prueba física del nuevo diseño en iPhone.

**final result: passed**
