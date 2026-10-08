// Operator-only, bounded erasure of the current schema. This module has no
// credentials and can be tested offline. Shared sporting history is a blocker.
import { createHash } from 'node:crypto';

export class ErasurePolicyError extends Error {
  constructor(code) { super(code); this.code = `erasure/${code}`; }
}

export const ERASURE_FORMAT = 1;
export const ERASURE_PAGE_SIZE = 100;
export const ERASURE_MAX_OPERATIONS = 5000;
export const ERASURE_TOKEN_GRACE_MS = 65 * 60 * 1000;
const directCollections = ['communityProfiles', 'communityPublicProfiles', 'communityAccountModeration', 'users'];
const personalPolicies = {
  communityPosts: 'authorId', communityComments: 'authorId', communityLikes: 'userId',
  communityFollows: 'followerId', communityBlocks: 'ownerId', communityRightsRequests: 'userId',
  communityEventNotices: 'recipientId', communityVerifications: 'userId', communityReports: 'reporterId',
  communityTeamMembers: 'userId', communityTeamJoinRequests: 'userId', communityTeamInvites: 'createdBy',
};
const knownCollections = new Set([...directCollections, ...Object.keys(personalPolicies),
  'communityConfiguration', 'communityInvitations', 'communityConnections', 'communityEventAdmissions',
  'communityEvents', 'communityFixtures', 'communityEventChanges', 'communityEventPromotions',
  'communityEventDeliveries', 'communityTeams', 'communityConversations']);

export function assertErasureUid(uid) {
  if (typeof uid !== 'string' || !uid.length || uid.length > 128 || uid !== uid.trim()
    || /[/\\\u0000-\u001f\u007f]/.test(uid) || ['.', '..', '__proto__', 'constructor', 'prototype'].includes(uid)) throw new ErasurePolicyError('invalid-uid');
}
function validId(value) { return typeof value === 'string' && value.length > 0 && value.length <= 1500 && !/[/\\\u0000-\u001f\u007f]/.test(value) && !['.', '..'].includes(value); }
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (typeof value.toDate === 'function') return JSON.stringify(value.toDate().toISOString());
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}
export const erasureHash = value => createHash('sha256').update(canonical(value)).digest('hex');
const identityHash = auth => auth ? erasureHash({ uid: auth.uid, email: auth.email || '', creationTime: auth.metadata?.creationTime || '', providers: auth.providerData || [], claims: auth.customClaims || {} }) : null;
const admin = auth => auth?.customClaims?.admin === true;
const recordPath = row => row?.path;
const snapshotRecord = document => ({ id: document.id, path: document.ref.path, data: document.data() });
const connectionKey = path => {
  const parts = path.split('/');
  return parts.length === 4 && parts[0] === 'communityConnections' && parts[2] === 'members' ? parts.filter((_, index) => index === 1 || index === 3).sort().join('\0') : null;
};
function checkedRecord(row) {
  if (!row || !validId(row.id) || typeof row.path !== 'string' || row.path.split('/').length % 2 !== 0
    || row.path.split('/').some(segment => !validId(segment)) || row.path.split('/').at(-1) !== row.id || !row.data || typeof row.data !== 'object' || Array.isArray(row.data)) throw new ErasurePolicyError('invalid-record');
  return row;
}
const dedupe = rows => [...new Map(rows.map(row => [recordPath(checkedRecord(row)), row])).values()];
export async function erasureReadAll(query, documentIdField) {
  const result = []; let cursor;
  const ordered = query.orderBy(documentIdField);
  while (true) {
    const page = await (cursor ? ordered.startAfter(cursor) : ordered).limit(ERASURE_PAGE_SIZE).get();
    if (!Array.isArray(page.docs) || page.docs.length > ERASURE_PAGE_SIZE) throw new ErasurePolicyError('invalid-page');
    result.push(...page.docs.map(snapshotRecord));
    if (result.length > ERASURE_MAX_OPERATIONS) throw new ErasurePolicyError('review-volume-exceeded');
    if (page.docs.length < ERASURE_PAGE_SIZE) return result;
    cursor = page.docs.at(-1);
  }
}

