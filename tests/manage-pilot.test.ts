import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const cli = createRequire(import.meta.url)('../scripts/manage-pilot.cjs');
const config = { projectId: cli.PROJECT_ID, firestoreDatabaseId: cli.DATABASE_ID };
const owner = 'owner-uid';
const at = '2026-10-08T02:00:00.123456Z';
const later = '2026-10-08T02:01:00.123456Z';
function identity(uid = owner, email = cli.OWNER_EMAIL, extra: any = {}) {
  return { uid, email, emailVerified: true, disabled: false, providerUserInfo: [{ providerId: 'google.com', email }], customAttributes: JSON.stringify({ admin: uid === owner }), passwordHash: 'SECRET_HASH', refreshToken: 'SECRET_TOKEN', ...extra };
}
function runtime(status = 'setup', ids = [owner], extra: any = {}) {
  return { name: cli.DOCUMENT_NAME, updateTime: at, fields: {
    serviceStatus: { stringValue: status }, mediaUploadsEnabled: { booleanValue: false }, contactEmail: { stringValue: cli.OWNER_EMAIL }, updatedAt: { timestampValue: at },
    ...(status === 'pilot' ? { pilotUserIds: { arrayValue: { values: ids.map(stringValue => ({ stringValue })) } } } : {}), ...extra,
  } };
}
function harness(initial: any = null, users = [identity()], beforeCommit?: (h: any) => void) {
  const h: any = { document: initial, requests: [], identities: [], commits: 0 };
  h.identityApi = { async findUser(project: string, email?: string, phone?: string, uid?: string) {
    assert.equal(project, cli.PROJECT_ID); assert.equal(phone, undefined); h.identities.push({ email, uid });
    const user = users.find(value => uid ? value.uid === uid : value.email.toLowerCase() === email);
    if (!user) throw new Error('SECRET_USER_PROVIDER_MESSAGE');
    return structuredClone(user);
  } };
  h.api = { async request(request: any) {
    h.requests.push(structuredClone(request));
    if (request.method === 'GET') {
      assert.equal(request.path, cli.DOCUMENT_NAME);
      if (!h.document) throw { status: 404, message: 'SECRET_PROVIDER_MESSAGE' };
      return { status: 200, body: structuredClone(h.document) };
    }
    assert.equal(request.method, 'POST'); assert.equal(request.path, cli.COMMIT_PATH);
    h.commits++; if (beforeCommit) beforeCommit(h);
    const writes = request.body.writes; assert.equal(writes.length, 1);
    const write = writes[0]; assert.equal(write.update.name, cli.DOCUMENT_NAME);
    const actual = h.document ? { updateTime: h.document.updateTime } : { exists: false };
    if (JSON.stringify(write.currentDocument) !== JSON.stringify(actual)) throw { statusCode: 409, message: 'SECRET_PROVIDER_MESSAGE' };
    assert.deepEqual(write.updateTransforms, [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }]);
    assert.equal(Object.hasOwn(write, 'updateMask'), false);
    assert.equal(Object.hasOwn(write.update.fields, 'updatedAt'), false);
    h.document = { ...write.update, updateTime: later, fields: { ...write.update.fields, updatedAt: { timestampValue: later } } };
    return { status: 200, body: { writeResults: [{ updateTime: later }], commitTime: later } };
  } };
  h.run = (options: any = {}) => cli.managePilot({ config, emails: [cli.OWNER_EMAIL], ...options, api: h.api, identityApi: h.identityApi });
  return h;
}

