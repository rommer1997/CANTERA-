// Operator-only local encryption. No credentials, network, deletion or cloud restore.
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, scryptSync, createCipheriv, createDecipheriv, timingSafeEqual } = require('node:crypto');
const backup = require('./community-backup.cjs');
const { assertIgnored } = require('./export-account.cjs');
const MAGIC = Buffer.from('LCBSEAL\0', 'ascii');
const VERSION = 1;
const SALT_BYTES = 32, NONCE_BYTES = 12, TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.length + 1 + SALT_BYTES + NONCE_BYTES;
const SCRYPT = Object.freeze({ N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
const MAX_SEALED_BYTES = backup.MAX_FILE_BYTES + HEADER_BYTES + TAG_BYTES;
const USAGE = 'Uso: node scripts/seal-community-backup.cjs seal|unseal --input output/private/archivo.json|.lcb [--output output/private/nuevo.lcb|.json] [--dry-run | --apply]\nLa frase se solicita oculta en el terminal; con stdin redirigido se lee una línea. Nunca la pases como argumento ni variable de entorno.';
const fail = code => { throw new Error(code); };

function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true };
  const [operation, ...rest] = args;
  if (!['seal', 'unseal'].includes(operation)) fail('invalid-operation');
  const options = { operation, apply: false, help: false, input: '', output: '' }, seen = new Set();
  for (let index = 0; index < rest.length; index++) {
    const option = rest[index]; if (seen.has(option)) fail('duplicate-option'); seen.add(option);
    if (option === '--apply') options.apply = true;
    else if (option === '--dry-run') continue;
    else if (option === '--input' || option === '--output') {
      const value = rest[++index]; if (!value || value.startsWith('--')) fail('missing-value'); options[option.slice(2)] = value;
    } else fail('unknown-option');
  }
  if (!options.input || options.apply && !options.output || options.apply && seen.has('--dry-run')) fail('invalid-options');
  return options;
}

function validatePassphrase(passphrase) {
  if (!Buffer.isBuffer(passphrase) || passphrase.length < 16 || passphrase.length > 1024
    || !Buffer.from(passphrase.toString('utf8'), 'utf8').equals(passphrase) || /[\u0000-\u001f\u007f]/u.test(passphrase.toString('utf8'))) fail('invalid-passphrase');
  return passphrase;
}
function validatePlaintext(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length > backup.MAX_FILE_BYTES) fail('backup-volume-exceeded');
  if (!Buffer.from(bytes.toString('utf8'), 'utf8').equals(bytes)) fail('invalid-backup-encoding');
  return backup.validateBackup(JSON.parse(bytes.toString('utf8')));
}
function validateEnvelope(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length <= HEADER_BYTES + TAG_BYTES || bytes.length > MAX_SEALED_BYTES
    || !bytes.subarray(0, MAGIC.length).equals(MAGIC) || bytes[MAGIC.length] !== VERSION) fail('invalid-sealed-backup');
  const saltStart = MAGIC.length + 1;
  return { header: bytes.subarray(0, HEADER_BYTES), salt: bytes.subarray(saltStart, saltStart + SALT_BYTES),
    nonce: bytes.subarray(saltStart + SALT_BYTES, HEADER_BYTES), ciphertext: bytes.subarray(HEADER_BYTES, -TAG_BYTES), tag: bytes.subarray(-TAG_BYTES) };
}
function sealBytes(plaintext, passphrase) {
  validatePlaintext(plaintext); validatePassphrase(passphrase);
  const salt = randomBytes(SALT_BYTES), nonce = randomBytes(NONCE_BYTES);
  const header = Buffer.concat([MAGIC, Buffer.from([VERSION]), salt, nonce]);
  const key = scryptSync(passphrase, salt, 32, SCRYPT);
  try {
    const cipher = createCipheriv('aes-256-gcm', key, nonce, { authTagLength: TAG_BYTES }); cipher.setAAD(header);
    return Buffer.concat([header, cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  } finally { key.fill(0); }
}
function unsealBytes(envelope, passphrase) {
  const { header, salt, nonce, ciphertext, tag } = validateEnvelope(envelope); validatePassphrase(passphrase);
  const key = scryptSync(passphrase, salt, 32, SCRYPT); let plaintext, partial;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, nonce, { authTagLength: TAG_BYTES }); decipher.setAAD(header); decipher.setAuthTag(tag);
    partial = decipher.update(ciphertext);
    // Never return or write the unauthenticated output of update().
    plaintext = Buffer.concat([partial, decipher.final()]); partial.fill(0);
    validatePlaintext(plaintext); return plaintext;
  } catch { partial?.fill(0); plaintext?.fill(0); fail('sealed-backup-authentication-failed'); }
  finally { key.fill(0); }
}

