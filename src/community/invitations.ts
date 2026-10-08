import type { CommunityConnection, CommunityInvitation, InvitationActor, InvitationErrorCode } from './invitationTypes';

// Each symbol contributes five random bits: sixteen symbols carry eighty bits.
// The alphabet omits 0, 1, I and O so codes remain readable when shared aloud.
export const INVITATION_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const INVITATION_CODE_LENGTH = 16;
export const INVITATION_TTL_MS = 10 * 60 * 1000;
const codePattern = /^[2-9A-HJ-NP-Z]{16}$/;

const messages: Record<InvitationErrorCode, string> = {
  'invalid-code': 'Introduce un código válido de 16 caracteres.',
  unavailable: 'Esta invitación no está disponible. Pide un código nuevo a quien te invita.',
  'signin-required': 'Entra en tu cuenta para usar la invitación.',
  'email-verification-required': 'Verifica tu correo para usar la invitación.',
  'self-invitation': 'Comparte este código con otra persona; no puedes usar tu propia invitación.',
  'secure-random-unavailable': 'No se ha podido crear un código seguro. Prueba desde un navegador actualizado.',
};

export class InvitationError extends Error {
  readonly code: InvitationErrorCode;
  constructor(code: InvitationErrorCode) {
    super(messages[code]);
    this.name = 'InvitationError';
    this.code = code;
  }
}

// Never return provider errors or distinguish an absent, expired or revoked code.
// This message can be displayed before the recipient has access to a private event.
export function safeInvitationError(error: unknown): string {
  return error instanceof InvitationError && Object.hasOwn(messages, error.code) ? messages[error.code] : messages.unavailable;
}

export function generateInvitationCode(fill: (bytes: Uint8Array) => Uint8Array = bytes => {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') throw new InvitationError('secure-random-unavailable');
  return globalThis.crypto.getRandomValues(bytes);
}): string {
  const bytes = new Uint8Array(INVITATION_CODE_LENGTH);
  fill(bytes);
  // 32 divides 256 exactly, so masking random bytes does not bias any symbol.
  return Array.from(bytes, byte => INVITATION_CODE_ALPHABET[byte & 31]).join('');
}

export function normalizeInvitationCode(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 128 || !/^[2-9A-HJ-NP-Za-hj-np-z -]+$/.test(value)) return null;
  const code = value.replace(/[ -]/g, '').toUpperCase();
  return codePattern.test(code) ? code : null;
}

export function formatInvitationCode(value: string): string {
  const code = normalizeInvitationCode(value);
  if (!code) throw new InvitationError('invalid-code');
  return code.match(/.{4}/g)!.join(' ');
}

export function invitationLink(value: string, origin: string): string {
  const code = normalizeInvitationCode(value);
  if (!code) throw new InvitationError('invalid-code');
  let url: URL;
  try { url = new URL(origin); } catch { throw new InvitationError('unavailable'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new InvitationError('unavailable');
  return `${url.origin}/#/invite/${code}`;
}

function timestamp(value: unknown): string | null {
  try {
    const raw = value as { toDate?: () => Date } | null;
    const iso = raw && typeof raw.toDate === 'function' ? raw.toDate().toISOString() : value;
    return typeof iso === 'string' && iso.length <= 40 && new Date(iso).toISOString() === iso ? iso : null;
  } catch { return null; }
}

function identifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 128
    && !['__proto__', 'constructor', 'prototype', '.', '..'].includes(value)
    && !/[\/\\\u0000-\u001f\u007f]/.test(value);
}

export function invitationExpiresAt(createdAt: number | string | Date): string {
  const iso = typeof createdAt === 'string' ? timestamp(createdAt) : null;
  const epoch = createdAt instanceof Date ? createdAt.getTime() : typeof createdAt === 'number' ? createdAt : iso ? Date.parse(iso) : NaN;
  if (!Number.isSafeInteger(epoch) || epoch < 0 || !Number.isFinite(new Date(epoch + INVITATION_TTL_MS).getTime())) throw new InvitationError('unavailable');
  return new Date(epoch + INVITATION_TTL_MS).toISOString();
}

export function invitationSecondsRemaining(expiresAt: string, now = Date.now()): number {
  const expiry = timestamp(expiresAt);
  if (!expiry || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.ceil((Date.parse(expiry) - now) / 1000));
}

export function formatInvitationCountdown(seconds: number): string {
  const remaining = Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0;
  return `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
}

export function normalizeInvitation(value: unknown, documentId?: string): CommunityInvitation | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const createdAt = timestamp(data.createdAt);
  const createdAtMs = createdAt ? Date.parse(createdAt) : NaN;
  const usedAt = data.usedAt === '' ? '' : timestamp(data.usedAt);
  if (typeof data.id !== 'string' || !codePattern.test(data.id) || documentId !== undefined && documentId !== data.id
    || !['connection', 'event'].includes(data.kind as string) || !identifier(data.ownerId)
    || (data.kind === 'connection' ? data.eventId !== '' : !identifier(data.eventId))
    || !['active', 'used', 'revoked'].includes(data.status as string) || !createdAt
    || createdAtMs < 0 || !Number.isFinite(new Date(createdAtMs + INVITATION_TTL_MS).getTime())
    || (data.status === 'used' ? !identifier(data.usedBy) || data.usedBy === data.ownerId || !usedAt || Date.parse(usedAt) < createdAtMs || Date.parse(usedAt) >= createdAtMs + INVITATION_TTL_MS : data.usedBy !== '' || usedAt !== '')) return null;
  return { id: data.id, kind: data.kind as CommunityInvitation['kind'], ownerId: data.ownerId,
    eventId: data.eventId as string, status: data.status as CommunityInvitation['status'], createdAt,
    usedBy: data.usedBy as string, usedAt: usedAt as string };
}

// The document path contains both user IDs, so underscores in either UID cannot
// create the collisions that a concatenated relationship ID would permit.
export function normalizeConnection(value: unknown, ownerId?: string, peerId?: string): CommunityConnection | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const createdAt = timestamp(data.createdAt);
  if (!identifier(data.ownerId) || !identifier(data.peerId) || data.ownerId === data.peerId
    || ownerId !== undefined && data.ownerId !== ownerId || peerId !== undefined && data.peerId !== peerId
    || typeof data.inviteId !== 'string' || !codePattern.test(data.inviteId) || !createdAt) return null;
  return { ownerId: data.ownerId, peerId: data.peerId, inviteId: data.inviteId, createdAt };
}

// The backend transaction and rules repeat these checks with server time. This
// helper improves feedback; it never authorizes a write on its own.
export function validateInvitationAcceptance(invitation: CommunityInvitation | null, actor: InvitationActor): void {
  if (!identifier(actor.userId)) throw new InvitationError('signin-required');
  if (actor.emailVerified !== true) throw new InvitationError('email-verification-required');
  const current = normalizeInvitation(invitation);
  const now = actor.now ?? Date.now();
  if (!current || current.status !== 'active' || !Number.isFinite(now) || now < Date.parse(current.createdAt) || now >= Date.parse(current.createdAt) + INVITATION_TTL_MS) throw new InvitationError('unavailable');
  if (current.ownerId === actor.userId) throw new InvitationError('self-invitation');
}
