import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDemoData, normalizeFollow, normalizePublicProfile } from '../src/community/normalization.ts';
const at = '2026-10-06T12:00:00.000Z';
const profile = (id: string) => ({ id, name: id, bio: '', city: '', country: '', position: '', team: '', level: 'amateur', verification: 'unverified', entityType: 'individual', createdAt: at, adultConfirmed: true, acceptedTermsVersion: '2026-10-05', acceptedTermsAt: at });

test('proyección pública reconstruye sólo campos deportivos, sin consentimiento, identidad privada ni roles', () => {
  const result = normalizePublicProfile({ ...profile('alice'), email: 'private@example.test', role: 'ADMIN' }, 'alice');
  assert.equal(result?.name, 'alice');
  for (const field of ['adultConfirmed', 'acceptedTermsVersion', 'acceptedTermsAt', 'email', 'role']) assert.equal(field in result!, false);
  assert.equal(normalizePublicProfile(result, 'alice')?.id, 'alice');
  assert.equal(normalizePublicProfile(result, 'other'), null);
});

test('seguimiento normaliza identidad de ambos extremos y rechaza auto-seguir, rutas y fechas inválidas', () => {
  const relationship = { followerId: 'alice', followingId: 'bob', createdAt: at };
  assert.deepEqual(normalizeFollow(relationship, 'alice_bob'), { id: 'alice_bob', ...relationship });
  assert.equal(normalizeFollow(relationship, 'other_bob'), null);
  assert.equal(normalizeFollow({ ...relationship, id: 'forged' }), null);
  assert.equal(normalizeFollow({ ...relationship, followingId: 'alice' }), null);
  assert.equal(normalizeFollow({ ...relationship, followingId: '../bob' }), null);
  assert.equal(normalizeFollow({ ...relationship, followingId: '__proto__' }), null);
  assert.equal(normalizeFollow({ ...relationship, createdAt: 'ayer' }), null);
});

test('version 1 anterior migra a registro de perfiles sin inventar personas ni seguimientos', () => {
  const empty = normalizeDemoData({ version: 1, profile: null });
  assert.deepEqual(empty.profiles, []); assert.deepEqual(empty.follows, []); assert.equal(empty.version, 1);
  const legacy = normalizeDemoData({ version: 1, profile: profile('alice') });
  assert.equal(legacy.profiles.length, 1); assert.equal(legacy.profiles[0].id, 'alice'); assert.deepEqual(legacy.follows, []);
});

test('registro demo conserva cuentas creadas por el usuario y aplica la edición del perfil seleccionado', () => {
  const result = normalizeDemoData({ version: 1, profile: { ...profile('alice'), name: 'Alicia' }, profiles: [profile('alice'), profile('bob'), profile('bob')] });
  assert.equal(result.profiles.length, 2); assert.equal(result.profiles.find(item => item.id === 'alice')?.name, 'Alicia');
  assert.equal(result.profiles.find(item => item.id === 'bob')?.bio, '');
});

test('seguimientos demo conservan destino desaparecido para retirarlo, sin inventar perfil y sin duplicados', () => {
  const relation = { followerId: 'alice', followingId: 'bob', createdAt: at };
  const result = normalizeDemoData({ version: 1, profile: profile('bob'), profiles: [profile('alice'), profile('bob')], follows: [relation, relation, { ...relation, followingId: 'missing' }, { ...relation, followingId: 'alice' }, { ...relation, followerId: 'missing-source' }] });
  assert.deepEqual(result.follows, [{ id: 'alice_bob', ...relation }, { id: 'alice_missing', ...relation, followingId: 'missing' }]);
  assert.equal(result.profiles.some(item => item.id === 'missing'), false);
  const inactive = normalizeDemoData({ ...result, profile: { ...profile('alice'), adultConfirmed: false, acceptedTermsVersion: '', acceptedTermsAt: '' } });
  assert.deepEqual(inactive.follows, result.follows);
  const switched = normalizeDemoData({ ...result, profile: profile('alice') });
  assert.deepEqual(switched.follows, result.follows); assert.equal(switched.profile?.id, 'alice');
});
