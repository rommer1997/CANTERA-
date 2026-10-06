import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase/app';
import { collection, serverTimestamp, Timestamp, connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, runTransaction, setDoc, updateDoc, where, getCountFromServer, writeBatch } from 'firebase/firestore';
import { makeFixtures } from '../src/community/logic.ts';
import { fixtureFields } from '../src/community/fixtureRecords.ts';
import { commitDeliveryBatches } from '../src/community/deliveryBatches.ts';
import { deleteObject, getMetadata, listAll, ref, updateMetadata, uploadBytes } from 'firebase/storage';

// Never run these tests against cloud services or production project identifiers.
const projectId = process.env.GCLOUD_PROJECT || 'demo-cantera-security';
if (!projectId.startsWith('demo-') || !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  throw new Error('Ejecuta con firebase emulators:exec --project demo-cantera-security --only firestore,storage "node --test tests/security.test.mjs".');
}
const DATABASE_ID = 'ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb';
const TERMS_VERSION = '2026-10-06';
const stamp = () => serverTimestamp();
const profile = (id, overrides = {}) => ({ id, name: id, bio: '', city: 'Madrid', country: 'España', position: 'Centro', team: 'Cantera', level: 'amateur', adultConfirmed: true, verification: 'unverified', entityType: 'individual', createdAt: stamp(), acceptedTermsVersion: TERMS_VERSION, acceptedTermsAt: stamp(), ...overrides });
const publicProfile = data => { const { adultConfirmed, acceptedTermsAt, acceptedTermsVersion, ...sports } = data; return sports; };
async function writeProfile(client, value) {
  const target = doc(client, 'communityProfiles', value.id); const current = await getDoc(target);
  const next = current.exists() ? { ...value, createdAt: current.data().createdAt } : value;
  const batch = writeBatch(client); batch.set(target, next);
  if (next.adultConfirmed && next.acceptedTermsVersion === TERMS_VERSION) batch.set(doc(client, 'communityPublicProfiles', next.id), publicProfile(next));
  return batch.commit();
}
const event = (id = 'event', overrides = {}) => {
  const startAtMs = Date.now() + 86400000;
  return { id, ownerId: 'alice', ownerName: 'alice', title: 'Partido de la comunidad', type: 'match', format: '7', level: 'amateur', city: 'Madrid', country: 'España', timeZone: 'Europe/Madrid', venue: 'Campo municipal', startAt: new Date(startAtMs).toISOString(), startAtMs, capacity: 4, entry: 'players', description: 'Jugamos juntos.', status: 'open', tournamentFormat: 'league', participants: {}, fixtures: [], createdAt: stamp(), ...overrides };
};
const post = (id = 'post', overrides = {}) => ({ id, authorId: 'alice', authorName: 'alice', kind: 'achievement', text: 'El primer gol con mi equipo.', title: 'Un paso más', mediaUrl: '', mediaPath: '', createdAt: stamp(), eventId: '', ...overrides });
const verification = (uid = 'alice', overrides = {}) => ({ id: uid, userId: uid, name: uid, organization: 'Club Cantera', evidence: 'Contactar a la dirección deportiva para comprobar mi relación.', status: 'pending', createdAt: stamp(), reviewedAt: '', ...overrides });
const fixture = { id: 'r1-1', round: 1, homeId: 'alice', awayId: 'bob', homeScore: null, awayScore: null };
let env;
const context = uid => uid ? env.authenticatedContext(uid, uid === 'admin' ? { admin: true } : {}) : env.unauthenticatedContext();
const db = uid => context(uid).firestore();
const media = uid => context(uid).storage();
async function seed(path, value) { await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), path), value)); }

async function ownerUpdate(target, changes, summary = 'El organizador modifica el encuentro.') {
  return runTransaction(target.firestore, async tx => {
    const current = (await tx.get(target)).data(); const revision = (current.revision || 0) + 1;
    tx.update(target, { ...changes, revision, updatedAt: stamp() });
    tx.set(doc(target.firestore, 'communityEventChanges', `${target.id}_${revision}`), { id: `${target.id}_${revision}`, eventId: target.id, ownerId: current.ownerId, revision, summary, title: changes.title || current.title, audienceIds: [...new Set([current.ownerId, ...Object.keys(current.participants), ...Object.keys(changes.participants || current.participants), ...Object.keys(current.waitlist || {}), ...Object.keys(changes.waitlist || current.waitlist || {})])], createdAt: stamp() });
  });
}

before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') }, storage: { rules: readFileSync(new URL('../storage.rules', import.meta.url), 'utf8') } });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async ctx => {
    const firestore = ctx.firestore();
    await setDoc(doc(firestore, 'communityConfiguration/runtime'), { serviceStatus: 'open', mediaUploadsEnabled: false, contactEmail: '', updatedAt: stamp() });
    await Promise.all(['alice', 'bob', 'carol', 'admin'].map(uid => writeProfile(firestore, profile(uid))));
    await setDoc(doc(firestore, 'communityProfiles', 'inactive'), profile('inactive', { acceptedTermsVersion: '', acceptedTermsAt: '' }));
    await setDoc(doc(firestore, 'communityProfiles', 'minor'), profile('minor', { adultConfirmed: false }));
  });
});
after(async () => { await env?.cleanup(); });

describe('Identidad, consentimiento y datos privados', { concurrency: false }, () => {
  test('perfil deportivo, eventos y publicaciones son públicos; visitante no escribe', async () => {
    await seed('communityEvents/event', event('event', { participants: { alice: 'alice', bob: 'bob' } }));
    await seed('communityPosts/post', post());
    const guest = db();
    await assertSucceeds(getDoc(doc(guest, 'communityPublicProfiles/alice')));
    await assertFails(getDoc(doc(guest, 'communityProfiles/alice')));
    await assertFails(getDoc(doc(db('bob'), 'communityProfiles/alice')));
    await assertSucceeds(getDoc(doc(db('alice'), 'communityProfiles/alice')));
    await assertSucceeds(getDoc(doc(guest, 'communityEvents/event')));
    await assertSucceeds(getDocs(query(collection(guest, 'communityPosts'), orderBy('createdAt', 'desc'), limit(100))));
    await assertFails(setDoc(doc(guest, 'communityProfiles/visitor'), profile('visitor')));
    await assertFails(setDoc(doc(guest, 'communityEvents/new'), event('new')));
    await assertFails(setDoc(doc(guest, 'communityPosts/new'), post('new')));
  });

  test('perfil propio admite alta y edición; niega suplantación, roles, datos privados y auto-verificación', async () => {
    const alice = db('alice');
    const newcomer = db('newcomer');
    await assertSucceeds(setDoc(doc(newcomer, 'communityProfiles/newcomer'), profile('newcomer', { adultConfirmed: false, acceptedTermsVersion: '', acceptedTermsAt: '' })));
    await assertSucceeds(writeProfile(alice, profile('alice', { name: 'Alicia', bio: 'Jugador amateur.' })));
    await assertFails(updateDoc(doc(alice, 'communityProfiles/bob'), { bio: 'Suplantado' }));
    await assertFails(updateDoc(doc(alice, 'communityProfiles/alice'), { verification: 'verified' }));
    await assertFails(updateDoc(doc(alice, 'communityProfiles/alice'), { role: 'ADMIN' }));
    await assertFails(updateDoc(doc(alice, 'communityProfiles/alice'), { email: 'private@example.test' }));
    await assertFails(updateDoc(doc(alice, 'communityProfiles/alice'), { id: 'bob' }));
    await assertFails(setDoc(doc(db('new'), 'communityProfiles/new'), profile('new', { verification: 'verified' })));
  });

  test('sin aceptar términos actuales o mayoría de edad se bloquean las escrituras comunitarias', async () => {
    await seed('communityEvents/event', event());
    await seed('communityPosts/post', post());
    for (const uid of ['inactive', 'minor']) {
      const client = db(uid);
      await assertFails(setDoc(doc(client, 'communityEvents', uid), event(uid, { ownerId: uid, ownerName: uid })));
      await assertFails(updateDoc(doc(client, 'communityEvents/event'), { participants: { [uid]: uid } }));
      await assertFails(setDoc(doc(client, 'communityPosts', uid), post(uid, { authorId: uid, authorName: uid })));
      await assertFails(setDoc(doc(client, 'communityLikes', `post_${uid}`), { userId: uid, postId: 'post', createdAt: stamp() }));
      await assertFails(setDoc(doc(client, 'communityComments', uid), { id: uid, authorId: uid, authorName: uid, text: 'Buen partido', postId: 'post', createdAt: stamp() }));
      await assertFails(setDoc(doc(client, 'communityVerifications', uid), verification(uid)));
    }
    await assertSucceeds(writeProfile(db('inactive'), profile('inactive')));
    await assertSucceeds(setDoc(doc(db('inactive'), 'communityPosts/accepted'), post('accepted', { authorId: 'inactive', authorName: 'inactive' })));
  });

  test('usuarios legacy privados, rol inmutable y favoritos propios solamente', async () => {
    const alice = db('alice');
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), { uid: 'alice', role: 'PLAYER', email: 'alice@example.test' }));
    await assertSucceeds(getDoc(doc(alice, 'users/alice')));
    await assertSucceeds(getDoc(doc(db('admin'), 'users/alice')));
    await assertFails(getDoc(doc(db('bob'), 'users/alice')));
    await assertFails(getDoc(doc(db(), 'users/alice')));
    await assertFails(updateDoc(doc(alice, 'users/alice'), { role: 'SCOUT' }));
    await assertFails(updateDoc(doc(alice, 'users/alice'), { uid: 'bob' }));
    await assertSucceeds(updateDoc(doc(alice, 'users/alice'), { displayName: 'Alicia', bio: 'Fútbol' }));
    for (const role of ['SCOUT', 'REFEREE', 'ADMIN']) await assertFails(setDoc(doc(db(role), 'users', role), { uid: role, role }));
    await assertSucceeds(setDoc(doc(alice, 'users/alice/likes/player'), { timestamp: stamp() }));
    await assertFails(setDoc(doc(db('bob'), 'users/alice/likes/other'), { timestamp: stamp() }));
    await assertFails(getDocs(collection(db('bob'), 'users/alice/likes')));
  });
});

