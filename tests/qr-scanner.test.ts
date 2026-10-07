import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const code = '23456789ABCDEFGH';
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: unknown) => void; const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; }
const settle = () => new Promise<void>(resolve => setImmediate(resolve));
function scannerHarness() {
 const states: any[] = []; let cursor = 0; let mounted = false; let effect: (() => () => void) | undefined;
 const emitted: string[] = []; let closes = 0; let focused = 0; let mediaCalls = 0;
 let payload: string | null = null;
 const mediaRequests: ReturnType<typeof deferred<any>>[] = [];
 const frames = new Map<number, (time: number) => void>(); let frameId = 0;
 const windowEvents = new Map<string, Function>(); const documentEvents = new Map<string, Function>();
 const images: any[] = []; const revoked: string[] = []; const decodedSizes: number[][] = [];
 const document = { visibilityState: 'visible', activeElement: { isConnected: true, focus: () => { focused++; } }, addEventListener: (type: string, fn: Function) => documentEvents.set(type, fn), removeEventListener: (type: string) => documentEvents.delete(type), createElement: () => ({ width: 0, height: 0, getContext() { return { drawImage: () => {}, getImageData: (_x: number, _y: number, width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4), width, height }) }; } }) };
 let dialogClose: Function | undefined;
 const dialog = { open: false, showModal() { this.open = true; }, close() { this.open = false; void Promise.resolve().then(() => dialogClose?.()); } };
 const video = { srcObject: null, readyState: 2, videoWidth: 1920, videoHeight: 1080, play: async () => {}, pause: () => {} };
 const navigator: any = { mediaDevices: { getUserMedia: (constraints: any) => { mediaCalls++; assert.equal(constraints.audio, false); assert.equal(constraints.video.facingMode.ideal, 'environment'); const request = deferred<any>(); mediaRequests.push(request); return request.promise; } } };
 class FakeImage {
  onload: Function | null = null; onerror: Function | null = null; src = ''; naturalWidth = 3000; naturalHeight = 2000;
  constructor() { images.push(this); }
 }
 const hooks = {
  useRef(initial: any) { const index = cursor++; if (!(index in states)) states[index] = { current: initial }; return states[index]; },
  useState(initial: any) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], (next: any) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
  useId() { const index = cursor++; return `qr-${index}`; },
  useEffect(fn: () => () => void) { if (!mounted) effect = fn; },
 };
 const jsx = (type: unknown, props: any) => { if (type === 'dialog') dialogClose = props.onClose; if (props?.ref) props.ref.current = type === 'dialog' ? dialog : type === 'video' ? video : props.ref.current; return { type, props }; };
 const source = readFileSync(new URL('../src/community/QrScanner.tsx', import.meta.url), 'utf8');
 const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
 const exports: Record<string, Function> = {};
 runInNewContext(compiled, {
  exports, document, navigator, Image: FakeImage,
  URL: { createObjectURL: () => `blob:local-${images.length}`, revokeObjectURL: (url: string) => revoked.push(url) },
  window: { location: { origin: 'https://lacantera.web.app' }, requestAnimationFrame: (fn: (time: number) => void) => { frames.set(++frameId, fn); return frameId; }, cancelAnimationFrame: (id: number) => frames.delete(id), addEventListener: (type: string, fn: Function) => windowEvents.set(type, fn), removeEventListener: (type: string) => windowEvents.delete(type) },
  require: (name: string) => {
   if (name === 'react') return hooks;
   if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
   if (name === 'lucide-react') return { Camera: 'icon', ImagePlus: 'icon', ScanLine: 'icon', Square: 'icon', X: 'icon' };
   if (name === './invitationQr') return { decodeInvitationQrImage: (_data: unknown, width: number, height: number) => { decodedSizes.push([width, height]); return payload; }, parseInvitationQr: (value: string, origin: string) => { assert.equal(origin, 'https://lacantera.web.app'); return value === 'valid-qr' ? code : null; } };
   if (name === './qr-scanner.css') return {};
   throw new Error(`Import no previsto: ${name}`);
  },
 });
 function render() { cursor = 0; return exports.QrScanner({ onCode: (value: string) => emitted.push(value), onClose: () => { closes++; } }); }
 function nodes(type: string, tree: any): any[] {
  if (!tree || typeof tree !== 'object') return [];
  const children = Array.isArray(tree.props?.children) ? tree.props.children : [tree.props?.children];
  return [...(tree.type === type ? [tree] : []), ...children.flatMap((child: any) => nodes(type, child))];
 }
 function text(tree: any): string { if (typeof tree === 'string') return tree; if (!tree || typeof tree !== 'object') return ''; const children = Array.isArray(tree.props?.children) ? tree.props.children : [tree.props?.children]; return children.map(text).join(' '); }
 render(); mounted = true; const cleanup = effect!();
 function track() { let stops = 0; const events = new Map<string, Function>(); return { stop: () => { stops++; }, addEventListener: (name: string, fn: Function) => events.set(name, fn), removeEventListener: (name: string) => events.delete(name), ended: () => events.get('ended')?.(), stops: () => stops, events }; }
 function media() { const tracks = [track(), track()]; return { tracks, getTracks: () => tracks, getVideoTracks: () => tracks }; }
 return {
  document, navigator, mediaRequests, frames, windowEvents, documentEvents, images, revoked, emitted, decodedSizes, dialog, video, cleanup, media,
  mediaCalls: () => mediaCalls, closes: () => closes, focused: () => focused, payload: (value: string | null) => { payload = value; },
  remount: () => effect!(),
  close: () => nodes('button', render()).find(node => node.props['aria-label'] === 'Cerrar lector QR')!.props.onClick(),
  camera: () => nodes('button', render()).find(node => /cqr-camera-button/.test(node.props.className))!.props.onClick(),
  pickImage: () => nodes('input', render())[0].props.onClick(),
  file: (file: any) => nodes('input', render())[0].props.onChange({ currentTarget: { files: [file], value: 'fixture.png' } }),
  alert: () => nodes('p', render()).filter(node => node.props.role === 'alert').map(text).join(' '),
  tick: (time: number) => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time)); },
 };
}

