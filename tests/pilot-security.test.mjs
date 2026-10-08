import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { arrayUnion, collection, deleteDoc, doc, FieldPath, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';

const projectId = `${process.env.GCLOUD_PROJECT || 'demo-cantera'}-pilot`;
if (!projectId.startsWith('demo-') || !process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Ejecuta sólo dentro de Firebase Emulator Suite con un proyecto demo-.');
const at = () => serverTimestamp();
const terms = '2026-10-08';
const runtime = (overrides = {}) => ({ serviceStatus: 'pilot', mediaUploadsEnabled: false, contactEmail: '', updatedAt: at(), pilotUserIds: ['alice', 'bob'], ...overrides });
const profile = (id, overrides = {}) => ({ id, name: id, bio: '', city: 'Madrid', country: 'España', position: '', team: '', level: 'amateur', adultConfirmed: true, verification: 'unverified', entityType: 'individual', createdAt: at(), acceptedTermsVersion: terms, acceptedTermsAt: at(), ...overrides });
const post = (id = 'post', uid = 'alice') => ({ id, authorId: uid, authorName: uid, kind: 'achievement', text: 'Un logro del piloto.', title: 'Primera prueba', mediaUrl: '', mediaPath: '', createdAt: at(), eventId: '' });
const event = () => {
  const startAtMs = Date.now() + 86400000;
  return { id: 'event', ownerId: 'alice', ownerName: 'alice', title: 'Partido del piloto', type: 'match', format: '7', level: 'amateur', city: 'Madrid', country: 'España', timeZone: 'Europe/Madrid', venue: 'Campo de ensayo', startAt: new Date(startAtMs).toISOString(), startAtMs, capacity: 4, entry: 'players', description: '', status: 'open', tournamentFormat: 'league', participants: {}, participantIds: [], fixtures: [], visibility: 'public', createdAt: at() };
};
let env;
const client = (uid, overrides = {}) => uid ? env.authenticatedContext(uid, { email_verified: true, firebase: { sign_in_provider: 'google.com' }, ...overrides }).firestore() : env.unauthenticatedContext().firestore();
async function seed(path, value) { await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), path), value)); }
async function connect(first = 'alice', second = 'bob') {
  for (const [ownerId, peerId] of [[first, second], [second, first]]) await seed(`communityConnections/${ownerId}/members/${peerId}`, { ownerId, peerId, inviteId: '23456789ABCDEFGH', createdAt: at() });
}
async function thread() {
  await connect();
  const db = client('alice');
  await assertSucceeds(setDoc(doc(db, 'communityConversations/alice:bob'), { id: 'alice:bob', participantIds: ['alice', 'bob'], createdAt: at() }));
  await assertSucceeds(setDoc(doc(db, 'communityConversations/alice:bob/messages/0123456789abcdefghij'), { id: '0123456789abcdefghij', senderId: 'alice', text: '¿Jugamos?', createdAt: at() }));
}