test('operador piloto exige correos únicos, 1–5 participantes, destino fijo y simulación predeterminada', () => {
  assert.deepEqual(cli.parseArgs(['--email', cli.OWNER_EMAIL]), { help: false, apply: false, emails: [cli.OWNER_EMAIL] });
  assert.equal(cli.parseArgs(['--email', cli.OWNER_EMAIL, '--dry-run']).apply, false);
  assert.equal(cli.parseArgs(['--email', cli.OWNER_EMAIL, '--apply']).apply, true);
  assert.deepEqual(cli.parseArgs(['--email', 'ONE@example.invalid', '--email', 'two@example.invalid']).emails, ['one@example.invalid', 'two@example.invalid']);
  assert.equal(cli.parseArgs(['--help']).help, true);
  for (const args of [[], ['--apply'], ['--email'], ['--email', '--apply'], ['--email', cli.OWNER_EMAIL, '--email', cli.OWNER_EMAIL.toUpperCase()], ['--email', ' name@example.com'], ['--email', cli.OWNER_EMAIL, '--apply', '--dry-run'], ['--email', cli.OWNER_EMAIL, '--apply', '--apply'], ['--email', cli.OWNER_EMAIL, '--project', 'wrong'], ['--email', cli.OWNER_EMAIL, '--help'], ['--email', 'name:password@example.com'], Array.from({ length: 6 }, (_, index) => ['--email', `${index}@example.invalid`]).flat()]) assert.throws(() => cli.parseArgs(args));
  for (const wrong of [undefined, {}, { ...config, projectId: 'wrong' }, { ...config, firestoreDatabaseId: '(default)' }, { ...config, firestoreDatabaseId: 'ai-studio-9d2b1bbc-aff5-458a-bdf8-f2475620add0' }]) assert.throws(() => cli.validateConfig(wrong), /wrong-target/);
});

test('dry-run revisa Google, correo y UID del dueño sin modificar nube ni revelar datos privados', async () => {
  const h = harness(); const result = await h.run();
  assert.equal(h.commits, 0); assert.equal(h.requests.length, 1);
  assert.deepEqual(h.identities, [{ email: cli.OWNER_EMAIL, uid: undefined }, { email: undefined, uid: owner }]);
  assert.equal(result.action, 'planned'); assert.equal(result.mode, 'dry-run'); assert.equal(result.previousStatus, 'absent');
  assert.equal(result.pilotAccounts, 1); assert.equal(result.publicRegistrationOpen, false); assert.equal(result.mediaUploadsEnabled, false);
  const serialized = JSON.stringify(result); assert.ok(!serialized.includes('SECRET')); assert.ok(!serialized.includes(owner)); assert.ok(!serialized.includes(cli.OWNER_EMAIL));
});

test('alta ausente usa exists:false, timestamp servidor y sólo el documento runtime autorizado', async () => {
  const h = harness(); const result = await h.run({ apply: true });
  assert.equal(h.commits, 1); assert.equal(result.action, 'applied'); assert.equal(result.verified, true);
  const write = h.requests[1].body.writes[0]; assert.deepEqual(write.currentDocument, { exists: false });
  assert.deepEqual(Object.keys(h.document.fields).sort(), ['serviceStatus', 'mediaUploadsEnabled', 'contactEmail', 'updatedAt', 'pilotUserIds'].sort());
  assert.equal(h.document.fields.serviceStatus.stringValue, 'pilot'); assert.equal(h.document.fields.mediaUploadsEnabled.booleanValue, false);
  assert.deepEqual(h.document.fields.pilotUserIds.arrayValue.values, [{ stringValue: owner }]);
});

test('setup y pausa usan updateTime y el piloto conserva todos los participantes al añadir otro', async () => {
  for (const state of ['setup', 'paused']) {
    const h = harness(runtime(state)); await h.run({ apply: true });
    assert.deepEqual(h.requests[1].body.writes[0].currentDocument, { updateTime: at });
  }
  const h = harness(runtime('pilot', [owner, 'existing']), [identity(), identity('existing', 'existing@example.invalid'), identity('new', 'new@example.invalid')]);
  const result = await h.run({ apply: true, emails: ['new@example.invalid'] });
  assert.equal(result.retainedAccounts, 2); assert.equal(result.addedAccounts, 1); assert.equal(result.pilotAccounts, 3);
  assert.deepEqual(h.document.fields.pilotUserIds.arrayValue.values, ['existing', 'new', owner].sort().map(stringValue => ({ stringValue })));
  assert.ok(h.identities.some((value: any) => value.uid === 'existing'));
});

test('piloto ya correcto es idempotente y aun así vuelve a comprobar cada identidad', async () => {
  const h = harness(runtime('pilot')); const result = await h.run({ apply: true });
  assert.equal(result.action, 'unchanged'); assert.equal(result.verified, true); assert.equal(h.commits, 0); assert.equal(h.identities.length, 2);
});

