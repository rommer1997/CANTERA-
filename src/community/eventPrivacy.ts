import type { PlayEvent } from './types';

// Legacy events predate visibility and remain public when read by their exact ID.
// Discovery queries require an explicit public field so private data never enters them.
export function eventVisibility(event: Pick<PlayEvent, 'visibility'>): 'public' | 'private' {
  return event.visibility === 'private' ? 'private' : 'public';
}

export function isPublicEvent(event: Pick<PlayEvent, 'visibility'>): boolean {
  return eventVisibility(event) === 'public';
}

export function canReadEvent(event: Pick<PlayEvent, 'visibility' | 'ownerId' | 'participantIds'>, userId?: string): boolean {
  if (isPublicEvent(event)) return true;
  if (!userId) return false;
  return event.ownerId === userId || !userId.startsWith('guest_') && !userId.startsWith('guest-') && !!event.participantIds?.includes(userId);
}