/** All queries are restricted to the UID, its exact subtree, or a reviewed post. */
export async function collectErasureSource({ db, auth, uid, projectId, databaseId, FieldPath, collectAccountSource, policies }) {
  assertErasureUid(uid);
  const source = await collectAccountSource({ db, auth, uid, projectId, databaseId, FieldPath, policies });
  const read = query => erasureReadAll(query, FieldPath.documentId());
  const extras = { ownConnections: [], mirrors: [], incomingFollows: [], incomingBlocks: [], postInteractions: [], fixtureReferences: [], conversations: [], messages: [], unknownCollections: [], unknownSubcollections: [] };
  const [ownConnections, mirrors, incomingFollows, incomingBlocks, home, away, conversations, messages, roots] = await Promise.all([
    read(db.collection('communityConnections').doc(uid).collection('members')),
    read(db.collectionGroup('members').where('peerId', '==', uid)),
    read(db.collection('communityFollows').where('followingId', '==', uid)),
    read(db.collection('communityBlocks').where('blockedId', '==', uid)),
    read(db.collection('communityFixtures').where('homeId', '==', uid)),
    read(db.collection('communityFixtures').where('awayId', '==', uid)),
    read(db.collection('communityConversations').where('participantIds', 'array-contains', uid)),
    read(db.collectionGroup('messages').where('senderId', '==', uid)),
    db.listCollections(),
  ]);
  extras.ownConnections = ownConnections;
  // Do not confuse a future unrelated "members"/"messages" group with these schemas.
  extras.mirrors = mirrors.filter(row => row.path.split('/').length === 4 && row.path.split('/')[0] === 'communityConnections' && row.path.split('/')[2] === 'members');
  extras.messages = messages.filter(row => row.path.split('/').length === 4 && row.path.split('/')[0] === 'communityConversations' && row.path.split('/')[2] === 'messages');
  Object.assign(extras, { incomingFollows, incomingBlocks, fixtureReferences: dedupe([...home, ...away]), conversations });
  extras.unknownCollections = roots.map(ref => ref.id).filter(name => !knownCollections.has(name));
  for (const row of source.collections?.communityPosts || []) {
    for (const collection of ['communityLikes', 'communityComments']) extras.postInteractions.push(...await read(db.collection(collection).where('postId', '==', row.id)));
  }
  // Firestore does not recursively delete subcollections. Unknown descendants
  // below account-owned records must be reviewed instead of silently orphaned.
  const own = [...directCollections.map(name => `${name}/${uid}`), ...Object.entries(source.collections || {}).flatMap(([name, rows]) => Object.hasOwn(personalPolicies, name) ? rows.map(row => `${name}/${row.id}`) : []),
    ...(source.legacyLikes || []).map(row => row.path), ...ownConnections.map(row => row.path), ...extras.messages.map(row => row.path),
    ...(source.collections?.communityEventAdmissions || []).map(row => row.path), ...(source.collections?.communityInvitations || []).filter(row => row.data.ownerId === uid).map(row => row.path)];
  for (const path of [...new Set(own)]) {
    const children = await db.doc(path).listCollections();
    for (const child of children) if (!(path === `users/${uid}` && child.id === 'likes')) extras.unknownSubcollections.push(`${path}/${child.id}`);
  }
  return { ...source, erasure: extras };
}

