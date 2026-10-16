import {
  generateInvitationCode, InvitationError, normalizeConnection, normalizeInvitation,
  normalizeInvitationCode, validateInvitationAcceptance,
} from './invitations.ts';
import type { CommunityConnection, CommunityInvitation, InvitationActor, InvitationKind } from './invitationTypes';

export interface InvitationDemoData {
  invitations: CommunityInvitation[];
  connections: CommunityConnection[];
}

const key = 'cantera-invitations-v1';
const empty = (): InvitationDemoData => ({ invitations: [], connections: [] });
const safeId = (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0 && id.length <= 128
  && !['__proto__', 'constructor', 'prototype', '.', '..'].includes(id) && !/[\/\\\u0000-\u001f\u007f]/.test(id);

function normalizeData(value: unknown): InvitationDemoData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return empty();
  const data = value as Record<string, unknown>;
  const invitations = new Map<string, CommunityInvitation>();
  const connections = new Map<string, CommunityConnection>();
  if (Array.isArray(data.invitations)) for (const raw of data.invitations) {
    const invite = normalizeInvitation(raw);
    if (invite && !invitations.has(invite.id)) invitations.set(invite.id, invite);
  }
  if (Array.isArray(data.connections)) for (const raw of data.connections) {
    const connection = normalizeConnection(raw);
    const identity = connection && JSON.stringify([connection.ownerId, connection.peerId]);
    if (connection && !connections.has(identity!)) connections.set(identity!, connection);
  }
  return { invitations: [...invitations.values()], connections: [...connections.values()] };
}

export function readInvitationDemo(): InvitationDemoData {
  try { return normalizeData(JSON.parse(localStorage.getItem(key) || '{}')); }
  catch { return empty(); }
}

export function writeInvitationDemo(data: InvitationDemoData): void {
  try { localStorage.setItem(key, JSON.stringify(normalizeData(data))); }
  catch { throw new InvitationError('unavailable'); }
  window.dispatchEvent(new Event('cantera-invitations-updated'));
}

function invitation(data: InvitationDemoData, value: string): CommunityInvitation {
  const code = normalizeInvitationCode(value);
  if (!code) throw new InvitationError('invalid-code');
  const current = data.invitations.find(item => item.id === code);
  if (!current) throw new InvitationError('unavailable');
  return current;
}

function verifiedActor(actor: InvitationActor): void {
  if (!safeId(actor.userId)) throw new InvitationError('signin-required');
  if (actor.emailVerified !== true) throw new InvitationError('email-verification-required');
}

function consumed(invite: CommunityInvitation, actor: InvitationActor): CommunityInvitation {
  return { ...invite, status: 'used', usedBy: actor.userId, usedAt: new Date(actor.now ?? Date.now()).toISOString() };
}

function replaceInvitation(data: InvitationDemoData, invite: CommunityInvitation): InvitationDemoData {
  return { ...data, invitations: data.invitations.map(item => item.id === invite.id ? invite : item) };
}

export function createDemoInvitation(ownerId: string, kind: InvitationKind, eventId = ''): CommunityInvitation {
  const data = readInvitationDemo();
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = generateInvitationCode();
    if (data.invitations.some(item => item.id === id)) continue;
    const current = normalizeInvitation({ id, ownerId, kind, eventId, status: 'active', createdAt: new Date().toISOString(), usedBy: '', usedAt: '' });
    if (!current) throw new InvitationError('unavailable');
    writeInvitationDemo({ ...data, invitations: [...data.invitations, current] });
    return current;
  }
  throw new InvitationError('unavailable');
}

export function revokeDemoInvitation(value: string, ownerId: string): CommunityInvitation {
  const data = readInvitationDemo();
  const current = invitation(data, value);
  if (current.ownerId !== ownerId || current.status === 'used') throw new InvitationError('unavailable');
  if (current.status === 'revoked') return current;
  const revoked = { ...current, status: 'revoked' as const };
  writeInvitationDemo(replaceInvitation(data, revoked));
  return revoked;
}

export function acceptDemoConnection(value: string, actor: InvitationActor): CommunityInvitation {
  verifiedActor(actor);
  const data = readInvitationDemo();
  const current = invitation(data, value);
  if (current.kind !== 'connection') throw new InvitationError('unavailable');
  const forward = data.connections.some(item => item.ownerId === current.ownerId && item.peerId === actor.userId);
  const reverse = data.connections.some(item => item.ownerId === actor.userId && item.peerId === current.ownerId);
  if (current.status === 'used' && current.usedBy === actor.userId && forward && reverse) return current;
  validateInvitationAcceptance(current, actor);
  // An existing or incomplete relationship must never be overwritten by a code.
  if (forward || reverse) throw new InvitationError('unavailable');
  const used = consumed(current, actor);
  const pair: CommunityConnection[] = [
    { ownerId: current.ownerId, peerId: actor.userId, inviteId: current.id, createdAt: used.usedAt },
    { ownerId: actor.userId, peerId: current.ownerId, inviteId: current.id, createdAt: used.usedAt },
  ];
  // Both edges and the consumed code share one storage write in this browser.
  writeInvitationDemo({ ...replaceInvitation(data, used), connections: [...data.connections, ...pair] });
  return used;
}

export function removeDemoConnection(ownerId: string, peerId: string): void {
  if (!safeId(ownerId) || !safeId(peerId) || ownerId === peerId) throw new InvitationError('unavailable');
  const data = readInvitationDemo();
  const connections = data.connections.filter(item => !(item.ownerId === ownerId && item.peerId === peerId || item.ownerId === peerId && item.peerId === ownerId));
  if (connections.length !== data.connections.length) writeInvitationDemo({ ...data, connections });
}

// This is a local demo bridge, not a cross-store or cross-tab transaction. The
// caller verifies current profiles and validates/commits the event synchronously.
// A previously used code is idempotent only after the caller checks membership.
export function commitDemoEventInvitation(value: string, actor: InvitationActor, updateEvent: (invite: CommunityInvitation) => void): CommunityInvitation {
  verifiedActor(actor);
  const data = readInvitationDemo();
  const current = invitation(data, value);
  if (current.kind !== 'event') throw new InvitationError('unavailable');
  if (current.status === 'used' && current.usedBy === actor.userId) return current;
  validateInvitationAcceptance(current, actor);
  const result: unknown = updateEvent({ ...current });
  if (result && (typeof result === 'object' || typeof result === 'function') && typeof (result as { then?: unknown }).then === 'function') throw new InvitationError('unavailable');
  // Preserve unrelated invitations added by local update listeners. Never undo
  // a revocation or consumption that occurred reentrantly during the callback.
  const latest = readInvitationDemo();
  const stillActive = latest.invitations.find(item => item.id === current.id);
  if (!stillActive || stillActive.status !== 'active' || stillActive.ownerId !== current.ownerId || stillActive.kind !== current.kind || stillActive.eventId !== current.eventId || stillActive.createdAt !== current.createdAt) throw new InvitationError('unavailable');
  const used = consumed(current, actor);
  writeInvitationDemo(replaceInvitation(latest, used));
  return used;
}
