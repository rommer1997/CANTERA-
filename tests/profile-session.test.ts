import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as normalization from '../src/community/normalization.ts';
import * as pilotAccess from '../src/community/pilotAccess.ts';
import * as eventPrivacy from '../src/community/eventPrivacy.ts';
import { requireText } from '../src/community/logic.ts';
import { TERMS_VERSION } from '../src/community/policy.ts';

const date = '2026-10-08T12:00:00.000Z';
const time = { toDate: () => new Date(date) };
const serverTime = Symbol('serverTimestamp');
const fixture = (uid: string, extra = {}) => ({ id: uid, name: 'Mi perfil', bio: '', city: '', country: '', position: '', team: '', level: 'amateur', adultConfirmed: false, verification: 'unverified', entityType: 'individual', createdAt: time, acceptedTermsVersion: '', acceptedTermsAt: '', ...extra });

// Execute the actual provider with controlled Auth/Firestore callbacks. This
// reproduces callback ordering and pending serverTimestamp metadata, rather
// than mirroring a separate bootstrap helper or touching cloud/emulator data.
function providerHarness({ buildOpen = true, pilotBuild = false, existing = new Map<string, any>() } = {}) {
  let cursor = 0, dirty = false;
  const slots: any[] = [], effects: Array<() => void> = [], cleanups: Array<(() => void) | undefined> = [];
  const snapshots: Array<{ target: any; options: any; next: (snapshot: any) => void; error: (error: any) => void; stopped: boolean }> = [];
  const writes: Array<{ path: string; value: any }> = [];
  const auth: { currentUser: any } = { currentUser: null };
  let authListener: (user: any) => Promise<void>;
  let loginUser: any;
  let pauseNextRead = false, releaseRead: (() => void) | undefined;
  let pageRows: any[] = [], rejectNextDeletion = false;
  const pausedQueries: Array<(value: any) => void> = [];
  const queries: any[] = [];
  let deferNextQuery = false;
  const noUser = () => {};
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    useState(value: any) {
      const index = cursor++;
      if (!Object.hasOwn(slots, index)) slots[index] = typeof value === 'function' ? value() : value;
      return [slots[index], (next: any) => { const result = typeof next === 'function' ? next(slots[index]) : next; if (!Object.is(result, slots[index])) { slots[index] = result; dirty = true; } }];
    },
    useRef(value: any) { const index = cursor++; return slots[index] ||= { current: value }; },
    useCallback(callback: any, dependencies: unknown[]) {
      const index = cursor++; const previous = slots[index];
      if (!previous || dependencies.some((value, offset) => previous.dependencies[offset] !== value)) slots[index] = { callback, dependencies };
      return slots[index].callback;
    },
    useEffect(effect: () => any, dependencies: unknown[]) {
      const index = cursor++; const previous = slots[index];
      if (!previous || dependencies.some((value, offset) => previous[offset] !== value)) { slots[index] = dependencies; effects.push(() => { cleanups[index]?.(); cleanups[index] = effect(); }); }
    },
  };
  function snapshot(path: string, value = existing.get(path), pending = false) { return { id: path.split('/').at(-1), exists: () => value !== undefined, data: () => value, metadata: { hasPendingWrites: pending, fromCache: false } }; }
  function emit(path: string, value: any, pending = false) { for (const listener of snapshots.filter(item => !item.stopped && item.target.path === path)) listener.next(snapshot(path, value, pending)); }
  const resolve = (value: any, pending: boolean): any => Object.fromEntries(Object.entries(value).map(([key, item]) => [key, item === serverTime ? pending ? null : time : item]));
  async function commit(items: Array<{ path: string; value: any }>) {
    for (const item of items) emit(item.path, resolve(item.value, true), true);
    await Promise.resolve();
    for (const item of items) { const value = resolve(item.value, false); existing.set(item.path, value); writes.push({ path: item.path, value }); emit(item.path, value); }
  }
  const firestore = {
    doc: (_db: any, ...parts: string[]) => ({ path: parts.join('/') }),
    collection: (_db: any, ...parts: string[]) => ({ path: parts.join('/') }),
    query: (target: any, ...constraints: any[]) => ({ ...target, constraints }),
    where: (...args: any[]) => args, orderBy: (...args: any[]) => args, limit: (count: number) => count,
    startAfter: (value: any) => ({ startAfter: value }),
    onSnapshot(target: any, ...args: any[]) {
      const options = typeof args[0] === 'function' ? {} : args.shift();
      const listener = { target, options, next: args[0], error: args[1], stopped: false }; snapshots.push(listener);
      return () => { listener.stopped = true; };
    },
    getDoc: async (target: any) => snapshot(target.path),
    getDocs: async (target: any) => { queries.push(target); if (deferNextQuery) { deferNextQuery = false; return new Promise(resolve => { pausedQueries.push(resolve); }); } const docs = target.path === 'communityPosts' ? pageRows.map(value => snapshot(`communityPosts/${value.id}`, value)) : []; return { docs, size: docs.length }; },
    deleteDoc: async (target: any) => { if (rejectNextDeletion) { rejectNextDeletion = false; throw new Error('delete-rejected'); } existing.delete(target.path); emit(target.path, undefined); },
    serverTimestamp: () => serverTime,
    setDoc: async (target: any, value: any) => commit([{ path: target.path, value }]),
    async runTransaction(_db: any, callback: any) {
      const items: Array<{ path: string; value: any }> = [];
      const result = await callback({ async get(target: any) { if (pauseNextRead) { pauseNextRead = false; await new Promise<void>(resolve => { releaseRead = resolve; }); } return snapshot(target.path); }, set(target: any, value: any) { items.push({ path: target.path, value }); } });
      await commit(items); return result;
    },
    writeBatch() { const items: Array<{ path: string; value: any }> = []; return { set(target: any, value: any) { items.push({ path: target.path, value }); }, commit: () => commit(items) }; },
  };
  const modules: Record<string, unknown> = {
    react, 'react/jsx-runtime': { jsx: (type: any, props: any) => ({ type, props }) },
    'firebase/auth': { onAuthStateChanged: (_auth: any, callback: any) => { authListener = callback; return () => {}; } },
    'firebase/firestore': firestore, 'firebase/storage': {}, '../firebase': { auth, db: {}, storage: {},
      signInWithGoogle: async () => { auth.currentUser = loginUser; await authListener(loginUser); return loginUser; },
      logout: async () => { auth.currentUser = null; await authListener(null); } },
    '../store/useAppStore': { useAppStore: (selector: any) => selector({ setUser: noUser }) },
    './local': {}, './localMediaCache': {}, './coalescedRefresh': {}, './invitationDemo': {},
    './legal': { legalReady: true, operator: { email: 'support@example.test' } }, './fixtureRecords': {}, './deliveryBatches': {},
    './policy': { TERMS_VERSION }, './pilotAccess.ts': pilotAccess, './eventPrivacy': eventPrivacy, './logic': { requireText }, './normalization': normalization,
  };
  const source = readFileSync(new URL('../src/community/CommunityContext.tsx', import.meta.url), 'utf8').replaceAll('import.meta.env.DEV', 'false').replaceAll('import.meta.env.VITE_ENABLE_DEMO', "'false'").replaceAll('import.meta.env.VITE_ENABLE_MEDIA_UPLOADS', "'false'").replaceAll('import.meta.env.VITE_ENABLE_PILOT', pilotBuild ? "'true'" : "'false'").replaceAll('import.meta.env.VITE_SERVICE_OPEN', buildOpen ? "'true'" : "'false'");
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: any = {};
  new Function('exports', 'require', 'localStorage', 'window', compiled)(exports, (name: string) => modules[name], { getItem: () => null, removeItem: () => {} }, { addEventListener() {}, removeEventListener() {} });
  let api: any;
  function render() {
    for (let attempt = 0; attempt < 15; attempt++) {
      dirty = false; cursor = 0; api = exports.CommunityProvider({ children: null }).props.value;
      while (effects.length) effects.shift()!();
      if (!dirty) return api;
    }
    throw new Error('Provider no alcanzó un render estable.');
  }
  function renderBeforeEffects() { dirty = false; cursor = 0; api = exports.CommunityProvider({ children: null }).props.value; return api; }
  async function settle() { for (let attempt = 0; attempt < 5; attempt++) { await new Promise(resolve => setImmediate(resolve)); render(); } return api; }
  render();
  function identity(uid: string, { emailVerified = false, provider = '', admin = false } = {}) {
    return { uid, displayName: '', email: `${uid}@example.test`, emailVerified, getIdTokenResult: async () => ({ claims: { admin, email_verified: emailVerified, firebase: { sign_in_provider: provider } } }) };
  }
  return {
    auth, writes, queries, existing, render, settle,
    async identify(uid = 'alpha', options = {}) { const user = identity(uid, options); auth.currentUser = user; await authListener(user); await settle(); },
    async beginIdentity(uid: string, options = {}) { const user = identity(uid, options); auth.currentUser = user; await authListener(user); return renderBeforeEffects(); },
    async login(uid: string, options = {}) { loginUser = identity(uid, options); await api.login(); await settle(); },
    async runtime(serviceStatus: string, extra = {}) { const value = { serviceStatus, mediaUploadsEnabled: false, contactEmail: '', updatedAt: time, ...extra }; existing.set('communityConfiguration/runtime', value); emit('communityConfiguration/runtime', value); await settle(); },
    emitProfile(uid: string, value: any, pending = false) { emit(`communityProfiles/${uid}`, value, pending); return render(); },
    failProfile(uid: string, error: Error) { snapshots.slice().reverse().find(item => !item.stopped && item.target.path === `communityProfiles/${uid}`)!.error(error); return render(); },
    ownListener(uid = 'alpha') { return snapshots.slice().reverse().find(item => !item.stopped && item.target.path === `communityProfiles/${uid}`); },
    publicListener(uid = 'beta') { return snapshots.slice().reverse().find(item => !item.stopped && item.target.path === `communityPublicProfiles/${uid}`); },
    emitPublicProfile(uid: string, value: any) { emit(`communityPublicProfiles/${uid}`, value); return render(); },
    emitPost(id: string, value: any) { emit(`communityPosts/${id}`, value); return render(); },
    emitPosts(values: any[]) { for (const listener of snapshots.filter(item => !item.stopped && item.target.path === 'communityPosts')) listener.next({ docs: values.map(value => snapshot(`communityPosts/${value.id}`, value)), size: values.length, metadata: { fromCache: false } }); return render(); },
    emitCollection(path: string, values: any[]) { for (const listener of snapshots.filter(item => !item.stopped && item.target.path === path)) listener.next({ docs: values.map(value => snapshot(`${path}/${value.id}`, value)), size: values.length, metadata: { fromCache: false } }); return render(); },
    emitDocument(path: string, value: any) { emit(path, value); return render(); },
    renderBeforeEffects, deferQuery() { deferNextQuery = true; }, releaseQuery(path: string, values: any[]) { const docs = values.map(value => snapshot(`${path}/${value.id}`, value)); pausedQueries.shift()?.({ docs, size: docs.length }); },
    page(values: any[]) { pageRows = values; }, failNextDeletion() { rejectNextDeletion = true; },
    activePaths() { return snapshots.filter(item => !item.stopped).map(item => item.target.path); },
    deferRead() { pauseNextRead = true; }, releaseRead() { releaseRead?.(); },
    cleanup() { cleanups.forEach(cleanup => cleanup?.()); },
  };
}

