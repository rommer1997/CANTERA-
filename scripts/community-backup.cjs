// Operator-only, read-only Firestore snapshot. Credentials never enter the file.
const fs = require('node:fs');
const path = require('node:path');
const { createHash, timingSafeEqual } = require('node:crypto');
const { outputPath, assertIgnored, writePrivateJson } = require('./export-account.cjs');

const PROJECT_ID = 'gen-lang-client-0853130215';
const DATABASE_ID = 'ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb';
const FORMAT = 'lacantera.community-backup';
const VERSION = 1;
const PAGE_SIZE = 200;
const MAX_FILE_BYTES = 256 * 1024 * 1024;
const MAX_DOCUMENTS = 100000;
const ROOT_COLLECTIONS = Object.freeze([
  'communityAccountModeration', 'communityBlocks', 'communityComments', 'communityConfiguration',
  'communityConnections', 'communityConversations', 'communityEventAdmissions', 'communityEventChanges',
  'communityEventDeliveries', 'communityEventNotices', 'communityEventPromotions', 'communityEvents',
  'communityFixtures', 'communityFollows', 'communityInvitations', 'communityLikes', 'communityPosts',
  'communityProfiles', 'communityPublicProfiles', 'communityReports', 'communityRightsRequests',
  'communityTeamInvites', 'communityTeamJoinRequests', 'communityTeamMembers', 'communityTeams', 'communityVerifications',
].sort());
const NESTED_COLLECTIONS = Object.freeze({ communityConnections: 'members', communityEventAdmissions: 'members', communityConversations: 'messages' });
const EXCLUDED = Object.freeze(['firebase-auth', 'storage-binaries', 'firestore-rules-and-indexes', 'hosting', 'functions', 'non-community-root-collections']);
const USAGE = 'Uso: node scripts/community-backup.cjs [--dry-run | --apply --output output/private/respaldo.json]';
const error = code => { throw new Error(code); };
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const onlyKeys = (value, keys) => plain(value) && Object.keys(value).every(key => keys.includes(key));
const resourceBase = (project = PROJECT_ID, database = DATABASE_ID) => `projects/${project}/databases/${database}/documents`;
const validSegment = value => typeof value === 'string' && value.length > 0 && Buffer.byteLength(value, 'utf8') <= 1500 && !['.', '..'].includes(value) && !/[\\/\u0000-\u001f\u007f]/.test(value) && !/^__.*__$/.test(value);

