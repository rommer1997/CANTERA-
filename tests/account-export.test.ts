import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { accountQueryPolicies, assertExportUid, buildAccountExport, exportCollections, projectAuthIdentity, type AccountExportSource, type ExportRecord } from '../scripts/account-export.ts';
const cli = createRequire(import.meta.url)('../scripts/export-account.cjs');
const uid = 'self.with.dot';
const timestamp = { toDate: () => new Date('2026-10-06T12:00:00.000Z') };
const row = (id: string, data: Record<string, unknown>): ExportRecord => ({ id, data });
const source = (extra: Partial<AccountExportSource> = {}): AccountExportSource => ({ uid, projectId: 'demo-cantera', databaseId: 'test', startedAt: '2026-10-06T12:00:00.000Z', completedAt: '2026-10-06T12:01:00.000Z', ...extra });

test('identidad Auth mantiene datos propios y excluye contraseñas, claims y credenciales OAuth', () => {
  const auth = projectAuthIdentity({ uid, email: 'propio@example.invalid', emailVerified: true, disabled: false, customClaims: { admin: true }, passwordHash: 'SECRET_HASH', passwordSalt: 'SECRET_SALT', refreshToken: 'SECRET_REFRESH', metadata: { creationTime: 'date', lastSignInTime: 'date2', credential: 'SECRET_METADATA' }, providerData: [{ uid: 'provider-id', providerId: 'google.com', email: 'propio@example.invalid', accessToken: 'SECRET_OAUTH' }], multiFactor: { enrolledFactors: [{ uid: 'factor-id', factorId: 'phone', phoneNumber: '+100000000', secret: 'SECRET_FACTOR' }] } }, uid)!;
  assert.equal(auth.email, 'propio@example.invalid');
  assert.equal(auth.emailVerified, true);
  assert.ok(!JSON.stringify(auth).includes('SECRET'));
  assert.ok(!Object.hasOwn(auth, 'customClaims'));
  assert.deepEqual(auth.providers, [{ uid: 'provider-id', providerId: 'google.com', email: 'propio@example.invalid' }]);
  assert.equal(projectAuthIdentity(null, uid), null);
  assert.throws(() => projectAuthIdentity({ uid: 'other' }, uid), /no corresponde/);
});

test('exportación no exige aceptar términos nuevos y filtra autoría de cada colección', () => {
  const collections = Object.fromEntries(exportCollections.map(name => {
    const field = accountQueryPolicies[name];
    return [name, [row(`${name}-mine`, { [field]: uid, createdAt: timestamp, text: 'Propio', extraPrivate: 'SECRET_EXTRA' }), row(`${name}-other`, { [field]: 'other', text: 'SECRET_OTHER' })]];
  }));
  const result = buildAccountExport(source({ privateProfile: row(uid, { id: uid, name: 'Persona', adultConfirmed: false, acceptedTermsVersion: '', acceptedTermsAt: '', customClaims: { admin: true } }), collections }));
  assert.equal(result.account.privateProfile!.adultConfirmed, false);
  assert.equal(result.account.privateProfile!.acceptedTermsVersion, '');
  for (const name of exportCollections) { const count = name === 'communityMessages' ? 0 : 1; assert.equal(result.collections[name].length, count); assert.equal(result.counts[name], count); }
  assert.equal(result.collections.communityPosts[0].createdAt, '2026-10-06T12:00:00.000Z');
  assert.ok(!JSON.stringify(result).includes('SECRET'));
  assert.equal(result.scope.mediaBinariesIncluded, false);
});