test('Auth restaurada antes de runtime abierto crea después un único borrador privado sin consentimiento ficticio', async () => {
  const h = providerHarness();
  try {
    await h.identify(); assert.equal(h.writes.length, 0);
    await h.runtime('open');
    assert.equal(h.writes.length, 1); assert.equal(h.writes[0].path, 'communityProfiles/alpha');
    assert.equal(h.writes[0].value.adultConfirmed, false); assert.equal(h.writes[0].value.acceptedTermsVersion, '');
    assert.equal(h.writes[0].value.acceptedTermsAt, ''); assert.equal(h.writes[0].value.city, '');
    assert.equal(h.render().profile.id, 'alpha');
    await h.runtime('paused'); await h.runtime('open');
    assert.equal(h.writes.length, 1);
  } finally { h.cleanup(); }
});

test('registro cerrado por build o runtime no crea borradores de cuentas ordinarias', async () => {
  for (const buildOpen of [false, true]) {
    const h = providerHarness({ buildOpen });
    try {
      await h.identify(); await h.runtime(buildOpen ? 'paused' : 'open');
      assert.equal(h.writes.length, 0);
    } finally { h.cleanup(); }
  }
});

test('restauración conserva perfil existente y nunca reescribe proyección pública o términos antiguos', async () => {
  const old = fixture('alpha', { name: 'Nombre conservado', adultConfirmed: true, city: 'Madrid', country: 'España', acceptedTermsVersion: '2026-10-06', acceptedTermsAt: time });
  const h = providerHarness({ existing: new Map([['communityProfiles/alpha', old]]) });
  try { await h.identify(); await h.runtime('open'); assert.equal(h.writes.length, 0); assert.equal(h.existing.get('communityProfiles/alpha'), old); }
  finally { h.cleanup(); }
});

