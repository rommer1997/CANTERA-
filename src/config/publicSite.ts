// Completar únicamente con datos reales del proyecto. Ningún TODO se publica como enlace.
export const publicSite = {
  socials: {
    instagram: 'https://www.instagram.com/lacantera_es/',
    tiktok: 'https://www.tiktok.com/@lacantera.es',
    x: 'TODO_X_URL',
  },
  screenshots: [
    {
      src: '/images/screens/crear-partido.webp',
      alt: 'Formulario real de LaCantera para crear un partido: nombre, campo, ciudad, fecha y hora, sin publicar ningún encuentro.',
      title: 'Organiza tu partido',
      description: 'Elige dónde, cuándo y cuántas personas vais a jugar.',
      caption: 'Formulario sin publicar',
      width: 390, height: 606,
    },
    {
      src: '/images/screens/invitaciones.webp',
      alt: 'Pantalla real de invitaciones de LaCantera, sin códigos activos, con opciones para compartir un enlace e introducir o escanear un código.',
      title: 'Invita a tu gente',
      description: 'Conecta por enlace o QR. Los partidos privados tienen su propia invitación.',
      caption: 'Vista sin invitaciones activas',
      width: 390, height: 660,
    },
    {
      src: '/images/screens/crear-equipo.webp',
      alt: 'Formulario real y vacío de LaCantera para crear un equipo o grupo, con nombre, país, ciudad y presentación.',
      title: 'Crea tu equipo',
      description: 'Si jugáis juntos, cread vuestro equipo o grupo para organizaros.',
      caption: 'Formulario sin guardar',
      width: 390, height: 760,
    },
  ],
  analytics: {
    enabled: true,
    provider: 'umami' as const,
    domain: 'lacantera.com.es',
    endpoint: 'https://gateway.umami.is/api/send',
    websiteId: '8d1f0921-a53c-4346-b128-dbbc26664e40',
  },
};

export function publicSocialUrl(value: string): string | null {
  if (value.startsWith('TODO_')) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