/** Plan carries paths and hashes, never text, emails, media or Auth secrets. */
export function buildErasurePlan(source) {
  assertErasureUid(source.uid);
  if (!source.projectId || !source.databaseId || source.databaseId === '(default)') throw new ErasurePolicyError('named-database-required');
  if (source.auth && source.auth.uid !== source.uid) throw new ErasurePolicyError('identity-mismatch');
  const uid = source.uid, extra = source.erasure || {}, blockers = new Set(), operations = new Map();
  const add = (row, kind = 'delete') => {
    checkedRecord(row);
    const operation = { path: row.path, kind, before: erasureHash(row.data) };
    if (operations.has(row.path) && canonical(operations.get(row.path)) !== canonical(operation)) throw new ErasurePolicyError('inconsistent-source');
    operations.set(row.path, operation);
  };
  if (admin(source.auth)) blockers.add('administrator-transfer-required');
  if ((source.events || []).length) blockers.add('event-ownership-participation-or-history-review');
  if ((source.teams || []).some(row => row.data.ownerId === uid)) blockers.add('team-ownership-transfer-or-closure-required');
  if ((extra.fixtureReferences || []).length) blockers.add('shared-results-review');
  if ((extra.conversations || []).length) blockers.add('shared-conversation-identifiers-review');
  if ((extra.incomingFollows || []).length) blockers.add('incoming-follow-records-review');
  if ((extra.incomingBlocks || []).length) blockers.add('third-party-block-records-review');
  if ((extra.unknownCollections || []).length) blockers.add('unknown-root-schema-review');
  if ((extra.unknownSubcollections || []).length) blockers.add('unknown-owned-descendants-review');
  for (const name of ['communityEventChanges', 'communityEventPromotions', 'communityEventDeliveries']) if ((source.collections?.[name] || []).length) blockers.add('shared-coordination-records-review');
  for (const [name, ownerField] of Object.entries(personalPolicies)) {
    for (const row of source.collections?.[name] || []) {
      checkedRecord(row);
      if (row.path !== `${name}/${row.id}` || row.data[ownerField] !== uid) throw new ErasurePolicyError('foreign-record');
      if (name === 'communityTeamMembers' && ['owner', 'manager'].includes(row.data.role)) blockers.add('team-management-transfer-required');
      if (name === 'communityPosts' && (row.data.mediaPath || row.data.mediaUrl)) blockers.add('media-removal-review');
      add(row);
    }
  }
  for (const row of extra.postInteractions || []) {
    checkedRecord(row);
    const name = row.path.split('/')[0], field = name === 'communityLikes' ? 'userId' : name === 'communityComments' ? 'authorId' : null;
    if (!field || row.path !== `${name}/${row.id}` || !(source.collections?.communityPosts || []).some(post => post.id === row.data.postId)) throw new ErasurePolicyError('invalid-post-interaction');
    if (row.data[field] !== uid) blockers.add('third-party-post-interactions-review');
    else add(row);
  }
  for (const row of source.collections?.communityInvitations || []) {
    checkedRecord(row);
    if (row.path !== `communityInvitations/${row.id}` || !/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{16}$/.test(row.id)) throw new ErasurePolicyError('invalid-invitation');
    if (row.data.ownerId === uid) add(row);
    else if (row.data.usedBy === uid && row.data.status === 'used') add(row, 'redact-invitation-consumer');
    else throw new ErasurePolicyError('foreign-invitation');
  }
  const connections = dedupe([...(source.collections?.communityConnections || []), ...(extra.ownConnections || []), ...(extra.mirrors || [])]);
  for (const row of connections) {
    checkedRecord(row);
    const parts = row.path.split('/'), [collection, owner, members, peer] = parts;
    if (parts.length !== 4 || collection !== 'communityConnections' || members !== 'members' || row.data.ownerId !== owner || row.data.peerId !== peer || owner === peer || owner !== uid && peer !== uid) throw new ErasurePolicyError('invalid-connection');
    add(row);
    // Read and validate both ends even if one side was already deleted before
    // planning. A same-path document with other identities must never be erased.
    const mirrorPath = `communityConnections/${peer}/members/${owner}`;
    if (!connections.some(candidate => candidate.path === mirrorPath)) operations.set(mirrorPath, { path: mirrorPath, kind: 'delete-missing-mirror', before: null });
  }
  for (const row of source.collections?.communityEventAdmissions || []) {
    checkedRecord(row); const parts = row.path.split('/');
    if (parts.length !== 4 || parts[0] !== 'communityEventAdmissions' || parts[2] !== 'members' || parts[3] !== uid || row.data.userId !== uid || row.data.eventId !== parts[1]) throw new ErasurePolicyError('invalid-admission');
    add(row);
  }
  for (const row of dedupe([...(source.collections?.communityMessages || []), ...(extra.messages || [])])) {
    checkedRecord(row); const parts = row.path.split('/');
    if (parts.length !== 4 || parts[0] !== 'communityConversations' || parts[2] !== 'messages' || row.data.senderId !== uid) throw new ErasurePolicyError('foreign-message');
    add(row);
  }
  for (const [key, name, field] of [['privateProfile', 'communityProfiles', 'id'], ['publicProfile', 'communityPublicProfiles', 'id'], ['moderation', 'communityAccountModeration', 'id'], ['legacyProfile', 'users', 'uid']]) {
    const row = source[key]; if (!row) continue;
    if (row.id !== uid || row.path !== `${name}/${uid}` || Object.hasOwn(row.data, field) && row.data[field] !== uid) throw new ErasurePolicyError('foreign-profile');
    if (name === 'communityProfiles' && (row.data.photoURL || row.data.avatarPath)) blockers.add('profile-media-review');
    add(row);
  }
  for (const row of source.legacyLikes || []) {
    checkedRecord(row);
    if (row.path !== `users/${uid}/likes/${row.id}`) throw new ErasurePolicyError('foreign-legacy-like');
    add(row);
  }
  if (operations.size > ERASURE_MAX_OPERATIONS) throw new ErasurePolicyError('review-volume-exceeded');
  const late = path => ['communityProfiles/', 'communityPublicProfiles/', 'communityAccountModeration/', 'users/'].some(prefix => path.startsWith(prefix)) && path.split('/').length === 2;
  const orderKey = path => connectionKey(path) ? `communityConnections/${connectionKey(path)}/${path}` : path;
  const value = { format: ERASURE_FORMAT, uid, projectId: source.projectId, databaseId: source.databaseId,
    identityHash: identityHash(source.auth), blockers: [...blockers].sort(),
    operations: [...operations.values()].sort((a, b) => Number(late(a.path)) - Number(late(b.path)) || orderKey(a.path).localeCompare(orderKey(b.path))),
    scope: 'known-schema-only-shared-history-and-media-require-review' };
  return { ...value, digest: erasureHash(value) };
}

