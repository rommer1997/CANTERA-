import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase/app';
import { collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, runTransaction, setDoc, updateDoc, where, getCountFromServer, writeBatch } from 'firebase/firestore';
import { deleteObject, getMetadata, listAll, ref, updateMetadata, uploadBytes } from 'firebase/storage';

// Never run these tests against cloud services or production project identifiers.
const projectId = process.env.GCLOUD_PROJECT || 'demo-cantera-security';
if (!projectId.startsWith('demo-') || !process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  throw new Error('Ejecuta con firebase emulators:exec --project demo-cantera-security --only firestore,storage "node --test tests/security.test.mjs".');
}
const DATABASE_ID = 'ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb';
const TERMS_VERSION = '2026-10-05';
const stamp = () => new Date().toISOString();
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

before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') }, storage: { rules: readFileSync(new URL('../storage.rules', import.meta.url), 'utf8') } });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async ctx => {
    const firestore = ctx.firestore();
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

  test('organizador registra invitados, genera calendario y guarda marcadores; otro usuario no', async () => {
    await seed('communityEvents/event', event('event', { participants: { alice: 'alice', bob: 'bob' } }));
    const alice = doc(db('alice'), 'communityEvents/event');
    const bob = doc(db('bob'), 'communityEvents/event');
    await assertSucceeds(updateDoc(alice, { participants: { alice: 'alice', bob: 'bob', 'guest-one': 'Equipo invitado' } }));
    await assertFails(updateDoc(bob, { participants: { alice: 'alice', bob: 'bob', 'guest-one': 'Equipo invitado', 'guest-two': 'Otro' } }));
    await assertSucceeds(updateDoc(alice, { status: 'closed', fixtures: [fixture] }));
    const scored = { ...fixture, homeScore: 2, awayScore: 1 };
    await assertFails(updateDoc(bob, { fixtures: [scored] }));
    await assertSucceeds(updateDoc(alice, { fixtures: [scored] }));
    await assertFails(updateDoc(alice, { status: 'open' }));
    await assertFails(updateDoc(alice, { participants: { alice: 'alice', bob: 'bob' } }));
    await assertFails(updateDoc(alice, { fixtures: Array(497).fill(fixture) }));
  });

  test('64 nombres válidos caben; valores estructurados o aforo excesivo se rechazan', async () => {
    const participants = Object.fromEntries(Array.from({ length: 64 }, (_, i) => [`guest-${i}`, `Equipo ${i}`]));
    const existing = { ...participants }; delete existing['guest-63'];
    await seed('communityEvents/large', event('large', { capacity: 64, participants: existing }));
    const target = doc(db('alice'), 'communityEvents/large');
    await assertSucceeds(updateDoc(target, { participants }));
    await assertFails(updateDoc(target, { participants: { ...participants, 'guest-63': { name: 'Dato inválido' } } }));
  });

  test('la base nombrada del despliegue aplica estas mismas reglas', async () => {
    const app = initializeApp({ projectId, apiKey: 'test-key', appId: 'cantera-rules-test' }, `named-${Date.now()}`);
    const client = getFirestore(app, DATABASE_ID);
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
    connectFirestoreEmulator(client, host, Number(port), { mockUserToken: { sub: 'named-owner', user_id: 'named-owner' } });
    try {
      await assertSucceeds(writeProfile(client, profile('named-owner')));
      await assertSucceeds(setDoc(doc(client, 'communityEvents/named-event'), event('named-event', { ownerId: 'named-owner', ownerName: 'named-owner' })));
      await assertFails(setDoc(doc(client, 'communityProfiles/named-other'), profile('named-other')));
      await assertFails(updateDoc(doc(client, 'communityProfiles/named-owner'), { verification: 'verified' }));
    } finally { await deleteApp(app); }
  });
});

