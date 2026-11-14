import { Timestamp } from 'firebase/firestore';
import type { Fixture, PlayEvent } from './types';
import { validDiscipline, validPenalties, consistentPlayerTotals } from './tournament.ts';

const validId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 128 && !/[\/\\\u0000-\u001f]/.test(value);
const score = (value: unknown): value is number | null => value === null || typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 99;
export function normalizeFixtureRecord(value: unknown, eventId: string): Fixture | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (data.eventId !== eventId || !validId(data.id) || !validId(data.ownerId) || !validId(data.homeId) || !(data.awayId === '' || validId(data.awayId)) || data.homeId === data.awayId || !Number.isInteger(data.round) || Number(data.round) < 1 || Number(data.round) > 64 || !score(data.homeScore) || !score(data.awayScore) || (data.homeScore === null) !== (data.awayScore === null)) return null;
  if (!validPenalties(data, true) && (data.homePenalties !== undefined || data.awayPenalties !== undefined)) return null;
  if (data.discipline !== undefined && (!validDiscipline(data.discipline) || data.homeScore === null || !data.awayId)) return null;
  if (!consistentPlayerTotals(data)) return null;
  const rawDate = data.kickoffAt as { toDate?: () => Date } | null;
  let startAt: string | undefined;
  if (rawDate !== null) { if (typeof rawDate?.toDate !== 'function') return null; try { startAt = rawDate.toDate().toISOString(); } catch { return null; } }
  if (typeof data.timeZone !== 'string' || typeof data.venue !== 'string' || !data.venue.trim() || data.venue.length > 200) return null;
  try { new Intl.DateTimeFormat('es', { timeZone: data.timeZone }).format(0); } catch { return null; }
  return { id: data.id, round: Number(data.round), homeId: data.homeId, awayId: data.awayId, homeScore: data.homeScore, awayScore: data.awayScore, ...(data.homePenalties === undefined ? {} : {homePenalties:data.homePenalties as number,awayPenalties:data.awayPenalties as number}), ...(data.discipline === undefined ? {} : {discipline:data.discipline as Fixture['discipline']}), ...(data.playerTotals === undefined ? {} : {playerTotals:data.playerTotals as Fixture['playerTotals'],playerChangeId:data.playerChangeId as string,playerRevision:data.playerRevision as number}), ...(startAt ? { startAt, timeZone: data.timeZone, venue: data.venue } : {}) };
}
export function fixtureFields(event: PlayEvent, fixture: Fixture) {
  return { id: fixture.id, eventId: event.id, ownerId: event.ownerId, round: fixture.round, homeId: fixture.homeId, awayId: fixture.awayId, homeScore: fixture.homeScore, awayScore: fixture.awayScore, ...(fixture.homePenalties === undefined ? {} : {homePenalties:fixture.homePenalties,awayPenalties:fixture.awayPenalties}), ...(fixture.discipline === undefined ? {} : {discipline:fixture.discipline}), ...(fixture.playerTotals === undefined ? {} : {playerTotals:fixture.playerTotals,playerChangeId:fixture.playerChangeId,playerRevision:fixture.playerRevision}), kickoffAt: fixture.startAt ? Timestamp.fromDate(new Date(fixture.startAt)) : null, timeZone: fixture.timeZone || event.timeZone, venue: fixture.venue || event.venue };
}
export function sameFixture(left: Fixture | undefined, right: Fixture): boolean {
  return !!left && ['id', 'round', 'homeId', 'awayId', 'homeScore', 'awayScore', 'startAt', 'timeZone', 'venue', 'homePenalties', 'awayPenalties', 'playerChangeId', 'playerRevision'].every(key => left[key as keyof Fixture] === right[key as keyof Fixture]) && (left.playerTotals === undefined && right.playerTotals === undefined || !!left.playerTotals && !!right.playerTotals && (['home','away'] as const).every(side=>(['goals','yellowCards','redCards','fouls'] as const).every(stat=>left.playerTotals![side][stat] === right.playerTotals![side][stat]))) && (left.discipline === undefined && right.discipline === undefined || !!left.discipline && !!right.discipline && (['home','away'] as const).every(side=>(['yellowCards','redCards','fouls'] as const).every(stat=>left.discipline![side][stat] === right.discipline![side][stat])));
}
