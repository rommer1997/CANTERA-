import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const cli = createRequire(import.meta.url)('../scripts/prepare-auth-domain.cjs');
const config = { projectId: cli.PROJECT_ID, firestoreDatabaseId: cli.DATABASE_ID };
const domain = 'cantera-tau.vercel.app';

test('dominio Auth exige argumentos explícitos y simulación predeterminada', () => {
  assert.deepEqual(cli.parseArgs(['--domain', domain]), { help: false, apply: false, domain, allowLocalhost: false });
  assert.equal(cli.parseArgs(['--domain', domain, '--dry-run']).apply, false);
  assert.equal(cli.parseArgs(['--apply', '--domain', domain]).apply, true);
  assert.equal(cli.parseArgs(['--help']).help, true);
  for (const args of [[], ['--apply'], ['--domain'], ['--domain', '--apply'], ['--domain', domain, '--apply', '--dry-run'], ['--domain', domain, '--apply', '--apply'], ['--domain', domain, '--domain', 'otro.example'], ['--domain', domain, '--project', 'otro'], ['--domain', domain, '--help'], [`--domain=${domain}`]]) assert.throws(() => cli.parseArgs(args), /Uso:/);
});

test('hostname no admite URLs, credenciales, rutas, puertos, comodines ni direcciones locales implícitas', () => {
  assert.equal(cli.validateDomain('CANTERA-TAU.VERCEL.APP'), domain);
  assert.equal(cli.validateDomain('xn--espaa-rta.example'), 'xn--espaa-rta.example');
  for (const value of ['', 'https://cantera-tau.vercel.app', 'http://example.com', 'example.com/path', 'example.com?key=SECRET', 'name:password@example.com', 'example.com:443', '*.example.com', 'localhost', 'foo.localhost', '127.0.0.1', '[::1]', 'example.com.', '-example.com', 'example-.com', 'x..com', 'a'.repeat(64) + '.com', ' x.example', 'x.example ', 'x\n.example', 'x%2Eexample.com', 'España.example', 'a'.repeat(250) + '.com']) assert.throws(() => cli.validateDomain(value), /Dominio inválido/);
  assert.equal(cli.parseArgs(['--domain', 'localhost', '--allow-localhost']).domain, 'localhost');
  assert.throws(() => cli.parseArgs(['--domain', domain, '--allow-localhost']), /sólo se admite/);
});

test('simulación conserva los dominios existentes y nunca escribe Auth', async () => {
  const existing = ['localhost', 'old.example', `${cli.PROJECT_ID}.firebaseapp.com`];
  let reads = 0; let writes = 0;
  const result = await cli.prepareAuthDomain({ config, domain, api: { getAuthDomains: async (project: string) => { assert.equal(project, cli.PROJECT_ID); reads++; return existing; }, updateAuthDomains: async () => { writes++; } } });
  assert.equal(result.action, 'planned'); assert.equal(result.mode, 'dry-run'); assert.equal(result.additions, 1); assert.equal(result.proposedCount, 4);
  assert.equal(reads, 1); assert.equal(writes, 0);
  assert.deepEqual(existing, ['localhost', 'old.example', `${cli.PROJECT_ID}.firebaseapp.com`]);
});

test('aplicación fusiona la segunda lectura y comprueba el resultado sin borrar adiciones ajenas', async () => {
  let reads = 0; const writes: string[][] = [];
  const responses = [['localhost', 'old.example'], ['localhost', 'old.example', 'added-concurrently.example'], ['localhost', 'old.example', 'added-concurrently.example', domain]];
  const result = await cli.prepareAuthDomain({ config, domain, apply: true, api: { getAuthDomains: async () => responses[reads++], updateAuthDomains: async (project: string, domains: string[]) => { assert.equal(project, cli.PROJECT_ID); writes.push(domains); } } });
  assert.deepEqual(writes, [['localhost', 'old.example', 'added-concurrently.example', domain]]);
  assert.equal(reads, 3); assert.equal(result.action, 'applied'); assert.equal(result.verified, true); assert.equal(result.previousCount, 3);
});

test('dominio ya presente evita escrituras, incluso si aparece entre las dos lecturas', async () => {
  let writes = 0;
  const updateAuthDomains = async () => { writes++; };
  const unchanged = await cli.prepareAuthDomain({ config, domain, apply: true, api: { getAuthDomains: async () => ['localhost', domain.toUpperCase()], updateAuthDomains } });
  assert.equal(unchanged.action, 'unchanged'); assert.equal(unchanged.verified, true);
  let reads = 0;
  const concurrent = await cli.prepareAuthDomain({ config, domain, apply: true, api: { getAuthDomains: async () => ++reads === 1 ? ['localhost'] : ['localhost', domain], updateAuthDomains } });
  assert.equal(concurrent.action, 'unchanged'); assert.equal(reads, 2); assert.equal(writes, 0);
});

test('deduplicación conserva la primera forma y es idempotente', async () => {
  const plan = cli.planDomainChange(['localhost', 'old.example', 'OLD.EXAMPLE', domain, domain], domain);
  assert.deepEqual(plan.domains, ['localhost', 'old.example', domain]); assert.equal(plan.duplicatesRemoved, 2); assert.equal(plan.additions, 0);
  assert.equal(cli.planDomainChange(plan.domains, domain).changed, false);
  let reads = 0; let writes = 0;
  const result = await cli.prepareAuthDomain({ config, domain, apply: true, api: { getAuthDomains: async () => ++reads < 3 ? ['old.example', 'OLD.EXAMPLE', domain] : ['old.example', domain], updateAuthDomains: async (_project: string, domains: string[]) => { assert.deepEqual(domains, ['old.example', domain]); writes++; } } });
  assert.equal(writes, 1); assert.equal(result.duplicatesRemoved, 1);
});

