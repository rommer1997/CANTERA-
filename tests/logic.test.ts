import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventCalendar, expandEventSeries, isoToZonedDateTime, joinParticipants, makeFixtures, recordScore, standings, validateEvent, validateEventEdit, validateFixtureSchedule, validateMatchResult, zonedDateTimeToIso } from '../src/community/logic.ts';
import type { EventInput, PlayEvent } from '../src/community/types.ts';
function event(size = 4, format: 'league' | 'knockout' = 'league'): PlayEvent {
  return { id: 'event', ownerId: 'owner', ownerName: 'Organizador', title: 'Torneo', type: 'tournament', format: '7', level: 'amateur', country: 'España', city: 'Madrid', timeZone: 'Europe/Madrid', venue: 'Campo municipal', startAt: '2099-01-01T12:00:00Z', capacity: 8, entry: 'teams', description: '', status: 'open', tournamentFormat: format, participants: Object.fromEntries(Array.from({ length: size }, (_, i) => [`p${i}`, `Equipo ${i}`])), fixtures: [], createdAt: '2026-10-05T12:00:00Z' };
}
test('liga pares únicos, una aparición por jornada, tamaños pares e impares', () => {
  for (const n of [2, 3, 4, 7, 32]) {
    const fixtures = makeFixtures(event(n));
    assert.equal(fixtures.length, n * (n - 1) / 2);
    assert.equal(new Set(fixtures.map(f => [f.homeId, f.awayId].sort().join(':'))).size, fixtures.length);
    for (const round of new Set(fixtures.map(f => f.round))) {
      const ids = fixtures.filter(f => f.round === round).flatMap(f => [f.homeId, f.awayId]);
      assert.equal(new Set(ids).size, ids.length);
    }
  }
});
test('eliminatoria impar con pase libre genera final sin duplicar ni permitir editar ronda cerrada', () => {
  const e = event(3, 'knockout'); e.fixtures = makeFixtures(e);
  assert.equal(e.fixtures.filter(f => !f.awayId).length, 1);
  const match = e.fixtures.find(f => f.awayId)!;
  e.fixtures = recordScore(e, match.id, 2, 1);
  const final = e.fixtures.find(f => f.round === 2)!;
  assert.ok(final); assert.deepEqual(new Set([final.homeId, final.awayId]), new Set(['p0', 'p1']));
  assert.throws(() => recordScore(e, match.id, 1, 2), /siguiente ronda/);
  assert.throws(() => recordScore(e, final.id, 1, 1), /marcador decisivo/);
  e.fixtures = recordScore(e, final.id, 3, 1); assert.equal(e.fixtures.length, 3);
});
test('clasificación calcula puntos, goles y empates sin contar pendientes', () => {
  const e = event(3); e.fixtures = makeFixtures(e);
  e.fixtures = recordScore(e, e.fixtures[0].id, 2, 0);
  const table = standings(e); assert.equal(table.reduce((n, row) => n + row.points, 0), 3);
  assert.equal(table.reduce((n, row) => n + row.played, 0), 2);
  assert.equal(table[0].goalsFor, 2); assert.equal(table[0].points, 3);
});
test('inscripción evita repetición, aforo, calendario cerrado y fechas pasadas', () => {
  const e = event(2); e.capacity = 3;
  e.participants = joinParticipants(e, 'new', ' Nuevo '); assert.equal(e.participants.new, 'Nuevo');
  assert.throws(() => joinParticipants(e, 'new', 'Otro'), /Ya estás/);
  assert.throws(() => joinParticipants(e, 'full', 'Otro'), /completo/);
  assert.throws(() => joinParticipants({ ...e, status: 'closed' }, 'x', 'X'), /cerradas/);
  assert.throws(() => joinParticipants({ ...e, startAt: '2000-01-01' }, 'x', 'X'), /cerradas/);
});
test('fecha mundial respeta DST, zona con media hora y horas inexistentes', () => {
  assert.equal(zonedDateTimeToIso('2026-10-05T18:00', 'Europe/Madrid'), '2026-10-05T16:00:00.000Z');
  assert.equal(zonedDateTimeToIso('2026-10-05T18:00', 'Asia/Kolkata'), '2026-10-05T12:30:00.000Z');
  assert.throws(() => zonedDateTimeToIso('2026-03-29T02:30', 'Europe/Madrid'), /no existe/);
  assert.equal(zonedDateTimeToIso('2026-10-25T02:30', 'Europe/Madrid'), '2026-10-25T00:30:00.000Z');
  assert.throws(() => zonedDateTimeToIso('2026-02-31T18:00', 'UTC'), /inválida/);
});
test('validación rechaza ciudad/país ausentes y aforo arbitrario', () => {
  const e = event(); assert.throws(() => validateEvent({ ...e, country: '' }), /País/);
  assert.throws(() => validateEvent({ ...e, capacity: 1000 }), /aforo/);
});