describe('Proyección pública y seguimiento', { concurrency: false }, () => {
  test('alta incompleta permanece privada; completar requiere espejo deportivo consistente', async () => {
    const client = db('new-public'); const initial = profile('new-public', { adultConfirmed: false, acceptedTermsVersion: '', acceptedTermsAt: '' });
    await assertSucceeds(setDoc(doc(client, 'communityProfiles/new-public'), initial));
    assert.equal((await getDoc(doc(db(), 'communityPublicProfiles/new-public'))).exists(), false);
    await assertFails(setDoc(doc(client, 'communityPublicProfiles/new-public'), publicProfile(initial)));
    const completed = { ...initial, adultConfirmed: true, acceptedTermsVersion: TERMS_VERSION, acceptedTermsAt: stamp() };
    await assertFails(setDoc(doc(client, 'communityProfiles/new-public'), completed));
    await assertSucceeds(writeProfile(client, completed));
    const sports = (await getDoc(doc(db(), 'communityPublicProfiles/new-public'))).data();
    assert.deepEqual(Object.keys(sports).sort(), Object.keys(publicProfile(completed)).sort());
    assert.equal('acceptedTermsAt' in sports, false); assert.equal('adultConfirmed' in sports, false);
  });

  test('proyección no admite nombre divergente, información privada ni verificaciones inventadas', async () => {
    const client = db('alice'); const sports = (await getDoc(doc(client, 'communityPublicProfiles/alice'))).data();
    await assertFails(setDoc(doc(client, 'communityPublicProfiles/alice'), { ...sports, name: 'Otra identidad' }));
    await assertFails(setDoc(doc(client, 'communityPublicProfiles/alice'), { ...sports, email: 'private@example.test' }));
    await assertFails(setDoc(doc(client, 'communityPublicProfiles/alice'), { ...sports, adultConfirmed: true }));
    await assertFails(setDoc(doc(client, 'communityPublicProfiles/alice'), { ...sports, verification: 'verified' }));
    await assertFails(updateDoc(doc(client, 'communityProfiles/alice'), { name: 'Sin espejo' }));
    await assertFails(setDoc(doc(db('bob'), 'communityPublicProfiles/alice'), sports));
    await assertFails(deleteDoc(doc(client, 'communityPublicProfiles/alice')));
  });

  test('seguir y dejar de seguir son propios y los recuentos públicos incluyen todas las relaciones', async () => {
    const alice = db('alice'); const bob = db('bob'); const relation = { followerId: 'alice', followingId: 'bob', createdAt: stamp() };
    await assertSucceeds(setDoc(doc(alice, 'communityFollows/alice_bob'), relation));
    await assertSucceeds(setDoc(doc(db('carol'), 'communityFollows/carol_bob'), { ...relation, followerId: 'carol' }));
    const count = await assertSucceeds(getCountFromServer(query(collection(db(), 'communityFollows'), where('followingId', '==', 'bob'))));
    assert.equal(count.data().count, 2);
    await assertFails(updateDoc(doc(alice, 'communityFollows/alice_bob'), { createdAt: stamp() }));
    await assertFails(deleteDoc(doc(bob, 'communityFollows/alice_bob')));
    await assertSucceeds(deleteDoc(doc(alice, 'communityFollows/alice_bob')));
    assert.equal((await getCountFromServer(query(collection(db(), 'communityFollows'), where('followingId', '==', 'bob')))).data().count, 1);
    // An owned relationship may be withdrawn even after consent lapses or the target disappears.
    for (const uid of ['inactive', 'minor']) {
      await seed(`communityFollows/${uid}_gone`, { followerId: uid, followingId: 'gone', createdAt: stamp() });
      await assertFails(deleteDoc(doc(db('alice'), 'communityFollows', `${uid}_gone`)));
      await assertSucceeds(deleteDoc(doc(db(uid), 'communityFollows', `${uid}_gone`)));
      await assertFails(setDoc(doc(db(uid), 'communityFollows', `${uid}_bob`), { followerId: uid, followingId: 'bob', createdAt: stamp() }));
    }
  });

  test('seguimiento bloquea visitantes, suplantación, auto-seguir, perfiles inexistentes y campos extra', async () => {
    const alice = db('alice'); const relation = { followerId: 'alice', followingId: 'bob', createdAt: stamp() };
    await assertFails(setDoc(doc(db(), 'communityFollows/alice_bob'), relation));
    await assertFails(setDoc(doc(db('bob'), 'communityFollows/alice_bob'), relation));
    await assertFails(setDoc(doc(alice, 'communityFollows/alice_alice'), { ...relation, followingId: 'alice' }));
    await assertFails(setDoc(doc(alice, 'communityFollows/alice_missing'), { ...relation, followingId: 'missing' }));
    await assertFails(setDoc(doc(alice, 'communityFollows/alice_inactive'), { ...relation, followingId: 'inactive' }));
    await assertFails(setDoc(doc(alice, 'communityFollows/wrong'), relation));
    await assertFails(setDoc(doc(alice, 'communityFollows/alice_bob'), { ...relation, role: 'ADMIN' }));
    await assertFails(setDoc(doc(alice, 'communityFollows/alice_bob'), { ...relation, createdAt: 'ayer' }));
    for (const uid of ['inactive', 'minor', 'no-profile']) await assertFails(setDoc(doc(db(uid), 'communityFollows', `${uid}_bob`), { ...relation, followerId: uid }));
  });
});

