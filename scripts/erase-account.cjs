// Operator-only; dry-run is the default. Never run --apply without a verified
// rights request, a reviewed plan and a coordinated closed maintenance window.
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const { outputPath, assertIgnored, writePrivateJson, collectAccountSource } = require('./export-account.cjs');
const usage = 'Uso: node scripts/erase-account.cjs --uid UID [--dry-run] [--output output/private/plan.json] | --uid UID --apply --plan output/private/plan.json --confirm SHA256 --journal output/private/run.json [--max-batches 1..32]';

function parseErasureArguments(args) {
  const value = { uid: '', apply: false, dryRun: false, output: '', plan: '', confirm: '', journal: '', maxBatches: 8, help: false }, seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (seen.has(key)) throw new Error('repeated-option'); seen.add(key);
    if (key === '--apply') value.apply = true;
    else if (key === '--dry-run') value.dryRun = true;
    else if (key === '--help') value.help = true;
    else if (['--uid', '--output', '--plan', '--confirm', '--journal', '--max-batches'].includes(key)) {
      const next = args[++index]; if (!next || next.startsWith('--')) throw new Error('missing-value');
      value[key.slice(2) === 'max-batches' ? 'maxBatches' : key.slice(2)] = key === '--max-batches' ? Number(next) : next;
    } else throw new Error('unknown-option');
  }
  if (value.help) { if (args.length !== 1) throw new Error('help-alone'); return value; }
  if (!value.uid || !Number.isInteger(value.maxBatches) || value.maxBatches < 1 || value.maxBatches > 32
    || value.apply && (value.dryRun || value.output || !value.plan || !value.journal || !/^[a-f0-9]{64}$/.test(value.confirm))
    || !value.apply && (value.plan || value.journal || value.confirm || seen.has('--max-batches'))) throw new Error('invalid-options');
  return value;
}

function readPrivateJson(root, requested) {
  const canonicalRoot = fs.realpathSync(root), privateRoot = path.join(canonicalRoot, 'output/private'), target = path.resolve(canonicalRoot, requested);
  const relative = path.relative(privateRoot, target);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || path.extname(target) !== '.json') throw new Error('private-path-required');
  let current = canonicalRoot;
  for (const segment of path.relative(canonicalRoot, target).split(path.sep)) {
    current = path.join(current, segment); const info = fs.lstatSync(current);
    if (info.isSymbolicLink() || current !== target && !info.isDirectory()) throw new Error('unsafe-private-path');
    if ((current === privateRoot || current.startsWith(`${privateRoot}${path.sep}`)) && current !== target && (info.mode & 0o077)) throw new Error('private-directory-permissions');
  }
  assertIgnored(canonicalRoot, target);
  const descriptor = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const info = fs.fstatSync(descriptor);
    if (!info.isFile() || info.nlink !== 1 || (info.mode & 0o777) !== 0o600 || info.size > 8 * 1024 * 1024) throw new Error('private-file-permissions-or-size');
    return { target, value: JSON.parse(fs.readFileSync(descriptor, 'utf8')) };
  } finally { fs.closeSync(descriptor); }
}

