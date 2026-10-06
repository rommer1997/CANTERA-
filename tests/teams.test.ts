import test from 'node:test';
import assert from 'node:assert/strict';
import { assertInvite, isTeamManager, memberId, safeReturnTo, validTeamInput } from '../src/community/teamLogic.ts';
import { canonicalCountry, normalizePlace } from '../src/community/geography.ts';
const team = { id: 'team1', ownerId: 'owner', name: 'Team', country: 'España', city: 'Madrid', description: '', level: 'amateur', status: 'active', createdAt: '', updatedAt: '' } as const;
test('Los enlaces caducados, revocados y de otros equipos no admiten incorporaciones', () => {
 const invite = { id: 'token', teamId: team.id, createdBy: 'owner', revoked: false, expiresAt: '2026-10-13T00:00:00Z', createdAt: '' };
 assert.doesNotThrow(() => assertInvite(invite, team, Date.parse('2026-10-06T00:00:00Z')));
 for (const input of [null, { ...invite, revoked: true }, { ...invite, teamId: 'other' }, { ...invite, expiresAt: 'invalid' }]) assert.throws(() => assertInvite(input, team, Date.parse('2026-10-06T00:00:00Z')));
 assert.throws(() => assertInvite(invite, team, Date.parse(invite.expiresAt)));
 assert.throws(() => assertInvite(invite, { ...team, status: 'archived' }, 0));
});
test('Retorno tras registro permite flujos internos y rechaza redirecciones externas', () => {
 for (const link of ['/play/event1', '/teams/join/token', '/play?create=1&type=match', '/feed?create=achievement']) assert.equal(safeReturnTo(link), link);
 for (const link of [null, 'https://evil.test', '//evil.test', '/\\evil', '/admin', '/profile', '/teams/x#external', '/play/\nsecret']) assert.equal(safeReturnTo(link), '');
});
test('La identidad del equipo no mezcla roles y limpia campos obligatorios', () => {
 assert.equal(memberId('team1', 'uid'), 'team1_uid'); assert.equal(isTeamManager('member'), false); assert.equal(isTeamManager('manager'), true);
 assert.equal(validTeamInput({ ...team, name: '  Grupo   amigos  ' }).name, 'Grupo amigos');
 assert.throws(() => validTeamInput({ ...team, city: ' ' })); assert.throws(() => validTeamInput({ ...team, name: 'x'.repeat(101) }));
});
test('Países comparten un nombre canónico sin perder acentos de presentación', () => {
 assert.equal(canonicalCountry('spain'), 'España'); assert.equal(canonicalCountry('es'), 'España'); assert.equal(canonicalCountry('EEUU'), 'Estados Unidos'); assert.equal(normalizePlace('  São  Paulo '), 'sao paulo');
});

test('Equipos malformados y campos privados no contaminan una lista pública', async () => {
 const { normalizeTeam, normalizeTeamMember, normalizeTeamInvite, normalizeTeamRequest } = await import('../src/community/teamNormalization.ts');
 const valid = { ...team, createdAt: '2026-10-06T00:00:00.000Z', updatedAt: '2026-10-06T00:00:00.000Z' };
 assert.equal(normalizeTeam({ ...valid, email: 'private@example.test' })?.name, 'Team'); assert.equal(Object.hasOwn(normalizeTeam({ ...valid, email: 'private@example.test' })!, 'email'), false);
 for (const input of [null, { ...valid, city: {} }, { ...valid, status: 'secret' }, { ...valid, createdAt: 'invalid' }, { ...valid, id: '__proto__' }]) assert.equal(normalizeTeam(input), null);
 assert.equal(normalizeTeamMember({ id: 'wrong', teamId: 'team1', userId: 'member', name: 'Member', role: 'member', joinedAt: valid.createdAt }), null);
 assert.equal(normalizeTeamInvite({ id: 'token', teamId: 'team1', createdBy: 'owner', revoked: false, createdAt: valid.createdAt, expiresAt: 'invalid' }), null);
 assert.equal(normalizeTeamRequest({ id: 'team1_member', teamId: 'team1', userId: 'member', name: 'Member', inviteId: '', status: 'pending', createdAt: valid.createdAt, reviewedAt: '' })?.status, 'pending');
});
