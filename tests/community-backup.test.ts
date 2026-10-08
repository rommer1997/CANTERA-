import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const backup = require('../scripts/community-backup.cjs');
const restore = require('../scripts/restore-backup-emulator.cjs');
const { writePrivateJson } = require('../scripts/export-account.cjs');
const config = { projectId: backup.PROJECT_ID, firestoreDatabaseId: backup.DATABASE_ID };
const at = '2026-10-08T12:00:00.123456Z';
const created = '2026-10-08T12:01:00.000Z';
const target = { project: 'demo-cantera-recovery' };
const rootInventory = () => backup.ROOT_COLLECTIONS.map((name: string) => ({ path: name, documents: 0, missingDocuments: 0 }));
const allFields = () => ({
  timestamp: { timestampValue: '2026-10-08T12:00:00.123456Z' },
  bytes: { bytesValue: Buffer.from([0, 255, 17, 80]).toString('base64') },
  integer: { integerValue: '9223372036854775807' }, negative: { integerValue: '-9223372036854775808' },
  decimal: { doubleValue: 1.25 }, infinity: { doubleValue: 'Infinity' }, nan: { doubleValue: 'NaN' },
  text: { stringValue: 'Dato de prueba\nSin envío a la nube.' }, boolean: { booleanValue: false }, nil: { nullValue: null },
  point: { geoPointValue: { latitude: 0, longitude: -3.7 } },
  reference: { referenceValue: `${backup.resourceBase()}/communityProfiles/other-test` },
  map: { mapValue: { fields: { title: { stringValue: 'Mapa' }, empty: { mapValue: {} } } } },
  array: { arrayValue: { values: [{ integerValue: '1' }, { mapValue: { fields: { name: { stringValue: 'Uno' } } } }] } },
});
function payload(documents: any[] = [{ path: 'communityProfiles/test-only', fields: allFields(), createTime: at, updateTime: at }], extra: Record<string, any> = {}) {
  const collections = rootInventory();
  for (const document of documents) {
    const parent = document.path.split('/').slice(0, -1).join('/');
    let item = collections.find((entry: any) => entry.path === parent);
    if (!item) { item = { path: parent, documents: 0, missingDocuments: 0 }; collections.push(item); }
    item.documents++;
  }
  return backup.buildBackup({ documents, collections, readTime: at, createdAt: created, ...extra });
}
function resign(value: any) { const { integrity, ...body } = value; return { ...body, integrity: { algorithm: 'sha256', sha256: backup.backupHash(body) } }; }
function restDocument(documentPath: string, fields: any = {}) { return { name: `${backup.resourceBase()}/${documentPath}`, fields, createTime: at, updateTime: at }; }
function fakeSource(roots: string[], records: Record<string, any[]>, children: Record<string, string[]> = {}, pageSize = 200) {
  const calls: any[] = [];
  return { calls, api: { async request(options: any) {
    calls.push(structuredClone(options));
    if (options.path === `${backup.resourceBase()}:runQuery`) return { body: [{ readTime: at }] };
    const decoded = decodeURIComponent(options.path);
    if (decoded.endsWith(':listCollectionIds')) {
      assert.equal(options.method, 'POST'); assert.equal(options.body.pageSize, 200); assert.equal(options.body.readTime, at);
      const parent = decoded.slice(0, -':listCollectionIds'.length);
      return { body: { collectionIds: parent === backup.resourceBase() ? roots : children[parent.slice(backup.resourceBase().length + 1)] || [] } };
    }
    assert.equal(options.method, 'GET'); assert.equal(options.queryParams.pageSize, 200); assert.equal(options.queryParams.showMissing, true); assert.equal(options.queryParams.readTime, at);
    const collection = decoded.slice(backup.resourceBase().length + 1), rows = records[collection] || [];
    const offset = Number(options.queryParams.pageToken || 0);
    return { body: { documents: rows.slice(offset, offset + pageSize), ...(rows.length > offset + pageSize ? { nextPageToken: String(offset + pageSize) } : {}) } };
  } } };
}
function fakeEmulator(initial: Map<string, any> = new Map()) {
  const documents = new Map(initial); const calls: any[] = [];
  return { documents, calls, async fetch(url: string, options: any) {
    calls.push({ url, ...options });
    assert.ok(url.startsWith('http://127.0.0.1:8080/v1/projects/demo-'));
    assert.equal(options.redirect, 'error'); assert.equal(options.headers.Authorization, 'Bearer owner');
    const resource = decodeURIComponent(new URL(url).pathname.slice('/v1/'.length));
    if (options.method === 'GET') {
      const document = documents.get(resource);
      return new Response(JSON.stringify(document || { error: { code: 404, status: 'NOT_FOUND' } }), { status: document ? 200 : 404 });
    }
    assert.equal(options.method, 'POST'); assert.ok(resource.endsWith('/documents:commit'));
    const { writes } = JSON.parse(options.body);
    assert.ok(writes.length <= 100);
    if (writes.some((write: any) => documents.has(write.update.name))) return new Response(JSON.stringify({ error: { code: 409, status: 'ALREADY_EXISTS' } }), { status: 409 });
    for (const write of writes) { assert.deepEqual(write.currentDocument, { exists: false }); documents.set(write.update.name, structuredClone(write.update)); }
    return new Response(JSON.stringify({ writeResults: writes.map(() => ({ updateTime: created })), commitTime: created }), { status: 200 });
  } };
}

