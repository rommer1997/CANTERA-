import type { DemoData } from './local';
import { validPilotUserIds } from './pilotAccess.ts';
import type { CommunityPost, CommunityProfile, ContentReport, Fixture, FollowRecord, PlayEvent, EventNotice, RightsRequest, RuntimeConfig, PostComment, PublicProfile, VerificationRequest } from './types';

type Data = Record<string, unknown>;
// Firestore timestamps are converted only at the boundary; legacy ISO records stay readable.
function dates(value: unknown): unknown {
  if (!object(value)) return value;
  const result = { ...value };
  for (const field of ['createdAt', 'updatedAt', 'acceptedTermsAt', 'reviewedAt', 'readAt', 'changedAt', 'joinedAt']) {
    const raw = result[field] as { toDate?: () => Date } | undefined;
    if (raw && typeof raw.toDate === 'function') { try { result[field] = raw.toDate().toISOString(); } catch { result[field] = ''; } }
  }
  return result;
}
export function searchText(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim().replace(/\s+/g, ' ').slice(0, 100); }
export function profileSearchTokens(value: Pick<CommunityProfile, 'name' | 'city' | 'country'>): string[] {
  const tokens = new Set<string>();
  for (const field of ['name', 'city', 'country'] as const) {
    const clean = searchText(value[field]);
    for (const part of new Set([clean, ...clean.split(' ')])) for (let length = 1; length <= part.length; length++) tokens.add(`${field}:${part.slice(0, length)}`);
  }
  return [...tokens].slice(0, 600);
}
export interface LikeRecord { postId: string; userId: string; createdAt: string }
export interface CommentRecord extends PostComment { postId: string }

function object(value: unknown): value is Data {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function text(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.length <= max && (min === 0 || value.trim().length >= min);
}
function id(value: unknown): value is string {
  return text(value, 1, 128) && !['__proto__', 'constructor', 'prototype', '.', '..'].includes(value)
    && !/[\/\\\u0000-\u001f\u007f]/.test(value);
}
function date(value: unknown): value is string {
  if (!text(value, 1, 40)) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && new Date(ms).toISOString() === value;
}
function enumValue<T extends string>(value: unknown, choices: readonly T[]): value is T {
  return typeof value === 'string' && choices.includes(value as T);
}
function documentIdentity(data: Data, documentId?: string): data is Data & { id: string } {
  return id(data.id) && (documentId === undefined || data.id === documentId);
}
function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}
function timeZone(value: unknown): value is string {
  if (!text(value, 1, 100)) return false;
  try { new Intl.DateTimeFormat('es-ES', { timeZone: value }).format(0); return true; } catch { return false; }
}
function score(value: unknown): value is number | null { return value === null || integer(value, 0, 99); }
function list<T>(value: unknown, normalize: (item: unknown) => T | null, max = 1000): T[] {
  return Array.isArray(value) ? value.slice(0, max).map(item => normalize(item)).filter((item): item is T => item !== null) : [];
}
function dictionary<T>(): Record<string, T> { return Object.create(null) as Record<string, T>; }

// Reconstruct known fields instead of casting Firestore or localStorage data into UI types.
// Invalid sporting records are excluded as a whole; partial brackets can misrepresent results.
export function normalizeProfile(value: unknown, documentId?: string): CommunityProfile | null {
  value = dates(value);
  if (!object(value) || !documentIdentity(value, documentId) || !text(value.name, 1, 100)
    || !text(value.bio, 0, 1000) || !text(value.city, 0, 100) || !text(value.country, 0, 100)
    || !text(value.position, 0, 100) || !text(value.team, 0, 100)
    || !enumValue(value.level, ['amateur', 'professional'] as const) || typeof value.adultConfirmed !== 'boolean'
    || !enumValue(value.verification, ['unverified', 'verified'] as const)
    || !enumValue(value.entityType, ['individual', 'group', 'club'] as const) || !date(value.createdAt)
    || !text(value.acceptedTermsVersion, 0, 40) || !text(value.acceptedTermsAt, 0, 40)
    || (value.acceptedTermsVersion === '' ? value.acceptedTermsAt !== '' : !date(value.acceptedTermsAt))) return null;
  return { id: value.id, name: value.name, bio: value.bio, city: value.city, country: value.country,
    position: value.position, team: value.team, level: value.level, adultConfirmed: value.adultConfirmed,
    verification: value.verification, entityType: value.entityType, createdAt: value.createdAt,
    acceptedTermsVersion: value.acceptedTermsVersion, acceptedTermsAt: value.acceptedTermsAt };
}

