// Operator-only bounded pilot. Uses an existing human Firebase CLI session.
// Dry-run is the default. This command cannot open public participation or media.
const { readFileSync, realpathSync } = require('node:fs');
const { resolve } = require('node:path');

const PROJECT_ID = 'gen-lang-client-0853130215';
const DATABASE_ID = 'ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb';
const OWNER_EMAIL = 'rommer@garitocastizo.com';
const MAX_PILOT_USERS = 5;
const DOCUMENT_NAME = `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/communityConfiguration/runtime`;
const COMMIT_PATH = `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents:commit`;
const USAGE = 'Uso: node scripts/manage-pilot.cjs --email CORREO [--email OTRO_CORREO] [--dry-run | --apply]';
class PilotError extends Error {}
const reject = code => { throw new PilotError(code); };
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const uidValid = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const timeValid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value) && Number.isFinite(Date.parse(value));
const statusCode = error => [error?.status, error?.statusCode, error?.context?.response?.status, error?.context?.response?.statusCode].find(value => Number.isInteger(value) && value >= 400 && value <= 599);

function normalizeEmail(value) {
  if (typeof value !== 'string' || value !== value.trim() || value.length > 200 || !/^[A-Za-z0-9.!#$%&'*+\-/=?^_`{|}~]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(value)) reject('invalid-email');
  return value.toLowerCase();
}
function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true, apply: false, emails: [] };
  const options = { help: false, apply: false, emails: [] }; const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    if (option === '--email') {
      const value = normalizeEmail(args[++index]);
      if (options.emails.includes(value)) reject('duplicate-email');
      options.emails.push(value);
    } else {
      if (seen.has(option)) reject('duplicate-option'); seen.add(option);
      if (option === '--apply') options.apply = true;
      else if (option !== '--dry-run') reject('invalid-options');
    }
  }
  if (!options.emails.length || options.emails.length > MAX_PILOT_USERS || seen.has('--apply') && seen.has('--dry-run')) reject('invalid-options');
  return options;
}
function validateConfig(config) {
  if (!config || config.projectId !== PROJECT_ID || config.firestoreDatabaseId !== DATABASE_ID) reject('wrong-target');
}
function checkedIdentity(value, expected = {}) {
  if (!plain(value) || !uidValid(value.uid) || value.disabled === true || value.emailVerified !== true) reject('ineligible-identity');
  const email = normalizeEmail(value.email);
  if (expected.uid !== undefined && value.uid !== expected.uid || expected.email !== undefined && email !== normalizeEmail(expected.email)) reject('identity-mismatch');
  const providers = value.providerUserInfo;
  if (!Array.isArray(providers) || !providers.some(provider => plain(provider) && provider.providerId === 'google.com' && (!provider.email || normalizeEmail(provider.email) === email))) reject('google-provider-required');
  let claims = {};
  if (value.customAttributes !== undefined && value.customAttributes !== '') {
    if (typeof value.customAttributes !== 'string') reject('invalid-claims');
    try { claims = JSON.parse(value.customAttributes); } catch { reject('invalid-claims'); }
    if (!plain(claims)) reject('invalid-claims');
  }
  return { uid: value.uid, email, admin: claims.admin === true };
}
function decodeRuntime(document) {
  if (document === null) return { status: 'absent', pilotUserIds: [], precondition: { exists: false } };
  if (!plain(document) || document.name !== DOCUMENT_NAME || !timeValid(document.updateTime) || !plain(document.fields)) reject('invalid-runtime');
  const fields = document.fields;
  const keys = Object.keys(fields).sort();
  const status = fields.serviceStatus?.stringValue;
  const expected = ['serviceStatus', 'mediaUploadsEnabled', 'contactEmail', 'updatedAt', ...(status === 'pilot' ? ['pilotUserIds'] : [])].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected) || !['setup', 'paused', 'pilot', 'open'].includes(status)
    || JSON.stringify(fields.mediaUploadsEnabled) !== '{"booleanValue":false}'
    || !plain(fields.contactEmail) || Object.keys(fields.contactEmail).length !== 1 || typeof fields.contactEmail.stringValue !== 'string' || fields.contactEmail.stringValue.length > 200
    || !plain(fields.updatedAt) || Object.keys(fields.updatedAt).length !== 1 || !timeValid(fields.updatedAt.timestampValue)) reject('invalid-runtime');
  if (status === 'open') reject('public-service-already-open');
  let pilotUserIds = [];
  if (status === 'pilot') {
    const field = fields.pilotUserIds;
    if (!plain(field) || Object.keys(field).length !== 1 || !plain(field.arrayValue) || Object.keys(field.arrayValue).some(key => key !== 'values') || !Array.isArray(field.arrayValue.values)) reject('invalid-pilot-roster');
    pilotUserIds = field.arrayValue.values.map(value => {
      if (!plain(value) || Object.keys(value).length !== 1 || !uidValid(value.stringValue)) reject('invalid-pilot-roster');
      return value.stringValue;
    });
    if (!pilotUserIds.length || pilotUserIds.length > MAX_PILOT_USERS || new Set(pilotUserIds).size !== pilotUserIds.length) reject('invalid-pilot-roster');
  }
  return { status, pilotUserIds, contactEmail: fields.contactEmail.stringValue, precondition: { updateTime: document.updateTime } };
}
async function readRuntime(api) {
  let response;
  try { response = await api.request({ method: 'GET', path: DOCUMENT_NAME }); }
  catch (error) { if (statusCode(error) === 404) return null; throw error; }
  if (response?.status === 404) return null;
  if (response?.status !== undefined && response.status !== 200) reject('runtime-read-failed');
  return response?.body;
}
function pilotWrite(snapshot, pilotUserIds) {
  return {
    update: { name: DOCUMENT_NAME, fields: {
      serviceStatus: { stringValue: 'pilot' }, mediaUploadsEnabled: { booleanValue: false }, contactEmail: { stringValue: OWNER_EMAIL },
      pilotUserIds: { arrayValue: { values: pilotUserIds.map(uid => ({ stringValue: uid })) } },
    } },
    currentDocument: snapshot.precondition,
    updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
  };
}
async function managePilot({ config, emails, apply = false, api, identityApi }) {
  validateConfig(config);
  if (!Array.isArray(emails) || !emails.length || emails.length > MAX_PILOT_USERS) reject('invalid-options');
  const requested = emails.map(normalizeEmail);
  if (new Set(requested).size !== requested.length) reject('duplicate-email');
  const snapshot = decodeRuntime(await readRuntime(api));
  const identities = new Map();
  // Auth's search API may return a candidate: verify exact canonical email and
  // then look up every final UID independently before accepting it in a roster.
  for (const email of requested) {
    const identity = checkedIdentity(await identityApi.findUser(PROJECT_ID, email), { email });
    if (identities.has(identity.uid) && identities.get(identity.uid).email !== email) reject('identity-mismatch');
    identities.set(identity.uid, identity);
  }
  const pilotUserIds = [...new Set([...snapshot.pilotUserIds, ...identities.keys()])].sort();
  if (!pilotUserIds.length || pilotUserIds.length > MAX_PILOT_USERS) reject('pilot-roster-limit');
  let ownerPresent = false;
  for (const uid of pilotUserIds) {
    const identity = checkedIdentity(await identityApi.findUser(PROJECT_ID, undefined, undefined, uid), { uid, ...(identities.has(uid) ? { email: identities.get(uid).email } : {}) });
    if (identity.email === OWNER_EMAIL) {
      if (!identity.admin) reject('owner-admin-required');
      ownerPresent = true;
    }
  }
  if (!ownerPresent) reject('owner-in-roster-required');
  const unchanged = snapshot.status === 'pilot' && snapshot.contactEmail === OWNER_EMAIL
    && JSON.stringify([...snapshot.pilotUserIds].sort()) === JSON.stringify(pilotUserIds);
  const result = { project: PROJECT_ID, database: DATABASE_ID, mode: apply ? 'apply' : 'dry-run', action: unchanged ? 'unchanged' : 'planned',
    previousStatus: snapshot.status, serviceStatus: 'pilot', mediaUploadsEnabled: false, publicRegistrationOpen: false,
    pilotAccounts: pilotUserIds.length, retainedAccounts: snapshot.pilotUserIds.length, addedAccounts: pilotUserIds.filter(uid => !snapshot.pilotUserIds.includes(uid)).length,
    ownerAdminVerified: true, verified: unchanged };
  if (!apply || unchanged) return result;
  // One conditional write only. A race or a failed read-back needs operator
  // review; never retry with a weaker precondition or a stale roster.
  await api.request({ method: 'POST', path: COMMIT_PATH, body: { writes: [pilotWrite(snapshot, pilotUserIds)] } });
  const actual = decodeRuntime(await readRuntime(api));
  if (actual.status !== 'pilot' || actual.contactEmail !== OWNER_EMAIL || JSON.stringify([...actual.pilotUserIds].sort()) !== JSON.stringify(pilotUserIds)) reject('pilot-write-not-verified');
  return { ...result, action: 'applied', verified: true };
}
async function createCloudApis(root, { loadModule = require, env = process.env } = {}) {
  if (['FIREBASE_TOKEN', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'GOOGLE_APPLICATION_CREDENTIALS'].some(key => env[key])) reject('human-production-session-required');
  loadModule('firebase-tools/lib/logger').logger.silent = true;
  const auth = loadModule('firebase-tools/lib/auth');
  const { requireAuth } = loadModule('firebase-tools/lib/requireAuth');
  const account = auth.getProjectDefaultAccount(root);
  if (!account?.user?.email || !account?.tokens?.refresh_token) reject('human-cli-login-required');
  const options = { project: PROJECT_ID }; auth.setActiveAccount(options, account);
  const email = await requireAuth(options, true);
  if (email !== account.user.email) reject('human-session-mismatch');
  const { Client } = loadModule('firebase-tools/lib/apiv2');
  const client = new Client({ auth: true, apiVersion: 'v1', urlPrefix: 'https://firestore.googleapis.com' });
  return { api: { request: options => client.request({ ...options, skipLog: { body: true, resBody: true, queryParams: true } }) }, identityApi: loadModule('firebase-tools/lib/gcp/auth') };
}
async function main({ args = process.argv.slice(2), readConfig = () => JSON.parse(readFileSync(resolve(__dirname, '../firebase-applet-config.json'), 'utf8')), cloudFactory = createCloudApis, log = console.log } = {}) {
  const options = parseArgs(args);
  if (options.help) { log(`${USAGE}\nPiloto privado de 1–5 cuentas Google verificadas, incluido el responsable con permiso admin. Conserva participantes existentes. No abre el registro público, archivos, facturación, Storage ni Functions.`); return; }
  if (Number(process.versions.node.split('.')[0]) < 24) reject('node-24-required');
  const config = readConfig(); validateConfig(config);
  const cloud = await cloudFactory(realpathSync(resolve(__dirname, '..')));
  const result = await managePilot({ config, ...options, ...cloud });
  log(JSON.stringify(result)); return result;
}
function safeErrorMessage(error) {
  const code = error instanceof PilotError ? error.message : statusCode(error) ? `HTTP-${statusCode(error)}` : 'provider-error';
  return `Piloto no completado (${code}). No se abre el servicio público. Si se solicitó --apply, revisa el estado antes de repetir; no se reintenta la escritura. ${USAGE}`;
}
module.exports = { PROJECT_ID, DATABASE_ID, OWNER_EMAIL, MAX_PILOT_USERS, DOCUMENT_NAME, COMMIT_PATH, parseArgs, validateConfig, checkedIdentity, decodeRuntime, pilotWrite, managePilot, createCloudApis, main, safeErrorMessage };
if (require.main === module) main().catch(error => { console.error(safeErrorMessage(error)); process.exitCode = 1; });
