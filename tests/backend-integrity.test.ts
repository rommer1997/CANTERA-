import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const backup = require('../scripts/community-backup.cjs');
const audit = require('../scripts/audit-backend.cjs');
const at = '2026-11-13T00:00:00.123456Z';
const s = (stringValue: string) => ({ stringValue });
const array = (values: string[]) => ({ arrayValue: { values: values.map(s) } });
const map = (fields: Record<string, unknown>) => ({ mapValue: { fields } });
function snapshot(rows: [string, Record<string, unknown>][]) {
  const all = [['communityConfiguration/runtime', { serviceStatus: s('open'), mediaUploadsEnabled: { booleanValue: false } }], ...rows] as [string, Record<string, unknown>][];
  const inventory = backup.ROOT_COLLECTIONS.map((path: string) => ({ path, documents: 0, missingDocuments: 0 }));
  for (const [path] of all) { const collection = path.split('/').slice(0, -1).join('/'); let row = inventory.find((i: any) => i.path === collection); if (!row) { row = { path: collection, documents: 0, missingDocuments: 0 }; inventory.push(row); } row.documents++; }
  const missingDocuments = [...new Set(all.filter(([path]) => path.split('/').length === 4).map(([path]) => path.split('/').slice(0, 2).join('/')))].filter(parent => !all.some(([path]) => path === parent));
  for (const parent of missingDocuments) inventory.find((i: any) => i.path === parent.split('/')[0]).missingDocuments++;
  return backup.buildBackup({ documents: all.map(([path, fields]) => ({ path, fields, createTime: at, updateTime: at })), collections: inventory, missingDocuments, readTime: at, createdAt: at });
}
const profile = { id: s('alice'), name: s('PRIVATE NAME'), bio: s('PRIVATE BIO'), city: s('Madrid'), country: s('España'), position: s(''), team: s(''), level: s('amateur'), verification: s('unverified'), entityType: s('individual'), createdAt: { timestampValue: at }, adultConfirmed: { booleanValue: true }, acceptedTermsVersion: s('2026-10-08'), acceptedTermsAt: { timestampValue: at } };
const { adultConfirmed, acceptedTermsVersion, acceptedTermsAt, ...projection } = profile;
test('audita proyección e identidades sin emitir datos personales ni convertir timestamps', () => {
  const value = snapshot([['communityProfiles/alice', profile], ['communityPublicProfiles/alice', projection]]);
  const before = JSON.stringify(value), report = audit.auditSnapshot(value);
  assert.equal(report.passed, true); assert.equal(JSON.stringify(value), before);
  for (const privateText of ['PRIVATE NAME', 'PRIVATE BIO', 'alice', 'Madrid', '123456Z']) assert.equal(JSON.stringify({ ...report, readTime: undefined }).includes(privateText), false);
  for (const publicRecord of [{ ...projection, acceptedTermsAt }, { ...projection, name: s('MISMATCH') }]) assert.equal(audit.auditSnapshot(snapshot([['communityProfiles/alice', profile], ['communityPublicProfiles/alice', publicRecord]])).passed, false);
});
test('detecta aristas a medias y propietarios sin membresía; una pareja coherente pasa', () => {
  const left = { ownerId: s('alice'), peerId: s('bob'), inviteId: s('proof') };
  const rows: [string, Record<string, unknown>][] = [['communityConnections/alice/members/bob', left]];
  assert.equal(audit.auditSnapshot(snapshot(rows)).passed, false);
  rows.push(['communityConnections/bob/members/alice', { ownerId: s('bob'), peerId: s('alice'), inviteId: s('proof') }]);
  assert.equal(audit.auditSnapshot(snapshot(rows)).passed, true);
  const team: [string, Record<string, unknown>] = ['communityTeams/club', { id: s('club'), ownerId: s('alice') }];
  assert.equal(audit.auditSnapshot(snapshot([team])).passed, false);
  assert.equal(audit.auditSnapshot(snapshot([team, ['communityTeamMembers/club_alice', { id: s('club_alice'), teamId: s('club'), userId: s('alice'), role: s('owner') }]])).passed, true);
});
test('detecta sobreaforo, índices de plantilla discordantes y horarios incoherentes', () => {
  const event = { id: s('game'), type: s('match'), visibility: s('public'), capacity: { integerValue: '2' }, participants: map({ alice: s('A'), bob: s('B') }), participantIds: array(['alice', 'bob']), startAt: s('2026-11-13T12:00:00.000Z'), startAtMs: { integerValue: String(Date.parse('2026-11-13T12:00:00.000Z')) } };
  assert.equal(audit.auditSnapshot(snapshot([['communityEvents/game', event]])).passed, true);
  for (const change of [{ capacity: { integerValue: '1' } }, { participantIds: array(['alice']) }, { startAtMs: { integerValue: '0' } }, { waitlist: map({ alice: map({}) }), waitlistOrder: array(['alice']) }]) assert.equal(audit.auditSnapshot(snapshot([['communityEvents/game', { ...event, ...change }]])).passed, false);
});
test('acepta archivos de baja; no confunde mensajes huérfanos o suplantados con historial válido', () => {
  const conversation = { id: s('alice:bob'), participantIds: array(['alice', 'bob']) }, message = { id: s('message'), senderId: s('alice'), text: s('PRIVATE MESSAGE') };
  assert.equal(audit.auditSnapshot(snapshot([['communityConversations/alice:bob', conversation], ['communityConversations/alice:bob/messages/message', message]])).passed, true);
  assert.equal(audit.auditSnapshot(snapshot([['communityConversations/alice:bob/messages/message', message]])).passed, false);
  const id = 'archive_' + 'a'.repeat(32);
  assert.equal(audit.auditSnapshot(snapshot([[`communityConversations/${id}`, { id: s(id), participantIds: array(['alice']), archived: { booleanValue: true } }], [`communityConversations/${id}/messages/message`, message]])).passed, true);
});
test('interacciones de un post retirado se informan como limpieza pendiente, sin inventar el padre', () => {
  const report = audit.auditSnapshot(snapshot([['communityLikes/oldpost_alice', { userId: s('alice'), postId: s('oldpost') }]]));
  assert.equal(report.passed, true); assert.equal(report.findings[0].severity, 'warning');
});
test('rechaza backups manipulados y no ofrece ningún modo de escritura a producción', async () => {
  const value = snapshot([]); value.documents[0].fields.serviceStatus = s('tampered');
  assert.throws(() => audit.auditSnapshot(value));
  for (const args of [[], ['--apply'], ['--cloud', '--apply'], ['--input', '--cloud']]) assert.throws(() => audit.parseArgs(args));
  const calls: unknown[] = [], api = audit.readOnlyApi({ request(options: unknown) { calls.push(options); return { body: {} }; } });
  for (const method of ['PATCH', 'DELETE', 'PUT']) assert.throws(() => api.request({ method, path: 'x' }));
  for (const suffix of ['commit', 'batchWrite', 'beginTransaction']) assert.throws(() => api.request({ method: 'POST', path: 'x:' + suffix }));
  await api.request({ method: 'GET', path: 'x' }); await api.request({ method: 'POST', path: 'x:listCollectionIds' });
  assert.equal(calls.length, 2);
});