describe('Publicaciones e interacciones', { concurrency: false }, () => {
  test('publicación propia válida, autor inmutable y medios con ruta propia', async () => {
    const alice = db('alice');
    await assertSucceeds(setDoc(doc(alice, 'communityPosts/valid'), post('valid')));
    await assertSucceeds(setDoc(doc(alice, 'communityPosts/photo'), post('photo', { kind: 'photo', title: '', mediaPath: 'community/alice/photo.jpg', mediaUrl: 'https://firebasestorage.googleapis.com/v0/b/test/o/community%2Falice%2Fphoto.jpg?alt=media' })));
    for (const [id, changes] of Object.entries({ author: { authorId: 'bob' }, name: { authorName: 'bob' }, blank: { text: '' }, title: { title: '' }, extra: { role: 'ADMIN' }, event: { eventId: 'missing' }, media: { kind: 'photo', mediaPath: 'community/bob/media.jpg', mediaUrl: 'https://firebasestorage.googleapis.com/media' }, tracking: { kind: 'photo', mediaPath: 'community/alice/tracking.jpg', mediaUrl: 'https://tracker.example/image.jpg' } })) {
      await assertFails(setDoc(doc(alice, 'communityPosts', id), post(id, changes)));
    }
    await assertFails(updateDoc(doc(alice, 'communityPosts/valid'), { text: 'Editado' }));
    await assertFails(deleteDoc(doc(db('bob'), 'communityPosts/valid')));
    await assertSucceeds(deleteDoc(doc(db('admin'), 'communityPosts/valid')));
    await assertSucceeds(deleteDoc(doc(alice, 'communityPosts/photo')));
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

describe('Storage: medios públicos, carga propia e inmutabilidad', { concurrency: false }, () => {
  test('carga propia válida, lectura pública y ausencia de enumeración pública', async () => {
    const asset = ref(media('alice'), 'community/alice/photo.jpg');
    await assertSucceeds(uploadBytes(asset, new Uint8Array([1, 2, 3]), { contentType: 'image/jpeg' }));
    await assertSucceeds(getMetadata(ref(media(), 'community/alice/photo.jpg')));
    await assertFails(listAll(ref(media(), 'community/alice')));
    await assertFails(uploadBytes(ref(media(), 'community/visitor/no.jpg'), new Uint8Array([1]), { contentType: 'image/jpeg' }));
    await assertFails(uploadBytes(ref(media('bob'), 'community/alice/cross.jpg'), new Uint8Array([1]), { contentType: 'image/jpeg' }));
    await assertFails(deleteObject(ref(media('bob'), 'community/alice/photo.jpg')));
    await assertSucceeds(deleteObject(asset));
  });

  test('se bloquean MIME incorrecto, extensión falsa, vacío, sobrepeso y sobrescritura', async () => {
    const storage = media('alice');
    await assertFails(uploadBytes(ref(storage, 'community/alice/text.jpg'), new Uint8Array([1]), { contentType: 'text/html' }));
    await assertFails(uploadBytes(ref(storage, 'community/alice/false.jpg'), new Uint8Array([1]), { contentType: 'video/mp4' }));
    await assertFails(uploadBytes(ref(storage, 'community/alice/empty.jpg'), new Uint8Array(), { contentType: 'image/jpeg' }));
    await assertFails(uploadBytes(ref(storage, 'community/alice/large.jpg'), new Uint8Array(10 * 1024 * 1024 + 1), { contentType: 'image/jpeg' }));
    await assertFails(uploadBytes(ref(storage, 'community/alice/large.mp4'), new Uint8Array(50 * 1024 * 1024 + 1), { contentType: 'video/mp4' }));
    const video = ref(storage, 'community/alice/reel.mp4');
    await assertSucceeds(uploadBytes(video, new Uint8Array([1, 2, 3]), { contentType: 'video/mp4' }));
    await assertFails(uploadBytes(video, new Uint8Array([4]), { contentType: 'video/mp4' }));
    await assertFails(updateMetadata(video, { contentType: 'text/html' }));
    await assertSucceeds(deleteObject(ref(media('admin'), 'community/alice/reel.mp4')));
  });
});
