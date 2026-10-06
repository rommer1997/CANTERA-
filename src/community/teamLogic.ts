import type { CommunityTeam, TeamInput, TeamInvite } from './teamTypes';
export const memberId = (teamId: string, userId: string) => `${teamId}_${userId}`;
export const isTeamManager = (role?: string) => role === 'owner' || role === 'manager';
export function validTeamInput(input: TeamInput): TeamInput {
  const text = (value: string, label: string, max: number) => {
    const clean = value.trim().replace(/\s+/g, ' ');
    if (!clean || clean.length > max) throw new Error(`${label} debe tener entre 1 y ${max} caracteres.`);
    return clean;
  };
  if (!['amateur', 'professional'].includes(input.level)) throw new Error('Elige un nivel válido.');
  return { name: text(input.name, 'El nombre', 100), country: text(input.country, 'El país', 100), city: text(input.city, 'La ciudad', 100), description: input.description.trim().slice(0, 1000), level: input.level };
}
export function assertInvite(invite: TeamInvite | null, team: CommunityTeam | null, now = Date.now()) {
  if (!invite || !team || invite.teamId !== team.id || invite.revoked || team.status !== 'active' || !Number.isFinite(Date.parse(invite.expiresAt)) || Date.parse(invite.expiresAt) <= now) throw new Error('Esta invitación ha caducado o ya no está disponible. Pide un enlace nuevo al organizador.');
}
export function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return '';
  if (!/^\/(play(?:\/[^?/#]+)?|teams(?:\/(?:join\/)?[^?/#]+)?|feed|people(?:\/[^?/#]+)?)(?:\?[^#]*)?$/.test(value)) return '';
  return value;
}
