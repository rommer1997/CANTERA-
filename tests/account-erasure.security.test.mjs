import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { applyErasurePlan, buildErasurePlan, collectErasureSource, erasureRoutes, ERASURE_TOKEN_GRACE_MS } from '../scripts/account-erasure.mjs';
import { accountQueryPolicies, buildAccountExport } from '../scripts/account-export.ts';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore, FieldPath, Timestamp } = require('firebase-admin/firestore');
const { collectAccountSource } = require('../scripts/export-account.cjs');
const projectId = `${process.env.GCLOUD_PROJECT || 'demo-cantera'}-account-erasure`, databaseId = 'account-erasure-test';
if (!projectId.startsWith('demo-') || !/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) throw new Error('Esta prueba requiere Firestore Emulator local y proyecto demo-.');
let app, db;
const at = Timestamp.fromDate(new Date('2026-10-08T10:00:00Z'));
const profile = id => ({ id, name: id, bio: '', city: 'Madrid', country: 'España', position: '', team: '', level: 'amateur', adultConfirmed: true, verification: 'unverified', entityType: 'individual', createdAt: at, acceptedTermsVersion: '2026-10-08', acceptedTermsAt: at });
before(async () => { app = initializeApp({ projectId }, 'account-erasure-test'); db = getFirestore(app, databaseId); });
after(async () => { if (app) await deleteApp(app); });

test('supresión sobre esquema y transacciones Firestore reales: preserva texto de bob, lo exporta y su propia baja elimina el archivo', async () => {
  const pair = 'alice:bob', ownMessageId = '0123456789abcdefghij', otherMessageId = '9876543210abcdefghij';
  const identities = new Map(['alice', 'bob'].map(uid => [uid, { uid, email: `${uid}@example.invalid`, metadata: { creationTime: '2025-01-01T00:00:00Z' }, providerData: [], customClaims: {}, disabled: false }]));
  let now = Date.parse('2026-10-13T10:00:00Z');
  const auth = {
    getUser: async uid => { if (!identities.has(uid)) throw Object.assign(new Error('not-found'), { code: 'auth/user-not-found' }); return structuredClone(identities.get(uid)); },
    updateUser: async (uid, patch) => { identities.set(uid, { ...identities.get(uid), ...patch }); },
    revokeRefreshTokens: async uid => { identities.set(uid, { ...identities.get(uid), tokensValidAfterTime: new Date(now).toISOString() }); },
    deleteUser: async uid => { identities.delete(uid); },
  };
  const event = { id: 'history', ownerId: 'bob', ownerName: 'Bob', title: 'Torneo de prueba', type: 'tournament', format: '7', level: 'amateur', city: 'Madrid', country: 'España', timeZone: 'Europe/Madrid', venue: 'Campo de prueba', startAt: '2026-10-07T10:00:00Z', startAtMs: Date.parse('2026-10-07T10:00:00Z'), capacity: 4, entry: 'players', description: '', status: 'completed', tournamentFormat: 'league', participants: { alice: 'Alice', bob: 'Bob' }, participantIds: ['alice', 'bob'], fixtures: [], fixtureIds: ['game'], rsvps: { alice: 'yes', bob: 'yes' }, waitlist: {}, waitlistOrder: [], createdAt: at };
  const documents = {
    'communityConfiguration/runtime': { serviceStatus: 'paused', mediaUploadsEnabled: false, contactEmail: '', updatedAt: at },
    'communityProfiles/alice': profile('alice'), 'communityProfiles/bob': profile('bob'),
    'communityEvents/history': event,
    'communityFixtures/history_game': { id: 'game', eventId: 'history', ownerId: 'bob', round: 1, homeId: 'alice', awayId: 'bob', homeScore: 2, awayScore: 1, kickoffAt: '', timeZone: '', venue: '', createdAt: at, updatedAt: at },
    'communityEventChanges/history_1': { id: 'history_1', eventId: 'history', ownerId: 'bob', revision: 1, summary: 'Horario confirmado', title: event.title, createdAt: at, audienceIds: ['alice', 'bob'] },
    'communityFollows/bob_alice': { followerId: 'bob', followingId: 'alice', createdAt: at },
    'communityBlocks/bob_alice': { ownerId: 'bob', blockedId: 'alice', createdAt: at },
    'communityPosts/post': { id: 'post', authorId: 'alice', authorName: 'Alice', kind: 'achievement', text: 'Mi texto retirado', title: '', mediaUrl: '', mediaPath: '', createdAt: at, eventId: '' },
    'communityComments/comment': { id: 'comment', postId: 'post', authorId: 'bob', authorName: 'Bob', text: 'Mi comentario se conserva', createdAt: at },
    [`communityConversations/${pair}`]: { id: pair, participantIds: ['alice', 'bob'], createdAt: at },
    [`communityConversations/${pair}/messages/${ownMessageId}`]: { id: ownMessageId, senderId: 'alice', text: 'Mi mensaje retirado', createdAt: at },
    [`communityConversations/${pair}/messages/${otherMessageId}`]: { id: otherMessageId, senderId: 'bob', text: 'Mi mensaje privado debe conservarse', createdAt: at },
  };
  await Promise.all(Object.entries(documents).map(([path, data]) => db.doc(path).set(data)));
  const collect = (uid, routes = {}) => collectErasureSource({ db, auth, uid, projectId, databaseId, FieldPath, collectAccountSource, policies: accountQueryPolicies, routes });
  const erase = async uid => {
    const source = await collect(uid), plan = buildErasurePlan(source); assert.deepEqual(plan.blockers, []);
    let journal; const collectFresh = () => collect(uid, erasureRoutes(plan));
    const run = () => applyErasurePlan({ db, auth, plan, collectFresh, journal, saveJournal: async next => { journal = structuredClone(next); }, maxBatches: 1, batchSize: 2, now: () => now });
    assert.equal((await run()).phase, 'waiting-token-expiry'); now += ERASURE_TOKEN_GRACE_MS;
    let result; for (let index = 0; index < 40; index++) { result = await run(); if (result.completeKnownScope) break; }
    assert.equal(result?.completeKnownScope, true); return plan;
  };
  const alicePlan = await erase('alice'); assert.equal(identities.has('alice'), false);
  const archivePath = alicePlan.operations.find(operation => operation.kind === 'archive-conversation').targetPath;
  assert.match(archivePath, /^communityConversations\/archive_[a-f0-9]{32}$/);
  assert.equal((await db.doc(`${archivePath}/messages/${otherMessageId}`).get()).data().text, 'Mi mensaje privado debe conservarse');
  assert.equal((await db.doc(`communityConversations/${pair}`).get()).exists, false);
  assert.equal((await db.collection('communityConversations').doc(pair).collection('messages').get()).size, 0);
  const fixture = (await db.doc('communityFixtures/history_game').get()).data(), history = (await db.doc('communityEvents/history').get()).data();
  assert.equal(fixture.homeScore, 2); assert.equal(history.participants[fixture.homeId], 'Cuenta eliminada');
  assert.equal((await db.doc('communityComments/comment').get()).data().text, 'Mi comentario se conserva');
  assert.deepEqual(buildErasurePlan(await collect('alice', erasureRoutes(alicePlan))).operations, []);
  const bobSource = await collect('bob'); const exported = buildAccountExport(bobSource);
  assert.equal(exported.counts.communityMessages, 1); assert.equal(exported.collections.communityMessages[0].text, 'Mi mensaje privado debe conservarse');
  assert.ok(!JSON.stringify(exported.collections.communityMessages).includes('alice'));
  await erase('bob'); assert.equal(identities.has('bob'), false);
  assert.equal((await db.doc(archivePath).get()).exists, false); assert.equal((await db.collection('communityConversations').doc(archivePath.split('/')[1]).collection('messages').get()).size, 0);
});