const imageFile = { type: 'image/png', size: 1024 };

test('abrir el selector de imagen detiene la cámara aunque después se cancele la selección', async () => {
 for (const pending of [true, false]) {
  const state = scannerHarness(); state.camera(); const stream = state.media();
  if (!pending) { state.mediaRequests[0].resolve(stream); await settle(); }
  state.pickImage();
  if (pending) { state.mediaRequests[0].resolve(stream); await settle(); }
  assert.ok(stream.tracks.every(track => track.stops() >= 1));
  assert.equal(state.frames.size, 0); assert.equal(state.video.srcObject, null);
  assert.equal(state.images.length, 0); assert.deepEqual(state.emitted, []);
  state.cleanup();
 }
});

test('abrir el lector no pide permisos; la cámara se inicia explícitamente y se limpia al cerrar', async () => {
 const state = scannerHarness();
 assert.equal(state.mediaCalls(), 0); assert.equal(state.dialog.open, true);
 state.camera(); assert.equal(state.mediaCalls(), 1);
 const stream = state.media(); state.mediaRequests[0].resolve(stream); await settle();
 assert.equal(state.video.srcObject, stream); assert.equal(state.frames.size, 1);
 state.close();
 assert.ok(stream.tracks.every(track => track.stops() >= 1)); assert.equal(state.frames.size, 0); assert.equal(state.video.srcObject, null); assert.equal(state.closes(), 1);
 state.cleanup(); assert.equal(state.focused(), 1); assert.equal(state.windowEvents.size, 0); assert.equal(state.documentEvents.size, 0);
 const strictMode = scannerHarness(); strictMode.cleanup(); const secondCleanup = strictMode.remount(); await settle();
 assert.equal(strictMode.dialog.open, true, 'el close encolado del desmontaje de StrictMode no cierra el modal reabierto'); assert.equal(strictMode.closes(), 0); assert.equal(strictMode.mediaCalls(), 0); secondCleanup();
});

test('una cámara que responde tarde se detiene tras cierre, desmontaje, invisibilidad o cambio a imagen', async () => {
 for (const action of ['close', 'unmount', 'hidden', 'image']) {
  const state = scannerHarness(); state.camera();
  if (action === 'close') state.close();
  if (action === 'unmount') state.cleanup();
  if (action === 'hidden') { state.document.visibilityState = 'hidden'; state.documentEvents.get('visibilitychange')!(); }
  if (action === 'image') state.file(imageFile);
  const stream = state.media(); state.mediaRequests[0].resolve(stream); await settle();
  assert.ok(stream.tracks.every(track => track.stops() >= 1), action); assert.equal(state.video.srcObject, null, action); assert.equal(state.frames.size, 0, action); assert.deepEqual(state.emitted, [], action);
  if (action !== 'unmount') state.cleanup();
 }
});

