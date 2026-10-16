// Operator-only, bounded erasure of the current schema. This module has no
// credentials and can be tested offline. Unknown shared schemas still block.
import { createHash, randomUUID } from 'node:crypto';
import { ARCHIVE_ID, ANONYMOUS_ID, knownOwnedSchema, knownSharedSchema, eventReferencesUid, sharedAfter, archiveAfter } from './account-erasure-shared.mjs';

export class ErasurePolicyError extends Error {
  constructor(code) { super(code); this.code = `erasure/${code}`; }
}

export const ERASURE_FORMAT = 2;
export const ERASURE_PAGE_SIZE = 100;
export const ERASURE_MAX_OPERATIONS = 5000;
export const ERASURE_TOKEN_GRACE_MS = 65 * 60 * 1000;
const directCollections = ['communityProfiles', 'communityPublicProfiles', 'communityAccountModeration', 'users'];
const personalPolicies = {
  communityPosts: 'authorId', communityComments: 'authorId', communityLikes: 'userId',
  communityFollows: 'followerId', communityBlocks: 'ownerId', communityRightsRequests: 'userId',
  communityEventNotices: 'recipientId', communityVerifications: 'userId', communityReports: 'reporterId',
  communityMessageReads: 'userId', communityTeamMembers: 'userId', communityTeamJoinRequests: 'userId', communityTeamInvites: 'createdBy',
};
const knownCollections = new Set([...directCollections, ...Object.keys(personalPolicies),
  'communityConfiguration', 'communityInvitations', 'communityConnections', 'communityEventAdmissions',
  'communityEvents', 'communityFixtures', 'communityEventChanges', 'communityEventPromotions',
  'communityEventDeliveries', 'communityTeams', 'communityConversations', 'communityMessageReads']);

export function assertErasureUid(uid) {
  if (typeof uid !== 'string' || !uid.length || uid.length > 128 || uid !== uid.trim()
    || /[/\\\u0000-\u001f\u007f]/.test(uid) || ['.', '..', '__proto__', 'constructor', 'prototype'].includes(uid)) throw new ErasurePolicyError('invalid-uid');
}
function validId(value) { return typeof value === 'string' && value.length > 0 && value.length <= 1500 && !/[/\\\u0000-\u001f\u007f]/.test(value) && !['.', '..'].includes(value); }
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  // Firestore update timestamps can differ below a millisecond. Converting
  // them to Date/ISO would collapse distinct snapshots and weaken CAS.
  const seconds = value.seconds ?? value._seconds, nanoseconds = value.nanoseconds ?? value._nanoseconds;
  if (typeof value.toDate === 'function' && Number.isInteger(seconds) && Number.isInteger(nanoseconds)
    && nanoseconds >= 0 && nanoseconds < 1_000_000_000) return `@firestore-timestamp(${seconds},${nanoseconds})`;
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
export async function erasureReadAll(query, documentIdField, onRecord) {
  const result = []; let cursor;
  const ordered = query.orderBy(documentIdField);
  while (true) {
    const page = await (cursor ? ordered.startAfter(cursor) : ordered).limit(ERASURE_PAGE_SIZE).get();
    if (!Array.isArray(page.docs) || page.docs.length > ERASURE_PAGE_SIZE) throw new ErasurePolicyError('invalid-page');
    for (const document of page.docs) { const row = snapshotRecord(document); if (onRecord) onRecord(row); result.push(row); }
    if (result.length > ERASURE_MAX_OPERATIONS) throw new ErasurePolicyError('review-volume-exceeded');
    if (page.docs.length < ERASURE_PAGE_SIZE) return result;
    cursor = page.docs.at(-1);
  }
}

