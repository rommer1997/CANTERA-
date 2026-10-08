import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { canteraShell, shellServiceWorkerSource } from '../scripts/pwa-plugin.ts';

const origin = 'https://cantera.example';
const previousVersion = '1111111111111111';
const currentVersion = '2222222222222222';
const futureVersion = '3333333333333333';
const currentFiles = ['index.html', 'assets/index-NEW12345.js'];
const oldLazyAsset = 'assets/EventsPage-OLD12345.js';
const metadataUrl = `${origin}/.cantera-shell-manifest`;
const cacheName = (version: string) => `cantera-shell-${version}`;

function workerHarness() {
 type Client = { id: string; url: string; messages: unknown[]; postMessage(data: unknown): void };
 const clients: Client[] = [];
 const buckets = new Map<string, Map<string, Response>>();
 const listeners = new Map<string, (event: any) => void>();
 const fetched: string[] = [];
 const deleted: string[] = [];
 const caches = {
  async keys() { return [...buckets.keys()]; },
  async delete(name: string) { deleted.push(name); return buckets.delete(name); },
  async open(name: string) {
   if (!buckets.has(name)) buckets.set(name, new Map());
   const records = buckets.get(name)!;
   return {
    async match(input: string | Request) { return records.get(typeof input === 'string' ? input : input.url)?.clone(); },
    async keys() { return [...records.keys()].map(url => new Request(url)); },
    async put(input: string | Request, response: Response) { records.set(typeof input === 'string' ? input : input.url, response.clone()); },
    async addAll(urls: string[]) { for (const url of urls) records.set(url, new Response(`compiled:${url}`)); },
   };
  },
 };
 runInNewContext(shellServiceWorkerSource(currentFiles, currentVersion), {
  URL, Request, Response, caches,
  self: {
   location: { href: `${origin}/sw.js` },
   addEventListener: (type: string, callback: (event: any) => void) => listeners.set(type, callback),
   clients: { matchAll: async () => clients, claim: async () => {} },
   skipWaiting: async () => {},
  },
  fetch: async (request: Request) => { fetched.push(request.url); return new Response(`network:${request.url}`); },
 });
 async function dispatch(type: string, fields: Record<string, unknown> = {}) {
  const promises: Promise<unknown>[] = [];
  let response: Promise<Response> | undefined;
  listeners.get(type)!({ ...fields, waitUntil: (promise: Promise<unknown>) => promises.push(promise), respondWith: (promise: Promise<Response>) => { response = promise; } });
  const result = response ? await response : undefined;
  await Promise.all(promises);
  return result;
 }
 async function seed(version: string, files: string[], manifest: boolean | object = true) {
  const cache = await caches.open(cacheName(version));
  await cache.addAll(files.map(file => `${origin}/${file}`));
  if (manifest) await cache.put(metadataUrl, new Response(JSON.stringify(manifest === true ? { version, files, predecessors: [] } : manifest)));
 }
 function client(id: string) {
  const value: Client = { id, url: `${origin}/#/feed`, messages: [], postMessage(data) { this.messages.push(data); } };
  clients.push(value);
  return value;
 }
 return {
  clients, buckets, fetched, deleted, seed, client,
  install: () => dispatch('install'), activate: () => dispatch('activate'),
  report: (client: Client, version: string) => dispatch('message', { source: client, data: { type: 'CLIENT_SHELL_VERSION', version } }),
  request: (url: string, method = 'GET') => dispatch('fetch', { request: new Request(url, { method }) }),
 };
}

test('una pestaña anterior conserva sus módulos lazy al activar una nueva versión', async () => {
 const state = workerHarness();
 await state.seed(previousVersion, ['index.html', oldLazyAsset]);
 const oldTab = state.client('old-tab');
 await state.install();
 await state.activate();
 assert.ok(state.buckets.has(cacheName(previousVersion)), 'el cliente sin identificar conserva su shell');
 assert.deepEqual(JSON.parse(JSON.stringify(oldTab.messages)), [{ type: 'SHELL_VERSION_REQUEST', version: currentVersion }]);
 await state.report(oldTab, previousVersion);
 const response = await state.request(`${origin}/${oldLazyAsset}`);
 assert.equal(await response!.text(), `compiled:${origin}/${oldLazyAsset}`);
 assert.equal(state.fetched.length, 0);
 assert.ok(state.buckets.has(cacheName(previousVersion)));
 const current = await state.request(`${origin}/${currentFiles[1]}`);
 assert.equal(await current!.text(), `compiled:${origin}/${currentFiles[1]}`);
});

