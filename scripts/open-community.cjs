// Reviewed operator transition only. The default is read-only; one CAS can
// replace runtime after all real release gates pass. Never retry that write.
const { readFileSync, realpathSync } = require('node:fs');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const pilot = require('./manage-pilot.cjs');
const { PROJECT_ID, DATABASE_ID, OWNER_EMAIL, DOCUMENT_NAME, COMMIT_PATH } = pilot;
const DATABASE_NAME = `projects/${PROJECT_ID}/databases/${DATABASE_ID}`;
const RELEASE_NAME = `projects/${PROJECT_ID}/releases/cloud.firestore/${DATABASE_ID}`;
const AUTH_CONFIG_PATH = `/admin/v2/projects/${PROJECT_ID}/config`;
const GOOGLE_CONFIG_PATH = `/admin/v2/projects/${PROJECT_ID}/defaultSupportedIdpConfigs/google.com`;
const GOOGLE_CONFIG_NAME = `projects/${PROJECT_ID}/defaultSupportedIdpConfigs/google.com`;
const ACCOUNTS_PATH = `/v1/projects/${PROJECT_ID}/accounts:batchGet`;
const ACCOUNT_FIELDS = 'users(localId,email,emailVerified,disabled,providerUserInfo(providerId,email),customAttributes),nextPageToken';
const EXPECTED_INDEXES = 30;
const MAX_PAGES = 100;
const CHECKS = ['rulesAndIndexes', 'migration', 'twoAccounts', 'admin', 'authDomain', 'backupRestore', 'support', 'legalAndPrivacy', 'accountRights'];
const USAGE = 'Uso: node scripts/open-community.cjs [--dry-run | --apply]';
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const hash = value => createHash('sha256').update(value).digest('hex');
const timeValid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value) && Number.isFinite(Date.parse(value));
const statusCode = error => [error?.status, error?.statusCode, error?.context?.response?.status, error?.context?.response?.statusCode].find(value => Number.isInteger(value) && value >= 400 && value <= 599);
class OpeningError extends Error {}
const reject = code => { throw new OpeningError(code); };

