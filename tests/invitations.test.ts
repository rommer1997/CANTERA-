import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import {
  INVITATION_CODE_ALPHABET, INVITATION_CODE_LENGTH, INVITATION_TTL_MS, InvitationError,
  formatInvitationCode, formatInvitationCountdown, generateInvitationCode, invitationExpiresAt,
  invitationLink, invitationSecondsRemaining, normalizeConnection, normalizeInvitation,
  normalizeInvitationCode, safeInvitationError, validateInvitationAcceptance,
} from '../src/community/invitations.ts';
import type { InvitationErrorCode } from '../src/community/invitationTypes.ts';

const code = 'DME2M8Z4PFA6GF89';
const at = '2026-10-07T12:00:00.000Z';
const epoch = Date.parse(at);
const expiry = '2026-10-07T12:10:00.000Z';
const invite = { id: code, ownerId: 'alice', kind: 'connection' as const, eventId: '', status: 'active' as const, createdAt: at, usedBy: '', usedAt: '' };
const actor = { userId: 'bob', emailVerified: true, now: epoch + 1 };
function throwsCode(action: () => unknown, expected: InvitationErrorCode): void {
  assert.throws(action, error => error instanceof InvitationError && error.code === expected);
}

test('código de 16 símbolos usa 32 caracteres legibles y bytes criptográficos sin sesgo', () => {
  assert.equal(INVITATION_CODE_ALPHABET.length, 32);
  assert.equal(new Set(INVITATION_CODE_ALPHABET).size, 32);
  assert.equal(INVITATION_CODE_LENGTH, 16);
  for (const char of '01IO') assert.equal(INVITATION_CODE_ALPHABET.includes(char), false);
  const counts = new Map([...INVITATION_CODE_ALPHABET].map(symbol => [symbol, 0]));
  for (let offset = 0; offset < 256; offset += 16) {
    const generated = generateInvitationCode(bytes => {
      assert.equal(bytes.length, 16);
      bytes.forEach((_, index) => { bytes[index] = offset + index; });
      return bytes;
    });
    assert.equal(generated.length, 16);
    for (const symbol of generated) counts.set(symbol, counts.get(symbol)! + 1);
  }
  for (const count of counts.values()) assert.equal(count, 8);
  assert.ok(normalizeInvitationCode(generateInvitationCode()));
});

test('normaliza códigos escritos a mano sin interpretar enlaces ni caracteres ambiguos', () => {
  assert.equal(normalizeInvitationCode('dme2 m8z4 pfa6 gf89'), code);
  assert.equal(normalizeInvitationCode(' DME2-M8Z4-PFA6-GF89 '), code);
  assert.equal(formatInvitationCode(code), 'DME2 M8Z4 PFA6 GF89');
  for (const value of ['', null, 5, `${code}2`, code.slice(1), 'DME1M8Z4PFA6GF89', 'DME0M8Z4PFA6GF89', 'DMEIM8Z4PFA6GF89', 'DMEOM8Z4PFA6GF89', 'DME2\nM8Z4PFA6GF89', 'DME2\tM8Z4PFA6GF89', 'DME2–M8Z4PFA6GF89', 'ＤＭＥ２Ｍ８Ｚ４ＰＦＡ６ＧＦ８９', `https://lacantera.web.app/#/invite/${code}`, `#/invite/${code}`, `${code}?event=private`, ' '.repeat(129) + code]) {
    assert.equal(normalizeInvitationCode(value), null);
  }
  throwsCode(() => formatInvitationCode('invalid'), 'invalid-code');
});

test('enlace y QR usan el origen entregado y conservan la ruta a través del hash', () => {
  assert.equal(invitationLink(code.toLowerCase(), 'https://lacantera.web.app'), `https://lacantera.web.app/#/invite/${code}`);
  assert.equal(invitationLink(code, 'https://club.example.test/'), `https://club.example.test/#/invite/${code}`);
  assert.equal(invitationLink(code, 'http://localhost:3000'), `http://localhost:3000/#/invite/${code}`);
  for (const origin of ['javascript:alert(1)', 'ftp://club.example.test', 'https://user:password@club.example.test', 'https://club.example.test/path', 'https://club.example.test/?token=secret', 'https://club.example.test/#/feed', 'club.example.test']) throwsCode(() => invitationLink(code, origin), 'unavailable');
  throwsCode(() => invitationLink('not-a-code', 'https://lacantera.web.app'), 'invalid-code');
});

