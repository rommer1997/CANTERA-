import { Timestamp } from 'firebase/firestore';
import type { Fixture, PlayEvent } from './types';

const validId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 128 && !/[\/\\\u0000-\u001f]/.test(value);
const score = (value: unknown): value is number | null => value === null || typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 99;
export function normalizeFixtureRecord(value: unknown, eventId: string): Fixture | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (data.eventId !== eventId || !validId(data.id) || !validId(data.ownerId) || !validId(data.homeId) || !(data.awayId === '' || validId(data.awayId)) || data.homeId === data.awayId || !Number.isInteger(data.round) || Number(data.round) < 1 || Number(data.round) > 64 || !score(data.homeScore) || !score(data.awayScore) || (data.homeScore === null) !== (data.awayScore === null)) return null;
  const rawDate = data.kickoffAt as { toDate?: () => Date } | null;
  let startAt: string | undefined;
  if (rawDate !== null) { if (typeof rawDate?.toDate !== 'function') return null; try { startAt = rawDate.toDate().toISOString(); } catch { return null; } }
  if (typeof data.timeZone !== 'string' || typeof data.venue !== 'string' || !data.venue.trim() || data.venue.length > 200) return null;
  try { new Intl.DateTimeFormat('es', { timeZone: data.timeZone }).format(0); } catch { return null; }
  return { id: data.id, round: Number(data.round), homeId: data.homeId, awayId: data.awayId, homeScore: data.homeScore, awayScore: data.awayScore, ...(startAt ? { startAt, timeZone: data.timeZone, venue: data.venue } : {}) };
}
export function fixtureFields(event: PlayEvent, fixture: Fixture) {
  return { id: fixture.id, eventId: event.id, ownerId: event.ownerId, round: fixture.round, homeId: fixture.homeId, awayId: fixture.awayId, homeScore: fixture.homeScore, awayScore: fixture.awayScore, kickoffAt: fixture.startAt ? Timestamp.fromDate(new Date(fixture.startAt)) : null, timeZone: fixture.timeZone || event.timeZone, venue: fixture.venue || event.venue };
}
export function sameFixture(left: Fixture | undefined, right: Fixture): boolean {
  return !!left && ['id', 'round', 'homeId', 'awayId', 'homeScore', 'awayScore', 'startAt', 'timeZone', 'venue'].every(key => left[key as keyof Fixture] === right[key as keyof Fixture]);
}
