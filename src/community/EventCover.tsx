import { eventCover } from './eventCovers';
import type { PlayEvent } from './types';

export default function EventCover({ event, className = '', priority = false, label = false }: { event: Pick<PlayEvent, 'type' | 'coverId'>; className?: string; priority?: boolean; label?: boolean }) {
  const cover = eventCover(event);
  return <div className={`ce-event-cover ${className}`}><img src={cover.image} alt="" width="1279" height="720" loading={priority ? 'eager' : 'lazy'} decoding="async" />{label && <span className="ce-generic-label">Imagen genérica</span>}</div>;
}