describe('Partidos, permisos de organizador y aforo atómico', { concurrency: false }, () => {
  test('publicación valida dueño, nombre, fecha futura, formatos y aforo', async () => {
    const alice = db('alice');
    await assertSucceeds(setDoc(doc(alice, 'communityEvents/valid'), event('valid')));
    for (const [id, changes] of Object.entries({ small: { capacity: 1 }, large: { capacity: 65 }, tournament: { type: 'tournament', capacity: 33 }, decimal: { capacity: 2.5 }, past: { startAtMs: Date.now() - 1000 }, date: { startAt: 'not-a-date' }, owner: { ownerId: 'bob' }, name: { ownerName: 'bob' }, format: { format: '20' }, extra: { role: 'ADMIN' } })) {
      await assertFails(setDoc(doc(alice, 'communityEvents', id), event(id, changes)));
    }
    await assertFails(updateDoc(doc(alice, 'communityEvents/valid'), { ownerId: 'bob' }));
    await assertFails(updateDoc(doc(alice, 'communityEvents/valid'), { capacity: 64 }));
  });

  test('participante solo añade o retira su propia inscripción', async () => {
    await seed('communityEvents/event', event('event', { participants: { alice: 'alice' } }));
    const bob = db('bob');
    const target = doc(bob, 'communityEvents/event');
    await assertSucceeds(updateDoc(target, { participants: { alice: 'alice', bob: 'Equipo de Bob' } }));
    await assertFails(updateDoc(target, { participants: { alice: 'Manipulado', bob: 'Equipo de Bob' } }));
    await assertFails(updateDoc(target, { participants: { alice: 'alice', bob: 'Renombrado' } }));
    await assertFails(updateDoc(target, { participants: { bob: 'Equipo de Bob' } }));
    await assertSucceeds(updateDoc(target, { participants: { alice: 'alice' } }));
  });

  test('última plaza disputada por dos transacciones produce exactamente una inscripción', async () => {
    await seed('communityEvents/race', event('race', { capacity: 2, participants: { alice: 'alice' } }));
    // References must belong to the same Firestore instance as the transaction.
    const transactionJoin = uid => {
      const client = db(uid);
      return runTransaction(client, async tx => {
        const target = doc(client, 'communityEvents/race');
        const current = (await tx.get(target)).data();
        if (Object.keys(current.participants).length >= current.capacity) throw new Error('Completo');
        tx.update(target, { participants: { ...current.participants, [uid]: uid } });
      });
    };
    const results = await Promise.allSettled(['bob', 'carol'].map(transactionJoin));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const current = (await getDoc(doc(db('alice'), 'communityEvents/race'))).data();
    assert.equal(Object.keys(current.participants).length, 2);
    await assertFails(updateDoc(doc(db('alice'), 'communityEvents/race'), { participants: { alice: 'alice', bob: 'bob', carol: 'carol' } }));
  });

  test('cerrado, cancelado, calendario generado o fecha pasada impiden inscribirse', async () => {
    for (const [id, changes] of Object.entries({ closed: { status: 'closed' }, cancelled: { status: 'cancelled' }, begun: { startAtMs: Date.now() - 1000 }, fixtures: { status: 'closed', fixtures: [fixture] } })) {
      await seed(`communityEvents/${id}`, event(id, changes));
      await assertFails(updateDoc(doc(db('bob'), 'communityEvents', id), { participants: { bob: 'bob' } }));
    }
    await seed('communityEvents/no-leave', event('no-leave', { participants: { bob: 'bob', alice: 'alice' }, fixtures: [fixture], status: 'closed' }));
    await assertFails(updateDoc(doc(db('bob'), 'communityEvents/no-leave'), { participants: { alice: 'alice' } }));
  });

  test('organizador registra invitados y cierra convocatoria; arrays de cruces no son un canal de mutación', async () => {
    await seed('communityEvents/event', event('event', { participants: { alice: 'alice', bob: 'bob' } }));
    const alice = doc(db('alice'), 'communityEvents/event');
    const bob = doc(db('bob'), 'communityEvents/event');
    await assertSucceeds(ownerUpdate(alice, { participants: { alice: 'alice', bob: 'bob', 'guest-one': 'Equipo invitado' } }));
    await assertFails(updateDoc(bob, { participants: { alice: 'alice', bob: 'bob', 'guest-one': 'Equipo invitado', 'guest-two': 'Otro' } }));
    await assertSucceeds(ownerUpdate(alice, { status: 'closed' }));
    await assertFails(ownerUpdate(alice, { fixtures: [fixture] }));
    const scored = { ...fixture, homeScore: 2, awayScore: 1 };
    await assertFails(updateDoc(bob, { fixtures: [scored] }));
    await assertFails(ownerUpdate(alice, { fixtures: [scored] }));
    await assertFails(updateDoc(alice, { status: 'open' }));
    await assertFails(updateDoc(alice, { participants: { alice: 'alice', bob: 'bob' } }));
    await assertFails(updateDoc(alice, { fixtures: Array(497).fill(fixture) }));
  });

  test('64 nombres válidos caben; valores estructurados o aforo excesivo se rechazan', async () => {
    const participants = Object.fromEntries(Array.from({ length: 64 }, (_, i) => [`guest-${i}`, `Equipo ${i}`]));
    const existing = { ...participants }; delete existing['guest-63'];
    await seed('communityEvents/large', event('large', { capacity: 64, participants: existing }));
    const target = doc(db('alice'), 'communityEvents/large');
    await assertSucceeds(ownerUpdate(target, { participants }));
    await assertFails(updateDoc(target, { participants: { ...participants, 'guest-63': { name: 'Dato inválido' } } }));
  });

  test('la base nombrada del despliegue aplica estas mismas reglas', async () => {
    const app = initializeApp({ projectId, apiKey: 'test-key', appId: 'cantera-rules-test' }, `named-${Date.now()}`);
    const client = getFirestore(app, DATABASE_ID);
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
    connectFirestoreEmulator(client, host, Number(port), { mockUserToken: { sub: 'named-owner', user_id: 'named-owner' } });
    const adminApp = initializeApp({ projectId, apiKey: 'test-key', appId: 'cantera-rules-admin' }, `named-admin-${Date.now()}`);
    const namedAdmin = getFirestore(adminApp, DATABASE_ID); connectFirestoreEmulator(namedAdmin, host, Number(port), { mockUserToken: { sub: 'admin', user_id: 'admin', admin: true } });
    try {
      await assertSucceeds(setDoc(doc(namedAdmin, 'communityConfiguration/runtime'), { serviceStatus: 'open', mediaUploadsEnabled: false, contactEmail: '', updatedAt: stamp() }));
      await assertSucceeds(writeProfile(client, profile('named-owner')));
      await assertSucceeds(setDoc(doc(client, 'communityEvents/named-event'), event('named-event', { ownerId: 'named-owner', ownerName: 'named-owner' })));
      await assertFails(setDoc(doc(client, 'communityProfiles/named-other'), profile('named-other')));
      await assertFails(updateDoc(doc(client, 'communityProfiles/named-owner'), { verification: 'verified' }));
    } finally { await deleteApp(app); await deleteApp(adminApp); }
  });
});

