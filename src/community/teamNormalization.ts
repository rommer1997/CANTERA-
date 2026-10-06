import type { CommunityTeam, TeamInvite, TeamJoinRequest, TeamMember } from './teamTypes';
type RecordData = Record<string, unknown>;
const object = (v: unknown): v is RecordData => Boolean(v && typeof v === 'object' && !Array.isArray(v));
const text = (v: unknown, min: number, max: number): v is string => typeof v === 'string' && v.trim().length >= min && v.length <= max;
const identifier = (v: unknown, max = 128): v is string => text(v, 1, max) && !/[\/\\\u0000-\u001f\u007f]/.test(v) && !['__proto__', 'constructor', 'prototype', '.', '..'].includes(v);
function iso(v: unknown): string { try { const s = object(v) && typeof v.toDate === 'function' ? (v.toDate as () => Date)().toISOString() : v; return typeof s === 'string' && new Date(s).toISOString() === s ? s : ''; } catch { return ''; } }
export function normalizeTeam(v: unknown, id?: string): CommunityTeam | null {
 if (!object(v) || !identifier(v.id) || id !== undefined && id !== v.id || !identifier(v.ownerId) || !text(v.name, 1, 100) || !text(v.country, 1, 100) || !text(v.city, 1, 100) || !text(v.description, 0, 2000) || !['amateur', 'professional'].includes(v.level as string) || !['active', 'archived'].includes(v.status as string) || !iso(v.createdAt) || !iso(v.updatedAt)) return null;
 return { id: v.id, ownerId: v.ownerId, name: v.name, country: v.country, city: v.city, description: v.description, level: v.level as CommunityTeam['level'], status: v.status as CommunityTeam['status'], createdAt: iso(v.createdAt), updatedAt: iso(v.updatedAt) };
}
export function normalizeTeamMember(v: unknown, id?: string): TeamMember | null {
 if (!object(v) || !identifier(v.teamId) || !identifier(v.userId) || !identifier(v.id, 257) || v.id !== `${v.teamId}_${v.userId}` || id !== undefined && v.id !== id || !text(v.name, 1, 100) || !['owner', 'manager', 'member'].includes(v.role as string) || !iso(v.joinedAt)) return null;
 return { id: v.id, teamId: v.teamId, userId: v.userId, name: v.name, role: v.role as TeamMember['role'], joinedAt: iso(v.joinedAt) };
}
export function normalizeTeamInvite(v: unknown, id?: string): TeamInvite | null {
 if (!object(v) || !identifier(v.id) || id !== undefined && v.id !== id || !identifier(v.teamId) || !identifier(v.createdBy) || typeof v.revoked !== 'boolean' || !iso(v.createdAt) || !iso(v.expiresAt)) return null;
 return { id: v.id, teamId: v.teamId, createdBy: v.createdBy, revoked: v.revoked, createdAt: iso(v.createdAt), expiresAt: iso(v.expiresAt) };
}
export function normalizeTeamRequest(v: unknown, id?: string): TeamJoinRequest | null {
 if (!object(v) || !identifier(v.id, 257) || id !== undefined && v.id !== id || !identifier(v.teamId) || !identifier(v.userId) || v.id !== `${v.teamId}_${v.userId}` || !text(v.name, 1, 100) || !(v.inviteId === '' || identifier(v.inviteId)) || !['pending', 'approved', 'rejected'].includes(v.status as string) || !iso(v.createdAt) || !(v.reviewedAt === '' || iso(v.reviewedAt))) return null;
 return { id: v.id, teamId: v.teamId, userId: v.userId, name: v.name, inviteId: v.inviteId as string, status: v.status as TeamJoinRequest['status'], createdAt: iso(v.createdAt), reviewedAt: iso(v.reviewedAt) };
}
