import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import { EventEmitter } from 'node:events';
import { scryptSync, createCipheriv } from 'node:crypto';

const require = createRequire(import.meta.url);
const seal = require('../scripts/seal-community-backup.cjs');
const backup = require('../scripts/community-backup.cjs');
const phrase = () => Buffer.from('Frase sintética larga para pruebas 2026');
function plaintext() {
  const collections = backup.ROOT_COLLECTIONS.map((name: string) => ({ path: name, documents: name === 'communityProfiles' ? 1 : 0, missingDocuments: 0 }));
  const value = backup.buildBackup({ collections, readTime: '2026-10-13T12:00:00.123456Z', createdAt: '2026-10-13T12:01:00Z',
    documents: [{ path: 'communityProfiles/synthetic-local', fields: {
      text: { stringValue: 'Mensaje sintético privado: balón ⚽\nSegunda línea' },
      integer: { integerValue: '9223372036854775807' }, bytes: { bytesValue: 'AP8RUA==' },
      timestamp: { timestampValue: '2026-10-13T12:00:00.123456Z' },
    } }] });
  // Unusual whitespace and CRLF prove that opening preserves the original file,
  // rather than parse/reserializing fields or losing timestamp/integer precision.
  return Buffer.from(` \r\n${JSON.stringify(value, null, '\t')}\r\n `, 'utf8');
}
function localRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cantera-seal-test-'));
  execFileSync('git', ['init', '--quiet'], { cwd: root }); fs.writeFileSync(path.join(root, '.gitignore'), 'output/private/\n');
  fs.mkdirSync(path.join(root, 'output/private'), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.join(root, 'output/private'), 0o700);
  return root;
}
const input = 'output/private/source.json', sealed = 'output/private/copy.lcb', restored = 'output/private/recovered.json';
function putSource(root: string, bytes = plaintext()) { fs.writeFileSync(path.join(root, input), bytes, { mode: 0o600 }); return bytes; }
const options = (operation: string, apply: boolean, source: string, output = '') => ({ operation, apply, input: source, output });

test('AES-GCM conserva bytes exactos y usa sal/nonce diferentes sin exponer el manifiesto', () => {
  const source = plaintext(), one = seal.sealBytes(source, phrase()), two = seal.sealBytes(source, phrase());
  assert.notDeepEqual(one, two);
  assert.notDeepEqual(seal.validateEnvelope(one).salt, seal.validateEnvelope(two).salt);
  assert.notDeepEqual(seal.validateEnvelope(one).nonce, seal.validateEnvelope(two).nonce);
  assert.equal(one.includes(Buffer.from('Mensaje sintético privado')), false);
  assert.equal(one.includes(Buffer.from(backup.DATABASE_ID)), false);
  assert.equal(one.length, source.length + seal.HEADER_BYTES + seal.TAG_BYTES);
  assert.deepEqual(seal.unsealBytes(one, phrase()), source);
});

test('frase incorrecta y alteraciones de sal, nonce, texto cifrado o tag no devuelven datos', () => {
  const data = seal.sealBytes(plaintext(), phrase());
  assert.throws(() => seal.unsealBytes(data, Buffer.from('Una frase diferente e incorrecta')), /authentication-failed/);
  for (const position of [seal.MAGIC.length + 1, seal.HEADER_BYTES - 1, seal.HEADER_BYTES + 3, data.length - 1]) {
    const damaged = Buffer.from(data); damaged[position] ^= 1;
    assert.throws(() => seal.unsealBytes(damaged, phrase()), /authentication-failed/);
  }
  const version = Buffer.from(data); version[seal.MAGIC.length] = 2;
  assert.throws(() => seal.unsealBytes(version, phrase()), /invalid-sealed/);
});

test('manifiesto corrupto o procedencia ajena se rechazan antes de cifrar', () => {
  const data = JSON.parse(plaintext().toString()); data.documents[0].fields.text.stringValue = 'alterado';
  assert.throws(() => seal.sealBytes(Buffer.from(JSON.stringify(data)), phrase()), /integrity-mismatch/);
  const foreign = JSON.parse(plaintext().toString()); foreign.databaseId = '(default)';
  assert.throws(() => seal.sealBytes(Buffer.from(JSON.stringify(foreign)), phrase()), /wrong-source/);
  assert.throws(() => seal.sealBytes(Buffer.from('no es un manifiesto'), phrase()));
});

