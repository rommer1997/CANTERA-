import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as logic from '../src/community/messagingLogic.ts';

function harness() {
  let cursor = 0;
  const slots: any[] = [];
  const effects: Array<() => void> = [];
  const cleanups: Array<() => void> = [];
  const subscriptions: Array<{ target: any; next: (snapshot: any) => void; error: (error: any) => void; stopped: boolean }> = [];
  const writes: Array<{ kind: string; target: any; value?: any }> = [];
  const listeners = new Map<string, Set<() => void>>();
  const auth = { currentUser: { uid: 'alice', emailVerified: true } };
  const navigator = { onLine: true };
  let route = 'alice:bob';
  const api = { eligible: true, scope: 'cloud:alice:true:bob', uid: 'alice', conversations: [{ id: route, participantIds: ['alice', 'bob'], createdAt: '2026-10-08T12:00:00.000Z' }], actor() { return api.uid; } };
  const react = {
    createContext: () => ({}),
    useContext: () => api,
    useRef(value: any) { const index = cursor++; return slots[index] ||= { current: value }; },
    useState(value: any) {
      const index = cursor++;
      if (!Object.hasOwn(slots, index)) slots[index] = typeof value === 'function' ? value() : value;
      return [slots[index], (next: any) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useEffect(effect: () => (() => void), dependencies: unknown[]) {
      const index = cursor++; const previous = slots[index];
      if (!previous || dependencies.some((value, offset) => previous[offset] !== value)) {
        slots[index] = dependencies;
        effects.push(() => { cleanups[index]?.(); cleanups[index] = effect(); });
      }
    },
    useCallback(callback: () => unknown) { cursor++; return callback; },
  };
  const firestore = {
    collection: (_db: any, ...parts: string[]) => ({ path: parts.join('/') }),
    doc: (_db: any, ...parts: string[]) => parts.length ? { path: parts.join('/') } : { path: `${_db.path}/newMessage00000000000`, id: 'newMessage00000000000' },
    query: (base: any, ...constraints: any[]) => ({ ...base, constraints }),
    orderBy: (field: string, order: string) => ({ type: 'order', field, order }),
    limit: (count: number) => ({ type: 'limit', count }),
    startAfter: (record: any) => ({ type: 'after', id: record.id }),
    onSnapshot(target: any, next: (snapshot: any) => void, error: (error: any) => void) {
      const entry = { target, next, error, stopped: false }; subscriptions.push(entry);
      return () => { entry.stopped = true; };
    },
    serverTimestamp: () => 'serverTimestamp',
    setDoc: async (target: any, value: any) => { writes.push({ kind: 'set', target, value }); },
    deleteDoc: async (target: any) => { writes.push({ kind: 'delete', target }); },
  };
  const source = readFileSync(new URL('../src/community/MessagingContext.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: any = {};
  const modules: Record<string, unknown> = { react, 'react/jsx-runtime': {}, 'firebase/firestore': firestore, '../firebase': { auth, db: {} }, './CommunityContext': {}, './InvitationsContext': {}, './messagingLogic': logic };
  const execute = new Function('exports', 'require', 'window', 'navigator', compiled);
  execute(exports, (name: string) => modules[name], { addEventListener(name: string, callback: () => void) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name)!.add(callback); }, removeEventListener(name: string, callback: () => void) { listeners.get(name)?.delete(callback); } }, navigator);
  function render() {
    cursor = 0; const result = exports.useConversation(route);
    while (effects.length) effects.shift()!();
    return result;
  }
  function conversation() { subscriptions[0].next({ exists: () => true, data: () => ({ id: 'alice:bob', participantIds: ['alice', 'bob'], createdAt: '2026-10-08T12:00:00.000Z' }) }); }
  function records(first: number, last: number) {
    const result = [];
    for (let index = first; index >= last; index--) {
      const id = String(index).padStart(20, '0');
      result.push({ id, data: () => ({ id, senderId: index % 2 ? 'alice' : 'bob', text: `Mensaje ${index}`, createdAt: { toDate: () => new Date(1700000000000 + index), toMillis: () => 1700000000000 + index } }) });
    }
    return result;
  }
  render();
  return { render, subscriptions, writes, api, auth, conversation, records, next(subscription: number, first: number, last: number) { subscriptions[subscription].next({ docs: records(first, last) }); }, removeContact() { api.scope = 'cloud:alice:true:'; api.conversations = []; render(); }, switchUser() { api.scope = 'cloud:carol:true:'; api.uid = 'carol'; api.eligible = false; api.conversations = []; auth.currentUser.uid = 'carol'; route = ''; render(); }, offline() { navigator.onLine = false; listeners.get('offline')?.forEach(callback => callback()); }, cleanup() { cleanups.forEach(cleanup => cleanup?.()); } };
}

test('paginación en vivo realinea cursores al llegar mensajes y retira textos borrados', async () => {
  const h = harness();
  try {
    h.conversation(); h.next(1, 100, 61);
    assert.equal(h.render().messages.length, 40);
    const older = h.render().loadOlder();
    assert.equal(h.subscriptions[2].target.constraints.find((value: any) => value.type === 'after').id, String(61).padStart(20, '0'));
    h.next(2, 60, 21); await older;
    assert.equal(h.render().messages.length, 80);
    h.next(1, 101, 62);
    assert.equal(h.subscriptions[2].stopped, true);
    h.next(3, 61, 22);
    const current = h.render().messages;
    assert.equal(current.length, 80);
    assert.equal(current[0].text, 'Mensaje 22');
    assert.equal(current.at(-1).text, 'Mensaje 101');
    // The replaced second-page listener can finish asynchronously. Its stale
    // failure must not take down the newly subscribed, authorized page.
    h.subscriptions[2].error(new Error('Late cancelled-query failure'));
    assert.equal(h.render().messages.length, 80);
    assert.equal(h.render().error, '');
    h.subscriptions[3].next({ docs: h.records(61, 21).filter(record => record.id !== String(30).padStart(20, '0')) });
    assert.equal(h.render().messages.some((message: any) => message.text === 'Mensaje 30'), false);
  } finally { h.cleanup(); }
});

test('revocación de permisos vacía conversación y detiene todas las páginas antes de permitir envío', async () => {
  const h = harness();
  try {
    h.conversation(); h.next(1, 40, 1);
    assert.equal(h.render().canSend, true);
    h.subscriptions[1].error(new Error('permission-denied private@secret.test'));
    const denied = h.render();
    assert.deepEqual(denied.messages, []); assert.equal(denied.conversation, null); assert.equal(denied.canSend, false);
    assert.equal(h.subscriptions[1].stopped, true);
    assert.equal(denied.error.includes('secret'), false);
    const count = h.subscriptions.length;
    h.conversation();
    assert.equal(h.subscriptions.length, count);
    assert.deepEqual(h.render().messages, []);
    await assert.rejects(denied.sendMessage('No enviar'), logic.MessagingError);
    assert.equal(h.writes.length, 0);
  } finally { h.cleanup(); }
});

test('cambiar identidad corta listeners y descarta respuestas tardías del usuario anterior', () => {
  const h = harness();
  try {
    h.conversation(); h.next(1, 4, 1); assert.equal(h.render().messages.length, 4);
    h.switchUser();
    assert.ok(h.subscriptions.every(subscription => subscription.stopped));
    h.next(1, 40, 1);
    assert.deepEqual(h.render().messages, []);
    assert.equal(h.render().canSend, false);
  } finally { h.cleanup(); }
});

test('retirada de la conexión propia corta el hilo abierto aunque su listener no haya emitido error', () => {
  const h = harness();
  try {
    h.conversation(); h.next(1, 4, 1); assert.equal(h.render().messages.length, 4);
    h.removeContact();
    assert.ok(h.subscriptions.every(subscription => subscription.stopped));
    h.next(1, 40, 1);
    assert.deepEqual(h.render().messages, []);
    assert.equal(h.render().canSend, false);
  } finally { h.cleanup(); }
});

test('sin conexión no se encolan mensajes y retirada propia utiliza borrado físico', async () => {
  const h = harness();
  try {
    h.conversation(); h.next(1, 2, 1); h.offline();
    assert.equal(h.render().canSend, false);
    await assert.rejects(h.render().sendMessage('Hola'), (error: any) => error instanceof logic.MessagingError && error.code === 'offline');
    assert.equal(h.writes.length, 0);
    const id = String(1).padStart(20, '0'); await h.render().deleteMessage(id);
    assert.deepEqual(h.writes, [{ kind: 'delete', target: { path: `communityConversations/alice:bob/messages/${id}` } }]);
  } finally { h.cleanup(); }
});
