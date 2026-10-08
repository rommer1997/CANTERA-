import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, startAfter, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';

const projectId = `${process.env.GCLOUD_PROJECT || 'demo-cantera'}-messaging`;
if (!projectId.startsWith('demo-') || !process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Ejecuta sólo dentro de Firebase Emulator Suite con un proyecto demo-.');
const at = () => serverTimestamp();
const terms = '2026-10-08';
const pair = 'alice:bob';
const messageId = '0123456789abcdefghij';
let env;
const client = (uid, verified = true, admin = false) => uid ? env.authenticatedContext(uid, { email_verified: verified, admin }).firestore() : env.unauthenticatedContext().firestore();
const conversation = (id = pair) => ({ id, participantIds: id.split(':'), createdAt: at() });
const message = (uid = 'alice', overrides = {}) => ({ id: messageId, senderId: uid, text: '¿Jugamos el sábado?', createdAt: at(), ...overrides });
async function seed(path, value) { await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), path), value)); }
async function connect(first = 'alice', second = 'bob') {
  await seed(`communityConnections/${first}/members/${second}`, { ownerId: first, peerId: second, inviteId: '23456789ABCDEFGH', createdAt: at() });
  await seed(`communityConnections/${second}/members/${first}`, { ownerId: second, peerId: first, inviteId: '23456789ABCDEFGH', createdAt: at() });
}
async function setupThread() { await connect(); await assertSucceeds(setDoc(doc(client('alice'), 'communityConversations', pair), conversation())); await assertSucceeds(setDoc(doc(client('alice'), 'communityConversations', pair, 'messages', messageId), message())); }
function block(blocker, blocked) {
  const db = client(blocker); const batch = writeBatch(db);
  batch.set(doc(db, 'communityBlocks', `${blocker}_${blocked}`), { ownerId: blocker, blockedId: blocked, createdAt: at() });
  batch.delete(doc(db, 'communityConnections', blocker, 'members', blocked));
  batch.delete(doc(db, 'communityConnections', blocked, 'members', blocker));
  return batch.commit();
}

