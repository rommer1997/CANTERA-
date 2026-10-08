import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRuntime } from '../src/community/normalization.ts';
import { pilotAccountAllowed, validPilotUserIds } from '../src/community/pilotAccess.ts';

const runtime = { serviceStatus: 'pilot', mediaUploadsEnabled: false, contactEmail: 'owner@example.test', updatedAt: '2026-10-08T12:00:00.000Z', pilotUserIds: ['alpha', 'beta'] };

test('runtime piloto valida lista acotada de identidades sin correos ni habilitación multimedia', () => {
  assert.deepEqual(normalizeRuntime(runtime), runtime);
  for (const pilotUserIds of [[], ['alpha', 'alpha'], ['a', 'b', 'c', 'd', 'e', 'f'], ['a/b'], ['a b'], [''], ['a'.repeat(129)], [17], 'alpha']) {
    assert.equal(validPilotUserIds(pilotUserIds), false);
    assert.equal(normalizeRuntime({ ...runtime, pilotUserIds }).serviceStatus, 'setup');
  }
  assert.equal(normalizeRuntime({ ...runtime, mediaUploadsEnabled: true }).serviceStatus, 'setup');
  assert.equal(normalizeRuntime({ ...runtime, pilotUserIds: undefined }).serviceStatus, 'setup');
  assert.equal(normalizeRuntime({ ...runtime, serviceStatus: 'open' }).serviceStatus, 'setup');
});

test('identidad de piloto requiere UID exacto, correo verificado y sesión Google', () => {
  const config = normalizeRuntime(runtime);
  assert.equal(pilotAccountAllowed(config, { uid: 'alpha', emailVerified: true, provider: 'google.com' }), true);
  for (const identity of [null, { uid: 'Alpha', emailVerified: true, provider: 'google.com' }, { uid: 'outsider', emailVerified: true, provider: 'google.com' }, { uid: 'alpha', emailVerified: false, provider: 'google.com' }, { uid: 'alpha', emailVerified: true, provider: 'password' }]) assert.equal(pilotAccountAllowed(config, identity), false);
  for (const serviceStatus of ['setup', 'paused', 'open']) assert.equal(pilotAccountAllowed(normalizeRuntime({ ...runtime, serviceStatus, pilotUserIds: undefined }), { uid: 'alpha', emailVerified: true, provider: 'google.com' }), false);
});
