import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as invitations from '../src/community/invitations.ts';

const code = 'DME2M8Z4PFA6GF89';
const otherCode = '23456789ABCDEFGH';
const invite = (extra = {}) => ({ id: code, kind: 'connection', ownerId: 'bob', eventId: '', status: 'active', createdAt: new Date().toISOString(), usedBy: '', usedAt: '', ...extra });

// Execute InvitationAcceptance itself: the hook scheduler and controlled lookup
// responses reproduce loading, retry and navigation without mounting Firebase.
function acceptanceHarness(initial = invite()) {
  let cursor = 0, dirty = false, rawCode = code;
  const slots: any[] = [], effects: Array<() => void> = [], cleanups: Array<(() => void) | undefined> = [];
  const watched: string[] = [], retried: string[] = [], accepted: string[] = [], navigated: string[] = [];
  const timers = new Map<number, () => void>(); let nextTimer = 1;
  const lookups: Array<{ code: string; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  const community: any = {
    mode: 'cloud', profile: { id: 'alice', name: 'Mi cuenta' }, serviceAvailable: true,
    runtimeConfig: { serviceStatus: 'pilot' }, publicProfiles: {}, publicProfileStates: {},
    watchPublicProfile(id: string) { watched.push(id); community.publicProfileStates[id] = 'loading'; dirty = true; return () => {}; },
    retryPublicProfile(id: string) { retried.push(id); delete community.publicProfiles[id]; community.publicProfileStates[id] = 'loading'; dirty = true; },
  };
  const api = {
    eligible: true, emailVerified: true,
    lookupInvitation(value: string) { return new Promise((resolve, reject) => lookups.push({ code: value, resolve, reject })); },
    async acceptInvitation(value: string) { accepted.push(value); return initial; },
  };
  const react = {
    lazy: () => 'Lazy', Suspense: 'Suspense',
    useState(value: any) {
      const index = cursor++;
      if (!Object.hasOwn(slots, index)) slots[index] = typeof value === 'function' ? value() : value;
      return [slots[index], (next: any) => { const result = typeof next === 'function' ? next(slots[index]) : next; if (!Object.is(result, slots[index])) { slots[index] = result; dirty = true; } }];
    },
    useRef(value: any) { const index = cursor++; return slots[index] ||= { current: value }; },
    useEffect(effect: () => any, dependencies: unknown[]) {
      const index = cursor++; const previous = slots[index];
      if (!previous || dependencies.some((value, offset) => previous[offset] !== value)) { slots[index] = dependencies; effects.push(() => { cleanups[index]?.(); cleanups[index] = effect(); }); }
    },
  };
  const modules: Record<string, any> = {
    react, 'react/jsx-runtime': { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }), Fragment: 'Fragment' },
    'react-router-dom': { Link: 'Link', useNavigate: () => (path: string) => navigated.push(path) },
    'lucide-react': {}, './CommunityContext': { useCommunity: () => community }, './InvitationsContext': { useInvitations: () => api },
    './MessagingContext': {}, './messagingLogic': {}, './InvitationDialog': {}, './invitations': invitations, './invitations.css': {},
  };
  const source = readFileSync(new URL('../src/community/ConnectionsPage.tsx', import.meta.url), 'utf8') + '\nexport { InvitationAcceptance };';
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: any = {};
  new Function('exports', 'require', 'window', compiled)(exports, (name: string) => modules[name], { setInterval: () => 1, clearInterval() {},
    setTimeout(callback: () => void, milliseconds: number) { assert.equal(milliseconds, 20000); const id = nextTimer++; timers.set(id, callback); return id; },
    clearTimeout(id: number) { timers.delete(id); } });
  let tree: any;
  function render() {
    for (let attempt = 0; attempt < 20; attempt++) {
      dirty = false; cursor = 0; tree = exports.InvitationAcceptance({ rawCode });
      while (effects.length) effects.shift()!();
      if (!dirty) return tree;
    }
    throw new Error('La invitación no alcanzó un render estable.');
  }
  async function settle() { for (let attempt = 0; attempt < 3; attempt++) { await new Promise(resolve => setImmediate(resolve)); render(); } }
  function nodes(node: any): any[] { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(value => nodes(value)); return [node, ...nodes(node.props?.children)]; }
  function text(node: any): string { if (node == null || typeof node === 'boolean') return ''; if (Array.isArray(node)) return node.map(text).join(''); return typeof node === 'object' ? text(node.props?.children) : String(node); }
  render();
  return {
    community, api, watched, retried, accepted, navigated, lookups, render, settle, text: () => text(tree),
    button(label: string) { const button = nodes(tree).find(node => node.type === 'button' && text(node).startsWith(label)); assert.ok(button, `Falta botón: ${label}`); return button; },
    links() { return nodes(tree).filter(node => node.type === 'Link').map(node => node.props.to); },
    async confirm(value = initial) { lookups.at(-1)!.resolve(value); await settle(); },
    profile(id: string, name: string, state = 'ready') { community.publicProfileStates[id] = state; community.publicProfiles[id] = { id, name }; render(); },
    profileFailure(id: string, state: string) { delete community.publicProfiles[id]; community.publicProfileStates[id] = state; render(); },
    changeCode(value: string) { rawCode = value; render(); },
    expireReads() { const current = [...timers.entries()]; for (const [id, callback] of current) { timers.delete(id); callback(); } render(); },
    cleanup() { cleanups.forEach(cleanup => cleanup?.()); },
  };
}

