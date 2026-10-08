import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCommentRecord, normalizeDemoData, normalizeEvent, normalizeHiddenPostIds, normalizeLike, normalizePost, normalizeProfile, normalizeReport, normalizeVerification } from '../src/community/normalization.ts';

const createdAt = '2026-10-05T12:00:00.000Z';
const startAt = '2026-10-10T12:00:00.000Z';
const baseEvent = { id: 'event', ownerId: 'alice', ownerName: 'Alice', title: 'Partido', type: 'match', format: '7', level: 'amateur', city: 'Madrid', country: 'España', timeZone: 'Europe/Madrid', venue: 'Campo municipal', startAt, startAtMs: Date.parse(startAt), capacity: 4, entry: 'players', description: '', status: 'open', tournamentFormat: 'league', participants: { alice: 'Alice', bob: 'Bob' }, fixtures: [], createdAt };
const basePost = { id: 'post', authorId: 'alice', authorName: 'Alice', kind: 'achievement', title: 'Mi primer gol', text: 'Lo hicimos juntos.', mediaUrl: '', mediaPath: '', createdAt, eventId: '' };
const baseProfile = { id: 'alice', name: 'Alice', bio: '', city: '', country: '', position: '', team: '', level: 'amateur', adultConfirmed: false, verification: 'unverified', entityType: 'individual', createdAt, acceptedTermsVersion: '', acceptedTermsAt: '' };
const fixture = { id: 'r1-1', round: 1, homeId: 'alice', awayId: 'bob', homeScore: null, awayScore: null };

test('eventos normales y calendarios con pases libres se conservan', () => {
  assert.equal(normalizeEvent(baseEvent, 'event')?.title, 'Partido');
  assert.equal(normalizeEvent({ ...baseEvent, status: 'closed', fixtures: [{ ...fixture, homeScore: 2, awayScore: 1 }] })?.fixtures[0].homeScore, 2);
  assert.equal(normalizeEvent({ ...baseEvent, tournamentFormat: 'knockout', fixtures: [{ ...fixture, awayId: '' }] })?.fixtures.length, 1);
});

test('timezone inexistente, fecha inválida, milliseconds contradictorios y nombres estructurados se excluyen', () => {
  for (const changes of [{ timeZone: 'Mars/Olympus' }, { startAt: 'invalid' }, { startAt: '2026-02-30T12:00:00.000Z' }, { startAtMs: Date.parse(startAt) + 1 }, { participants: { alice: { name: 'Alice' } } }, { capacity: 65 }, { type: 'tournament', capacity: 33 }, { id: 'different' }]) {
    assert.equal(normalizeEvent({ ...baseEvent, ...changes }, 'event'), null);
  }
  assert.equal(normalizeEvent({ ...baseEvent, participants: JSON.parse('{"__proto__":"Player"}') }), null);
});

test('fixtures corruptos no llegan a la clasificación ni invalidan parcialmente un cuadro', () => {
  for (const fixtures of [[null], [{ ...fixture, homeId: 'missing' }], [{ ...fixture, homeScore: '2', awayScore: 1 }], [{ ...fixture, homeScore: 2, awayScore: null }], [{ ...fixture, homeScore: -1, awayScore: 0 }], [fixture, fixture], [{ ...fixture, homeId: 'alice', awayId: 'alice' }], [{ ...fixture, round: 0 }], Array(497).fill(fixture)]) {
    assert.equal(normalizeEvent({ ...baseEvent, fixtures }), null);
  }
  assert.equal(normalizeEvent({ ...baseEvent, tournamentFormat: 'knockout', fixtures: [{ ...fixture, homeScore: 2, awayScore: 2 }] }), null);
});

