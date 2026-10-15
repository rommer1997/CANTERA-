import type { PlayEvent } from './types';

export function profileInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toLocaleUpperCase('es') || 'C';
}

export function splitAgenda(events: PlayEvent[], now = Date.now()) {
  const upcoming = events.filter(event => !['cancelled', 'completed'].includes(event.status) && Date.parse(event.startAt) > now)
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  const history = events.filter(event => ['cancelled', 'completed'].includes(event.status) || Date.parse(event.startAt) <= now)
    .sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt));
  return { upcoming, history };
}

export function profileNavigationKey(pathname: string, search: string, identity: string) {
  if (pathname !== '/profile') return pathname;
  const params = new URLSearchParams(search);
  return `${pathname}:${params.get('tab') || ''}:${params.get('intent') === 'login' ? 'login' : 'register'}:${identity}`;
}
