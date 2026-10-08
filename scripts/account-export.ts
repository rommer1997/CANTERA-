// Pure, explicit projections for operator account exports. Never serialize SDK
// records wholesale: unknown fields may contain credentials or third-party data.
export interface ExportRecord { id: string; data: Record<string, unknown>; path?: string; }
export const exportCollections = ['communityPosts', 'communityComments', 'communityLikes', 'communityFollows', 'communityBlocks', 'communityRightsRequests', 'communityEventNotices', 'communityEventPromotions', 'communityEventDeliveries', 'communityVerifications', 'communityReports', 'communityEventChanges', 'communityTeamMembers', 'communityTeamJoinRequests', 'communityTeamInvites', 'communityInvitations', 'communityConnections', 'communityEventAdmissions', 'communityMessages'] as const;
export type ExportCollection = typeof exportCollections[number];
export interface AccountExportSource {
  uid: string; projectId: string; databaseId: string; startedAt: string; completedAt: string;
  auth?: unknown; privateProfile?: ExportRecord | null; publicProfile?: ExportRecord | null;
  moderation?: ExportRecord | null; legacyProfile?: ExportRecord | null;
  collections?: Partial<Record<ExportCollection, ExportRecord[]>>;
  events?: ExportRecord[]; fixtureRecords?: ExportRecord[]; teams?: ExportRecord[]; legacyLikes?: ExportRecord[];
}
type Data = Record<string, unknown>;
const isData = (value: unknown): value is Data => !!value && typeof value === 'object' && !Array.isArray(value);
const owns = (value: unknown, key: string) => isData(value) && Object.hasOwn(value, key);

export function assertExportUid(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !value.length || value.length > 128 || value !== value.trim()
    || /[\/\\\u0000-\u001f\u007f]/.test(value) || ['.', '..', '__proto__', 'constructor', 'prototype'].includes(value)) throw new Error('UID inválido para exportar una cuenta de Cantera.');
}

function scalar(value: unknown): string | number | boolean | null | undefined {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : undefined;
  if (isData(value) && typeof value.toDate === 'function') {
    try { const date = value.toDate(); return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : undefined; } catch { return undefined; }
  }
  return undefined;
}
function pick(data: unknown, keys: readonly string[]): Data {
  if (!isData(data)) return {};
  const result: Data = {};
  for (const key of keys) if (owns(data, key)) { const value = scalar(data[key]); if (value !== undefined) result[key] = value; }
  return result;
}
function unique(records: ExportRecord[] = []): ExportRecord[] {
  const identity = (record: ExportRecord) => typeof record.path === 'string' && record.path ? record.path : record.id;
  return [...new Map(records.filter(record => record && typeof record.id === 'string' && isData(record.data)).map(record => [identity(record), record])).values()].sort((a, b) => identity(a).localeCompare(identity(b)));
}
function projected(record: ExportRecord, fields: readonly string[]): Data { return { ...pick(record.data, fields), id: record.id }; }
function profile(record: ExportRecord | null | undefined, uid: string, fields: readonly string[], uidKey = 'id'): Data | null {
  if (!record) return null;
  if (record.id !== uid || owns(record.data, uidKey) && record.data[uidKey] !== uid) throw new Error('El documento de cuenta no corresponde al UID solicitado.');
  return projected(record, fields);
}

export function projectAuthIdentity(value: unknown, uid: string): Data | null {
  if (value == null) return null;
  if (!isData(value) || value.uid !== uid) throw new Error('La identidad de acceso no corresponde al UID solicitado.');
  const result = pick(value, ['uid', 'email', 'emailVerified', 'displayName', 'photoURL', 'phoneNumber', 'disabled', 'tenantId', 'tokensValidAfterTime']);
  result.metadata = pick(value.metadata, ['creationTime', 'lastSignInTime', 'lastRefreshTime']);
  result.providers = Array.isArray(value.providerData) ? value.providerData.filter(isData).map(provider => pick(provider, ['uid', 'providerId', 'displayName', 'email', 'photoURL', 'phoneNumber'])) : [];
  if (isData(value.multiFactor) && Array.isArray(value.multiFactor.enrolledFactors)) result.enrolledFactors = value.multiFactor.enrolledFactors.filter(isData).map(factor => pick(factor, ['uid', 'displayName', 'factorId', 'phoneNumber', 'enrollmentTime']));
  return result;
}