test('encuentros exportan sólo inscripción, RSVP y espera propias incluso para el organizador', () => {
  const event = row('event', { ownerId: uid, title: 'Partido', teamId: 'team', participants: { [uid]: 'Yo', other: 'SECRET_PARTICIPANT' }, participantIds: [uid, 'SECRET_OTHER_UID'], rsvps: { [uid]: 'maybe', other: 'SECRET_RSVP' }, waitlist: { [uid]: { name: 'Yo en espera', joinedAt: timestamp, email: 'SECRET_EMAIL' }, other: { name: 'SECRET_WAIT', joinedAt: timestamp } }, waitlistOrder: ['other', uid], fixtures: [{ id: 'fixture', round: 1, homeId: uid, awayId: 'SECRET_OTHER_UID', homeScore: 2, awayScore: 1, startAt: '2026-10-10T12:00:00.000Z', privateRoster: 'SECRET_ROSTER' }], privateParticipants: 'SECRET_PRIVATE', result: { homeName: 'Local', awayName: 'Visitante', homeScore: 2, awayScore: 1, emails: 'SECRET_RESULT' } });
  const result = buildAccountExport(source({ events: [event, event, row('unrelated', { ownerId: 'other', participants: { other: 'SECRET_UNRELATED' } })] }));
  assert.equal(result.events.length, 1);
  const exported = result.events[0];
  assert.equal(exported.teamId, 'team'); assert.equal(exported.organizer, true);
  assert.deepEqual(exported.participants, { [uid]: 'Yo' });
  assert.deepEqual(exported.rsvps, { [uid]: 'maybe' });
  assert.deepEqual(exported.waitlist, { [uid]: { name: 'Yo en espera', joinedAt: '2026-10-06T12:00:00.000Z' } });
  assert.equal(exported.ownWaitingPosition, 2); assert.equal(exported.participantCount, 2);
  assert.ok(!JSON.stringify(result).includes('SECRET'));
  assert.deepEqual(exported.fixtures, [{ id: 'fixture', round: 1, homeScore: 2, awayScore: 1, startAt: '2026-10-10T12:00:00.000Z', bye: false, ownSide: 'home' }]);
});

test('respuestas tras retirada y registros antiguos conservan datos personales sin incluir ajenos', () => {
  const result = buildAccountExport(source({ events: [row('left', { ownerId: 'other', participants: {}, rsvps: { [uid]: 'no', other: 'yes' } }), row('legacy', { ownerId: 'other', participants: { [uid]: 'Yo', other: 'SECRET_NAME' } })] }));
  assert.equal(result.events.length, 2);
  assert.deepEqual(result.events.find(event => event.id === 'left')!.rsvps, { [uid]: 'no' });
  assert.ok(!JSON.stringify(result).includes('SECRET_NAME'));
});

test('marcadores canónicos sustituyen la copia antigua y excluyen participantes y campos extra', () => {
  const event = row('event', { ownerId: uid, fixtureIds: ['r1-1'], fixtures: [{ id: 'r1-1', homeScore: 0, awayScore: 0, homeId: uid, awayId: 'SECRET_OPPONENT' }] });
  const fixture = row('event_r1-1', { id: 'r1-1', eventId: 'event', ownerId: uid, round: 1, homeId: uid, awayId: 'SECRET_OPPONENT', homeScore: 5, awayScore: 1, kickoffAt: timestamp, timeZone: 'Europe/Madrid', venue: 'Cancha', createdAt: timestamp, updatedAt: timestamp, privateRoster: 'SECRET_ROSTER', extra: 'SECRET_EXTRA' });
  const result = buildAccountExport(source({ events: [event], fixtureRecords: [fixture, fixture, row('unrelated_r1-1', { id: 'r1-1', eventId: 'unrelated', homeScore: 99, extra: 'SECRET_UNRELATED' })] }));
  assert.equal(result.fixtureRecords.length, 1); assert.equal(result.counts.fixtureRecords, 1);
  assert.deepEqual(result.fixtureRecords[0], { id: 'event_r1-1', fixtureId: 'r1-1', eventId: 'event', round: 1, homeScore: 5, awayScore: 1, kickoffAt: '2026-10-06T12:00:00.000Z', timeZone: 'Europe/Madrid', venue: 'Cancha', createdAt: '2026-10-06T12:00:00.000Z', updatedAt: '2026-10-06T12:00:00.000Z', bye: false, ownSide: 'home' });
  assert.equal(result.events[0].fixtureSource, 'communityFixtures');
  assert.deepEqual(result.events[0].fixtures, [{ id: 'r1-1', round: 1, homeScore: 5, awayScore: 1, timeZone: 'Europe/Madrid', venue: 'Cancha', bye: false, ownSide: 'home', startAt: '2026-10-06T12:00:00.000Z' }]);
  assert.ok(!JSON.stringify(result).includes('SECRET'));
  const unavailable = buildAccountExport(source({ events: [event] }));
  assert.deepEqual(unavailable.events[0].fixtures, []);
  assert.equal(unavailable.events[0].fixtureExpectedCount, 1); assert.equal(unavailable.events[0].fixtureAvailableCount, 0);
});

