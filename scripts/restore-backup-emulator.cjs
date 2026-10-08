// Local recovery rehearsal only. This file has no production-auth code path.
const fs = require('node:fs');
const path = require('node:path');
const backup = require('./community-backup.cjs');
const EMULATOR_ORIGIN = 'http://127.0.0.1:8080';
const MAX_COMMIT_WRITES = 100;
const MAX_COMMIT_BYTES = 8 * 1024 * 1024;
const USAGE = 'Uso: node scripts/restore-backup-emulator.cjs --input output/private/respaldo.json --project demo-cantera-recovery [--dry-run | --apply]';
const error = code => { throw new Error(code); };

function parseArgs(args) {
  const options = { apply: false, help: false, input: '', project: '' }; const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const option = args[index]; if (seen.has(option)) error('duplicate-option'); seen.add(option);
    if (option === '--apply') options.apply = true;
    else if (option === '--dry-run') continue;
    else if (option === '--help') options.help = true;
    else if (option === '--input' || option === '--project') { const value = args[++index]; if (!value || value.startsWith('--')) error('missing-value'); options[option.slice(2)] = value; }
    else error('unknown-option');
  }
  if (options.help && args.length !== 1 || !options.help && (!options.input || !options.project) || options.apply && seen.has('--dry-run')) error('invalid-options');
  if (!options.help) validateEmulatorTarget({ project: options.project });
  return options;
}
function validateEmulatorTarget({ origin = EMULATOR_ORIGIN, project, database = '(default)' } = {}) {
  // No environment variable, hostname alias, redirect, credential or custom
  // port can select another destination. Project IDs are deliberately demo-*.
  if (origin !== EMULATOR_ORIGIN || typeof project !== 'string' || !/^demo-[a-z0-9](?:[a-z0-9-]{0,53}[a-z0-9])?$/.test(project) || project.length > 63 || database !== '(default)') error('emulator-only-target');
  return { origin: EMULATOR_ORIGIN, project, database: '(default)' };
}
function transformValue(value, destinationBase) {
  if (Object.hasOwn(value, 'timestampValue')) {
    const fraction = value.timestampValue.match(/\.(\d+)Z$/)?.[1] || '';
    // Firestore stores microseconds. Never silently round a hand-edited or
    // imported nanosecond value while calling the recovery successful.
    if (fraction.length > 6 && /[1-9]/.test(fraction.slice(6))) error('timestamp-precision-exceeds-firestore');
  }
  if (Object.hasOwn(value, 'referenceValue')) return { referenceValue: `${destinationBase}/${value.referenceValue.slice(backup.resourceBase().length + 1)}` };
  if (Object.hasOwn(value, 'mapValue')) return { mapValue: { fields: transformFields(value.mapValue.fields || {}, destinationBase) } };
  if (Object.hasOwn(value, 'arrayValue')) return { arrayValue: { values: (value.arrayValue.values || []).map(child => transformValue(child, destinationBase)) } };
  return structuredClone(value);
}
function transformFields(fields, destinationBase) { return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, transformValue(value, destinationBase)])); }
function semanticValue(value) {
  if (Object.hasOwn(value, 'timestampValue')) return { timestampValue: backup.canonicalTimestamp(value.timestampValue) };
  if (Object.hasOwn(value, 'integerValue')) return { integerValue: BigInt(value.integerValue).toString() };
  if (Object.hasOwn(value, 'nullValue')) return { nullValue: null };
  if (Object.hasOwn(value, 'geoPointValue')) return { geoPointValue: { latitude: value.geoPointValue.latitude || 0, longitude: value.geoPointValue.longitude || 0 } };
  if (Object.hasOwn(value, 'mapValue')) return { mapValue: { fields: semanticFields(value.mapValue.fields || {}) } };
  if (Object.hasOwn(value, 'arrayValue')) return { arrayValue: { values: (value.arrayValue.values || []).map(semanticValue) } };
  return value;
}
function semanticFields(fields) { return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, semanticValue(value)])); }
function buildRestorePlan(payload, target) {
  backup.validateBackup(payload); const selected = validateEmulatorTarget(target);
  const base = backup.resourceBase(selected.project, selected.database);
  const writes = payload.documents.map(document => ({ update: { name: `${base}/${document.path}`, fields: transformFields(document.fields, base) }, currentDocument: { exists: false } }));
  return { target: selected, sourceProject: payload.projectId, sourceDatabase: payload.databaseId, sourceSha256: payload.integrity.sha256, writes };
}
function splitWrites(writes) {
  const result = []; let chunk = [];
  for (const write of writes) {
    if (Buffer.byteLength(JSON.stringify({ writes: [write] })) > MAX_COMMIT_BYTES) error('single-write-too-large');
    if (chunk.length && (chunk.length >= MAX_COMMIT_WRITES || Buffer.byteLength(JSON.stringify({ writes: [...chunk, write] })) > MAX_COMMIT_BYTES)) { result.push(chunk); chunk = []; }
    chunk.push(write);
  }
  if (chunk.length) result.push(chunk);
  return result;
}
async function restoreBackup({ payload, target, apply = false, fetchImpl = fetch }) {
  const plan = buildRestorePlan(payload, target); const chunks = splitWrites(plan.writes);
  const summary = { target: EMULATOR_ORIGIN, project: plan.target.project, database: '(default)', mode: apply ? 'apply-local-rehearsal' : 'dry-run-local-plan', documents: plan.writes.length, chunks: chunks.length, written: 0, integrityVerified: true, fieldsVerified: false };
  if (!apply) return summary;
  const base = backup.resourceBase(plan.target.project, '(default)');
  const request = async (method, resource, body) => {
    // Revalidate on every request: callers cannot insert an arbitrary URL.
    validateEmulatorTarget(plan.target);
    if (!(resource === `${base}:commit` || resource.startsWith(`${base}/`))) error('foreign-emulator-resource');
    if (resource !== `${base}:commit`) backup.validateDocumentPath(resource.slice(base.length + 1));
    const url = `${EMULATOR_ORIGIN}/v1/${backup.encodeResource(resource).replace(/%3Acommit$/, ':commit')}`;
    const response = await fetchImpl(url, { method, redirect: 'error', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
    const data = await response.json(); return { status: response.status, body: data };
  };
  // Preflight every document before the first write. A concurrent creator is
  // still protected by currentDocument.exists=false in the atomic commit.
  for (let index = 0; index < plan.writes.length; index += 8) {
    await Promise.all(plan.writes.slice(index, index + 8).map(async write => {
      const result = await request('GET', write.update.name);
      if (result.status !== 404 || result.body?.error?.code !== 404 || result.body?.error?.status !== 'NOT_FOUND') error('target-not-empty-or-not-emulator');
    }));
  }
  for (const writes of chunks) {
    const result = await request('POST', `${base}:commit`, { writes });
    if (result.status !== 200 || !Array.isArray(result.body?.writeResults) || result.body.writeResults.length !== writes.length) error('local-commit-failed');
    summary.written += writes.length;
  }
  for (let index = 0; index < plan.writes.length; index += 8) {
    await Promise.all(plan.writes.slice(index, index + 8).map(async write => {
      const result = await request('GET', write.update.name);
      if (result.status !== 200 || result.body?.name !== write.update.name || backup.canonicalJson(semanticFields(result.body.fields || {})) !== backup.canonicalJson(semanticFields(write.update.fields))) error('restored-fields-mismatch');
    }));
  }
  summary.fieldsVerified = true; return summary;
}
async function main() {
  let stage = 'arguments';
  try {
    const options = parseArgs(process.argv.slice(2)); if (options.help) { console.log(USAGE); return; }
    if (Number(process.versions.node.split('.')[0]) < 24) error('node-24-required');
    const root = fs.realpathSync(path.resolve(__dirname, '..'));
    stage = 'private-input'; const payload = backup.readPrivateBackup(root, options.input);
    stage = options.apply ? 'local-restore' : 'local-plan'; const summary = await restoreBackup({ payload, target: { project: options.project }, apply: options.apply });
    console.log(JSON.stringify(summary));
  } catch { console.error(`Ensayo no completado (${stage}). Destino permitido: 127.0.0.1:8080, proyecto demo-*, base (default). No se sobrescriben documentos. Si hubo varios lotes, revisa el emulador: puede haber una restauración parcial. Consulta docs/BACKUP_RECOVERY.md.`); process.exitCode = 1; }
}
module.exports = { EMULATOR_ORIGIN, MAX_COMMIT_WRITES, MAX_COMMIT_BYTES, parseArgs, validateEmulatorTarget, buildRestorePlan, splitWrites, semanticFields, restoreBackup };
if (require.main === module) void main();