test('un GCM válido con manifiesto interno alterado tampoco entrega plaintext', () => {
  const data = seal.sealBytes(plaintext(), phrase()), envelope = seal.validateEnvelope(data);
  const altered = JSON.parse(plaintext().toString()); altered.documents[0].fields.integer.integerValue = '0';
  const key = scryptSync(phrase(), envelope.salt, 32, seal.SCRYPT);
  try {
    const cipher = createCipheriv('aes-256-gcm', key, envelope.nonce, { authTagLength: seal.TAG_BYTES }); cipher.setAAD(envelope.header);
    const forged = Buffer.concat([envelope.header, cipher.update(Buffer.from(JSON.stringify(altered))), cipher.final(), cipher.getAuthTag()]);
    assert.throws(() => seal.unsealBytes(forged, phrase()), /authentication-failed/);
  } finally { key.fill(0); }
});

test('ciclo de archivos crea 0600/0700, conserva entrada y recupera todos sus bytes', async () => {
  const root = localRoot();
  try {
    const source = putSource(root), phraseBuffer = phrase();
    const report = await seal.runLocal({ root, options: options('seal', true, input, 'output/private/nested/copy.lcb'), passphraseProvider: async () => phraseBuffer });
    assert.equal(report.written, 1); assert.equal(report.encryptionAuthenticated, true);
    assert.equal(phraseBuffer.every((value: number) => value === 0), true);
    assert.deepEqual(fs.readFileSync(path.join(root, input)), source);
    assert.equal(fs.statSync(path.join(root, 'output/private/nested')).mode & 0o777, 0o700);
    assert.equal(fs.statSync(path.join(root, 'output/private/nested/copy.lcb')).mode & 0o777, 0o600);
    const opened = await seal.runLocal({ root, options: options('unseal', true, 'output/private/nested/copy.lcb', restored), passphraseProvider: async () => phrase() });
    assert.equal(opened.backupIntegrityVerified, true); assert.equal(opened.written, 1);
    assert.deepEqual(fs.readFileSync(path.join(root, restored)), source);
    assert.equal(fs.statSync(path.join(root, restored)).mode & 0o777, 0o600);
    assert.equal(fs.existsSync(path.join(root, 'output/private/nested/copy.lcb')), true);
    assert.throws(() => seal.writePrivateBytes(root, restored, '.json', Buffer.from('overwrite')), /unsafe-private-path/);
    assert.deepEqual(fs.readFileSync(path.join(root, restored)), source);
    assert.equal(JSON.stringify(report).includes('Mensaje'), false);
    assert.equal(JSON.stringify(report).includes('Frase'), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('dry-run de seal no pide secreto ni escribe y el de unseal sí autentica sin emitir JSON', async () => {
  const root = localRoot();
  try {
    const source = putSource(root);
    const report = await seal.runLocal({ root, options: options('seal', false, input, sealed), passphraseProvider: () => { throw new Error('must-not-prompt'); } });
    assert.equal(report.written, 0); assert.equal(report.encryptionAuthenticated, false);
    assert.equal(fs.existsSync(path.join(root, sealed)), false);
    seal.writePrivateBytes(root, sealed, '.lcb', seal.sealBytes(source, phrase()));
    const opened = await seal.runLocal({ root, options: options('unseal', false, sealed, restored), passphraseProvider: async () => phrase() });
    assert.equal(opened.written, 0); assert.equal(opened.encryptionAuthenticated, true);
    assert.equal(fs.existsSync(path.join(root, restored)), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('unseal no crea salida ante tag corrupto y no cambia el archivo de entrada', async () => {
  const root = localRoot();
  try {
    const damaged = seal.sealBytes(plaintext(), phrase()); damaged[damaged.length - 1] ^= 1;
    seal.writePrivateBytes(root, sealed, '.lcb', damaged);
    await assert.rejects(() => seal.runLocal({ root, options: options('unseal', true, sealed, restored), passphraseProvider: async () => phrase() }), /authentication-failed/);
    assert.equal(fs.existsSync(path.join(root, restored)), false);
    assert.deepEqual(fs.readFileSync(path.join(root, sealed)), damaged);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('destinos externos, públicos, ya existentes o con enlaces quedan bloqueados', () => {
  const root = localRoot();
  try {
    putSource(root);
    for (const target of ['../outside.lcb', 'public/copy.lcb', 'output/private/copy.json', 'output/private']) assert.throws(() => seal.privatePath(root, target, '.lcb', false), /private-path/);
    fs.writeFileSync(path.join(root, sealed), 'original', { mode: 0o600 });
    assert.throws(() => seal.privatePath(root, sealed, '.lcb', false), /unsafe-private/);
    fs.symlinkSync(path.join(root, input), path.join(root, 'output/private/link.json'));
    assert.throws(() => seal.readPrivateBytes(root, 'output/private/link.json', false), /unsafe-private/);
    fs.symlinkSync(path.join(root, 'output/private'), path.join(root, 'output/private/linked'));
    assert.throws(() => seal.privatePath(root, 'output/private/linked/new.lcb', '.lcb', false), /unsafe-private/);
    fs.writeFileSync(path.join(root, '.gitignore'), '');
    assert.throws(() => seal.privatePath(root, 'output/private/unignored.lcb', '.lcb', false), /excluido de Git/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('entradas con permisos públicos o hardlink se rechazan antes de leer sus bytes', () => {
  const root = localRoot();
  try {
    putSource(root); fs.chmodSync(path.join(root, input), 0o644);
    assert.throws(() => seal.readPrivateBytes(root, input, false), /input-not-private/);
    fs.chmodSync(path.join(root, input), 0o600); fs.linkSync(path.join(root, input), path.join(root, 'output/private/hard.json'));
    assert.throws(() => seal.readPrivateBytes(root, input, false), /unsafe-input-file/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('argumentos no permiten secretos, acciones ambiguas ni escritura por defecto', () => {
  assert.equal(seal.parseArgs(['seal', '--input', input]).apply, false);
  assert.equal(seal.parseArgs(['--help']).help, true);
  assert.equal(seal.parseArgs(['unseal', '--input', sealed, '--output', restored, '--apply']).apply, true);
  for (const args of [['seal', '--input', input, '--passphrase', 'secret'], ['seal', '--input', input, '--apply'], ['seal', '--input', input, '--output', sealed, '--apply', '--dry-run'], ['seal', '--input', input, '--input', input], ['delete', '--input', input]]) assert.throws(() => seal.parseArgs(args));
});

test('stdin acepta una frase sin volcarla y rechaza múltiples líneas, controles o tamaño excesivo', async () => {
  const expected = phrase();
  const actual = await seal.readPipedPassphrase(Readable.from([Buffer.from(expected), Buffer.from('\r\n')]));
  assert.deepEqual(actual, expected); actual.fill(0);
  for (const value of ['corta', 'Frase suficiente primera\nFrase segunda', `${'x'.repeat(16)}\0`, 'x'.repeat(1027)]) {
    await assert.rejects(() => seal.readPipedPassphrase(Readable.from([Buffer.from(value)])), /invalid-passphrase/);
  }
});

test('terminal oculta el secreto, permite editar y restaura raw mode al terminar o cancelar', async () => {
  class FakeTerminal extends EventEmitter {
    isRaw = false; rawCalls: boolean[] = [];
    setRawMode(value: boolean) { this.isRaw = value; this.rawCalls.push(value); }
    resume() {} pause() {}
  }
  let shown = ''; const out = new Writable({ write(chunk, _encoding, callback) { shown += chunk.toString(); callback(); } });
  const terminal = new FakeTerminal();
  const reading = seal.readHiddenPassphrase(terminal, out, 'Frase oculta: ');
  terminal.emit('data', Buffer.from('Frase para pruebas x')); terminal.emit('data', Buffer.from([127])); terminal.emit('data', Buffer.from('y\r'));
  assert.equal((await reading).toString(), 'Frase para pruebas y');
  assert.equal(shown, 'Frase oculta: \n'); assert.deepEqual(terminal.rawCalls, [true, false]);
  const interrupted = seal.readHiddenPassphrase(terminal, out, 'Frase oculta: '); terminal.emit('data', Buffer.from([3]));
  await assert.rejects(() => interrupted, /cancelled/); assert.equal(terminal.isRaw, false); assert.equal(terminal.listenerCount('data'), 0);
});