describe('Publicaciones e interacciones', { concurrency: false }, () => {
  test('publicación propia válida, autor inmutable y medios con ruta propia', async () => {
    const alice = db('alice');
    await assertSucceeds(setDoc(doc(alice, 'communityPosts/valid'), post('valid')));
    await assertFails(setDoc(doc(alice, 'communityPosts/photo'), post('photo', { kind: 'photo', title: '', mediaPath: 'community/alice/photo.jpg', mediaUrl: 'https://firebasestorage.googleapis.com/v0/b/test/o/community%2Falice%2Fphoto.jpg?alt=media' })));
    for (const [id, changes] of Object.entries({ author: { authorId: 'bob' }, name: { authorName: 'bob' }, blank: { text: '' }, title: { title: '' }, extra: { role: 'ADMIN' }, event: { eventId: 'missing' }, media: { kind: 'photo', mediaPath: 'community/bob/media.jpg', mediaUrl: 'https://firebasestorage.googleapis.com/media' }, tracking: { kind: 'photo', mediaPath: 'community/alice/tracking.jpg', mediaUrl: 'https://tracker.example/image.jpg' } })) {
      await assertFails(setDoc(doc(alice, 'communityPosts', id), post(id, changes)));
    }
    await assertFails(updateDoc(doc(alice, 'communityPosts/valid'), { text: 'Editado' }));
    await assertFails(deleteDoc(doc(db('bob'), 'communityPosts/valid')));
    await assertSucceeds(deleteDoc(doc(db('admin'), 'communityPosts/valid')));
    await seed('communityPosts/photo', post('photo')); await assertSucceeds(deleteDoc(doc(alice, 'communityPosts/photo')));
  });

  test('likes deben corresponder al usuario, ID y publicación existentes', async () => {
    await seed('communityPosts/post', post());
    const alice = db('alice');
    const like = { userId: 'alice', postId: 'post', createdAt: stamp() };
    await assertSucceeds(setDoc(doc(alice, 'communityLikes/post_alice'), like));
    await assertFails(setDoc(doc(db('bob'), 'communityLikes/post_alice'), like));
    await assertFails(setDoc(doc(alice, 'communityLikes/wrong'), like));
    await assertFails(setDoc(doc(alice, 'communityLikes/missing_alice'), { ...like, postId: 'missing' }));
    await assertFails(deleteDoc(doc(db('bob'), 'communityLikes/post_alice')));
    await assertSucceeds(deleteDoc(doc(alice, 'communityLikes/post_alice')));
  });

  test('comentario requiere autor verdadero y padre existente; otro usuario no edita ni borra', async () => {
    await seed('communityPosts/post', post());
    const bob = db('bob');
    const comment = { id: 'comment', authorId: 'bob', authorName: 'bob', text: '¡Buen partido!', createdAt: stamp(), postId: 'post' };
    await assertSucceeds(setDoc(doc(bob, 'communityComments/comment'), comment));
    await assertFails(setDoc(doc(bob, 'communityComments/spoofed'), { ...comment, id: 'spoofed', authorId: 'alice' }));
    await assertFails(setDoc(doc(bob, 'communityComments/orphan'), { ...comment, id: 'orphan', postId: 'missing' }));
    await assertFails(setDoc(doc(bob, 'communityComments/long'), { ...comment, id: 'long', text: 'x'.repeat(1001) }));
    await assertFails(updateDoc(doc(bob, 'communityComments/comment'), { authorId: 'alice' }));
    await assertFails(deleteDoc(doc(db('alice'), 'communityComments/comment')));
    await assertSucceeds(deleteDoc(doc(bob, 'communityComments/comment')));
    await assertSucceeds(deleteDoc(doc(db('alice'), 'communityPosts/post')));
    await assertFails(setDoc(doc(bob, 'communityComments/after-delete'), { ...comment, id: 'after-delete' }));
  });

  test('consultas, contadores y primera transacción de like conservan acceso con padre visible', async () => {
    await seed('communityPosts/post', post());
    for (let index = 0; index < 35; index++) await seed(`communityComments/c-${index}`, {
      id: `c-${index}`, authorId: 'bob', authorName: 'bob', text: 'Comentario de prueba', postId: 'post', createdAt: stamp(),
    });
    await seed('communityLikes/post_bob', { userId: 'bob', postId: 'post', createdAt: stamp() });
    const carol = db('carol');
    const likes = query(collection(carol, 'communityLikes'), where('postId', '==', 'post'));
    const comments = query(collection(carol, 'communityComments'), where('postId', '==', 'post'));
    assert.equal((await assertSucceeds(getCountFromServer(likes))).data().count, 1);
    assert.equal((await assertSucceeds(getCountFromServer(comments))).data().count, 35);
    assert.equal((await assertSucceeds(getDocs(query(comments, orderBy('createdAt', 'desc'), limit(30))))).size, 30);
    await assertSucceeds(getDocs(query(likes, orderBy('createdAt', 'desc'), limit(1))));
    assert.equal((await assertSucceeds(getDoc(doc(carol, 'communityLikes/post_carol')))).exists(), false);
    await assertSucceeds(runTransaction(carol, async tx => {
      const target = doc(carol, 'communityLikes/post_carol');
      assert.equal((await tx.get(target)).exists(), false);
      tx.set(target, { userId: 'carol', postId: 'post', createdAt: stamp() });
    }));
    await assertFails(getDocs(collection(carol, 'communityComments')));
    await assertFails(getDoc(doc(db(), 'communityLikes/post_carol')));
  });

  test('borrar padre oculta huérfanos a terceros; autores conservan consulta y retirada propias', async () => {
    await seed('communityPosts/post', post());
    await seed('communityLikes/post_inactive', { userId: 'inactive', postId: 'post', createdAt: stamp() });
    await seed('communityComments/retained', { id: 'retained', authorId: 'inactive', authorName: 'inactive', text: 'Mi comentario', postId: 'post', createdAt: stamp() });
    await assertSucceeds(deleteDoc(doc(db('alice'), 'communityPosts/post')));
    for (const status of ['open', 'paused', 'setup']) {
      await seed('communityConfiguration/runtime', { serviceStatus: status, mediaUploadsEnabled: false, contactEmail: '', updatedAt: stamp() });
      for (const uid of ['carol', 'alice']) {
        const client = db(uid);
        await assertFails(getDoc(doc(client, 'communityLikes/post_inactive')));
        await assertFails(getDoc(doc(client, 'communityComments/retained')));
        for (const name of ['communityLikes', 'communityComments']) {
          const byPost = query(collection(client, name), where('postId', '==', 'post'));
          await assertFails(getDocs(byPost));
          await assertFails(getCountFromServer(byPost));
        }
      }
      const inactive = db('inactive');
      await assertSucceeds(getDoc(doc(inactive, 'communityLikes/post_inactive')));
      await assertSucceeds(getDoc(doc(inactive, 'communityComments/retained')));
      await assertSucceeds(getDocs(query(collection(inactive, 'communityLikes'), where('userId', '==', 'inactive'))));
      await assertSucceeds(getDocs(query(collection(inactive, 'communityComments'), where('authorId', '==', 'inactive'))));
    }
    await assertSucceeds(getDoc(doc(db('admin'), 'communityComments/retained')));
    await assertFails(deleteDoc(doc(db('carol'), 'communityComments/retained')));
    await assertFails(deleteDoc(doc(db('carol'), 'communityLikes/post_inactive')));
    const inactive = db('inactive');
    await assertSucceeds(runTransaction(inactive, async tx => {
      const target = doc(inactive, 'communityLikes/post_inactive');
      assert.equal((await tx.get(target)).exists(), true);
      tx.delete(target);
    }));
    await assertSucceeds(deleteDoc(doc(db('inactive'), 'communityComments/retained')));
  });

  test('padre conservado y servicio pausado limita interacciones a sus autores y al dueño del post', async () => {
    await seed('communityPosts/post', post());
    await seed('communityLikes/post_bob', { userId: 'bob', postId: 'post', createdAt: stamp() });
    await seed('communityComments/retained', { id: 'retained', authorId: 'bob', authorName: 'bob', text: 'Mi comentario', postId: 'post', createdAt: stamp() });
    await seed('communityConfiguration/runtime', { serviceStatus: 'paused', mediaUploadsEnabled: false, contactEmail: '', updatedAt: stamp() });
    for (const name of ['communityLikes', 'communityComments']) {
      const byPost = client => query(collection(client, name), where('postId', '==', 'post'));
      await assertFails(getDocs(byPost(db('carol'))));
      await assertFails(getCountFromServer(byPost(db('carol'))));
      await assertSucceeds(getDocs(byPost(db('alice'))));
      await assertSucceeds(getCountFromServer(byPost(db('alice'))));
    }
    await assertSucceeds(getDoc(doc(db('bob'), 'communityComments/retained')));
    await assertSucceeds(deleteDoc(doc(db('bob'), 'communityComments/retained')));
    await assertSucceeds(deleteDoc(doc(db('bob'), 'communityLikes/post_bob')));
  });
});