test('proyecto, base, entrada y configuración remota inválidos fallan antes de una escritura', async () => {
  let reads = 0; let writes = 0;
  const api = { getAuthDomains: async () => { reads++; return []; }, updateAuthDomains: async () => { writes++; } };
  for (const wrong of [null, {}, { ...config, projectId: 'other' }, { ...config, firestoreDatabaseId: '(default)' }]) await assert.rejects(() => cli.prepareAuthDomain({ config: wrong, domain, apply: true, api }), /base nombrada/);
  await assert.rejects(() => cli.prepareAuthDomain({ config, domain: 'https://example.com', apply: true, api }), /Dominio inválido/);
  assert.equal(reads, 0);
  for (const remote of [undefined, null, {}, ['localhost', null], ['localhost', ''], ['localhost', ' spaced.example']]) await assert.rejects(() => cli.prepareAuthDomain({ config, domain, apply: true, api: { ...api, getAuthDomains: async () => remote } }), /lista de dominios inválida/);
  assert.equal(writes, 0);
});

test('un resultado no verificable o un fallo remoto no produce una segunda escritura', async () => {
  for (const verified of [['old.example'], [domain]]) {
    let reads = 0; let writes = 0;
    await assert.rejects(() => cli.prepareAuthDomain({ config, domain, apply: true, api: { getAuthDomains: async () => ++reads < 3 ? ['old.example'] : verified, updateAuthDomains: async () => { writes++; } } }), /no pudo verificarse/);
    assert.equal(writes, 1);
  }
  let reads = 0; let writes = 0;
  await assert.rejects(() => cli.prepareAuthDomain({ config, domain, apply: true, api: { getAuthDomains: async () => { reads++; return ['old.example']; }, updateAuthDomains: async () => { writes++; throw new Error('SECRET_PROVIDER_MESSAGE'); } } }), /SECRET_PROVIDER_MESSAGE/);
  assert.equal(reads, 2); assert.equal(writes, 1);
});

test('módulos Firebase CLI simulados reciben la cuenta autorizada sin imprimir identidad ni credenciales', async () => {
  const loaded: string[] = []; const output: string[] = []; const account = { email: 'SECRET_EMAIL', refreshToken: 'SECRET_TOKEN' }; let authorized = false;
  const modules: Record<string, unknown> = {
    'firebase-tools/lib/auth': { getProjectDefaultAccount: (root: string) => { assert.equal(root, new URL('..', import.meta.url).pathname.replace(/\/$/, '')); return account; }, getGlobalDefaultAccount: () => { assert.fail('must respect project login:use account'); }, setActiveAccount: (options: { project: string }, received: unknown) => { assert.equal(options.project, cli.PROJECT_ID); assert.equal(received, account); } },
    'firebase-tools/lib/requireAuth': { requireAuth: async (options: { project: string }) => { assert.equal(options.project, cli.PROJECT_ID); authorized = true; } },
    'firebase-tools/lib/gcp/auth': { getAuthDomains: async () => { assert.equal(authorized, true); return ['localhost']; }, updateAuthDomains: async () => { assert.fail('dry-run must not write'); } },
  };
  const result = await cli.main({ args: ['--domain', domain], readConfig: () => ({ ...config, apiKey: 'SECRET_KEY' }), loadModule: (name: string) => { loaded.push(name); return modules[name]; }, log: (value: string) => output.push(value) });
  assert.equal(result.action, 'planned'); assert.equal(loaded.length, 3);
  assert.ok(!output.join('\n').includes('SECRET')); assert.ok(output[0].includes(domain)); assert.match(output[1], /Sólo lectura/);
});

test('ayuda e inputs inválidos no cargan Firebase, y no disponer de sesión impide consultar nube', async () => {
  let loaded = 0; let configReads = 0;
  const unavailable = () => { loaded++; assert.fail('must not load Firebase'); };
  await cli.main({ args: ['--help'], readConfig: () => { configReads++; return config; }, loadModule: unavailable, log: () => {} });
  await assert.rejects(() => cli.main({ args: ['--domain', 'name:password@example.com'], loadModule: unavailable }), /Dominio inválido/);
  await assert.rejects(() => cli.main({ args: ['--domain', domain], readConfig: () => ({ ...config, projectId: 'wrong' }), loadModule: unavailable }), /base nombrada/);
  assert.equal(loaded, 0); assert.equal(configReads, 0);
  let cloudReads = 0;
  await assert.rejects(() => cli.main({ args: ['--domain', domain], readConfig: () => config, loadModule: (name: string) => name.endsWith('/auth') && !name.includes('/gcp/') ? { getProjectDefaultAccount: () => null } : name.includes('/gcp/') ? { getAuthDomains: async () => { cloudReads++; return []; } } : { requireAuth: async () => {} } }), /cuenta propietaria/);
  assert.equal(cloudReads, 0);
});

test('errores CLI y del proveedor no reflejan email, token, clave ni argumentos rechazados', () => {
  const secret = 'SECRET_EMAIL_TOKEN_PASSWORD';
  assert.match(cli.safeErrorMessage({ status: 403, message: secret }), /HTTP 403/);
  for (const error of [{ status: 403, message: secret, email: secret }, { statusCode: 500, message: secret }, new Error(secret), { status: secret, code: secret }, { context: { response: { statusCode: 403, message: secret } } }]) assert.ok(!cli.safeErrorMessage(error).includes(secret));
  const rejected = spawnSync(process.execPath, ['scripts/prepare-auth-domain.cjs', '--domain', `name:${secret}@example.com`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.equal(rejected.status, 1); assert.equal(rejected.stdout, ''); assert.ok(!rejected.stderr.includes(secret));
});
