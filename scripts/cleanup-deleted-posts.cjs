// Manual maintenance only. Requires owner-authorized Admin credentials with IAM access.
// Default: read-only preview. No Functions, Storage, scheduling, broad scans or user content logs.
// Usage: node scripts/cleanup-deleted-posts.cjs --post POST_ID [--post POST_ID] [--max-batches 8] [--dry-run | --apply]
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createRequire } = require('node:module');

(async () => {
  const { parseCleanupArguments, cleanDeletedPostInteractions } = await import('./deleted-post-cleanup.mjs');
  let options;
  try { options = parseCleanupArguments(process.argv.slice(2)); }
  catch {
    console.error('Uso: node scripts/cleanup-deleted-posts.cjs --post ID [--post ID] [--max-batches 1..32] [--dry-run | --apply]. Máximo 20 publicaciones; dry-run por defecto.');
    process.exitCode = 1; return;
  }
  const config = JSON.parse(readFileSync(resolve(__dirname, '../firebase-applet-config.json'), 'utf8'));
  const { PROJECT_ID, DATABASE_ID } = await import('../functions/config.mjs');
  if (config.projectId !== PROJECT_ID || config.firestoreDatabaseId !== DATABASE_ID) {
    throw new Error('Invalid project configuration');
  }
  const requireFunctions = createRequire(resolve(__dirname, '../functions/package.json'));
  const { initializeApp, applicationDefault, deleteApp } = requireFunctions('firebase-admin/app');
  const { getFirestore, FieldPath } = requireFunctions('firebase-admin/firestore');
  const app = initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() });
  try {
    const db = getFirestore(app, DATABASE_ID);
    const result = await cleanDeletedPostInteractions({ db, documentIdField: FieldPath.documentId(), ...options });
    console.log(JSON.stringify({ project: PROJECT_ID, database: DATABASE_ID, ...result }));
    if (!options.apply) console.log('Sólo lectura. Revisa los totales antes de autorizar --apply.');
    if (result.exhausted) console.log(`Se alcanzó el límite de lotes. Continúa desde la publicación ${result.completedPosts + result.protectedPosts + 1} de tu lista: omite los IDs anteriores ya revisados o aumenta --max-batches hasta 32.`);
  } finally { await deleteApp(app); }
})().catch(() => {
  // Admin errors can contain document paths and user data: never echo them publicly.
  console.error('La limpieza no se completó. Comprueba las credenciales autorizadas, la configuración y la conexión. Puede repetirse de forma idempotente; no se modifican publicaciones activas.');
  process.exitCode = 1;
});