test('CAS de mensaje y colisión de archivo detectan cambios Firestore submilisegundo sin perder el original', async () => {
  for (const mode of ['source', 'destination']) {
    const uid = `nano_${mode}_self`, peer = `nano_${mode}_peer`, pair = [uid, peer].sort().join(':'), messageId = '0123456789abcdefghij';
    let now = Date.parse('2026-10-13T13:00:00Z');
    let identity = { uid, metadata: { creationTime: '2025-01-01T00:00:00Z' }, providerData: [], customClaims: {}, disabled: false };
    const auth = { getUser: async () => structuredClone(identity), updateUser: async (_, patch) => { identity = { ...identity, ...patch }; }, revokeRefreshTokens: async () => { identity.tokensValidAfterTime = new Date(now).toISOString(); }, deleteUser: async () => { throw new Error('Auth no debe borrarse ante una carrera'); } };
    const first = new Timestamp(1791453600, 123456000), changed = new Timestamp(1791453600, 123400000);
    assert.equal(first.toDate().toISOString(), changed.toDate().toISOString());
    const messagePath = `communityConversations/${pair}/messages/${messageId}`;
    await db.doc(`communityConversations/${pair}`).set({ id: pair, participantIds: [uid, peer].sort(), createdAt: at });
    const message = { id: messageId, senderId: peer, text: 'Texto privado intacto', createdAt: first };
    await db.doc(messagePath).set(message);
    const collect = routes => collectErasureSource({ db, auth, uid, projectId, databaseId, FieldPath, collectAccountSource, policies: accountQueryPolicies, routes });
    const plan = buildErasurePlan(await collect({})); assert.deepEqual(plan.blockers, []); const routes = erasureRoutes(plan);
    let journal; const run = () => applyErasurePlan({ db, auth, plan, collectFresh: () => collect(routes), journal, saveJournal: async next => { journal = structuredClone(next); }, now: () => now });
    assert.equal((await run()).phase, 'waiting-token-expiry'); now += ERASURE_TOKEN_GRACE_MS;
    const alteredPath = mode === 'source' ? messagePath : plan.operations.find(operation => operation.kind === 'archive-third-party-message').targetPath;
    await db.doc(alteredPath).set({ ...message, createdAt: changed });
    await assert.rejects(run, /changed|shared-reference/);
    assert.equal((await db.doc(messagePath).get()).data().text, message.text);
    assert.equal(identity.disabled, true);
    await db.recursiveDelete(db.doc(`communityConversations/${pair}`));
    if (mode === 'destination') await db.recursiveDelete(db.doc(alteredPath.split('/').slice(0, 2).join('/')));
  }
});