before(async () => { env = await initializeTestEnvironment({ projectId, firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') } }); });
beforeEach(async () => {
  await env.clearFirestore();
  await seed('communityConfiguration/runtime', { serviceStatus: 'open', mediaUploadsEnabled: false, contactEmail: '', updatedAt: at() });
  for (const uid of ['alice', 'bob', 'carol', 'admin', 'minor', 'outdated']) await seed(`communityProfiles/${uid}`, { id: uid, name: uid, bio: '', city: 'Madrid', country: 'España', position: '', team: '', level: 'amateur', adultConfirmed: uid !== 'minor', verification: 'unverified', entityType: 'individual', createdAt: at(), acceptedTermsVersion: uid === 'outdated' ? '2026-10-06' : terms, acceptedTermsAt: at() });
});
after(async () => { await env?.cleanup(); });

test('chat privado real permite sólo ambos contactos verificados y no tiene bypass administrador', async () => {
  await setupThread();
  for (const uid of ['alice', 'bob']) {
    await assertSucceeds(getDoc(doc(client(uid), 'communityConversations', pair)));
    assert.equal((await assertSucceeds(getDocs(query(collection(client(uid), 'communityConversations', pair, 'messages'), orderBy('createdAt', 'desc'), limit(40))))).size, 1);
  }
  for (const db of [client(), client('carol'), client('admin', true, true), client('bob', false)]) {
    await assertFails(getDoc(doc(db, 'communityConversations', pair)));
    await assertFails(getDoc(doc(db, 'communityConversations', pair, 'messages', messageId)));
  }
});

test('no permite directorios globales, consultas sin límite ni acceso a mensajes por collectionGroup', async () => {
  await setupThread(); const db = client('alice');
  await assertFails(getDocs(collection(db, 'communityConversations')));
  await assertFails(getDocs(query(collection(db, 'communityConversations'), where('participantIds', 'array-contains', 'alice'))));
  await assertFails(getDocs(collection(db, 'communityConversations', pair, 'messages')));
  await assertFails(getDocs(query(collection(db, 'communityConversations', pair, 'messages'), limit(41))));
  await assertFails(getDocs(query(collectionGroup(db, 'messages'), where('senderId', '==', 'alice'), limit(40))));
});

test('contactos recíprocos actuales, identidad y ruta canónica son obligatorios al iniciar', async () => {
  const alice = client('alice');
  await assertFails(setDoc(doc(alice, 'communityConversations', pair), conversation()));
  await seed('communityConnections/alice/members/bob', { ownerId: 'alice', peerId: 'bob', inviteId: '23456789ABCDEFGH', createdAt: at() });
  await assertFails(setDoc(doc(alice, 'communityConversations', pair), conversation()));
  await connect();
  await assertFails(setDoc(doc(client('carol'), 'communityConversations', pair), conversation()));
  await assertFails(setDoc(doc(alice, 'communityConversations', 'bob:alice'), conversation('bob:alice')));
  await assertFails(setDoc(doc(alice, 'communityConversations', pair), { ...conversation(), participantIds: ['alice', 'carol'] }));
  await assertFails(setDoc(doc(alice, 'communityConversations', pair), { ...conversation(), lastText: 'No almacenar vistas previas' }));
  await assertSucceeds(getDoc(doc(alice, 'communityConversations', pair)));
  await assertSucceeds(setDoc(doc(alice, 'communityConversations', pair), conversation()));
  await assertFails(updateDoc(doc(alice, 'communityConversations', pair), { participantIds: ['alice', 'carol'] }));
});

test('autor, timestamp de servidor, límite de texto y ausencia de archivos se comprueban en reglas', async () => {
  await connect(); await seed(`communityConversations/${pair}`, conversation());
  const target = doc(client('alice'), 'communityConversations', pair, 'messages', messageId);
  for (const overrides of [{ senderId: 'bob' }, { id: 'different' }, { text: '' }, { text: 'a'.repeat(2001) }, { createdAt: Timestamp.fromMillis(1) }, { attachments: ['https://external.test'] }]) await assertFails(setDoc(target, message('alice', overrides)));
  await assertSucceeds(setDoc(target, message('alice', { text: 'a'.repeat(2000) })));
  await assertFails(updateDoc(target, { text: 'Modificado' }));
  await assertFails(deleteDoc(doc(client('bob'), 'communityConversations', pair, 'messages', messageId)));
});

test('bloquear en cualquier dirección revoca lectura, listener y envío sin revelar motivos privados', async () => {
  await setupThread();
  for (const blocker of ['alice', 'bob']) {
    const blocked = blocker === 'alice' ? 'bob' : 'alice';
    await assertFails(setDoc(doc(client(blocker), 'communityBlocks', `${blocker}_${blocked}`), { ownerId: blocker, blockedId: blocked, createdAt: at() }));
    await assertSucceeds(block(blocker, blocked));
    for (const uid of ['alice', 'bob']) {
      await assertFails(getDoc(doc(client(uid), 'communityConversations', pair, 'messages', messageId)));
      await assertFails(setDoc(doc(client(uid), 'communityConversations', pair, 'messages', 'abcdefghij0123456789'), message(uid, { id: 'abcdefghij0123456789' })));
    }
    await assertSucceeds(deleteDoc(doc(client(blocker), 'communityBlocks', `${blocker}_${blocked}`)));
    assert.equal((await getDoc(doc(client(blocked), 'communityConnections', blocked, 'members', blocker))).exists(), false);
    await assertFails(getDoc(doc(client(blocked), 'communityConversations', pair)));
    await connect();
  }
  await assertSucceeds(deleteDoc(doc(client('alice'), 'communityConversations', pair, 'messages', messageId)));
});

test('retirar conexión corta historial y envío; cada autor puede retirar sus propios textos', async () => {
  await setupThread(); const alice = client('alice');
  const withdrawal = writeBatch(alice);
  withdrawal.delete(doc(alice, 'communityConnections/alice/members/bob'));
  withdrawal.delete(doc(alice, 'communityConnections/bob/members/alice'));
  await assertSucceeds(withdrawal.commit());
  await assertFails(getDoc(doc(alice, 'communityConversations', pair, 'messages', messageId)));
  await assertFails(getDoc(doc(client('bob'), 'communityConversations', pair)));
  await assertSucceeds(deleteDoc(doc(alice, 'communityConversations', pair, 'messages', messageId)));
});

test('pausa, suspensión de cualquiera, mayoría de edad y términos actuales protegen chat', async () => {
  await setupThread();
  for (const uid of ['alice', 'bob']) {
    await seed(`communityAccountModeration/${uid}`, { status: 'suspended', reason: 'Prueba', updatedAt: at() });
    await assertFails(getDoc(doc(client('alice'), 'communityConversations', pair)));
    await assertFails(getDoc(doc(client('bob'), 'communityConversations', pair, 'messages', messageId)));
    await seed(`communityAccountModeration/${uid}`, { status: 'active', reason: 'Prueba', updatedAt: at() });
  }
  // Both moderation documents now exist. This exercises the maximum distinct
  // dependency budget, rather than only the cheaper missing-record branch.
  await assertSucceeds(getDoc(doc(client('alice'), 'communityConversations', pair, 'messages', messageId)));
  await assertSucceeds(setDoc(doc(client('bob'), 'communityConversations', pair, 'messages', 'abcdefghij0123456789'), message('bob', { id: 'abcdefghij0123456789' })));
  for (const uid of ['minor', 'outdated']) {
    await connect('alice', uid); const id = `alice:${uid}`;
    await assertFails(setDoc(doc(client('alice'), 'communityConversations', id), conversation(id)));
    await assertFails(setDoc(doc(client(uid), 'communityConversations', id), conversation(id)));
  }
  await seed('communityConfiguration/runtime', { serviceStatus: 'paused', mediaUploadsEnabled: false, contactEmail: '', updatedAt: at() });
  await assertFails(getDoc(doc(client('alice'), 'communityConversations', pair)));
  await assertSucceeds(deleteDoc(doc(client('alice'), 'communityConversations', pair, 'messages', messageId)));
});

test('paginación de cuarenta mensajes desempata timestamp y no repite ni pierde documentos', async () => {
  await connect(); await seed(`communityConversations/${pair}`, conversation());
  await env.withSecurityRulesDisabled(async context => {
    const batch = writeBatch(context.firestore());
    for (let index = 0; index < 45; index++) {
      const id = String(index).padStart(20, '0');
      batch.set(doc(context.firestore(), 'communityConversations', pair, 'messages', id), message(index % 2 ? 'alice' : 'bob', { id, createdAt: Timestamp.fromMillis(1700000000000) }));
    }
    await batch.commit();
  });
  const messages = collection(client('bob'), 'communityConversations', pair, 'messages');
  const first = await assertSucceeds(getDocs(query(messages, orderBy('createdAt', 'desc'), orderBy('__name__', 'desc'), limit(40))));
  const older = await assertSucceeds(getDocs(query(messages, orderBy('createdAt', 'desc'), orderBy('__name__', 'desc'), startAfter(first.docs.at(-1)), limit(40))));
  assert.equal(first.size, 40); assert.equal(older.size, 5);
  assert.equal(new Set([...first.docs, ...older.docs].map(record => record.id)).size, 45);
});

test('bloqueo remoto retira ambos contactos en vivo sin exponer el documento privado de bloqueo', async () => {
  await setupThread();
  let resolveFirst;
  let resolveRemoved;
  const first = new Promise(resolve => { resolveFirst = resolve; });
  const removed = new Promise(resolve => { resolveRemoved = resolve; });
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('La lista propia de contactos no reflejó la retirada.')), 6000); });
  const stop = onSnapshot(collection(client('alice'), 'communityConnections/alice/members'), snapshot => { if (snapshot.size) resolveFirst(snapshot.size); else resolveRemoved(snapshot.size); });
  try {
    assert.equal(await Promise.race([first, timeout]), 1);
    await assertSucceeds(block('bob', 'alice'));
    assert.equal(await Promise.race([removed, timeout]), 0);
    await assertFails(getDoc(doc(client('alice'), 'communityBlocks/bob_alice')));
    await assertFails(getDoc(doc(client('alice'), 'communityConversations', pair, 'messages', messageId)));
  } finally { clearTimeout(timer); stop(); }
});

