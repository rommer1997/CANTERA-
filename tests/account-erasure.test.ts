import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { Timestamp } from 'firebase/firestore';
import { applyErasurePlan, assertReviewedPlan, buildErasurePlan, collectErasureSource, erasureHash, erasureReadAll, ERASURE_TOKEN_GRACE_MS } from '../scripts/account-erasure.mjs';
import { knownSharedSchema } from '../scripts/account-erasure-shared.mjs';
const require = createRequire(import.meta.url);
const cli = require('../scripts/erase-account.cjs');
const uid = 'self_with_dot', peer = 'peer', projectId = 'demo-cantera', databaseId = 'named-test';
const code = '2222333344445555', incoming = '6666777788889999';
const clone = (value: any) => JSON.parse(JSON.stringify(value));
const row = (recordPath: string, data: Record<string, unknown>) => ({ id: recordPath.split('/').at(-1)!, path: recordPath, data });

function harness(initial: Record<string, Record<string, any>> = {}, identity: any = { uid, email: 'private@example.invalid', metadata: { creationTime: '2025-01-01T00:00:00Z' }, providerData: [], customClaims: {} }) {
  const records = new Map<string, any>(Object.entries(clone(initial))), revisions = new Map<string, number>();
  const archiveIds = Object.fromEntries(Object.keys(initial).filter(recordPath => recordPath.startsWith('communityConversations/') && recordPath.split('/').length === 2 && !recordPath.split('/')[1].startsWith('archive_')).map((recordPath, index) => [recordPath.split('/')[1], `archive_${String(index + 1).padStart(32, '0')}`]));
  const anonymousIds = Object.fromEntries(Object.keys(initial).filter(recordPath => recordPath.startsWith('communityEvents/') && recordPath.split('/').length === 2).map((recordPath, index) => [recordPath.split('/')[1], `removed_${String(index + 1).padStart(32, '0')}`]));
  let time = Date.parse('2026-10-08T10:00:00.000Z'), authIdentity = identity && clone(identity), journal: any;
  const events: any[] = [], transactions: string[][] = [];
  let beforeCommit: (() => void) | undefined;
  const snapshot = (recordPath: string) => ({ id: recordPath.split('/').at(-1), ref: { path: recordPath }, exists: records.has(recordPath), data: () => clone(records.get(recordPath)) });
  const put = (recordPath: string, data: any) => { records.set(recordPath, clone(data)); revisions.set(recordPath, (revisions.get(recordPath) || 0) + 1); };
  const db: any = {
    doc: (recordPath: string) => ({ path: recordPath }),
    runTransaction: async (callback: (tx: any) => Promise<any>) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const reads = new Map<string, number>(), writes: any[] = [];
        const result = await callback({
          get: async (ref: { path: string }) => { reads.set(ref.path, revisions.get(ref.path) || 0); return snapshot(ref.path); },
          delete: (ref: { path: string }) => writes.push({ kind: 'delete', path: ref.path }),
          update: (ref: { path: string }, data: any) => writes.push({ kind: 'update', path: ref.path, data }),
          set: (ref: { path: string }, data: any) => writes.push({ kind: 'set', path: ref.path, data }),
        });
        if (beforeCommit) { const hook = beforeCommit; beforeCommit = undefined; hook(); }
        if ([...reads].some(([recordPath, revision]) => (revisions.get(recordPath) || 0) !== revision)) continue;
        for (const write of writes) {
          if (write.kind === 'delete') records.delete(write.path); else if (write.kind === 'set') records.set(write.path, clone(write.data)); else records.set(write.path, { ...records.get(write.path), ...clone(write.data) });
          revisions.set(write.path, (revisions.get(write.path) || 0) + 1); events.push(write);
        }
        transactions.push(writes.map(write => write.path));
        return result;
      }
      throw new Error('too-many-races');
    },
  };
  const auth: any = {
    getUser: async (requested: string) => { assert.equal(requested, uid); if (!authIdentity) throw Object.assign(new Error('PRIVATE_UID'), { code: 'auth/user-not-found' }); return clone(authIdentity); },
    updateUser: async (requested: string, update: any) => { assert.equal(requested, uid); authIdentity = { ...authIdentity, ...update }; events.push({ kind: 'freeze' }); },
    revokeRefreshTokens: async () => { authIdentity.tokensValidAfterTime = new Date(time).toISOString(); events.push({ kind: 'revoke' }); },
    deleteUser: async () => { events.push({ kind: 'delete-auth', remaining: [...records.keys()] }); authIdentity = null; },
  };
  const policies: Record<string, string> = { communityPosts: 'authorId', communityComments: 'authorId', communityLikes: 'userId', communityFollows: 'followerId', communityBlocks: 'ownerId', communityRightsRequests: 'userId', communityEventNotices: 'recipientId', communityVerifications: 'userId', communityReports: 'reporterId', communityTeamMembers: 'userId', communityTeamJoinRequests: 'userId', communityTeamInvites: 'createdBy', communityEventChanges: 'ownerId', communityEventPromotions: 'authorId', communityEventDeliveries: 'actorId' };
  const rows = () => [...records].map(([recordPath, data]) => row(recordPath, clone(data)));
  const source = () => {
    const all = rows(), collections: any = {};
    for (const [name, field] of Object.entries(policies)) collections[name] = all.filter(record => record.path.split('/').length === 2 && record.path.split('/')[0] === name && record.data[field] === uid);
    collections.communityInvitations = all.filter(record => record.path.startsWith('communityInvitations/') && (record.data.ownerId === uid || record.data.usedBy === uid));
    collections.communityConnections = all.filter(record => record.path.startsWith(`communityConnections/${uid}/members/`) && record.data.ownerId === uid);
    collections.communityEventAdmissions = all.filter(record => record.path.startsWith('communityEventAdmissions/') && record.path.split('/').length === 4 && record.data.userId === uid);
    const direct = (name: string) => all.find(record => record.path === `${name}/${uid}`) || null;
    const ownPosts = new Set(collections.communityPosts.map((record: any) => record.id));
    return { uid, projectId, databaseId, auth: authIdentity && clone(authIdentity), runtime: all.find(record => record.path === 'communityConfiguration/runtime') || null, privateProfile: direct('communityProfiles'), publicProfile: direct('communityPublicProfiles'), moderation: direct('communityAccountModeration'), legacyProfile: direct('users'),
      collections, legacyLikes: all.filter(record => record.path.startsWith(`users/${uid}/likes/`)),
      events: all.filter(record => record.path.startsWith('communityEvents/') && (record.data.ownerId === uid || (record.data.participantIds as any[])?.includes(uid) || Object.hasOwn((record.data.participants || {}) as object, uid) || Object.hasOwn((record.data.waitlist || {}) as object, uid) || Object.hasOwn((record.data.rsvps || {}) as object, uid) || all.some(reference => reference.data.eventId === record.id && ([reference.data.ownerId, reference.data.homeId, reference.data.awayId, reference.data.recipientId].includes(uid) || Array.isArray(reference.data.audienceIds) && reference.data.audienceIds.includes(uid))))),
      teams: all.filter(record => record.path.startsWith('communityTeams/') && record.data.ownerId === uid),
      erasure: { ownConnections: all.filter(record => record.path.startsWith(`communityConnections/${uid}/members/`)), mirrors: all.filter(record => record.path.startsWith('communityConnections/') && record.data.peerId === uid),
        incomingFollows: all.filter(record => record.path.startsWith('communityFollows/') && record.data.followingId === uid), incomingBlocks: all.filter(record => record.path.startsWith('communityBlocks/') && record.data.blockedId === uid),
        postInteractions: all.filter(record => ['communityLikes', 'communityComments'].includes(record.path.split('/')[0]) && ownPosts.has(record.data.postId)),
        fixtureReferences: all.filter(record => record.path.startsWith('communityFixtures/') && (record.data.homeId === uid || record.data.awayId === uid)),
        conversations: all.filter(record => record.path.startsWith('communityConversations/') && record.path.split('/').length === 2 && (record.data.participantIds as any[])?.includes(uid)),
        messages: all.filter(record => record.path.startsWith('communityConversations/') && record.path.split('/').length === 4 && record.data.senderId === uid),
        conversationMessages: all.filter(record => record.path.startsWith('communityConversations/') && record.path.split('/').length === 4 && (Object.hasOwn(archiveIds, record.path.split('/')[1]) || all.some(parent => parent.path === record.path.split('/').slice(0, 2).join('/') && Array.isArray(parent.data.participantIds) && parent.data.participantIds.includes(uid)))),
        sharedCoordination: all.filter(record => ['communityEventChanges', 'communityEventPromotions', 'communityEventDeliveries'].includes(record.path.split('/')[0]) && (Array.isArray(record.data.audienceIds) && record.data.audienceIds.includes(uid) || record.data.recipientId === uid)),
        archiveIds, anonymousIds, unknownCollections: [], unknownSubcollections: [] } };
  };
  const run = async (plan: any, options: any = {}) => applyErasurePlan({ db, auth, plan, collectFresh: async () => source(), journal, saveJournal: async (next: any) => { journal = clone(next); }, now: () => time, ...options });
  return { records, events, transactions, db, auth, source, run, put, advance: (ms = ERASURE_TOKEN_GRACE_MS) => { time += ms; },
    get journal() { return journal; }, get identity() { return authIdentity; }, setIdentity: (update: any) => { authIdentity = { ...authIdentity, ...update }; },
    race: (hook: () => void) => { beforeCommit = hook; } };
}

