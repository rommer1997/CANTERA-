import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  acceptDemoConnection, commitDemoEventInvitation, createDemoInvitation, readInvitationDemo,
  removeDemoConnection, revokeDemoInvitation, writeInvitationDemo,
} from '../src/community/invitationDemo.ts';
import { InvitationError, safeInvitationError } from '../src/community/invitations.ts';
import type { CommunityInvitation, InvitationErrorCode } from '../src/community/invitationTypes.ts';

const key = 'cantera-invitations-v1';
const code = 'DME2M8Z4PFA6GF89';
const otherCode = '2222333344445555';
const at = '2026-10-07T12:00:00.000Z';
const epoch = Date.parse(at);
const actor = { userId: 'bob', emailVerified: true, now: epoch + 1000 };
const active: CommunityInvitation = { id: code, ownerId: 'alice', kind: 'connection', eventId: '', status: 'active', createdAt: at, usedBy: '', usedAt: '' };

class MemoryStorage {
  values = new Map<string, string>();
  writes = 0;
  failWrites = false;
  getItem(name: string) { return this.values.get(name) ?? null; }
  setItem(name: string, value: string) {
    if (this.failWrites) throw new Error('quota: private@example.test');
    this.writes++;
    this.values.set(name, String(value));
  }
}
let storage: MemoryStorage;
let received: Event[];
let storageDescriptor: PropertyDescriptor | undefined;
let windowDescriptor: PropertyDescriptor | undefined;
beforeEach(() => {
  storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  storage = new MemoryStorage(); received = [];
  const target = new EventTarget();
  target.addEventListener('cantera-invitations-updated', event => received.push(event));
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: target });
});
afterEach(() => {
  if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor); else Reflect.deleteProperty(globalThis, 'localStorage');
  if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor); else Reflect.deleteProperty(globalThis, 'window');
});
function throwsCode(action: () => unknown, expected: InvitationErrorCode): void {
  assert.throws(action, error => error instanceof InvitationError && error.code === expected);
}
function seed(invite: CommunityInvitation = active) {
  writeInvitationDemo({ invitations: [invite], connections: [] });
  storage.writes = 0; received = [];
}

test('almacén separado recupera JSON corrupto y elimina registros inválidos y metadatos privados', () => {
  assert.deepEqual(readInvitationDemo(), { invitations: [], connections: [] });
  storage.values.set(key, '{broken');
  assert.deepEqual(readInvitationDemo(), { invitations: [], connections: [] });
  storage.values.set(key, 'null');
  assert.deepEqual(readInvitationDemo(), { invitations: [], connections: [] });
  const connection = { ownerId: 'alice', peerId: 'bob', inviteId: code, createdAt: at };
  storage.values.set(key, JSON.stringify({ invitations: [{ ...active, ownerEmail: 'private@example.test' }, active, { ...active, id: '../broken' }], connections: [{ ...connection, email: 'private@example.test' }, connection, { ...connection, peerId: 'alice' }], events: ['private-event'] }));
  assert.deepEqual(readInvitationDemo(), { invitations: [active], connections: [connection] });
  assert.equal(storage.writes, 0);
});

test('escritura conjunta normaliza, emite una notificación sin contenido y no toca la comunidad', () => {
  storage.values.set('cantera-community-v1', '{"profile":"untouched"}');
  writeInvitationDemo({ invitations: [active], connections: [] });
  assert.equal(storage.writes, 1);
  assert.equal(received.length, 1);
  assert.equal(received[0].type, 'cantera-invitations-updated');
  assert.equal('detail' in received[0], false);
  assert.equal(storage.getItem('cantera-community-v1'), '{"profile":"untouched"}');
  assert.deepEqual(readInvitationDemo(), { invitations: [active], connections: [] });
});

test('creación valida propietario y destino, devuelve un código activo y no inventa contactos', () => {
  const invite = createDemoInvitation('alice', 'connection', '');
  assert.match(invite.id, /^[2-9A-HJ-NP-Z]{16}$/);
  assert.equal(invite.ownerId, 'alice'); assert.equal(invite.kind, 'connection'); assert.equal(invite.status, 'active');
  assert.equal(invite.usedBy, ''); assert.equal(invite.usedAt, '');
  const event = createDemoInvitation('alice', 'event', 'private-event');
  assert.equal(event.eventId, 'private-event');
  assert.equal(readInvitationDemo().invitations.length, 2);
  assert.deepEqual(readInvitationDemo().connections, []);
  const previous = storage.getItem(key);
  for (const call of [() => createDemoInvitation('__proto__', 'connection'), () => createDemoInvitation('alice', 'connection', 'private-event'), () => createDemoInvitation('alice', 'event', ''), () => createDemoInvitation('alice', 'event', '../private')]) throwsCode(call, 'unavailable');
  assert.equal(storage.getItem(key), previous);
});