test('cierre del servicio durante lectura de bootstrap descarta la creación pendiente', async () => {
  const h = providerHarness();
  try {
    await h.identify(); h.deferRead(); await h.runtime('open');
    await h.runtime('paused'); h.releaseRead(); await h.settle(); assert.equal(h.writes.length, 0);
    await h.runtime('open'); assert.equal(h.writes.length, 1);
  } finally { h.cleanup(); }
});

test('cambio de identidad durante bootstrap no escribe ni publica el borrador de la cuenta anterior', async () => {
  const h = providerHarness();
  try {
    await h.identify(); h.deferRead(); await h.runtime('open');
    await h.identify('beta'); await h.runtime('open'); h.releaseRead(); await h.settle();
    assert.deepEqual(h.writes.map(item => item.path), ['communityProfiles/beta']);
  } finally { h.cleanup(); }
});

test('perfil pendiente con serverTimestamp null conserva datos confirmados y no crea error de corrupción', async () => {
  const h = providerHarness();
  try {
    await h.identify(); await h.runtime('open'); const original = h.render().profile;
    assert.equal(h.ownListener()!.options.includeMetadataChanges, true);
    const completed = fixture('alpha', { name: 'Persona real', adultConfirmed: true, city: 'Madrid', country: 'España', acceptedTermsVersion: TERMS_VERSION, acceptedTermsAt: time });
    let api = h.emitProfile('alpha', { ...completed, acceptedTermsAt: null }, true);
    assert.deepEqual(api.profile, original); assert.equal(api.error, '');
    api = h.emitProfile('alpha', completed);
    assert.equal(api.profile.name, 'Persona real'); assert.equal(api.error, '');
    api = h.emitProfile('alpha', { ...completed, name: '' });
    assert.equal(api.profile, null); assert.match(api.error, /datos no válidos/);
    api = h.emitProfile('alpha', completed); assert.equal(api.error, '');
    h.failProfile('alpha', new Error('Incidencia distinta'));
    api = h.emitProfile('alpha', completed); assert.equal(api.error, 'Incidencia distinta');
  } finally { h.cleanup(); }
});