function replacePrivateJson(root, target, payload) {
  // Revalidate an existing file before replacing it. Renaming a fully flushed
  // sibling preserves the last complete journal on an interrupted write.
  if (fs.existsSync(target)) readPrivateJson(root, target);
  else { outputPath(root, target); assertIgnored(root, target); }
  const temporary = `${target}.${randomUUID()}.json`;
  try {
    writePrivateJson(root, temporary, payload);
    fs.renameSync(temporary, target);
    const directory = fs.openSync(path.dirname(target), fs.constants.O_RDONLY);
    try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

async function main() {
  let stage = 'arguments', lock, app, deleteApp;
  try {
    const options = parseErasureArguments(process.argv.slice(2));
    if (options.help) { console.log(usage); return; }
    if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('node-24-required');
    const { assertErasureUid, collectErasureSource, buildErasurePlan, assertReviewedPlan, applyErasurePlan } = await import('./account-erasure.mjs');
    const { accountQueryPolicies } = await import('./account-export.ts');
    const { PROJECT_ID, DATABASE_ID } = await import('../functions/config.mjs');
    assertErasureUid(options.uid);
    const root = fs.realpathSync(path.resolve(__dirname, '..'));
    const config = JSON.parse(fs.readFileSync(path.join(root, 'firebase-applet-config.json'), 'utf8'));
    if (config.projectId !== PROJECT_ID || config.firestoreDatabaseId !== DATABASE_ID || DATABASE_ID === '(default)') throw new Error('project-database-mismatch');
    let plan, journal, journalPath;
    if (options.output) { const target = outputPath(root, options.output); assertIgnored(root, target); }
    if (options.apply) {
      stage = 'reviewed-plan';
      plan = readPrivateJson(root, options.plan).value;
      assertReviewedPlan(plan, { uid: options.uid, projectId: PROJECT_ID, databaseId: DATABASE_ID, confirm: options.confirm });
      journalPath = path.resolve(root, options.journal);
      if (path.resolve(root, options.plan) === journalPath) throw new Error('separate-journal-required');
      if (fs.existsSync(journalPath)) journal = readPrivateJson(root, journalPath).value;
      else { outputPath(root, journalPath); assertIgnored(root, journalPath); }
      fs.mkdirSync(path.dirname(journalPath), { recursive: true, mode: 0o700 });
      // Existing private subfolders must also be inaccessible to other users.
      let directory = path.join(root, 'output/private');
      for (const segment of ['', ...path.relative(directory, path.dirname(journalPath)).split(path.sep).filter(Boolean)]) {
        directory = path.join(directory, segment); const info = fs.lstatSync(directory);
        if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o077)) throw new Error('private-directory-permissions');
      }
      // One run per journal. A stale lock requires human review after a crash.
      lock = { path: `${journalPath}.lock`, descriptor: null };
      lock.descriptor = fs.openSync(lock.path, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW || 0), 0o600);
      fs.writeFileSync(lock.descriptor, `${process.pid}\n`); fs.fsyncSync(lock.descriptor);
    }
    stage = 'credentials';
    const requireFunctions = createRequire(path.join(root, 'functions/package.json'));
    const adminApp = requireFunctions('firebase-admin/app'); deleteApp = adminApp.deleteApp;
    const { getFirestore, FieldPath } = requireFunctions('firebase-admin/firestore');
    const { getAuth } = requireFunctions('firebase-admin/auth');
    app = adminApp.initializeApp({ projectId: PROJECT_ID, credential: adminApp.applicationDefault() });
    const db = getFirestore(app, DATABASE_ID), auth = getAuth(app);
    const collectFresh = () => collectErasureSource({ db, auth, uid: options.uid, projectId: PROJECT_ID, databaseId: DATABASE_ID, FieldPath, collectAccountSource, policies: accountQueryPolicies });
    stage = options.apply ? 'apply' : 'read-only-plan';
    if (!options.apply) {
      plan = buildErasurePlan(await collectFresh());
      if (options.output) writePrivateJson(root, options.output, plan);
      console.log(JSON.stringify({ project: PROJECT_ID, database: DATABASE_ID, mode: 'dry-run', candidateOperations: plan.operations.length, blockers: plan.blockers, digest: plan.digest, writtenPrivatePlan: !!options.output }));
      console.log('Sólo lectura de nube. Revisa el plan privado, las referencias compartidas y la solicitud antes de autorizar su aplicación.');
      return;
    }
    const result = await applyErasurePlan({ db, auth, plan, collectFresh, journal, maxBatches: options.maxBatches,
      saveJournal: next => replacePrivateJson(root, journalPath, next) });
    console.log(JSON.stringify({ project: PROJECT_ID, database: DATABASE_ID, mode: 'apply', ...result }));
    if (!result.completeKnownScope) console.log('Ejecución parcial. Reanuda el mismo plan y diario; no declares completada la solicitud.');
    else console.log('Esquema conocido y Auth retirados. La revisión de conservación, copias, dispositivos y texto libre sigue siendo responsabilidad del operador.');
  } catch (error) {
    // No SDK messages, paths, identifiers, codes or submitted content in logs.
    const code = typeof error.code === 'string' && /^[A-Za-z0-9_/-]{1,80}$/.test(error.code) ? error.code : 'erasure-not-completed';
    console.error(`Supresión no completada (${stage}, ${code}). Consulta docs/ACCOUNT_RIGHTS.md; conserva el plan y diario privados para revisar y reanudar.`);
    process.exitCode = 1;
  } finally {
    try { if (app && deleteApp) await deleteApp(app); }
    catch { console.error('No se pudo cerrar la sesión local de la herramienta.'); process.exitCode = 1; }
    if (lock?.descriptor !== null && lock?.descriptor !== undefined) {
      try { fs.closeSync(lock.descriptor); fs.unlinkSync(lock.path); }
      catch { console.error('Revisa el bloqueo local del diario antes de reanudar.'); process.exitCode = 1; }
    }
  }
}
module.exports = { parseErasureArguments, readPrivateJson, replacePrivateJson };
if (require.main === module) void main();