test('cancelación pertenece al creador y no convierte un código usado en reutilizable', () => {
  seed();
  throwsCode(() => revokeDemoInvitation(code, 'mallory'), 'unavailable');
  assert.equal(storage.writes, 0);
  const revoked = revokeDemoInvitation('DME2 M8Z4 PFA6 GF89', 'alice');
  assert.equal(revoked.status, 'revoked'); assert.equal(storage.writes, 1);
  assert.equal(revokeDemoInvitation(code, 'alice').status, 'revoked');
  assert.equal(storage.writes, 1);
  throwsCode(() => acceptDemoConnection(code, actor), 'unavailable');
  seed({ ...active, status: 'used', usedBy: 'bob', usedAt: at });
  throwsCode(() => revokeDemoInvitation(code, 'alice'), 'unavailable');
  assert.equal(storage.writes, 0);
});

test('aceptar una conexión consume una vez y guarda ambos extremos en una sola escritura', () => {
  seed();
  const used = acceptDemoConnection('dme2-m8z4-pfa6-gf89', actor);
  assert.equal(used.status, 'used'); assert.equal(used.usedBy, 'bob'); assert.equal(used.usedAt, '2026-10-07T12:00:01.000Z');
  assert.equal(storage.writes, 1); assert.equal(received.length, 1);
  assert.deepEqual(readInvitationDemo(), {
    invitations: [used], connections: [
      { ownerId: 'alice', peerId: 'bob', inviteId: code, createdAt: used.usedAt },
      { ownerId: 'bob', peerId: 'alice', inviteId: code, createdAt: used.usedAt },
    ],
  });
  assert.deepEqual(acceptDemoConnection(code, { ...actor, now: epoch + 86400000 }), used);
  assert.equal(storage.writes, 1);
  throwsCode(() => acceptDemoConnection(code, { ...actor, userId: 'carol' }), 'unavailable');
  assert.equal(storage.writes, 1);
});

test('un código usado propio sólo admite reintento mientras existen los dos contactos actuales', () => {
  seed(); acceptDemoConnection(code, actor);
  const used = readInvitationDemo();
  writeInvitationDemo({ ...used, connections: used.connections.slice(0, 1) });
  const previous = storage.getItem(key); storage.writes = 0;
  throwsCode(() => acceptDemoConnection(code, actor), 'unavailable');
  assert.equal(storage.getItem(key), previous); assert.equal(storage.writes, 0);
  writeInvitationDemo({ ...used, connections: [] });
  throwsCode(() => acceptDemoConnection(code, actor), 'unavailable');
});

test('conexión existente o incompleta no se sobrescribe ni consume otro código', () => {
  const edge = { ownerId: 'alice', peerId: 'bob', inviteId: otherCode, createdAt: at };
  for (const connections of [[edge], [edge, { ...edge, ownerId: 'bob', peerId: 'alice' }]]) {
    writeInvitationDemo({ invitations: [active], connections });
    const previous = storage.getItem(key); storage.writes = 0;
    throwsCode(() => acceptDemoConnection(code, actor), 'unavailable');
    assert.equal(storage.getItem(key), previous); assert.equal(storage.writes, 0);
  }
});

test('auto conexión, correo sin verificar y caducidad no escriben y muestran errores seguros', () => {
  seed();
  throwsCode(() => acceptDemoConnection(code, { ...actor, userId: 'alice' }), 'self-invitation');
  throwsCode(() => acceptDemoConnection(code, { ...actor, userId: '' }), 'signin-required');
  throwsCode(() => acceptDemoConnection(code, { ...actor, emailVerified: false }), 'email-verification-required');
  throwsCode(() => acceptDemoConnection(code, { ...actor, now: epoch + 600000 }), 'unavailable');
  throwsCode(() => acceptDemoConnection('invalid', actor), 'invalid-code');
  throwsCode(() => acceptDemoConnection(otherCode, actor), 'unavailable');
  assert.equal(storage.writes, 0); assert.equal(received.length, 0);
  assert.equal(safeInvitationError(new Error('private-event / private@example.test')), safeInvitationError(new InvitationError('unavailable')));
});

test('fallo de almacenamiento conserva código y ambos contactos sin notificación de éxito', () => {
  seed();
  const previous = storage.getItem(key); storage.failWrites = true;
  throwsCode(() => acceptDemoConnection(code, actor), 'unavailable');
  assert.equal(storage.getItem(key), previous); assert.equal(storage.writes, 0); assert.equal(received.length, 0);
  assert.equal(readInvitationDemo().invitations[0].status, 'active');
  assert.deepEqual(readInvitationDemo().connections, []);
});

