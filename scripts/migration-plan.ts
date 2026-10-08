import { normalizePublicProfile, profileSearchTokens } from '../src/community/normalization.ts';

// Only metadata used by the current SDK is migrated. Scheduling dates and the
// visible history cache remain ISO; no account, fixture, result or consent is invented.
const dateFields = {
  communityProfiles: ['createdAt', 'acceptedTermsAt'],
  communityPublicProfiles: ['createdAt'],
  communityEvents: ['createdAt', 'updatedAt'],
  communityPosts: ['createdAt'],
  communityFollows: ['createdAt'],
  communityLikes: ['createdAt'],
  communityComments: ['createdAt'],
  communityReports: ['createdAt'],
  communityBlocks: ['createdAt'],
  communityVerifications: ['createdAt', 'reviewedAt'],
  communityRightsRequests: ['createdAt', 'reviewedAt'],
  communityEventChanges: ['createdAt'],
  communityEventNotices: ['createdAt', 'readAt'],
  communityConfiguration: ['updatedAt'],
  communityAccountModeration: ['updatedAt'],
  communityTeams: ['createdAt', 'updatedAt'],
  communityTeamMembers: ['joinedAt'],
  communityTeamInvites: ['createdAt', 'expiresAt'],
  communityTeamJoinRequests: ['createdAt', 'reviewedAt'],
} as const;

export type MigrationCollection = keyof typeof dateFields;
export const MIGRATION_COLLECTIONS: readonly MigrationCollection[] = Object.freeze(Object.keys(dateFields) as MigrationCollection[]);
export interface TimestampParts { seconds: number; nanoseconds: number }
export type MigrationPatch = { path: string[]; type: 'timestamp'; value: TimestampParts }
  | { path: string[]; type: 'value'; value: string[] };
export interface MigrationIssue { code: string; path: string[] }
export interface MigrationPlan { patches: MigrationPatch[]; issues: MigrationIssue[]; blocked: boolean }

const publicFields = new Set(['id', 'name', 'bio', 'city', 'country', 'position', 'team', 'level', 'verification', 'entityType', 'createdAt', 'searchTokens']);
const emptyDates = new Set(['acceptedTermsAt', 'reviewedAt', 'readAt']);
const minimumSeconds = -62135596800; // Firestore Timestamp year 0001.
const maximumSeconds = 253402300799; // Firestore Timestamp year 9999.

function record(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}
function safeDocumentId(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0 && new TextEncoder().encode(value).length <= 1500
    && !['__proto__', 'constructor', 'prototype', '.', '..'].includes(value)
    && !/[\/\\\u0000-\u001f\u007f]/.test(value);
}
function safeId(value: string): boolean { return safeDocumentId(value) && value.length <= 128; }
function timestamp(value: unknown): value is TimestampParts & { toDate(): Date } {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as TimestampParts & { toDate?: unknown };
  return typeof candidate.toDate === 'function' && Number.isSafeInteger(candidate.seconds)
    && candidate.seconds >= minimumSeconds && candidate.seconds <= maximumSeconds
    && Number.isInteger(candidate.nanoseconds) && candidate.nanoseconds >= 0 && candidate.nanoseconds < 1e9;
}

// Date.parse accepts rollover dates and loses submillisecond precision. Parse the
// calendar and zone explicitly, retaining up to all nine Timestamp fraction digits.
export function isoTimestamp(value: unknown): TimestampParts | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction = '', zone] = match;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  calendar.setUTCHours(hour, minute, second, 0);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) return null;
  let offsetMinutes = 0;
  if (zone !== 'Z') {
    const zoneHours = Number(zone.slice(1, 3)); const zoneMinutes = Number(zone.slice(4, 6));
    // ISO 8601 real-world zones range through ±14:00. Unknown local offsets are
    // not interpreted as consent or an authoritative server instant.
    if (zoneHours > 14 || zoneMinutes > 59 || zoneHours === 14 && zoneMinutes !== 0 || zone === '-00:00') return null;
    offsetMinutes = (zoneHours * 60 + zoneMinutes) * (zone[0] === '-' ? -1 : 1);
  }
  const seconds = calendar.getTime() / 1000 - offsetMinutes * 60;
  if (!Number.isSafeInteger(seconds) || seconds < minimumSeconds || seconds > maximumSeconds) return null;
  return { seconds, nanoseconds: Number(fraction.padEnd(9, '0')) };
}

