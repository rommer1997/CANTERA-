import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const buildCheck = fileURLToPath(new URL('../scripts/check-build.mjs', import.meta.url));
const releaseCheck = fileURLToPath(new URL('../scripts/check-release.mjs', import.meta.url));
const fixtureEnvironment = [
  'VITE_OPERATOR_NAME=Responsable de prueba',
  'VITE_OPERATOR_COUNTRY=España',
  'VITE_CONTACT_EMAIL=prueba@example.test',
  'VITE_ENABLE_DEMO=false',
  'VITE_ENABLE_MEDIA_UPLOADS=false',
].join('\n');

async function fixture(files: Record<string, string>, run: (directory: string) => void | Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'cantera-release-env-'));
  try {
    await writeFile(join(directory, 'firebase-applet-config.json'), JSON.stringify({
      projectId: 'test-cantera', firestoreDatabaseId: 'test-database',
    }));
    for (const [name, content] of Object.entries(files)) await writeFile(join(directory, name), content);
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function check(script: string, directory: string, overrides: Record<string, string> = {}) {
  // Do not inherit real deployment flags or operator data into synthetic fixtures.
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('VITE_')));
  const result = spawnSync(process.execPath, [script], {
    cwd: directory, env: { ...environment, ...overrides }, encoding: 'utf8',
  });
  assert.ifError(result.error);
  return { status: result.status, output: result.stdout + result.stderr };
}

async function testApproval(directory: string, checks: Record<string, boolean>) {
  await mkdir(join(directory, 'docs'));
  // This acta exists only inside the isolated test fixture, never in the project.
  await writeFile(join(directory, 'docs/release-approved.json'), JSON.stringify({
    approvedBy: 'Persona de prueba', approvedAt: new Date().toISOString(),
    projectId: 'test-cantera', databaseId: 'test-database', checks,
  }));
}

const completeChecks = {
  rulesAndIndexes: true, migration: true, twoAccounts: true, admin: true,
  authDomain: true, backupRestore: true, support: true, legalAndPrivacy: true, accountRights: true,
};

test('un flag de apertura del proceso no puede saltarse el acta aunque .env.local indique false', async () => {
  await fixture({ '.env.local': fixtureEnvironment + '\nVITE_SERVICE_OPEN=false\n' }, directory => {
    const result = check(buildCheck, directory, { VITE_SERVICE_OPEN: 'true' });
    assert.equal(result.status, 1);
    assert.match(result.output, /OK · Apertura pública expresamente configurada/);
    assert.match(result.output, /PENDIENTE · Acta de revisión de nube/);
    assert.doesNotMatch(result.output, /Compilación con apertura pública desactivada/);
  });
});

test('la compilación cerrada respeta la prioridad production.local y no exige acta de apertura', async () => {
  await fixture({
    '.env': 'VITE_SERVICE_OPEN=true\n',
    '.env.local': 'VITE_SERVICE_OPEN=false\n',
    '.env.production': 'VITE_SERVICE_OPEN=true\n',
    '.env.production.local': 'VITE_SERVICE_OPEN=false\n',
  }, directory => {
    const result = check(buildCheck, directory);
    assert.equal(result.status, 0);
    assert.match(result.output, /Compilación con apertura pública desactivada/);
    assert.doesNotMatch(result.output, /OK · Apertura pública/);
  });
});

test('un cierre explícito del proceso prevalece sobre la apertura de los archivos', async () => {
  await fixture({ '.env.production.local': 'VITE_SERVICE_OPEN=true\n' }, directory => {
    const result = check(buildCheck, directory, { VITE_SERVICE_OPEN: 'false' });
    assert.equal(result.status, 0);
    assert.match(result.output, /Compilación con apertura pública desactivada/);
  });
});

test('check-release conserva la prioridad del proceso y rechaza una comprobación pendiente del acta', async () => {
  await fixture({ '.env.local': fixtureEnvironment + '\nVITE_SERVICE_OPEN=false\n' }, async directory => {
    await testApproval(directory, { ...completeChecks, twoAccounts: false });
    const result = check(releaseCheck, directory, { VITE_SERVICE_OPEN: 'true' });
    assert.equal(result.status, 1);
    assert.match(result.output, /OK · Apertura pública expresamente configurada/);
    assert.match(result.output, /OK · Acta de revisión de nube/);
    assert.match(result.output, /PENDIENTE · Prueba real entre dos cuentas/);
  });
});

test('el acta completa no permite habilitar demo o multimedia desde el proceso', async () => {
  await fixture({ '.env.local': fixtureEnvironment + '\nVITE_SERVICE_OPEN=true\n' }, async directory => {
    await testApproval(directory, completeChecks);
    const valid = check(releaseCheck, directory);
    assert.equal(valid.status, 0, valid.output);
    const invalid = check(releaseCheck, directory, { VITE_ENABLE_DEMO: 'true', VITE_ENABLE_MEDIA_UPLOADS: 'true' });
    assert.equal(invalid.status, 1);
    assert.match(invalid.output, /PENDIENTE · Modo de prueba desactivado/);
    assert.match(invalid.output, /PENDIENTE · Carga multimedia permanece cerrada/);
  });
});

test('el acta debe corresponder al proyecto efectivo del proceso, no al del archivo', async () => {
  await fixture({ '.env.local': fixtureEnvironment + '\nVITE_SERVICE_OPEN=true\nVITE_FIREBASE_PROJECT_ID=test-cantera\n' }, async directory => {
    await testApproval(directory, completeChecks);
    const result = check(releaseCheck, directory, { VITE_FIREBASE_PROJECT_ID: 'another-test-project' });
    assert.equal(result.status, 1);
    assert.match(result.output, /PENDIENTE · Acta de revisión de nube/);
  });
});