export function assertReviewedPlan(plan, { uid, projectId, databaseId, confirm }) {
  assertErasureUid(uid);
  if (!plan || plan.format !== ERASURE_FORMAT || plan.uid !== uid || plan.projectId !== projectId || plan.databaseId !== databaseId
    || !/^[a-f0-9]{64}$/.test(confirm || '') || plan.digest !== confirm || !Array.isArray(plan.operations) || !Array.isArray(plan.blockers)
    || plan.operations.length > ERASURE_MAX_OPERATIONS || plan.scope !== 'known-schema-only-shared-history-and-media-require-review') throw new ErasurePolicyError('reviewed-plan-mismatch');
  const { digest, ...payload } = plan;
  if (erasureHash(payload) !== digest) throw new ErasurePolicyError('plan-integrity-failed');
  if (plan.blockers.length) throw new ErasurePolicyError('plan-blocked');
  const paths = new Set();
  for (const operation of plan.operations) {
    if (!operation || typeof operation.path !== 'string' || paths.has(operation.path)
      || !['delete', 'delete-missing-mirror', 'redact-invitation-consumer'].includes(operation.kind)
      || operation.before !== null && !/^[a-f0-9]{64}$/.test(operation.before || '')
      || operation.before === null && operation.kind !== 'delete-missing-mirror') throw new ErasurePolicyError('invalid-operation');
    paths.add(operation.path);
    assertOperationScope(operation, uid);
  }
  // Both contact halves must occupy a single contiguous group, so one bounded
  // transaction removes the relationship even when only a mirror remains.
  for (let index = 0; index < plan.operations.length; index++) {
    const operation = plan.operations[index], key = connectionKey(operation.path);
    if (!key) continue;
    const [collection, owner, members, peer] = operation.path.split('/');
    const partner = plan.operations[index + 1];
    if (!partner || partner.path !== `${collection}/${peer}/${members}/${owner}` || connectionKey(partner.path) !== key) throw new ErasurePolicyError('contact-pair-not-atomic');
    index++;
  }
  return plan;
}