test('guardar perfil con aceptación nueva tolera proyección local pendiente hasta confirmar el lote', async () => {
  const h = providerHarness();
  try {
    await h.identify(); await h.runtime('open');
    const api = h.render(); const { id, createdAt, verification, ...input } = api.profile;
    await api.saveProfile({ ...input, name: 'Persona real', city: 'Madrid', country: 'España', adultConfirmed: true, acceptedTermsVersion: TERMS_VERSION, acceptedTermsAt: date });
    await h.settle();
    assert.equal(h.render().profile.acceptedTermsVersion, TERMS_VERSION); assert.equal(h.render().error, '');
    assert.deepEqual(h.writes.slice(1).map(item => item.path), ['communityProfiles/alpha', 'communityPublicProfiles/alpha']);
  } finally { h.cleanup(); }
});

test('el primer render de otra identidad oculta perfil y datos privados antes de ejecutar efectos', async () => {
  const h = providerHarness();
  try {
    await h.runtime('open'); const stopPublicHistory = h.render().watchEventHistory('public-event');
    h.emitCollection('communityEventChanges', [{ id: 'public-event_1', revision: 1, summary: 'Cambio público', createdAt: time }]);
    assert.equal(h.render().eventHistories['public-event'][0].summary, 'Cambio público'); stopPublicHistory();
    await h.identify(); await h.runtime('open');
    h.emitCollection('communityRightsRequests', [{ id: 'alpha_export', userId: 'alpha', kind: 'export', status: 'pending', createdAt: time, reviewedAt: '' }]);
    h.emitCollection('communityEventNotices', [{ id: 'private-notice', eventId: 'private-event', recipientId: 'alpha', revision: 1, title: 'Convocatoria privada', summary: 'Aviso propio', createdAt: time, readAt: '' }]);
    h.emitCollection('communityBlocks', [{ id: 'alpha_block', ownerId: 'alpha', blockedId: 'private-peer' }]);
    h.emitDocument('communityVerifications/alpha', { id: 'alpha', userId: 'alpha', name: 'Mi perfil', organization: 'Persona', evidence: 'Información privada', status: 'pending', createdAt: time, reviewedAt: '' });
    const original = h.render(), oldListener = h.ownListener()!;
    assert.equal(original.profile.id, 'alpha'); assert.equal(original.accountEmail, 'alpha@example.test'); assert.equal(original.rightsRequests.length, 1);
    assert.equal(original.eventNotices.length, 1); assert.equal(original.verificationRequests.length, 1); assert.deepEqual(original.blockedIds, ['private-peer']);
    h.auth.currentUser = { ...h.auth.currentUser, uid: 'beta' };
    const beforeAuth = h.renderBeforeEffects();
    assert.equal(beforeAuth.profile, null); assert.equal(beforeAuth.accountEmail, null); assert.deepEqual(beforeAuth.rightsRequests, []); assert.deepEqual(beforeAuth.eventNotices, []);
    assert.deepEqual(beforeAuth.verificationRequests, []); assert.deepEqual(beforeAuth.blockedIds, []);
    const beforeEffects = await h.beginIdentity('beta');
    assert.equal(beforeEffects.profile, null); assert.deepEqual(beforeEffects.rightsRequests, []); assert.equal(beforeEffects.accountModeration, null);
    oldListener.next({ id: 'alpha', exists: () => true, data: () => fixture('alpha', { bio: 'Callback anterior' }), metadata: { hasPendingWrites: false } });
    assert.equal(h.renderBeforeEffects().profile, null);
    await h.settle(); await h.runtime('open');
    assert.equal(h.render().profile.id, 'beta'); assert.equal(h.render().accountEmail, 'beta@example.test'); assert.deepEqual(h.render().rightsRequests, []); assert.deepEqual(h.render().eventNotices, []);
  } finally { h.cleanup(); }
});