test('edición conserva inscripciones, formato generado y equipo organizador', () => {
  const e = event(3); const input: EventInput = { ...e, title: ' Nuevo título ', capacity: 4, teamId: undefined };
  assert.equal(validateEventEdit(e, input, ' Cambio de campo ').title, 'Nuevo título');
  assert.equal(Object.keys(e.participants).length, 3);
  assert.throws(() => validateEventEdit(e, { ...input, capacity: 2 }, 'Cambio'), /inscripciones/);
  assert.throws(() => validateEventEdit(e, { ...input, entry: 'players' }, 'Cambio'), /tipo/);
  assert.throws(() => validateEventEdit(e, input, '  '), /Motivo/);
  assert.throws(() => validateEventEdit({ ...e, status: 'completed' }, input, 'Cambio'), /celebrado/);
  assert.throws(() => validateEventEdit({ ...e, teamId: 'team' }, input, 'Cambio'), /equipo organizador/);
  const scheduled = { ...e, fixtures: makeFixtures(e) };
  assert.throws(() => validateEventEdit(scheduled, { ...input, format: '5' }, 'Cambio'), /formato/);
  assert.throws(() => validateEventEdit(scheduled, { ...input, tournamentFormat: 'knockout' }, 'Cambio'), /formato/);
  assert.equal(validateEventEdit(scheduled, { ...input, venue: 'Otro campo' }, 'Campo indisponible').venue, 'Otro campo');
});

test('horarios por cruce exigen fecha futura, zona válida y campo', () => {
  const now = Date.parse('2026-10-06T12:00:00Z');
  const schedule = { startAt: '2026-10-10T18:00:00+02:00', timeZone: 'Europe/Madrid', venue: ' Campo 2 ' };
  assert.deepEqual(validateFixtureSchedule(schedule, now), { startAt: '2026-10-10T16:00:00.000Z', timeZone: 'Europe/Madrid', venue: 'Campo 2' });
  assert.throws(() => validateFixtureSchedule({ ...schedule, startAt: '2020-01-01T00:00:00Z' }, now), /futuro/);
  assert.throws(() => validateFixtureSchedule({ ...schedule, venue: ' ' }, now), /Lugar/);
  assert.throws(() => validateFixtureSchedule({ ...schedule, timeZone: 'Zona/Inexistente' }, now), /Zona/);
});

test('resultado de partido admite empate, rechaza nombres iguales y marcadores inválidos', () => {
  assert.deepEqual(validateMatchResult({ homeName: ' Local ', awayName: ' Visitante ', homeScore: 0, awayScore: 0 }), { homeName: 'Local', awayName: 'Visitante', homeScore: 0, awayScore: 0 });
  assert.throws(() => validateMatchResult({ homeName: 'Equipo', awayName: ' EQUIPO ', homeScore: 1, awayScore: 2 }), /diferentes/);
  for (const score of [-1, 100, 1.5, NaN]) assert.throws(() => validateMatchResult({ homeName: 'A', awayName: 'B', homeScore: score, awayScore: 0 }), /goles enteros/);
});

test('serie semanal y quincenal conserva hora local al cambiar horario de verano', () => {
  const now = Date.parse('2026-10-01T00:00:00Z');
  const input: EventInput = { ...event(0), type: 'match', startAt: zonedDateTimeToIso('2026-10-18T18:00', 'Europe/Madrid'), startAtMs: Date.parse('2026-10-18T16:00:00Z') };
  const weekly = expandEventSeries(input, 'weekly', 3, now);
  assert.deepEqual(weekly.map(item => item.startAt), ['2026-10-18T16:00:00.000Z', '2026-10-25T17:00:00.000Z', '2026-11-01T17:00:00.000Z']);
  assert.deepEqual(weekly.map(item => isoToZonedDateTime(item.startAt, item.timeZone)), ['2026-10-18T18:00', '2026-10-25T18:00', '2026-11-01T18:00']);
  assert.equal(weekly[1].startAtMs, Date.parse(weekly[1].startAt));
  const biweekly = expandEventSeries(input, 'biweekly', 2, now);
  assert.equal(isoToZonedDateTime(biweekly[1].startAt, biweekly[1].timeZone), '2026-11-01T18:00');
  assert.equal(input.startAt, '2026-10-18T16:00:00.000Z');
});