test('identidad debe ser Google verificada, habilitada, correo exacto y UID exacto', async () => {
  for (const extra of [{ emailVerified: false }, { disabled: true }, { uid: 'bad/uid' }, { uid: '' }, { providerUserInfo: [] }, { providerUserInfo: [{ providerId: 'password' }] }, { providerUserInfo: [{ providerId: 'google.com', email: 'other@example.invalid' }] }, { customAttributes: '{malformed' }, { customAttributes: '[]' }]) {
    const h = harness(null, [identity(owner, cli.OWNER_EMAIL, extra)]);
    await assert.rejects(() => h.run({ apply: true })); assert.equal(h.commits, 0);
  }
  assert.throws(() => cli.checkedIdentity(identity(), { email: 'other@example.invalid' }), /identity-mismatch/);
  assert.throws(() => cli.checkedIdentity(identity(), { uid: 'other' }), /identity-mismatch/);
  const h = harness(); let calls = 0;
  h.identityApi.findUser = async () => ++calls === 1 ? identity() : identity('other');
  await assert.rejects(() => h.run({ apply: true }), /identity-mismatch/); assert.equal(h.commits, 0);
});

test('se requiere dueño con claim admin existente y la herramienta nunca concede claims', async () => {
  const noAdmin = harness(null, [identity(owner, cli.OWNER_EMAIL, { customAttributes: '{"admin":false}' })]);
  await assert.rejects(() => noAdmin.run({ apply: true }), /owner-admin-required/); assert.equal(noAdmin.commits, 0);
  const noOwner = harness(null, [identity('other', 'other@example.invalid')]);
  await assert.rejects(() => noOwner.run({ emails: ['other@example.invalid'], apply: true }), /owner-in-roster-required/); assert.equal(noOwner.commits, 0);
});

test('rechaza servicio abierto, medios activos, campos desconocidos y roster inválido antes de Auth', async () => {
  const invalid = [runtime('open'), runtime('setup', [], { mediaUploadsEnabled: { booleanValue: true } }), runtime('unknown'), runtime('setup', [], { unknown: { stringValue: 'secret' } }), runtime('setup', [], { pilotUserIds: { arrayValue: { values: [] } } }), runtime('pilot', []), runtime('pilot', [owner, owner]), runtime('pilot', ['unsafe/uid']), runtime('pilot', ['1', '2', '3', '4', '5', '6']), { ...runtime(), name: `${cli.DOCUMENT_NAME}-other` }, { ...runtime(), updateTime: undefined }, runtime('setup', [], { updatedAt: { stringValue: at } })];
  for (const document of invalid) {
    const h = harness(document); await assert.rejects(() => h.run({ apply: true }));
    assert.equal(h.commits, 0); assert.equal(h.identities.length, 0);
  }
});

test('retener participantes no permite exceder cinco ni conservar identidades deshabilitadas', async () => {
  const ids = [owner, 'a', 'b', 'c', 'd']; const users = [identity(), ...ids.slice(1).map(id => identity(id, `${id}@example.invalid`)), identity('new', 'new@example.invalid')];
  const full = harness(runtime('pilot', ids), users);
  await assert.rejects(() => full.run({ apply: true, emails: ['new@example.invalid'] }), /pilot-roster-limit/); assert.equal(full.commits, 0);
  const disabled = harness(runtime('pilot', [owner, 'old']), [identity(), identity('old', 'old@example.invalid', { disabled: true })]);
  await assert.rejects(() => disabled.run({ apply: true }), /ineligible-identity/); assert.equal(disabled.commits, 0);
});

test('carrera de alta o actualización falla CAS sin reintentar ni sobrescribir el estado concurrente', async () => {
  for (const document of [null, runtime('setup')]) {
    const concurrent = runtime('paused'); concurrent.updateTime = later;
    const h = harness(document, [identity()], current => { current.document = concurrent; });
    await assert.rejects(() => h.run({ apply: true }), (error: any) => error.statusCode === 409);
    assert.equal(h.commits, 1); assert.deepEqual(h.document, concurrent);
  }
});

test('lectura fallida no se confunde con ausencia y verificación fallida no causa otra escritura', async () => {
  const h = harness(); h.api.request = async () => { throw { status: 403, message: 'SECRET' }; };
  await assert.rejects(() => h.run({ apply: true }), (error: any) => error.status === 403); assert.equal(h.identities.length, 0);
  const altered = harness(); const request = altered.api.request;
  altered.api.request = async (options: any) => {
    const response = await request(options);
    if (options.method === 'POST') altered.document = runtime('paused');
    return response;
  };
  await assert.rejects(() => altered.run({ apply: true }), /pilot-write-not-verified/); assert.equal(altered.commits, 1);
});

