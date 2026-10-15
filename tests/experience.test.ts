import test from 'node:test';
import assert from 'node:assert/strict';
import { profileInitials, splitAgenda, profileNavigationKey } from '../src/community/experience.ts';
import type { PlayEvent } from '../src/community/types.ts';

test('agenda no cuenta pasados, cancelados ni celebrados como próximos y conserva historial', () => {
  const now = Date.parse('2026-10-15T12:00:00Z');
  const records = [
    { id: 'past', startAt: '2026-10-14T12:00:00Z', status: 'open' },
    { id: 'soon', startAt: '2026-10-16T12:00:00Z', status: 'open' },
    { id: 'later', startAt: '2026-10-17T12:00:00Z', status: 'closed' },
    { id: 'cancelled', startAt: '2026-10-18T12:00:00Z', status: 'cancelled' },
    { id: 'completed', startAt: '2026-10-13T12:00:00Z', status: 'completed' },
  ] as PlayEvent[];
  const { upcoming, history } = splitAgenda(records, now);
  assert.deepEqual(upcoming.map(e => e.id), ['soon', 'later']);
  assert.deepEqual(history.map(e => e.id), ['cancelled', 'past', 'completed']);
  assert.equal(upcoming.length + history.length, records.length);
});

test('acceso cambia de pantalla por intención, sesión y completitud conservando filtros externos', () => {
  const key = (search: string, identity = 'cloud:guest:incomplete') => profileNavigationKey('/profile', search, identity);
  assert.notEqual(key('?intent=login'), key(''));
  assert.notEqual(key(''), key('', 'cloud:alice:incomplete'));
  assert.notEqual(key('', 'cloud:alice:incomplete'), key('', 'cloud:alice:complete'));
  assert.equal(key('?intent=login&returnTo=%2Finvite%2F123'), key('?intent=login'));
  assert.equal(profileNavigationKey('/play', '?city=Madrid', 'alice'), profileNavigationKey('/play', '?city=Lima', 'alice'));
  assert.equal(profileInitials(' Rommer   Volcanes '), 'RV');
});