test('manifiesto mantiene valores REST sin perder bytes, enteros de 64 bits o precisión temporal', () => {
  const data = payload();
  assert.equal(backup.validateBackup(JSON.parse(JSON.stringify(data))).integrity.sha256, data.integrity.sha256);
  assert.deepEqual(data.documents[0].fields, allFields());
  assert.equal(data.documents[0].fields.integer.integerValue, '9223372036854775807');
  assert.equal(data.documents[0].fields.timestamp.timestampValue, '2026-10-08T12:00:00.123456Z');
  const nano = payload([{ path: 'communityProfiles/test-only', fields: { timestamp: { timestampValue: '2026-10-08T12:00:00.123456789Z' } } }]);
  assert.equal(nano.documents[0].fields.timestamp.timestampValue, '2026-10-08T12:00:00.123456789Z');
  assert.equal(data.excluded.includes('firebase-auth'), true);
  assert.equal(data.excluded.includes('storage-binaries'), true);
  assert.equal(JSON.stringify(backup.backupSummary(data)).includes('Dato de prueba'), false);
  assert.equal(JSON.stringify(backup.backupSummary(data)).includes('test-only'), false);
});

test('integridad SHA cubre datos, inventario y procedencia y rechaza corrupciones', () => {
  for (const mutate of [
    (data: any) => { data.documents[0].fields.text.stringValue = 'alterado'; },
    (data: any) => { data.collections[0].documents++; },
    (data: any) => { data.readTime = '2026-10-08T11:00:00Z'; },
  ]) { const data = payload(); mutate(data); assert.throws(() => backup.validateBackup(data), /integrity-mismatch/); }
  const foreign = payload(); foreign.databaseId = 'unrelated'; assert.throws(() => backup.validateBackup(resign(foreign)), /wrong-source/);
  const unknown = payload(); unknown.version = 2; assert.throws(() => backup.validateBackup(resign(unknown)), /format/);
  const wrongCounts = payload(); wrongCounts.collections.find((item: any) => item.path === 'communityProfiles').documents++; assert.throws(() => backup.validateBackup(resign(wrongCounts)), /count-mismatch/);
  assert.equal(backup.backupHash({ b: 2, a: 1 }), backup.backupHash({ a: 1, b: 2 }));
});

test('rutas y valores desconocidos fallan sin aceptar documentos ajenos o referencias externas', () => {
  for (const value of ['users/test', 'communityProfiles/../secret', 'communityProfiles/test/unknown/nested', 'communityConnections/test/members/other/extra/doc', 'communityProfiles/test\\escape', '/communityProfiles/test']) assert.throws(() => backup.validateDocumentPath(value));
  assert.equal(backup.validateDocumentPath('communityConversations/alice:bob/messages/abc'), 'communityConversations/alice:bob/messages/abc');
  for (const fields of [{ v: { integerValue: '9223372036854775808' } }, { v: { bytesValue: 'bad%%%=' } }, { v: { timestampValue: '2026-02-30T12:00:00Z' } }, { v: { referenceValue: 'projects/foreign/databases/(default)/documents/communityProfiles/test' } }, { v: { referenceValue: `${backup.resourceBase()}/users/test` } }, { v: { unknownValue: true } }, { v: { doubleValue: Number.NaN } }, { v: { stringValue: 'x', integerValue: '1' } }, { v: { arrayValue: { values: [{ arrayValue: {} }] } } }]) assert.throws(() => backup.validateRestFields(fields));
  const duplicate = payload(); duplicate.documents.push(duplicate.documents[0]); assert.throws(() => backup.validateBackup(resign(duplicate)), /duplicate-document/);
});