const privateProfileFields = ['name', 'bio', 'city', 'country', 'position', 'team', 'level', 'adultConfirmed', 'verification', 'entityType', 'createdAt', 'acceptedTermsVersion', 'acceptedTermsAt'];
const publicProfileFields = privateProfileFields.filter(key => !['adultConfirmed', 'acceptedTermsVersion', 'acceptedTermsAt'].includes(key));
const collectionPolicies: Record<ExportCollection, { owner: string; fields: string[] }> = {
  communityPosts: { owner: 'authorId', fields: ['authorId', 'authorName', 'kind', 'text', 'title', 'mediaUrl', 'mediaPath', 'createdAt', 'eventId'] },
  communityComments: { owner: 'authorId', fields: ['authorId', 'authorName', 'text', 'createdAt', 'postId'] },
  communityLikes: { owner: 'userId', fields: ['userId', 'postId', 'createdAt'] },
  communityFollows: { owner: 'followerId', fields: ['followerId', 'followingId', 'createdAt'] },
  communityBlocks: { owner: 'ownerId', fields: ['ownerId', 'blockedId', 'createdAt'] },
  communityRightsRequests: { owner: 'userId', fields: ['userId', 'kind', 'status', 'createdAt', 'reviewedAt'] },
  communityEventNotices: { owner: 'recipientId', fields: ['eventId', 'recipientId', 'revision', 'title', 'summary', 'createdAt', 'readAt', 'kind', 'deliveryId'] },
  communityEventPromotions: { owner: 'authorId', fields: ['eventId', 'title', 'summary', 'createdAt'] },
  communityEventDeliveries: { owner: 'actorId', fields: ['actorId', 'eventId', 'createdAt'] },
  communityVerifications: { owner: 'userId', fields: ['userId', 'name', 'organization', 'evidence', 'status', 'createdAt', 'reviewedAt'] },
  communityReports: { owner: 'reporterId', fields: ['reporterId', 'postId', 'commentId', 'reason', 'status', 'createdAt'] },
  communityEventChanges: { owner: 'ownerId', fields: ['eventId', 'ownerId', 'revision', 'summary', 'title', 'createdAt'] },
  communityTeamMembers: { owner: 'userId', fields: ['teamId', 'userId', 'name', 'role', 'joinedAt'] },
  communityTeamJoinRequests: { owner: 'userId', fields: ['teamId', 'userId', 'name', 'status', 'createdAt', 'reviewedAt'] },
  communityTeamInvites: { owner: 'createdBy', fields: ['teamId', 'createdBy', 'revoked', 'expiresAt', 'createdAt'] },
  communityInvitations: { owner: 'ownerId', fields: ['kind', 'eventId', 'status', 'createdAt', 'usedAt'] },
  communityConnections: { owner: 'ownerId', fields: ['ownerId', 'createdAt'] },
  communityEventAdmissions: { owner: 'userId', fields: ['userId', 'eventId', 'createdAt'] },
  communityMessages: { owner: 'senderId', fields: ['senderId', 'text', 'createdAt'] },
};
export const accountQueryPolicies = Object.fromEntries(exportCollections.map(collection => [collection, collectionPolicies[collection].owner])) as Record<ExportCollection, string>;

function privateRecordBelongs(record: ExportRecord, collection: ExportCollection, uid: string): boolean {
  if (collection === 'communityInvitations') return record.data.ownerId === uid || record.data.usedBy === uid;
  if (collection === 'communityConnections') {
    if (record.data.ownerId !== uid) return false;
    if (record.path === undefined) return true;
    const path = record.path.split('/');
    return path.length === 4 && path[0] === collection && path[1] === uid && path[2] === 'members' && path[3] === record.id && record.data.peerId === record.id;
  }
  if (collection === 'communityEventAdmissions') {
    if (record.data.userId !== uid) return false;
    if (record.path === undefined) return true;
    const path = record.path.split('/');
    return path.length === 4 && path[0] === collection && path[2] === 'members' && path[3] === uid && record.id === uid && record.data.eventId === path[1];
  }
  if (collection === 'communityMessages') {
    if (record.data.senderId !== uid || typeof record.path !== 'string') return false;
    const path = record.path.split('/');
    const participants = (path[1] || '').split(':');
    return path.length === 4 && path[0] === 'communityConversations' && path[2] === 'messages' && path[3] === record.id
      && participants.length === 2 && participants[0] !== participants[1] && participants.includes(uid)
      && participants.every(id => /^[a-zA-Z0-9_-]{1,128}$/.test(id));
  }
  return false;
}

