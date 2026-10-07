// Operator-only account export. Reads through Admin SDK; never changes cloud data.
// Node 24+, functions dependencies and Application Default Credentials required.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const usage = 'Uso: node scripts/export-account.cjs --uid UID [--dry-run | --apply --output output/private/cuenta.json]';

function parseArgs(args) {
  const result = { apply: false, dryRun: false, help: false, uid: '', output: '' };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    if (seen.has(option)) throw new Error('No repitas opciones.'); seen.add(option);
    if (option === '--apply') result.apply = true;
    else if (option === '--dry-run') result.dryRun = true;
    else if (option === '--help') result.help = true;
    else if (option === '--uid' || option === '--output') {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error('Falta un valor obligatorio.');
      result[option === '--uid' ? 'uid' : 'output'] = value;
    } else throw new Error('Opción no reconocida.');
  }
  if (result.help && args.length !== 1) throw new Error('Utiliza --help por separado.');
  if (!result.help && (!result.uid || result.apply && !result.output || result.apply && result.dryRun)) throw new Error(usage);
  return result;
}

function outputPath(root, requested) {
  const canonicalRoot = fs.realpathSync(root);
  const privateRoot = path.join(canonicalRoot, 'output', 'private');
  const target = path.resolve(canonicalRoot, requested);
  const relative = path.relative(privateRoot, target);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative) || path.extname(target).toLowerCase() !== '.json') throw new Error('La salida debe ser un archivo JSON dentro de output/private.');
  // Reject existing symlinks in every component, including output itself.
  let current = canonicalRoot;
  for (const segment of path.relative(canonicalRoot, target).split(path.sep)) {
    current = path.join(current, segment);
    let info;
    try { info = fs.lstatSync(current); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (info.isSymbolicLink()) throw new Error('La ruta de exportación no admite enlaces simbólicos.');
    if (current === target) throw new Error('El archivo de salida ya existe. Elige otro nombre.');
    if (!info.isDirectory()) throw new Error('La ruta de salida contiene un componente que no es una carpeta.');
  }
  return target;
}

function assertIgnored(root, target) {
  const canonicalRoot = fs.realpathSync(root);
  try { execFileSync('git', ['check-ignore', '--quiet', '--', path.relative(canonicalRoot, target)], { cwd: canonicalRoot, stdio: 'ignore' }); }
  catch { throw new Error('output/private debe estar excluido de Git antes de exportar.'); }
}

function writePrivateJson(root, requested, payload) {
  const target = outputPath(root, requested), privateRoot = path.join(fs.realpathSync(root), 'output', 'private');
  const directory = path.dirname(target);
  let current = fs.realpathSync(root);
  for (const segment of path.relative(current, directory).split(path.sep)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) fs.mkdirSync(current, { mode: 0o700 });
    const info = fs.lstatSync(current);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('La salida privada requiere carpetas locales sin enlaces simbólicos.');
    if (current === privateRoot || current.startsWith(`${privateRoot}${path.sep}`)) fs.chmodSync(current, 0o700);
  }
  // Repeat path validation after directory creation, then create exclusively.
  outputPath(root, requested);
  const descriptor = fs.openSync(target, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW || 0), 0o600);
  let complete = false;
  try {
    fs.fchmodSync(descriptor, 0o600);
    if (!fs.fstatSync(descriptor).isFile() || (fs.fstatSync(descriptor).mode & 0o777) !== 0o600) throw new Error('No se pudieron aplicar permisos privados al archivo.');
    fs.writeFileSync(descriptor, `${JSON.stringify(payload, null, 2)}\n`, 'utf8'); fs.fsyncSync(descriptor); complete = true;
  } finally {
    fs.closeSync(descriptor);
    if (!complete) fs.unlinkSync(target);
  }
  return target;
}