/** All queries are restricted to the UID, its exact subtree, or a reviewed post. */
export async function collectErasureSource({ db, auth, uid, projectId, databaseId, FieldPath, collectAccountSource, policies, routes = {} }) {
  assertErasureUid(uid);
  // One deduplicated budget across account queries, mirrors, every message
  // subtree and destination. A large set cannot multiply the per-query cap.
  const seen = new Set();
  const account = row => {
    const path = checkedRecord(row).path;
    seen.add(`document:${path}`);
    if (seen.size > ERASURE_MAX_OPERATIONS) throw new ErasurePolicyError('review-volume-exceeded');
    return row;
  };
  const referenceBudget = (path, children) => {
    if (!Array.isArray(children) || children.length > ERASURE_MAX_OPERATIONS) throw new ErasurePolicyError('review-volume-exceeded');
    for (const child of children) {
      seen.add(`collection:${path}/${child.id}`);
      if (seen.size > ERASURE_MAX_OPERATIONS) throw new ErasurePolicyError('review-volume-exceeded');
    }
  };
  const source = await collectAccountSource({ db, auth, uid, projectId, databaseId, FieldPath, policies, maximumRecords: ERASURE_MAX_OPERATIONS, onRecord: account });
  for (const row of [...['privateProfile', 'publicProfile', 'moderation', 'legacyProfile'].map(key => source[key]).filter(Boolean),
    ...Object.values(source.collections || {}).flat(), ...(source.events || []), ...(source.fixtureRecords || []), ...(source.teams || []), ...(source.legacyLikes || [])]) account(row);
  const runtime = await db.doc('communityConfiguration/runtime').get();
  source.runtime = runtime.exists ? account(snapshotRecord(runtime)) : null;
  const read = query => erasureReadAll(query, FieldPath.documentId(), account);
  const extras = { ownConnections: [], mirrors: [], incomingFollows: [], incomingBlocks: [], postInteractions: [], fixtureReferences: [], conversations: [], messages: [], conversationMessages: [], messageReads: [], sharedCoordination: [], archiveTargets: [], archiveExpected: routes.archiveExpected || {}, archiveIds: { ...(routes.archiveIds || {}) }, anonymousIds: { ...(routes.anonymousIds || {}) }, unknownCollections: [], unknownSubcollections: [] };
  const [ownConnections, mirrors, incomingFollows, incomingBlocks, home, away, fixtureOwners, audiences, deliveries, conversations, messages, roots] = await Promise.all([
    read(db.collection('communityConnections').doc(uid).collection('members')),
    read(db.collectionGroup('members').where('peerId', '==', uid)),
    read(db.collection('communityFollows').where('followingId', '==', uid)),
    read(db.collection('communityBlocks').where('blockedId', '==', uid)),
    read(db.collection('communityFixtures').where('homeId', '==', uid)),
    read(db.collection('communityFixtures').where('awayId', '==', uid)),
    read(db.collection('communityFixtures').where('ownerId', '==', uid)),
    read(db.collection('communityEventChanges').where('audienceIds', 'array-contains', uid)),
    read(db.collection('communityEventDeliveries').where('recipientId', '==', uid)),
    read(db.collection('communityConversations').where('participantIds', 'array-contains', uid)),
    read(db.collectionGroup('messages').where('senderId', '==', uid)),
    db.listCollections(),
  ]);
  extras.ownConnections = ownConnections;
  referenceBudget('', roots);
  // Do not confuse a future unrelated "members"/"messages" group with these schemas.
  extras.mirrors = mirrors.filter(row => row.path.split('/').length === 4 && row.path.split('/')[0] === 'communityConnections' && row.path.split('/')[2] === 'members');
  extras.messages = messages.filter(row => row.path.split('/').length === 4 && row.path.split('/')[0] === 'communityConversations' && row.path.split('/')[2] === 'messages');
  Object.assign(extras, { incomingFollows, incomingBlocks, fixtureReferences: dedupe([...home, ...away, ...fixtureOwners]), conversations, sharedCoordination: dedupe([...audiences, ...deliveries]) });
  // Exact parent lookups recover canonical fixture ownership and historical
  // audience references even after the requester left the event itself.
  const linkedEventIds = new Set([...extras.fixtureReferences, ...extras.sharedCoordination].map(row => row.data.eventId));
  for (const id of linkedEventIds) {
    if (!validId(id)) throw new ErasurePolicyError('invalid-linked-event');
    if (!(source.events || []).some(row => row.id === id)) {
      const document = await db.doc(`communityEvents/${id}`).get();
      if (!document.exists) throw new ErasurePolicyError('shared-event-parent-missing');
      (source.events ||= []).push(account(snapshotRecord(document)));
    }
  }
  for (const row of source.events || []) extras.anonymousIds[row.id] ||= `removed_${randomUUID().replaceAll('-', '')}`;
  // The random destination is persisted in the reviewed plan, never derived
  // from an account ID. On resume only those exact original subtrees are read.
  const conversationIds = new Set([...conversations.map(row => row.id), ...(source.collections?.communityMessageReads || []).map(row => row.data.conversationId), ...Object.keys(extras.archiveIds)]);
  for (const id of conversationIds) {
    if (!validId(id)) throw new ErasurePolicyError('invalid-conversation');
    if (!conversations.some(row => row.id === id)) {
      const document = await db.doc(`communityConversations/${id}`).get();
      if (document.exists) extras.conversations.push(account(snapshotRecord(document)));
    }
    if (!ARCHIVE_ID.test(id)) extras.messageReads.push(...await read(db.collection('communityMessageReads').where('conversationId', '==', id)));
    extras.conversationMessages.push(...await read(db.collection('communityConversations').doc(id).collection('messages')));
    if (!ARCHIVE_ID.test(id)) extras.archiveIds[id] ||= `archive_${randomUUID().replaceAll('-', '')}`;
    const children = await db.doc(`communityConversations/${id}`).listCollections();
    referenceBudget(`communityConversations/${id}`, children);
    for (const child of children) if (child.id !== 'messages') extras.unknownSubcollections.push(`communityConversations/${id}/${child.id}`);
  }
  for (const archiveId of new Set(Object.values(extras.archiveIds))) {
    if (!ARCHIVE_ID.test(archiveId)) throw new ErasurePolicyError('invalid-archive-destination');
    const reference = db.doc(`communityConversations/${archiveId}`), destination = await reference.get();
    if (destination.exists) extras.archiveTargets.push(account(snapshotRecord(destination)));
    extras.archiveTargets.push(...await read(db.collection('communityConversations').doc(archiveId).collection('messages')));
    const children = await reference.listCollections(); referenceBudget(reference.path, children);
    for (const child of children) if (child.id !== 'messages') extras.unknownSubcollections.push(`${reference.path}/${child.id}`);
  }
  extras.unknownCollections = roots.map(ref => ref.id).filter(name => !knownCollections.has(name));
  for (const row of source.collections?.communityPosts || []) {
    for (const collection of ['communityLikes', 'communityComments']) extras.postInteractions.push(...await read(db.collection(collection).where('postId', '==', row.id)));
  }
  // Firestore does not recursively delete subcollections. Unknown descendants
  // below account-owned records must be reviewed instead of silently orphaned.
  const own = [...directCollections.map(name => `${name}/${uid}`), ...Object.entries(source.collections || {}).flatMap(([name, rows]) => Object.hasOwn(personalPolicies, name) ? rows.map(row => `${name}/${row.id}`) : []),
    ...(source.legacyLikes || []).map(row => row.path), ...ownConnections.map(row => row.path), ...dedupe([...extras.messages, ...extras.conversationMessages, ...extras.archiveTargets.filter(row => row.path.split('/').length === 4)]).map(row => row.path),
    ...(source.collections?.communityEventAdmissions || []).map(row => row.path), ...(source.collections?.communityInvitations || []).filter(row => row.data.ownerId === uid).map(row => row.path),
    ...extras.messageReads.map(row => row.path),
    ...[...(source.events || []), ...(source.fixtureRecords || []), ...extras.fixtureReferences, ...extras.sharedCoordination, ...incomingFollows, ...incomingBlocks].map(row => row.path)];
  for (const path of [...new Set(own)]) {
    const children = await db.doc(path).listCollections();
    referenceBudget(path, children);
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
  const add = (row, kind = 'delete', details = {}) => {
    checkedRecord(row);
    const operation = { path: row.path, kind, before: erasureHash(row.data), ...details };
    if (operations.has(row.path) && canonical(operations.get(row.path)) !== canonical(operation)) throw new ErasurePolicyError('inconsistent-source');
    operations.set(row.path, operation);
  };
  const redact = (row, kind, anonymousId) => {
    // Current random content IDs have no account identity. Legacy/custom IDs
    // that embed it require an explicit relocation plan for their references.
    if (row.path.includes(uid)) { blockers.add('identifying-shared-document-path-review'); return; }
    add(row, kind, { after: erasureHash(sharedAfter(kind, row.data, uid, anonymousId)), ...(anonymousId ? { anonymousId, ...(kind !== 'redact-event' ? { eventId: row.data.eventId } : {}) } : {}) });
  };
  const schema = (row, collection) => { if (!knownSharedSchema(collection, row.data)) { blockers.add('unknown-shared-schema-review'); return false; } return true; };
  const eventRows = dedupe(source.events || []), eventMap = new Map(eventRows.map(row => [row.id, row]));
  const anonymous = eventId => {
    const id = extra.anonymousIds?.[eventId];
    if (!ANONYMOUS_ID.test(id || '')) throw new ErasurePolicyError('anonymous-event-id-required');
    return id;
  };
  if (admin(source.auth)) blockers.add('administrator-transfer-required');
  if ((source.teams || []).some(row => row.data.ownerId === uid)) blockers.add('team-ownership-transfer-or-closure-required');
  if ((extra.unknownCollections || []).length) blockers.add('unknown-root-schema-review');
  if ((extra.unknownSubcollections || []).length) blockers.add('unknown-owned-descendants-review');
  for (const row of extra.archiveTargets || []) {
    if (extra.archiveExpected?.[row.path] !== erasureHash(row.data)) blockers.add('archive-destination-collision-review');
  }
  if (source.runtime?.data?.pilotUserIds?.includes(uid)) {
    if (schema(source.runtime, 'communityConfiguration')) redact(source.runtime, 'redact-pilot-roster');
  }
  for (const row of eventRows) {
    if (row.path !== `communityEvents/${row.id}` || !schema(row, 'communityEvents')) continue;
    if (row.data.ownerId === uid && !['completed', 'cancelled'].includes(row.data.status)) { blockers.add('active-event-ownership-transfer-required'); continue; }
    if (eventReferencesUid(row.data, uid)) {
      const anonymousId = anonymous(row.id);
      if (Object.hasOwn(row.data.participants, uid) && Object.hasOwn(row.data.participants, anonymousId)) { blockers.add('anonymous-participant-collision-review'); continue; }
      redact(row, 'redact-event', anonymousId);
    }
  }
  for (const row of dedupe([...(extra.fixtureReferences || []), ...(source.fixtureRecords || [])])) {
    if (row.data.ownerId !== uid && row.data.homeId !== uid && row.data.awayId !== uid) continue;
    if (row.path !== `communityFixtures/${row.id}` || !schema(row, 'communityFixtures')) continue;
    const event = eventMap.get(row.data.eventId);
    if (!event || !schema(event, 'communityEvents')) { blockers.add('shared-fixture-parent-review'); continue; }
    if (event.data.ownerId === uid && !['completed', 'cancelled'].includes(event.data.status)) { blockers.add('active-event-ownership-transfer-required'); continue; }
    redact(row, 'redact-fixture', anonymous(row.data.eventId));
  }
  for (const row of dedupe([...(extra.sharedCoordination || []), ...['communityEventChanges', 'communityEventPromotions', 'communityEventDeliveries'].flatMap(name => source.collections?.[name] || [])])) {
    const name = row.path.split('/')[0];
    if (row.path !== `${name}/${row.id}` || !schema(row, name)) continue;
    if (name === 'communityEventChanges') {
      if (row.data.ownerId !== uid && !row.data.audienceIds.includes(uid)) continue;
      const event = eventMap.get(row.data.eventId);
      if (!event) { blockers.add('shared-change-parent-review'); continue; }
      if (event.data.ownerId === uid && !['completed', 'cancelled'].includes(event.data.status)) { blockers.add('active-event-ownership-transfer-required'); continue; }
      redact(row, 'redact-event-change', anonymous(row.data.eventId));
    } else if (name === 'communityEventPromotions') {
      if (row.data.recipientId === uid) add(row, 'delete-personal-coordination');
      else if (row.data.authorId === uid) redact(row, 'redact-promotion-author');
    } else if (name === 'communityEventDeliveries') {
      if (row.data.recipientId === uid) add(row, 'delete-personal-coordination');
      else if (row.data.actorId === uid) redact(row, 'redact-delivery-actor');
    }
  }
  for (const [name, field, rows] of [['communityFollows', 'followingId', extra.incomingFollows || []], ['communityBlocks', 'blockedId', extra.incomingBlocks || []]]) {
    for (const row of rows) {
      if (row.path !== `${name}/${row.id}` || row.data[field] !== uid) throw new ErasurePolicyError('foreign-relationship');
      if (schema(row, name)) add(row, 'delete-incoming-relationship');
    }
  }
  for (const [name, ownerField] of Object.entries(personalPolicies)) {
    for (const row of source.collections?.[name] || []) {
      checkedRecord(row);
      if (row.path !== `${name}/${row.id}` || row.data[ownerField] !== uid) throw new ErasurePolicyError('foreign-record');
      if (!knownOwnedSchema(name, row.data)) { blockers.add('unknown-owned-schema-review'); continue; }
      if (name === 'communityTeamMembers' && ['owner', 'manager'].includes(row.data.role)) blockers.add('team-management-transfer-required');
      if (name === 'communityPosts' && (row.data.mediaPath || row.data.mediaUrl)) blockers.add('media-removal-review');
      if (name === 'communityPosts' && (extra.postInteractions || []).some(interaction => interaction.data.postId === row.id && interaction.data.authorId !== uid && interaction.path.startsWith('communityComments/'))) {
        if (schema(row, name)) redact(row, 'redact-post-author');
      } else add(row);
    }
  }
  for (const row of extra.postInteractions || []) {
    checkedRecord(row);
    const name = row.path.split('/')[0], field = name === 'communityLikes' ? 'userId' : name === 'communityComments' ? 'authorId' : null;
    if (!field || row.path !== `${name}/${row.id}` || !(source.collections?.communityPosts || []).some(post => post.id === row.data.postId)) throw new ErasurePolicyError('invalid-post-interaction');
    // Comments authored by somebody else survive on the withdrawn post shell.
    // Their likes are only references to the withdrawn content, and can go.
    if (name === 'communityLikes' && row.data[field] !== uid) { if (schema(row, name)) add(row, 'delete-withdrawn-post-like', { postId: row.data.postId }); }
    else if (row.data[field] === uid) add(row);
  }
  for (const row of source.collections?.communityInvitations || []) {
    checkedRecord(row);
    if (row.path !== `communityInvitations/${row.id}` || !/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{16}$/.test(row.id)) throw new ErasurePolicyError('invalid-invitation');
    if (!knownOwnedSchema('communityInvitations', row.data)) { blockers.add('unknown-owned-schema-review'); continue; }
    if (row.data.ownerId === uid) add(row);
    else if (row.data.usedBy === uid && row.data.status === 'used') redact(row, 'redact-invitation-consumer');
    else throw new ErasurePolicyError('foreign-invitation');
  }
  const connections = dedupe([...(source.collections?.communityConnections || []), ...(extra.ownConnections || []), ...(extra.mirrors || [])]);
  for (const row of connections) {
    checkedRecord(row);
    const parts = row.path.split('/'), [collection, owner, members, peer] = parts;
    if (parts.length !== 4 || collection !== 'communityConnections' || members !== 'members' || row.data.ownerId !== owner || row.data.peerId !== peer || owner === peer || owner !== uid && peer !== uid) throw new ErasurePolicyError('invalid-connection');
    if (!knownOwnedSchema(collection, row.data)) { blockers.add('unknown-owned-schema-review'); continue; }
    add(row);
    // Read and validate both ends even if one side was already deleted before
    // planning. A same-path document with other identities must never be erased.
    const mirrorPath = `communityConnections/${peer}/members/${owner}`;
    if (!connections.some(candidate => candidate.path === mirrorPath)) operations.set(mirrorPath, { path: mirrorPath, kind: 'delete-missing-mirror', before: null });
  }
  for (const row of source.collections?.communityEventAdmissions || []) {
    checkedRecord(row); const parts = row.path.split('/');
    if (parts.length !== 4 || parts[0] !== 'communityEventAdmissions' || parts[2] !== 'members' || parts[3] !== uid || row.data.userId !== uid || row.data.eventId !== parts[1]) throw new ErasurePolicyError('invalid-admission');
    if (!knownOwnedSchema('communityEventAdmissions', row.data)) { blockers.add('unknown-owned-schema-review'); continue; }
    add(row);
  }
  for (const row of dedupe([...(source.collections?.communityMessages || []), ...(extra.messages || [])])) {
    checkedRecord(row); const parts = row.path.split('/');
    if (parts.length !== 4 || parts[0] !== 'communityConversations' || parts[2] !== 'messages' || row.data.senderId !== uid) throw new ErasurePolicyError('foreign-message');
    add(row);
  }
  // Both cursors refer to the retired canonical conversation. Remove only
  // that minimal coordination metadata; the peer's text is archived below.
  for (const row of extra.messageReads || []) {
    checkedRecord(row);
    const pair = typeof row.data.conversationId === 'string' ? row.data.conversationId.split(':') : [];
    if (pair.length !== 2 || pair[0] >= pair[1] || !pair.every(id => /^[A-Za-z0-9_-]{1,128}$/.test(id)) || !pair.includes(uid)
      || !pair.includes(row.data.userId) || row.path !== `communityMessageReads/${row.data.userId}:${row.data.conversationId}`) throw new ErasurePolicyError('foreign-read-marker');
    if (!knownOwnedSchema('communityMessageReads', row.data)) { blockers.add('unknown-owned-schema-review'); continue; }
    add(row);
  }
  for (const conversation of extra.conversations || []) {
    if (conversation.path !== `communityConversations/${conversation.id}` || !schema(conversation, 'communityConversations')) continue;
    const messages = (extra.conversationMessages || []).filter(row => row.path.split('/')[1] === conversation.id);
    if (conversation.data.archived === true) {
      if (!ARCHIVE_ID.test(conversation.id) || conversation.data.id !== conversation.id || canonical(conversation.data.participantIds) !== canonical([uid])) { blockers.add('unknown-shared-schema-review'); continue; }
      for (const message of messages) { if (!schema(message, 'messages') || message.data.senderId !== uid) { blockers.add('archive-ownership-review'); continue; } add(message); }
      add(conversation, 'delete-own-archive'); continue;
    }
    const pair = conversation.id.split(':');
    if (pair.length !== 2 || pair[0] >= pair[1] || !pair.every(id => /^[A-Za-z0-9_-]{1,128}$/.test(id)) || conversation.data.id !== conversation.id
      || canonical(conversation.data.participantIds) !== canonical(pair) || !pair.includes(uid)) { blockers.add('unknown-shared-schema-review'); continue; }
    const archiveId = extra.archiveIds?.[conversation.id];
    if (!ARCHIVE_ID.test(archiveId || '')) throw new ErasurePolicyError('random-archive-id-required');
    const archiveData = archiveAfter(conversation.data, archiveId, uid);
    for (const message of messages) {
      if (!schema(message, 'messages') || message.data.id !== message.id || !pair.includes(message.data.senderId)) { blockers.add('unknown-shared-schema-review'); continue; }
      if (message.data.senderId === uid) add(message);
      else add(message, 'archive-third-party-message', { targetPath: `communityConversations/${archiveId}/messages/${message.id}`, targetRootAfter: erasureHash(archiveData), after: erasureHash(message.data), conversationBefore: erasureHash(conversation.data) });
    }
    add(conversation, 'archive-conversation', { targetPath: `communityConversations/${archiveId}`, after: erasureHash(archiveData) });
  }
  for (const message of extra.conversationMessages || []) {
    if (!(extra.conversations || []).some(conversation => conversation.id === message.path.split('/')[1]) && message.data.senderId !== uid) blockers.add('orphan-shared-message-review');
  }
  for (const [key, name, field] of [['privateProfile', 'communityProfiles', 'id'], ['publicProfile', 'communityPublicProfiles', 'id'], ['moderation', 'communityAccountModeration', 'id'], ['legacyProfile', 'users', 'uid']]) {
    const row = source[key]; if (!row) continue;
    if (row.id !== uid || row.path !== `${name}/${uid}` || Object.hasOwn(row.data, field) && row.data[field] !== uid) throw new ErasurePolicyError('foreign-profile');
    if (!knownOwnedSchema(name, row.data)) { blockers.add('unknown-owned-schema-review'); continue; }
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
  const phase = op => late(op.path) ? 3 : ['archive-conversation', 'delete-own-archive'].includes(op.kind) ? 2 : 1;
  const orderKey = path => connectionKey(path) ? `communityConnections/${connectionKey(path)}/${path}` : path;
  const value = { format: ERASURE_FORMAT, uid, projectId: source.projectId, databaseId: source.databaseId,
    identityHash: identityHash(source.auth), blockers: [...blockers].sort(),
    operations: [...operations.values()].sort((a, b) => phase(a) - phase(b) || orderKey(a.path).localeCompare(orderKey(b.path))),
    scope: 'known-schema-account-removal-shared-redaction-private-archives' };
  return { ...value, digest: erasureHash(value) };
}

export function assertReviewedPlan(plan, { uid, projectId, databaseId, confirm }) {
  assertErasureUid(uid);
  if (!plan || plan.format !== ERASURE_FORMAT || plan.uid !== uid || plan.projectId !== projectId || plan.databaseId !== databaseId
    || !/^[a-f0-9]{64}$/.test(confirm || '') || plan.digest !== confirm || !Array.isArray(plan.operations) || !Array.isArray(plan.blockers)
    || plan.operations.length > ERASURE_MAX_OPERATIONS || plan.scope !== 'known-schema-account-removal-shared-redaction-private-archives') throw new ErasurePolicyError('reviewed-plan-mismatch');
  const { digest, ...payload } = plan;
  if (erasureHash(payload) !== digest) throw new ErasurePolicyError('plan-integrity-failed');
  if (plan.blockers.length) throw new ErasurePolicyError('plan-blocked');
  const paths = new Set();
  for (const operation of plan.operations) {
    if (!operation || typeof operation.path !== 'string' || paths.has(operation.path)
      || !['delete', 'delete-missing-mirror', 'redact-invitation-consumer', 'redact-post-author', 'redact-event', 'redact-fixture', 'redact-event-change', 'redact-promotion-author', 'redact-delivery-actor', 'redact-pilot-roster', 'delete-incoming-relationship', 'delete-personal-coordination', 'delete-withdrawn-post-like', 'archive-third-party-message', 'archive-conversation', 'delete-own-archive'].includes(operation.kind)
      || operation.before !== null && !/^[a-f0-9]{64}$/.test(operation.before || '')
      || operation.before === null && operation.kind !== 'delete-missing-mirror') throw new ErasurePolicyError('invalid-operation');
    paths.add(operation.path);
    if (operation.kind.startsWith('redact-') || operation.kind.startsWith('archive-')) {
      if (!/^[a-f0-9]{64}$/.test(operation.after || '')) throw new ErasurePolicyError('invalid-after-hash');
    }
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

export function erasureRoutes(plan) {
  const routes = { archiveIds: {}, anonymousIds: {}, archiveExpected: {} };
  for (const operation of plan?.operations || []) {
    if (operation.kind === 'archive-conversation') routes.archiveIds[operation.path.split('/')[1]] = operation.targetPath.split('/')[1];
    if (operation.kind.startsWith('archive-')) routes.archiveExpected[operation.targetPath] = operation.after;
    if (operation.anonymousId) {
      // Fixture and change actions store their event link explicitly so a
      // resumed read uses the same random sporting alias as its parent.
      const eventId = operation.kind === 'redact-event' ? operation.path.split('/')[1] : operation.eventId;
      if (eventId) routes.anonymousIds[eventId] = operation.anonymousId;
    }
  }
  return routes;
}

function assertOperationScope(operation, uid, data) {
  const parts = operation.path.split('/');
  if (parts.some(part => !validId(part))) throw new ErasurePolicyError('invalid-operation-path');
  const [collection, id, child, childId] = parts;
  let allowed = false;
  if (parts.length === 2 && Object.hasOwn(personalPolicies, collection)) {
    allowed = operation.kind === 'delete' && (!data || data[personalPolicies[collection]] === uid)
      || collection === 'communityPosts' && operation.kind === 'redact-post-author' && (!data || data.authorId === uid && knownSharedSchema(collection, data))
      || ['communityFollows', 'communityBlocks'].includes(collection) && operation.kind === 'delete-incoming-relationship' && (!data || data[collection === 'communityFollows' ? 'followingId' : 'blockedId'] === uid && knownSharedSchema(collection, data))
      || collection === 'communityLikes' && operation.kind === 'delete-withdrawn-post-like' && validId(operation.postId) && (!data || data.postId === operation.postId && knownSharedSchema(collection, data));
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
    allowed = operation.kind === 'delete' && (!data || data.senderId === uid)
      || operation.kind === 'archive-third-party-message' && operation.targetPath?.split('/').length === 4
        && operation.targetPath.split('/')[0] === collection && ARCHIVE_ID.test(operation.targetPath.split('/')[1])
        && operation.targetPath.split('/')[2] === 'messages' && operation.targetPath.split('/')[3] === childId
        && /^[a-f0-9]{64}$/.test(operation.targetRootAfter || '') && /^[a-f0-9]{64}$/.test(operation.conversationBefore || '')
        && (!data || data.senderId !== uid && knownSharedSchema('messages', data));
  } else if (parts.length === 2 && collection === 'communityConversations') {
    allowed = operation.kind === 'archive-conversation' && operation.targetPath?.split('/').length === 2
      && operation.targetPath.split('/')[0] === collection && ARCHIVE_ID.test(operation.targetPath.split('/')[1])
      && (!data || data.archived !== true && knownSharedSchema(collection, data) && data.participantIds.includes(uid))
      || operation.kind === 'delete-own-archive' && ARCHIVE_ID.test(id)
        && (!data || data.archived === true && knownSharedSchema(collection, data) && canonical(data.participantIds) === canonical([uid]));
  } else if (parts.length === 2 && collection === 'communityConfiguration') {
    allowed = id === 'runtime' && operation.kind === 'redact-pilot-roster' && (!data || data.serviceStatus !== 'open' && knownSharedSchema(collection, data) && data.pilotUserIds.includes(uid));
  } else if (parts.length === 2 && ['communityEvents', 'communityFixtures', 'communityEventChanges', 'communityEventPromotions', 'communityEventDeliveries'].includes(collection)) {
    const kind = { communityEvents: 'redact-event', communityFixtures: 'redact-fixture', communityEventChanges: 'redact-event-change', communityEventPromotions: 'redact-promotion-author', communityEventDeliveries: 'redact-delivery-actor' }[collection];
    if (['communityEventPromotions', 'communityEventDeliveries'].includes(collection) && operation.kind === 'delete-personal-coordination') allowed = !data || data.recipientId === uid && knownSharedSchema(collection, data);
    else if (operation.kind === kind) {
      allowed = (!['communityEvents', 'communityFixtures', 'communityEventChanges'].includes(collection) || ANONYMOUS_ID.test(operation.anonymousId || '')) && (!data || knownSharedSchema(collection, data) && (
        collection === 'communityEvents' && eventReferencesUid(data, uid)
        || collection === 'communityFixtures' && [data.ownerId, data.homeId, data.awayId].includes(uid)
        || collection === 'communityEventChanges' && (data.ownerId === uid || data.audienceIds.includes(uid))
        || collection === 'communityEventPromotions' && data.authorId === uid
        || collection === 'communityEventDeliveries' && data.actorId === uid));
    }
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
    if (canonical(original) !== canonical(operation)) throw new ErasurePolicyError('planned-document-changed');
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
      const extraPaths = [...new Set(batch.flatMap(operation => operation.kind === 'archive-third-party-message'
        ? [operation.targetPath, operation.targetPath.split('/').slice(0, 2).join('/'), operation.path.split('/').slice(0, 2).join('/')]
        : operation.kind === 'archive-conversation' ? [operation.targetPath] : operation.kind === 'delete-withdrawn-post-like' ? [`communityPosts/${operation.postId}`] : []))];
      const extras = new Map(await Promise.all(extraPaths.map(async path => [path, await tx.get(db.doc(path))])));
      let deleted = 0, redacted = 0;
      for (let index = 0; index < batch.length; index++) {
        const operation = batch[index], document = documents[index];
        if (operation.kind === 'archive-third-party-message') {
          const target = extras.get(operation.targetPath), targetRoot = extras.get(operation.targetPath.split('/').slice(0, 2).join('/'));
          if (!document.exists) {
            if (!target.exists || erasureHash(target.data()) !== operation.after || !targetRoot.exists || erasureHash(targetRoot.data()) !== operation.targetRootAfter) throw new ErasurePolicyError('archive-copy-not-confirmed');
            continue;
          }
          const sourceRoot = extras.get(operation.path.split('/').slice(0, 2).join('/'));
          if (!sourceRoot.exists || erasureHash(sourceRoot.data()) !== operation.conversationBefore || erasureHash(document.data()) !== operation.before) throw new ErasurePolicyError('transaction-document-changed');
          assertOperationScope(operation, plan.uid, document.data());
          if (!sourceRoot.data().participantIds.includes(document.data().senderId)) throw new ErasurePolicyError('archive-foreign-sender');
          const archiveId = operation.targetPath.split('/')[1], rootData = archiveAfter(sourceRoot.data(), archiveId, plan.uid);
          if (erasureHash(rootData) !== operation.targetRootAfter || targetRoot.exists && erasureHash(targetRoot.data()) !== operation.targetRootAfter || target.exists && erasureHash(target.data()) !== operation.after) throw new ErasurePolicyError('archive-destination-collision');
          if (!targetRoot.exists) tx.set(targetRoot.ref, rootData);
          if (!target.exists) tx.set(target.ref, document.data());
          tx.delete(document.ref); deleted++; continue;
        }
        if (!document.exists) {
          if (operation.kind === 'archive-conversation') {
            const target = extras.get(operation.targetPath);
            if (!target.exists || erasureHash(target.data()) !== operation.after) throw new ErasurePolicyError('archive-copy-not-confirmed');
          }
          continue; // committed batch + lost local cursor is safe to replay
        }
        const data = document.data();
        if (operation.kind.startsWith('redact-') && erasureHash(data) === operation.after) continue;
        if (operation.before === null || erasureHash(data) !== operation.before) throw new ErasurePolicyError('transaction-document-changed');
        assertOperationScope(operation, plan.uid, data);
        if (operation.kind.startsWith('redact-')) {
          const after = sharedAfter(operation.kind, data, plan.uid, operation.anonymousId);
          if (erasureHash(after) !== operation.after) throw new ErasurePolicyError('transformation-mismatch');
          tx.set(document.ref, after); redacted++;
        } else if (operation.kind === 'archive-conversation') {
          const target = extras.get(operation.targetPath), after = archiveAfter(data, operation.targetPath.split('/')[1], plan.uid);
          if (erasureHash(after) !== operation.after || target.exists && erasureHash(target.data()) !== operation.after) throw new ErasurePolicyError('archive-destination-collision');
          if (!target.exists) tx.set(target.ref, after);
          tx.delete(document.ref); deleted++;
        } else if (['delete', 'delete-incoming-relationship', 'delete-personal-coordination', 'delete-own-archive', 'delete-withdrawn-post-like'].includes(operation.kind)) {
          if (operation.kind === 'delete-withdrawn-post-like') {
            const post = extras.get(`communityPosts/${operation.postId}`);
            if (post.exists && post.data().authorId !== plan.uid && post.data().authorId !== '') throw new ErasurePolicyError('withdrawn-post-changed');
          }
          tx.delete(document.ref); deleted++;
        }
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
      const targets = new Map(await Promise.all(batch.filter(operation => operation.kind.startsWith('archive-')).map(async operation => [operation.path, await tx.get(db.doc(operation.targetPath))])));
      for (let index = 0; index < batch.length; index++) {
      const operation = batch[index], current = documents[index];
      if (!current.exists) {
        if (operation.kind.startsWith('archive-')) {
          const target = targets.get(operation.path);
          if (!target.exists || erasureHash(target.data()) !== operation.after) throw new ErasurePolicyError('archive-copy-not-confirmed');
        }
        continue;
      }
      const data = current.data();
      if (!operation.kind.startsWith('redact-') || erasureHash(data) !== operation.after) throw new ErasurePolicyError('residue-requires-review');
      }
    });
    batches++;
    journal = { ...journal, phase: 'verifying', verificationCursor: journal.verificationCursor + batch.length }; await saveJournal(journal);
  }
  if (journal.verificationCursor < plan.operations.length) return { phase: 'bounded-verification', completeKnownScope: false, batches, deleted: journal.deleted, redacted: journal.redacted };
  const finalResidue = buildErasurePlan(await collectFresh());
  if (finalResidue.blockers.length || finalResidue.operations.some(operation => operation.before !== null)) throw new ErasurePolicyError('residue-requires-review');
  journal = { ...journal, phase: 'auth-pending' }; await saveJournal(journal);
  await checkIdentity();
  if (await authUser()) await auth.deleteUser(plan.uid);
  if (await authUser()) throw new ErasurePolicyError('auth-residue');
  journal = { ...journal, phase: 'completed' }; await saveJournal(journal);
  return { phase: 'completed', completeKnownScope: true, batches, deleted: journal.deleted, redacted: journal.redacted };
}