test('plan determinista privado: sólo UID/rutas/huellas; identifica bloqueos sin modificar la cuenta', () => {
  const h = harness({ [`communityProfiles/${uid}`]: { id: uid, name: 'SECRET_NAME' }, 'communityPosts/own': { authorId: uid, text: 'SECRET_POST', mediaUrl: '' } });
  const plan = buildErasurePlan(h.source());
  assert.deepEqual(buildErasurePlan(h.source()), plan);
  assert.deepEqual(plan.blockers, []); assert.equal(plan.operations.length, 2); assert.equal(h.events.length, 0);
  assert.ok(!JSON.stringify(plan).includes('SECRET')); assert.ok(!JSON.stringify(plan).includes('private@example.invalid'));
  assertReviewedPlan(plan, { uid, projectId, databaseId, confirm: plan.digest });
  const mutated = clone(plan); mutated.operations[0].before = 'a'.repeat(64);
  assert.throws(() => assertReviewedPlan(mutated, { uid, projectId, databaseId, confirm: plan.digest }), /integrity/);
  for (const option of [{ uid: 'other' }, { projectId: 'other' }, { databaseId: '(default)' }, { confirm: 'a'.repeat(64) }]) assert.throws(() => assertReviewedPlan(plan, { uid, projectId, databaseId, confirm: plan.digest, ...option }));
});

test('huellas CAS conservan todos los nanosegundos Firestore y distinguen Timestamp de cadenas ISO', () => {
  const first = new Timestamp(1791453600, 123456000), changed = new Timestamp(1791453600, 123400000);
  assert.equal(first.toDate().toISOString(), changed.toDate().toISOString());
  assert.notEqual(erasureHash({ createdAt: first }), erasureHash({ createdAt: changed }));
  assert.notEqual(erasureHash({ createdAt: first }), erasureHash({ createdAt: first.toDate().toISOString() }));
  assert.equal(erasureHash({ createdAt: first }), erasureHash({ createdAt: new Timestamp(first.seconds, first.nanoseconds) }));
});

