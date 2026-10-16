// Real SDK calls target only loopback Firebase emulators and synthetic demo data.
// The token grace clock is advanced locally in the test; never in production.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { applyErasurePlan, buildErasurePlan, collectErasureSource, erasureRoutes, ERASURE_TOKEN_GRACE_MS } from '../scripts/account-erasure.mjs';
import { accountQueryPolicies, buildAccountExport } from '../scripts/account-export.ts';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore, FieldPath, Timestamp } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { collectAccountSource } = require('../scripts/export-account.cjs');
const projectId = `${process.env.GCLOUD_PROJECT || 'demo-cantera'}-rights-auth`, databaseId = 'rights-auth-test';
function assertIsolatedTarget() {
  if (!/^demo-[a-z0-9-]+$/.test(projectId) || projectId.length > 63
    || !/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')
    || !/^127\.0\.0\.1:\d+$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST || '')) throw new Error('Sólo se permiten proyecto demo-* y Auth/Firestore Emulator en loopback.');
}
assertIsolatedTarget();
let app, db, auth;
before(() => {
  assertIsolatedTarget();
  app = initializeApp({ projectId }, 'rights-auth-integration');
  db = getFirestore(app, databaseId); auth = getAuth(app);
});
after(async () => { if (app) await deleteApp(app); });

test('API real AuthEmulator: congela, revoca, verifica gracia local y borra Auth después de retirar referencias Firestore', async () => {
  assertIsolatedTarget();
  const alice = 'rights_auth_alice', bob = 'rights_auth_bob', pair = [alice, bob].sort().join(':');
  // Provisioning and all later mutations are explicitly constrained before use.
  for (const uid of [alice, bob]) {
    assertIsolatedTarget();
    await auth.createUser({ uid, email: `${uid}@example.invalid`, emailVerified: true, password: 'Synthetic-emulator-only-2026!' });
  }
  const at = Timestamp.now();
  const profile = uid => ({ id: uid, name: uid, bio: '', city: 'Madrid', country: 'España', position: '', team: '', level: 'amateur', adultConfirmed: true, verification: 'unverified', entityType: 'individual', createdAt: at, acceptedTermsVersion: '2026-10-08', acceptedTermsAt: at });
  const ownMessageId = '0123456789abcdefghij', otherMessageId = '9876543210abcdefghij';
  const documents = {
    'communityConfiguration/runtime': { serviceStatus: 'paused', mediaUploadsEnabled: false, contactEmail: '', updatedAt: at },
    [`communityProfiles/${alice}`]: profile(alice), [`communityProfiles/${bob}`]: profile(bob),
    [`communityConversations/${pair}`]: { id: pair, participantIds: [alice, bob].sort(), createdAt: at },
    [`communityConversations/${pair}/messages/${ownMessageId}`]: { id: ownMessageId, senderId: alice, text: 'Mi texto retirado', createdAt: at },
    [`communityConversations/${pair}/messages/${otherMessageId}`]: { id: otherMessageId, senderId: bob, text: 'Mi texto privado se conserva', createdAt: at },
  };
  assertIsolatedTarget(); await Promise.all(Object.entries(documents).map(([path, value]) => db.doc(path).set(value)));
  let clock = Date.now();
  const collect = (uid, routes) => { assertIsolatedTarget(); return collectErasureSource({ db, auth, uid, projectId, databaseId, FieldPath, collectAccountSource, policies: accountQueryPolicies, routes }); };
  const erase = async uid => {
    const plan = buildErasurePlan(await collect(uid, {})); assert.deepEqual(plan.blockers, []);
    let journal; const routes = erasureRoutes(plan);
    const run = () => { assertIsolatedTarget(); return applyErasurePlan({ db, auth, plan, collectFresh: () => collect(uid, routes), journal, saveJournal: async next => { journal = structuredClone(next); }, maxBatches: 1, batchSize: 2, now: () => clock }); };
    const first = await run(); assert.equal(first.phase, 'waiting-token-expiry');
    const frozen = await auth.getUser(uid);
    assert.equal(frozen.disabled, true); assert.ok(Number.isFinite(Date.parse(frozen.tokensValidAfterTime)));
    assert.equal(journal.cursor, 0); assert.equal(journal.revokedAt, Date.parse(frozen.tokensValidAfterTime));
    assert.equal((await db.doc(`communityProfiles/${uid}`).get()).exists, true);
    assert.equal((await run()).phase, 'waiting-token-expiry');
    // Only the engine's injectable test clock advances. Auth Emulator keeps its
    // real API timestamps, which the journal must continue to match exactly.
    clock += ERASURE_TOKEN_GRACE_MS;
    let result;
    for (let index = 0; index < 30; index++) { result = await run(); if (result.completeKnownScope) break; }
    assert.equal(result?.completeKnownScope, true);
    await assert.rejects(() => auth.getUser(uid), error => error.code === 'auth/user-not-found');
    assert.deepEqual(buildErasurePlan(await collect(uid, routes)).operations, []);
    return plan;
  };
  const alicePlan = await erase(alice), archivePath = alicePlan.operations.find(operation => operation.kind === 'archive-conversation').targetPath;
  assert.equal((await db.doc(`communityConversations/${pair}`).get()).exists, false);
  const archive = (await db.doc(archivePath).get()).data();
  assert.deepEqual(archive.participantIds, [bob]); assert.equal(archive.archived, true);
  const retained = (await db.doc(`${archivePath}/messages/${otherMessageId}`).get()).data();
  assert.equal(retained.text, 'Mi texto privado se conserva'); assert.equal(retained.senderId, bob);
  const exported = buildAccountExport(await collect(bob, {}));
  assert.equal(exported.counts.communityMessages, 1);
  assert.ok(!JSON.stringify(exported.collections.communityMessages).includes(alice));
  // Start the next distinct account run at the emulator's current real time,
  // then test its own independent 65-minute grace interval.
  clock = Date.now(); await erase(bob);
  assert.equal((await db.doc(archivePath).get()).exists, false);
  assert.equal((await db.collection('communityConversations').doc(archivePath.split('/')[1]).collection('messages').get()).size, 0);
});