function privatePath(root, requested, extension, input) {
  const canonicalRoot = fs.realpathSync(root), privateRoot = path.join(canonicalRoot, 'output', 'private');
  const target = path.resolve(canonicalRoot, requested), relative = path.relative(privateRoot, target);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || path.extname(target).toLowerCase() !== extension) fail('private-path-required');
  let current = canonicalRoot;
  const components = [];
  for (const part of path.relative(canonicalRoot, target).split(path.sep)) {
    current = path.join(current, part); let info;
    try { info = fs.lstatSync(current); } catch (error) { if (!input && error.code === 'ENOENT') continue; throw error; }
    if (info.isSymbolicLink() || current !== target && !info.isDirectory() || current === target && (!input || !info.isFile())) fail('unsafe-private-path');
    if (input && (current === privateRoot || current.startsWith(`${privateRoot}${path.sep}`)) && (info.mode & 0o777) !== (current === target ? 0o600 : 0o700)) fail('input-not-private');
    components.push({ path: current, dev: info.dev, ino: info.ino });
  }
  assertIgnored(canonicalRoot, target);
  return { target, canonicalRoot, privateRoot, components };
}
function checkComponents(components) {
  for (const component of components) {
    const info = fs.lstatSync(component.path);
    if (info.isSymbolicLink() || info.dev !== component.dev || info.ino !== component.ino) fail('private-path-changed');
  }
}
function readPrivateBytes(root, requested, sealed) {
  const { target, components } = privatePath(root, requested, sealed ? '.lcb' : '.json', true);
  const descriptor = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    checkComponents(components); const info = fs.fstatSync(descriptor), original = components.at(-1);
    if (!info.isFile() || info.nlink !== 1 || info.size > (sealed ? MAX_SEALED_BYTES : backup.MAX_FILE_BYTES)
      || info.dev !== original.dev || info.ino !== original.ino || (info.mode & 0o777) !== 0o600) fail('unsafe-input-file');
    const bytes = fs.readFileSync(descriptor); checkComponents(components); return bytes;
  } finally { fs.closeSync(descriptor); }
}
function writePrivateBytes(root, requested, extension, bytes) {
  const { target, canonicalRoot, privateRoot } = privatePath(root, requested, extension, false);
  let current = canonicalRoot;
  for (const part of path.relative(canonicalRoot, path.dirname(target)).split(path.sep)) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) fs.mkdirSync(current, { mode: 0o700 });
    const info = fs.lstatSync(current); if (!info.isDirectory() || info.isSymbolicLink()) fail('unsafe-private-path');
    if (current === privateRoot || current.startsWith(`${privateRoot}${path.sep}`)) fs.chmodSync(current, 0o700);
  }
  const { components } = privatePath(root, requested, extension, false); checkComponents(components);
  const descriptor = fs.openSync(target, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW || 0), 0o600);
  let complete = false;
  try {
    checkComponents(components); fs.fchmodSync(descriptor, 0o600); const info = fs.fstatSync(descriptor);
    if (!info.isFile() || info.nlink !== 1 || (info.mode & 0o777) !== 0o600) fail('private-output-required');
    fs.writeFileSync(descriptor, bytes); fs.fsyncSync(descriptor); complete = true;
  } finally { fs.closeSync(descriptor); if (!complete) fs.unlinkSync(target); }
}

async function runLocal({ root, options, passphraseProvider }) {
  const { operation, apply, input, output } = options;
  if (!['seal', 'unseal'].includes(operation)) fail('invalid-operation');
  if (apply && !output) fail('output-required');
  if (output) privatePath(root, output, operation === 'seal' ? '.lcb' : '.json', false);
  const source = readPrivateBytes(root, input, operation === 'unseal');
  let passphrase, transformed, verified;
  try {
    if (operation === 'seal') validatePlaintext(source); else validateEnvelope(source);
    if (operation === 'unseal' || apply) {
      passphrase = await passphraseProvider(operation); validatePassphrase(passphrase);
      transformed = operation === 'seal' ? sealBytes(source, passphrase) : unsealBytes(source, passphrase);
      if (operation === 'seal') {
        verified = unsealBytes(transformed, passphrase);
        if (!timingSafeEqual(source, verified)) fail('sealed-backup-byte-mismatch');
      }
      if (apply) writePrivateBytes(root, output, operation === 'seal' ? '.lcb' : '.json', transformed);
    }
    return { operation, mode: apply ? 'apply-local-only' : 'dry-run-local-only', written: apply ? 1 : 0,
      backupIntegrityVerified: true, encryptionAuthenticated: operation === 'unseal' || apply, sourcePreserved: true };
  } finally { source.fill(0); passphrase?.fill(0); transformed?.fill(0); verified?.fill(0); }
}