test('administración, propietarios, medios y esquemas compartidos desconocidos siguen bloqueando antes de escribir', async () => {
  const h = harness({
    'communityEvents/owned': { ownerId: uid, participants: { other: 'Otra persona' } }, 'communityTeams/owned': { ownerId: uid },
    'communityFixtures/final': { homeId: uid, awayId: peer }, 'communityPosts/media': { authorId: uid, mediaPath: 'uploads/private' },
    'communityConversations/shared': { participantIds: [uid, peer] }, 'communityFollows/inbound': { followerId: peer, followingId: uid }, 'communityBlocks/inbound': { ownerId: peer, blockedId: uid },
  });
  h.setIdentity({ customClaims: { admin: true } });
  const source = h.source(); source.erasure.unknownCollections = ['futureSchema'];
  const plan = buildErasurePlan(source);
  for (const blocker of ['administrator-transfer-required', 'team-ownership-transfer-or-closure-required', 'media-removal-review', 'unknown-shared-schema-review', 'unknown-root-schema-review']) assert.ok(plan.blockers.includes(blocker));
  await assert.rejects(() => h.run(plan), /plan-blocked/); assert.deepEqual(h.events, []);
});

test('congela y revoca primero, espera tokens, retira pares atómicamente y elimina Auth al final', async () => {
  const h = harness({
    'communityConfiguration/runtime': { serviceStatus: 'paused' }, [`communityProfiles/${uid}`]: { id: uid, name: 'Yo' }, [`communityPublicProfiles/${uid}`]: { id: uid, name: 'Yo' },
    'communityPosts/own': { authorId: uid, text: 'Mi texto' }, 'communityPosts/other': { authorId: peer, text: 'Ajeno' },
    'communityComments/own': { authorId: uid, postId: 'other', text: 'Mi comentario' }, 'communityLikes/own': { userId: uid, postId: 'other' },
    [`communityInvitations/${code}`]: { ownerId: uid, kind: 'connection', status: 'active', usedBy: '', usedAt: '' },
    [`communityInvitations/${incoming}`]: { ownerId: peer, kind: 'connection', status: 'used', usedBy: uid, usedAt: '2026-10-08T00:00:00Z' },
    [`communityConnections/${uid}/members/${peer}`]: { ownerId: uid, peerId: peer, inviteId: incoming },
    [`communityConnections/${peer}/members/${uid}`]: { ownerId: peer, peerId: uid, inviteId: incoming },
    [`communityEventAdmissions/old/members/${uid}`]: { eventId: 'old', userId: uid, inviteId: incoming },
    'communityConversations/orphan/messages/own': { senderId: uid, text: 'Sólo propio' }, 'communityConversations/orphan/messages/other': { senderId: peer, text: 'Ajeno' },
    [`users/${uid}`]: { uid }, [`users/${uid}/likes/legacy`]: { timestamp: '2025-01-01' },
  });
  const plan = buildErasurePlan(h.source()); assert.deepEqual(plan.blockers, []);
  const first = await h.run(plan); assert.equal(first.phase, 'waiting-token-expiry'); assert.equal(h.events.length, 2); assert.equal(h.events[0].kind, 'freeze'); assert.equal(h.events[1].kind, 'revoke');
  assert.equal(h.journal.cursor, 0); assert.equal(h.records.size, 16);
  h.advance();
  let result;
  for (let index = 0; index < 30; index++) { result = await h.run(plan, { maxBatches: 1, batchSize: 1 }); if (result.completeKnownScope) break; }
  assert.equal(result?.phase, 'completed'); assert.equal(h.identity, null);
  assert.equal(h.records.get('communityPosts/other')?.text, 'Ajeno');
  assert.equal(h.records.get('communityConversations/orphan/messages/other')?.text, 'Ajeno');
  assert.deepEqual(h.records.get(`communityInvitations/${incoming}`), { ownerId: peer, kind: 'connection', status: 'used', usedBy: '', usedAt: '' });
  const pairTransactions = h.transactions.filter(batch => batch.some(recordPath => recordPath.startsWith('communityConnections/')));
  assert.equal(pairTransactions.length, 1); assert.equal(pairTransactions[0].length, 2);
  assert.equal(h.events.at(-1).kind, 'delete-auth');
  assert.ok(!h.events.at(-1).remaining.some((recordPath: string) => recordPath.includes(uid)));
  assert.equal((await h.run(plan)).phase, 'completed'); // idempotent receipt verification
});

test('diario perdido después del commit permite replay de borrados y redacción sin tocar documentos ajenos', async () => {
  const h = harness({ 'communityPosts/own': { authorId: uid }, [`communityInvitations/${incoming}`]: { ownerId: peer, status: 'used', usedBy: uid, usedAt: 'old' } });
  const plan = buildErasurePlan(h.source()); await h.run(plan); h.advance();
  const frozen = clone(h.journal);
  await assert.rejects(() => h.run(plan, { maxBatches: 1, saveJournal: async () => { throw new Error('local-disk-failed'); } }), /disk/);
  assert.equal(h.records.size, 1); // transaction committed, local cursor did not
  const result = await h.run(plan, { journal: frozen });
  assert.equal(result.phase, 'completed'); assert.equal(h.records.get(`communityInvitations/${incoming}`)?.ownerId, peer);
});

test('espejo huérfano se descubre y retira con su extremo ausente; el presupuesto no separa el par', async () => {
  const h = harness({ [`communityConnections/${peer}/members/${uid}`]: { ownerId: peer, peerId: uid, inviteId: code } });
  const plan = buildErasurePlan(h.source()); assert.equal(plan.operations.length, 2);
  assert.ok(plan.operations.some(operation => operation.kind === 'delete-missing-mirror'));
  await h.run(plan); h.advance(); const partial = await h.run(plan, { batchSize: 1, maxBatches: 1 });
  assert.equal(partial.phase, 'bounded-verification'); assert.equal(h.records.size, 0); assert.equal(h.journal.cursor, 2);
  assert.equal((await h.run(plan)).phase, 'completed');
});