test('bloquear cuentas sin conexión funciona y la carrera con una nueva invitación no restaura contacto bloqueado', async () => {
  await assertSucceeds(block('alice', 'carol'));
  await seed('communityInvitations/23456789ABCDEFGH', { id: '23456789ABCDEFGH', kind: 'connection', eventId: '', ownerId: 'alice', status: 'active', createdAt: at(), usedBy: '', usedAt: '' });
  const bob = client('bob'); const admission = writeBatch(bob);
  admission.set(doc(bob, 'communityConnections/alice/members/bob'), { ownerId: 'alice', peerId: 'bob', inviteId: '23456789ABCDEFGH', createdAt: at() });
  admission.set(doc(bob, 'communityConnections/bob/members/alice'), { ownerId: 'bob', peerId: 'alice', inviteId: '23456789ABCDEFGH', createdAt: at() });
  admission.update(doc(bob, 'communityInvitations/23456789ABCDEFGH'), { status: 'used', usedBy: 'bob', usedAt: at() });
  const [blocked] = await Promise.allSettled([block('alice', 'bob'), admission.commit()]);
  assert.equal(blocked.status, 'fulfilled');
  assert.equal((await getDoc(doc(client('alice'), 'communityConnections/alice/members/bob'))).exists(), false);
  assert.equal((await getDoc(doc(bob, 'communityConnections/bob/members/alice'))).exists(), false);
  await assertFails(setDoc(doc(bob, 'communityConversations', pair), conversation()));
});
