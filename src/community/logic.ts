import type { EventInput, Fixture, FixtureSchedule, MatchResult, PlayEvent, Standing } from './types';
import { eventVisibility } from './eventPrivacy.ts';

export function requireText(value: string, label: string, max = 200): string {
  const text = value.trim();
  if (!text || text.length > max) throw new Error(`${label}: introduce entre 1 y ${max} caracteres.`);
  return text;
}

export function validateEvent(input: EventInput, now = Date.now()): EventInput {
  if (!['match', 'tournament'].includes(input.type) || !['5', '7', '11'].includes(input.format) ||
    !['amateur', 'professional'].includes(input.level) || !['players', 'teams'].includes(input.entry) ||
    !['league', 'knockout'].includes(input.tournamentFormat) ||
    input.visibility !== undefined && !['public', 'private'].includes(input.visibility)) throw new Error('Formato de evento inválido.');
  if (!Number.isInteger(input.capacity) || input.capacity < 2 || input.capacity > 64) throw new Error('El aforo debe estar entre 2 y 64.');
  if (input.type === 'tournament' && input.capacity > 32) throw new Error('Los torneos admiten hasta 32 participantes para generar el calendario.');
  if (!Number.isFinite(Date.parse(input.startAt)) || Date.parse(input.startAt) <= now) throw new Error('La fecha debe ser futura.');
  try { new Intl.DateTimeFormat('es', { timeZone: input.timeZone }).format(); } catch { throw new Error('Zona horaria inválida.'); }
  if (input.description.length > 2000) throw new Error('La descripción admite hasta 2000 caracteres.');
  return { ...input, visibility: eventVisibility(input), title: requireText(input.title, 'Título', 100), city: requireText(input.city, 'Ciudad', 100),
    country: requireText(input.country, 'País', 100), venue: requireText(input.venue, 'Lugar', 200), description: input.description.trim() };
}

export function validateEventEdit(event: PlayEvent, input: EventInput, reason: string, now = Date.now()): EventInput {
  if (event.status === 'completed') throw new Error('Un encuentro celebrado no se puede reprogramar.');
  requireText(reason, 'Motivo del cambio', 500);
  const cleaned = validateEvent(input, now);
  if (cleaned.visibility !== eventVisibility(event)) throw new Error('La privacidad del encuentro no se puede cambiar después de crearlo.');
  if (cleaned.capacity < Object.keys(event.participants).length) throw new Error('El aforo no puede ser menor que el número de inscripciones.');
  if (Object.keys(event.participants).length && (cleaned.type !== event.type || cleaned.entry !== event.entry)) throw new Error('Con participantes inscritos no puedes cambiar el tipo de encuentro ni de inscripción.');
  if (event.fixtures.length && (cleaned.type !== event.type || cleaned.entry !== event.entry || cleaned.format !== event.format || cleaned.tournamentFormat !== event.tournamentFormat)) throw new Error('Los cruces generados fijan el formato de la competición.');
  if (cleaned.teamId !== event.teamId) throw new Error('No puedes cambiar el equipo organizador de un encuentro publicado.');
  return cleaned;
}

export function validateFixtureSchedule(input: FixtureSchedule, now = Date.now()): FixtureSchedule {
  const ms = Date.parse(input.startAt);
  if (!Number.isFinite(ms) || ms <= now) throw new Error('El horario del cruce debe ser futuro.');
  try { new Intl.DateTimeFormat('es', { timeZone: input.timeZone }).format(); } catch { throw new Error('Zona horaria inválida.'); }
  return { startAt: new Date(ms).toISOString(), timeZone: input.timeZone, venue: requireText(input.venue, 'Lugar del cruce', 200) };
}

export function validateMatchResult(input: MatchResult): MatchResult {
  const homeName = requireText(input.homeName, 'Equipo local', 100), awayName = requireText(input.awayName, 'Equipo visitante', 100);
  if (homeName.normalize('NFKC').toLocaleLowerCase('es') === awayName.normalize('NFKC').toLocaleLowerCase('es')) throw new Error('Indica dos equipos diferentes.');
  if (![input.homeScore, input.awayScore].every(value => Number.isInteger(value) && value >= 0 && value <= 99)) throw new Error('Introduce goles enteros entre 0 y 99.');
  return { ...input, homeName, awayName };
}

export function joinParticipants(event: PlayEvent, id: string, name: string, now = Date.now()): Record<string, string> {
  if (event.status !== 'open' || event.fixtures.length || Date.parse(event.startAt) <= now) throw new Error('Las inscripciones están cerradas.');
  if (event.participants[id]) throw new Error('Ya estás inscrito.');
  if (Object.keys(event.participants).length >= event.capacity) throw new Error('El evento está completo.');
  return { ...event.participants, [id]: requireText(name, event.entry === 'teams' ? 'Equipo' : 'Nombre', 100) };
}

