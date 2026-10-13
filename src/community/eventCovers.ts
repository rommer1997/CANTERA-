import type { PlayEvent } from './types';

export const eventCovers = [
  { id: 'day', label: 'Fútbol de día', image: '/images/design-2026-10/event-day.webp' },
  { id: 'night', label: 'Bajo los focos', image: '/images/design-2026-10/event-night.webp' },
  { id: 'tournament', label: 'Día de torneo', image: '/images/design-2026-10/event-tournament.webp' },
] as const;

export type EventCoverId = typeof eventCovers[number]['id'];

export function isEventCoverId(value: unknown): value is EventCoverId {
  return typeof value === 'string' && eventCovers.some(cover => cover.id === value);
}

/** A generic cover describes the sport, never the actual venue or participants. */
export function eventCover(event: Pick<PlayEvent, 'type' | 'coverId'>) {
  const coverId = isEventCoverId(event.coverId) ? event.coverId : event.type === 'tournament' ? 'tournament' : 'day';
  return eventCovers.find(cover => cover.id === coverId)!;
}