async function collectAccountSource({ db, auth, uid, projectId, databaseId, FieldPath, policies }) {
  const startedAt = new Date().toISOString();
  const record = document => ({ id: document.id, data: document.data(), ...(typeof document.ref?.path === 'string' ? { path: document.ref.path } : {}) });
  const readAll = async (query, rangeField) => {
    const ordered = rangeField ? query.orderBy(rangeField).orderBy(FieldPath.documentId()) : query.orderBy(FieldPath.documentId());
    const rows = []; let cursor;
    while (true) {
      const page = await (cursor ? ordered.startAfter(cursor) : ordered).limit(200).get();
      rows.push(...page.docs.map(record));
      if (page.size < 200) break;
      cursor = page.docs.at(-1);
    }
    return rows;
  };
  const getAuth = async () => {
    try { return await auth.getUser(uid); }
    catch (error) { if (error.code === 'auth/user-not-found') return null; throw error; }
  };
  const directNames = ['communityProfiles', 'communityPublicProfiles', 'communityAccountModeration', 'users'];
  const [identity, direct] = await Promise.all([getAuth(), db.getAll(...directNames.map(name => db.collection(name).doc(uid)))]);
  const collections = {};
  // Bounded concurrency without truncating any collection to a UI page window.
  const names = Object.keys(policies).filter(name => !['communityConnections', 'communityEventAdmissions'].includes(name));
  for (let index = 0; index < names.length; index += 4) await Promise.all(names.slice(index, index + 4).map(async name => {
    collections[name] = await readAll(db.collection(name).where(policies[name], '==', uid));
  }));
  // Incoming promotion proofs belong to their recipient as well. Other
  // recipients' inboxes remain private; they are never queried by event ID.
  collections.communityEventPromotions = [...(collections.communityEventPromotions || []), ...await readAll(db.collection('communityEventPromotions').where('recipientId', '==', uid))];
  // Invitations consumed by the requester are personal records even when
  // another person created the code. Do not read all invitations or accounts.
  collections.communityInvitations = [...(collections.communityInvitations || []), ...await readAll(db.collection('communityInvitations').where('usedBy', '==', uid))];
  collections.communityConnections = await readAll(db.collection('communityConnections').doc(uid).collection('members').where('ownerId', '==', uid));
  // A group named "members" may also contain contacts or future team records.
  // The equality query is personal; this exact path gate admits only receipts
  // under communityEventAdmissions. A missing index is an error, never a scan.
  collections.communityEventAdmissions = (await readAll(db.collectionGroup('members').where('userId', '==', uid))).filter(row => {
    if (typeof row.path !== 'string') return false;
    const parts = row.path.split('/');
    return parts.length === 4 && parts[0] === 'communityEventAdmissions' && parts[2] === 'members'
      && parts[3] === uid && row.id === uid && row.data.userId === uid && row.data.eventId === parts[1];
  });
  const eventCollection = db.collection('communityEvents');
  const events = [];
  const eventQueries = [
    [eventCollection.where('ownerId', '==', uid)],
    [eventCollection.where('participantIds', 'array-contains', uid)],
    [eventCollection.where('waitlistOrder', 'array-contains', uid)],
    // FieldPath protects UIDs containing dots. These single-field range queries
    // also recover legacy registrations, responses after withdrawal and old maps.
    ...[['participants', uid], ['waitlist', uid, 'name'], ['rsvps', uid]].map(parts => { const field = new FieldPath(...parts); return [eventCollection.where(field, '>=', ''), field]; }),
  ];
  for (const [query, rangeField] of eventQueries) events.push(...await readAll(query, rangeField));
  const fixtureRecords = [];
  const eventIds = [...new Set(events.map(event => event.id))];
  // Canonical scores and public change records are independent of the parent
  // event's legacy fixtures/cache. Restrict every lookup to a linked event.
  for (let index = 0; index < eventIds.length; index += 4) await Promise.all(eventIds.slice(index, index + 4).map(async eventId => {
    const [fixtures, changes] = await Promise.all([
      readAll(db.collection('communityFixtures').where('eventId', '==', eventId)),
      readAll(db.collection('communityEventChanges').where('eventId', '==', eventId)),
    ]);
    fixtureRecords.push(...fixtures);
    collections.communityEventChanges = [...(collections.communityEventChanges || []), ...changes];
  }));
  const teams = await readAll(db.collection('communityTeams').where('ownerId', '==', uid));
  const teamIds = new Set([...(collections.communityTeamMembers || []), ...(collections.communityTeamJoinRequests || [])].map(row => row.data.teamId).filter(id => typeof id === 'string' && id.length && id.length <= 128 && !/[\/\\\u0000-\u001f\u007f]/.test(id) && !['.', '..'].includes(id)));
  for (const row of teams) teamIds.delete(row.id);
  const ids = [...teamIds];
  for (let index = 0; index < ids.length; index += 100) {
    const documents = await db.getAll(...ids.slice(index, index + 100).map(id => db.collection('communityTeams').doc(id)));
    teams.push(...documents.filter(document => document.exists).map(record));
  }
  const legacyLikes = await readAll(db.collection('users').doc(uid).collection('likes'));
  return { uid, projectId, databaseId, startedAt, completedAt: new Date().toISOString(), auth: identity,
    privateProfile: direct[0].exists ? record(direct[0]) : null, publicProfile: direct[1].exists ? record(direct[1]) : null,
    moderation: direct[2].exists ? record(direct[2]) : null, legacyProfile: direct[3].exists ? record(direct[3]) : null,
    collections, events, fixtureRecords, teams, legacyLikes };
}