test('caduca exactamente diez minutos desde creación del servidor y tolera salto de día', () => {
  assert.equal(INVITATION_TTL_MS, 600000);
  assert.equal(invitationExpiresAt(at), expiry);
  assert.equal(invitationExpiresAt(epoch), expiry);
  assert.equal(invitationExpiresAt(new Date(at)), expiry);
  assert.equal(invitationExpiresAt('2026-10-07T23:55:00.000Z'), '2026-10-08T00:05:00.000Z');
  for (const value of ['invalid', '2026-02-30T12:00:00.000Z', '2026-10-07', NaN, Infinity, -1, Number.MAX_SAFE_INTEGER, new Date('invalid')]) throwsCode(() => invitationExpiresAt(value), 'unavailable');
});

test('contador se redondea hacia arriba y se detiene en cero sin valores negativos', () => {
  assert.equal(invitationSecondsRemaining(expiry, epoch), 600);
  assert.equal(invitationSecondsRemaining(expiry, epoch + 16000), 584);
  assert.equal(invitationSecondsRemaining(expiry, epoch + 599999), 1);
  assert.equal(invitationSecondsRemaining(expiry, epoch + 600000), 0);
  assert.equal(invitationSecondsRemaining(expiry, epoch + 600001), 0);
  assert.equal(invitationSecondsRemaining('invalid', epoch), 0);
  assert.equal(invitationSecondsRemaining(expiry, NaN), 0);
  assert.equal(formatInvitationCountdown(600), '10:00');
  assert.equal(formatInvitationCountdown(584), '9:44');
  assert.equal(formatInvitationCountdown(0.1), '0:01');
  for (const value of [0, -10, NaN, Infinity]) assert.equal(formatInvitationCountdown(value), '0:00');
});

test('normaliza ISO y Timestamp real de Firestore sin publicar metadatos extras', () => {
  assert.deepEqual(normalizeInvitation(invite, code), invite);
  const result = normalizeInvitation({ ...invite, kind: 'event', eventId: 'private-event', createdAt: Timestamp.fromMillis(epoch), ownerEmail: 'private@example.test', ownerName: 'Nombre privado', eventTitle: 'Torneo privado', expiresAt: '2099-01-01T00:00:00.000Z', admin: true }, code);
  assert.deepEqual(result, { ...invite, kind: 'event', eventId: 'private-event' });
  assert.ok(result);
  for (const field of ['ownerEmail', 'ownerName', 'eventTitle', 'expiresAt', 'admin']) assert.equal(Object.hasOwn(result, field), false);
  assert.equal(invitationExpiresAt(result.createdAt), expiry);
});

test('normalización excluye IDs, fechas, destinos y estados inconsistentes sin reparar datos', () => {
  for (const changed of [
    { id: code.toLowerCase() }, { id: '../private-event' }, { ownerId: '__proto__' }, { ownerId: '../alice' }, { ownerId: '' },
    { kind: 'team' }, { kind: 'connection', eventId: 'private-event' }, { kind: 'event', eventId: '' }, { kind: 'event', eventId: 'constructor' },
    { status: 'expired' }, { createdAt: '2026-02-30T12:00:00.000Z' }, { createdAt: '1969-12-31T23:59:59.999Z' }, { createdAt: '+275760-09-13T00:00:00.000Z' }, { createdAt: { toDate() { throw new Error('private failure'); } } },
    { createdAt: { toDate() { return 'invalid'; } } }, { usedBy: 'bob' }, { usedAt: at }, { usedBy: null }, { usedAt: null },
  ]) assert.equal(normalizeInvitation({ ...invite, ...changed }), null);
  assert.equal(normalizeInvitation(invite, 'other'), null);
  assert.equal(normalizeInvitation(null), null);
  assert.equal(normalizeInvitation([invite]), null);
  assert.equal(normalizeInvitation({ ...invite, ownerId: undefined, inviterId: 'alice' }), null);
});

