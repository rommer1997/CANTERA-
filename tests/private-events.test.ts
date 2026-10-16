import test from 'node:test';
import assert from 'node:assert/strict';
import { canReadEvent, eventVisibility, isPublicEvent } from '../src/community/eventPrivacy.ts';
import { expandEventSeries, validateEvent, validateEventEdit } from '../src/community/logic.ts';
import { normalizeEvent } from '../src/community/normalization.ts';
import type { PlayEvent } from '../src/community/types.ts';

const now = Date.parse('2026-10-07T00:00:00.000Z');
const event: PlayEvent = {
  id: 'event', ownerId: 'owner', ownerName: 'Organización', title: 'Partido del grupo',
  type: 'match', format: '7', level: 'amateur', city: 'Madrid', country: 'España',
  timeZone: 'Europe/Madrid', venue: 'Campo del grupo', startAt: '2026-10-10T12:00:00.000Z',
  capacity: 8, entry: 'players', description: '', status: 'open', tournamentFormat: 'league',
  participants: { player: 'Jugador', guest_local: 'Invitado sin cuenta' },
  participantIds: ['player', 'guest_local'], fixtures: [], createdAt: '2026-10-07T00:00:00.000Z',
};

test('un encuentro privado sólo se muestra a su organización y cuentas inscritas, nunca a externos o invitados sin UID', () => {
  const privateEvent = { ...event, visibility: 'private' as const, waitlist: { waiting: { name: 'En espera', joinedAt: event.createdAt } } };
  assert.equal(canReadEvent(privateEvent, 'owner'), true);
  assert.equal(canReadEvent(privateEvent, 'player'), true);
  for (const viewer of [undefined, '', 'foreign', 'waiting', 'guest_local']) assert.equal(canReadEvent(privateEvent, viewer), false);
  const removed = { ...privateEvent, participants: {}, participantIds: [] };
  assert.equal(canReadEvent(removed, 'player'), false);
});

test('normalización conserva privacidad, rechaza valores ambiguos y permite detalle de eventos públicos antiguos', () => {
  const privateEvent = normalizeEvent({ ...event, visibility: 'private' }, event.id)!;
  assert.equal(privateEvent.visibility, 'private');
  assert.equal(isPublicEvent(privateEvent), false);
  assert.equal(canReadEvent(privateEvent, 'foreign'), false);
  const legacy = normalizeEvent(event, event.id)!;
  assert.equal(eventVisibility(legacy), 'public');
  assert.equal(canReadEvent(legacy), true);
  for (const visibility of ['hidden', '', null, true, { private: true }]) assert.equal(normalizeEvent({ ...event, visibility }), null);
});

test('descubrimiento público excluye encuentros privados incluso para sus propios organizadores', () => {
  const privateEvent = normalizeEvent({ ...event, id: 'private', visibility: 'private' }, 'private')!;
  const publicEvent = normalizeEvent({ ...event, id: 'public', visibility: 'public' }, 'public')!;
  const legacy = normalizeEvent({ ...event, id: 'legacy' }, 'legacy')!;
  const readable = [privateEvent, publicEvent, legacy].filter(item => canReadEvent(item, 'owner'));
  assert.deepEqual(readable.filter(isPublicEvent).map(item => item.id), ['public', 'legacy']);
  assert.deepEqual([privateEvent, publicEvent, legacy].filter(item => canReadEvent(item, 'foreign')).map(item => item.id), ['public', 'legacy']);
});

test('creación y series fijan privacidad explícita y toda edición preserva esa decisión', () => {
  assert.equal(validateEvent(event, now).visibility, 'public');
  const privateEvent = { ...event, visibility: 'private' as const };
  assert.equal(validateEvent(privateEvent, now).visibility, 'private');
  assert.ok(expandEventSeries(privateEvent, 'weekly', 3, now).every(item => item.visibility === 'private'));
  assert.equal(validateEventEdit(privateEvent, { ...privateEvent, venue: 'Campo 2' }, 'Cambio de campo', now).visibility, 'private');
  assert.equal(validateEventEdit(event, { ...event, visibility: 'public' }, 'Actualización', now).visibility, 'public');
  assert.throws(() => validateEventEdit(privateEvent, { ...privateEvent, visibility: 'public' }, 'Publicar', now), /privacidad/);
  assert.throws(() => validateEventEdit(event, { ...event, visibility: 'private' }, 'Ocultar', now), /privacidad/);
  assert.throws(() => validateEvent({ ...event, visibility: 'hidden' as 'public' }, now), /inválido/);
});
