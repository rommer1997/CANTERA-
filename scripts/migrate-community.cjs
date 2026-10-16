// Node 24, dependencies from functions/, and owner-authorized Admin ADC.
// No credential file is loaded and no public profile is created/replaced.
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createRequire } = require('node:module');
const PAGE_SIZE = 200;
const DATABASE_ID = 'ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb';
const usage = 'Uso: node scripts/migrate-community.cjs [--dry-run | --apply] [--collection=communityEvents]';
let planner;
async function getPlanner() { return planner ||= import('./migration-plan.ts'); }

async function parseArguments(args) {
  const { MIGRATION_COLLECTIONS } = await getPlanner();
  if (args.includes('--help')) {
    if (args.length !== 1) throw new Error(usage);
    return { help: true, apply: false, collections: [] };
  }
  if (args.includes('--apply') && args.includes('--dry-run') || args.some(arg => !['--apply', '--dry-run'].includes(arg) && !arg.startsWith('--collection='))) throw new Error(usage);
  const collections = [...new Set(args.filter(arg => arg.startsWith('--collection=')).map(arg => arg.slice('--collection='.length)))];
  if (collections.some(name => !MIGRATION_COLLECTIONS.includes(name))) throw new Error(`Colección fuera de la migración. ${usage}`);
  return { help: false, apply: args.includes('--apply'), collections: collections.length ? collections : MIGRATION_COLLECTIONS };
}

async function migrateDocument({ db, collection, ref, FieldPath, Timestamp, apply = false }) {
  const { planMigration } = await getPlanner();
  // The page snapshot is deliberately never used as the write source. Firestore
  // retries reread/replan after concurrent edits; deleted documents stay deleted.
  return db.runTransaction(async transaction => {
    const current = await transaction.get(ref);
    if (!current.exists) return { status: 'missing', issues: [] };
    const plan = planMigration(collection, current.id, current.data());
    if (plan.blocked) return { status: 'skipped', issues: plan.issues };
    if (!plan.patches.length) return { status: 'unchanged', issues: [] };
    if (apply) {
      const fields = plan.patches.flatMap(patch => [new FieldPath(...patch.path), patch.type === 'timestamp'
        ? new Timestamp(patch.value.seconds, patch.value.nanoseconds) : patch.value]);
      // FieldPath segments safely handle UIDs containing dots; update preserves
      // teamId, all sporting fields and the existing projection/consent boundary.
      transaction.update(ref, ...fields);
    }
    return { status: apply ? 'updated' : 'planned', issues: [] };
  }, apply ? undefined : { readOnly: true });
}

async function runMigration({ db, FieldPath, Timestamp, collections, apply = false }) {
  const { MIGRATION_COLLECTIONS } = await getPlanner();
  const selected = collections || MIGRATION_COLLECTIONS;
  if (!Array.isArray(selected) || selected.some(name => !MIGRATION_COLLECTIONS.includes(name))) throw new Error('Colección fuera de la migración.');
  const counts = {};
  for (const collection of [...new Set(selected)]) {
    const count = { scanned: 0, planned: 0, updated: 0, unchanged: 0, missing: 0, skipped: 0, issues: {} };
    counts[collection] = count;
    let cursor;
    while (true) {
      let page = db.collection(collection).orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
      if (cursor) page = page.startAfter(cursor);
      const snapshot = await page.get();
      if (snapshot.empty) break;
      for (const item of snapshot.docs) {
        const outcome = await migrateDocument({ db, collection, ref: item.ref, FieldPath, Timestamp, apply });
        count.scanned += 1; count[outcome.status] += 1;
        for (const issue of outcome.issues) count.issues[issue.code] = (count.issues[issue.code] || 0) + 1;
      }
      cursor = snapshot.docs.at(-1);
    }
  }
  return counts;
}

async function main() {
  const options = await parseArguments(process.argv.slice(2));
  if (options.help) { console.log(`${usage}\nPor defecto sólo lee y calcula cambios. No ejecuta despliegues. Lotes de lectura: ${PAGE_SIZE}.`); return; }
  const config = JSON.parse(readFileSync(resolve(__dirname, '../firebase-applet-config.json'), 'utf8'));
  if (!config.projectId || config.firestoreDatabaseId !== DATABASE_ID) throw new Error('La configuración no apunta a la base nombrada de Cantera; migración detenida.');
  const requireFunctions = createRequire(resolve(__dirname, '../functions/package.json'));
  const { initializeApp, applicationDefault } = requireFunctions('firebase-admin/app');
  const { getFirestore, FieldPath, Timestamp } = requireFunctions('firebase-admin/firestore');
  const app = initializeApp({ projectId: config.projectId, credential: applicationDefault() });
  const db = getFirestore(app, DATABASE_ID);
  const counts = await runMigration({ db, FieldPath, Timestamp, ...options });
  // Aggregate only: never log profile fields, consent, comment text or waitlist names.
  console.log(JSON.stringify({ project: config.projectId, database: DATABASE_ID, mode: options.apply ? 'apply' : 'dry-run', pageSize: PAGE_SIZE, counts }));
  if (!options.apply) console.log('Sólo lectura. Ningún documento modificado.');
}

module.exports = { PAGE_SIZE, DATABASE_ID, parseArguments, migrateDocument, runMigration };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