describe('Verificación privada y moderación administrativa', { concurrency: false }, () => {
  test('solicitud privada: propio usuario/admin consultan; no hay auto-aprobación', async () => {
    const alice = db('alice');
    await assertSucceeds(setDoc(doc(alice, 'communityVerifications/alice'), verification()));
    await assertSucceeds(getDoc(doc(alice, 'communityVerifications/alice')));
    await assertSucceeds(getDocs(query(collection(db('admin'), 'communityVerifications'), orderBy('createdAt', 'desc'))));
    await assertFails(getDoc(doc(db('bob'), 'communityVerifications/alice')));
    await assertFails(getDoc(doc(db(), 'communityVerifications/alice')));
    await assertFails(getDocs(collection(alice, 'communityVerifications')));
    await assertFails(updateDoc(doc(alice, 'communityVerifications/alice'), { status: 'approved', reviewedAt: stamp() }));
    await assertFails(setDoc(doc(alice, 'communityVerifications/alice'), verification()));
    await assertFails(updateDoc(doc(db('admin'), 'communityVerifications/alice'), { evidence: 'Alterada' }));
    await assertSucceeds(updateDoc(doc(db('admin'), 'communityVerifications/alice'), { status: 'rejected', reviewedAt: stamp() }));
    await assertSucceeds(setDoc(doc(alice, 'communityVerifications/alice'), verification('alice', { evidence: 'Nueva información del club.' })));
  });

  test('aprobar requiere transacción admin que actualice solicitud y sello público juntos', async () => {
    await seed('communityVerifications/alice', verification());
    const admin = db('admin');
    await assertFails(updateDoc(doc(admin, 'communityVerifications/alice'), { status: 'approved', reviewedAt: stamp() }));
    await assertFails(updateDoc(doc(admin, 'communityProfiles/bob'), { verification: 'verified' }));
    await assertSucceeds(runTransaction(admin, async tx => {
      const request = doc(admin, 'communityVerifications/alice');
      await tx.get(request);
      tx.update(request, { status: 'approved', reviewedAt: stamp() });
      tx.update(doc(admin, 'communityProfiles/alice'), { verification: 'verified' });
      tx.update(doc(admin, 'communityPublicProfiles/alice'), { verification: 'verified' });
    }));
    assert.equal((await getDoc(doc(db(), 'communityPublicProfiles/alice'))).data().verification, 'verified');
    await assertFails(updateDoc(doc(db('alice'), 'communityProfiles/alice'), { verification: 'unverified' }));
  });

  test('denunciar requiere padre y autor propio; solo admin consulta y resuelve', async () => {
    await seed('communityPosts/post', post());
    const report = { id: 'report', reporterId: 'bob', postId: 'post', reason: 'Contenido inapropiado.', status: 'open', createdAt: stamp() };
    await assertSucceeds(setDoc(doc(db('bob'), 'communityReports/report'), report));
    await assertFails(getDoc(doc(db('bob'), 'communityReports/report')));
    await assertFails(getDocs(collection(db('alice'), 'communityReports')));
    await assertSucceeds(getDocs(query(collection(db('admin'), 'communityReports'), orderBy('createdAt', 'desc'))));
    await assertFails(updateDoc(doc(db('bob'), 'communityReports/report'), { status: 'resolved' }));
    await assertFails(updateDoc(doc(db('admin'), 'communityReports/report'), { reason: 'Alterado', status: 'resolved' }));
    await assertSucceeds(updateDoc(doc(db('admin'), 'communityReports/report'), { status: 'resolved' }));
    await assertFails(setDoc(doc(db('bob'), 'communityReports/missing'), { ...report, id: 'missing', postId: 'missing' }));
  });
});

describe('Storage: pausa de cargas exigida por el servidor', { concurrency: false }, () => {
  test('ninguna cuenta puede cargar archivos aunque el formato sea válido o cambie un flag', async () => {
    for (const uid of [undefined, 'alice', 'bob', 'admin', 'inactive']) {
      await assertFails(uploadBytes(ref(media(uid), `community/${uid || 'visitor'}/photo.jpg`), new Uint8Array([1, 2, 3]), { contentType: 'image/jpeg' }));
      await assertFails(uploadBytes(ref(media(uid), `community/${uid || 'visitor'}/reel.mp4`), new Uint8Array([1, 2, 3]), { contentType: 'video/mp4' }));
    }
    await assertFails(updateDoc(doc(db('alice'), 'communityConfiguration/runtime'), { mediaUploadsEnabled: true }));
    await assertFails(updateDoc(doc(db('admin'), 'communityConfiguration/runtime'), { mediaUploadsEnabled: true, updatedAt: stamp() }));
  });
  test('medios legacy pueden leerse y retirarse por dueño/admin, sin sobrescribir ni enumerar', async () => {
    await env.withSecurityRulesDisabled(ctx => uploadBytes(ref(ctx.storage(), 'community/alice/photo.jpg'), new Uint8Array([1, 2, 3]), { contentType: 'image/jpeg' }));
    const target = ref(media('alice'), 'community/alice/photo.jpg');
    await assertSucceeds(getMetadata(ref(media(), 'community/alice/photo.jpg')));
    await assertFails(listAll(ref(media(), 'community/alice')));
    await assertFails(uploadBytes(target, new Uint8Array([4]), { contentType: 'image/jpeg' }));
    await assertFails(updateMetadata(target, { contentType: 'text/html' }));
    await assertFails(deleteObject(ref(media('bob'), 'community/alice/photo.jpg')));
    await assertSucceeds(deleteObject(target));
  });
});