async function readPipedPassphrase(input) {
  const chunks = []; let length = 0;
  try {
    for await (const chunk of input) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); chunks.push(bytes); length += bytes.length;
      if (length > 1026) fail('invalid-passphrase');
    }
    const joined = Buffer.concat(chunks); let end = joined.length;
    if (end && joined[end - 1] === 10) end--;
    if (end && joined[end - 1] === 13) end--;
    const result = Buffer.from(joined.subarray(0, end)); joined.fill(0);
    try { return validatePassphrase(result); } catch (error) { result.fill(0); throw error; }
  } finally { for (const chunk of chunks) chunk.fill(0); }
}
function readHiddenPassphrase(input, output, prompt) {
  return new Promise((resolve, reject) => {
    const previousRaw = input.isRaw, bytes = []; let settled = false;
    output.write(prompt); input.setRawMode(true); input.resume();
    const finish = error => {
      if (settled) return; settled = true; input.off('data', onData); input.off('end', onEnd); input.off('error', onError);
      input.setRawMode(!!previousRaw); input.pause(); output.write('\n');
      const result = Buffer.from(bytes); bytes.fill(0);
      if (error) { result.fill(0); reject(error); } else resolve(result);
    };
    const onData = chunk => {
      for (const byte of chunk) {
        if (byte === 3) { finish(new Error('passphrase-cancelled')); return; }
        if (byte === 10 || byte === 13) { finish(); return; }
        if (byte === 127 || byte === 8) { if (bytes.length) { while (bytes.length && (bytes.at(-1) & 0xc0) === 0x80) bytes.pop(); bytes.pop(); } continue; }
        if (byte < 32 || bytes.length >= 1024) { finish(new Error('invalid-passphrase')); return; }
        bytes.push(byte);
      }
    };
    const onEnd = () => finish(new Error('passphrase-input-ended')), onError = () => finish(new Error('passphrase-input-failed'));
    input.on('data', onData); input.once('end', onEnd); input.once('error', onError);
  });
}
async function readPassphrase(operation, input = process.stdin, output = process.stderr) {
  if (!input.isTTY) return readPipedPassphrase(input);
  let passphrase, confirmation;
  try {
    passphrase = await readHiddenPassphrase(input, output, 'Frase de protección (mínimo 16 bytes, entrada oculta): '); validatePassphrase(passphrase);
    if (operation === 'seal') {
      confirmation = await readHiddenPassphrase(input, output, 'Repite la frase: '); validatePassphrase(confirmation);
      if (passphrase.length !== confirmation.length || !timingSafeEqual(passphrase, confirmation)) fail('passphrase-confirmation-mismatch');
    }
    return passphrase;
  } catch (error) { passphrase?.fill(0); throw error; }
  finally { confirmation?.fill(0); }
}
async function main() {
  try {
    const options = parseArgs(process.argv.slice(2)); if (options.help) { console.log(USAGE); return; }
    if (Number(process.versions.node.split('.')[0]) < 24) fail('node-24-required');
    console.log(JSON.stringify(await runLocal({ root: fs.realpathSync(path.resolve(__dirname, '..')), options, passphraseProvider: readPassphrase })));
  } catch { console.error('Operación local no completada. La entrada se conserva; no se ha modificado la nube. Revisa --help y docs/BACKUP_RECOVERY.md.'); process.exitCode = 1; }
}
module.exports = { MAGIC, VERSION, HEADER_BYTES, TAG_BYTES, SCRYPT, MAX_SEALED_BYTES, parseArgs, validatePassphrase, validatePlaintext, validateEnvelope, sealBytes, unsealBytes, privatePath, readPrivateBytes, writePrivateBytes, runLocal, readPipedPassphrase, readHiddenPassphrase };
if (require.main === module) void main();