test('las cachés anteriores se eliminan al actualizar o cerrar sus últimas pestañas', async () => {
 for (const transition of ['reload', 'close']) {
  const state = workerHarness();
  await state.seed(previousVersion, [oldLazyAsset]);
  const oldTab = state.client('old-tab');
  const newTab = state.client('new-tab');
  await state.install();
  await state.activate();
  await state.report(oldTab, previousVersion);
  await state.report(newTab, currentVersion);
  assert.ok(state.buckets.has(cacheName(previousVersion)));
  if (transition === 'reload') await state.report(oldTab, currentVersion);
  else { state.clients.splice(state.clients.indexOf(oldTab), 1); await state.request(`${origin}/${currentFiles[1]}`); }
  assert.equal(state.buckets.has(cacheName(previousVersion)), false, transition);
  assert.ok(state.buckets.has(cacheName(currentVersion)));
 }
});

test('la poda no borra la precaché de un worker más reciente que todavía espera activarse', async () => {
 const state = workerHarness();
 await state.seed(previousVersion, [oldLazyAsset]);
 const tab = state.client('tab');
 await state.install();
 await state.seed(futureVersion, ['assets/index-FUT12345.js']);
 await state.activate();
 await state.report(tab, currentVersion);
 assert.equal(state.buckets.has(cacheName(previousVersion)), false);
 assert.ok(state.buckets.has(cacheName(futureVersion)), 'una caché instalada después no es antecesora de este worker');
});

test('Firebase, cuentas, medios, consultas y escrituras quedan fuera de la política de caché', async () => {
 const state = workerHarness();
 await state.install();
 for (const url of [
  'https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?database=cantera',
  'https://identitytoolkit.googleapis.com/v1/accounts:lookup',
  'https://firebasestorage.googleapis.com/v0/b/cantera/o/video.mp4',
  `${origin}/communityEvents/private-event`, `${origin}/uploads/video.mp4`,
  `${origin}/__/auth/handler`, `${origin}/${oldLazyAsset}?user=private`,
 ]) assert.equal(await state.request(url), undefined, url);
 assert.equal(await state.request(`${origin}/${currentFiles[1]}`, 'POST'), undefined);
 assert.equal(state.fetched.length, 0, 'estas solicitudes siguen directamente al navegador');
 assert.deepEqual(state.deleted, []);
});

test('el fallback exige un archivo con hash y la entrada exacta de un manifiesto estático válido', async () => {
 const state = workerHarness();
 const tab = state.client('legacy-tab');
 await state.seed(previousVersion, [oldLazyAsset, 'assets/private-HID12345.js'], { files: [oldLazyAsset], predecessors: [] });
 state.buckets.set('cantera-shell-user-content', new Map([[`${origin}/assets/private-ALT12345.js`, new Response('private')]]));
 await state.install();
 await state.activate();
 await state.report(tab, previousVersion);
 for (const asset of ['assets/private-HID12345.js', 'assets/private-ALT12345.js', 'assets/missing-NON12345.js']) {
  const response = await state.request(`${origin}/${asset}`);
  assert.equal(await response!.text(), `network:${origin}/${asset}`);
  assert.equal(state.buckets.get(cacheName(currentVersion))!.has(`${origin}/${asset}`), false, 'el fallback no precachea contenido desconocido');
 }
 assert.equal(await state.request(`${origin}/assets/private.js`), undefined);
 assert.ok(state.buckets.has('cantera-shell-user-content'), 'las cachés ajenas no se consultan ni eliminan');
});

test('las cachés del worker anterior sin metadatos permiten únicamente sus assets compilados existentes', async () => {
 const state = workerHarness();
 state.client('legacy-tab');
 await state.seed(previousVersion, [oldLazyAsset, 'communityEvents/private-event'], false);
 await state.install();
 await state.activate();
 assert.equal(await (await state.request(`${origin}/${oldLazyAsset}`))!.text(), `compiled:${origin}/${oldLazyAsset}`);
 assert.equal(await state.request(`${origin}/communityEvents/private-event`), undefined);
});

test('el HTML y el worker emitidos llevan la misma versión para el handshake de pestañas', () => {
 const plugin = canteraShell();
 const emitted: any[] = [];
 const bundle: any = {
  'index.html': { type: 'asset', source: '<html><head></head><body></body></html>' },
  'assets/index-NEW12345.js': { type: 'chunk', code: 'export const app = true;' },
 };
 const generate = plugin.generateBundle as { handler: Function };
 generate.handler.call({ emitFile: (file: unknown) => emitted.push(file) }, {}, bundle);
 const version = bundle['index.html'].source.match(/name="cantera-shell-version" content="([0-9a-f]{16})"/)?.[1];
 assert.ok(version);
 assert.equal(emitted[0].fileName, 'sw.js');
 assert.ok(emitted[0].source.includes(`const VERSION="${version}"`));
});