function equalArray(current: unknown, expected: string[]): boolean {
  return Array.isArray(current) && current.length === expected.length && current.every((item, index) => item === expected[index]);
}

export function planMigration(collection: string, documentId: string, source: unknown): MigrationPlan {
  const patches: MigrationPatch[] = []; const issues: MigrationIssue[] = [];
  const issue = (code: string, path: string[]) => { issues.push({ code, path }); };
  if (!Object.hasOwn(dateFields, collection) || !safeDocumentId(documentId) || !record(source)) {
    return { patches, issues: [{ code: 'INVALID_DOCUMENT', path: [] }], blocked: true };
  }
  if (collection === 'communityPublicProfiles' && Object.keys(source).some(key => !publicFields.has(key))) {
    // Never legitimize or copy a projection carrying private fields. Its cleanup
    // belongs to a separate audited projection operation, not this migration.
    return { patches, issues: [{ code: 'PUBLIC_FIELDS_OUTSIDE_ALLOWLIST', path: [] }], blocked: true };
  }
  const migrateDate = (value: unknown, path: string[], required = false) => {
    if (value === undefined && !required || value === '' && emptyDates.has(path.at(-1)!)) return;
    if (timestamp(value)) return;
    const parts = isoTimestamp(value);
    if (!parts) { issue(value === undefined ? 'MISSING_REQUIRED_DATE' : 'INVALID_DATE', path); return; }
    patches.push({ path, type: 'timestamp', value: parts });
  };
  for (const field of dateFields[collection as MigrationCollection]) {
    migrateDate(source[field], [field], field === 'createdAt' || field === 'joinedAt' || field === 'expiresAt'
      || field === 'updatedAt' && ['communityTeams', 'communityConfiguration', 'communityAccountModeration'].includes(collection));
  }

  if (collection === 'communityPublicProfiles') {
    const created = timestamp(source.createdAt) ? source.createdAt : isoTimestamp(source.createdAt);
    // This is validation of an EXISTING public projection, never a projection of
    // communityProfiles. The final update contains tokens, not identity fields.
    const profile = created ? normalizePublicProfile({ ...source, createdAt: new Date(created.seconds * 1000 + Math.floor(created.nanoseconds / 1e6)).toISOString() }, documentId) : null;
    if (!profile) issue('INVALID_PUBLIC_PROFILE', []);
    else {
      const tokens = profileSearchTokens(profile);
      if (!equalArray(source.searchTokens, tokens)) patches.push({ path: ['searchTokens'], type: 'value', value: tokens });
    }
  }
  if (collection === 'communityEvents') {
    if (!record(source.participants) || Object.entries(source.participants).length > 64
      || Object.entries(source.participants).some(([uid, name]) => !safeId(uid) || typeof name !== 'string' || !name.trim() || name.length > 100)) {
      issue('INVALID_PARTICIPANTS', ['participants']);
    } else {
      const ids = Object.keys(source.participants);
      // Preserve the order of an already valid index; ordering carries no query
      // meaning. Fix a missing/stale index from the authoritative participant map.
      const current = source.participantIds;
      const sameMembers = Array.isArray(current) && current.length === ids.length && new Set(current).size === ids.length
        && current.every(uid => typeof uid === 'string' && ids.includes(uid));
      if (!sameMembers) patches.push({ path: ['participantIds'], type: 'value', value: ids });
    }
    if (source.waitlist !== undefined) {
      if (!record(source.waitlist) || Object.entries(source.waitlist).length > 64) issue('INVALID_WAITLIST', ['waitlist']);
      else for (const [uid, entry] of Object.entries(source.waitlist)) {
        if (!safeId(uid) || !record(entry)) { issue('INVALID_WAITLIST', ['waitlist']); continue; }
        migrateDate(entry.joinedAt, ['waitlist', uid, 'joinedAt'], true);
      }
    }
  }
  // No partial repair of malformed records: the operator receives aggregate
  // issue counts and can audit originals without dates or private fields in logs.
  return { patches: issues.length ? [] : patches, issues, blocked: issues.length > 0 };
}