test('inventario paginado lee 201 documentos y subcolecciones con padres virtuales sin tocar colecciones ajenas', async () => {
  const profiles = Array.from({ length: 201 }, (_, index) => restDocument(`communityProfiles/test-${index}`, { name: { stringValue: `Prueba ${index}` } }));
  const source = fakeSource(['communityProfiles', 'communityConnections', 'users'], {
    communityProfiles: profiles,
    communityConnections: [{ name: `${backup.resourceBase()}/communityConnections/virtual-test` }],
    'communityConnections/virtual-test/members': [restDocument('communityConnections/virtual-test/members/peer-test', { peerId: { stringValue: 'peer-test' } })],
  }, { 'communityConnections/virtual-test': ['members'] });
  const data = await backup.collectBackup({ config, api: source.api, createdAt: created });
  assert.equal(data.documents.length, 202); assert.deepEqual(data.missingDocuments, ['communityConnections/virtual-test']);
  assert.equal(data.excludedRootCollections, 1);
  assert.equal(source.calls.filter((call: any) => call.method === 'GET' && call.path.endsWith('/communityProfiles')).length, 2);
  assert.equal(source.calls.some((call: any) => call.path.endsWith('/users')), false);
  assert.equal(source.calls.some((call: any) => ['PATCH', 'DELETE', 'PUT'].includes(call.method) || call.path.endsWith(':commit')), false);
  const summary = backup.backupSummary(data); assert.equal(summary.counts.communityProfiles, 201); assert.equal(summary.counts.communityConnections, 1);
});

test('respaldo detiene esquemas desconocidos, páginas repetidas y documentos fuera de su colección', async () => {
  const unknownRoot = fakeSource(['communityUnknown'], {});
  await assert.rejects(() => backup.collectBackup({ config, api: unknownRoot.api }), /unreviewed-community/);
  const unknownChild = fakeSource(['communityProfiles'], { communityProfiles: [restDocument('communityProfiles/test')] }, { 'communityProfiles/test': ['private-secret'] });
  await assert.rejects(() => backup.collectBackup({ config, api: unknownChild.api }), /unreviewed-subcollection/);
  const misplaced = fakeSource(['communityProfiles'], { communityProfiles: [restDocument('communityPosts/foreign')] });
  await assert.rejects(() => backup.collectBackup({ config, api: misplaced.api }), /location/);
  const repeated = { request: async (options: any) => options.path.endsWith(':runQuery') ? { body: [{ readTime: at }] } : { body: { collectionIds: [], nextPageToken: 'same' } } };
  await assert.rejects(() => backup.collectBackup({ config, api: repeated }), /pagination/);
  let called = false;
  await assert.rejects(() => backup.collectBackup({ config: { ...config, firestoreDatabaseId: '(default)' }, api: { request: () => { called = true; } } }), /wrong-source/);
  assert.equal(called, false);
});