test('carrera de modificación transaccional aborta todo el lote y conserva Auth', async () => {
  const h = harness({ 'communityPosts/a': { authorId: uid, text: 'Original' }, 'communityPosts/b': { authorId: uid, text: 'Original' } });
  const plan = buildErasurePlan(h.source()); await h.run(plan); h.advance();
  // The first transaction is the runtime preflight. Schedule the conflicting
  // write immediately before the actual deletion transaction commits.
  const original = h.db.runTransaction; let calls = 0;
  h.db.runTransaction = async (callback: any) => { calls++; if (calls === 2) h.race(() => h.put('communityPosts/b', { authorId: peer, text: 'Transferido' })); return original(callback); };
  await assert.rejects(() => h.run(plan), /transaction-document-changed/);
  assert.equal(h.records.size, 2); assert.equal(h.identity?.disabled, true); assert.ok(!h.events.some(event => event.kind === 'delete-auth'));
});

test('ventana abierta, perfil cambiado, referencias nuevas o administrador promovido detienen la ejecución', async () => {
  for (const scenario of ['open', 'profile', 'new-post', 'admin', 'unfreeze']) {
    const h = harness({ [`communityProfiles/${uid}`]: { id: uid, name: 'Original' } });
    const plan = buildErasurePlan(h.source()); await h.run(plan); h.advance();
    if (scenario === 'open') h.put('communityConfiguration/runtime', { serviceStatus: 'open' });
    if (scenario === 'profile') h.put(`communityProfiles/${uid}`, { id: uid, name: 'Nuevo' });
    if (scenario === 'new-post') h.put('communityPosts/new', { authorId: uid });
    if (scenario === 'admin') h.setIdentity({ customClaims: { admin: true } });
    if (scenario === 'unfreeze') h.setIdentity({ disabled: false });
    await assert.rejects(() => h.run(plan)); assert.ok(h.records.has(`communityProfiles/${uid}`)); assert.ok(h.identity);
  }
});

test('la verificación final detecta residuos creados después de la consulta y no elimina Auth', async () => {
  const h = harness({ [`communityConnections/${peer}/members/${uid}`]: { ownerId: peer, peerId: uid, inviteId: code } });
  const plan = buildErasurePlan(h.source()); await h.run(plan); h.advance(); let reads = 0;
  await assert.rejects(() => h.run(plan, { collectFresh: async () => {
    reads++; const source = h.source();
    if (reads === 2) h.put(`communityConnections/${peer}/members/${uid}`, { ownerId: peer, peerId: uid, inviteId: incoming });
    return source;
  } }), /residue-requires-review/);
  assert.ok(h.identity); assert.ok(!h.events.some(event => event.kind === 'delete-auth'));
});

test('Auth borrado seguido de fallo local se confirma al reanudar sin repetir una supresión ajena', async () => {
  const h = harness({ 'communityPosts/own': { authorId: uid } });
  const plan = buildErasurePlan(h.source()); await h.run(plan); h.advance();
  let checkpoint: any;
  await assert.rejects(() => h.run(plan, { saveJournal: async (next: any) => {
    if (next.phase === 'completed') throw new Error('disk-after-auth');
    checkpoint = clone(next);
  } }), /disk-after-auth/);
  assert.equal(h.identity, null); assert.equal(checkpoint.phase, 'auth-pending');
  assert.equal((await h.run(plan, { journal: checkpoint })).phase, 'completed');
  assert.equal(h.events.filter(event => event.kind === 'delete-auth').length, 1);
});

test('plan forjado no admite padre de otra cuenta, otro mensaje, otro campo de propiedad ni falta de espejo', async () => {
  const h = harness({ 'communityPosts/other': { authorId: peer }, 'communityConversations/shared/messages/other': { senderId: peer } });
  const base = buildErasurePlan(h.source());
  for (const recordPath of [`communityProfiles/${peer}`, 'communityEvents/shared', 'unknown/private']) {
    const plan = { ...base, operations: [{ path: recordPath, kind: 'delete', before: 'a'.repeat(64) }] };
    const { digest: _, ...payload } = plan; plan.digest = erasureHash(payload);
    assert.throws(() => assertReviewedPlan(plan, { uid, projectId, databaseId, confirm: plan.digest }), /outside/);
  }
  const own = harness({ [`communityConnections/${uid}/members/${peer}`]: { ownerId: uid, peerId: peer } });
  const paired = buildErasurePlan(own.source()); paired.operations.pop();
  const { digest: _, ...payload } = paired; paired.digest = erasureHash(payload);
  assert.throws(() => assertReviewedPlan(paired, { uid, projectId, databaseId, confirm: paired.digest }), /atomic/);
  for (const recordPath of ['communityPosts/other', 'communityConversations/shared/messages/other']) {
    const plan = { ...base, operations: [{ path: recordPath, kind: 'delete', before: erasureHash(h.records.get(recordPath)) }] };
    const { digest: _, ...value } = plan; plan.digest = erasureHash(value);
    const journal = { format: 2, planDigest: plan.digest, phase: 'deleting', cursor: 0, verificationCursor: 0, frozenAt: 0, revokedAt: 0, deleted: 0, redacted: 0 };
    h.setIdentity({ disabled: true, tokensValidAfterTime: new Date(0).toISOString() });
    await assert.rejects(() => h.run(plan, { journal }), /outside-account-scope/);
    assert.ok(h.records.has(recordPath));
  }
});

test('paginación conserva más de cien registros y no descarga una colección sin el filtro recibido', async () => {
  const documents = Array.from({ length: 205 }, (_, index) => ({ id: String(index).padStart(3, '0'), ref: { path: `communityPosts/${String(index).padStart(3, '0')}` }, data: () => ({ authorId: uid }) }));
  const reads: number[] = [];
  const query = (cursor = ''): any => ({ orderBy: () => query(cursor), startAfter: (document: any) => query(document.id), limit: (maximum: number) => ({ get: async () => { reads.push(maximum); return { docs: documents.filter(document => !cursor || document.id > cursor).slice(0, maximum) }; } }) });
  const result = await erasureReadAll(query(), '__name__'); assert.equal(result.length, 205); assert.deepEqual(reads, [100, 100, 100]);
});

