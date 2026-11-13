// Completar únicamente con datos reales del proyecto. Ningún TODO se publica como enlace.
export const publicSite = {
  socials: {
    instagram: 'https://www.instagram.com/lacantera_es/',
    tiktok: 'https://www.tiktok.com/@lacantera.es',
    x: 'TODO_X_URL',
  },
  screenshots: [
    { src: '/images/screens/crear-partido.svg', alt: 'Espacio reservado para una captura real del formulario de creación de un partido', title: 'Crea el partido', pending: true },
    { src: '/images/screens/lista-jugadores.svg', alt: 'Espacio reservado para una captura real de la lista de jugadores inscritos', title: 'Reúne a tu gente', pending: true },
    { src: '/images/screens/equipo.svg', alt: 'Espacio reservado para una captura real de la pantalla de un equipo', title: 'A jugar', pending: true },
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