test('historial vinculado, promociones propias y recibos del organizador excluyen audiencias y destinatarios ajenos', () => {
  const result = buildAccountExport(source({ events: [row('event', { ownerId: 'public-organizer', participants: { [uid]: 'Yo' } })], collections: {
    communityEventChanges: [row('event_2', { eventId: 'event', ownerId: 'public-organizer', revision: 2, summary: 'Nueva hora', title: 'Partido', createdAt: timestamp, audienceIds: [uid, 'SECRET_AUDIENCE'], recipientId: 'SECRET_RECIPIENT' }), row('owned_1', { eventId: 'owned', ownerId: uid, revision: 1, summary: 'Propio' }), row('unrelated_1', { eventId: 'unrelated', ownerId: 'other', summary: 'SECRET_CHANGE' })],
    communityEventPromotions: [row('event_outgoing-proof', { eventId: 'event', authorId: uid, recipientId: 'SECRET_OUTGOING', title: 'Plaza libre', summary: 'Disponible', createdAt: timestamp, other: 'SECRET_EXTRA' }), row('event_incoming-proof', { eventId: 'event', authorId: 'SECRET_AUTHOR', recipientId: uid, title: 'Tu plaza', createdAt: timestamp }), row('event_unrelated-proof', { eventId: 'event', authorId: 'other', recipientId: 'other', summary: 'SECRET_PROMOTION' })],
    communityEventDeliveries: [row('event_2_SECRET_DESTINATION', { actorId: uid, eventId: 'event', recipientId: 'SECRET_DESTINATION', createdAt: timestamp, readAt: 'SECRET_READ' }), row(`event_3_${uid}`, { actorId: uid, eventId: 'event', recipientId: uid, createdAt: timestamp }), row('other_delivery', { actorId: 'other', eventId: 'event', recipientId: uid, createdAt: timestamp })],
    communityEventNotices: [row('own-notice', { eventId: 'event', recipientId: uid, revision: 2, title: 'Partido', summary: 'Aviso', createdAt: timestamp, readAt: timestamp }), row('other-notice', { eventId: 'event', recipientId: 'other', readAt: 'SECRET_READ' })],
  } }));
  assert.equal(result.collections.communityEventChanges.length, 2);
  assert.equal(result.collections.communityEventPromotions.length, 2);
  const outgoing = result.collections.communityEventPromotions.find(record => record.id === 'event_outgoing-proof')!;
  assert.equal(outgoing.authorId, uid); assert.equal(outgoing.recipientIsSelf, false); assert.ok(!Object.hasOwn(outgoing, 'recipientId'));
  const incoming = result.collections.communityEventPromotions.find(record => record.id === 'event_incoming-proof')!;
  assert.equal(incoming.recipientId, uid); assert.ok(!Object.hasOwn(incoming, 'authorId'));
  assert.equal(result.collections.communityEventDeliveries.length, 2);
  const otherRecipient = result.collections.communityEventDeliveries.find(record => record.recipientIsSelf === false)!;
  assert.match(otherRecipient.exportReference as string, /^delivery-\d+$/); assert.ok(!Object.hasOwn(otherRecipient, 'id')); assert.ok(!Object.hasOwn(otherRecipient, 'recipientId')); assert.ok(!Object.hasOwn(otherRecipient, 'readAt'));
  assert.equal(result.collections.communityEventDeliveries.find(record => record.recipientIsSelf === true)!.id, `event_3_${uid}`);
  assert.equal(result.collections.communityEventNotices.length, 1);
  assert.equal(result.collections.communityEventNotices[0].readAt, '2026-10-06T12:00:00.000Z');
  assert.ok(!JSON.stringify(result).includes('SECRET'));
});