test('serie mensual usa último día sin desplazar fechas de meses posteriores', () => {
  const now = Date.parse('2027-01-01T00:00:00Z');
  const input: EventInput = { ...event(0), type: 'match', startAt: zonedDateTimeToIso('2027-01-31T18:00', 'Europe/Madrid') };
  assert.deepEqual(expandEventSeries(input, 'monthly', 3, now).map(item => isoToZonedDateTime(item.startAt, item.timeZone)), ['2027-01-31T18:00', '2027-02-28T18:00', '2027-03-31T18:00']);
  const leap = { ...input, startAt: zonedDateTimeToIso('2028-01-31T18:00', 'Europe/Madrid') };
  assert.equal(isoToZonedDateTime(expandEventSeries(leap, 'monthly', 2, now)[1].startAt, leap.timeZone), '2028-02-29T18:00');
});

test('serie rechaza límites, inicio pasado y una ocurrencia en hora inexistente', () => {
  const now = Date.parse('2026-03-01T00:00:00Z');
  const input: EventInput = { ...event(0), type: 'match', startAt: zonedDateTimeToIso('2026-03-22T02:30', 'Europe/Madrid') };
  assert.throws(() => expandEventSeries(input, 'weekly', 2, now), /encuentro 2.*no existe/);
  for (const count of [1, 13, 2.5]) assert.throws(() => expandEventSeries(input, 'monthly', count, now), /2 y 12/);
  assert.throws(() => expandEventSeries({ ...input, startAt: '2020-01-01T00:00:00Z' }, 'weekly', 2, now), /futura/);
  assert.equal(expandEventSeries({ ...input, startAt: zonedDateTimeToIso('2026-03-22T18:00', 'Europe/Madrid') }, 'weekly', 12, now).length, 12);
  assert.throws(() => makeFixtures({ ...event(), status: 'completed' }), /celebrado/);
});

test('agenda exporta sólo cruces con horario real, zona en descripción y revisión', () => {
  const e = event(3); e.fixtures = makeFixtures(e); e.revision = 4;
  e.fixtures[0] = { ...e.fixtures[0], startAt: '2026-10-25T17:00:00.000Z', timeZone: 'Europe/Madrid', venue: 'Campo 2' };
  const calendar = buildEventCalendar(e, 'https://cantera.example/#/play/event', undefined, Date.parse('2026-10-01T00:00:00Z'));
  const unfolded = calendar.replace(/\r\n /g, '');
  assert.equal((calendar.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert.match(unfolded, /DTSTART:20261025T170000Z/);
  assert.match(unfolded, /DTEND:20261025T183000Z/);
  assert.match(unfolded, /SEQUENCE:4/);
  assert.match(unfolded, /Europe\/Madrid/);
  assert.match(unfolded, /LOCATION:Campo 2/);
  assert.throws(() => buildEventCalendar(e, '', e.fixtures[1].id), /horario asignado/);
});

test('agenda sin cruces usa fecha general y escapa contenido sin inyectar citas', () => {
  const e = { ...event(0), title: 'Título ' + 'á'.repeat(80), description: 'Texto\rBEGIN:VEVENT\r\nComas, y punto; final', status: 'cancelled' as const };
  const calendar = buildEventCalendar(e, 'https://cantera.example/#/play/event');
  assert.equal((calendar.match(/\r\nBEGIN:VEVENT\r\n/g) || []).length, 1);
  assert.match(calendar, /STATUS:CANCELLED/);
  assert.match(calendar.replace(/\r\n /g, ''), /Texto\\nBEGIN:VEVENT\\nComas\\, y punto\\; final/);
  assert.ok(calendar.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75));
  assert.ok(calendar.endsWith('END:VCALENDAR\r\n'));
});

test('una hora repetida permite elegir ambas ocurrencias sin desplazar una edición', async () => {
 const { zonedDateTimeOptions } = await import('../src/community/logic.ts');
 const options = zonedDateTimeOptions('2026-10-25T02:30', 'Europe/Madrid');
 assert.equal(options.length, 2);
 assert.equal(Date.parse(options[1]) - Date.parse(options[0]), 3600000);
 assert.equal(zonedDateTimeToIso('2026-10-25T02:30', 'Europe/Madrid', 'second'), options[1]);
 assert.equal(zonedDateTimeToIso('2026-10-25T02:30', 'Europe/Madrid'), options[0]);
});