test('sesión humana seleccionada por carpeta no usa ADC, tokens de entorno ni emuladores', async () => {
  const account = { user: { email: 'SECRET_OPERATOR_EMAIL' }, tokens: { refresh_token: 'SECRET_REFRESH' } };
  const logger = { silent: false }; let authorized = false; const requests: any[] = [];
  const modules: any = {
    'firebase-tools/lib/logger': { logger },
    'firebase-tools/lib/auth': { getProjectDefaultAccount: (root: string) => { assert.equal(root, '/chosen-project'); return account; }, setActiveAccount: (options: any, actual: any) => { assert.equal(options.project, cli.PROJECT_ID); assert.equal(actual, account); } },
    'firebase-tools/lib/requireAuth': { requireAuth: async (_: any, skipAutoAuth: boolean) => { assert.equal(logger.silent, true); assert.equal(skipAutoAuth, true); authorized = true; return account.user.email; } },
    'firebase-tools/lib/apiv2': { Client: class { constructor(options: any) { assert.equal(authorized, true); assert.deepEqual(options, { auth: true, apiVersion: 'v1', urlPrefix: 'https://firestore.googleapis.com' }); } async request(options: any) { requests.push(options); return { status: 200 }; } } },
    'firebase-tools/lib/gcp/auth': { findUser: () => {} },
  };
  const cloud = await cli.createCloudApis('/chosen-project', { loadModule: (name: string) => modules[name], env: {} });
  await cloud.api.request({ method: 'GET', path: cli.DOCUMENT_NAME });
  assert.deepEqual(requests[0].skipLog, { body: true, resBody: true, queryParams: true });
  for (const key of ['FIREBASE_TOKEN', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'GOOGLE_APPLICATION_CREDENTIALS']) await assert.rejects(() => cli.createCloudApis('/chosen-project', { env: { [key]: 'SECRET' }, loadModule: () => assert.fail('must not load provider') }), /human-production-session-required/);
  modules['firebase-tools/lib/auth'].getProjectDefaultAccount = () => null;
  await assert.rejects(() => cli.createCloudApis('/chosen-project', { loadModule: (name: string) => modules[name], env: {} }), /human-cli-login-required/);
  modules['firebase-tools/lib/auth'].getProjectDefaultAccount = () => account;
  modules['firebase-tools/lib/requireAuth'].requireAuth = async () => 'other@example.invalid';
  await assert.rejects(() => cli.createCloudApis('/chosen-project', { loadModule: (name: string) => modules[name], env: {} }), /human-session-mismatch/);
});

test('CLI no carga proveedores con argumentos o destino inválidos y no imprime cuentas ni credenciales', async () => {
  const output: string[] = []; let factories = 0;
  const h = harness();
  const cloudFactory = async () => { factories++; return { api: h.api, identityApi: h.identityApi }; };
  await cli.main({ args: ['--help'], cloudFactory: () => assert.fail('help does not authenticate'), log: (value: string) => output.push(value) });
  await assert.rejects(() => cli.main({ args: ['--email', cli.OWNER_EMAIL], readConfig: () => ({ ...config, firestoreDatabaseId: '(default)' }), cloudFactory }), /wrong-target/);
  assert.equal(factories, 0);
  const result = await cli.main({ args: ['--email', cli.OWNER_EMAIL], readConfig: () => config, cloudFactory, log: (value: string) => output.push(value) });
  assert.equal(result.mode, 'dry-run'); assert.equal(factories, 1);
  assert.ok(!output.join('\n').includes('SECRET')); assert.ok(!output.at(-1)!.includes(cli.OWNER_EMAIL));
  for (const error of [new Error('SECRET_EMAIL_TOKEN'), { status: 403, message: 'SECRET_EMAIL_TOKEN' }, { context: { response: { statusCode: 500 } }, body: { refreshToken: 'SECRET' } }]) assert.ok(!cli.safeErrorMessage(error).includes('SECRET'));
  const rejected = spawnSync(process.execPath, ['scripts/manage-pilot.cjs', '--email', 'name:SECRET_PASSWORD@example.com'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.equal(rejected.status, 1); assert.equal(rejected.stdout, ''); assert.ok(!rejected.stderr.includes('SECRET'));
});