test('equipos incluyen metadatos vinculados, sólo membresía/solicitud propia e invitaciones creadas', () => {
  const result = buildAccountExport(source({ collections: {
    communityTeamMembers: [row('mine-member', { teamId: 'team', userId: uid, name: 'Yo', role: 'member' }), row('other-member', { teamId: 'team', userId: 'other', name: 'SECRET_ROSTER' })],
    communityTeamJoinRequests: [row('mine-request', { teamId: 'requested', userId: uid, name: 'Yo', inviteId: 'SECRET_OTHER_INVITE', status: 'pending' }), row('other-request', { teamId: 'team', userId: 'other', name: 'SECRET_REQUEST' })],
    communityTeamInvites: [row('my-link', { teamId: 'team', createdBy: uid, revoked: false }), row('SECRET_OTHER_LINK', { teamId: 'team', createdBy: 'other', revoked: false })],
  }, teams: [row('team', { ownerId: 'other', name: 'Público', roster: 'SECRET_TEAM_ROSTER' }), row('requested', { ownerId: 'other', name: 'Solicitado' }), row('owned', { ownerId: uid, name: 'Propio' }), row('unrelated', { ownerId: 'other', name: 'SECRET_TEAM' })] }));
  assert.deepEqual(result.teams.map(team => team.id), ['owned', 'requested', 'team']);
  assert.equal(result.collections.communityTeamMembers.length, 1);
  assert.equal(result.collections.communityTeamJoinRequests[0].usedInvitation, true);
  assert.equal(result.collections.communityTeamInvites[0].id, 'my-link');
  assert.ok(!JSON.stringify(result).includes('SECRET'));
});

test('invitaciones y contactos privados exportan datos propios con referencias, sin códigos ni UID ajenos', () => {
  const incomingCode = 'DME2M8Z4PFA6GF89', outgoingCode = '6666777788889999', activeCode = '2222333344445555', admissionCode = 'ABCDEFGHJKLMNPQR';
  const connection = (peerId: string, inviteId: string) => ({ ...row(peerId, { ownerId: uid, peerId, inviteId, createdAt: timestamp, email: 'SECRET_EMAIL' }), path: `communityConnections/${uid}/members/${peerId}` });
  const result = buildAccountExport(source({ collections: {
    communityInvitations: [
      row(incomingCode, { id: incomingCode, ownerId: 'SECRET_CONTACT_A', kind: 'connection', eventId: '', status: 'used', usedBy: uid, createdAt: timestamp, usedAt: timestamp }),
      row(outgoingCode, { id: outgoingCode, ownerId: uid, kind: 'connection', eventId: '', status: 'used', usedBy: 'SECRET_CONTACT_B', createdAt: timestamp, usedAt: timestamp }),
      row(activeCode, { id: activeCode, ownerId: uid, kind: 'connection', eventId: '', status: 'active', usedBy: '', usedAt: '', createdAt: timestamp, secretToken: 'SECRET_TOKEN' }),
      row(admissionCode, { id: admissionCode, ownerId: 'SECRET_PRIVATE_ORGANIZER', kind: 'event', eventId: 'private-event-a', status: 'used', usedBy: uid, createdAt: timestamp, usedAt: timestamp }),
      row('SECRET_UNRELATED_CODE', { ownerId: 'other', usedBy: 'other', kind: 'connection' }),
    ],
    communityConnections: [connection('SECRET_CONTACT_A', incomingCode), connection('SECRET_CONTACT_B', outgoingCode), row('SECRET_MIRROR', { ownerId: 'other', peerId: uid, inviteId: outgoingCode }), { ...connection('SECRET_WRONG_PATH', outgoingCode), path: `communityConnections/other/members/${uid}` }],
    communityEventAdmissions: [
      { ...row(uid, { userId: uid, eventId: 'private-event-a', inviteId: admissionCode, createdAt: timestamp, organizerId: 'SECRET_ORGANIZER' }), path: `communityEventAdmissions/private-event-a/members/${uid}` },
      { ...row(uid, { userId: uid, eventId: 'private-event-b', inviteId: 'SECRET_HISTORIC_CODE', createdAt: timestamp }), path: `communityEventAdmissions/private-event-b/members/${uid}` },
      { ...row(uid, { userId: uid, eventId: 'SECRET_WRONG_PARENT', inviteId: outgoingCode, createdAt: timestamp }), path: `communityTeams/SECRET_WRONG_PARENT/members/${uid}` },
      { ...row('other', { userId: 'other', eventId: 'private-event-a', inviteId: 'SECRET_OTHER_CODE' }), path: 'communityEventAdmissions/private-event-a/members/other' },
    ],
  } }));
  assert.equal(result.counts.communityInvitations, 4);
  assert.equal(result.counts.communityConnections, 2);
  // Both receipts use the same UID document ID but belong to distinct parents.
  assert.equal(result.counts.communityEventAdmissions, 2);
  const ownActive = result.collections.communityInvitations.find(record => record.status === 'active')!;
  assert.equal(ownActive.ownerId, uid); assert.equal(ownActive.createdBySelf, true); assert.equal(ownActive.usedBySelf, false);
  const outgoing = result.collections.communityInvitations.find(record => record.createdBySelf && record.status === 'used')!;
  assert.equal(outgoing.ownerId, uid); assert.ok(!Object.hasOwn(outgoing, 'usedBy'));
  assert.match(outgoing.connectionReference as string, /^connection-\d+$/);
  const incoming = result.collections.communityInvitations.find(record => !record.createdBySelf && record.kind === 'connection')!;
  assert.equal(incoming.usedBy, uid); assert.ok(!Object.hasOwn(incoming, 'ownerId'));
  assert.match(incoming.connectionReference as string, /^connection-\d+$/);
  for (const connection of result.collections.communityConnections) {
    assert.equal(connection.ownerId, uid); assert.equal(connection.usedInvitation, true);
    assert.match(connection.exportReference as string, /^connection-\d+$/);
    assert.match(connection.invitationReference as string, /^invitation-\d+$/);
    for (const field of ['id', 'path', 'peerId', 'inviteId']) assert.ok(!Object.hasOwn(connection, field));
  }
  const admitted = result.collections.communityEventAdmissions.find(record => record.eventId === 'private-event-a')!;
  assert.equal(admitted.userId, uid); assert.equal(admitted.usedInvitation, true);
  assert.match(admitted.invitationReference as string, /^invitation-\d+$/);
  for (const receipt of result.collections.communityEventAdmissions) {
    assert.match(receipt.exportReference as string, /^admission-\d+$/);
    for (const field of ['id', 'path', 'inviteId']) assert.ok(!Object.hasOwn(receipt, field));
  }
  const json = JSON.stringify(result);
  assert.ok(!json.includes('SECRET'));
  for (const token of [incomingCode, outgoingCode, activeCode, admissionCode]) assert.ok(!json.includes(token));
  assert.equal(result.scope.shortInvitationTokensRemoved, true);
  assert.equal(result.scope.privateConnectionPeerIdsRemoved, true);
});