export function normalizePublicProfile(value: unknown, documentId?: string): PublicProfile | null {
  value = dates(value);
  if (!object(value) || !documentIdentity(value, documentId) || !text(value.name, 1, 100)
    || !text(value.bio, 0, 1000) || !text(value.city, 0, 100) || !text(value.country, 0, 100)
    || !text(value.position, 0, 100) || !text(value.team, 0, 100)
    || !enumValue(value.level, ['amateur', 'professional'] as const)
    || !enumValue(value.verification, ['unverified', 'verified'] as const)
    || !enumValue(value.entityType, ['individual', 'group', 'club'] as const) || !date(value.createdAt)) return null;
  return { id: value.id, name: value.name, bio: value.bio, city: value.city, country: value.country,
    position: value.position, team: value.team, level: value.level, verification: value.verification,
    entityType: value.entityType, createdAt: value.createdAt };
}
export function normalizeFollow(value: unknown, documentId?: string): FollowRecord | null {
  value = dates(value);
  if (!object(value) || !id(value.followerId) || !id(value.followingId) || value.followerId === value.followingId || !date(value.createdAt)) return null;
  const expectedId = `${value.followerId}_${value.followingId}`;
  if (documentId !== undefined && documentId !== expectedId || value.id !== undefined && value.id !== expectedId) return null;
  return { id: expectedId, followerId: value.followerId, followingId: value.followingId, createdAt: value.createdAt };
}