test('una página administrativa pendiente no reincorpora datos privados después de cambiar de cuenta', async () => {
  const h = providerHarness();
  try {
    await h.identify('alpha', { admin: true }); await h.runtime('open');
    h.emitProfile('alpha', h.existing.get('communityProfiles/alpha')); h.deferQuery();
    const pending = h.render().loadMoreAdminQueue('rights');
    await h.beginIdentity('beta'); await h.settle(); await h.runtime('open');
    h.releaseQuery('communityRightsRequests', [{ id: 'another_export', userId: 'another', kind: 'export', status: 'pending', createdAt: time, reviewedAt: '' }]);
    await pending; await h.settle();
    assert.equal(h.render().profile.id, 'beta'); assert.equal(h.render().isAdmin, false); assert.deepEqual(h.render().adminRightsRequests, []);
    assert.deepEqual(h.render().reports, []); assert.deepEqual(h.render().verificationRequests, []);
  } finally { h.cleanup(); }
});

test('volver a una cuenta administradora renueva su paginación y descarta una página de la sesión anterior', async () => {
  const h = providerHarness();
  const request = (id: string) => ({ id, userId: id, kind: 'export', status: 'pending', createdAt: time, reviewedAt: '' });
  try {
    await h.identify('alpha', { admin: true }); await h.runtime('open');
    h.emitProfile('alpha', h.existing.get('communityProfiles/alpha'));
    h.emitCollection('communityRightsRequests', [request('old-cursor')]);
    h.deferQuery(); const oldPage = h.render().loadMoreAdminQueue('rights');
    assert.equal(h.render().adminQueueLoading.rights, true);
    assert.ok(h.queries.at(-1).constraints.some((constraint: any) => constraint?.startAfter?.id === 'old-cursor'));

    await h.identify('beta'); await h.runtime('open');
    await h.identify('alpha', { admin: true }); await h.runtime('open');
    h.emitProfile('alpha', h.existing.get('communityProfiles/alpha'));
    assert.equal(h.render().adminQueueLoading.rights, false);
    assert.deepEqual(h.render().adminRightsRequests, []);
    h.deferQuery(); const freshPage = h.render().loadMoreAdminQueue('rights');
    assert.equal(h.render().adminQueueLoading.rights, true);
    assert.equal(h.queries.length, 2);
    assert.ok(!h.queries.at(-1).constraints.some((constraint: any) => constraint?.startAfter));

    h.releaseQuery('communityRightsRequests', [request('stale-page')]); await oldPage; await h.settle();
    assert.deepEqual(h.render().adminRightsRequests, []);
    assert.equal(h.render().adminQueueLoading.rights, true);
    await h.render().loadMoreAdminQueue('rights'); assert.equal(h.queries.length, 2);
    h.releaseQuery('communityRightsRequests', [request('fresh-page')]); await freshPage; await h.settle();
    assert.deepEqual(h.render().adminRightsRequests.map((value: any) => value.id), ['fresh-page']);
    assert.equal(h.render().adminQueueLoading.rights, false);
  } finally { h.cleanup(); }
});

