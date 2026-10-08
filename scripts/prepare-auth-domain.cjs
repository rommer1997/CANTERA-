// Uses the owner's Firebase CLI session. Dry-run is the default; --apply writes
// only the authorizedDomains setting, preserving the domains read from Auth.
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const PROJECT_ID = 'gen-lang-client-0853130215';
const DATABASE_ID = 'ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb';
const USAGE = 'Uso: node scripts/prepare-auth-domain.cjs --domain HOSTNAME [--dry-run | --apply] [--allow-localhost]';

class PreparationError extends Error {}

function validateDomain(value, allowLocalhost = false) {
  if (typeof value !== 'string' || value !== value.trim() || value.length > 253) throw new PreparationError('Dominio inválido. Indica sólo un hostname, sin protocolo, ruta, puerto ni comodines.');
  const domain = value.toLowerCase();
  if (domain === 'localhost' && allowLocalhost) return domain;
  const labels = domain.split('.');
  if (labels.length < 2 || !/[a-z]/.test(labels.at(-1)) || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || labels.at(-1) === 'localhost') {
    throw new PreparationError('Dominio inválido. Indica sólo un hostname público; localhost requiere --allow-localhost.');
  }
  return domain;
}

function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true, apply: false, domain: '', allowLocalhost: false };
  const options = { help: false, apply: false, domain: '', allowLocalhost: false };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    if (seen.has(option)) throw new PreparationError(USAGE);
    seen.add(option);
    if (option === '--domain') {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new PreparationError(USAGE);
      options.domain = value;
    } else if (option === '--apply') options.apply = true;
    else if (option === '--dry-run') continue;
    else if (option === '--allow-localhost') options.allowLocalhost = true;
    else throw new PreparationError(USAGE);
  }
  if (!options.domain || seen.has('--apply') && seen.has('--dry-run')) throw new PreparationError(USAGE);
  options.domain = validateDomain(options.domain, options.allowLocalhost);
  if (options.allowLocalhost && options.domain !== 'localhost') throw new PreparationError('--allow-localhost sólo se admite junto a --domain localhost.');
  return options;
}

function validateConfig(config) {
  if (!config || config.projectId !== PROJECT_ID || config.firestoreDatabaseId !== DATABASE_ID) throw new PreparationError('La configuración no apunta al proyecto y a la base nombrada de Cantera; operación detenida.');
}

function planDomainChange(existing, domain) {
  if (!Array.isArray(existing) || existing.some(value => typeof value !== 'string' || !value || value !== value.trim() || /\s/.test(value))) throw new PreparationError('Auth devolvió una lista de dominios inválida; operación detenida.');
  const domains = [];
  const keys = new Set();
  for (const value of existing) {
    const key = value.toLowerCase();
    if (!keys.has(key)) { keys.add(key); domains.push(value); }
  }
  const additions = keys.has(domain.toLowerCase()) ? 0 : 1;
  if (additions) domains.push(domain);
  const duplicatesRemoved = existing.length - keys.size;
  return { domains, additions, duplicatesRemoved, changed: additions > 0 || duplicatesRemoved > 0 };
}

function summary(domain, apply, action, plan, previousCount, verified = false) {
  return { project: PROJECT_ID, database: DATABASE_ID, domain, mode: apply ? 'apply' : 'dry-run', action, previousCount, proposedCount: plan.domains.length, additions: plan.additions, duplicatesRemoved: plan.duplicatesRemoved, verified };
}

async function prepareAuthDomain({ config, domain, apply = false, allowLocalhost = false, api }) {
  validateConfig(config);
  domain = validateDomain(domain, allowLocalhost);
  let existing = await api.getAuthDomains(PROJECT_ID);
  let plan = planDomainChange(existing, domain);
  if (!apply || !plan.changed) return summary(domain, apply, plan.changed ? 'planned' : 'unchanged', plan, existing.length, !plan.changed);

  // Auth's API replaces the array and has no conditional-write parameter in
  // Firebase CLI. Re-read immediately before merging so an intervening addition
  // is retained. Never use a hard-coded replacement list.
  existing = await api.getAuthDomains(PROJECT_ID);
  plan = planDomainChange(existing, domain);
  if (!plan.changed) return summary(domain, true, 'unchanged', plan, existing.length, true);
  await api.updateAuthDomains(PROJECT_ID, plan.domains);
  const actual = await api.getAuthDomains(PROJECT_ID);
  const verified = planDomainChange(actual, domain);
  const actualKeys = new Set(actual.map(value => value.toLowerCase()));
  if (verified.additions || plan.domains.some(value => !actualKeys.has(value.toLowerCase()))) throw new PreparationError('La escritura de Auth no pudo verificarse o falta un dominio previo. Revisa la configuración; no se ejecutó una segunda escritura.');
  return summary(domain, true, 'applied', plan, existing.length, true);
}

async function main({ args = process.argv.slice(2), loadModule = require, readConfig = () => JSON.parse(readFileSync(resolve(__dirname, '../firebase-applet-config.json'), 'utf8')), log = console.log } = {}) {
  const options = parseArgs(args);
  if (options.help) { log(`${USAGE}\nPor defecto sólo lee y prepara. Ejemplo: --domain cantera-tau.vercel.app --dry-run. No modifica reglas, perfiles, facturación ni proveedores de acceso.`); return; }
  const config = readConfig();
  validateConfig(config);
  const auth = loadModule('firebase-tools/lib/auth');
  const { requireAuth } = loadModule('firebase-tools/lib/requireAuth');
  const api = loadModule('firebase-tools/lib/gcp/auth');
  const account = auth.getProjectDefaultAccount(resolve(__dirname, '..'));
  if (!account) throw new PreparationError('Accede primero al Firebase CLI con una cuenta propietaria autorizada.');
  const authOptions = { project: PROJECT_ID };
  auth.setActiveAccount(authOptions, account);
  await requireAuth(authOptions);
  const result = await prepareAuthDomain({ config, ...options, api });
  log(JSON.stringify(result));
  if (!options.apply) log('Sólo lectura. Ningún dominio modificado. Revisa el dominio público antes de autorizar --apply.');
  return result;
}

function safeErrorMessage(error) {
  if (error instanceof PreparationError) return error.message;
  const status = [error?.status, error?.statusCode, error?.context?.response?.statusCode, error?.context?.response?.status].find(value => Number.isInteger(value) && value >= 400 && value <= 599);
  return `Configuración de dominio no completada${status ? ` (HTTP ${status})` : ''}. Revisa los permisos de la cuenta Firebase CLI y repite la revisión; no se imprimen credenciales ni mensajes del proveedor.`;
}

module.exports = { PROJECT_ID, DATABASE_ID, parseArgs, validateDomain, validateConfig, planDomainChange, prepareAuthDomain, main, safeErrorMessage };
if (require.main === module) main().catch(error => { console.error(safeErrorMessage(error)); process.exitCode = 1; });