function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true, apply: false };
  if (args.length > 1 || args.length === 1 && !['--apply', '--dry-run'].includes(args[0])) reject('invalid-options');
  return { help: false, apply: args[0] === '--apply' };
}
function validateLocal(local, now = Date.now()) {
  if (!plain(local) || !plain(local.env) || !plain(local.approval)) reject('real-release-required');
  pilot.validateConfig(local.config);
  const env = local.env;
  if (env.VITE_SERVICE_OPEN !== 'true' || ['VITE_ENABLE_PILOT', 'VITE_ENABLE_DEMO', 'VITE_ENABLE_MEDIA_UPLOADS'].some(key => env[key] !== 'false')
    || env.VITE_FIREBASE_EMULATORS === 'true' || env.VITE_HOSTING_PROVIDER !== 'firebase') reject('public-build-flags-required');
  if (env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_PROJECT_ID !== PROJECT_ID || env.VITE_FIREBASE_DATABASE_ID && env.VITE_FIREBASE_DATABASE_ID !== DATABASE_ID) reject('wrong-target');
  if (!env.VITE_OPERATOR_NAME?.trim() || !env.VITE_OPERATOR_COUNTRY?.trim()) reject('operator-data-required');
  if (typeof env.VITE_CONTACT_EMAIL !== 'string' || env.VITE_CONTACT_EMAIL.toLowerCase() !== OWNER_EMAIL) reject('contact-mismatch');
  const approval = local.approval;
  if (approval.projectId !== PROJECT_ID || approval.databaseId !== DATABASE_ID || approval.approvedBy !== env.VITE_OPERATOR_NAME.trim()
    || !timeValid(approval.approvedAt) || Date.parse(approval.approvedAt) > now || now - Date.parse(approval.approvedAt) >= 7 * 86400000
    || !plain(approval.checks) || CHECKS.some(key => approval.checks[key] !== true)) reject('real-release-required');
  if (!local.releaseCheckPassed || typeof local.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(local.fingerprint)) reject('release-check-required');
  const firestore = local.firebaseConfig?.firestore;
  if (!Array.isArray(firestore) || firestore.length !== 1 || firestore[0].database !== DATABASE_ID
    || firestore[0].rules !== 'firestore.rules' || firestore[0].indexes !== 'firestore.indexes.json') reject('wrong-target');
  if (typeof local.rules !== 'string' || !local.rules.trim() || !plain(local.indexSpec) || !Array.isArray(local.indexSpec.indexes)
    || local.indexSpec.indexes.length !== EXPECTED_INDEXES || !Array.isArray(local.indexSpec.fieldOverrides) || local.indexSpec.fieldOverrides.length) reject('invalid-index-spec');
  const signatures = new Set(local.indexSpec.indexes.map(index => JSON.stringify(index)));
  if (signatures.size !== EXPECTED_INDEXES || local.indexSpec.indexes.some(index => !plain(index) || index.unique === true || !Array.isArray(index.fields))) reject('invalid-index-spec');
  return local;
}
async function readLocal(root, { run = spawnSync, envLoader } = {}) {
  const load = envLoader || (await import(pathToFileURL(resolve(__dirname, 'release-environment.mjs')).href)).productionEnvironment;
  const env = load(root);
  let approvalText;
  try { approvalText = readFileSync(resolve(root, 'docs/release-approved.json'), 'utf8'); } catch { reject('real-release-required'); }
  let configText, firebaseText, rules, indexesText, approval, config, firebaseConfig, indexSpec;
  try {
    configText = readFileSync(resolve(root, 'firebase-applet-config.json'), 'utf8');
    firebaseText = readFileSync(resolve(root, 'firebase.json'), 'utf8');
    rules = readFileSync(resolve(root, 'firestore.rules'), 'utf8');
    indexesText = readFileSync(resolve(root, 'firestore.indexes.json'), 'utf8');
    approval = JSON.parse(approvalText); config = JSON.parse(configText); firebaseConfig = JSON.parse(firebaseText); indexSpec = JSON.parse(indexesText);
  } catch { reject('invalid-local-files'); }
  const result = run(process.execPath, [resolve(__dirname, 'check-release.mjs')], { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 });
  if (result.error || result.status !== 0) reject('release-check-required');
  const stableEnv = Object.fromEntries(Object.entries(env).sort(([a], [b]) => a.localeCompare(b)));
  const local = { env, approval, config, firebaseConfig, rules, indexSpec, releaseCheckPassed: true,
    fingerprint: hash(JSON.stringify([approvalText, configText, firebaseText, rules, indexesText, stableEnv])) };
  return validateLocal(local);
}
function body(response, code) {
  if (response?.status !== 200 || !plain(response.body) || response.body.error) reject(code);
  return response.body;
}
async function paginated(api, path, field, queryParams = {}) {
  const records = []; const seen = new Set(); let token;
  for (let page = 0; page < MAX_PAGES; page++) {
    const value = body(await api.request({ method: 'GET', path, queryParams: { pageSize: 100, ...queryParams, ...(token ? { pageToken: token } : {}) } }), 'invalid-list-response');
    if (value[field] !== undefined && !Array.isArray(value[field])) reject('invalid-list-response');
    records.push(...(value[field] || []));
    const next = value.nextPageToken;
    if (next === undefined || next === '') return records;
    if (typeof next !== 'string' || seen.has(next)) reject('invalid-page-token');
    seen.add(next); token = next;
  }
  reject('pagination-limit');
}
function readOnlyIdentityApi(authApi) {
  return { async findUser(project, email, phone, uid) {
    if (project !== PROJECT_ID || phone !== undefined || (email === undefined) === (uid === undefined)
      || email !== undefined && (typeof email !== 'string' || email.toLowerCase() !== OWNER_EMAIL)
      || uid !== undefined && (typeof uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(uid))) reject('invalid-owner-lookup');
    const seen = new Set(); let token; let found;
    for (let page = 0; page < MAX_PAGES; page++) {
      // GET and a narrow response projection keep this preflight read-only and
      // avoid receiving password hashes, MFA data or unrelated profile fields.
      const value = body(await authApi.request({ method: 'GET', path: ACCOUNTS_PATH, headers: { 'x-goog-user-project': PROJECT_ID },
        queryParams: { maxResults: 100, fields: ACCOUNT_FIELDS, ...(token ? { nextPageToken: token } : {}) } }), 'invalid-owner-list');
      if (value.users !== undefined && !Array.isArray(value.users)) reject('invalid-owner-list');
      for (const user of value.users || []) {
        if (!plain(user) || typeof user.localId !== 'string') reject('invalid-owner-list');
        if (email !== undefined ? typeof user.email === 'string' && user.email.toLowerCase() === email.toLowerCase() : user.localId === uid) {
          if (found) reject('ambiguous-owner-identity');
          found = { uid: user.localId, email: user.email, emailVerified: user.emailVerified, disabled: user.disabled,
            providerUserInfo: user.providerUserInfo, customAttributes: user.customAttributes };
        }
      }
      const next = value.nextPageToken;
      if (next === undefined || next === '') {
        if (!found) reject('existing-owner-admin-required');
        return found;
      }
      if (typeof next !== 'string' || seen.has(next)) reject('invalid-page-token');
      seen.add(next); token = next;
    }
    reject('pagination-limit');
  } };
}
function decodeRuntime(document) {
  if (!plain(document) || document.name !== DOCUMENT_NAME || !timeValid(document.updateTime) || !plain(document.fields)) reject('invalid-runtime');
  if (document.fields.serviceStatus?.stringValue === 'open') {
    const fields = document.fields;
    if (JSON.stringify(Object.keys(fields).sort()) !== JSON.stringify(['contactEmail', 'mediaUploadsEnabled', 'serviceStatus', 'updatedAt'])
      || JSON.stringify(fields.serviceStatus) !== '{"stringValue":"open"}' || JSON.stringify(fields.mediaUploadsEnabled) !== '{"booleanValue":false}'
      || !plain(fields.contactEmail) || Object.keys(fields.contactEmail).length !== 1 || typeof fields.contactEmail.stringValue !== 'string'
      || !plain(fields.updatedAt) || Object.keys(fields.updatedAt).length !== 1 || !timeValid(fields.updatedAt.timestampValue)) reject('invalid-runtime');
    return { status: 'open', contactEmail: fields.contactEmail.stringValue, pilotUserIds: [], precondition: { updateTime: document.updateTime } };
  }
  let snapshot;
  try { snapshot = pilot.decodeRuntime(document); } catch { reject('invalid-runtime'); }
  if (!['pilot', 'paused'].includes(snapshot.status)) reject('runtime-transition-not-allowed');
  return snapshot;
}
async function readRuntime(api) {
  return decodeRuntime(body(await api.request({ method: 'GET', path: DOCUMENT_NAME }), 'runtime-read-required'));
}
function openWrite(snapshot) {
  return { update: { name: DOCUMENT_NAME, fields: { serviceStatus: { stringValue: 'open' }, mediaUploadsEnabled: { booleanValue: false }, contactEmail: { stringValue: snapshot.contactEmail } } },
    currentDocument: snapshot.precondition, updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }] };
}
async function verifyCloud(local, { api, rulesApi, authApi, projectApi, identityApi, indexMatchesSpec }) {
  const metadata = body(await api.request({ method: 'GET', path: DATABASE_NAME }), 'invalid-database');
  if (metadata.name !== DATABASE_NAME || metadata.databaseEdition !== 'ENTERPRISE') reject('wrong-database-edition');
  const release = body(await rulesApi.request({ method: 'GET', path: RELEASE_NAME }), 'invalid-rules-release');
  if (release.name !== RELEASE_NAME || typeof release.rulesetName !== 'string' || !new RegExp(`^projects/${PROJECT_ID}/rulesets/[A-Za-z0-9_-]+$`).test(release.rulesetName)) reject('invalid-rules-release');
  const ruleset = body(await rulesApi.request({ method: 'GET', path: release.rulesetName }), 'invalid-ruleset');
  const files = ruleset.source?.files;
  if (!Array.isArray(files) || files.length !== 1 || files[0].name !== 'firestore.rules' || files[0].content !== local.rules) reject('deployed-rules-mismatch');
  // Enterprise ListIndexes/ListFields currently require pageSize=0. Preserve
  // pagination tokens if the provider returns one; never retry an invalid GET.
  const indexes = await paginated(api, `${DATABASE_NAME}/collectionGroups/-/indexes`, 'indexes', { pageSize: 0 });
  if (indexes.length !== EXPECTED_INDEXES || new Set(indexes.map(index => index?.name)).size !== EXPECTED_INDEXES
    || indexes.some(index => !plain(index) || typeof index.name !== 'string' || !index.name.startsWith(`${DATABASE_NAME}/collectionGroups/`)
      || !/^collectionGroups\/[A-Za-z0-9_-]+\/indexes\/[A-Za-z0-9_-]+$/.test(index.name.slice(DATABASE_NAME.length + 1))
      || index.state !== 'READY' || index.unique === true || !Array.isArray(index.fields))) reject('indexes-not-ready');
  const remaining = [...indexes];
  for (const expected of local.indexSpec.indexes) {
    const match = remaining.findIndex(actual => indexMatchesSpec(actual, expected, metadata.databaseEdition));
    if (match < 0) reject('index-definitions-mismatch'); remaining.splice(match, 1);
  }
  const fields = await paginated(api, `${DATABASE_NAME}/collectionGroups/-/fields`, 'fields', { pageSize: 0, filter: 'indexConfig.usesAncestorConfig=false OR ttlConfig:*' });
  for (const field of fields) {
    if (!plain(field) || typeof field.name !== 'string' || !field.name.startsWith(`${DATABASE_NAME}/collectionGroups/__default__/fields/`) || field.ttlConfig !== undefined) reject('unexpected-field-overrides');
  }
  const headers = { 'x-goog-user-project': PROJECT_ID };
  const auth = body(await authApi.request({ method: 'GET', path: AUTH_CONFIG_PATH, headers }), 'auth-config-unavailable');
  if (!Array.isArray(auth.authorizedDomains) || !auth.authorizedDomains.includes('lacantera.web.app')) reject('auth-domain-required');
  const google = body(await authApi.request({ method: 'GET', path: GOOGLE_CONFIG_PATH, headers }), 'google-provider-required');
  let googleNameMatches = google.name === GOOGLE_CONFIG_NAME;
  if (!googleNameMatches && typeof google.name === 'string' && /^projects\/[0-9]+\/defaultSupportedIdpConfigs\/google\.com$/.test(google.name)) {
    if (!projectApi) reject('google-provider-required');
    // Direct management GET only: CLI management helpers can enable APIs.
    const project = body(await projectApi.request({ method: 'GET', path: `projects/${PROJECT_ID}` }), 'project-number-unavailable');
    if (project.projectId !== PROJECT_ID || typeof project.projectNumber !== 'string' || !/^[0-9]+$/.test(project.projectNumber)) reject('wrong-target');
    googleNameMatches = google.name === `projects/${project.projectNumber}/defaultSupportedIdpConfigs/google.com`;
  }
  if (!googleNameMatches || google.enabled !== true || typeof google.clientId !== 'string' || !google.clientId.trim()) reject('google-provider-required');
  let found, owner;
  try {
    found = pilot.checkedIdentity(await identityApi.findUser(PROJECT_ID, OWNER_EMAIL), { email: OWNER_EMAIL });
    owner = pilot.checkedIdentity(await identityApi.findUser(PROJECT_ID, undefined, undefined, found.uid), { uid: found.uid, email: OWNER_EMAIL });
  } catch { reject('existing-owner-admin-required'); }
  if (!owner.admin) reject('existing-owner-admin-required');
  return { rulesMatch: true, rulesSha256: hash(local.rules), indexCount: indexes.length, indexesReady: true, definitionsMatch: true, effectiveFieldOverrides: 0,
    authDomain: true, googleEnabled: true, existingAdminVerified: true };
}
async function openCommunity({ local, apply = false, readLocalAgain, ...cloud }) {
  validateLocal(local);
  const checks = await verifyCloud(local, cloud);
  const snapshot = await readRuntime(cloud.api);
  if (snapshot.contactEmail.toLowerCase() !== OWNER_EMAIL || snapshot.contactEmail.toLowerCase() !== local.env.VITE_CONTACT_EMAIL.toLowerCase()) reject('runtime-contact-mismatch');
  const result = { project: PROJECT_ID, database: DATABASE_ID, mode: apply ? 'apply' : 'dry-run', action: snapshot.status === 'open' ? 'unchanged' : 'planned',
    previousStatus: snapshot.status, targetStatus: 'open', mediaUploadsEnabled: false, removedPilotAccounts: snapshot.pilotUserIds.length,
    runtimeOpenObserved: snapshot.status === 'open', verified: snapshot.status === 'open', checks };
  if (!apply || snapshot.status === 'open') return result;
  if (typeof readLocalAgain !== 'function') reject('local-recheck-required');
  const current = await readLocalAgain(); validateLocal(current);
  if (current.fingerprint !== local.fingerprint) reject('local-review-changed');
  // One conditional write; retries are disabled even for ambiguous transport failures.
  try {
    const response = await cloud.api.request({ method: 'POST', path: COMMIT_PATH, retries: 0, retryCodes: [], body: { writes: [openWrite(snapshot)] } });
    body(response, 'commit-outcome-unknown');
  } catch {
    let observed = 'unknown';
    try { observed = (await readRuntime(cloud.api)).status; } catch {}
    reject(`commit-outcome-unknown-${observed}`);
  }
  const after = await readRuntime(cloud.api);
  if (after.status !== 'open' || after.contactEmail !== snapshot.contactEmail || after.precondition.updateTime === snapshot.precondition.updateTime) reject('open-write-not-verified');
  return { ...result, action: 'applied', runtimeOpenObserved: true, verified: true };
}
async function createCloudApis(root, { loadModule = require, env = process.env } = {}) {
  if (['FIREBASE_IDENTITY_URL', 'FIREBASE_TOKEN_URL', 'FIREBASE_GOOGLE_URL', 'FIREBASE_CLIENT_ID', 'FIREBASE_CLIENT_SECRET'].some(key => env[key])) reject('fixed-provider-origin-required');
  const base = await pilot.createCloudApis(root, { loadModule, env });
  const { Client } = loadModule('firebase-tools/lib/apiv2');
  const wrap = client => ({ request: options => client.request({ ...options, retries: options.method === 'POST' ? 0 : undefined, retryCodes: options.method === 'POST' ? [] : undefined, skipLog: { body: true, resBody: true, queryParams: true } }) });
  const rulesApi = wrap(new Client({ auth: true, apiVersion: 'v1', urlPrefix: 'https://firebaserules.googleapis.com' }));
  const authApi = wrap(new Client({ auth: true, urlPrefix: 'https://identitytoolkit.googleapis.com' }));
  const projectApi = wrap(new Client({ auth: true, apiVersion: 'v1beta1', urlPrefix: 'https://firebase.googleapis.com' }));
  const { FirestoreApi } = loadModule('firebase-tools/lib/firestore/api'); const indexes = new FirestoreApi();
  return { ...base, identityApi: readOnlyIdentityApi(authApi), rulesApi, authApi, projectApi, indexMatchesSpec: (actual, expected, edition) => indexes.indexMatchesSpec(actual, expected, edition) };
}
async function main({ args = process.argv.slice(2), root = realpathSync(resolve(__dirname, '..')), localReader = readLocal, cloudFactory = createCloudApis, log = console.log } = {}) {
  const options = parseArgs(args);
  if (options.help) { log(`${USAGE}\nExige acta real/check-release, build pública, reglas e índices remotos READY, Auth y admin existente. Sin --apply sólo lee. --apply sustituye únicamente runtime mediante CAS y no reintenta. No publica Hosting ni activa archivos, facturación, Storage, Functions o claims.`); return; }
  if (Number(process.versions.node.split('.')[0]) < 24) reject('node-24-required');
  const local = await localReader(root); validateLocal(local);
  const cloud = await cloudFactory(root);
  const result = await openCommunity({ local, ...options, ...cloud, readLocalAgain: () => localReader(root) });
  log(JSON.stringify(result)); return result;
}
function safeErrorMessage(error) {
  const code = error instanceof OpeningError ? error.message : statusCode(error) ? `HTTP-${statusCode(error)}` : 'provider-error';
  return `Apertura no completada (${code}). No se fabrica el acta ni se reintenta el cambio de runtime. Si se solicitó --apply, comprobar mediante lectura antes de decidir otra acción. ${USAGE}`;
}
module.exports = { PROJECT_ID, DATABASE_ID, OWNER_EMAIL, DOCUMENT_NAME, COMMIT_PATH, DATABASE_NAME, RELEASE_NAME, AUTH_CONFIG_PATH, GOOGLE_CONFIG_PATH, GOOGLE_CONFIG_NAME, EXPECTED_INDEXES,
  ACCOUNTS_PATH, ACCOUNT_FIELDS, OpeningError, parseArgs, validateLocal, readLocal, paginated, readOnlyIdentityApi, decodeRuntime, openWrite, verifyCloud, openCommunity, createCloudApis, main, safeErrorMessage };
if (require.main === module) main().catch(error => { console.error(safeErrorMessage(error)); process.exitCode = 1; });