test('perfiles se reconstruyen sin campos privados ni privilegios extras; ID de documento manda', () => {
  const result = normalizeProfile({ ...baseProfile, email: 'private@example.test', admin: true, role: 'ADMIN' }, 'alice');
  assert.equal(result?.name, 'Alice');
  assert.ok(result && !('email' in result) && !('admin' in result) && !('role' in result));
  assert.equal(normalizeProfile({ ...baseProfile, adultConfirmed: 'true' }), null);
  assert.equal(normalizeProfile({ ...baseProfile, verification: 'admin' }), null);
  assert.equal(normalizeProfile(baseProfile, 'bob'), null);
});

test('URL de medio público debe corresponder a su ruta propia; URLs activas y remotas se rechazan', () => {
  const photo = { ...basePost, kind: 'photo', title: '', mediaPath: 'community/alice/post.jpg', mediaUrl: 'https://firebasestorage.googleapis.com/v0/b/test/o/community%2Falice%2Fpost.jpg?alt=media' };
  assert.equal(normalizePost(photo)?.kind, 'photo');
  for (const changes of [{ mediaUrl: 'javascript:alert(1)' }, { mediaUrl: 'https://tracker.example/photo.jpg' }, { mediaUrl: 'https://firebasestorage.googleapis.com/v0/b/test/o/other.jpg' }, { mediaPath: 'community/bob/post.jpg' }, { mediaPath: 'community/alice/post.svg' }, { kind: 'unknown' }, { text: {} }]) {
    assert.equal(normalizePost({ ...photo, ...changes }), null);
  }
  assert.equal(normalizePost({ ...photo, mediaPath: 'local:post', mediaUrl: '' }, undefined, 'demo')?.id, 'post');
  assert.equal(normalizePost({ ...photo, mediaPath: 'local:post', mediaUrl: '' }, undefined, 'cloud'), null);
});

test('interacciones rechazan claves peligrosas, autores erróneos y texto estructurado', () => {
  const comment = { id: 'comment', authorId: 'alice', authorName: 'Alice', text: 'Buen partido', createdAt, postId: 'post' };
  assert.equal(normalizeCommentRecord(comment)?.postId, 'post');
  assert.equal(normalizeCommentRecord({ ...comment, postId: '__proto__' }), null);
  assert.equal(normalizeCommentRecord({ ...comment, text: {} }), null);
  assert.equal(normalizeLike({ userId: 'alice', postId: 'post', createdAt }, 'post_alice')?.userId, 'alice');
  assert.equal(normalizeLike({ userId: 'alice', postId: 'post', createdAt }, 'post_bob'), null);
  assert.equal(normalizeLike({ userId: 'alice', postId: 'constructor', createdAt }), null);
});

test('solicitudes y denuncias inválidas no llegan al panel administrativo', () => {
  const request = { id: 'alice', userId: 'alice', name: 'Alice', organization: 'Club', evidence: 'Prueba', status: 'pending', createdAt, reviewedAt: '' };
  assert.equal(normalizeVerification(request)?.status, 'pending');
  assert.equal(normalizeVerification({ ...request, userId: 'bob' }), null);
  assert.equal(normalizeVerification({ ...request, status: 'approved' }), null);
  assert.equal(normalizeReport({ id: 'report', reporterId: 'bob', postId: 'post', reason: {}, status: 'open', createdAt }), null);
});

test('demo corrupta se recupera por registro y sin contaminación de prototipos', () => {
  const data = normalizeDemoData({ profile: baseProfile, events: [baseEvent, { ...baseEvent, timeZone: 'bad' }], posts: [basePost, { ...basePost, text: [] }], likes: JSON.parse('{"__proto__":["bad"],"post":["alice", "alice", 9]}'), comments: { post: [null] }, verifications: null, reports: {} });
  assert.equal(data.events.length, 1);
  assert.equal(data.posts.length, 1);
  assert.deepEqual(data.likes.post, ['alice']);
  assert.equal(Object.getPrototypeOf(data.likes), null);
  assert.ok(!Object.hasOwn(data.likes, '__proto__'));
  assert.equal(data.comments.post.length, 0);
  assert.deepEqual(normalizeHiddenPostIds(['post', 'post', null, '__proto__']), ['post']);
  assert.equal(normalizeDemoData(null).profile, null);
});