function assertOperationScope(operation, uid, data) {
  const parts = operation.path.split('/');
  if (parts.some(part => !validId(part))) throw new ErasurePolicyError('invalid-operation-path');
  const [collection, id, child, childId] = parts;
  let allowed = false;
  if (parts.length === 2 && Object.hasOwn(personalPolicies, collection)) {
    allowed = operation.kind === 'delete' && (!data || data[personalPolicies[collection]] === uid);
  } else if (parts.length === 2 && directCollections.includes(collection)) {
    const identityField = collection === 'users' ? 'uid' : 'id';
    allowed = id === uid && operation.kind === 'delete' && (!data || !Object.hasOwn(data, identityField) || data[identityField] === uid);
  } else if (parts.length === 2 && collection === 'communityInvitations') {
    allowed = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{16}$/.test(id) && (operation.kind === 'delete' && (!data || data.ownerId === uid)
      || operation.kind === 'redact-invitation-consumer' && (!data || data.status === 'used' && data.usedBy === uid));
  } else if (parts.length === 4 && collection === 'communityConnections' && child === 'members') {
    assertErasureUid(id); assertErasureUid(childId);
    allowed = id !== childId && (id === uid || childId === uid) && ['delete', 'delete-missing-mirror'].includes(operation.kind)
      && (!data || data.ownerId === id && data.peerId === childId);
  } else if (parts.length === 4 && collection === 'communityEventAdmissions' && child === 'members') {
    allowed = childId === uid && operation.kind === 'delete' && (!data || data.userId === uid && data.eventId === id);
  } else if (parts.length === 4 && collection === 'communityConversations' && child === 'messages') {
    allowed = operation.kind === 'delete' && (!data || data.senderId === uid);
  } else if (parts.length === 4 && collection === 'users' && child === 'likes') allowed = id === uid && operation.kind === 'delete';
  if (!allowed) throw new ErasurePolicyError('operation-outside-account-scope');
}

function nextAtomicBatch(operations, cursor, maximum) {
  const batch = [];
  while (cursor + batch.length < operations.length) {
    const operation = operations[cursor + batch.length], count = connectionKey(operation.path) ? 2 : 1;
    if (batch.length && batch.length + count > maximum) break;
    batch.push(...operations.slice(cursor + batch.length, cursor + batch.length + count));
    if (batch.length >= maximum) break;
  }
  return batch;
}