export function normalizeEvent(value: unknown, documentId?: string): PlayEvent | null {
  value = dates(value);
  if (!object(value) || !documentIdentity(value, documentId) || value.teamId !== undefined && value.teamId !== '' && !id(value.teamId) || !id(value.ownerId) || !text(value.ownerName, 1, 100)
    || !text(value.title, 1, 100) || value.visibility !== undefined && !enumValue(value.visibility, ['public', 'private'] as const) || !enumValue(value.type, ['match', 'tournament'] as const)
    || !enumValue(value.format, ['5', '7', '11'] as const) || !enumValue(value.level, ['amateur', 'professional'] as const)
    || !text(value.city, 1, 100) || !text(value.country, 1, 100) || !timeZone(value.timeZone)
    || !text(value.venue, 1, 200) || !date(value.startAt) || !integer(value.capacity, 2, value.type === 'tournament' ? 32 : 64)
    || !enumValue(value.entry, ['players', 'teams'] as const) || !text(value.description, 0, 2000)
    || !enumValue(value.status, ['open', 'closed', 'cancelled', 'completed'] as const)
    || !enumValue(value.tournamentFormat, ['league', 'knockout'] as const) || !date(value.createdAt)
    || !object(value.participants) || !Array.isArray(value.fixtures) || value.fixtures.length > 496) return null;
  if (value.fixtureIds !== undefined && (!Array.isArray(value.fixtureIds) || value.fixtureIds.length > 496 || !value.fixtureIds.every(id) || new Set(value.fixtureIds).size !== value.fixtureIds.length)) return null;
  const startAtMs = Date.parse(value.startAt);
  if (value.startAtMs !== undefined && (!integer(value.startAtMs, 0, Number.MAX_SAFE_INTEGER) || value.startAtMs !== startAtMs)) return null;
  const entries = Object.entries(value.participants);
  if (entries.length > value.capacity || entries.some(([uid, name]) => !id(uid) || !text(name, 1, 100))) return null;
  const participants: Record<string, string> = Object.fromEntries(entries) as Record<string, string>;
  const fixtureIds = new Set<string>();
  const fixtures: Fixture[] = [];
  for (const raw of value.fixtures) {
    if (!object(raw) || !id(raw.id) || fixtureIds.has(raw.id) || !integer(raw.round, 1, 64)
      || !id(raw.homeId) || !Object.hasOwn(participants, raw.homeId)
      || !(raw.awayId === '' || id(raw.awayId) && Object.hasOwn(participants, raw.awayId))
      || raw.homeId === raw.awayId || !score(raw.homeScore) || !score(raw.awayScore)
      || (raw.homeScore === null) !== (raw.awayScore === null)
      || raw.awayId === '' && (value.tournamentFormat !== 'knockout' || raw.homeScore !== null)
      || value.tournamentFormat === 'knockout' && raw.awayId !== '' && raw.homeScore !== null && raw.homeScore === raw.awayScore) return null;
    fixtureIds.add(raw.id);
    if (raw.startAt !== undefined && (!date(raw.startAt) || !timeZone(raw.timeZone) || !text(raw.venue, 1, 200))) return null;
    fixtures.push({ id: raw.id, round: raw.round, homeId: raw.homeId, awayId: raw.awayId, homeScore: raw.homeScore, awayScore: raw.awayScore, ...(raw.startAt === undefined ? {} : { startAt: raw.startAt as string, timeZone: raw.timeZone as string, venue: raw.venue as string }) });
  }
  return { id: value.id, ownerId: value.ownerId, ownerName: value.ownerName, title: value.title, visibility: value.visibility === 'private' ? 'private' : 'public', type: value.type,
    format: value.format, level: value.level, city: value.city, country: value.country, timeZone: value.timeZone,
    venue: value.venue, startAt: value.startAt, ...(value.startAtMs === undefined ? {} : { startAtMs }),
    capacity: value.capacity, entry: value.entry, description: value.description, status: value.status,
    tournamentFormat: value.tournamentFormat, participants, fixtures, createdAt: value.createdAt,
    ...(integer(value.revision, 0, Number.MAX_SAFE_INTEGER) ? { revision: value.revision } : {}),
    ...(date(value.updatedAt) ? { updatedAt: value.updatedAt } : {}),
    ...(Array.isArray(value.history) ? { history: value.history.slice(-50).map(item => dates(item)).filter((item): item is Data => object(item) && integer(item.revision, 1, Number.MAX_SAFE_INTEGER) && date(item.changedAt) && text(item.summary, 1, 500)).map(item => ({ revision: item.revision as number, changedAt: item.changedAt as string, summary: item.summary as string })) } : {}),
    ...(object(value.rsvps) ? { rsvps: Object.fromEntries(Object.entries(value.rsvps).filter(([uid, response]) => id(uid) && enumValue(response, ['yes', 'no', 'maybe'] as const))) as PlayEvent['rsvps'] } : {}),
    ...(object(value.waitlist) ? { waitlist: Object.fromEntries(Object.entries(value.waitlist).map(([uid, item]) => [uid, dates(item)]).filter(([uid, item]) => id(uid) && object(item) && text(item.name, 1, 100) && date(item.joinedAt))) as NonNullable<PlayEvent['waitlist']> } : {}),
    ...(Array.isArray(value.waitlistOrder) ? { waitlistOrder: value.waitlistOrder.filter(id).slice(0, 64) } : {}),
    participantIds: Object.keys(participants),
    ...(Array.isArray(value.fixtureIds) && value.fixtureIds.length <= 496 && value.fixtureIds.every(id) && new Set(value.fixtureIds).size === value.fixtureIds.length ? { fixtureIds: value.fixtureIds } : {}),
    ...(value.teamId === '' || id(value.teamId) ? { teamId: value.teamId } : {}),
    ...(object(value.result) && text(value.result.homeName, 1, 100) && text(value.result.awayName, 1, 100) && integer(value.result.homeScore, 0, 99) && integer(value.result.awayScore, 0, 99) ? { result: { homeName: value.result.homeName, awayName: value.result.awayName, homeScore: value.result.homeScore, awayScore: value.result.awayScore } } : {}) };
}

