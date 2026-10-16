import test from 'node:test';
import assert from 'node:assert/strict';
import { eventCover, isEventCoverId } from '../src/community/eventCovers.ts';
import { matchesEventDate } from '../src/community/eventBrowsing.ts';
import { normalizeEvent } from '../src/community/normalization.ts';
import { expandEventSeries, validateEvent, validateEventEdit } from '../src/community/logic.ts';
import type { EventInput, PlayEvent } from '../src/community/types.ts';

const event: PlayEvent = { id: 'cover-event', ownerId: 'owner', ownerName: 'Organización', title: 'Partido', visibility: 'private', type: 'match', format: '7', level: 'amateur', city: 'Madrid', country: 'España', timeZone: 'Europe/Madrid', venue: 'Campo', startAt: '2099-01-01T17:00:00.000Z', capacity: 14, entry: 'players', description: '', status: 'open', tournamentFormat: 'league', participants: {}, fixtures: [], createdAt: '2026-10-14T00:00:00.000Z' };

test('eventos históricos reciben una portada genérica sin migración ni URL del organizador', () => {
  assert.equal(eventCover(event).id, 'day');
  assert.equal(eventCover({ type: 'tournament' }).id, 'tournament');
  assert.equal(normalizeEvent(event)?.coverId, undefined);
  assert.equal(eventCover({ ...event, coverId: 'night' }).image, '/images/design-2026-10/event-night.webp');
});

test('portadas sólo admiten los tres identificadores estáticos y conservan privacidad al editar o repetir', () => {
  for (const coverId of ['day', 'night', 'tournament'] as const) {
    const input: EventInput = { ...event, coverId };
    assert.ok(isEventCoverId(coverId));
    assert.equal(validateEvent(input).coverId, coverId);
    assert.equal(normalizeEvent(input)?.coverId, coverId);
    assert.equal(validateEventEdit(event, input, 'Cambio de portada').visibility, 'private');
    assert.ok(expandEventSeries(input, 'weekly', 2).every(item => item.coverId === coverId && item.visibility === 'private'));
  }
  for (const coverId of ['', null, {}, 'https://example.test/photo.jpg', 'data:image/png;base64,AAAA', '../day']) {
    assert.equal(isEventCoverId(coverId), false);
    assert.equal(normalizeEvent({ ...event, coverId }), null);
    assert.throws(() => validateEvent({ ...event, coverId } as unknown as EventInput), /inválido/);
  }
});

test('filtros Hoy y Mañana usan el calendario del campo, también al cambiar la hora', () => {
  const now = Date.parse('2026-10-24T22:30:00.000Z'); // 25 octubre en Madrid.
  assert.equal(matchesEventDate({ startAt: '2026-10-25T22:00:00.000Z', timeZone: 'Europe/Madrid' }, 'today', now), true);
  assert.equal(matchesEventDate({ startAt: '2026-10-25T23:15:00.000Z', timeZone: 'Europe/Madrid' }, 'tomorrow', now), true);
  assert.equal(matchesEventDate({ startAt: '2026-10-25T01:00:00.000Z', timeZone: 'America/Los_Angeles' }, 'today', now), true);
  assert.equal(matchesEventDate({ startAt: '2026-10-25T20:00:00.000Z', timeZone: 'America/Los_Angeles' }, 'tomorrow', now), true);
});

test('Esta semana finaliza el domingo del campo y Todos conserva fechas posteriores', () => {
  const now = Date.parse('2026-10-14T12:00:00.000Z');
  assert.equal(matchesEventDate({ ...event, startAt: '2026-10-18T20:00:00.000Z' }, 'week', now), true);
  assert.equal(matchesEventDate({ ...event, startAt: '2026-10-19T12:00:00.000Z' }, 'week', now), false);
  assert.equal(matchesEventDate(event, 'all', now), true);
});