export function projectAccountEvent(record: ExportRecord, uid: string): Data | null {
  const data = record.data;
  const participating = owns(data.participants, uid), waiting = owns(data.waitlist, uid), responded = owns(data.rsvps, uid);
  if (data.ownerId !== uid && !participating && !waiting && !responded) return null;
  const result = projected(record, ['ownerId', 'ownerName', 'title', 'type', 'format', 'level', 'city', 'country', 'timeZone', 'venue', 'startAt', 'startAtMs', 'capacity', 'entry', 'description', 'status', 'tournamentFormat', 'createdAt', 'updatedAt', 'revision', 'teamId', 'visibility']);
  result.organizer = data.ownerId === uid;
  result.participants = participating ? { [uid]: scalar((data.participants as Data)[uid]) ?? null } : {};
  result.rsvps = responded ? { [uid]: scalar((data.rsvps as Data)[uid]) ?? null } : {};
  result.waitlist = waiting ? { [uid]: pick((data.waitlist as Data)[uid], ['name', 'joinedAt']) } : {};
  result.participantCount = isData(data.participants) ? Object.keys(data.participants).length : 0;
  result.waitingCount = isData(data.waitlist) ? Object.keys(data.waitlist).length : 0;
  const position = Array.isArray(data.waitlistOrder) ? data.waitlistOrder.indexOf(uid) : -1;
  if (waiting && position >= 0) result.ownWaitingPosition = position + 1;
  if (Array.isArray(data.history)) result.history = data.history.filter(isData).map(change => pick(change, ['revision', 'changedAt', 'summary']));
  if (isData(data.result)) result.result = pick(data.result, ['homeName', 'awayName', 'homeScore', 'awayScore']);
  if (Array.isArray(data.fixtures)) result.fixtures = data.fixtures.filter(isData).map(fixture => ({ ...pick(fixture, ['id', 'round', 'homeScore', 'awayScore', 'startAt', 'timeZone', 'venue']), bye: fixture.awayId === '', ...(fixture.homeId === uid ? { ownSide: 'home' } : fixture.awayId === uid ? { ownSide: 'away' } : {}) }));
  return result;
}