test('entrada y salida requieren JSON privado ignorado por Git y rechazan enlaces simbólicos o archivos existentes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cantera-backup-test-'));
  try {
    execFileSync('git', ['init', '--quiet'], { cwd: root }); fs.writeFileSync(path.join(root, '.gitignore'), 'output/private/\n');
    const output = 'output/private/nested/respaldo.json'; writePrivateJson(root, output, payload());
    assert.equal(fs.statSync(path.join(root, output)).mode & 0o777, 0o600);
    assert.equal(fs.statSync(path.join(root, 'output/private')).mode & 0o777, 0o700);
    assert.equal(fs.statSync(path.join(root, 'output/private/nested')).mode & 0o777, 0o700);
    assert.equal(backup.readPrivateBackup(root, output).documents.length, 1);
    assert.throws(() => writePrivateJson(root, output, payload()), /ya existe/);
    assert.throws(() => backup.readPrivateBackup(root, '../outside.json'), /private-json/);
    fs.symlinkSync(path.join(root, output), path.join(root, 'output/private/link.json'));
    assert.throws(() => backup.readPrivateBackup(root, 'output/private/link.json'), /unsafe-input-path/);
    fs.symlinkSync(path.join(root, 'output/private/nested'), path.join(root, 'output/private/linked-directory'));
    assert.throws(() => backup.readPrivateBackup(root, 'output/private/linked-directory/respaldo.json'), /unsafe-input-path/);
    fs.chmodSync(path.join(root, output), 0o644); assert.throws(() => backup.readPrivateBackup(root, output), /input-not-private/);
    fs.chmodSync(path.join(root, output), 0o600); fs.linkSync(path.join(root, output), path.join(root, 'output/private/hard-link.json'));
    assert.throws(() => backup.readPrivateBackup(root, output), /unsafe-input-file/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('restauración rechaza producción, alias, puertos y argumentos ambiguos antes de cualquier red', () => {
  for (const options of [{ project: backup.PROJECT_ID }, { project: 'demo-test', origin: 'https://firestore.googleapis.com' }, { project: 'demo-test', origin: 'http://localhost:8080' }, { project: 'demo-test', origin: 'http://127.0.0.1:8081' }, { project: 'demo-test', origin: 'http://127.0.0.1:8080/' }, { project: 'demo-test', database: backup.DATABASE_ID }, { project: 'demo-../escape' }, { project: 'demo-test?key=secret' }]) assert.throws(() => restore.validateEmulatorTarget(options), /emulator-only/);
  assert.deepEqual(restore.validateEmulatorTarget(target), { origin: 'http://127.0.0.1:8080', project: target.project, database: '(default)' });
  assert.equal(backup.parseArgs([]).apply, false);
  assert.equal(restore.parseArgs(['--input', 'output/private/backup.json', '--project', target.project]).apply, false);
  for (const args of [['--project', target.project, '--input', 'file', '--apply', '--dry-run'], ['--project', target.project, '--input', 'file', '--origin', 'https://external.test'], ['--project', target.project, '--project', 'demo-other', '--input', 'file']]) assert.throws(() => restore.parseArgs(args));
  assert.throws(() => backup.parseArgs(['--apply']));
});

test('simulación valida manifiesto y plan sin emitir ninguna petición y remapea referencias sólo al emulador', async () => {
  const data = payload(); const original = JSON.stringify(data);
  const report = await restore.restoreBackup({ payload: data, target, fetchImpl: () => { throw new Error('network-must-not-run'); } });
  assert.equal(report.written, 0); assert.equal(report.fieldsVerified, false);
  const plan = restore.buildRestorePlan(data, target);
  assert.deepEqual(plan.writes[0].currentDocument, { exists: false });
  assert.equal(plan.writes[0].update.fields.reference.referenceValue, `projects/${target.project}/databases/(default)/documents/communityProfiles/other-test`);
  assert.equal(plan.writes[0].update.fields.timestamp.timestampValue, allFields().timestamp.timestampValue);
  assert.equal(JSON.stringify(data), original);
});

test('recuperación rechaza antes de escribir una precisión temporal que Firestore redondearía', async () => {
  const nano = payload([{ path: 'communityProfiles/test-only', fields: { nested: { mapValue: { fields: { timestamp: { timestampValue: '2026-10-08T12:00:00.123456789Z' } } } } } }]);
  let called = false;
  await assert.rejects(() => restore.restoreBackup({ payload: nano, target, apply: true, fetchImpl: () => { called = true; } }), /timestamp-precision/);
  assert.equal(called, false);
});

test('ensayo con doble restaura todos los tipos, verifica lectura y no sobrescribe datos existentes', async () => {
  const emulator = fakeEmulator();
  const report = await restore.restoreBackup({ payload: payload(), target, apply: true, fetchImpl: emulator.fetch });
  assert.equal(report.written, 1); assert.equal(report.fieldsVerified, true);
  assert.equal(emulator.calls.filter((call: any) => call.method === 'POST').length, 1);
  const protectedName = `projects/${target.project}/databases/(default)/documents/communityProfiles/test-only`;
  const existing = { name: protectedName, fields: { original: { stringValue: 'Conservar' } } };
  const occupied = fakeEmulator(new Map([[protectedName, existing]]));
  await assert.rejects(() => restore.restoreBackup({ payload: payload(), target, apply: true, fetchImpl: occupied.fetch }), /target-not-empty/);
  assert.equal(occupied.calls.some((call: any) => call.method === 'POST'), false);
  assert.deepEqual(occupied.documents.get(protectedName), existing);
});

test('restauración separa 101 escrituras, protege conflictos concurrentes y detecta una lectura alterada', async () => {
  const documents = Array.from({ length: 101 }, (_, index) => ({ path: `communityProfiles/test-${index}`, fields: { number: { integerValue: String(index) } } }));
  const emulator = fakeEmulator();
  const report = await restore.restoreBackup({ payload: payload(documents), target, apply: true, fetchImpl: emulator.fetch });
  assert.equal(report.chunks, 2); assert.equal(report.written, 101); assert.equal(report.fieldsVerified, true);
  const conflict = fakeEmulator();
  const conflictFetch = async (url: string, options: any) => options.method === 'POST' ? new Response(JSON.stringify({ error: { code: 409, status: 'ALREADY_EXISTS' } }), { status: 409 }) : conflict.fetch(url, options);
  await assert.rejects(() => restore.restoreBackup({ payload: payload(), target, apply: true, fetchImpl: conflictFetch }), /local-commit-failed/);
  const altered = fakeEmulator(); let committed = false;
  const alteredFetch = async (url: string, options: any) => {
    const response = await altered.fetch(url, options);
    if (options.method === 'POST') committed = true;
    if (options.method === 'GET' && committed) { const result = await response.json(); result.fields.bytes.bytesValue = 'AA=='; return new Response(JSON.stringify(result), { status: 200 }); }
    return response;
  };
  await assert.rejects(() => restore.restoreBackup({ payload: payload(), target, apply: true, fetchImpl: alteredFetch }), /fields-mismatch/);
});