/** Only paths admitted by a freshly collected matching plan reach this engine. */
export async function applyErasurePlan({ db, auth, plan, collectFresh, journal, saveJournal, maxBatches = 8, batchSize = 50, now = () => Date.now() }) {
  if (!Number.isInteger(maxBatches) || maxBatches < 1 || maxBatches > 32 || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) throw new ErasurePolicyError('invalid-budget');
  assertReviewedPlan(plan, { ...plan, confirm: plan.digest });
  const runtimeRef = db.doc('communityConfiguration/runtime');
  const authUser = async () => { try { return await auth.getUser(plan.uid); } catch (error) { if (error.code === 'auth/user-not-found') return null; throw error; } };
  const requireRuntimeClosed = snapshot => { if (snapshot.exists && snapshot.data()?.serviceStatus === 'open') throw new ErasurePolicyError('maintenance-window-required'); };
  const fresh = buildErasurePlan(await collectFresh());
  if (!journal) {
    if (fresh.digest !== plan.digest) throw new ErasurePolicyError('plan-stale');
    journal = { format: ERASURE_FORMAT, planDigest: plan.digest, phase: 'reviewed', cursor: 0, verificationCursor: 0, frozenAt: null, revokedAt: null, deleted: 0, redacted: 0 };
    await saveJournal(journal);
  }
  if (journal.format !== ERASURE_FORMAT || journal.planDigest !== plan.digest || !Number.isInteger(journal.cursor) || journal.cursor < 0 || journal.cursor > plan.operations.length
    || !Number.isInteger(journal.verificationCursor) || journal.verificationCursor < 0 || journal.verificationCursor > plan.operations.length
    || !Number.isInteger(journal.deleted) || journal.deleted < 0 || !Number.isInteger(journal.redacted) || journal.redacted < 0
    || !['reviewed', 'frozen', 'deleting', 'verifying', 'auth-pending', 'completed'].includes(journal.phase)) throw new ErasurePolicyError('journal-mismatch');
  if (journal.phase === 'completed') {
    if (fresh.operations.some(op => op.before !== null) || fresh.blockers.length || await authUser()) throw new ErasurePolicyError('completed-run-has-residue');
    return { phase: 'completed', completeKnownScope: true, batches: 0, deleted: journal.deleted, redacted: journal.redacted };
  }
  if (fresh.blockers.length) throw new ErasurePolicyError('new-shared-reference');
  const allowed = new Map(plan.operations.map(operation => [operation.path, operation]));
  for (const operation of fresh.operations) {
    if (!allowed.has(operation.path)) throw new ErasurePolicyError('new-reference-requires-plan');
    const original = allowed.get(operation.path);
    if (operation.before === null) continue; // absent contact half after a committed pair
    if (original.before !== operation.before || original.kind !== operation.kind) throw new ErasurePolicyError('planned-document-changed');
  }
  await db.runTransaction(async tx => requireRuntimeClosed(await tx.get(runtimeRef)));
  let identity = await authUser();
  if (identity && (identityHash(identity) !== plan.identityHash || admin(identity))) throw new ErasurePolicyError('identity-or-admin-changed');
  if (!identity && plan.identityHash && journal.phase !== 'auth-pending') throw new ErasurePolicyError('auth-removed-outside-run');
  if (journal.phase === 'reviewed') {
    if (identity) {
      await auth.updateUser(plan.uid, { disabled: true });
      await auth.revokeRefreshTokens(plan.uid);
      identity = await authUser();
      const revokedAt = Date.parse(identity?.tokensValidAfterTime || '');
      if (!identity?.disabled || identityHash(identity) !== plan.identityHash || !Number.isFinite(revokedAt) || Math.abs(now() - revokedAt) > 120_000) throw new ErasurePolicyError('freeze-not-confirmed');
      journal = { ...journal, phase: 'frozen', frozenAt: now(), revokedAt };
    } else journal = { ...journal, phase: 'frozen', frozenAt: now() - ERASURE_TOKEN_GRACE_MS, revokedAt: null };
    await saveJournal(journal);
  }
  if (!Number.isFinite(journal.frozenAt) || journal.frozenAt > now() || journal.revokedAt !== null && !Number.isFinite(journal.revokedAt)) throw new ErasurePolicyError('invalid-freeze-proof');
  const waitMs = Math.max(0, journal.frozenAt + ERASURE_TOKEN_GRACE_MS - now());
  if (waitMs) return { phase: 'waiting-token-expiry', completeKnownScope: false, waitMs, batches: 0, deleted: journal.deleted, redacted: journal.redacted };
  const checkIdentity = async () => {
    const user = await authUser();
    if (user && (!user.disabled || admin(user) || identityHash(user) !== plan.identityHash || Date.parse(user.tokensValidAfterTime || '') !== journal.revokedAt)) throw new ErasurePolicyError('identity-freeze-changed');
    if (!user && plan.identityHash && journal.phase !== 'auth-pending') throw new ErasurePolicyError('auth-removed-outside-run');
  };
  let batches = 0;
  while (journal.cursor < plan.operations.length && batches < maxBatches) {
    await checkIdentity();
    const batch = nextAtomicBatch(plan.operations, journal.cursor, batchSize);
    const counts = await db.runTransaction(async tx => {
      const runtime = await tx.get(runtimeRef); requireRuntimeClosed(runtime);
      const documents = await Promise.all(batch.map(operation => tx.get(db.doc(operation.path))));
      let deleted = 0, redacted = 0;
      for (let index = 0; index < batch.length; index++) {
        const operation = batch[index], document = documents[index];
        if (!document.exists) continue; // committed batch + lost local cursor is safe to replay
        const data = document.data();
        if (operation.kind === 'redact-invitation-consumer' && data.usedBy === '' && data.usedAt === '' && data.status === 'used') continue;
        if (operation.before === null || erasureHash(data) !== operation.before) throw new ErasurePolicyError('transaction-document-changed');
        assertOperationScope(operation, plan.uid, data);
        if (operation.kind === 'redact-invitation-consumer') { tx.update(document.ref, { usedBy: '', usedAt: '' }); redacted++; }
        else if (operation.kind === 'delete') { tx.delete(document.ref); deleted++; }
        else throw new ErasurePolicyError('unexpected-operation');
      }
      return { deleted, redacted };
    });
    batches++;
    journal = { ...journal, phase: 'deleting', cursor: journal.cursor + batch.length, deleted: journal.deleted + counts.deleted, redacted: journal.redacted + counts.redacted };
    await saveJournal(journal);
  }
  if (journal.cursor < plan.operations.length) return { phase: 'bounded-partial', completeKnownScope: false, batches, deleted: journal.deleted, redacted: journal.redacted };
  await checkIdentity();
  const residue = buildErasurePlan(await collectFresh());
  if (residue.blockers.length || residue.operations.some(operation => operation.before !== null)) throw new ErasurePolicyError('residue-requires-review');
  // Also verify mirror paths whose own half has already disappeared. They would
  // otherwise be absent from a fresh export of the requester's contact subtree.
  while (journal.verificationCursor < plan.operations.length && batches < maxBatches) {
    await checkIdentity();
    const batch = plan.operations.slice(journal.verificationCursor, journal.verificationCursor + batchSize);
    await db.runTransaction(async tx => {
      requireRuntimeClosed(await tx.get(runtimeRef));
      const documents = await Promise.all(batch.map(operation => tx.get(db.doc(operation.path))));
      for (let index = 0; index < batch.length; index++) {
      const operation = batch[index], current = documents[index];
      if (!current.exists) continue;
      const data = current.data();
      if (operation.kind !== 'redact-invitation-consumer' || data.status !== 'used' || data.usedBy !== '' || data.usedAt !== '') throw new ErasurePolicyError('residue-requires-review');
      }
    });
    batches++;
    journal = { ...journal, phase: 'verifying', verificationCursor: journal.verificationCursor + batch.length }; await saveJournal(journal);
  }
  if (journal.verificationCursor < plan.operations.length) return { phase: 'bounded-verification', completeKnownScope: false, batches, deleted: journal.deleted, redacted: journal.redacted };
  journal = { ...journal, phase: 'auth-pending' }; await saveJournal(journal);
  await checkIdentity();
  if (await authUser()) await auth.deleteUser(plan.uid);
  if (await authUser()) throw new ErasurePolicyError('auth-residue');
  journal = { ...journal, phase: 'completed' }; await saveJournal(journal);
  return { phase: 'completed', completeKnownScope: true, batches, deleted: journal.deleted, redacted: journal.redacted };
}
