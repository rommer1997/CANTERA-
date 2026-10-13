# Imágenes ilustrativas del rediseño de LaCantera

Edición: 14 de octubre de 2026 (Europe/Madrid).

## Origen y uso

Estas seis fotografías son **imágenes generadas por IA con la herramienta integrada `image_gen.imagegen`**, a petición del usuario para llevar su referencia visual a la app. No se usó API, CLI de generación, fotografía de terceros, una identidad real ni un club existente. Son recursos genéricos **meramente ilustrativos**: no prueban que exista un partido, instalación, participante, torneo o equipo.

Las portadas de los eventos no incluyen personas, nombres, cifras, escudos, marcas, texto ni lugares reconocibles. El hero muestra un adulto ficticio de espaldas, con camiseta lisa y sin rostro visible. El creador del evento puede escoger una portada genérica o reemplazarla con contenido propio por el mecanismo que habilite la app; esta colección no activa almacenamiento ni subida multimedia.

Los archivos originales se conservan en el directorio de imágenes generadas de Codex. La conversión posterior sólo reduce dimensiones y comprime a WebP con Pillow/Lanczos; no añade, elimina ni modifica objetos. No se cambiaron los logos aprobados.

El icono de Google del acceso (`public/images/google-signin.png`) procede del recurso oficial `https://developers.google.com/static/identity/images/g-logo.png`, consultado junto con las [guías de identidad de Google](https://developers.google.com/identity/branding-guidelines). No es una imagen generada ni una reproducción dibujada del logotipo.

## Archivos finales

Todos los recursos finales viven en `public/images/design-2026-10/`.

| Archivo | Uso | Dimensiones | Bytes | Calidad WebP | SHA-256 |
|---|---|---|---:|---:|---|
| `hero-community.webp` | Inicio: persona adulta de espaldas, balón, atardecer | 800 × 1000 | 59100 | 82 | `744f91c669dbd55e6fa518cc73358c89ae56e008de1768f6984480d67c907834` |
| `event-day.webp` | Partido de día, campo comunitario | 1279 × 720 | 134474 | 74 | `e992bb01130c417f763aea6f7ca3f1189b6c0769c0b2047f7702fa72246e816e` |
| `event-night.webp` | Partido de noche, campo iluminado | 1279 × 720 | 131196 | 78 | `50fef56d95427db0969416b97f3026416f5287aa5f42fdc6699a8b62eac8c0e5` |
| `event-tournament.webp` | Torneo: campo de fútbol de once | 1279 × 720 | 132776 | 74 | `881209eb13df02dde0712c3727b9b83b9b12eb7d9a8b644157208d6f8d09e898` |
| `auth-goal.webp` | Panel visual de acceso y registro | 640 × 960 | 82144 | 82 | `50b36e220a17720bb7bd6baa2c5b354f8f4401adf95acadafe471adc28b19861` |
| `profile-football.webp` | Banner de perfil y comunidad | 1200 × 400 | 72164 | 82 | `a6193d190ce5164d99457d7144328c4dbab2386e341c69db4fe4649b48965914` |

Se revisó visualmente cada resultado antes de convertirlo. Cada portada pesa menos de 150 KB; el hero menos de 250 KB. Los recursos horizontales mantienen la proporción producida por la herramienta (1279:720, prácticamente 16:9) sin recorte creativo. No se presentaron estos recursos como fotografías de hechos reales.

## Prompts exactos y salidas

### 1. Hero

Archivo original: `/Users/usuario/.codex/generated_images/01a1376d-ea41-7750-8107-584402dfa69a/exec-a0d33dfc-8ae4-41a8-81a5-da4b16b47127.png`.

```text
Use case: photorealistic-natural
Asset type: editorial hero photograph for LaCantera, a free community football web app; this is a generic illustrative image, not documentation of a real event.
Primary request: a high-quality portrait 4:5 photograph of one adult amateur footballer viewed entirely from behind, holding a classic black-and-white football at their side, in a small neighborhood football pitch at sunset.
Scene/backdrop: modest municipal football ground, artificial turf, a simple fence and goal, softly blurred low residential buildings in the distance. No geographic landmark.
Subject: adult with short dark hair wearing a plain deep forest green football shirt and simple dark shorts, relaxed and ready to play. The face is never visible.
Style/medium: natural editorial sports photography, believable anatomy, authentic fabric and turf, subtle grain, thoughtful composition, professional photo quality.
Composition/framing: vertical 4:5, mid-thigh to above head, figure slightly right of center, pitch and warm sky clearly visible around them, ample breathing room. Single photographic asset only, no graphic cards or UI overlays.
Lighting/mood: golden-hour sunset, warm amber rim light and soft green shadows, inviting community atmosphere, realistic contrast.
Color palette: deep forest greens, pale sage greens, warm natural sunset, neutral dark apparel.
Constraints: one adult only; blank shirt without any text, number, emblem, sponsor or logo; no recognizable face; classic black-and-white ball; no lettering anywhere.
Avoid: text, typography, watermarks, branded football boots or apparel, existing logos, identifiable people, children, crowds, invented statistics, posters, maps, mock interface, glossy 3D render, over-saturated neon.
```

### 2. Partido de día

Archivo original: `/Users/usuario/.codex/generated_images/01a1376d-ea41-7750-8107-584402dfa69a/exec-10e254b3-460d-4f51-9b5b-3e546d27d676.png`.

```text
Use case: photorealistic-natural
Asset type: default event cover photograph for an amateur football community app; a generic illustrative football field, not a real venue listing.
Primary request: a professional horizontal 16:9 natural photograph of an empty, welcoming neighborhood seven-a-side football pitch in late afternoon.
Scene/backdrop: artificial green turf with coherent white lines, a proportionate white goal and simple wire fence, modest trees and softly blurred residential buildings far beyond the pitch. No geographic landmark. No people.
Style/medium: candid editorial sports photography, realistic grass texture and field geometry, natural film-like depth.
Composition/framing: horizontal 16:9 landscape, camera near sideline at human eye height, full goal visible towards the right third, open expanse of playable green turf in foreground and midground, enough clear sky and darker foliage for versatile card cropping. This is one photograph, not a layout.
Lighting/mood: soft golden late-afternoon light, warm inviting sunset edge, rich natural greens, calm atmosphere before a friendly match.
Constraints: completely empty field, no signage or writing, no logos, no brand marks, credible goal and line markings.
Avoid: children, adults, identifiable spectators, teams, jersey emblems, advertisements, text, watermark, statistics, maps, UI cards, empty grand professional stadium, trophy, overly perfect synthetic CGI.
```

### 3. Partido de noche

Archivo original: `/Users/usuario/.codex/generated_images/01a1376d-ea41-7750-8107-584402dfa69a/exec-93e0f29c-e135-4db2-a0d6-126a0a70bf6b.png`.

```text
Use case: photorealistic-natural
Asset type: generic default nighttime five-a-side football event cover for LaCantera, an amateur sports app; illustration only, not an actual venue.
Primary request: a beautiful horizontal 16:9 editorial photograph of an empty modest neighborhood five-a-side football pitch under floodlights at blue hour turning into night.
Scene/backdrop: enclosed small synthetic turf pitch with a compact white goal, real five-a-side field proportions, simple wire fence, a few dark trees and distant unmarked low buildings. No people.
Style/medium: professional natural sports photograph, crisp believable white pitch lines and grass texture, cinematic but realistic.
Composition/framing: horizontal landscape 16:9 from a sideline corner, useful field filling the lower two-thirds, goal fully visible to the left-middle, floodlight poles with believable light halos against a deep blue sky. One image only, no UI.
Lighting/mood: rich green turf illuminated by soft neutral stadium lamps; inviting friendly evening sport, deep navy shadows, natural highlights, no neon glow.
Constraints: no players or spectators, no faces, no signage, no logos or lettering, coherent line markings, simple real-world community facility.
Avoid: recognizable people, children, professional branded stadium, advertising hoardings, text, watermark, labels, statistic cards, map, oversized arena, fog, surreal geometry, excessively saturated green.
```

### 4. Torneo

Archivo original: `/Users/usuario/.codex/generated_images/01a1376d-ea41-7750-8107-584402dfa69a/exec-bd3e82ad-605b-417b-920c-bc49288f0e2b.png`.

```text
Use case: photorealistic-natural
Asset type: generic football tournament event cover for a free amateur community app, an illustrative image without claiming a real event or venue.
Primary request: a polished horizontal 16:9 natural editorial photo of a modest full-size eleven-a-side football field prepared for a local tournament in golden evening light.
Scene/backdrop: believable full-size green pitch with correct touchline, penalty-area and goal markings, sturdy white goal and net, modest low unbranded terraced seating and plain perimeter fencing, softly blurred trees beyond. Completely empty facility, no identifiable spectators or players.
Style/medium: natural sports photography, authentic atmosphere of anticipation, detailed textured turf, thoughtful camera framing, understated editorial color grade.
Composition/framing: horizontal 16:9 wide view from near a sideline looking diagonally along the field towards the white goal and the far touchline, foreground green turf, field dominates the image; no decorative overlays.
Lighting/mood: warm late-afternoon sunlight and deep forest green shadows, a welcoming local competition atmosphere.
Constraints: no logos, text, scoreboard writing, jersey names, signage or branded advertising; no people; coherent physical proportions and playable field.
Avoid: fake clubs, trophies, children, recognizable faces, professional mega-stadium, crowds, invented event results or numbers, graphics, infographic, watermark, fantasy colors, CGI.
```

### 5. Acceso y registro

Archivo original: `/Users/usuario/.codex/generated_images/01a1376d-ea41-7750-8107-584402dfa69a/exec-4625d061-505a-45b9-bfa1-429b1fd4c7cf.png`.

```text
Use case: photorealistic-natural
Asset type: vertical atmospheric side-panel photograph for LaCantera registration and login screens, generic illustrative sports imagery.
Primary request: a beautiful portrait 2:3 close detail of a plain white football goalpost and weathered woven goal net, with a quiet neighborhood green pitch softly blurred behind.
Scene/backdrop: modest municipal football pitch at golden hour, natural turf or credible artificial grass, soft tree silhouettes at the far edge. No people or recognizable place.
Style/medium: high-quality editorial sports photography, authentic tactile net fibers and lightly worn painted metal, shallow depth of field, subtle analog grain.
Composition/framing: portrait vertical 2:3, white goalpost runs along one edge and net strands gently cross the frame in the foreground; enough softly blurred deep-green pitch around it for text placed later by the web app. Single photograph, no baked-in typography.
Lighting/mood: warm late-afternoon sunlight through the net, quiet inviting scene, soft deep green shadows, comfortable natural contrast.
Constraints: no text, brand marks, logos, numbers, watermarks, people, faces, registration form or UI.
Avoid: bent impossible goal geometry, exaggerated rust, broken equipment, urban landmarks, signage, kits, photo collage, artificial 3D render, logos, slogans.
```

### 6. Banner de perfil y comunidad

Archivo original: `/Users/usuario/.codex/generated_images/01a1376d-ea41-7750-8107-584402dfa69a/exec-b8e4850b-cabb-4fb7-8e03-dfb75bff0682.png`.

```text
Use case: photorealistic-natural
Asset type: generic profile and community banner for LaCantera, an amateur football social web app; illustrative imagery only.
Primary request: a high-quality ultra-wide horizontal 3:1 editorial photograph of a pair of plain black football boots and a classic black-and-white football resting on natural green football-pitch grass.
Scene/backdrop: quiet community pitch at sunset, textured grass clearly visible, far field softly blurred, no people or recognizable venue.
Subject: classic stitched pentagon-panel football, slightly worn plain black leather boots with realistic laces and studs, completely unbranded.
Style/medium: professional natural sports still-life photography, authentic textures and restrained film-like color.
Composition/framing: panoramic 3:1 banner, boots and ball grouped toward the right side, clean subtly shaded grass filling the left two-thirds to allow the app to place text and an avatar without overlap; low ground-level camera, no overlay or typography.
Lighting/mood: gentle warm golden light from the side, deep rich forest green turf, soft natural shadows, calm and welcoming.
Constraints: no logo, brand stripe, brand shape or lettering on boots or ball, no people, no faces, no text, no watermark; classic football pattern, true object proportions.
Avoid: sponsor decals, jersey, fake statistics, avatar portraits, maps, collage, mock interface, trophies, excessively glossy ball, distorted laces or surreal footwear.
```