describe('Gestión segura de convocatorias y derechos', { concurrency: false }, () => {
  test('edición de fecha/campo requiere historial inmutable y dueño; aforo no baja de inscritos', async () => {
    await seed('communityEvents/edit', event('edit', { participants: { alice: 'alice', bob: 'bob' } }));
    const target = doc(db('alice'), 'communityEvents/edit');
    await assertFails(updateDoc(target, { venue: 'Nuevo campo' }));
    await assertSucceeds(ownerUpdate(target, { venue: 'Nuevo campo', capacity: 3 }));
    await assertFails(ownerUpdate(target, { capacity: 1 }));
    await assertFails(ownerUpdate(doc(db('bob'), 'communityEvents/edit'), { title: 'Suplantado' }));
    await assertFails(updateDoc(doc(db('alice'), 'communityEventChanges/edit_1'), { summary: 'Reescrito' }));
    await assertFails(deleteDoc(doc(db('alice'), 'communityEventChanges/edit_1')));
  });
  test('lista de espera preserva orden y retirada promociona sólo primero, con aviso privado', async () => {
    await seed('communityEvents/queue', event('queue', { capacity: 2, participants: { alice: 'alice', bob: 'bob' }, participantIds: ['alice', 'bob'], waitlist: {}, waitlistOrder: [], rsvps: { bob: 'yes' } }));
    const carol = db('carol'); const target = doc(carol, 'communityEvents/queue');
    await assertSucceeds(updateDoc(target, { waitlist: { carol: { name: 'carol', joinedAt: stamp() } }, waitlistOrder: ['carol'] }));
    await assertFails(updateDoc(doc(db('bob'), 'communityEvents/queue'), { waitlist: { carol: { name: 'Manipulado', joinedAt: stamp() } }, waitlistOrder: ['carol'] }));
    await assertFails(updateDoc(doc(db('bob'), 'communityEvents/queue'), { participants: { alice: 'alice', 'guest-fake': 'No espera' }, participantIds: ['alice', 'guest-fake'], waitlist: {}, waitlistOrder: [] }));
    const bob = db('bob'); const batch = writeBatch(bob);
    batch.update(doc(bob, 'communityEvents/queue'), { participants: { alice: 'alice', carol: 'carol' }, participantIds: ['alice', 'carol'], waitlist: {}, waitlistOrder: [], rsvps: { bob: 'no' } });
    batch.set(doc(bob, 'communityEventPromotions/queue_delivery'), { eventId: 'queue', authorId: 'bob', recipientId: 'carol', title: 'Partido de la comunidad', summary: 'Has conseguido una plaza al liberarse un puesto.', createdAt: stamp() });
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDocs(query(collection(db('alice'), 'communityEventPromotions'), where('eventId', '==', 'queue'), orderBy('createdAt', 'asc'), limit(50))));
    const noticeBatch = writeBatch(bob); noticeBatch.set(doc(bob, 'communityEventNotices/queue_place_delivery'), { id: 'queue_place_delivery', eventId: 'queue', recipientId: 'carol', revision: 1, title: 'Partido de la comunidad', summary: 'Has conseguido una plaza al liberarse un puesto.', createdAt: stamp(), readAt: '', kind: 'place', deliveryId: 'delivery' });
    noticeBatch.set(doc(bob, 'communityEventDeliveries/queue_place_delivery'), { actorId: 'alice', eventId: 'queue', recipientId: 'carol', createdAt: stamp() });
    await assertSucceeds(noticeBatch.commit());
    await assertSucceeds(getDoc(doc(carol, 'communityEventNotices/queue_place_delivery')));
    await assertFails(getDoc(doc(db('alice'), 'communityEventNotices/queue_place_delivery')));
    await assertSucceeds(updateDoc(doc(carol, 'communityEventNotices/queue_place_delivery'), { readAt: stamp() }));
    await assertFails(updateDoc(doc(carol, 'communityEventNotices/queue_place_delivery'), { summary: 'Inventado' }));
  });
  test('RSVP propio admite pendiente; retirar plaza funciona con términos antiguos', async () => {
    await seed('communityEvents/rsvp', event('rsvp', { participants: { bob: 'bob' }, participantIds: ['bob'], rsvps: { bob: 'yes' } }));
    await assertSucceeds(updateDoc(doc(db('bob'), 'communityEvents/rsvp'), { rsvps: { bob: 'maybe' } }));
    await assertFails(updateDoc(doc(db('alice'), 'communityEvents/rsvp'), { rsvps: { bob: 'no' } }));
    await seed('communityProfiles/bob', profile('bob', { acceptedTermsVersion: '2026-10-05' }));
    await assertSucceeds(updateDoc(doc(db('bob'), 'communityEvents/rsvp'), { participants: {}, participantIds: [], rsvps: { bob: 'no' } }));
  });
  test('organizador recupera promoción escrita por quien liberó plaza, con recibo propio y bandeja privada', async () => {
    await seed('communityEvents/recover-place', event('recover-place', { participants: { carol: 'carol' }, participantIds: ['carol'] }));
    await seed('communityEventPromotions/recover-place_delivery', { eventId: 'recover-place', authorId: 'bob', recipientId: 'carol', title: 'Partido de la comunidad', summary: 'Has conseguido una plaza al liberarse un puesto.', createdAt: stamp() });
    const alice = db('alice'); const receipt = doc(alice, 'communityEventDeliveries/recover-place_place_delivery');
    await assertSucceeds(getDocs(query(collection(alice, 'communityEventPromotions'), where('eventId', '==', 'recover-place'), orderBy('createdAt', 'asc'), limit(50))));
    assert.equal((await assertSucceeds(getDoc(receipt))).exists(), false);
    const batch = writeBatch(alice);
    batch.set(doc(alice, 'communityEventNotices/recover-place_place_delivery'), { id: 'recover-place_place_delivery', eventId: 'recover-place', recipientId: 'carol', revision: 1, title: 'Partido de la comunidad', summary: 'Has conseguido una plaza al liberarse un puesto.', createdAt: stamp(), readAt: '', kind: 'place', deliveryId: 'delivery' });
    batch.set(receipt, { actorId: 'alice', eventId: 'recover-place', recipientId: 'carol', createdAt: stamp() });
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDoc(receipt));
    await assertFails(getDoc(doc(db('bob'), 'communityEventDeliveries/recover-place_place_delivery')));
    await assertFails(getDoc(doc(alice, 'communityEventNotices/recover-place_place_delivery')));
    await assertSucceeds(getDoc(doc(db('carol'), 'communityEventNotices/recover-place_place_delivery')));
    await assertFails(getDocs(query(collection(db('inactive'), 'communityEventPromotions'), where('eventId', '==', 'recover-place'))));
  });
  test('servicio cerrado falla cerrado y no impide derechos ni retirada propia', async () => {
    await seed('communityPosts/post', post());
    await seed('communityLikes/post_inactive', { userId: 'inactive', postId: 'post', createdAt: stamp() });
    await seed('communityComments/old', { id: 'old', authorId: 'inactive', authorName: 'inactive', postId: 'post', text: 'Mi texto', createdAt: stamp() });
    await seed('communityConfiguration/runtime', { serviceStatus: 'paused', mediaUploadsEnabled: false, contactEmail: '', updatedAt: stamp() });
    await assertFails(getDocs(query(collection(db(), 'communityPosts'), orderBy('createdAt', 'desc'))));
    await assertFails(setDoc(doc(db('alice'), 'communityPosts/new'), post('new')));
    await assertSucceeds(deleteDoc(doc(db('inactive'), 'communityLikes/post_inactive')));
    await assertSucceeds(deleteDoc(doc(db('inactive'), 'communityComments/old')));
    await assertSucceeds(setDoc(doc(db('inactive'), 'communityRightsRequests/inactive_delete'), { id: 'inactive_delete', userId: 'inactive', kind: 'delete', status: 'pending', createdAt: stamp(), reviewedAt: '' }));
    await assertFails(getDoc(doc(db('bob'), 'communityRightsRequests/inactive_delete')));
    await assertFails(updateDoc(doc(db('inactive'), 'communityRightsRequests/inactive_delete'), { status: 'completed', reviewedAt: stamp() }));
    await assertSucceeds(updateDoc(doc(db('admin'), 'communityRightsRequests/inactive_delete'), { status: 'processing', reviewedAt: stamp() }));
    await assertSucceeds(deleteDoc(doc(db('alice'), 'communityPosts/post')));
    await assertFails(setDoc(doc(db('bob'), 'communityConfiguration/runtime'), { serviceStatus: 'open', mediaUploadsEnabled: false, contactEmail: '', updatedAt: stamp() }));
    await assertSucceeds(updateDoc(doc(db('admin'), 'communityConfiguration/runtime'), { serviceStatus: 'open', updatedAt: stamp() }));
  });
  test('timestamps de creación no aceptan reloj manipulado; bloqueos y suspensión frenan nuevas interacciones', async () => {
    await seed('communityPosts/post', post());
    await assertFails(setDoc(doc(db('alice'), 'communityPosts/future'), post('future', { createdAt: Timestamp.fromDate(new Date('2099-01-01T00:00:00Z')) })));
    await assertSucceeds(setDoc(doc(db('bob'), 'communityBlocks/bob_alice'), { ownerId: 'bob', blockedId: 'alice', createdAt: stamp() }));
    await assertFails(setDoc(doc(db('bob'), 'communityLikes/post_bob'), { userId: 'bob', postId: 'post', createdAt: stamp() }));
    await assertFails(getDocs(collection(db('alice'), 'communityBlocks')));
    await assertSucceeds(deleteDoc(doc(db('bob'), 'communityBlocks/bob_alice')));
    await assertSucceeds(setDoc(doc(db('bob'), 'communityLikes/post_bob'), { userId: 'bob', postId: 'post', createdAt: stamp() }));
    await assertSucceeds(setDoc(doc(db('admin'), 'communityAccountModeration/bob'), { status: 'suspended', reason: 'Denuncia revisada.', updatedAt: stamp() }));
    await assertFails(setDoc(doc(db('bob'), 'communityComments/banned'), { id: 'banned', authorId: 'bob', authorName: 'bob', postId: 'post', text: 'No permitido', createdAt: stamp() }));
    await assertSucceeds(deleteDoc(doc(db('bob'), 'communityLikes/post_bob')));
  });

  test('perfil incompleto queda privado y configuración ausente impide nuevas convocatorias', async () => {
    const newcomer = db('incomplete'); const blank = profile('incomplete', { city: '', country: '' });
    await assertSucceeds(setDoc(doc(newcomer, 'communityProfiles/incomplete'), blank));
    await assertFails(setDoc(doc(newcomer, 'communityPublicProfiles/incomplete'), publicProfile(blank)));
    await assertFails(setDoc(doc(newcomer, 'communityEvents/incomplete'), event('incomplete', { ownerId: 'incomplete', ownerName: 'incomplete' })));
    await env.withSecurityRulesDisabled(ctx => deleteDoc(doc(ctx.firestore(), 'communityConfiguration/runtime')));
    await assertFails(getDoc(doc(db(), 'communityPublicProfiles/alice')));
    await assertFails(setDoc(doc(db('alice'), 'communityPosts/closed'), post('closed')));
    await assertSucceeds(getDoc(doc(db('alice'), 'communityProfiles/alice')));
  });
  test('129 avisos se entregan en lotes seguros y no admiten audiencias ajenas', async () => {
    const participants = Object.fromEntries(Array.from({ length: 64 }, (_, i) => [`player-${i}`, `Jugador ${i}`]));
    const waitlist = Object.fromEntries(Array.from({ length: 64 }, (_, i) => [`waiting-${i}`, { name: `En espera ${i}`, joinedAt: stamp() }]));
    const audienceIds = ['alice', ...Object.keys(participants), ...Object.keys(waitlist)];
    await seed('communityEvents/notices', event('notices', { capacity: 64, participants, participantIds: Object.keys(participants), waitlist, waitlistOrder: Object.keys(waitlist), revision: 0, history: [] }));
    const client = db('alice'); const target = doc(client, 'communityEvents/notices'); const batch = writeBatch(client); const revision = 1; const summary = 'El partido cambia de campo.';
    batch.update(target, { venue: 'Campo nuevo', revision, updatedAt: stamp() });
    batch.set(doc(client, 'communityEventChanges/notices_1'), { id: 'notices_1', eventId: 'notices', ownerId: 'alice', revision, summary, title: 'Partido de la comunidad', audienceIds, createdAt: stamp() });
    await assertSucceeds(batch.commit());
    await assertSucceeds(commitDeliveryBatches(audienceIds, async recipients => {
      const noticeBatch = writeBatch(client);
      for (const uid of recipients) {
        noticeBatch.set(doc(client, `communityEventNotices/notices_1_${uid}`), { id: `notices_1_${uid}`, eventId: 'notices', recipientId: uid, revision, summary, title: 'Partido de la comunidad', createdAt: stamp(), readAt: '' });
        noticeBatch.set(doc(client, `communityEventDeliveries/notices_1_${uid}`), { actorId: 'alice', eventId: 'notices', recipientId: uid, createdAt: stamp() });
      }
      await noticeBatch.commit();
    }));
    assert.equal(audienceIds.length, 129);
    await assertFails(setDoc(doc(client, 'communityEventNotices/notices_1_carol'), { id: 'notices_1_carol', eventId: 'notices', recipientId: 'carol', revision, summary, title: 'Partido de la comunidad', createdAt: stamp(), readAt: '' }));
    await assertFails(ownerUpdate(target, { history: [{ revision: 0, summary: 'Historial inventado', changedAt: '2000-01-01T00:00:00.000Z' }] }));
  });
  test('recuperación crea sólo avisos pendientes con recibos inmutables, sin acceso a lectura privada', async () => {
    await seed('communityEvents/replay', event('replay', { participants: { bob: 'bob' }, participantIds: ['bob'] }));
    const alice = db('alice'); const bob = db('bob');
    await assertSucceeds(ownerUpdate(doc(alice, 'communityEvents/replay'), { venue: 'Nuevo campo' }));
    const ledger = (await getDoc(doc(alice, 'communityEventChanges/replay_1'))).data();
    const candidates = ledger.audienceIds.map(recipientId => ({ id: `replay_1_${recipientId}`, recipientId }));
    const recover = async () => {
      const receipts = await Promise.all(candidates.map(candidate => getDoc(doc(alice, 'communityEventDeliveries', candidate.id))));
      const missing = candidates.filter((_, index) => !receipts[index].exists());
      if (missing.length) {
        const batch = writeBatch(alice);
        for (const notice of missing) {
          batch.set(doc(alice, 'communityEventNotices', notice.id), { id: notice.id, eventId: 'replay', recipientId: notice.recipientId, revision: 1, title: ledger.title, summary: ledger.summary, createdAt: stamp(), readAt: '' });
          batch.set(doc(alice, 'communityEventDeliveries', notice.id), { actorId: 'alice', eventId: 'replay', recipientId: notice.recipientId, createdAt: stamp() });
        }
        await batch.commit();
      }
      return missing.length;
    };
    assert.equal(await assertSucceeds(recover()), 2);
    await assertSucceeds(updateDoc(doc(bob, 'communityEventNotices/replay_1_bob'), { readAt: stamp() }));
    assert.equal(await assertSucceeds(recover()), 0);
    await assertFails(getDoc(doc(alice, 'communityEventNotices/replay_1_bob')));
    const receipt = await assertSucceeds(getDoc(doc(alice, 'communityEventDeliveries/replay_1_bob')));
    assert.deepEqual(Object.keys(receipt.data()).sort(), ['actorId', 'createdAt', 'eventId', 'recipientId']);
    await assertFails(getDoc(doc(bob, 'communityEventDeliveries/replay_1_bob')));
    await assertSucceeds(getDocs(query(collection(alice, 'communityEventDeliveries'), where('actorId', '==', 'alice'))));
    await assertFails(getDocs(collection(bob, 'communityEventDeliveries')));
    await assertFails(updateDoc(doc(alice, 'communityEventDeliveries/replay_1_bob'), { createdAt: stamp() }));
    await assertFails(deleteDoc(doc(alice, 'communityEventDeliveries/replay_1_bob')));
    await assertFails(setDoc(doc(alice, 'communityEventDeliveries/orphan'), { actorId: 'alice', eventId: 'replay', recipientId: 'bob', createdAt: stamp() }));
    await assertSucceeds(deleteDoc(doc(bob, 'communityEventNotices/replay_1_bob')));
    assert.equal(await assertSucceeds(recover()), 0, 'una retirada de la bandeja no se recrea al recuperar avisos');
  });
  test('denuncia de comentario valida comentario y padre real, incluso sin nuevos términos', async () => {
    await seed('communityPosts/post', post()); await seed('communityPosts/other', post('other'));
    await seed('communityComments/comment', { id: 'comment', authorId: 'alice', authorName: 'alice', text: 'Revisar', postId: 'post', createdAt: stamp() });
    const report = { id: 'comment-report', reporterId: 'inactive', postId: 'post', commentId: 'comment', reason: 'Revisión solicitada.', status: 'open', createdAt: stamp() };
    await assertSucceeds(setDoc(doc(db('inactive'), 'communityReports/comment-report'), report));
    await assertFails(setDoc(doc(db('inactive'), 'communityReports/wrong'), { ...report, id: 'wrong', postId: 'other' }));
  });
});

