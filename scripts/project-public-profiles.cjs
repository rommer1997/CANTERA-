// Prepare the public sporting projection without exposing private account fields.
// Requires Node 24, functions dependencies and owner-authorized Admin credentials.
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createRequire } = require('node:module');
const requireFunctions = createRequire(resolve(__dirname, '../functions/package.json'));

(async () => {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--dry-run', '--apply'].includes(arg)) || args.includes('--dry-run') && args.includes('--apply')) {
    throw new Error('Uso: node scripts/project-public-profiles.cjs [--dry-run | --apply]');
  }
  const apply = args.includes('--apply');
  const { initializeApp, applicationDefault } = requireFunctions('firebase-admin/app');
  const { getFirestore, FieldPath } = requireFunctions('firebase-admin/firestore');
  const { normalizeProfile, normalizePublicProfile } = await import('../src/community/normalization.ts');
  const { TERMS_VERSION } = await import('../src/community/policy.ts');
  const config = JSON.parse(readFileSync(resolve(__dirname, '../firebase-applet-config.json'), 'utf8'));
  if (!config.projectId || !config.firestoreDatabaseId) throw new Error('Falta la base nombrada de Cantera.');
  const app = initializeApp({ projectId: config.projectId, credential: applicationDefault() });
  const db = getFirestore(app, config.firestoreDatabaseId);
  const source = db.collection('communityProfiles');
  const target = db.collection('communityPublicProfiles');
  const counts = { scanned: 0, invalid: 0, incomplete: 0, unchanged: 0, projected: 0 };
  let cursor;
  while (true) {
    let page = source.orderBy(FieldPath.documentId()).limit(200);
    if (cursor) page = page.startAfter(cursor);
    const snapshot = await page.get();
    if (snapshot.empty) break;
    for (const document of snapshot.docs) {
      counts.scanned += 1;
      // Reread within the transaction so edits cannot be overwritten by a stale page.
      const outcome = await db.runTransaction(async transaction => {
        const current = await transaction.get(document.ref);
        const profile = current.exists ? normalizeProfile(current.data(), current.id) : null;
        if (!profile) return 'invalid';
        if (!profile.adultConfirmed || profile.acceptedTermsVersion !== TERMS_VERSION) return 'incomplete';
        const projection = normalizePublicProfile(profile, current.id);
        if (!projection) return 'invalid';
        const publicRef = target.doc(current.id);
        const existing = await transaction.get(publicRef);
        const fields = existing.exists ? existing.data() : null;
        const same = fields && Object.keys(fields).length === Object.keys(projection).length
          && Object.entries(projection).every(([key, value]) => fields[key] === value);
        if (same) return 'unchanged';
        // Replace, never merge: legacy private fields must not survive in the projection.
        if (apply) transaction.set(publicRef, projection);
        return 'projected';
      });
      counts[outcome] += 1;
    }
    cursor = snapshot.docs.at(-1);
  }
  console.log(JSON.stringify({ project: config.projectId, database: config.firestoreDatabaseId,
    mode: apply ? 'apply' : 'dry-run', ...counts }));
  if (!apply) console.log('Sólo lectura. Revisa los totales antes de autorizar --apply.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