test('retirar contacto borra ambos extremos sin reactivar su invitación y conserva otras personas', () => {
  seed(); acceptDemoConnection(code, actor);
  const data = readInvitationDemo();
  const other = { ownerId: 'alice_bob', peerId: 'carol', inviteId: otherCode, createdAt: at };
  writeInvitationDemo({ ...data, connections: [...data.connections, other, { ...other, ownerId: 'carol', peerId: 'alice_bob' }] });
  storage.writes = 0;
  removeDemoConnection('bob', 'alice');
  assert.equal(storage.writes, 1);
  assert.deepEqual(readInvitationDemo().connections, [other, { ...other, ownerId: 'carol', peerId: 'alice_bob' }]);
  assert.equal(readInvitationDemo().invitations[0].status, 'used');
  throwsCode(() => acceptDemoConnection(code, actor), 'unavailable');
  removeDemoConnection('alice', 'bob');
  assert.equal(storage.writes, 1);
  throwsCode(() => removeDemoConnection('alice', 'alice'), 'unavailable');
});

test('evento privado se valida y confirma en callback síncrono antes de consumir el código', () => {
  const eventInvite = { ...active, kind: 'event' as const, eventId: 'private-event' };
  seed(eventInvite);
  let callbackCalls = 0;
  const used = commitDemoEventInvitation(code, actor, current => {
    callbackCalls++;
    assert.deepEqual(current, eventInvite);
    assert.equal(readInvitationDemo().invitations[0].status, 'active');
    storage.values.set('cantera-community-v1', '{"participant":"bob"}');
  });
  assert.equal(callbackCalls, 1); assert.equal(used.status, 'used'); assert.equal(storage.writes, 1);
  assert.equal(storage.getItem('cantera-community-v1'), '{"participant":"bob"}');
  assert.deepEqual(readInvitationDemo().connections, []);
  assert.deepEqual(commitDemoEventInvitation(code, actor, () => { callbackCalls++; }), used);
  assert.equal(callbackCalls, 1); assert.equal(storage.writes, 1);
  throwsCode(() => commitDemoEventInvitation(code, { ...actor, userId: 'carol' }, () => { callbackCalls++; }), 'unavailable');
  assert.equal(callbackCalls, 1);
});

test('callback fallido o asíncrono no consume el código de un evento', () => {
  seed({ ...active, kind: 'event', eventId: 'private-event' });
  const failure = new Error('El evento está completo.');
  assert.throws(() => commitDemoEventInvitation(code, actor, () => { throw failure; }), error => error === failure);
  assert.equal(readInvitationDemo().invitations[0].status, 'active'); assert.equal(storage.writes, 0);
  throwsCode(() => commitDemoEventInvitation(code, actor, () => Promise.resolve()), 'unavailable');
  assert.equal(readInvitationDemo().invitations[0].status, 'active'); assert.equal(storage.writes, 0);
  let called = false;
  throwsCode(() => commitDemoEventInvitation(code, { ...actor, emailVerified: false }, () => { called = true; }), 'email-verification-required');
  throwsCode(() => commitDemoEventInvitation(code, { ...actor, now: epoch + 600000 }, () => { called = true; }), 'unavailable');
  assert.equal(called, false);
});

test('callback no puede reutilizar invitación de conexión y una revocación reentrante se conserva', () => {
  seed();
  let called = false;
  throwsCode(() => commitDemoEventInvitation(code, actor, () => { called = true; }), 'unavailable');
  assert.equal(called, false);
  seed({ ...active, kind: 'event', eventId: 'private-event' });
  throwsCode(() => commitDemoEventInvitation(code, actor, () => { revokeDemoInvitation(code, 'alice'); }), 'unavailable');
  assert.equal(readInvitationDemo().invitations[0].status, 'revoked');
});

test('callback conserva altas locales no relacionadas y no concede contactos al aceptar evento', () => {
  seed({ ...active, kind: 'event', eventId: 'private-event' });
  const extra = { ...active, id: otherCode, ownerId: 'carol' };
  commitDemoEventInvitation(code, actor, () => {
    const current = readInvitationDemo();
    writeInvitationDemo({ ...current, invitations: [...current.invitations, extra] });
  });
  assert.deepEqual(readInvitationDemo().invitations.map(item => [item.id, item.status]), [[code, 'used'], [otherCode, 'active']]);
  assert.deepEqual(readInvitationDemo().connections, []);
});