function publicMediaUrl(value: string, mediaPath: string): boolean {
  try {
    const url = new URL(value);
    const path = /^\/v0\/b\/[^/]+\/o\/(.+)$/.exec(url.pathname);
    return url.protocol === 'https:' && url.hostname === 'firebasestorage.googleapis.com'
      && url.username === '' && url.password === '' && path !== null && decodeURIComponent(path[1]) === mediaPath;
  } catch { return false; }
}
export function normalizePost(value: unknown, documentId?: string, mode: 'cloud' | 'demo' = 'cloud'): CommunityPost | null {
  value = dates(value);
  if (!object(value) || !documentIdentity(value, documentId) || !id(value.authorId) || !text(value.authorName, 1, 100)
    || !enumValue(value.kind, ['reel', 'photo', 'achievement'] as const) || !text(value.text, 1, 2000)
    || !text(value.title, 0, 100) || !text(value.mediaUrl, 0, 2000) || !text(value.mediaPath, 0, 400)
    || !date(value.createdAt) || !(value.eventId === '' || id(value.eventId))) return null;
  if (value.kind === 'achievement') {
    if (!text(value.title, 1, 100) || value.mediaUrl !== '' || value.mediaPath !== '') return null;
  } else if (mode === 'demo') {
    if (value.mediaPath !== `local:${value.id}` || value.mediaUrl !== '' && !value.mediaUrl.startsWith('blob:')) return null;
  } else {
    const prefix = `community/${value.authorId}/${value.id}`;
    const extensions = value.kind === 'reel' ? ['mp4', 'webm'] : ['jpg', 'png', 'webp'];
    if (!extensions.some(extension => value.mediaPath === `${prefix}.${extension}`) || !publicMediaUrl(value.mediaUrl, value.mediaPath)) return null;
  }
  return { id: value.id, authorId: value.authorId, authorName: value.authorName, kind: value.kind, text: value.text,
    title: value.title, mediaUrl: value.mediaUrl, mediaPath: value.mediaPath, createdAt: value.createdAt, eventId: value.eventId };
}
export function normalizeLike(value: unknown, documentId?: string): LikeRecord | null {
  value = dates(value);
  if (!object(value) || !id(value.postId) || !id(value.userId) || !date(value.createdAt)
    || documentId !== undefined && documentId !== `${value.postId}_${value.userId}`) return null;
  return { postId: value.postId, userId: value.userId, createdAt: value.createdAt };
}
export function normalizeComment(value: unknown, documentId?: string): PostComment | null {
  value = dates(value);
  if (!object(value) || !documentIdentity(value, documentId) || !id(value.authorId) || !text(value.authorName, 1, 100)
    || !text(value.text, 1, 1000) || !date(value.createdAt)) return null;
  return { id: value.id, authorId: value.authorId, authorName: value.authorName, text: value.text, createdAt: value.createdAt };
}
export function normalizeCommentRecord(value: unknown, documentId?: string): CommentRecord | null {
  const comment = normalizeComment(value, documentId);
  return comment && object(value) && id(value.postId) ? { ...comment, postId: value.postId } : null;
}
export function normalizeVerification(value: unknown, documentId?: string): VerificationRequest | null {
  value = dates(value);
  if (!object(value) || !documentIdentity(value, documentId) || value.userId !== value.id || !text(value.name, 1, 100)
    || !text(value.organization, 1, 100) || !text(value.evidence, 1, 2000)
    || !enumValue(value.status, ['pending', 'approved', 'rejected'] as const) || !date(value.createdAt)
    || (value.status === 'pending' ? value.reviewedAt !== '' : !date(value.reviewedAt))) return null;
  return { id: value.id, userId: value.id, name: value.name, organization: value.organization, evidence: value.evidence,
    status: value.status, createdAt: value.createdAt, reviewedAt: value.reviewedAt as string };
}
export function normalizeReport(value: unknown, documentId?: string): ContentReport | null {
  value = dates(value);
  if (!object(value) || !documentIdentity(value, documentId) || !id(value.reporterId) || !id(value.postId)
    || !text(value.reason, 1, 1000) || !enumValue(value.status, ['open', 'resolved'] as const) || !date(value.createdAt)) return null;
  return { id: value.id, reporterId: value.reporterId, postId: value.postId, reason: value.reason, status: value.status, createdAt: value.createdAt, ...(id(value.commentId) ? { commentId: value.commentId } : {}) };
}