async function createTeam(client, id = 'team', uid = 'alice') {
  const batch = writeBatch(client);
  batch.set(doc(client, 'communityTeams', id), { id, ownerId: uid, name: 'Equipo de prueba', city: 'Madrid', country: 'España', description: '', level: 'amateur', status: 'active', createdAt: stamp(), updatedAt: stamp() });
  batch.set(doc(client, 'communityTeamMembers', `${id}_${uid}`), { id: `${id}_${uid}`, teamId: id, userId: uid, name: uid, role: 'owner', joinedAt: stamp() });
  return batch.commit();
}
async function teamRequest(client, uid, inviteId = '', teamId = 'team') {
  return setDoc(doc(client, 'communityTeamJoinRequests', `${teamId}_${uid}`), { id: `${teamId}_${uid}`, teamId, userId: uid, name: uid, inviteId, status: 'pending', createdAt: stamp(), reviewedAt: '' });
}
async function approveMember(client, uid, teamId = 'team') {
  const batch = writeBatch(client);
  batch.update(doc(client, 'communityTeamJoinRequests', `${teamId}_${uid}`), { status: 'approved', reviewedAt: stamp() });
  batch.set(doc(client, 'communityTeamMembers', `${teamId}_${uid}`), { id: `${teamId}_${uid}`, teamId, userId: uid, name: uid, role: 'member', joinedAt: stamp() });
  return batch.commit();
}
describe('Equipos persistentes, miembros privados y autoridad', { concurrency: false }, () => {
  test('equipo y dueño se crean juntos; solicitud/aprobación requieren miembro y estado coherentes', async () => {
    const alice = db('alice'); await assertSucceeds(createTeam(alice));
    await assertFails(setDoc(doc(db('bob'), 'communityTeamMembers/team_bob'), { id: 'team_bob', teamId: 'team', userId: 'bob', name: 'bob', role: 'manager', joinedAt: stamp() }));
    await assertSucceeds(teamRequest(db('bob'), 'bob'));
    await assertFails(updateDoc(doc(db('alice'), 'communityTeamJoinRequests/team_bob'), { status: 'approved', reviewedAt: stamp() }));
    await assertSucceeds(approveMember(alice, 'bob'));
    await assertSucceeds(getDocs(query(collection(db('bob'), 'communityTeamMembers'), where('teamId', '==', 'team'))));
    await assertFails(getDocs(query(collection(db('carol'), 'communityTeamMembers'), where('teamId', '==', 'team'))));
    await assertFails(getDocs(collection(db(), 'communityTeamMembers')));
    await assertFails(updateDoc(doc(db('bob'), 'communityTeamMembers/team_bob'), { role: 'owner' }));
  });
  test('invitación revocada/caducada/TTL abusivo no admite entrada y otro equipo no filtra roster', async () => {
    await createTeam(db('alice')); await createTeam(db('carol'), 'other', 'carol');
    const invite = { id: 'invite', teamId: 'team', createdBy: 'alice', revoked: false, createdAt: stamp(), expiresAt: Timestamp.fromMillis(Date.now() + 86400000) };
    await assertSucceeds(setDoc(doc(db('alice'), 'communityTeamInvites/invite'), invite));
    await assertFails(setDoc(doc(db('bob'), 'communityTeamInvites/fake'), { ...invite, id: 'fake', createdBy: 'bob' }));
    await assertFails(setDoc(doc(db('alice'), 'communityTeamInvites/long'), { ...invite, id: 'long', expiresAt: Timestamp.fromMillis(Date.now() + 31 * 86400000) }));
    await assertSucceeds(updateDoc(doc(db('alice'), 'communityTeamInvites/invite'), { revoked: true }));
    await assertFails(teamRequest(db('bob'), 'bob', 'invite'));
    await seed('communityTeamInvites/expired', { ...invite, id: 'expired', expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
    await assertFails(teamRequest(db('bob'), 'bob', 'expired'));
    await assertFails(getDocs(query(collection(db('carol'), 'communityTeamMembers'), where('teamId', '==', 'team'))));
  });
  test('owner promueve manager y transfiere propiedad atómicamente; baja propia funciona sin términos', async () => {
    const alice = db('alice'); await createTeam(alice); await teamRequest(db('bob'), 'bob'); await approveMember(alice, 'bob');
    await assertSucceeds(updateDoc(doc(alice, 'communityTeamMembers/team_bob'), { role: 'manager' }));
    await assertFails(updateDoc(doc(alice, 'communityTeams/team'), { ownerId: 'bob', updatedAt: stamp() }));
    const transfer = writeBatch(alice); transfer.update(doc(alice, 'communityTeams/team'), { ownerId: 'bob', updatedAt: stamp() }); transfer.update(doc(alice, 'communityTeamMembers/team_alice'), { role: 'manager' }); transfer.update(doc(alice, 'communityTeamMembers/team_bob'), { role: 'owner' });
    await assertSucceeds(transfer.commit());
    await assertFails(deleteDoc(doc(db('bob'), 'communityTeamMembers/team_bob')));
    await seed('communityProfiles/alice', profile('alice', { acceptedTermsVersion: '2026-10-05' }));
    await seed('communityConfiguration/runtime', { serviceStatus: 'paused', mediaUploadsEnabled: false, contactEmail: '', updatedAt: stamp() });
    await assertSucceeds(getDoc(doc(alice, 'communityTeams/team')));
    await assertSucceeds(deleteDoc(doc(alice, 'communityTeamMembers/team_alice')));
    await assertFails(getDoc(doc(alice, 'communityTeamMembers/team_bob')));
  });
  test('asociar convocatoria a equipo exige manager y alta de servidor', async () => {
    await createTeam(db('alice'));
    await assertSucceeds(setDoc(doc(db('alice'), 'communityEvents/team-event'), event('team-event', { teamId: 'team' })));
    await assertFails(setDoc(doc(db('bob'), 'communityEvents/team-spoof'), event('team-spoof', { ownerId: 'bob', ownerName: 'bob', teamId: 'team' })));
  });
});

async function canonicalGeneration(client, value, fixtures) {
  const batch = writeBatch(client); const revision = (value.revision || 0) + 1;
  batch.update(doc(client, 'communityEvents', value.id), { fixtureIds: fixtures.map(f => f.id), status: 'closed', revision, updatedAt: stamp() });
  batch.set(doc(client, 'communityEventChanges', `${value.id}_${revision}`), { id: `${value.id}_${revision}`, eventId: value.id, ownerId: value.ownerId, revision, summary: 'Cruces publicados.', title: value.title, audienceIds: [...new Set([value.ownerId, ...Object.keys(value.participants), ...Object.keys(value.waitlist || {})])], createdAt: stamp() });
  for (const fixture of fixtures) batch.set(doc(client, 'communityFixtures', `${value.id}_${fixture.id}`), { ...fixtureFields(value, fixture), createdAt: stamp(), updatedAt: stamp() });
  return batch.commit();
}
async function canonicalUpdate(client, eventId, fixtureId, changes) {
  return runTransaction(client, async tx => {
    const target = doc(client, 'communityEvents', eventId); const value = (await tx.get(target)).data(); const revision = (value.revision || 0) + 1;
    tx.update(target, { revision, updatedAt: stamp() });
    tx.set(doc(client, 'communityEventChanges', `${eventId}_${revision}`), { id: `${eventId}_${revision}`, eventId, ownerId: value.ownerId, revision, summary: 'Cruce actualizado.', title: value.title, audienceIds: [...new Set([value.ownerId, ...Object.keys(value.participants), ...Object.keys(value.waitlist || {})])], createdAt: stamp() });
    tx.update(doc(client, 'communityFixtures', `${eventId}_${fixtureId}`), { ...changes, updatedAt: stamp() });
  });
}
describe('Cruces canónicos con validación individual', { concurrency: false }, () => {
  test('liga completa de 32 equipos publica 496 cruces en una única operación de 498 escrituras', async () => {
    const participants = Object.fromEntries(Array.from({ length: 32 }, (_, i) => [`guest-${i}`, `Equipo ${i}`]));
    const value = event('full-league', { type: 'tournament', capacity: 32, participants, participantIds: Object.keys(participants), revision: 0, history: [] });
    await seed('communityEvents/full-league', value); const fixtures = makeFixtures(value); assert.equal(fixtures.length, 496);
    await assertSucceeds(canonicalGeneration(db('alice'), value, fixtures));
    assert.equal((await getDocs(query(collection(db(), 'communityFixtures'), where('eventId', '==', 'full-league')))).size, 496);
    await assertFails(updateDoc(doc(db('bob'), 'communityEvents/full-league'), { participants: { ...participants, bob: 'bob' }, participantIds: [...Object.keys(participants), 'bob'] }));
  });
  test('ni organizador admite oponentes inexistentes, resultados fuera de rango o identidad reescrita', async () => {
    const value = event('canonical', { type: 'tournament', participants: { alice: 'alice', bob: 'bob' }, participantIds: ['alice', 'bob'], revision: 0, history: [] });
    await seed('communityEvents/canonical', value);
    await assertFails(canonicalGeneration(db('alice'), value, [{ ...fixture, awayId: 'unknown' }]));
    await assertSucceeds(canonicalGeneration(db('alice'), value, [fixture]));
    await assertFails(canonicalUpdate(db('bob'), 'canonical', fixture.id, { homeScore: 2, awayScore: 1 }));
    await assertFails(canonicalUpdate(db('alice'), 'canonical', fixture.id, { homeScore: 100, awayScore: 1 }));
    await assertFails(canonicalUpdate(db('alice'), 'canonical', fixture.id, { awayId: 'alice' }));
    await assertFails(updateDoc(doc(db('alice'), 'communityFixtures/canonical_r1-1'), { homeScore: 2, awayScore: 1, updatedAt: stamp() }));
    await assertSucceeds(canonicalUpdate(db('alice'), 'canonical', fixture.id, { homeScore: 2, awayScore: 1 }));
    await assertFails(deleteDoc(doc(db('alice'), 'communityFixtures/canonical_r1-1')));
  });
  test('programación usa fecha de servidor y no altera cruces ya puntuados; KO no admite empate', async () => {
    const value = event('schedule', { type: 'tournament', tournamentFormat: 'knockout', participants: { alice: 'alice', bob: 'bob' }, participantIds: ['alice', 'bob'], revision: 0, history: [] });
    await seed('communityEvents/schedule', value); await canonicalGeneration(db('alice'), value, [fixture]);
    await assertFails(canonicalUpdate(db('alice'), 'schedule', fixture.id, { kickoffAt: Timestamp.fromMillis(Date.now() - 1000), venue: 'Campo pasado' }));
    await assertSucceeds(canonicalUpdate(db('alice'), 'schedule', fixture.id, { kickoffAt: Timestamp.fromMillis(Date.now() + 86400000), venue: 'Campo próximo' }));
    await assertFails(canonicalUpdate(db('alice'), 'schedule', fixture.id, { homeScore: 2, awayScore: 2 }));
    await assertSucceeds(canonicalUpdate(db('alice'), 'schedule', fixture.id, { homeScore: 2, awayScore: 1 }));
    await assertFails(canonicalUpdate(db('alice'), 'schedule', fixture.id, { kickoffAt: Timestamp.fromMillis(Date.now() + 172800000), venue: 'Campo distinto' }));
  });
});