export function buildAccountExport(source: AccountExportSource) {
  assertExportUid(source.uid);
  const eventRecords = unique(source.events);
  const events = eventRecords.map(record => projectAccountEvent(record, source.uid)).filter((record): record is Data => record !== null);
  const eventIds = new Set(events.map(record => record.id));
  const fixtureRecords: Data[] = unique(source.fixtureRecords).filter(record => eventIds.has(record.data.eventId)).map(record => ({
    ...projected(record, ['eventId', 'round', 'homeScore', 'awayScore', 'kickoffAt', 'timeZone', 'venue', 'createdAt', 'updatedAt']),
    fixtureId: scalar(record.data.id) ?? null, bye: record.data.awayId === '',
    ...(record.data.homeId === source.uid ? { ownSide: 'home' } : record.data.awayId === source.uid ? { ownSide: 'away' } : {}),
  }));
  for (const event of events) {
    const original = eventRecords.find(record => record.id === event.id)?.data;
    const canonical = fixtureRecords.filter(record => record.eventId === event.id);
    if (canonical.length || Array.isArray(original?.fixtureIds) && original.fixtureIds.length) {
      event.fixtureSource = 'communityFixtures';
      event.fixtures = canonical.map(record => ({ id: record.fixtureId, ...pick(record, ['round', 'homeScore', 'awayScore', 'timeZone', 'venue', 'bye', 'ownSide']), ...(typeof record.kickoffAt === 'string' ? { startAt: record.kickoffAt } : {}) }));
      if (Array.isArray(original?.fixtureIds)) event.fixtureExpectedCount = original.fixtureIds.length;
      event.fixtureAvailableCount = canonical.length;
    } else event.fixtureSource = 'event-document';
    if (event.history) event.historySource = 'event-document-cache';
  }
  const collections = {} as Record<ExportCollection, Data[]>;
  const ownInvitations = unique(source.collections?.communityInvitations).filter(record => privateRecordBelongs(record, 'communityInvitations', source.uid));
  const ownConnections = unique(source.collections?.communityConnections).filter(record => privateRecordBelongs(record, 'communityConnections', source.uid));
  const invitationReferences = new Map(ownInvitations.map((record, index) => [record.id, `invitation-${index + 1}`]));
  const connectionReferences = new Map(ownConnections.map((record, index) => [record.data.peerId, `connection-${index + 1}`]));
  const conversationReferences = new Map<string, string>();
  for (const name of exportCollections) {
    const policy = collectionPolicies[name];
    const isPrivateCoordination = ['communityInvitations', 'communityConnections', 'communityEventAdmissions', 'communityMessages'].includes(name);
    collections[name] = unique(source.collections?.[name]).filter(record => isPrivateCoordination ? privateRecordBelongs(record, name, source.uid) : record.data[policy.owner] === source.uid
      || name === 'communityEventPromotions' && record.data.recipientId === source.uid
      || name === 'communityEventChanges' && eventIds.has(record.data.eventId)).map((record, index) => {
      const result = projected(record, policy.fields);
      if (isPrivateCoordination) {
        // Random invitation IDs are live secrets; nested relationship IDs are
        // another person's UID. Neither the original ID nor SDK path is exported.
        delete result.id;
        if (name === 'communityMessages') {
          const conversation = record.path!.split('/')[1];
          if (!conversationReferences.has(conversation)) conversationReferences.set(conversation, `conversation-${conversationReferences.size + 1}`);
          result.exportReference = `message-${index + 1}`;
          result.conversationReference = conversationReferences.get(conversation);
        } else if (name === 'communityInvitations') {
          result.exportReference = invitationReferences.get(record.id);
          result.createdBySelf = record.data.ownerId === source.uid;
          result.usedBySelf = record.data.usedBy === source.uid;
          if (result.createdBySelf) result.ownerId = source.uid;
          if (result.usedBySelf) result.usedBy = source.uid;
          const peerId = result.createdBySelf ? record.data.usedBy : record.data.ownerId;
          if (record.data.kind === 'connection' && connectionReferences.has(peerId)) result.connectionReference = connectionReferences.get(peerId);
        } else {
          result.exportReference = `${name === 'communityConnections' ? 'connection' : 'admission'}-${index + 1}`;
          result.usedInvitation = typeof record.data.inviteId === 'string' && record.data.inviteId.length > 0;
          if (typeof record.data.inviteId === 'string' && invitationReferences.has(record.data.inviteId)) result.invitationReference = invitationReferences.get(record.data.inviteId);
        }
      }
      if (name === 'communityTeamJoinRequests') result.usedInvitation = typeof record.data.inviteId === 'string' && record.data.inviteId.length > 0;
      if (name === 'communityEventPromotions' || name === 'communityEventDeliveries') {
        if (record.data.authorId === source.uid) result.authorId = source.uid;
        if (record.data.recipientId === source.uid) result.recipientId = source.uid;
        result.recipientIsSelf = record.data.recipientId === source.uid;
        // Delivery document IDs are notice IDs and may embed another person's
        // UID. Use a local export reference when that recipient is not the owner.
        if (name === 'communityEventDeliveries' && !result.recipientIsSelf) { delete result.id; result.exportReference = `delivery-${index + 1}`; }
      }
      return result;
    });
  }
  const teamIds = new Set(collections.communityTeamMembers.map(record => record.teamId).filter((id): id is string => typeof id === 'string'));
  // Pending personal requests may refer to an active team's public metadata.
  for (const request of collections.communityTeamJoinRequests) if (typeof request.teamId === 'string') teamIds.add(request.teamId);
  const teams = unique(source.teams).filter(record => record.data.ownerId === source.uid || teamIds.has(record.id)).map(record => projected(record, ['ownerId', 'name', 'country', 'city', 'description', 'level', 'status', 'createdAt', 'updatedAt']));
  const auth = projectAuthIdentity(source.auth, source.uid);
  const account = {
    auth,
    privateProfile: profile(source.privateProfile, source.uid, privateProfileFields),
    publicProfile: profile(source.publicProfile, source.uid, publicProfileFields),
    moderation: profile(source.moderation, source.uid, ['status', 'reason', 'updatedAt']),
    legacyProfile: profile(source.legacyProfile, source.uid, ['uid', 'email', 'displayName', 'photoURL', 'role', 'createdAt', 'bio', 'location', 'height', 'weight', 'updatedAt'], 'uid'),
  };
  const legacyLikes = unique(source.legacyLikes).map(record => projected(record, ['timestamp']));
  const collectionCounts = Object.fromEntries(exportCollections.map(name => [name, collections[name].length])) as Record<ExportCollection, number>;
  const counts = {
    auth: Number(auth !== null), privateProfile: Number(account.privateProfile !== null), publicProfile: Number(account.publicProfile !== null), moderation: Number(account.moderation !== null), legacyProfile: Number(account.legacyProfile !== null),
    ...collectionCounts, events: events.length, fixtureRecords: fixtureRecords.length, teams: teams.length, legacyLikes: legacyLikes.length,
  };
  return {
    format: 'cantera-account-export', version: 1, uid: source.uid,
    source: { projectId: source.projectId, databaseId: source.databaseId, startedAt: source.startedAt, completedAt: source.completedAt },
    scope: { ownRecordsOnly: true, otherParticipantsRemoved: true, otherTeamPrivateRecordsRemoved: true, credentialsRemoved: true, mediaBinariesIncluded: false, shortInvitationTokensRemoved: true, privateConnectionPeerIdsRemoved: true },
    counts, account, collections, events, fixtureRecords, teams, legacyLikes,
  };
}