export function makeFixtures(event: PlayEvent): Fixture[] {
  const ids = Object.keys(event.participants);
  if (event.status === 'cancelled' || event.status === 'completed') throw new Error('No puedes generar cruces en un encuentro cancelado o celebrado.');
  if (event.fixtures.length) throw new Error('Ya se ha generado el calendario.');
  if (ids.length < 2 || ids.length > 32) throw new Error('El calendario admite entre 2 y 32 participantes.');
  if (event.tournamentFormat === 'knockout') {
    // Pad a seeded bracket to the next power of two. Empty awayId represents a bye.
    const size = 2 ** Math.ceil(Math.log2(ids.length));
    const byes = size - ids.length;
    const result: Fixture[] = [];
    let index = 0;
    for (let i = 0; i < size / 2; i++) {
      const homeId = ids[index++];
      const awayId = i < byes ? '' : ids[index++];
      result.push({ id: `r1-${i + 1}`, round: 1, homeId, awayId, homeScore: null, awayScore: null });
    }
    return result;
  }
  // Circle method: each entrant plays at most once per round, including odd sizes.
  const rotation = ids.length % 2 ? [...ids, ''] : [...ids];
  const fixtures: Fixture[] = [];
  for (let round = 1; round < rotation.length; round++) {
    for (let i = 0; i < rotation.length / 2; i++) {
      const homeId = rotation[i];
      const awayId = rotation[rotation.length - 1 - i];
      if (homeId && awayId) fixtures.push({ id: `r${round}-${i + 1}`, round, homeId, awayId, homeScore: null, awayScore: null });
    }
    rotation.splice(1, 0, rotation.pop()!);
  }
  return fixtures;
}

export function recordScore(event: PlayEvent, fixtureId: string, home: number, away: number): Fixture[] {
  if (event.status === 'cancelled') throw new Error('El evento está cancelado.');
  if (![home, away].every(n => Number.isInteger(n) && n >= 0 && n <= 99)) throw new Error('Introduce goles enteros entre 0 y 99.');
  const fixture = event.fixtures.find(f => f.id === fixtureId);
  if (!fixture || !fixture.awayId) throw new Error('Partido no encontrado o pase libre.');
  if (event.tournamentFormat === 'knockout' && home === away) throw new Error('En eliminatorias introduce el marcador decisivo, incluidos los penaltis si los hubo.');
  if (event.tournamentFormat === 'knockout' && event.fixtures.some(f => f.round > fixture.round)) throw new Error('No puedes cambiar un resultado que ya generó la siguiente ronda.');
  const updated = event.fixtures.map(f => f.id === fixtureId ? { ...f, homeScore: home, awayScore: away } : f);
  if (event.tournamentFormat !== 'knockout') return updated;
  const lastRound = updated.filter(f => f.round === fixture.round);
  if (lastRound.length < 2 || lastRound.some(f => f.awayId && (f.homeScore === null || f.awayScore === null))) return updated;
  const winners = lastRound.map(f => !f.awayId || f.homeScore! > f.awayScore! ? f.homeId : f.awayId);
  for (let i = 0; i < winners.length; i += 2) updated.push({ id: `r${fixture.round + 1}-${i / 2 + 1}`, round: fixture.round + 1,
    homeId: winners[i], awayId: winners[i + 1], homeScore: null, awayScore: null });
  return updated;
}

export function standings(event: PlayEvent): Standing[] {
  const table: Record<string, Standing> = Object.fromEntries(Object.entries(event.participants).map(([id, name]) => [id,
    { id, name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }]));
  for (const fixture of event.fixtures) {
    const h = table[fixture.homeId], a = table[fixture.awayId];
    if (!h || !a || fixture.homeScore === null || fixture.awayScore === null) continue;
    h.played++; a.played++;
    h.goalsFor += fixture.homeScore; h.goalsAgainst += fixture.awayScore;
    a.goalsFor += fixture.awayScore; a.goalsAgainst += fixture.homeScore;
    if (fixture.homeScore > fixture.awayScore) { h.won++; h.points += 3; a.lost++; }
    else if (fixture.homeScore < fixture.awayScore) { a.won++; a.points += 3; h.lost++; }
    else { h.drawn++; a.drawn++; h.points++; a.points++; }
  }
  return Object.values(table).sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name));
}

function zonedParts(ms: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(ms);
  const get = (name: string) => parts.find(p => p.type === name)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function isoToZonedDateTime(iso: string, timeZone: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) throw new Error('Fecha inválida.');
  try { return zonedParts(ms, timeZone); } catch { throw new Error('Zona horaria inválida.'); }
}