async function main() {
  let stage = 'arguments';
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) { console.log(usage); return; }
    if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Utiliza Node 24 o posterior.');
    const { assertExportUid, accountQueryPolicies, buildAccountExport } = await import('./account-export.ts');
    assertExportUid(options.uid);
    const root = fs.realpathSync(path.resolve(__dirname, '..'));
    let target;
    if (options.output) { target = outputPath(root, options.output); assertIgnored(root, target); }
    const config = JSON.parse(fs.readFileSync(path.join(root, 'firebase-applet-config.json'), 'utf8'));
    if (typeof config.projectId !== 'string' || !config.projectId || typeof config.firestoreDatabaseId !== 'string' || !config.firestoreDatabaseId) throw new Error('Falta la base nombrada de Cantera.');
    stage = 'credentials';
    const requireFunctions = createRequire(path.join(root, 'functions/package.json'));
    const { initializeApp, applicationDefault, deleteApp } = requireFunctions('firebase-admin/app');
    const { getFirestore, FieldPath } = requireFunctions('firebase-admin/firestore');
    const { getAuth } = requireFunctions('firebase-admin/auth');
    const app = initializeApp({ projectId: config.projectId, credential: applicationDefault() });
    try {
      stage = 'read';
      const source = await collectAccountSource({ db: getFirestore(app, config.firestoreDatabaseId), auth: getAuth(app), uid: options.uid,
        projectId: config.projectId, databaseId: config.firestoreDatabaseId, FieldPath, policies: accountQueryPolicies });
      stage = 'projection'; const payload = buildAccountExport(source);
      if (options.apply) { stage = 'private-output'; assertIgnored(root, target); writePrivateJson(root, target, payload); }
      console.log(JSON.stringify({ project: config.projectId, database: config.firestoreDatabaseId, mode: options.apply ? 'apply-local-export' : 'dry-run', counts: payload.counts, written: options.apply }));
      if (!options.apply) console.log('Simulación completada. No se ha escrito un archivo ni modificado la nube.');
    } finally { await deleteApp(app); }
  } catch (error) {
    // SDK error messages may contain personal identifiers. Never echo them.
    const code = typeof error.code === 'string' && /^[A-Za-z0-9_/-]{1,80}$/.test(error.code) ? error.code : typeof error.code === 'number' ? String(error.code) : 'export-failed';
    console.error(`Exportación no completada (${stage}, ${code}). Revisa las opciones, permisos ADC, índices y la carpeta privada. Utiliza --help y docs/ACCOUNT_RIGHTS.md.`);
    process.exitCode = 1;
  }
}

module.exports = { parseArgs, outputPath, assertIgnored, writePrivateJson, collectAccountSource };
if (require.main === module) void main();
