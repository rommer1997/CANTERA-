import type { DemoData } from './local';
import type { CommunityPost, CommunityProfile, ContentReport, Fixture, PlayEvent, PostComment, VerificationRequest } from './types';

type Data = Record<string, unknown>;
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

export function normalizeEvent(value: unknown, documentId?: string): PlayEvent | null {
  if (!object(value) || !documentIdentity(value, documentId) || !id(value.ownerId) || !text(value.ownerName, 1, 100)
    || !text(value.title, 1, 100) || !enumValue(value.type, ['match', 'tournament'] as const)
    || !enumValue(value.format, ['5', '7', '11'] as const) || !enumValue(value.level, ['amateur', 'professional'] as const)
    || !text(value.city, 1, 100) || !text(value.country, 1, 100) || !timeZone(value.timeZone)
    || !text(value.venue, 1, 200) || !date(value.startAt) || !integer(value.capacity, 2, value.type === 'tournament' ? 32 : 64)
    || !enumValue(value.entry, ['players', 'teams'] as const) || !text(value.description, 0, 2000)
    || !enumValue(value.status, ['open', 'closed', 'cancelled'] as const)
    || !enumValue(value.tournamentFormat, ['league', 'knockout'] as const) || !date(value.createdAt)
    || !object(value.participants) || !Array.isArray(value.fixtures) || value.fixtures.length > 496) return null;
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
    fixtures.push({ id: raw.id, round: raw.round, homeId: raw.homeId, awayId: raw.awayId, homeScore: raw.homeScore, awayScore: raw.awayScore });
  }
  return { id: value.id, ownerId: value.ownerId, ownerName: value.ownerName, title: value.title, type: value.type,
    format: value.format, level: value.level, city: value.city, country: value.country, timeZone: value.timeZone,
    venue: value.venue, startAt: value.startAt, ...(value.startAtMs === undefined ? {} : { startAtMs }),
    capacity: value.capacity, entry: value.entry, description: value.description, status: value.status,
    tournamentFormat: value.tournamentFormat, participants, fixtures, createdAt: value.createdAt };
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
  if (!object(value) || !id(value.postId) || !id(value.userId) || !date(value.createdAt)
    || documentId !== undefined && documentId !== `${value.postId}_${value.userId}`) return null;
  return { postId: value.postId, userId: value.userId, createdAt: value.createdAt };
}
export function normalizeComment(value: unknown, documentId?: string): PostComment | null {
  if (!object(value) || !documentIdentity(value, documentId) || !id(value.authorId) || !text(value.authorName, 1, 100)
    || !text(value.text, 1, 1000) || !date(value.createdAt)) return null;
  return { id: value.id, authorId: value.authorId, authorName: value.authorName, text: value.text, createdAt: value.createdAt };
}
export function normalizeCommentRecord(value: unknown, documentId?: string): CommentRecord | null {
  const comment = normalizeComment(value, documentId);
  return comment && object(value) && id(value.postId) ? { ...comment, postId: value.postId } : null;
}
export function normalizeVerification(value: unknown, documentId?: string): VerificationRequest | null {
  if (!object(value) || !documentIdentity(value, documentId) || value.userId !== value.id || !text(value.name, 1, 100)
    || !text(value.organization, 1, 100) || !text(value.evidence, 1, 2000)
    || !enumValue(value.status, ['pending', 'approved', 'rejected'] as const) || !date(value.createdAt)
    || (value.status === 'pending' ? value.reviewedAt !== '' : !date(value.reviewedAt))) return null;
  return { id: value.id, userId: value.id, name: value.name, organization: value.organization, evidence: value.evidence,
    status: value.status, createdAt: value.createdAt, reviewedAt: value.reviewedAt as string };
}
export function normalizeReport(value: unknown, documentId?: string): ContentReport | null {
  if (!object(value) || !documentIdentity(value, documentId) || !id(value.reporterId) || !id(value.postId)
    || !text(value.reason, 1, 1000) || !enumValue(value.status, ['open', 'resolved'] as const) || !date(value.createdAt)) return null;
  return { id: value.id, reporterId: value.reporterId, postId: value.postId, reason: value.reason, status: value.status, createdAt: value.createdAt };
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
  return { version: 1, profile: normalizeProfile(data.profile), events: list(data.events, normalizeEvent),
    posts: list(data.posts, value => normalizePost(value, undefined, 'demo')), likes, comments,
    verifications: list(data.verifications, normalizeVerification), reports: list(data.reports, normalizeReport) };
}

export function normalizeHiddenPostIds(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter(id))].slice(0, 1000) : [];
}