before(async () => { env = await initializeTestEnvironment({ projectId, firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') } }); });
beforeEach(async () => {
  await env.clearFirestore(); await seed('communityConfiguration/runtime', runtime());
  for (const uid of ['alice', 'bob', 'carol', 'admin']) {
    const value = profile(uid); await seed(`communityProfiles/${uid}`, value);
    const { adultConfirmed, acceptedTermsVersion, acceptedTermsAt, ...sports } = value;
    await seed(`communityPublicProfiles/${uid}`, sports);
  }
  await seed('communityEvents/event', event()); await seed('communityPosts/post', post());
  await seed('communityTeams/team', { id: 'team', ownerId: 'alice', name: 'Equipo de ensayo', country: 'España', city: 'Madrid', description: '', level: 'amateur', status: 'active', createdAt: at(), updatedAt: at() });
});
after(async () => { await env?.cleanup(); });

test('piloto administrativo valida de uno a cinco UIDs únicos sin correos y conserva estados anteriores', async () => {
  const admin = client('admin', { admin: true }); const target = doc(admin, 'communityConfiguration/runtime');
  for (const pilotUserIds of [['alice'], ['alice', 'bob', 'carol', 'delta', 'echo']]) await assertSucceeds(setDoc(target, runtime({ pilotUserIds })));
  for (const pilotUserIds of [[], ['alice', 'alice'], ['alice', 'bob', 'carol', 'delta', 'echo', 'foxtrot'], ['bad/uid'], ['person@example.test'], [7]]) await assertFails(setDoc(target, runtime({ pilotUserIds })));
  await assertFails(setDoc(target, { ...runtime(), pilotEmails: ['person@example.test'] }));
  await assertFails(setDoc(target, runtime({ mediaUploadsEnabled: true })));
  const { pilotUserIds, ...missing } = runtime(); await assertFails(setDoc(target, missing));
  await assertFails(setDoc(doc(client('alice'), 'communityConfiguration/runtime'), runtime()));
  for (const serviceStatus of ['setup', 'paused', 'open']) {
    await assertFails(setDoc(target, runtime({ serviceStatus })));
    await assertSucceeds(setDoc(target, { ...missing, serviceStatus }));
  }
});

test('runtime público sólo expone la lista mínima; leer y participar requiere UID inscrito, Google y correo verificado', async () => {
  const actual = (await assertSucceeds(getDoc(doc(client(), 'communityConfiguration/runtime')))).data();
  assert.deepEqual(actual.pilotUserIds, ['alice', 'bob']); assert.ok(!Object.hasOwn(actual, 'pilotEmails'));
  for (const uid of ['alice', 'bob']) {
    const db = client(uid);
    for (const path of ['communityPublicProfiles/alice', 'communityEvents/event', 'communityPosts/post', 'communityTeams/team']) await assertSucceeds(getDoc(doc(db, path)));
    await assertSucceeds(getDocs(query(collection(db, 'communityEvents'), where('visibility', '==', 'public'), orderBy('createdAt', 'desc'), limit(20))));
    await assertSucceeds(getDocs(query(collection(db, 'communityPosts'), orderBy('createdAt', 'desc'), limit(20))));
    await assertSucceeds(getDocs(query(collection(db, 'communityTeams'), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(40))));
    await assertSucceeds(setDoc(doc(db, 'communityPosts', `by-${uid}`), post(`by-${uid}`, uid)));
  }
  for (const db of [client(), client('carol'), client('alice', { email_verified: false }), client('alice', { firebase: { sign_in_provider: 'password' } }), client('alice', { firebase: {} }), client('admin', { admin: true })]) {
    for (const path of ['communityPublicProfiles/alice', 'communityEvents/event', 'communityPosts/post', 'communityTeams/team']) await assertFails(getDoc(doc(db, path)));
    await assertFails(getDocs(query(collection(db, 'communityEvents'), where('visibility', '==', 'public'), limit(20))));
    await assertFails(getDocs(query(collection(db, 'communityPosts'), orderBy('createdAt', 'desc'), limit(20))));
  }
});

test('registro piloto no crea perfiles a excluidos ni atribuye consentimiento a un borrador', async () => {
  await seed('communityConfiguration/runtime', runtime({ pilotUserIds: ['alice', 'newcomer'] }));
  const db = client('newcomer');
  const blank = profile('newcomer', { city: '', country: '', adultConfirmed: false, acceptedTermsVersion: '', acceptedTermsAt: '' });
  await assertSucceeds(setDoc(doc(db, 'communityProfiles/newcomer'), blank));
  await assertFails(setDoc(doc(db, 'communityPosts/new'), post('new', 'newcomer')));
  await assertFails(getDoc(doc(client(), 'communityProfiles/newcomer')));
  await assertFails(setDoc(doc(client('outsider'), 'communityProfiles/outsider'), { ...blank, id: 'outsider', name: 'outsider' }));
  const confirmed = profile('newcomer'); confirmed.createdAt = (await getDoc(doc(db, 'communityProfiles/newcomer'))).data().createdAt;
  const { adultConfirmed, acceptedTermsVersion, acceptedTermsAt, ...sports } = confirmed;
  const batch = writeBatch(db); batch.set(doc(db, 'communityProfiles/newcomer'), confirmed); batch.set(doc(db, 'communityPublicProfiles/newcomer'), sports);
  await assertSucceeds(batch.commit()); await assertSucceeds(setDoc(doc(db, 'communityPosts/new'), post('new', 'newcomer')));
});

test('inscribir un UID no salta términos actuales, mayoría de edad ni suspensión', async () => {
  for (const overrides of [{ adultConfirmed: false }, { acceptedTermsVersion: '2026-10-06' }, { city: '' }]) {
    await seed('communityProfiles/alice', profile('alice', overrides));
    await assertFails(setDoc(doc(client('alice'), 'communityPosts/new'), post('new')));
  }
  await seed('communityProfiles/alice', profile('alice'));
  await seed('communityAccountModeration/alice', { status: 'suspended', reason: 'Ensayo', updatedAt: at() });
  await assertFails(setDoc(doc(client('alice'), 'communityPosts/new'), post('new')));
});

test('chat piloto exige ambos UIDs inscritos y conserva límite de diez dependencias y retirada propia', async () => {
  await thread();
  for (const uid of ['alice', 'bob']) await seed(`communityAccountModeration/${uid}`, { status: 'active', reason: 'Ensayo', updatedAt: at() });
  const target = 'communityConversations/alice:bob/messages/0123456789abcdefghij';
  for (const uid of ['alice', 'bob']) await assertSucceeds(getDoc(doc(client(uid), target)));
  await assertSucceeds(getDocs(query(collection(client('bob'), 'communityConversations/alice:bob/messages'), orderBy('createdAt', 'desc'), orderBy('__name__', 'desc'), limit(40))));
  await seed('communityConfiguration/runtime', runtime({ pilotUserIds: ['alice'] }));
  await assertFails(getDoc(doc(client('alice'), target))); await assertFails(getDoc(doc(client('bob'), target)));
  await assertFails(getDoc(doc(client('admin', { admin: true }), target)));
  await assertSucceeds(deleteDoc(doc(client('alice'), target)));
});

test('un código anterior del organizador excluido no incorpora contactos al piloto', async () => {
  const code = '23456789ABCDEFGH';
  await seed(`communityInvitations/${code}`, { id: code, kind: 'connection', ownerId: 'carol', eventId: '', status: 'active', createdAt: at(), usedBy: '', usedAt: '' });
  await assertFails(getDoc(doc(client('bob'), 'communityInvitations', code)));
  await seed(`communityInvitations/${code}`, { id: code, kind: 'connection', ownerId: 'alice', eventId: '', status: 'active', createdAt: at(), usedBy: '', usedAt: '' });
  await assertSucceeds(getDoc(doc(client('bob'), 'communityInvitations', code)));
  const db = client('bob'); const batch = writeBatch(db);
  for (const [ownerId, peerId] of [['alice', 'bob'], ['bob', 'alice']]) batch.set(doc(db, 'communityConnections', ownerId, 'members', peerId), { ownerId, peerId, inviteId: code, createdAt: at() });
  batch.update(doc(db, 'communityInvitations', code), { status: 'used', usedBy: 'bob', usedAt: at() });
  await assertSucceeds(batch.commit());
});

test('admisión privada piloto de la última plaza une invitación, recibo e inscripción sin lectura previa', async () => {
  const code = '23456789ABCDEFGH';
  const participants = Object.fromEntries(Array.from({ length: 63 }, (_, index) => [`player-${index}`, `Jugador ${index}`]));
  await seed('communityEvents/private', { ...event(), id: 'private', visibility: 'private', capacity: 64, participants, participantIds: Object.keys(participants), rsvps: {} });
  await assertSucceeds(setDoc(doc(client('alice'), 'communityInvitations', code), { id: code, kind: 'event', ownerId: 'alice', eventId: 'private', status: 'active', createdAt: at(), usedBy: '', usedAt: '' }));
  const db = client('bob');
  await assertFails(getDoc(doc(db, 'communityEvents/private')));
  await assertSucceeds(runTransaction(db, async transaction => {
    const target = doc(db, 'communityInvitations', code); await transaction.get(target);
    transaction.set(doc(db, 'communityEventAdmissions/private/members/bob'), { eventId: 'private', userId: 'bob', inviteId: code, createdAt: at() });
    transaction.update(doc(db, 'communityEvents/private'), new FieldPath('participants', 'bob'), 'bob', 'participantIds', arrayUnion('bob'), new FieldPath('rsvps', 'bob'), 'yes');
    transaction.update(target, { status: 'used', usedBy: 'bob', usedAt: at() });
  }));
  const actual = (await assertSucceeds(getDoc(doc(db, 'communityEvents/private')))).data();
  assert.equal(Object.keys(actual.participants).length, 64); assert.equal(actual.participants.bob, 'bob');
  await assertFails(getDoc(doc(client('carol'), 'communityEvents/private')));
});

test('retirar UID corta contenido aunque conserve propiedad, matrícula o rol; derechos y colas siguen operativos', async () => {
  await seed('communityTeamMembers/team_alice', { id: 'team_alice', teamId: 'team', userId: 'alice', name: 'alice', role: 'owner', joinedAt: at() });
  await seed('communityTeamMembers/team_bob', { id: 'team_bob', teamId: 'team', userId: 'bob', name: 'bob', role: 'member', joinedAt: at() });
  await seed('communityConfiguration/runtime', runtime({ pilotUserIds: ['bob'] }));
  for (const path of ['communityEvents/event', 'communityPosts/post', 'communityTeams/team', 'communityTeamMembers/team_bob']) await assertFails(getDoc(doc(client('alice'), path)));
  await assertFails(getDocs(query(collection(client('alice'), 'communityEvents'), where('ownerId', '==', 'alice'))));
  await assertFails(getDocs(query(collection(client('alice'), 'communityTeamMembers'), where('teamId', '==', 'team'))));
  await assertSucceeds(getDoc(doc(client('alice'), 'communityProfiles/alice')));
  await assertSucceeds(setDoc(doc(client('alice'), 'communityRightsRequests/alice_export'), { id: 'alice_export', userId: 'alice', kind: 'export', status: 'pending', createdAt: at(), reviewedAt: '' }));
  await assertSucceeds(deleteDoc(doc(client('alice'), 'communityPosts/post')));
  const admin = client('admin', { admin: true });
  for (const name of ['communityVerifications', 'communityReports', 'communityRightsRequests']) await assertSucceeds(getDocs(collection(admin, name)));
});

test('pausar después del piloto bloquea nuevas acciones y chat; conserva datos privados y bajas propias', async () => {
  await thread();
  await seed('communityConfiguration/runtime', { serviceStatus: 'paused', mediaUploadsEnabled: false, contactEmail: '', updatedAt: at() });
  await assertFails(setDoc(doc(client('alice'), 'communityPosts/new'), post('new')));
  await assertFails(getDocs(query(collection(client('alice'), 'communityPosts'), orderBy('createdAt', 'desc'), limit(20))));
  await assertFails(getDoc(doc(client('alice'), 'communityConversations/alice:bob')));
  await assertSucceeds(getDoc(doc(client('alice'), 'communityProfiles/alice')));
  await assertSucceeds(deleteDoc(doc(client('alice'), 'communityConversations/alice:bob/messages/0123456789abcdefghij')));
  await assertSucceeds(setDoc(doc(client('alice'), 'communityRightsRequests/alice_delete'), { id: 'alice_delete', userId: 'alice', kind: 'delete', status: 'pending', createdAt: at(), reviewedAt: '' }));
});