test('presupuesto global deduplicado aborta varios subárboles aunque cada consulta quede por debajo de 5000', async () => {
  const pairs = ['first', 'second'].map(peerId => [peerId, uid].sort().join(':'));
  const data = pairs.flatMap((pair, index) => [row(`communityConversations/${pair}`, { id: pair, participantIds: pair.split(':'), createdAt: 'old' }),
    ...Array.from({ length: 2600 }, (_, message) => row(`communityConversations/${pair}/messages/${String(message).padStart(20, '0')}`, { id: String(message).padStart(20, '0'), senderId: index ? 'second' : 'first', text: 'Texto privado', createdAt: 'old' }))]);
  let fetched = 0;
  const reference = (recordPath: string): any => ({ path: recordPath, id: recordPath.split('/').at(-1), collection: (name: string) => query(`${recordPath}/${name}`), listCollections: async () => data.some(record => record.path.startsWith(`${recordPath}/`)) ? [{ id: 'messages' }] : [], get: async () => ({ ref: reference(recordPath), id: recordPath.split('/').at(-1), exists: data.some(record => record.path === recordPath), data: () => data.find(record => record.path === recordPath)?.data }) });
  const query = (scope: string, conditions: any[] = [], after = '', maximum = Infinity): any => ({
    doc: (id: string) => reference(`${scope}/${id}`), where: (field: string, op: string, value: string) => query(scope, [...conditions, { field, op, value }], after, maximum),
    orderBy: () => query(scope, conditions, after, maximum), startAfter: (document: any) => query(scope, conditions, document.ref.path, maximum), limit: (next: number) => query(scope, conditions, after, next),
    get: async () => {
      const documents = data.filter(record => scope.startsWith('**/') ? record.path.split('/').at(-2) === scope.slice(3) : record.path.slice(0, record.path.lastIndexOf('/')) === scope)
        .filter(record => conditions.every(({ field, op, value }) => op === '==' ? record.data[field] === value : Array.isArray(record.data[field]) && (record.data[field] as any[]).includes(value)))
        .sort((a, b) => a.path.localeCompare(b.path)).filter(record => !after || record.path > after).slice(0, maximum);
      fetched += documents.length;
      return { docs: documents.map(record => ({ id: record.id, ref: reference(record.path), data: () => record.data })) };
    },
  });
  const db: any = { collection: query, collectionGroup: (name: string) => query(`**/${name}`), doc: reference, listCollections: async () => [{ id: 'communityConversations' }] };
  await assert.rejects(() => collectErasureSource({ db, auth: {}, uid, projectId, databaseId, FieldPath: { documentId: () => '__name__' }, policies: {}, collectAccountSource: async () => ({ uid, projectId, databaseId, collections: {}, events: [], teams: [], legacyLikes: [] }) }), /review-volume-exceeded/);
  assert.ok(fetched <= 5102); assert.ok(fetched < data.length);
});

test('colector detecta espejos huérfanos, filtra grupos por ruta exacta y revisa descendientes sin barrer cuentas ajenas', async () => {
  const data = [
    row(`communityConnections/${peer}/members/${uid}`, { ownerId: peer, peerId: uid, inviteId: code }),
    row(`communityTeams/team/members/irrelevant`, { ownerId: peer, peerId: uid }),
    row('communityConversations/old/messages/own', { senderId: uid, text: 'PRIVATE_TEXT' }),
    row('communityTeams/team/messages/irrelevant', { senderId: uid, text: 'DO_NOT_ERASE' }),
    row('communityPosts/own', { authorId: uid }), row('communityPosts/own/audit/details', { anything: true }),
    row('communityComments/third-party', { authorId: peer, postId: 'own' }),
  ];
  const reads: { scope: string; conditions: any[] }[] = [];
  const children = async (recordPath: string) => [...new Set(data.filter(record => record.path.startsWith(`${recordPath}/`) && record.path.split('/').length >= recordPath.split('/').length + 2).map(record => record.path.slice(recordPath.length + 1).split('/')[0]))].map(id => ({ id }));
  const reference = (recordPath: string): any => ({ path: recordPath, id: recordPath.split('/').at(-1), collection: (name: string) => query(`${recordPath}/${name}`), listCollections: () => children(recordPath), get: async () => ({ id: recordPath.split('/').at(-1), ref: reference(recordPath), exists: data.some(record => record.path === recordPath), data: () => data.find(record => record.path === recordPath)?.data }) });
  const query = (scope: string, conditions: any[] = [], after = '', maximum = Infinity): any => ({
    doc: (id: string) => reference(`${scope}/${id}`),
    where: (field: string, op: string, value: string) => query(scope, [...conditions, { field, op, value }], after, maximum),
    orderBy: () => query(scope, conditions, after, maximum),
    startAfter: (document: any) => query(scope, conditions, document.ref.path, maximum), limit: (next: number) => query(scope, conditions, after, next),
    get: async () => {
      reads.push({ scope, conditions });
      const records = data.filter(record => scope.startsWith('**/') ? record.path.split('/').at(-2) === scope.slice(3) : record.path.slice(0, record.path.lastIndexOf('/')) === scope)
        .filter(record => conditions.every(({ field, op, value }) => op === '==' ? record.data[field] === value : Array.isArray(record.data[field]) && (record.data[field] as any[]).includes(value)))
        .sort((a, b) => a.path.localeCompare(b.path)).filter(record => !after || record.path > after).slice(0, maximum);
      return { docs: records.map(record => ({ id: record.id, ref: reference(record.path), data: () => record.data })) };
    },
  });
  const db: any = { collection: query, collectionGroup: (name: string) => query(`**/${name}`), doc: reference, listCollections: async () => [...new Set(data.map(record => record.path.split('/')[0]))].map(id => ({ id })) };
  const source = await collectErasureSource({ db, auth: {}, uid, projectId, databaseId, FieldPath: { documentId: () => '__name__' }, policies: {}, collectAccountSource: async () => ({ uid, projectId, databaseId, auth: null, collections: { communityPosts: [data.find(record => record.path === 'communityPosts/own')] }, teams: [], events: [], legacyLikes: [] }) });
  assert.equal(source.erasure.mirrors.length, 1); assert.equal(source.erasure.messages.length, 1);
  assert.deepEqual(source.erasure.unknownSubcollections, ['communityPosts/own/audit']);
  const plan = buildErasurePlan(source); assert.ok(plan.operations.some(operation => operation.kind === 'redact-post-author')); assert.ok(plan.blockers.includes('unknown-owned-descendants-review'));
  assert.ok(!plan.operations.some(operation => operation.path.includes('irrelevant')));
  for (const read of reads) {
    if (read.scope === `communityConnections/${uid}/members`) assert.equal(read.conditions.length, 0);
    else { assert.equal(read.conditions.length, 1); assert.equal(read.conditions[0].value, read.scope === 'communityComments' || read.scope === 'communityLikes' ? 'own' : uid); }
  }
  assert.ok(reads.some(read => read.scope === '**/members' && read.conditions[0].field === 'peerId'));
  const indexFailure = Object.assign(new Error('PRIVATE_INDEX_URL'), { code: 9 });
  db.collectionGroup = () => ({ where: () => ({ orderBy: () => ({ limit: () => ({ get: async () => { throw indexFailure; } }) }) }) });
  await assert.rejects(() => collectErasureSource({ db, auth: {}, uid, projectId, databaseId, FieldPath: { documentId: () => '__name__' }, policies: {}, collectAccountSource: async () => ({ uid, projectId, databaseId, collections: {} }) }), error => error === indexFailure);
});