const verifiedGoogle = { emailVerified: true, provider: 'google.com' };

test('el piloto crea sólo un borrador privado para la identidad Google autorizada sin aceptar términos', async () => {
  const h = providerHarness({ buildOpen: false, pilotBuild: true });
  try {
    await h.identify('alpha', verifiedGoogle);
    await h.runtime('pilot', { pilotUserIds: ['alpha', 'beta'] });
    const api = h.render();
    assert.equal(api.serviceAvailable, true); assert.equal(api.runtimeConfig.serviceStatus, 'pilot');
    assert.equal(api.pilotEnabled, true); assert.equal(api.demoEnabled, false); assert.equal(api.mediaUploadsEnabled, false);
    assert.deepEqual(h.writes.map(item => item.path), ['communityProfiles/alpha']);
    assert.equal(api.profile.adultConfirmed, false); assert.equal(api.profile.acceptedTermsVersion, '');
    assert.equal(api.profile.acceptedTermsAt, ''); assert.equal(api.profile.city, '');
    assert.ok(h.activePaths().includes('communityEvents'));
  } finally { h.cleanup(); }
});

test('el piloto excluye otras cuentas, correo sin verificar, proveedor distinto y admin fuera de lista', async () => {
  for (const [uid, identity] of [['outsider', verifiedGoogle], ['alpha', { emailVerified: false, provider: 'google.com' }], ['alpha', { emailVerified: true, provider: 'password' }], ['outsider', { ...verifiedGoogle, admin: true }]] as const) {
    const h = providerHarness({ buildOpen: false, pilotBuild: true });
    try {
      await h.identify(uid, identity); await h.runtime('pilot', { pilotUserIds: ['alpha'] });
      assert.equal(h.render().serviceAvailable, false); assert.equal(h.writes.length, 0);
      assert.equal(h.activePaths().includes('communityEvents'), false);
      assert.equal(h.activePaths().includes('communityPosts'), false);
      assert.deepEqual(h.render().profiles, []); assert.deepEqual(h.render().publicProfiles, {});
    } finally { h.cleanup(); }
  }
});

test('ni un runtime piloto sin build autorizado ni un runtime abierto habilitan una compilación piloto', async () => {
  for (const [pilotBuild, status] of [[false, 'pilot'], [true, 'open'], [true, 'paused']] as const) {
    const h = providerHarness({ buildOpen: false, pilotBuild });
    try {
      await h.identify('alpha', verifiedGoogle);
      await h.runtime(status, status === 'pilot' ? { pilotUserIds: ['alpha'] } : {});
      assert.equal(h.render().serviceAvailable, false); assert.equal(h.writes.length, 0);
    } finally { h.cleanup(); }
  }
});

test('retirar el UID durante bootstrap de piloto descarta la escritura y cierra las consultas', async () => {
  const h = providerHarness({ buildOpen: false, pilotBuild: true });
  try {
    await h.identify('alpha', verifiedGoogle); h.deferRead();
    await h.runtime('pilot', { pilotUserIds: ['alpha', 'beta'] });
    await h.runtime('pilot', { pilotUserIds: ['beta'] });
    h.releaseRead(); await h.settle();
    assert.equal(h.writes.length, 0); assert.equal(h.render().serviceAvailable, false);
    assert.equal(h.activePaths().includes('communityEvents'), false);
    await h.runtime('pilot', { pilotUserIds: ['alpha', 'beta'] });
    assert.deepEqual(h.writes.map(item => item.path), ['communityProfiles/alpha']);
  } finally { h.cleanup(); }
});

