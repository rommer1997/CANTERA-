import test from 'node:test';
import assert from 'node:assert/strict';
import { joinParticipants, makeFixtures, recordScore, standings, validateEvent, zonedDateTimeToIso } from '../src/community/logic.ts';
import type { PlayEvent } from '../src/community/types.ts';
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