test('código usado exige un destinatario diferente y consumo dentro de los diez minutos', () => {
  const used = { ...invite, status: 'used', usedBy: 'bob', usedAt: '2026-10-07T12:09:59.999Z' };
  assert.deepEqual(normalizeInvitation({ ...used, usedAt: Timestamp.fromDate(new Date(used.usedAt)) }), used);
  for (const changed of [{ usedBy: '' }, { usedBy: 'alice' }, { usedBy: '../bob' }, { usedAt: '' }, { usedAt: '2026-10-07T11:59:59.999Z' }, { usedAt: expiry }, { usedAt: '2026-10-07T12:11:00.000Z' }]) assert.equal(normalizeInvitation({ ...used, ...changed }), null);
  assert.deepEqual(normalizeInvitation({ ...invite, status: 'revoked' }), { ...invite, status: 'revoked' });
  assert.equal(normalizeInvitation({ ...used, status: 'revoked' }), null);
});

test('aceptación exige cuenta, correo verificado y un código activo destinado a otra persona', () => {
  assert.doesNotThrow(() => validateInvitationAcceptance(invite, actor));
  assert.doesNotThrow(() => validateInvitationAcceptance({ ...invite, kind: 'event', eventId: 'private-event' }, actor));
  assert.doesNotThrow(() => validateInvitationAcceptance(invite, { ...actor, now: epoch }));
  throwsCode(() => validateInvitationAcceptance(invite, { ...actor, userId: '' }), 'signin-required');
  throwsCode(() => validateInvitationAcceptance(invite, { ...actor, userId: '../bob' }), 'signin-required');
  throwsCode(() => validateInvitationAcceptance(invite, { ...actor, emailVerified: false }), 'email-verification-required');
  throwsCode(() => validateInvitationAcceptance(null, { ...actor, emailVerified: false }), 'email-verification-required');
  throwsCode(() => validateInvitationAcceptance(invite, { ...actor, userId: 'alice' }), 'self-invitation');
});

test('ausente, revocado, usado o caducado dan el mismo error antes de revelar eventos privados', () => {
  const failures = [
    () => validateInvitationAcceptance(null, actor),
    () => validateInvitationAcceptance({ ...invite, status: 'revoked' }, actor),
    () => validateInvitationAcceptance({ ...invite, status: 'used', usedBy: 'bob', usedAt: at }, actor),
    () => validateInvitationAcceptance(invite, { ...actor, now: epoch + INVITATION_TTL_MS }),
    () => validateInvitationAcceptance(invite, { ...actor, now: epoch - 1 }),
    () => validateInvitationAcceptance(invite, { ...actor, now: NaN }),
  ];
  for (const failure of failures) throwsCode(failure, 'unavailable');
  const safe = safeInvitationError(new InvitationError('unavailable'));
  assert.equal(safeInvitationError(new Error('Firebase permission-denied: private-event; private@example.test')), safe);
  assert.equal(safeInvitationError({ code: 'permission-denied', ownerName: 'Privado' }), safe);
  assert.equal(safeInvitationError(null), safe);
  assert.equal(safeInvitationError(new InvitationError('invalid-code')), 'Introduce un código válido de 16 caracteres.');
});

test('contactos usan ambos extremos de una ruta anidada y no colisionan al contener guiones bajos', () => {
  const connection = { ownerId: 'alice_bob', peerId: 'carol', inviteId: code, createdAt: at };
  assert.deepEqual(normalizeConnection({ ...connection, createdAt: Timestamp.fromMillis(epoch), privateEmail: 'private@example.test', status: 'verified' }, 'alice_bob', 'carol'), connection);
  assert.equal(normalizeConnection(connection, 'alice', 'bob_carol'), null);
  assert.equal(normalizeConnection(connection, 'alice_bob', 'other'), null);
  assert.deepEqual(normalizeConnection({ ...connection, ownerId: 'alice', peerId: 'bob_carol' }, 'alice', 'bob_carol'), { ...connection, ownerId: 'alice', peerId: 'bob_carol' });
  for (const changed of [{ ownerId: 'carol' }, { ownerId: '__proto__' }, { peerId: '../carol' }, { inviteId: code.toLowerCase() }, { createdAt: 'invalid' }]) assert.equal(normalizeConnection({ ...connection, ...changed }), null);
  assert.equal(normalizeConnection(null), null);
});