test('entrar con Google sin autorización cierra la sesión y no crea perfil aunque exista la identidad Auth', async () => {
  const h = providerHarness({ buildOpen: false, pilotBuild: true });
  try {
    await h.runtime('pilot', { pilotUserIds: ['alpha'] });
    await assert.rejects(h.login('outsider', verifiedGoogle), /todavía no está autorizada para el piloto privado/);
    await h.settle();
    assert.equal(h.auth.currentUser, null); assert.equal(h.writes.length, 0);
    assert.equal(h.render().serviceAvailable, false);
  } finally { h.cleanup(); }
});

test('reintentar un perfil compartido vacía la caché, revoca callbacks antiguos y conserva los dos suscriptores', async () => {
  const h = providerHarness();
  try {
    await h.runtime('open');
    const first = h.render().watchPublicProfile('beta');
    const second = h.render().watchPublicProfile('beta');
    const old = h.publicListener('beta')!;
    h.emitPublicProfile('beta', fixture('beta', { name: 'Nombre anterior' }));
    assert.equal(h.render().publicProfiles.beta.name, 'Nombre anterior');
    h.render().retryPublicProfile('beta');
    const current = h.publicListener('beta')!;
    assert.notEqual(current, old); assert.equal(old.stopped, true);
    assert.equal(h.render().publicProfiles.beta, undefined);
    assert.equal(h.render().publicProfileStates.beta, 'loading');
    old.next({ id: 'beta', exists: () => true, data: () => fixture('beta', { name: 'Callback viejo' }) });
    old.error(new Error('Error viejo'));
    assert.equal(h.render().publicProfiles.beta, undefined);
    assert.equal(h.render().publicProfileStates.beta, 'loading');
    h.emitPublicProfile('beta', fixture('beta', { name: 'Nombre confirmado' }));
    assert.equal(h.render().publicProfiles.beta.name, 'Nombre confirmado');
    first(); assert.equal(current.stopped, false);
    second(); assert.equal(current.stopped, true);
    first(); second(); assert.equal(h.publicListener('beta'), undefined);
  } finally { h.cleanup(); }
});

test('un listener de perfil fallido se puede renovar sin duplicar consultas y sin conservar el dato anterior', async () => {
  const h = providerHarness();
  try {
    await h.runtime('open'); const release = h.render().watchPublicProfile('beta');
    const old = h.publicListener('beta')!;
    old.error(new Error('network-error'));
    assert.equal(h.render().publicProfileStates.beta, 'error');
    h.render().retryPublicProfile('beta');
    const fresh = h.publicListener('beta')!;
    assert.notEqual(fresh, old);
    assert.equal(h.activePaths().filter(path => path === 'communityPublicProfiles/beta').length, 1);
    h.emitPublicProfile('beta', fixture('beta', { name: 'Perfil recuperado' }));
    assert.equal(h.render().publicProfileStates.beta, 'ready');
    assert.equal(h.render().publicProfiles.beta.name, 'Perfil recuperado');
    release(); assert.equal(fresh.stopped, true);
  } finally { h.cleanup(); }
});

test('reintentar un perfil sin suscriptores o con el servicio cerrado no crea listeners persistentes', async () => {
  const h = providerHarness();
  try {
    await h.runtime('open'); h.render().retryPublicProfile('beta');
    assert.equal(h.publicListener('beta'), undefined);
    const release = h.render().watchPublicProfile('beta'); const current = h.publicListener('beta')!;
    await h.runtime('paused'); h.render().retryPublicProfile('beta');
    assert.equal(h.publicListener('beta'), current);
    release(); assert.equal(current.stopped, true);
    h.render().retryPublicProfile('../other'); assert.equal(h.activePaths().some(path => path.includes('../other')), false);
  } finally { h.cleanup(); }
});