function validateConfig(config) {
  if (!config || config.projectId !== PROJECT_ID || config.firestoreDatabaseId !== DATABASE_ID) error('wrong-source-database');
}
function parseArgs(args) {
  const options = { apply: false, output: '', help: false }; const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const option = args[index]; if (seen.has(option)) error('duplicate-option'); seen.add(option);
    if (option === '--apply') options.apply = true;
    else if (option === '--dry-run') continue;
    else if (option === '--help') options.help = true;
    else if (option === '--output') { const value = args[++index]; if (!value || value.startsWith('--')) error('missing-output'); options.output = value; }
    else error('unknown-option');
  }
  if (options.help && args.length !== 1 || options.apply && seen.has('--dry-run') || options.apply && !options.output) error('invalid-options');
  return options;
}
function validateDocumentPath(value) {
  if (typeof value !== 'string') error('invalid-document-path');
  const parts = value.split('/');
  if (!parts.every(validSegment) || !ROOT_COLLECTIONS.includes(parts[0]) || !(parts.length === 2 || parts.length === 4 && NESTED_COLLECTIONS[parts[0]] === parts[2])) error('unreviewed-document-path');
  return value;
}
function validateCollectionPath(value) {
  if (typeof value !== 'string') error('invalid-collection-path');
  const parts = value.split('/');
  if (!parts.every(validSegment) || !ROOT_COLLECTIONS.includes(parts[0]) || !(parts.length === 1 || parts.length === 3 && NESTED_COLLECTIONS[parts[0]] === parts[2])) error('unreviewed-collection-path');
  return value;
}
function validTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.getUTCFullYear() >= 1 && date.getUTCFullYear() <= 9999 && date.toISOString().slice(0, 19) === value.slice(0, 19);
}
function canonicalTimestamp(value) {
  if (!validTimestamp(value)) error('invalid-timestamp');
  return value.replace(/\.(\d+)(?=Z$)/, (_, digits) => digits.replace(/0+$/, '') ? `.${digits.replace(/0+$/, '')}` : '');
}
function validateRestValue(value, depth = 0) {
  if (!plain(value) || depth > 20 || Object.keys(value).length !== 1) error('invalid-firestore-value');
  const [key] = Object.keys(value), data = value[key];
  switch (key) {
    case 'nullValue': if (data !== null && data !== 'NULL_VALUE') error('invalid-null'); break;
    case 'booleanValue': if (typeof data !== 'boolean') error('invalid-boolean'); break;
    case 'integerValue':
      if (typeof data !== 'string' || !/^-?(?:0|[1-9]\d*)$/.test(data) || BigInt(data) < -9223372036854775808n || BigInt(data) > 9223372036854775807n) error('invalid-integer');
      break;
    case 'doubleValue': if (!(typeof data === 'number' && Number.isFinite(data)) && !['NaN', 'Infinity', '-Infinity'].includes(data)) error('invalid-double'); break;
    case 'timestampValue': if (!validTimestamp(data)) error('invalid-timestamp'); break;
    case 'stringValue': if (typeof data !== 'string') error('invalid-string'); break;
    case 'bytesValue': if (typeof data !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data) || Buffer.from(data, 'base64').toString('base64') !== data) error('invalid-bytes'); break;
    case 'referenceValue':
      if (typeof data !== 'string' || !data.startsWith(`${resourceBase()}/`)) error('foreign-reference');
      validateDocumentPath(data.slice(resourceBase().length + 1)); break;
    case 'geoPointValue':
      if (!onlyKeys(data, ['latitude', 'longitude']) || Object.values(data).some(number => typeof number !== 'number' || !Number.isFinite(number)) || Math.abs(data.latitude || 0) > 90 || Math.abs(data.longitude || 0) > 180) error('invalid-geopoint'); break;
    case 'arrayValue':
      if (!onlyKeys(data, ['values']) || data.values !== undefined && !Array.isArray(data.values)) error('invalid-array');
      for (const child of data.values || []) { if (plain(child) && Object.hasOwn(child, 'arrayValue')) error('nested-array'); validateRestValue(child, depth + 1); } break;
    case 'mapValue': if (!onlyKeys(data, ['fields'])) error('invalid-map'); validateRestFields(data.fields || {}, depth + 1); break;
    default: error('unsupported-firestore-value');
  }
}
function validateRestFields(fields, depth = 0) {
  if (!plain(fields) || depth > 20) error('invalid-fields');
  for (const [name, value] of Object.entries(fields)) { if (!name || Buffer.byteLength(name, 'utf8') > 1500 || /^__.*__$/.test(name)) error('invalid-field-name'); validateRestValue(value, depth); }
  return fields;
}
function canonicalJson(value, depth = 0) {
  if (depth > 64) error('manifest-too-deep');
  if (value === null || typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(child => canonicalJson(child, depth + 1)).join(',')}]`;
  if (plain(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key], depth + 1)}`).join(',')}}`;
  error('invalid-manifest-value');
}
function backupHash(value) { return createHash('sha256').update(canonicalJson(value)).digest('hex'); }
function payloadBody(payload) { const { integrity, ...body } = payload; return body; }
function validateCounts(collections, documents, missingDocuments) {
  if (!Array.isArray(collections) || !Array.isArray(documents) || !Array.isArray(missingDocuments) || documents.length + missingDocuments.length > MAX_DOCUMENTS) error('invalid-inventory');
  const paths = new Set(), expected = new Map();
  for (const item of collections) {
    if (!onlyKeys(item, ['path', 'documents', 'missingDocuments']) || Object.keys(item).length !== 3 || !Number.isSafeInteger(item.documents) || item.documents < 0 || !Number.isSafeInteger(item.missingDocuments) || item.missingDocuments < 0) error('invalid-collection-inventory');
    validateCollectionPath(item.path); if (expected.has(item.path)) error('duplicate-collection');
    expected.set(item.path, { documents: 0, missingDocuments: 0, source: item });
  }
  for (const name of ROOT_COLLECTIONS) if (!expected.has(name)) error('incomplete-root-schema');
  for (const record of documents) {
    if (!onlyKeys(record, ['path', 'fields', 'createTime', 'updateTime']) || !Object.hasOwn(record, 'fields')) error('invalid-backup-document');
    validateDocumentPath(record.path); validateRestFields(record.fields);
    for (const key of ['createTime', 'updateTime']) if (record[key] !== undefined && !validTimestamp(record[key])) error('invalid-document-time');
    if (paths.has(record.path)) error('duplicate-document'); paths.add(record.path);
    const parent = record.path.split('/').slice(0, -1).join('/'), count = expected.get(parent); if (!count) error('document-without-inventory'); count.documents++;
  }
  for (const document of missingDocuments) {
    validateDocumentPath(document); if (document.split('/').length !== 2 || !Object.hasOwn(NESTED_COLLECTIONS, document.split('/')[0]) || paths.has(document)) error('invalid-missing-parent'); paths.add(document);
    const count = expected.get(document.split('/')[0]); if (!count) error('missing-parent-without-inventory'); count.missingDocuments++;
  }
  for (const count of expected.values()) if (count.documents !== count.source.documents || count.missingDocuments !== count.source.missingDocuments) error('inventory-count-mismatch');
  for (const collection of expected.keys()) if (collection.includes('/') && !paths.has(collection.split('/').slice(0, -1).join('/'))) error('orphan-collection-inventory');
  for (const missing of missingDocuments) if (![...expected.keys()].some(collection => collection.startsWith(`${missing}/`))) error('missing-parent-without-children');
}
function buildBackup({ documents, collections, missingDocuments = [], readTime, excludedRootCollections = 0, createdAt = new Date().toISOString() }) {
  const body = { format: FORMAT, version: VERSION, projectId: PROJECT_ID, databaseId: DATABASE_ID, createdAt, readTime,
    schema: { rootCollections: [...ROOT_COLLECTIONS], nestedCollections: { ...NESTED_COLLECTIONS } }, excluded: [...EXCLUDED], excludedRootCollections,
    collections: [...collections].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0), documents: [...documents].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0), missingDocuments: [...missingDocuments].sort() };
  const payload = { ...body, integrity: { algorithm: 'sha256', sha256: backupHash(body) } };
  validateBackup(payload); return payload;
}
function validateBackup(payload) {
  if (!onlyKeys(payload, ['format', 'version', 'projectId', 'databaseId', 'createdAt', 'readTime', 'schema', 'excluded', 'excludedRootCollections', 'collections', 'documents', 'missingDocuments', 'integrity']) || Object.keys(payload).length !== 13 || payload.format !== FORMAT || payload.version !== VERSION) error('invalid-backup-format');
  validateConfig({ projectId: payload.projectId, firestoreDatabaseId: payload.databaseId });
  if (!validTimestamp(payload.createdAt) || !validTimestamp(payload.readTime) || Date.parse(payload.createdAt) < Date.parse(payload.readTime) || !Number.isSafeInteger(payload.excludedRootCollections) || payload.excludedRootCollections < 0) error('invalid-backup-metadata');
  if (canonicalJson(payload.schema) !== canonicalJson({ rootCollections: [...ROOT_COLLECTIONS], nestedCollections: { ...NESTED_COLLECTIONS } }) || canonicalJson(payload.excluded) !== canonicalJson([...EXCLUDED])) error('unreviewed-backup-schema');
  if (!onlyKeys(payload.integrity, ['algorithm', 'sha256']) || Object.keys(payload.integrity).length !== 2 || payload.integrity.algorithm !== 'sha256' || typeof payload.integrity.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(payload.integrity.sha256)) error('invalid-integrity');
  const actual = Buffer.from(backupHash(payloadBody(payload)), 'hex'), expected = Buffer.from(payload.integrity.sha256, 'hex');
  if (!timingSafeEqual(actual, expected)) error('integrity-mismatch');
  validateCounts(payload.collections, payload.documents, payload.missingDocuments);
  if (Buffer.byteLength(JSON.stringify(payload, null, 2)) > MAX_FILE_BYTES) error('backup-volume-exceeded');
  return payload;
}
function encodeResource(value) { return value.split('/').map(segment => encodeURIComponent(segment)).join('/'); }
async function collectBackup({ config, api, createdAt }) {
  validateConfig(config);
  const base = resourceBase();
  const clock = await api.request({ method: 'POST', path: `${base}:runQuery`, body: { structuredQuery: { from: [{ collectionId: 'communityConfiguration' }], select: { fields: [{ fieldPath: '__name__' }] }, limit: 1 } } });
  const rawTime = Array.isArray(clock.body) && clock.body.find(item => validTimestamp(item.readTime))?.readTime;
  if (!rawTime) error('server-read-time-missing');
  const readTime = rawTime.replace(/\.(\d{6})\d+(?=Z$)/, '.$1');
  const documents = [], missingDocuments = [], collections = [], seenPaths = new Set(); let collectedBytes = 0;
  const paged = async (kind, parent, collectionPath, consume) => {
    const result = [], tokens = new Set(); let token = '', count = 0;
    do {
      const response = await api.request(kind === 'collections' ? { method: 'POST', path: `${encodeResource(parent)}:listCollectionIds`, body: { pageSize: PAGE_SIZE, readTime, ...(token ? { pageToken: token } : {}) } }
        : { method: 'GET', path: `${encodeResource(base)}/${collectionPath.split('/').map(encodeURIComponent).join('/')}`, queryParams: { pageSize: PAGE_SIZE, showMissing: true, readTime, ...(token ? { pageToken: token } : {}) } });
      const body = response.body;
      if (!plain(body)) error('invalid-page');
      const rows = body[kind === 'collections' ? 'collectionIds' : 'documents'] || [];
      if (!Array.isArray(rows) || rows.length > PAGE_SIZE) error('invalid-page');
      count += rows.length; if (count > MAX_DOCUMENTS) error('backup-volume-exceeded');
      if (consume) await consume(rows); else result.push(...rows);
      token = body.nextPageToken || ''; if (typeof token !== 'string' || token.length > 16384 || token && tokens.has(token)) error('invalid-pagination'); if (token) tokens.add(token);
    } while (token);
    return result;
  };
  const rootIds = await paged('collections', base);
  if (rootIds.some(id => !validSegment(id)) || new Set(rootIds).size !== rootIds.length) error('invalid-root-inventory');
  if (rootIds.some(id => id.startsWith('community') && !ROOT_COLLECTIONS.includes(id))) error('unreviewed-community-collection');
  async function collectCollection(collectionPath) {
    validateCollectionPath(collectionPath);
    const inventory = { path: collectionPath, documents: 0, missingDocuments: 0 }; collections.push(inventory);
    await paged('documents', base, collectionPath, async rows => { for (const row of rows) {
      if (!plain(row) || typeof row.name !== 'string' || !row.name.startsWith(`${base}/`)) error('foreign-document');
      const documentPath = row.name.slice(base.length + 1); validateDocumentPath(documentPath);
      if (documentPath.split('/').slice(0, -1).join('/') !== collectionPath || seenPaths.has(documentPath)) error('invalid-document-location'); seenPaths.add(documentPath);
      if (seenPaths.size > MAX_DOCUMENTS) error('backup-volume-exceeded');
      collectedBytes += Buffer.byteLength(JSON.stringify(row, null, 2)); if (collectedBytes > MAX_FILE_BYTES) error('backup-volume-exceeded');
      const missing = !Object.hasOwn(row, 'fields') && !row.createTime && !row.updateTime;
      if (missing) { missingDocuments.push(documentPath); inventory.missingDocuments++; }
      else {
        validateRestFields(row.fields || {});
        if (!validTimestamp(row.createTime) || !validTimestamp(row.updateTime)) error('incomplete-document-metadata');
        documents.push({ path: documentPath, fields: row.fields || {}, createTime: row.createTime, updateTime: row.updateTime }); inventory.documents++;
      }
      const children = await paged('collections', `${base}/${documentPath}`);
      const parts = documentPath.split('/');
      if (children.some(child => !validSegment(child)) || new Set(children).size !== children.length || children.some(child => parts.length !== 2 || NESTED_COLLECTIONS[parts[0]] !== child)) error('unreviewed-subcollection');
      for (const child of children) await collectCollection(`${documentPath}/${child}`);
    } });
  }
  for (const root of ROOT_COLLECTIONS) {
    if (rootIds.includes(root)) await collectCollection(root);
    else collections.push({ path: root, documents: 0, missingDocuments: 0 });
  }
  return buildBackup({ documents, collections, missingDocuments, readTime, createdAt: createdAt || new Date().toISOString(), excludedRootCollections: rootIds.filter(id => !ROOT_COLLECTIONS.includes(id)).length });
}
function backupSummary(payload, written = false) {
  validateBackup(payload);
  const counts = Object.fromEntries(ROOT_COLLECTIONS.map(name => [name, payload.documents.filter(document => document.path.split('/')[0] === name).length]));
  return { project: PROJECT_ID, database: DATABASE_ID, mode: written ? 'read-only-backup-saved' : 'dry-run-read-only', documents: payload.documents.length, missingParents: payload.missingDocuments.length, collections: payload.collections.length, excludedRootCollections: payload.excludedRootCollections, counts, integrityVerified: true, written };
}
function readPrivateBackup(root, requested) {
  const canonicalRoot = fs.realpathSync(root), privateRoot = path.join(canonicalRoot, 'output', 'private'), target = path.resolve(canonicalRoot, requested);
  const relative = path.relative(privateRoot, target);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || path.extname(target).toLowerCase() !== '.json') error('input-not-private-json');
  const components = []; let current = canonicalRoot;
  for (const segment of path.relative(canonicalRoot, target).split(path.sep)) {
    current = path.join(current, segment); const info = fs.lstatSync(current);
    if (info.isSymbolicLink() || current !== target && !info.isDirectory() || current === target && !info.isFile()) error('unsafe-input-path');
    if ((current === privateRoot || current.startsWith(`${privateRoot}${path.sep}`)) && (info.mode & 0o777) !== (current === target ? 0o600 : 0o700)) error('input-not-private');
    components.push({ current, dev: info.dev, ino: info.ino });
  }
  assertIgnored(canonicalRoot, target);
  const check = () => { for (const component of components) { const info = fs.lstatSync(component.current); if (info.isSymbolicLink() || info.dev !== component.dev || info.ino !== component.ino) error('input-path-changed'); } };
  const descriptor = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    check(); const info = fs.fstatSync(descriptor); const final = components.at(-1);
    if (!info.isFile() || info.nlink !== 1 || info.dev !== final.dev || info.ino !== final.ino || info.size > MAX_FILE_BYTES || (info.mode & 0o777) !== 0o600) error('unsafe-input-file');
    const contents = fs.readFileSync(descriptor, 'utf8'); check();
    return validateBackup(JSON.parse(contents));
  } finally { fs.closeSync(descriptor); }
}
async function createCloudClient(root) {
  if (process.env.FIREBASE_TOKEN || process.env.FIRESTORE_EMULATOR_HOST) error('human-production-session-required');
  const auth = require('firebase-tools/lib/auth'), { requireAuth } = require('firebase-tools/lib/requireAuth'), { Client } = require('firebase-tools/lib/apiv2');
  // The CLI logger can otherwise place sensitive REST bodies in debug logs.
  require('firebase-tools/lib/logger').logger.silent = true;
  const account = auth.getProjectDefaultAccount(root);
  if (!account?.user?.email || !account?.tokens?.refresh_token) error('human-cli-login-required');
  const options = { project: PROJECT_ID }; auth.setActiveAccount(options, account);
  const email = await requireAuth(options, true); if (email !== account.user.email) error('human-session-mismatch');
  const client = new Client({ auth: true, apiVersion: 'v1', urlPrefix: 'https://firestore.googleapis.com' });
  return { request: options => client.request({ ...options, skipLog: { body: true, resBody: true, queryParams: true } }) };
}
async function main() {
  let stage = 'arguments';
  try {
    const options = parseArgs(process.argv.slice(2)); if (options.help) { console.log(USAGE); return; }
    if (Number(process.versions.node.split('.')[0]) < 24) error('node-24-required');
    const root = fs.realpathSync(path.resolve(__dirname, '..'));
    if (options.output) { const target = outputPath(root, options.output); assertIgnored(root, target); }
    const config = JSON.parse(fs.readFileSync(path.join(root, 'firebase-applet-config.json'), 'utf8')); validateConfig(config);
    stage = 'credentials'; const api = await createCloudClient(root);
    stage = 'snapshot'; const payload = await collectBackup({ config, api });
    if (options.apply) { stage = 'private-output'; writePrivateJson(root, options.output, payload); }
    console.log(JSON.stringify(backupSummary(payload, options.apply)));
  } catch { console.error(`Respaldo no completado (${stage}). No se ha modificado la nube. Consulta --help y docs/BACKUP_RECOVERY.md.`); process.exitCode = 1; }
}
module.exports = { PROJECT_ID, DATABASE_ID, FORMAT, VERSION, PAGE_SIZE, MAX_FILE_BYTES, MAX_DOCUMENTS, ROOT_COLLECTIONS, NESTED_COLLECTIONS, EXCLUDED, parseArgs, validateConfig, validateDocumentPath, validateCollectionPath, validTimestamp, canonicalTimestamp, validateRestFields, canonicalJson, backupHash, buildBackup, validateBackup, collectBackup, backupSummary, readPrivateBackup, resourceBase, encodeResource };
if (require.main === module) void main();