test('no consulta identidades antes de validar el código y bloquea aceptación mientras carga el perfil', async () => {
  const h = acceptanceHarness();
  try {
    h.community.publicProfiles.bob = { id: 'bob', name: 'Nombre en caché' }; h.community.publicProfileStates.bob = 'ready';
    assert.deepEqual(h.watched, []); assert.deepEqual(h.retried, []);
    await h.confirm();
    assert.deepEqual(h.watched, ['bob']); assert.deepEqual(h.retried, ['bob']);
    assert.doesNotMatch(h.text(), /Nombre en caché/); assert.match(h.text(), /Comprobando quién te invita/);
    assert.equal(h.button('Aceptar conexión').props.disabled, true);
    h.button('Aceptar conexión').props.onClick(); assert.deepEqual(h.accepted, []);
    h.profile('bob', 'Perfil confirmado');
    assert.match(h.text(), /Perfil confirmado/); assert.ok(h.links().includes('/people/bob'));
    assert.equal(h.button('Aceptar conexión').props.disabled, false);
    const previousAccept = h.button('Aceptar conexión').props.onClick;
    h.profileFailure('bob', 'missing'); previousAccept(); assert.deepEqual(h.accepted, []);
    h.profile('bob', 'Perfil confirmado');
    h.button('Aceptar conexión').props.onClick(); await h.settle();
    assert.deepEqual(h.accepted, [code]); assert.deepEqual(h.navigated, ['/connect?connected=1']);
  } finally { h.cleanup(); }
});

test('error o perfil retirado bloquean una invitación nueva y permiten reintentar su identidad', async () => {
  for (const state of ['error', 'missing']) {
    const h = acceptanceHarness();
    try {
      await h.confirm(); h.profileFailure('bob', state);
      assert.equal(h.button('Aceptar conexión').props.disabled, true);
      assert.match(h.text(), state === 'error' ? /No pudimos consultar/ : /ya no está disponible/);
      h.button('Volver a comprobar').props.onClick(); h.render();
      assert.deepEqual(h.retried, ['bob', 'bob']); assert.match(h.text(), /Comprobando quién te invita/);
      h.profile('bob', 'Perfil recuperado'); assert.equal(h.button('Aceptar conexión').props.disabled, false);
    } finally { h.cleanup(); }
  }
});

test('el encuentro privado muestra sólo la identidad pública antes de inscribir', async () => {
  const h = acceptanceHarness(invite({ kind: 'event', eventId: 'private-event' }));
  try {
    await h.confirm(); h.profile('bob', 'Organizador público');
    assert.match(h.text(), /Organizador público/); assert.match(h.text(), /Te invita a un encuentro privado/);
    assert.doesNotMatch(h.text(), /private-event/);
    assert.ok(h.links().includes('/people/bob'));
    assert.equal(h.button('Aceptar e inscribirme').props.disabled, false);
  } finally { h.cleanup(); }
});