test('UID y perfiles cruzados fallan antes de producir la exportación', () => {
  for (const invalid of ['', 'x/y', ' x ', '__proto__', '..', 'x\u0000y', 'a'.repeat(129)]) assert.throws(() => assertExportUid(invalid), /UID inválido/);
  assert.throws(() => buildAccountExport(source({ privateProfile: row(uid, { id: 'other', name: 'Otro' }) })), /no corresponde/);
  assert.throws(() => buildAccountExport(source({ legacyProfile: row(uid, { uid: 'other' }) })), /no corresponde/);
  assertExportUid(uid);
});

class FakeFieldPath {
  segments: string[];
  constructor(...segments: string[]) { this.segments = segments; }
  static documentId() { return new FakeFieldPath('__name__'); }
}
test('lecturas por UID paginan toda la colección y recuperan mapas antiguos con UID que contiene puntos', async () => {
  const reads: string[] = [];
  const filters: { collection: string; conditions: { field: string | FakeFieldPath; op: string; value: string }[] }[] = [];
  const data: Record<string, ExportRecord[]> = {
    communityPosts: [...Array.from({ length: 405 }, (_, index) => row(`post-${String(index).padStart(4, '0')}`, { authorId: uid, text: `Propio ${index}` })), row('other', { authorId: 'other', text: 'SECRET_OTHER' })],
    communityEvents: [row('owner', { ownerId: uid, fixtureIds: ['r1-1'], fixtures: [{ id: 'r1-1', homeScore: 0, awayScore: 0 }] }), row('joined', { ownerId: 'other', participantIds: [uid], participants: { [uid]: 'Yo' } }), row('wait', { ownerId: 'other', waitlistOrder: [uid], waitlist: { [uid]: { name: 'Yo' } } }), row('legacy', { ownerId: 'other', participants: { [uid]: 'Yo' } }), row('legacy-wait', { ownerId: 'other', waitlist: { [uid]: { name: 'Yo' } } }), row('former', { ownerId: 'other', rsvps: { [uid]: 'no' } }), row('wrong', { ownerId: 'other', participants: { self: { with: { dot: 'SECRET_WRONG_PATH' } } } })],
    communityFixtures: [row('owner_r1-1', { id: 'r1-1', eventId: 'owner', homeId: uid, awayId: 'SECRET_OPPONENT', homeScore: 5, awayScore: 1, kickoffAt: timestamp }), row('wrong_r1-1', { id: 'r1-1', eventId: 'wrong', private: 'SECRET_UNRELATED' })],
    communityEventChanges: [row('joined_2', { eventId: 'joined', ownerId: 'other', revision: 2, summary: 'Nueva hora', audienceIds: ['SECRET_AUDIENCE'] }), row('wrong_1', { eventId: 'wrong', ownerId: 'other', summary: 'SECRET_UNRELATED' })],
    communityEventPromotions: [row('incoming', { eventId: 'joined', authorId: 'SECRET_AUTHOR', recipientId: uid }), row('outgoing', { eventId: 'owner', authorId: uid, recipientId: 'SECRET_RECIPIENT' })],
    communityEventDeliveries: [row('owner_2_SECRET_DESTINATION', { actorId: uid, eventId: 'owner', recipientId: 'SECRET_DESTINATION', createdAt: timestamp }), row('other_delivery', { actorId: 'other', eventId: 'joined', recipientId: uid, createdAt: timestamp })],
    communityTeamMembers: [row('my-member', { userId: uid, teamId: 'team' })],
    communityTeams: [row('owned-team', { ownerId: uid }), row('team', { ownerId: 'other', name: 'Público' })],
    communityInvitations: [row('2222333344445555', { ownerId: uid, kind: 'connection', status: 'active', createdAt: timestamp }), row('6666777788889999', { ownerId: 'SECRET_OWNER', usedBy: uid, kind: 'event', eventId: 'joined', status: 'used', createdAt: timestamp, usedAt: timestamp }), row('SECRET_UNRELATED_CODE', { ownerId: 'other', usedBy: 'other', kind: 'connection' })],
    [`communityConnections/${uid}/members`]: Array.from({ length: 205 }, (_, index) => row(`SECRET_CONTACT_${String(index).padStart(3, '0')}`, { ownerId: uid, peerId: `SECRET_CONTACT_${String(index).padStart(3, '0')}`, inviteId: '2222333344445555', createdAt: timestamp })),
    '**/members': [
      ...Array.from({ length: 205 }, (_, index) => ({ ...row(uid, { userId: uid, eventId: `admission-${String(index).padStart(3, '0')}`, inviteId: '6666777788889999', createdAt: timestamp }), path: `communityEventAdmissions/admission-${String(index).padStart(3, '0')}/members/${uid}` })),
      { ...row(uid, { userId: uid, eventId: 'SECRET_TEAM', inviteId: 'SECRET_TEAM_TOKEN' }), path: `communityTeams/SECRET_TEAM/members/${uid}` },
      { ...row(uid, { ownerId: uid, userId: uid, eventId: 'SECRET_CONTACT', inviteId: 'SECRET_CONTACT_TOKEN' }), path: `communityConnections/SECRET_CONTACT/members/${uid}` },
      { ...row(uid, { userId: uid, eventId: 'SECRET_WRONG_EVENT' }), path: `communityEventAdmissions/different-event/members/${uid}` },
      { ...row(uid, { userId: uid, eventId: 'SECRET_DEEP_EVENT' }), path: `other/parent/communityEventAdmissions/SECRET_DEEP_EVENT/members/${uid}` },
      { ...row('other', { userId: 'other', eventId: 'SECRET_OTHER_EVENT' }), path: 'communityEventAdmissions/SECRET_OTHER_EVENT/members/other' },
    ],
    [`users/${uid}/likes`]: [row('legacy-like', { timestamp })],
  };
  const direct = new Map([['communityProfiles/' + uid, row(uid, { id: uid, acceptedTermsVersion: '' })]]);
  const ref = (collection: string, id: string) => ({ id, path: `${collection}/${id}`, collection: (name: string) => query(`${collection}/${id}/${name}`) });
  const snapshot = (record: ExportRecord | undefined, id: string) => ({ id, exists: !!record, data: () => record?.data, ...(record?.path ? { ref: { path: record.path } } : {}) });
  function query(collection: string, constraints: { field: string | FakeFieldPath; op: string; value: string }[] = [], after = '', maximum = Infinity): any {
    return {
      doc: (id: string) => ref(collection, id),
      where: (field: string | FakeFieldPath, op: string, value: string) => query(collection, [...constraints, { field, op, value }], after, maximum),
      orderBy: () => query(collection, constraints, after, maximum),
      startAfter: (document: { id: string; ref?: { path: string } }) => query(collection, constraints, collection.startsWith('**/') ? document.ref!.path : document.id, maximum),
      limit: (count: number) => query(collection, constraints, after, count),
      get: async () => {
        reads.push(collection);
        filters.push({ collection, conditions: constraints });
        const identity = (record: ExportRecord) => collection.startsWith('**/') ? record.path! : record.id;
        const records = (data[collection] || []).filter(record => constraints.every(condition => {
          const parts = typeof condition.field === 'string' ? [condition.field] : condition.field.segments;
          const value = parts.reduce<any>((value, segment) => value?.[segment], record.data);
          return condition.op === '==' ? value === condition.value : condition.op === 'array-contains' ? Array.isArray(value) && value.includes(condition.value) : typeof value === 'string' && value >= condition.value;
        })).sort((a, b) => identity(a).localeCompare(identity(b))).filter(record => !after || identity(record) > after).slice(0, maximum);
        return { docs: records.map(record => snapshot({ ...record, path: record.path || `${collection}/${record.id}` }, record.id)), size: records.length };
      },
    };
  }
  const db = { collection: query, collectionGroup: (name: string) => query(`**/${name}`), getAll: async (...references: { id: string; path: string }[]) => references.map(reference => snapshot(direct.get(reference.path) || data[reference.path.split('/')[0]]?.find(record => record.id === reference.id), reference.id)) };
  const collected = await cli.collectAccountSource({ db, auth: { getUser: async (requested: string) => ({ uid: requested }) }, uid, projectId: 'demo-cantera', databaseId: 'test', FieldPath: FakeFieldPath, policies: accountQueryPolicies });
  const result = buildAccountExport(collected);
  assert.equal(result.counts.communityPosts, 405);
  assert.equal(reads.filter(collection => collection === 'communityPosts').length, 3);
  assert.deepEqual(result.events.map(event => event.id), ['former', 'joined', 'legacy', 'legacy-wait', 'owner', 'wait']);
  assert.equal(result.legacyLikes.length, 1);
  assert.equal(result.teams.length, 2);
  assert.equal(result.fixtureRecords[0].homeScore, 5);
  assert.equal((result.events.find(event => event.id === 'owner')!.fixtures as Record<string, unknown>[])[0].awayScore, 1);
  assert.equal(result.collections.communityEventChanges[0].id, 'joined_2');
  assert.equal(result.collections.communityEventPromotions.length, 2);
  assert.equal(result.collections.communityEventDeliveries.length, 1);
  assert.equal(result.counts.communityInvitations, 2);
  assert.equal(result.counts.communityConnections, 205);
  assert.equal(result.counts.communityEventAdmissions, 205);
  assert.equal(reads.filter(collection => collection === `communityConnections/${uid}/members`).length, 2);
  assert.equal(reads.filter(collection => collection === '**/members').length, 2);
  assert.equal(reads.filter(collection => collection === 'communityInvitations').length, 2);
  for (const query of filters.filter(entry => entry.collection === '**/members')) assert.deepEqual(query.conditions, [{ field: 'userId', op: '==', value: uid }]);
  for (const query of filters.filter(entry => entry.collection === `communityConnections/${uid}/members`)) assert.deepEqual(query.conditions, [{ field: 'ownerId', op: '==', value: uid }]);
  assert.ok(!reads.includes('communityConnections')); assert.ok(!reads.includes('communityEventAdmissions'));
  assert.ok(!JSON.stringify(result).includes('2222333344445555'));
  assert.ok(!JSON.stringify(result).includes('6666777788889999'));
  assert.ok(!JSON.stringify(result).includes('SECRET'));
});

