import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import { conversationIdFor, conversationParticipants, mergeMessagePages, MESSAGE_MAX_LENGTH, MESSAGE_PAGE_SIZE, messageText, MessagingError, normalizeConversation, normalizeMessage, safeMessagingError } from '../src/community/messagingLogic.ts';

const at = '2026-10-08T12:00:00.000Z';
const id = '0123456789abcdefghij';
const conversation = { id: 'alice:bob', participantIds: ['alice', 'bob'], createdAt: at };
const message = { id, senderId: 'alice', text: '¿Jugamos el sábado?\nA las 18:00.', createdAt: at };

test('chat usa un único ID canónico por par y evita colisiones entre UID con guiones bajos', () => {
  assert.equal(conversationIdFor('bob', 'alice'), 'alice:bob');
  assert.equal(conversationIdFor('alice', 'bob'), 'alice:bob');
  assert.notEqual(conversationIdFor('alice_bob', 'carol'), conversationIdFor('alice', 'bob_carol'));
  assert.deepEqual(conversationParticipants('alice:bob'), ['alice', 'bob']);
  for (const value of ['', 'alice:alice', 'bob:alice', 'alice:bob:carol', 'alice/bob', 'alice:../bob', 'alice:bob?token=secret', 'alice:bób', null]) assert.equal(conversationParticipants(value), null);
  for (const peer of ['alice', '../bob', 'bob:carol', '', 'a'.repeat(129)]) assert.throws(() => conversationIdFor('alice', peer), MessagingError);
});

test('mensajes conservan saltos, normalizan CRLF y rechazan vacíos, controles y exceso', () => {
  assert.equal(MESSAGE_MAX_LENGTH, 2000);
  assert.equal(MESSAGE_PAGE_SIZE, 40);
  assert.equal(messageText('  Hola\r\n¿Jugamos?  '), 'Hola\n¿Jugamos?');
  assert.equal(messageText('a'.repeat(2000)).length, 2000);
  for (const value of ['', ' \n\t ', 'a'.repeat(2001), 'hola\u0000', 'hola\u0007', null, 42]) assert.throws(() => messageText(value), error => error instanceof MessagingError && error.code === 'invalid-text');
  assert.equal(messageText('<script>alert(1)</script>'), '<script>alert(1)</script>');
});

test('normalización sólo publica campos de conversación y acepta Timestamp de servidor', () => {
  assert.deepEqual(normalizeConversation({ ...conversation, createdAt: Timestamp.fromDate(new Date(at)), secret: 'email@private.test', lastText: 'privado' }, 'alice:bob'), conversation);
  for (const overrides of [{ id: 'bob:alice' }, { participantIds: ['alice', 'carol'] }, { participantIds: ['bob', 'alice'] }, { participantIds: ['alice', 'bob', 'carol'] }, { createdAt: '2026-02-30T12:00:00.000Z' }]) assert.equal(normalizeConversation({ ...conversation, ...overrides }, 'alice:bob'), null);
});

test('mensaje normalizado deriva conversación y excluye datos extra, ajenos o pendientes', () => {
  const result = normalizeMessage({ ...message, createdAt: Timestamp.fromDate(new Date(at)), email: 'private@example.test', attachments: ['https://external.test'] }, id, 'alice:bob');
  assert.deepEqual(result, { ...message, conversationId: 'alice:bob', deleted: false });
  for (const overrides of [{ id: 'another' }, { senderId: 'carol' }, { createdAt: null }, { createdAt: 'invalid' }, { text: '' }, { text: ' invalid margins ' }, { text: 'a'.repeat(2001) }]) assert.equal(normalizeMessage({ ...message, ...overrides }, id, 'alice:bob'), null);
  assert.equal(normalizeMessage(message, '../message', 'alice:bob'), null);
});

test('páginas tienen orden cronológico estable, desempate por ID y sin duplicados', () => {
  const first = normalizeMessage(message, id, 'alice:bob')!;
  const second = { ...first, id: 'zzzzzzzzzzzzzzzzzzzz', text: 'Segundo' };
  const third = { ...first, id: 'yyyyyyyyyyyyyyyyyyyy', text: 'Último', createdAt: '2026-10-08T12:01:00.000Z' };
  assert.deepEqual(mergeMessagePages([third, second], [first, second]), [first, second, third]);
  assert.deepEqual(mergeMessagePages([first], [{ ...first, text: 'Actualizado' }]), [{ ...first, text: 'Actualizado' }]);
});

test('errores de permisos nunca revelan mensajes, emails o información de terceros', () => {
  const generic = safeMessagingError(new MessagingError('unavailable'));
  assert.equal(safeMessagingError(new Error('permission-denied: alice:bob, text=privado, email=private@example.test')), generic);
  assert.equal(safeMessagingError({ code: 'permission-denied', message: 'private' }), generic);
  assert.match(safeMessagingError(new MessagingError('invalid-text')), /2000/);
  assert.match(safeMessagingError(new MessagingError('offline')), /Internet/);
});
