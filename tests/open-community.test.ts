import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const cli = createRequire(import.meta.url)('../scripts/open-community.cjs');
const at = '2026-10-13T20:00:00.123456Z';
const later = '2026-10-13T20:01:00.123456Z';
// Synthetic in-memory fixtures only. No acta is written to this repository.
function local(extra: any = {}) {
  const checks = Object.fromEntries(['rulesAndIndexes', 'migration', 'twoAccounts', 'admin', 'authDomain', 'backupRestore', 'support', 'legalAndPrivacy', 'accountRights'].map(key => [key, true]));
  return { env: { VITE_SERVICE_OPEN: 'true', VITE_ENABLE_PILOT: 'false', VITE_ENABLE_DEMO: 'false', VITE_ENABLE_MEDIA_UPLOADS: 'false', VITE_HOSTING_PROVIDER: 'firebase', VITE_OPERATOR_NAME: 'Persona de ensayo', VITE_OPERATOR_COUNTRY: 'España', VITE_CONTACT_EMAIL: cli.OWNER_EMAIL },
    approval: { projectId: cli.PROJECT_ID, databaseId: cli.DATABASE_ID, approvedAt: new Date().toISOString(), approvedBy: 'Persona de ensayo', checks },
    config: { projectId: cli.PROJECT_ID, firestoreDatabaseId: cli.DATABASE_ID }, firebaseConfig: { firestore: [{ database: cli.DATABASE_ID, rules: 'firestore.rules', indexes: 'firestore.indexes.json' }] },
    rules: 'rules_version = "2"; // LOCAL TEST ONLY', indexSpec: { indexes: Array.from({ length: 30 }, (_, i) => ({ collectionGroup: `group${i}`, queryScope: 'COLLECTION', fields: [{ fieldPath: 'createdAt', order: 'ASCENDING' }] })), fieldOverrides: [] },
    fingerprint: 'a'.repeat(64), releaseCheckPassed: true, ...extra };
}
function runtime(status = 'pilot', extra: any = {}) {
  return { name: cli.DOCUMENT_NAME, updateTime: at, fields: { serviceStatus: { stringValue: status }, mediaUploadsEnabled: { booleanValue: false }, contactEmail: { stringValue: 'Rommer@garitocastizo.com' }, updatedAt: { timestampValue: at },
    ...(status === 'pilot' ? { pilotUserIds: { arrayValue: { values: [{ stringValue: 'owner-uid' }, { stringValue: 'second-uid' }] } } } : {}), ...extra } };
}
function owner(extra: any = {}) { return { uid: 'owner-uid', email: cli.OWNER_EMAIL, emailVerified: true, disabled: false, providerUserInfo: [{ providerId: 'google.com', email: cli.OWNER_EMAIL }], customAttributes: '{"admin":true}', ...extra }; }
function harness(options: any = {}) {
  const plan = local();
  const indexes = plan.indexSpec.indexes.map((entry: any, i: number) => ({ ...entry, name: `${cli.DATABASE_NAME}/collectionGroups/${entry.collectionGroup}/indexes/id${i}`, state: 'READY' }));
  const h: any = { local: plan, document: runtime(), indexes, fields: [], requests: [], commits: 0, identities: [], releases: 0, ...options };
  h.api = { async request(request: any) {
    h.requests.push(structuredClone(request));
    if (request.method === 'POST') {
      assert.equal(request.path, cli.COMMIT_PATH); assert.equal(request.retries, 0); assert.deepEqual(request.retryCodes, []);
      h.commits++;
      if (h.beforeCommit) h.beforeCommit(h);
      if (h.commitError) throw h.commitError;
      const write = request.body.writes[0];
      assert.equal(request.body.writes.length, 1); assert.deepEqual(write.currentDocument, { updateTime: h.document.updateTime });
      assert.equal(Object.hasOwn(write, 'updateMask'), false); assert.deepEqual(write.updateTransforms, [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }]);
      h.document = { name: write.update.name, updateTime: later, fields: { ...write.update.fields, updatedAt: { timestampValue: later } } };
      if (h.afterCommit) h.afterCommit(h);
      return { status: 200, body: { commitTime: later } };
    }
    assert.equal(request.method, 'GET');
    if (request.path === cli.DATABASE_NAME) return { status: 200, body: { name: cli.DATABASE_NAME, databaseEdition: 'ENTERPRISE', ...h.metadata } };
    if (request.path === cli.DOCUMENT_NAME) return { status: h.runtimeStatus || 200, body: structuredClone(h.document) };
    if (request.path === `${cli.DATABASE_NAME}/collectionGroups/-/indexes`) {
      assert.equal(request.queryParams.pageSize, 0, 'Enterprise only supports pageSize=0');
      if (h.indexPage) return h.indexPage(request);
      return { status: 200, body: { indexes: structuredClone(h.indexes) } };
    }
    if (request.path === `${cli.DATABASE_NAME}/collectionGroups/-/fields`) {
      assert.equal(request.queryParams.pageSize, 0, 'Enterprise only supports pageSize=0');
      return { status: 200, body: { fields: structuredClone(h.fields) } };
    }
    assert.fail(`Unexpected read path: ${request.path}`);
  } };
  h.rulesApi = { async request(request: any) {
    assert.equal(request.method, 'GET'); h.releases++;
    if (request.path === cli.RELEASE_NAME) return { status: 200, body: { name: cli.RELEASE_NAME, rulesetName: `projects/${cli.PROJECT_ID}/rulesets/actual-id`, ...h.release } };
    assert.equal(request.path, `projects/${cli.PROJECT_ID}/rulesets/actual-id`);
    return { status: 200, body: { source: { files: [{ name: 'firestore.rules', content: h.local.rules, ...h.ruleFile }] } } };
  } };
  h.authApi = { async request(request: any) {
    assert.equal(request.method, 'GET'); assert.deepEqual(request.headers, { 'x-goog-user-project': cli.PROJECT_ID });
    if (request.path === cli.AUTH_CONFIG_PATH) return { status: 200, body: { authorizedDomains: ['lacantera.web.app'], ...h.authConfig } };
    assert.equal(request.path, cli.GOOGLE_CONFIG_PATH);
    return { status: 200, body: { name: cli.GOOGLE_CONFIG_NAME, enabled: true, clientId: 'test-client', clientSecret: 'SECRET_PROVIDER', ...h.google } };
  } };
  h.projectApi = { async request(request: any) {
    assert.equal(request.method, 'GET'); assert.equal(request.path, `projects/${cli.PROJECT_ID}`);
    return { status: 200, body: { projectId: cli.PROJECT_ID, projectNumber: '123456789012', ...h.projectMetadata } };
  } };
  h.identityApi = { async findUser(project: string, email?: string, phone?: string, uid?: string) {
    assert.equal(project, cli.PROJECT_ID); assert.equal(phone, undefined); h.identities.push({ email, uid });
    return owner(h.owner);
  } };
  h.indexMatchesSpec = (actual: any, expected: any, edition: string) => { assert.equal(edition, 'ENTERPRISE'); return actual.name.includes(`/collectionGroups/${expected.collectionGroup}/`) && JSON.stringify(actual.fields) === JSON.stringify(expected.fields); };
  h.run = (overrides: any = {}) => cli.openCommunity({ local: h.local, api: h.api, rulesApi: h.rulesApi, authApi: h.authApi, projectApi: h.projectApi, identityApi: h.identityApi, indexMatchesSpec: h.indexMatchesSpec, readLocalAgain: async () => h.localAgain || h.local, ...overrides });
  return h;
}
test('apertura tiene simulación predeterminada y destino fijo sin parámetros alternativos', () => {
  assert.deepEqual(cli.parseArgs([]), { help: false, apply: false });
  assert.equal(cli.parseArgs(['--dry-run']).apply, false); assert.equal(cli.parseArgs(['--apply']).apply, true);
  assert.equal(cli.parseArgs(['--help']).help, true);
  for (const args of [['--project', 'other'], ['--apply', '--dry-run'], ['--force'], ['--apply', '--apply'], ['--help', '--apply']]) assert.throws(() => cli.parseArgs(args));
  for (const config of [{}, { projectId: 'other', firestoreDatabaseId: cli.DATABASE_ID }, { projectId: cli.PROJECT_ID, firestoreDatabaseId: '(default)' }]) assert.throws(() => cli.validateLocal(local({ config })), /wrong-target/);
});
test('acta real y reciente, check-release y flags exactos preceden cualquier API cloud', async () => {
  const invalid: any[] = [local({ approval: null }), local({ releaseCheckPassed: false }), local({ fingerprint: 'bad' })];
  for (const key of ['VITE_SERVICE_OPEN', 'VITE_ENABLE_PILOT', 'VITE_ENABLE_DEMO', 'VITE_ENABLE_MEDIA_UPLOADS', 'VITE_HOSTING_PROVIDER']) {
    const fixture = local(); fixture.env[key] = key === 'VITE_SERVICE_OPEN' ? 'false' : 'true'; invalid.push(fixture);
  }
  for (const change of [{ approvedBy: 'otra persona' }, { approvedAt: new Date(Date.now() + 100000).toISOString() }, { approvedAt: new Date(Date.now() - 8 * 86400000).toISOString() }, { projectId: 'other' }, { databaseId: '(default)' }, { checks: { rulesAndIndexes: true } }]) {
    const fixture = local(); fixture.approval = { ...fixture.approval, ...change }; invalid.push(fixture);
  }
  const emulator = local(); emulator.env.VITE_FIREBASE_EMULATORS = 'true'; invalid.push(emulator);
  for (const fixture of invalid) { const h = harness({ local: fixture }); await assert.rejects(() => h.run({ apply: true })); assert.equal(h.requests.length, 0); assert.equal(h.releases, 0); assert.equal(h.commits, 0); }
});
test('dry-run verifica destinos, reglas30READY, Google y admin sin escritura ni datos privados', async () => {
  const h = harness(); const result = await h.run();
  assert.equal(h.commits, 0); assert.ok(h.requests.every((request: any) => request.method === 'GET'));
  assert.equal(result.mode, 'dry-run'); assert.equal(result.action, 'planned'); assert.equal(result.runtimeOpenObserved, false);
  assert.equal(result.removedPilotAccounts, 2); assert.equal(result.checks.indexCount, 30); assert.equal(result.checks.googleEnabled, true);
  assert.deepEqual(h.identities, [{ email: cli.OWNER_EMAIL, uid: undefined }, { email: undefined, uid: 'owner-uid' }]);
  const serialized = JSON.stringify(result); for (const secret of ['SECRET', cli.OWNER_EMAIL, 'owner-uid', 'second-uid', 'test-client']) assert.ok(!serialized.includes(secret));
});
test('apply sólo sustituye runtimeopen conCAS, conserva contacto exacto y retira pilotUserIds', async () => {
  const h = harness(); const result = await h.run({ apply: true });
  assert.equal(h.commits, 1); assert.equal(result.verified, true); assert.equal(result.action, 'applied');
  assert.deepEqual(Object.keys(h.document.fields).sort(), ['contactEmail', 'mediaUploadsEnabled', 'serviceStatus', 'updatedAt']);
  assert.equal(h.document.fields.contactEmail.stringValue, 'Rommer@garitocastizo.com'); assert.equal(h.document.fields.serviceStatus.stringValue, 'open'); assert.equal(h.document.fields.mediaUploadsEnabled.booleanValue, false);
  assert.equal(h.requests.filter((request: any) => request.method === 'POST').length, 1);
});
test('pausa se puede abrir; estadoausente/setup/campos desconocidos/medios activos fallan cerrado', async () => {
  const paused = harness({ document: runtime('paused') }); await paused.run({ apply: true }); assert.equal(paused.commits, 1);
  for (const document of [null, runtime('setup'), runtime('pilot', { unknown: { stringValue: 'value' } }), runtime('pilot', { mediaUploadsEnabled: { booleanValue: true } }), runtime('pilot', { contactEmail: { stringValue: 'wrong@example.invalid' } })]) {
    const h = harness({ document }); await assert.rejects(() => h.run({ apply: true })); assert.equal(h.commits, 0);
  }
  const forbidden = harness({ runtimeStatus: 403 }); await assert.rejects(() => forbidden.run({ apply: true }), /runtime-read-required/); assert.equal(forbidden.commits, 0);
});
test('open existente devuelve unchanged sólo después de revisar backend/admin/acta', async () => {
  const h = harness({ document: runtime('open') }); const result = await h.run({ apply: true });
  assert.equal(h.commits, 0); assert.equal(result.action, 'unchanged'); assert.equal(result.verified, true); assert.equal(h.identities.length, 2);
  const invalid = harness({ document: runtime('open', { pilotUserIds: { arrayValue: { values: [] } } }) }); await assert.rejects(() => invalid.run());
});
test('release y fuente usan igualdad exacta y no aceptan rulesets de otro proyecto', async () => {
  for (const options of [{ release: { name: `${cli.RELEASE_NAME}-other` } }, { release: { rulesetName: 'projects/other/rulesets/id' } }, { ruleFile: { name: 'other.rules' } }, { ruleFile: { content: 'not-published' } }, { metadata: { name: `projects/other/databases/${cli.DATABASE_ID}` } }, { metadata: { databaseEdition: 'STANDARD' } }]) {
    const h = harness(options); await assert.rejects(() => h.run({ apply: true })); assert.equal(h.commits, 0);
  }
});
test('se exige30READY y correspondencia biyectiva, sin índices extras/duplicados/unique ooverrides', async () => {
  for (const mutate of [(h: any) => h.indexes.pop(), (h: any) => h.indexes.push({ ...h.indexes[0], name: h.indexes[0].name + 'extra' }), (h: any) => h.indexes[0].state = 'CREATING', (h: any) => h.indexes[0].unique = true, (h: any) => h.indexes[1] = structuredClone(h.indexes[0]), (h: any) => h.indexes[0].fields = [{ fieldPath: 'other', order: 'ASCENDING' }], (h: any) => h.fields = [{ name: `${cli.DATABASE_NAME}/collectionGroups/communityPosts/fields/text`, ttlConfig: {} }]]) {
    const h = harness(); mutate(h); await assert.rejects(() => h.run({ apply: true })); assert.equal(h.commits, 0);
  }
  const duplicate = harness(); duplicate.local.indexSpec.indexes[1] = structuredClone(duplicate.local.indexSpec.indexes[0]); await assert.rejects(() => duplicate.run(), /invalid-index-spec/);
});
test('listas paginan incluso en página vacía y bloquean ciclos/formato o token no string', async () => {
  const h = harness(); h.indexPage = (request: any) => request.queryParams.pageToken === 'next' ? { status: 200, body: { indexes: h.indexes } } : { status: 200, body: { nextPageToken: 'next' } };
  assert.equal((await h.run()).checks.indexCount, 30); assert.equal(h.commits, 0);
  for (const value of [{ indexes: null }, { indexes: {} }, { nextPageToken: 7 }, { indexes: [], nextPageToken: 'repeat' }]) {
    const api = { request: async () => ({ status: 200, body: value }) }; await assert.rejects(() => cli.paginated(api, 'fixed', 'indexes'));
  }
});
test('Google y dominio y claim admin se comprueban sin modificar Auth', async () => {
  for (const options of [{ authConfig: { authorizedDomains: [] } }, { google: { enabled: false } }, { google: { clientId: '' } }, { google: { name: 'projects/other/defaultSupportedIdpConfigs/google.com' } }, { owner: { customAttributes: '{"admin":false}' } }, { owner: { emailVerified: false } }, { owner: { disabled: true } }, { owner: { providerUserInfo: [] } }]) {
    const h = harness(options); await assert.rejects(() => h.run({ apply: true })); assert.equal(h.commits, 0);
  }
});
test('revisión local cambia antesdeapply o falta recheck: ninguna escritura', async () => {
  const h = harness({ localAgain: local({ fingerprint: 'b'.repeat(64) }) }); await assert.rejects(() => h.run({ apply: true }), /local-review-changed/); assert.equal(h.commits, 0);
  const absent = harness(); await assert.rejects(() => absent.run({ apply: true, readLocalAgain: undefined }), /local-recheck-required/); assert.equal(absent.commits, 0);
});
test('CAS o transporte ambiguo nunca reintenta, aun si readback observa open', async () => {
  const conflict = harness({ beforeCommit: (h: any) => { h.document.updateTime = later; }, commitError: { status: 409, message: 'SECRET_PROVIDER' } });
  await assert.rejects(() => conflict.run({ apply: true }), /commit-outcome-unknown-pilot/); assert.equal(conflict.commits, 1);
  const ambiguous = harness({ beforeCommit: (h: any) => { h.document = { ...runtime('open'), updateTime: later }; }, commitError: new Error('SECRET_ECONNRESET') });
  await assert.rejects(() => ambiguous.run({ apply: true }), /commit-outcome-unknown-open/); assert.equal(ambiguous.commits, 1);
  const badReadback = harness({ afterCommit: (h: any) => { h.document = runtime('paused'); } });
  await assert.rejects(() => badReadback.run({ apply: true }), /open-write-not-verified/); assert.equal(badReadback.commits, 1);
});
test('main ayuda no inicia sesión y un gate bloqueado precede cloudFactory', async () => {
  const output: string[] = []; let factories = 0;
  await cli.main({ args: ['--help'], cloudFactory: () => assert.fail('help'), log: (value: string) => output.push(value) });
  await assert.rejects(() => cli.main({ args: [], localReader: async () => { throw new cli.OpeningError('real-release-required'); }, cloudFactory: async () => { factories++; } }), /real-release-required/);
  assert.equal(factories, 0);
  const h = harness(); const result = await cli.main({ args: [], localReader: async () => h.local, cloudFactory: async () => h, log: (value: string) => output.push(value) });
  assert.equal(result.mode, 'dry-run'); assert.equal(h.commits, 0);
  for (const error of [new Error('SECRET_EMAIL_TOKEN'), { status: 403, message: 'SECRET_EMAIL_TOKEN' }, { context: { response: { statusCode: 500 } }, body: { clientSecret: 'SECRET' } }]) assert.ok(!cli.safeErrorMessage(error).includes('SECRET'));
});
test('CLI inválido no imprime secretos ni inicia cloud', () => {
  const result = spawnSync(process.execPath, ['scripts/open-community.cjs', '--token', 'SECRET'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.ok(!result.stderr.includes('SECRET'));
});

test('nombre Google numérico sólo se admite tras GET directo que prueba el proyecto exacto', async () => {
  const h = harness({ google: { name: 'projects/123456789012/defaultSupportedIdpConfigs/google.com' } });
  assert.equal((await h.run()).checks.googleEnabled, true); assert.equal(h.commits, 0);
  for (const projectMetadata of [{ projectId: 'other' }, { projectNumber: '111' }, { projectNumber: 123456789012 }, { projectNumber: 'bad' }]) {
    const blocked = harness({ google: h.google, projectMetadata }); await assert.rejects(() => blocked.run({ apply: true })); assert.equal(blocked.commits, 0);
  }
});
test('no admite overrides de origen/credenciales antes de cargar la sesión humana', async () => {
  for (const key of ['FIREBASE_IDENTITY_URL', 'FIREBASE_TOKEN_URL', 'FIREBASE_GOOGLE_URL', 'FIREBASE_CLIENT_ID', 'FIREBASE_CLIENT_SECRET', 'FIREBASE_TOKEN', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'GOOGLE_APPLICATION_CREDENTIALS']) {
    await assert.rejects(() => cli.createCloudApis('/chosen', { env: { [key]: 'SECRET' }, loadModule: () => assert.fail('Must not load auth') }));
  }
});

test('paginación Enterprise conserva pageSize cero, filtro y token sin segundo intento', async () => {
  const requests: any[] = [];
  const api = { async request(request: any) {
    requests.push(request);
    assert.equal(request.method, 'GET'); assert.equal(request.queryParams.pageSize, 0); assert.equal(request.queryParams.filter, 'fixed-filter');
    return { status: 200, body: request.queryParams.pageToken ? { fields: [{ name: 'second' }] } : { fields: [{ name: 'first' }], nextPageToken: 'second-page' } };
  } };
  assert.deepEqual(await cli.paginated(api, 'fixed', 'fields', { pageSize: 0, filter: 'fixed-filter' }), [{ name: 'first' }, { name: 'second' }]);
  assert.equal(requests.length, 2); assert.equal(requests[1].queryParams.pageToken, 'second-page');
});

test('identidad del responsable usa sólo GET con proyección mínima y coincidencia exacta en todas las páginas', async () => {
  const requests: any[] = [];
  const account = { ...owner(), localId: 'owner-uid', passwordHash: 'SECRET_HASH', displayName: 'UNRELATED_NAME' };
  const api = { async request(request: any) {
    requests.push(request);
    assert.equal(request.method, 'GET'); assert.equal(request.path, cli.ACCOUNTS_PATH); assert.equal(request.body, undefined);
    assert.deepEqual(request.headers, { 'x-goog-user-project': cli.PROJECT_ID });
    assert.equal(request.queryParams.maxResults, 100); assert.equal(request.queryParams.fields, cli.ACCOUNT_FIELDS);
    assert.ok(!request.queryParams.fields.includes('password')); assert.ok(!request.queryParams.fields.includes('mfa'));
    return { status: 200, body: request.queryParams.nextPageToken ? { users: [account] } : { users: [{ localId: 'other-uid', email: 'other@example.invalid' }], nextPageToken: 'next' } };
  } };
  const identities = cli.readOnlyIdentityApi(api);
  const first = await identities.findUser(cli.PROJECT_ID, cli.OWNER_EMAIL.toUpperCase());
  const second = await identities.findUser(cli.PROJECT_ID, undefined, undefined, first.uid);
  assert.deepEqual(first, second);
  assert.equal(requests.length, 4); assert.equal(requests[1].queryParams.nextPageToken, 'next');
  assert.ok(!JSON.stringify(first).includes('SECRET_HASH')); assert.ok(!JSON.stringify(first).includes('UNRELATED_NAME'));
});

test('lectura GET de identidad falla cerrada para destino o búsqueda alternativos, duplicados y paginación inválida', async () => {
  let reads = 0;
  const blocked = cli.readOnlyIdentityApi({ request: async () => { reads++; assert.fail('No API allowed'); } });
  for (const args of [['other', cli.OWNER_EMAIL], [cli.PROJECT_ID], [cli.PROJECT_ID, 'other@example.invalid'], [cli.PROJECT_ID, cli.OWNER_EMAIL, '+123'], [cli.PROJECT_ID, cli.OWNER_EMAIL, undefined, 'owner-uid'], [cli.PROJECT_ID, undefined, undefined, 'bad uid']]) {
    await assert.rejects(() => blocked.findUser(...args), /invalid-owner-lookup/);
  }
  assert.equal(reads, 0);
  const account = { ...owner(), localId: 'owner-uid' };
  for (const value of [{ users: null }, { users: [null] }, { users: [{}] }, { users: [account, account] }, { users: [] }, { nextPageToken: 7 }, { nextPageToken: 'repeat' }]) {
    const identities = cli.readOnlyIdentityApi({ request: async (request: any) => { assert.equal(request.method, 'GET'); return { status: 200, body: value }; } });
    await assert.rejects(() => identities.findUser(cli.PROJECT_ID, cli.OWNER_EMAIL));
  }
});