test('índice de recibos ausente aborta sin consultar miembros o cuentas sin filtro', async () => {
  const reads: { scope: string; field: string; value: string }[] = [];
  const indexFailure = Object.assign(new Error('SDK index link contains SECRET_UID'), { code: 9 });
  function query(scope: string, field = '', value = ''): any {
    return {
      doc: (id: string) => ({ id, collection: (name: string) => query(`${scope}/${id}/${name}`) }),
      where: (nextField: string, op: string, nextValue: string) => { assert.equal(op, '=='); return query(scope, nextField, nextValue); },
      orderBy: () => query(scope, field, value), limit: () => query(scope, field, value),
      get: async () => {
        reads.push({ scope, field, value });
        assert.ok(field); assert.equal(value, uid);
        if (scope === '**/members') { assert.equal(field, 'userId'); throw indexFailure; }
        return { docs: [], size: 0 };
      },
    };
  }
  const db = { collection: query, collectionGroup: (name: string) => { assert.equal(name, 'members'); return query('**/members'); }, getAll: async () => Array.from({ length: 4 }, () => ({ exists: false })) };
  await assert.rejects(() => cli.collectAccountSource({ db, auth: { getUser: async () => null }, uid, projectId: 'demo-cantera', databaseId: 'test', FieldPath: FakeFieldPath, policies: accountQueryPolicies }), error => error === indexFailure);
  assert.equal(reads.filter(read => read.scope === '**/members').length, 1);
  assert.ok(!reads.some(read => ['members', 'communityEventAdmissions', 'communityConnections', 'users'].includes(read.scope)));
});

