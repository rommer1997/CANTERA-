import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as normalization from '../src/community/normalization.ts';
import * as pilotAccess from '../src/community/pilotAccess.ts';
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
    onSnapshot(target: any, ...args: any[]) {
      const options = typeof args[0] === 'function' ? {} : args.shift();
      const listener = { target, options, next: args[0], error: args[1], stopped: false }; snapshots.push(listener);
      return () => { listener.stopped = true; };
    },
    getDoc: async (target: any) => snapshot(target.path),
    serverTimestamp: () => serverTime,
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
    './policy': { TERMS_VERSION }, './pilotAccess.ts': pilotAccess, './eventPrivacy': { canReadEvent: () => true, isPublicEvent: () => true }, './logic': { requireText: (value: string) => value.trim() }, './normalization': normalization,
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
  async function settle() { for (let attempt = 0; attempt < 5; attempt++) { await new Promise(resolve => setImmediate(resolve)); render(); } return api; }
  render();
  function identity(uid: string, { emailVerified = false, provider = '', admin = false } = {}) {
    return { uid, displayName: '', emailVerified, getIdTokenResult: async () => ({ claims: { admin, email_verified: emailVerified, firebase: { sign_in_provider: provider } } }) };
  }
  return {
    auth, writes, existing, render, settle,
    async identify(uid = 'alpha', options = {}) { const user = identity(uid, options); auth.currentUser = user; await authListener(user); await settle(); },
    async login(uid: string, options = {}) { loginUser = identity(uid, options); await api.login(); await settle(); },
    async runtime(serviceStatus: string, extra = {}) { const value = { serviceStatus, mediaUploadsEnabled: false, contactEmail: '', updatedAt: time, ...extra }; existing.set('communityConfiguration/runtime', value); emit('communityConfiguration/runtime', value); await settle(); },
    emitProfile(uid: string, value: any, pending = false) { emit(`communityProfiles/${uid}`, value, pending); return render(); },
    failProfile(uid: string, error: Error) { snapshots.slice().reverse().find(item => !item.stopped && item.target.path === `communityProfiles/${uid}`)!.error(error); return render(); },
    ownListener(uid = 'alpha') { return snapshots.slice().reverse().find(item => !item.stopped && item.target.path === `communityProfiles/${uid}`); },
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