test('createPost guarda texto sin título ni medios y conserva validaciones de logros, archivos y términos', async () => {
  const h = providerHarness();
  try {
    await h.identify(); await h.runtime('open');
    const completed = fixture('alpha', { name: 'Mi cuenta', adultConfirmed: true, city: 'Madrid', country: 'España', acceptedTermsVersion: TERMS_VERSION, acceptedTermsAt: time });
    const api = h.emitProfile('alpha', completed);
    const input = { kind: 'post' as const, text: ' Mi publicación de texto ', title: '', eventId: '' };
    const id = await api.createPost(input); await h.settle();
    const record = h.writes.find(write => write.path === `communityPosts/${id}`)!;
    assert.equal(record.value.kind, 'post'); assert.equal(record.value.text, 'Mi publicación de texto');
    assert.equal(record.value.title, ''); assert.equal(record.value.mediaPath, ''); assert.equal(record.value.mediaUrl, '');
    assert.equal(record.value.authorId, 'alpha'); assert.equal(record.value.authorName, 'Mi cuenta');
    await assert.rejects(api.createPost({ ...input, text: '' }), /Texto/);
    await assert.rejects(api.createPost({ ...input, text: 'x'.repeat(2001) }), /Texto/);
    await assert.rejects(api.createPost({ ...input, title: 'x'.repeat(101) }), /Título/);
    await assert.rejects(api.createPost({ ...input, kind: 'achievement' }), /Logro/);
    await assert.rejects(api.createPost({ ...input, file: { type: 'image/png', size: 1 } }), /no admiten archivos/);
    for (const kind of ['photo', 'reel']) await assert.rejects(api.createPost({ ...input, kind }), /patrocinio/);
    assert.equal(h.writes.filter(write => write.path.startsWith('communityPosts/')).length, 1);
    h.emitProfile('alpha', { ...completed, acceptedTermsVersion: '2026-10-07' });
    await assert.rejects(h.render().createPost(input), /términos actuales/);
  } finally { h.cleanup(); }
});

test('createPost de texto impide enlazar un encuentro privado igual que un logro', async () => {
  const h = providerHarness();
  try {
    await h.identify(); await h.runtime('open');
    const api = h.emitProfile('alpha', fixture('alpha', { adultConfirmed: true, city: 'Madrid', country: 'España', acceptedTermsVersion: TERMS_VERSION, acceptedTermsAt: time }));
    const startAt = new Date(Date.now() + 86_400_000).toISOString();
    const event = { id: 'private', ownerId: 'alpha', ownerName: 'Mi perfil', title: 'Prueba privada', visibility: 'private', type: 'match', format: '7', level: 'amateur', city: 'Madrid', country: 'España', timeZone: 'Europe/Madrid', venue: 'Campo', startAt, capacity: 4, entry: 'players', description: '', status: 'open', tournamentFormat: 'league', participants: {}, fixtures: [], createdAt: time };
    h.existing.set('communityEvents/private', event);
    await assert.rejects(api.createPost({ kind: 'post', text: 'Texto público', title: '', eventId: 'private' }), /sólo puedes asociar un encuentro público/);
    assert.equal(h.writes.some(write => write.path.startsWith('communityPosts/')), false);
  } finally { h.cleanup(); }
});

test('borrar un post de texto de una página antigua retira su tarjeta y enlace sólo después de confirmar Firebase', async () => {
  const h = providerHarness(); let stop: (() => void) | undefined;
  try {
    await h.identify(); await h.runtime('open');
    const api = h.emitProfile('alpha', fixture('alpha', { adultConfirmed: true, city: 'Madrid', country: 'España', acceptedTermsVersion: TERMS_VERSION, acceptedTermsAt: time }));
    const older = { id: 'older', authorId: 'alpha', authorName: 'Mi perfil', kind: 'post', title: '', text: 'Publicación de una página anterior', mediaUrl: '', mediaPath: '', createdAt: time, eventId: '' };
    const latest = { ...older, id: 'latest', text: 'La publicación reciente permanece' };
    h.existing.set('communityPosts/older', older); h.page([older]);
    await api.loadMorePosts(true); h.emitPosts([latest]);
    stop = h.render().watchPost('older'); h.emitPost('older', older);
    assert.deepEqual(h.render().posts.map((item: any) => item.id).sort(), ['latest', 'older']);
    assert.equal(h.render().linkedPostStates.older, 'ready');
    h.failNextDeletion(); await assert.rejects(h.render().deletePost('older'), /delete-rejected/);
    assert.ok(h.render().posts.some((item: any) => item.id === 'older'));
    assert.equal(h.render().linkedPostStates.older, 'ready');
    await h.render().deletePost('older'); h.render();
    assert.deepEqual(h.render().posts.map((item: any) => item.id), ['latest']);
    assert.equal(h.render().linkedPostStates.older, 'missing');
    assert.equal(h.existing.has('communityPosts/older'), false);
  } finally { stop?.(); h.cleanup(); }
});
