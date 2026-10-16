// Explicit transformations of shared records. Never inspect or rewrite free
// text supplied by another person; the operator reviews that separately.
export const ARCHIVE_ID = /^archive_[a-f0-9]{32}$/;
export const ANONYMOUS_ID = /^removed_[a-f0-9]{32}$/;
const dataObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const keysOnly = (value, keys) => dataObject(value) && Object.keys(value).every(key => keys.includes(key));
const sameDistinctKeys = (ids, map) => Array.isArray(ids) && ids.every(id => typeof id === 'string')
  && new Set(ids).size === ids.length && ids.length === Object.keys(map).length && ids.every(id => Object.hasOwn(map, id));
const eventKeys = ['id', 'ownerId', 'ownerName', 'title', 'type', 'format', 'level', 'city', 'country', 'timeZone', 'venue', 'startAt', 'startAtMs', 'capacity', 'entry', 'description', 'status', 'tournamentFormat', 'participants', 'participantIds', 'fixtures', 'fixtureIds', 'createdAt', 'updatedAt', 'revision', 'history', 'rsvps', 'waitlist', 'waitlistOrder', 'result', 'teamId', 'visibility', 'coverId'];
const fixtureKeys = ['id', 'eventId', 'ownerId', 'round', 'homeId', 'awayId', 'homeScore', 'awayScore', 'kickoffAt', 'timeZone', 'venue', 'createdAt', 'updatedAt'];
const embeddedFixtureKeys = ['id', 'round', 'homeId', 'awayId', 'homeScore', 'awayScore', 'startAt', 'timeZone', 'venue'];
const ownKeys = {
  communityProfiles: ['id', 'name', 'bio', 'city', 'country', 'position', 'team', 'level', 'adultConfirmed', 'verification', 'entityType', 'createdAt', 'acceptedTermsVersion', 'acceptedTermsAt', 'photoURL', 'avatarPath'],
  communityPublicProfiles: ['id', 'name', 'bio', 'city', 'country', 'position', 'team', 'level', 'verification', 'entityType', 'createdAt', 'searchTokens'],
  communityAccountModeration: ['id', 'status', 'reason', 'updatedAt'],
  users: ['uid', 'email', 'displayName', 'photoURL', 'role', 'createdAt', 'bio', 'location', 'height', 'weight', 'updatedAt'],
  communityComments: ['id', 'postId', 'authorId', 'authorName', 'text', 'createdAt'],
  communityRightsRequests: ['id', 'userId', 'kind', 'status', 'createdAt', 'reviewedAt'],
  communityEventNotices: ['id', 'eventId', 'recipientId', 'revision', 'title', 'summary', 'createdAt', 'readAt', 'kind', 'deliveryId'],
  communityVerifications: ['id', 'userId', 'name', 'organization', 'evidence', 'status', 'createdAt', 'reviewedAt'],
  communityReports: ['id', 'reporterId', 'postId', 'commentId', 'reason', 'status', 'createdAt'],
  communityTeamMembers: ['id', 'teamId', 'userId', 'name', 'role', 'joinedAt'],
  communityTeamJoinRequests: ['id', 'teamId', 'userId', 'name', 'inviteId', 'status', 'createdAt', 'reviewedAt'],
  communityTeamInvites: ['id', 'teamId', 'createdBy', 'revoked', 'expiresAt', 'createdAt'],
  communityInvitations: ['id', 'ownerId', 'kind', 'eventId', 'status', 'createdAt', 'usedBy', 'usedAt'],
  communityMessageReads: ['userId', 'conversationId', 'lastReadAt', 'lastReadMessageId', 'updatedAt'],
  communityConnections: ['ownerId', 'peerId', 'inviteId', 'createdAt'],
  communityEventAdmissions: ['eventId', 'userId', 'inviteId', 'createdAt'],
};
export const knownOwnedSchema = (collection, data) => Object.hasOwn(ownKeys, collection) ? keysOnly(data, ownKeys[collection]) : knownSharedSchema(collection, data);
export function knownSharedSchema(collection, data) {
  if (collection === 'communityEvents') return keysOnly(data, eventKeys)
    && (!Object.hasOwn(data, 'coverId') || ['day', 'night', 'tournament'].includes(data.coverId))
    && dataObject(data.participants) && (!data.rsvps || dataObject(data.rsvps))
    && (!data.waitlist || dataObject(data.waitlist) && Object.values(data.waitlist).every(value => keysOnly(value, ['name', 'joinedAt'])))
    && (!data.history || Array.isArray(data.history) && data.history.every(value => keysOnly(value, ['revision', 'changedAt', 'summary'])))
    && (!data.result || keysOnly(data.result, ['homeName', 'awayName', 'homeScore', 'awayScore']))
    && Array.isArray(data.fixtures) && data.fixtures.every(value => keysOnly(value, embeddedFixtureKeys))
    && (!Object.hasOwn(data, 'participantIds') || sameDistinctKeys(data.participantIds, data.participants))
    && (!Object.hasOwn(data, 'waitlistOrder') || sameDistinctKeys(data.waitlistOrder, data.waitlist || {}));
  if (collection === 'communityFixtures') return keysOnly(data, fixtureKeys);
  if (collection === 'communityEventChanges') return keysOnly(data, ['id', 'eventId', 'ownerId', 'revision', 'summary', 'title', 'createdAt', 'audienceIds']) && Array.isArray(data.audienceIds);
  if (collection === 'communityEventPromotions') return keysOnly(data, ['eventId', 'authorId', 'recipientId', 'title', 'summary', 'createdAt']);
  if (collection === 'communityEventDeliveries') return keysOnly(data, ['actorId', 'eventId', 'recipientId', 'createdAt']);
  if (collection === 'communityConversations') return keysOnly(data, ['id', 'participantIds', 'createdAt', 'archived']) && typeof data.id === 'string' && Object.hasOwn(data, 'createdAt') && Array.isArray(data.participantIds) && (!Object.hasOwn(data, 'archived') || data.archived === true);
  if (collection === 'messages') return keysOnly(data, ['id', 'senderId', 'text', 'createdAt']) && typeof data.senderId === 'string' && typeof data.text === 'string' && Object.hasOwn(data, 'createdAt');
  if (collection === 'communityFollows') return keysOnly(data, ['followerId', 'followingId', 'createdAt']);
  if (collection === 'communityBlocks') return keysOnly(data, ['ownerId', 'blockedId', 'createdAt']);
  if (collection === 'communityLikes') return keysOnly(data, ['userId', 'postId', 'createdAt']);
  if (collection === 'communityPosts') return keysOnly(data, ['id', 'authorId', 'authorName', 'kind', 'text', 'title', 'mediaUrl', 'mediaPath', 'createdAt', 'eventId']);
  if (collection === 'communityConfiguration') return keysOnly(data, ['serviceStatus', 'mediaUploadsEnabled', 'contactEmail', 'updatedAt', 'pilotUserIds']) && Array.isArray(data.pilotUserIds);
  return false;
}
export function eventReferencesUid(data, uid) {
  return data.ownerId === uid || Object.hasOwn(data.participants || {}, uid) || Object.hasOwn(data.rsvps || {}, uid)
    || Object.hasOwn(data.waitlist || {}, uid) || data.participantIds?.includes(uid) || data.waitlistOrder?.includes(uid)
    || data.fixtures?.some(fixture => fixture.homeId === uid || fixture.awayId === uid);
}
export function sharedAfter(kind, data, uid, anonymousId) {
  if (kind === 'redact-post-author') return { ...data, authorId: '', authorName: 'Cuenta eliminada', text: 'Publicación retirada por su autor.', title: '', eventId: '' };
  if (kind === 'redact-event') {
    const result = { ...data, participants: { ...data.participants } };
    const keepSportingSlot = data.fixtures.some(fixture => fixture.homeId === uid || fixture.awayId === uid) || !!data.fixtureIds?.length;
    if (Object.hasOwn(result.participants, uid)) { delete result.participants[uid]; if (keepSportingSlot) result.participants[anonymousId] = 'Cuenta eliminada'; }
    if (data.ownerId === uid) { result.ownerId = anonymousId; result.ownerName = 'Cuenta eliminada'; }
    if (data.participantIds) result.participantIds = data.participantIds.flatMap(id => id !== uid ? [id] : keepSportingSlot ? [anonymousId] : []);
    for (const field of ['rsvps', 'waitlist']) if (data[field]) { result[field] = { ...data[field] }; delete result[field][uid]; }
    if (data.waitlistOrder) result.waitlistOrder = data.waitlistOrder.filter(id => id !== uid);
    result.fixtures = data.fixtures.map(fixture => ({ ...fixture, ...(fixture.homeId === uid ? { homeId: anonymousId } : {}), ...(fixture.awayId === uid ? { awayId: anonymousId } : {}) }));
    return result;
  }
  if (kind === 'redact-fixture') return { ...data, ...(data.ownerId === uid ? { ownerId: anonymousId } : {}), ...(data.homeId === uid ? { homeId: anonymousId } : {}), ...(data.awayId === uid ? { awayId: anonymousId } : {}) };
  if (kind === 'redact-event-change') return { ...data, ...(data.ownerId === uid ? { ownerId: anonymousId } : {}), audienceIds: data.audienceIds.filter(id => id !== uid) };
  if (kind === 'redact-promotion-author') return { ...data, authorId: '' };
  if (kind === 'redact-delivery-actor') return { ...data, actorId: '' };
  if (kind === 'redact-invitation-consumer') return { ...data, usedBy: '', usedAt: '' };
  if (kind === 'redact-pilot-roster') {
    const result = { ...data, pilotUserIds: data.pilotUserIds.filter(id => id !== uid) };
    if (!result.pilotUserIds.length) { delete result.pilotUserIds; result.serviceStatus = 'paused'; }
    return result;
  }
  throw new Error('unknown-shared-transformation');
}
export function archiveAfter(data, archiveId, uid) {
  return { id: archiveId, participantIds: data.participantIds.filter(id => id !== uid), createdAt: data.createdAt, archived: true };
}