test('la cámara decodifica a 4 fps y 640 px, rechaza QR externos y sólo abre una invitación validada', async () => {
 const state = scannerHarness(); state.camera(); const stream = state.media(); state.mediaRequests[0].resolve(stream); await settle();
 state.payload('https://arbitrary.example/private'); state.tick(0); state.tick(125);
 assert.equal(state.decodedSizes.length, 1); assert.equal(Math.max(...state.decodedSizes[0]), 640); assert.deepEqual(state.emitted, []); assert.match(state.alert(), /no es una invitación/);
 state.payload('valid-qr'); state.tick(250);
 assert.deepEqual(state.emitted, [code]); assert.equal(state.closes(), 1); assert.equal(state.frames.size, 0); assert.ok(stream.tracks.every(track => track.stops() >= 1));
 state.tick(500); assert.deepEqual(state.emitted, [code]); state.cleanup();
});

test('permisos denegados y pista desconectada permiten reintentar sin solicitar cámara automáticamente', async () => {
 const state = scannerHarness(); state.camera(); state.mediaRequests[0].reject({ name: 'NotAllowedError' }); await settle();
 assert.match(state.alert(), /No se ha permitido/); assert.equal(state.mediaCalls(), 1);
 state.camera(); assert.equal(state.mediaCalls(), 2); const stream = state.media(); state.mediaRequests[1].resolve(stream); await settle();
 stream.tracks[0].ended(); assert.match(state.alert(), /se ha desconectado/); assert.equal(state.frames.size, 0); assert.ok(stream.tracks.every(track => track.stops() >= 1)); assert.equal(state.mediaCalls(), 2);
 state.cleanup();
});

test('las imágenes se leen localmente a 960 px, se revocan y no completan después de cerrar o cambiar de modo', async () => {
 const state = scannerHarness(); state.file(imageFile); state.payload('valid-qr'); state.images[0].onload(); await settle();
 assert.deepEqual(state.emitted, [code]); assert.equal(Math.max(...state.decodedSizes[0]), 960); assert.equal(state.revoked.length, 1); assert.equal(state.mediaCalls(), 0); state.cleanup();
 for (const action of ['close', 'camera', 'hidden']) {
  const late = scannerHarness(); late.file(imageFile); const completion = late.images[0].onload;
  if (action === 'close') late.close();
  if (action === 'camera') late.camera();
  if (action === 'hidden') { late.document.visibilityState = 'hidden'; late.documentEvents.get('visibilitychange')!(); }
  late.payload('valid-qr'); completion(); await settle();
  assert.deepEqual(late.emitted, [], action); assert.equal(late.decodedSizes.length, 0, action); assert.equal(late.revoked.length, 1, action); late.cleanup();
 }
 const invalid = scannerHarness(); invalid.file({ type: 'image/png', size: 11 * 1024 * 1024 }); assert.match(invalid.alert(), /10 MB/); assert.equal(invalid.images.length, 0);
 invalid.file({ type: 'application/pdf', size: 1024 }); assert.match(invalid.alert(), /Elige una imagen/); assert.equal(invalid.images.length, 0); invalid.cleanup();
});

test('ocultar, abandonar o navegar detiene las pistas y el RAF sin reactivar la cámara', async () => {
 for (const event of ['visibilitychange', 'pagehide', 'hashchange', 'popstate']) {
  const state = scannerHarness(); state.camera(); const stream = state.media(); state.mediaRequests[0].resolve(stream); await settle();
  if (event === 'visibilitychange') { state.document.visibilityState = 'hidden'; state.documentEvents.get(event)!(); }
  else state.windowEvents.get(event)!();
  assert.ok(stream.tracks.every(track => track.stops() >= 1), event); assert.equal(state.frames.size, 0, event); assert.equal(state.mediaCalls(), 1, event); assert.deepEqual(state.emitted, [], event); state.cleanup();
 }
});