function availabilityHarness(waiting: boolean, controlled = true) {
 const states: any[] = [];
 let cursor = 0;
 let mounted = false;
 let effect: (() => () => void) | undefined;
 let reloads = 0;
 const workerMessages: any[] = [];
 const listeners = new Map<string, Function>();
 const registrationListeners = new Map<string, Function>();
 const windowListeners = new Map<string, Function>();
 const worker = { postMessage: (data: unknown) => workerMessages.push(data) };
 const registration = { waiting: waiting ? worker : null, installing: null, update: async () => {}, addEventListener: (type: string, fn: Function) => registrationListeners.set(type, fn), removeEventListener: (type: string) => registrationListeners.delete(type) };
 const serviceWorker = {
  controller: controlled ? worker : null,
  register: async () => registration,
  addEventListener: (type: string, fn: Function) => listeners.set(type, fn),
  removeEventListener: (type: string) => listeners.delete(type),
 };
 const jsx = (type: unknown, props: unknown) => ({ type, props });
 const hooks = {
  useState(initial: any) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], (next: any) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
  useRef(initial: any) { const index = cursor++; if (!(index in states)) states[index] = { current: initial }; return states[index]; },
  useEffect(fn: () => () => void) { if (!mounted) effect = fn; },
 };
 const source = readFileSync(new URL('../src/community/AppAvailability.tsx', import.meta.url), 'utf8').replaceAll('import.meta.env.PROD', 'true').replaceAll('import.meta.env.BASE_URL', "'./'");
 const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
 const exports: Record<string, Function> = {};
 runInNewContext(compiled, {
  exports,
  require: (name: string) => {
   if (name === 'react') return hooks;
   if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
   if (name === 'lucide-react') return { RefreshCw: 'icon', WifiOff: 'icon' };
   if (name === './InstallRecommendation') return { InstallRecommendation: 'install-recommendation' };
   throw new Error(`Import no previsto: ${name}`);
  },
  navigator: { onLine: true, serviceWorker },
  document: { querySelector: () => ({ content: previousVersion }) },
  location: { reload: () => { reloads++; } },
  window: { addEventListener: (type: string, fn: Function) => windowListeners.set(type, fn), removeEventListener: (type: string) => windowListeners.delete(type) },
 });
 function render() { cursor = 0; return exports.AppAvailability(); }
 render();
 mounted = true;
 const cleanup = effect!();
 function button(node: any): any {
  if (!node || typeof node !== 'object') return undefined;
  if (node.type === 'button') return node;
  const children = Array.isArray(node.props?.children) ? node.props.children : [node.props?.children];
  return children.map(button).find(Boolean);
 }
 return { serviceWorker, listeners, registrationListeners, windowListeners, workerMessages, cleanup, button: () => button(render()), reloads: () => reloads };
}

test('activar desde otra pestaña ofrece recargar sin descartar automáticamente un formulario abierto', async () => {
 const state = availabilityHarness(false);
 await Promise.resolve();
 state.listeners.get('controllerchange')!();
 assert.equal(state.reloads(), 0);
 const button = state.button();
 assert.ok(button);
 assert.ok(button.props.children.includes('Recargar app'));
 button.props.onClick();
 assert.equal(state.reloads(), 1, 'la recarga sólo ocurre con una elección explícita en esta pestaña');
 state.cleanup();
 assert.equal(state.listeners.size, 0);
 assert.equal(state.registrationListeners.size, 0);
 assert.equal(state.windowListeners.size, 0);
});

test('únicamente la pestaña que solicita activar el worker se recarga al cambiar de controlador', async () => {
 const requested = availabilityHarness(true);
 const other = availabilityHarness(true);
 await Promise.resolve();
 requested.button().props.onClick();
 assert.equal(requested.workerMessages.at(-1).type, 'ACTIVATE_UPDATE');
 requested.listeners.get('controllerchange')!();
 other.listeners.get('controllerchange')!();
 assert.equal(requested.reloads(), 1);
 assert.equal(other.reloads(), 0);
 assert.ok(other.button().props.children.includes('Recargar app'));
 requested.cleanup(); other.cleanup();
});

test('la primera instalación no recarga el navegador y las solicitudes de versión reportan el HTML abierto', async () => {
 const state = availabilityHarness(false, false);
 await Promise.resolve();
 state.listeners.get('controllerchange')!();
 assert.equal(state.reloads(), 0);
 assert.equal(state.button(), undefined);
 const replies: any[] = [];
 state.listeners.get('message')!({ data: { type: 'SHELL_VERSION_REQUEST', version: currentVersion }, source: { postMessage: (data: unknown) => replies.push(data) } });
 assert.equal(replies[0].type, 'CLIENT_SHELL_VERSION');
 assert.equal(replies[0].version, previousVersion);
 assert.equal(state.reloads(), 0);
 assert.ok(state.button().props.children.includes('Recargar app'));
 state.cleanup();
});