test('CLI de exportación sólo admite el proyecto y la base nombrada autorizados antes de cargar Admin', () => {
  const expected = { projectId: 'gen-lang-client-0853130215', firestoreDatabaseId: 'ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb' };
  assert.doesNotThrow(() => cli.validateExportConfig(expected));
  for (const config of [null, {}, { ...expected, projectId: 'other-project' }, { ...expected, firestoreDatabaseId: '(default)' }, { ...expected, firestoreDatabaseId: 'ai-studio-9d2b1bbc-aff5-458a-bdf8-f2475620add0' }]) assert.throws(() => cli.validateExportConfig(config), /base nombrada autorizados/);
});

test('CLI tiene simulación por defecto y exige UID/salida para aplicar', () => {
  assert.equal(cli.parseArgs(['--uid', uid]).apply, false);
  assert.equal(cli.parseArgs(['--uid', uid, '--apply', '--output', 'output/private/account.json']).apply, true);
  for (const args of [[], ['--apply'], ['--uid', uid, '--apply'], ['--uid', uid, '--apply', '--dry-run'], ['--uid', uid, '--uid', uid], ['--uid', uid, '--unknown']]) assert.throws(() => cli.parseArgs(args));
  const help = spawnSync(process.execPath, [path.resolve('scripts/export-account.cjs'), '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0); assert.match(help.stdout, /--dry-run/);
  const rejected = spawnSync(process.execPath, [path.resolve('scripts/export-account.cjs'), '--uid', 'private@example.invalid', '--apply', '--output', 'public/leak.json'], { encoding: 'utf8' });
  assert.equal(rejected.status, 1); assert.equal(rejected.stdout, ''); assert.ok(!rejected.stderr.includes('private@example.invalid'));
});

test('archivo local 0600, carpetas 0700, sin sobrescritura, fuera de public ni symlinks', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cantera-export-test-'));
  try {
    const target = cli.writePrivateJson(root, 'output/private/account.json', { own: true });
    assert.equal(fs.statSync(target).mode & 0o777, 0o600);
    assert.equal(fs.statSync(path.dirname(target)).mode & 0o777, 0o700);
    assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), { own: true });
    assert.throws(() => cli.writePrivateJson(root, 'output/private/account.json', { overwritten: true }), /ya existe/);
    for (const destination of ['public/account.json', '../outside.json', 'output/private/data.txt']) assert.throws(() => cli.outputPath(root, destination), /dentro de output\/private/);
    fs.symlinkSync(path.join(root, 'output/private'), path.join(root, 'output/private/link'));
    assert.throws(() => cli.writePrivateJson(root, 'output/private/link/leak.json', {}), /enlaces simbólicos/);
    fs.symlinkSync(target, path.join(root, 'output/private/linked-file.json'));
    assert.throws(() => cli.outputPath(root, 'output/private/linked-file.json'), /enlaces simbólicos/);
    execFileSync('git', ['init', '--quiet'], { cwd: root });
    assert.throws(() => cli.assertIgnored(root, target), /excluido de Git/);
    fs.writeFileSync(path.join(root, '.gitignore'), 'output/private/\n');
    cli.assertIgnored(root, target);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