export function normalizeRuntime(value: unknown): RuntimeConfig {
  const data = dates(value);
  return object(data) && enumValue(data.serviceStatus, ['setup', 'open', 'paused', 'pilot'] as const) && typeof data.mediaUploadsEnabled === 'boolean' && text(data.contactEmail, 0, 200) && date(data.updatedAt)
    && (data.serviceStatus === 'pilot' ? data.mediaUploadsEnabled === false && validPilotUserIds(data.pilotUserIds) : data.pilotUserIds === undefined)
    ? { serviceStatus: data.serviceStatus, mediaUploadsEnabled: data.mediaUploadsEnabled, contactEmail: data.contactEmail, updatedAt: data.updatedAt, ...(data.serviceStatus === 'pilot' ? { pilotUserIds: data.pilotUserIds as string[] } : {}) }
    : { serviceStatus: 'setup', mediaUploadsEnabled: false, contactEmail: '', updatedAt: '' };
}
export function normalizeNotice(value: unknown, documentId?: string): EventNotice | null {
  const data = dates(value);
  if (!object(data) || !documentIdentity(data, documentId) || !id(data.eventId) || !id(data.recipientId) || !integer(data.revision, 1, Number.MAX_SAFE_INTEGER) || !text(data.title, 1, 100) || !text(data.summary, 1, 500) || !date(data.createdAt) || !(data.readAt === '' || date(data.readAt))) return null;
  return { id: data.id, eventId: data.eventId, recipientId: data.recipientId, revision: data.revision, title: data.title, summary: data.summary, createdAt: data.createdAt, readAt: data.readAt, ...(data.kind === 'place' ? { kind: 'place' as const } : {}), ...(id(data.deliveryId) ? { deliveryId: data.deliveryId } : {}) };
}
export function normalizeRightsRequest(value: unknown, documentId?: string): RightsRequest | null {
  const data = dates(value);
  if (!object(data) || !documentIdentity(data, documentId) || !id(data.userId) || !enumValue(data.kind, ['export', 'delete'] as const) || !enumValue(data.status, ['pending', 'processing', 'completed', 'rejected'] as const) || !date(data.createdAt) || !(data.reviewedAt === '' || date(data.reviewedAt))) return null;
  return { id: data.id, userId: data.userId, kind: data.kind, status: data.status, createdAt: data.createdAt, reviewedAt: data.reviewedAt };
}

export function normalizeDemoData(value: unknown): DemoData {
  const data = object(value) ? value : {};
  const likes = dictionary<string[]>();
  if (object(data.likes)) for (const [postId, users] of Object.entries(data.likes)) {
    if (id(postId) && Array.isArray(users)) likes[postId] = [...new Set(users.filter(id))].slice(0, 1000);
  }
  const comments = dictionary<PostComment[]>();
  if (object(data.comments)) for (const [postId, entries] of Object.entries(data.comments)) {
    if (id(postId)) comments[postId] = list(entries, normalizeComment);
  }
  const profile = normalizeProfile(data.profile);
  const profiles = new Map(list(data.profiles, normalizeProfile).map(item => [item.id, item]));
  if (profile) profiles.set(profile.id, profile);
  const follows = new Map(list(data.follows, normalizeFollow).filter(item => profiles.has(item.followerId)).map(item => [item.id, item]));
  return { version: 1, profile, profiles: [...profiles.values()], follows: [...follows.values()], events: list(data.events, normalizeEvent),
    posts: list(data.posts, value => normalizePost(value, undefined, 'demo')), likes, comments,
    verifications: list(data.verifications, normalizeVerification), reports: list(data.reports, normalizeReport), blocked: object(data.blocked) ? Object.fromEntries(Object.entries(data.blocked).filter(([uid, values]) => id(uid) && Array.isArray(values)).map(([uid, values]) => [uid, (values as unknown[]).filter(id)])) : {}, notices: list(data.notices, normalizeNotice), rightsRequests: list(data.rightsRequests, normalizeRightsRequest) };
}

export function normalizeHiddenPostIds(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter(id))].slice(0, 1000) : [];
}