test('CLI exige plan/huella/diario y conserva archivos privados sin enlaces ni sobrescritura accidental', () => {
  assert.equal(cli.parseErasureArguments(['--uid', uid]).apply, false);
  assert.equal(cli.parseErasureArguments(['--uid', uid, '--output', 'output/private/plan.json']).apply, false);
  for (const args of [[], ['--uid', uid, '--apply'], ['--uid', uid, '--apply', '--dry-run'], ['--uid', uid, '--confirm', 'a'.repeat(64)], ['--uid', uid, '--unknown'], ['--uid', uid, '--uid', peer]]) assert.throws(() => cli.parseErasureArguments(args));
  const help = spawnSync(process.execPath, [path.resolve('scripts/erase-account.cjs'), '--help'], { encoding: 'utf8' }); assert.equal(help.status, 0); assert.match(help.stdout, /dry-run/);
  const rejected = spawnSync(process.execPath, [path.resolve('scripts/erase-account.cjs'), '--uid', 'private@example.invalid', '--apply'], { encoding: 'utf8' }); assert.equal(rejected.status, 1); assert.equal(rejected.stdout, ''); assert.ok(!rejected.stderr.includes('private@example.invalid'));
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cantera-erasure-')));
  try {
    execFileSync('git', ['init', '--quiet'], { cwd: root }); fs.writeFileSync(path.join(root, '.gitignore'), 'output/private/\n');
    fs.mkdirSync(path.join(root, 'output/private'), { recursive: true, mode: 0o700 });
    const target = path.join(root, 'output/private/run.json'); cli.replacePrivateJson(root, target, { cursor: 0 });
    assert.equal(fs.statSync(target).mode & 0o777, 0o600); assert.deepEqual(cli.readPrivateJson(root, target).value, { cursor: 0 });
    cli.replacePrivateJson(root, target, { cursor: 5 }); assert.deepEqual(cli.readPrivateJson(root, target).value, { cursor: 5 });
    fs.symlinkSync(target, path.join(root, 'output/private/symlink.json'));
    assert.throws(() => cli.readPrivateJson(root, 'output/private/symlink.json'), /unsafe/);
    assert.throws(() => cli.replacePrivateJson(root, path.join(root, 'public/leak.json'), {}));
    fs.chmodSync(target, 0o644); assert.throws(() => cli.readPrivateJson(root, target), /permissions/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

const actualEvent = (id: string, overrides: Record<string, unknown> = {}) => ({ id, ownerId: peer, ownerName: 'Organización superviviente', title: 'Encuentro privado de prueba', type: 'tournament', format: '7', level: 'amateur', city: 'Madrid', country: 'España', timeZone: 'Europe/Madrid', venue: 'Campo de prueba', startAt: '2026-10-07T10:00:00Z', startAtMs: Date.parse('2026-10-07T10:00:00Z'), capacity: 4, entry: 'players', description: 'Descripción del organizador', status: 'completed', tournamentFormat: 'league', participants: { [uid]: 'NOMBRE_SOLICITANTE', [peer]: 'Participante superviviente' }, participantIds: [uid, peer], fixtures: [], fixtureIds: ['game'], rsvps: { [uid]: 'yes', [peer]: 'yes' }, waitlist: {}, waitlistOrder: [], createdAt: '2026-10-06T10:00:00Z', ...overrides });

test('portadas genéricas válidas no bloquean la baja y se conservan al anonimizar la organización y sus cruces', async () => {
  assert.equal(knownSharedSchema('communityEvents', actualEvent('legacy')), true);
  for (const coverId of ['day', 'night', 'tournament']) {
    const eventId = `cover-${coverId}`;
    const event = actualEvent(eventId, { ownerId: uid, ownerName: 'NOMBRE_SOLICITANTE', coverId });
    assert.equal(knownSharedSchema('communityEvents', event), true);
    const h = harness({
      [`communityEvents/${eventId}`]: event,
      [`communityFixtures/${eventId}_game`]: { id: 'game', eventId, ownerId: uid, round: 1, homeId: uid, awayId: peer, homeScore: 3, awayScore: 2, createdAt: 'old' },
    });
    const plan = buildErasurePlan(h.source()); assert.deepEqual(plan.blockers, []);
    assert.ok(plan.operations.some(operation => operation.kind === 'redact-event'));
    assert.ok(plan.operations.some(operation => operation.kind === 'redact-fixture'));
    await h.run(plan); h.advance(); const result = await h.run(plan);
    assert.equal(result.phase, 'completed'); assert.equal(h.identity, null);
    const saved = h.records.get(`communityEvents/${eventId}`), fixture = h.records.get(`communityFixtures/${eventId}_game`);
    assert.equal(saved.coverId, coverId); assert.equal(saved.ownerName, 'Cuenta eliminada');
    assert.match(saved.ownerId, /^removed_[a-f0-9]{32}$/); assert.equal(fixture.ownerId, saved.ownerId);
    assert.equal(saved.participants[fixture.homeId], 'Cuenta eliminada');
    assert.equal(saved.participants[peer], 'Participante superviviente');
    assert.equal(fixture.homeScore, 3); assert.equal(fixture.awayScore, 2);
    assert.ok(!JSON.stringify([...h.records]).includes('NOMBRE_SOLICITANTE'));
  }
});

test('la baja sigue bloqueando portadas desconocidas, URL e imágenes incrustadas antes de modificar la cuenta', async () => {
  for (const coverId of ['', null, {}, [], 4, 'future-cover', '../day', 'https://example.invalid/cover.webp', 'data:image/png;base64,AAAA']) {
    const event = actualEvent('invalid-cover', { coverId });
    assert.equal(knownSharedSchema('communityEvents', event), false);
    const h = harness({ 'communityEvents/invalid-cover': event });
    const plan = buildErasurePlan(h.source());
    assert.ok(plan.blockers.includes('unknown-shared-schema-review'));
    assert.ok(!plan.operations.some(operation => operation.kind === 'redact-event'));
    await assert.rejects(() => h.run(plan), /plan-blocked/); assert.deepEqual(h.events, []);
    assert.deepEqual(h.records.get('communityEvents/invalid-cover'), event); assert.ok(h.identity);
  }
});

test('retira identidad estructurada compartida y conserva marcadores, comentarios y mensajes ajenos en archivo sin vínculo', async () => {
  const conversationId = [uid, peer].sort().join(':');
  const h = harness({
    'communityConfiguration/runtime': { serviceStatus: 'pilot', mediaUploadsEnabled: false, contactEmail: '', updatedAt: 'old', pilotUserIds: [uid, peer] },
    [`communityProfiles/${uid}`]: { id: uid, name: 'NOMBRE_SOLICITANTE' },
    'communityEvents/history': actualEvent('history', { ownerId: uid, ownerName: 'NOMBRE_SOLICITANTE', fixtures: [{ id: 'old', round: 1, homeId: uid, awayId: peer, homeScore: 3, awayScore: 2 }] }),
    'communityEvents/future': actualEvent('future', { status: 'open', startAt: '2026-11-01T10:00:00Z', fixtures: [], fixtureIds: [], waitlist: { [uid]: { name: 'NOMBRE_SOLICITANTE', joinedAt: 'old' }, another: { name: 'Siguiente', joinedAt: 'new' } }, waitlistOrder: [uid, 'another'] }),
    'communityFixtures/history_game': { id: 'game', eventId: 'history', ownerId: uid, round: 1, homeId: uid, awayId: peer, homeScore: 3, awayScore: 2, kickoffAt: '', timeZone: '', venue: '', createdAt: 'old', updatedAt: 'old' },
    'communityEventChanges/history_1': { id: 'history_1', eventId: 'history', ownerId: uid, revision: 1, summary: 'Resumen ajeno', title: 'Título ajeno', createdAt: 'old', audienceIds: [uid, peer] },
    'communityEventPromotions/proof': { eventId: 'history', authorId: uid, recipientId: peer, title: 'Título ajeno', summary: 'Has conseguido una plaza al liberarse un puesto.', createdAt: 'old' },
    'communityEventDeliveries/inbox': { eventId: 'history', actorId: uid, recipientId: peer, createdAt: 'old' },
    'communityEventDeliveries/own-inbox': { eventId: 'history', actorId: peer, recipientId: uid, createdAt: 'old' },
    'communityFollows/inbound': { followerId: peer, followingId: uid, createdAt: 'old' },
    'communityBlocks/inbound': { ownerId: peer, blockedId: uid, createdAt: 'old' },
    'communityPosts/post': { id: 'post', authorId: uid, authorName: 'NOMBRE_SOLICITANTE', kind: 'achievement', text: 'Texto retirado', title: 'Título retirado', mediaUrl: '', mediaPath: '', eventId: '', createdAt: 'old' },
    'communityComments/other': { id: 'other', authorId: peer, authorName: 'Otra persona', postId: 'post', text: 'Mi comentario permanece' },
    'communityLikes/other': { userId: peer, postId: 'post', createdAt: 'old' },
    [`communityConversations/${conversationId}`]: { id: conversationId, participantIds: [uid, peer].sort(), createdAt: 'old' },
    [`communityConversations/${conversationId}/messages/own`]: { id: 'own', senderId: uid, text: 'Retirar este texto', createdAt: 'old' },
    [`communityConversations/${conversationId}/messages/other`]: { id: 'other', senderId: peer, text: 'Mi mensaje privado permanece', createdAt: 'old' },
  });
  const plan = buildErasurePlan(h.source()); assert.deepEqual(plan.blockers, []);
  assert.ok(!JSON.stringify(plan).includes('NOMBRE_SOLICITANTE'));
  await h.run(plan); h.advance(); let result;
  for (let index = 0; index < 50; index++) { result = await h.run(plan, { maxBatches: 1, batchSize: 2 }); if (result.completeKnownScope) break; }
  assert.equal(result?.completeKnownScope, true); assert.equal(h.identity, null);
  const history = h.records.get('communityEvents/history'); const fixture = h.records.get('communityFixtures/history_game');
  assert.equal(history.ownerName, 'Cuenta eliminada'); assert.match(history.ownerId, /^removed_[a-f0-9]{32}$/);
  assert.equal(history.participants[fixture.homeId], 'Cuenta eliminada');
  assert.equal(fixture.homeScore, 3); assert.equal(fixture.awayScore, 2);
  assert.equal(h.records.get('communityComments/other').text, 'Mi comentario permanece');
  assert.equal(h.records.get('communityPosts/post').authorId, '');
  assert.deepEqual(h.records.get('communityEvents/future').waitlistOrder, ['another']);
  assert.deepEqual(h.records.get('communityConfiguration/runtime').pilotUserIds, [peer]);
  const archiveOperation = plan.operations.find(operation => operation.kind === 'archive-conversation')!;
  const archive = h.records.get(archiveOperation.targetPath);
  assert.deepEqual(archive.participantIds, [peer]); assert.equal(archive.archived, true);
  assert.equal(h.records.get(`${archiveOperation.targetPath}/messages/other`).text, 'Mi mensaje privado permanece');
  assert.ok(![...h.records].some(([recordPath, data]) => recordPath.includes(uid) || JSON.stringify(data).includes(uid) || JSON.stringify(data).includes('NOMBRE_SOLICITANTE')));
  assert.equal((await h.run(plan)).phase, 'completed');
});

test('archivo privado reanuda copia y borrado tras perder el diario, y aborta colisiones o carreras sin perder texto ajeno', async () => {
  const conversationId = [uid, peer].sort().join(':');
  const initial = { [`communityConversations/${conversationId}`]: { id: conversationId, participantIds: [uid, peer].sort(), createdAt: 'old' }, [`communityConversations/${conversationId}/messages/other`]: { id: 'other', senderId: peer, text: 'Mi texto privado', createdAt: 'old' } };
  for (const mode of ['lost-journal', 'collision', 'source-race', 'target-race']) {
    const h = harness(initial); const plan = buildErasurePlan(h.source()); await h.run(plan); h.advance(); const checkpoint = clone(h.journal);
    const archive = plan.operations.find(operation => operation.kind === 'archive-conversation')!.targetPath;
    if (mode === 'lost-journal') {
      await assert.rejects(() => h.run(plan, { maxBatches: 1, batchSize: 1, saveJournal: async () => { throw new Error('disk-after-copy'); } }), /disk-after-copy/);
      const result = await h.run(plan, { journal: checkpoint }); assert.equal(result.phase, 'completed');
      assert.equal(h.records.get(`${archive}/messages/other`).text, 'Mi texto privado');
    } else {
      if (mode === 'collision') h.put(`${archive}/messages/other`, { id: 'other', senderId: 'unrelated', text: 'Texto protegido de otra cuenta', createdAt: 'old' });
      else {
        const original = h.db.runTransaction; let calls = 0;
        h.db.runTransaction = async (callback: any) => { calls++; if (calls === 2) h.race(() => h.put(mode === 'source-race' ? `communityConversations/${conversationId}/messages/other` : `${archive}/messages/other`, { id: 'other', senderId: peer, text: 'Nuevo texto', createdAt: 'old' })); return original(callback); };
      }
      await assert.rejects(() => h.run(plan), /changed|collision/); assert.ok(h.identity);
      assert.ok(h.records.has(`communityConversations/${conversationId}/messages/other`));
    }
  }
});

test('la baja posterior del titular superviviente elimina sus mensajes y su archivo privado', async () => {
  const archive = `archive_${'f'.repeat(32)}`;
  const h = harness({ [`communityConversations/${archive}`]: { id: archive, participantIds: [uid], archived: true, createdAt: 'old' }, [`communityConversations/${archive}/messages/own`]: { id: 'own', senderId: uid, text: 'Mi texto archivado', createdAt: 'old' } });
  const plan = buildErasurePlan(h.source()); assert.deepEqual(plan.blockers, []);
  assert.ok(plan.operations.some(operation => operation.kind === 'delete-own-archive'));
  await h.run(plan); h.advance(); assert.equal((await h.run(plan)).phase, 'completed'); assert.equal(h.records.size, 0);
});

test('organización activa, archivo de propietario ajeno y campos nuevos nunca se transforman silenciosamente', () => {
  const active = harness({ 'communityEvents/active': actualEvent('active', { ownerId: uid, status: 'open' }) });
  assert.ok(buildErasurePlan(active.source()).blockers.includes('active-event-ownership-transfer-required'));
  const futureSchema = harness({ 'communityEvents/history': actualEvent('history', { futureField: { ownerId: uid } }) });
  assert.ok(buildErasurePlan(futureSchema.source()).blockers.includes('unknown-shared-schema-review'));
  const archive = `archive_${'e'.repeat(32)}`;
  const mixed = harness({ [`communityConversations/${archive}`]: { id: archive, participantIds: [uid], archived: true, createdAt: 'old' }, [`communityConversations/${archive}/messages/foreign`]: { id: 'foreign', senderId: peer, text: 'Ajeno', createdAt: 'old' } });
  assert.ok(buildErasurePlan(mixed.source()).blockers.includes('archive-ownership-review'));
  for (const overrides of [
    { participantIds: [uid, peer, 'charlie'] }, { participantIds: [uid, uid] }, { participantIds: 'unexpected' },
    { waitlist: { charlie: { name: 'Charlie', joinedAt: 'old' } }, waitlistOrder: [] },
    { waitlist: {}, waitlistOrder: ['charlie'] }, { waitlist: {}, waitlistOrder: 'unexpected' },
  ]) {
    const inconsistent = harness({ 'communityEvents/history': actualEvent('history', overrides) });
    const plan = buildErasurePlan(inconsistent.source()); assert.ok(plan.blockers.includes('unknown-shared-schema-review'));
    assert.ok(!plan.operations.some(operation => operation.kind === 'redact-event'));
    assert.deepEqual(inconsistent.records.get('communityEvents/history'), actualEvent('history', overrides));
  }
});