export type EventRecurrence = 'weekly' | 'biweekly' | 'monthly';
export function expandEventSeries(input: EventInput, frequency: EventRecurrence, count: number, now = Date.now()): EventInput[] {
  if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) throw new Error('Frecuencia de repetición inválida.');
  if (!Number.isInteger(count) || count < 2 || count > 12) throw new Error('Una serie debe tener entre 2 y 12 encuentros.');
  const original = validateEvent(input, now);
  const local = isoToZonedDateTime(original.startAt, original.timeZone);
  const [year, month, day] = local.slice(0, 10).split('-').map(Number);
  const minuteRemainder = Date.parse(original.startAt) % 60_000;
  return Array.from({ length: count }, (_, index) => {
    if (!index) return { ...original };
    let date: Date;
    if (frequency === 'monthly') {
      const target = new Date(Date.UTC(year, month - 1 + index, 1));
      const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
      date = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, lastDay)));
    } else date = new Date(Date.UTC(year, month - 1, day + index * (frequency === 'weekly' ? 7 : 14)));
    const nextLocal = `${date.toISOString().slice(0, 10)}${local.slice(10)}`;
    let startAt: string;
    try { startAt = new Date(Date.parse(zonedDateTimeToIso(nextLocal, original.timeZone)) + minuteRemainder).toISOString(); }
    catch (error) { throw new Error(`El encuentro ${index + 1} no tiene una hora válida (${nextLocal.replace('T', ' ')}). ${error instanceof Error ? error.message : 'Elige otra hora.'}`); }
    return validateEvent({ ...original, startAt, ...(original.startAtMs === undefined ? {} : { startAtMs: Date.parse(startAt) }) }, now);
  });
}

export function buildEventCalendar(event: PlayEvent, invitation: string, fixtureId?: string, now = Date.now()): string {
  const stamp = (date: number) => new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const scheduled = event.fixtures.filter(fixture => fixture.startAt && fixture.awayId);
  const fixture = fixtureId ? scheduled.find(item => item.id === fixtureId) : undefined;
  if (fixtureId && !fixture) throw new Error('Este cruce todavía no tiene un horario asignado.');
  const appointments = fixture ? [fixture] : scheduled.length ? scheduled : [null];
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cantera//Encuentros//ES', 'CALSCALE:GREGORIAN', ...appointments.flatMap(item => {
    const start = Date.parse(item?.startAt || event.startAt);
    const summary = item ? `${event.title}: ${event.participants[item.homeId]} – ${event.participants[item.awayId]}` : event.title;
    return ['BEGIN:VEVENT', `UID:${event.id}${item ? `-${item.id}` : ''}@cantera`, `DTSTAMP:${stamp(now)}`, `SEQUENCE:${event.revision || 0}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(start + 90 * 60_000)}`, `SUMMARY:${escape(summary)}`, `LOCATION:${escape(`${item?.venue || event.venue}, ${event.city}, ${event.country}`)}`, `DESCRIPTION:${escape(`${event.description}\n${invitation}\nZona horaria: ${item?.timeZone || event.timeZone}. Duración orientativa: 90 minutos. Confirmar con la organización.`)}`, `STATUS:${event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`, 'END:VEVENT'];
  }), 'END:VCALENDAR'];
  const encoder = new TextEncoder();
  const fold = (line: string) => {
    let output = '', size = 0;
    for (const char of line) {
      const bytes = encoder.encode(char).length;
      if (size + bytes > 73) { output += '\r\n '; size = 1; }
      output += char; size += bytes;
    }
    return output;
  };
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

export function zonedDateTimeOptions(local: string, timeZone: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new Error('Fecha y hora inválidas.');
  const target = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(target) || new Date(target).toISOString().slice(0, 16) !== local) throw new Error('Fecha inválida.');
  const candidates = [-36, -12, 0, 12, 36].map(hours => {
    const probe = target + hours * 3600000;
    const offset = Date.parse(`${zonedParts(probe, timeZone)}:00Z`) - probe;
    return target - offset;
  }).filter(ms => zonedParts(ms, timeZone) === local).sort((a, b) => a - b);
  if (!candidates.length) throw new Error('Esa hora no existe por el cambio horario. Elige otra hora.');
  return [...new Set(candidates)].map(ms => new Date(ms).toISOString());
}
export function zonedDateTimeToIso(local: string, timeZone: string, occurrence: 'first' | 'second' = 'first'): string {
  const candidates = zonedDateTimeOptions(local, timeZone);
  return candidates[occurrence === 'second' && candidates.length > 1 ? 1 : 0];
}