test('el código ya consumido por la propia cuenta abre su acceso aunque el perfil del creador falte y haya caducado', async () => {
  const h = acceptanceHarness(invite({ kind: 'event', eventId: 'private-event', status: 'used', usedBy: 'alice', createdAt: '2020-01-01T00:00:00.000Z' }));
  try {
    await h.confirm(); h.profileFailure('bob', 'missing');
    assert.match(h.text(), /Puedes abrir el acceso que ya aceptaste/);
    assert.equal(h.button('Abrir mi acceso').props.disabled, false);
    h.button('Abrir mi acceso').props.onClick(); await h.settle();
    assert.deepEqual(h.navigated, ['/play/private-event']);
  } finally { h.cleanup(); }
});

test('cambiar código o cuenta oculta inmediatamente la identidad anterior y descarta callbacks pendientes', async () => {
  const h = acceptanceHarness();
  try {
    await h.confirm(); h.profile('bob', 'Invitador anterior');
    const oldAccept = h.button('Aceptar conexión').props.onClick;
    h.changeCode(otherCode); assert.doesNotMatch(h.text(), /Invitador anterior/);
    oldAccept(); assert.deepEqual(h.accepted, []);
    const pending = h.lookups.at(-1)!;
    h.community.profile = { id: 'another-account', name: 'Otra cuenta' }; h.render();
    pending.resolve(invite({ id: otherCode, ownerId: 'stale-owner' })); await h.settle();
    assert.doesNotMatch(h.text(), /Invitador anterior/); assert.ok(!h.watched.includes('stale-owner'));
    await h.confirm(invite({ id: otherCode, ownerId: 'charlie' }));
    h.profile('bob', 'Callback del anterior'); assert.doesNotMatch(h.text(), /Callback del anterior/);
    assert.equal(h.button('Aceptar conexión').props.disabled, true);
    h.profile('charlie', 'Invitador actual'); assert.match(h.text(), /Invitador actual/);
    assert.ok(h.links().includes('/people/charlie')); assert.ok(!h.links().includes('/people/bob'));
  } finally { h.cleanup(); }
});

test('fallo de consulta de invitación tiene un reintento y nunca consulta el perfil de un código no validado', async () => {
  const h = acceptanceHarness();
  try {
    h.lookups[0].reject(new Error('provider-message')); await h.settle();
    assert.deepEqual(h.watched, []); assert.doesNotMatch(h.text(), /provider-message/);
    h.button('Volver a comprobar invitación').props.onClick(); h.render();
    assert.equal(h.lookups.length, 2); await h.confirm();
    assert.deepEqual(h.watched, ['bob']);
  } finally { h.cleanup(); }
});

test('una lectura que no responde termina con reintento y descarta su resultado tardío', async () => {
  const h = acceptanceHarness();
  try {
    assert.match(h.text(), /Comprobando invitación/); const first = h.lookups[0];
    h.expireReads(); assert.match(h.text(), /comprobación de la invitación está tardando demasiado/);
    assert.deepEqual(h.watched, []); h.button('Volver a comprobar invitación').props.onClick(); h.render();
    assert.equal(h.lookups.length, 2); first.resolve(invite({ ownerId: 'late-owner' })); await h.settle();
    assert.deepEqual(h.watched, []); assert.match(h.text(), /Comprobando invitación/);
    await h.confirm(); h.profile('bob', 'Identidad recuperada'); assert.equal(h.button('Aceptar conexión').props.disabled, false);
  } finally { h.cleanup(); }
});

test('la identidad que sigue cargando ofrece reintento con un plazo nuevo sin permitir aceptación', async () => {
  const h = acceptanceHarness();
  try {
    await h.confirm(); assert.match(h.text(), /Comprobando quién te invita/);
    h.expireReads(); assert.match(h.text(), /comprobación del perfil está tardando demasiado/);
    assert.equal(h.button('Aceptar conexión').props.disabled, true);
    h.button('Volver a comprobar').props.onClick(); h.render();
    assert.deepEqual(h.retried, ['bob', 'bob']); assert.match(h.text(), /Comprobando quién te invita/);
    h.expireReads(); assert.match(h.text(), /comprobación del perfil está tardando demasiado/);
    h.button('Volver a comprobar').props.onClick(); h.render();
    h.profile('bob', 'Identidad confirmada'); assert.equal(h.button('Aceptar conexión').props.disabled, false);
    h.expireReads(); assert.match(h.text(), /Identidad confirmada/); assert.doesNotMatch(h.text(), /tardando demasiado/);
  } finally { h.cleanup(); }
});
