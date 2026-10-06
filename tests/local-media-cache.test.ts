import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalMediaCache, publishLocalPosts } from '../src/community/localMediaCache.ts';
import type { CommunityPost } from '../src/community/types.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
const post = (id: string, mediaPath = `local:${id}`): CommunityPost => ({ id, mediaPath, mediaUrl: '', authorId: 'account-a', authorName: 'Cuenta A', kind: 'photo', title: '', text: 'Contenido de la cuenta', createdAt: '2026-10-06T10:00:00.000Z', eventId: '' });

test('dos vistas del mismo archivo comparten la lectura y la URL sin bloquear otras lecturas', async () => {
  const pending = deferred<Blob | null>(); let reads = 0; let urls = 0;
  const cache = createLocalMediaCache(async id => { reads++; return id === 'slow' ? pending.promise : new Blob(['fast']); }, () => `blob:test-${++urls}`, () => {});
  const first = cache.load('slow'); const second = cache.load('slow');
  assert.strictEqual(first, second);
  assert.equal(await cache.load('fast'), 'blob:test-1');
  assert.equal(reads, 2);
  pending.resolve(new Blob(['slow']));
  assert.equal(await first, 'blob:test-2');
  assert.equal(await cache.load('slow'), 'blob:test-2');
  assert.equal(reads, 2); assert.equal(urls, 2);
  cache.dispose();
});

test('texto disponible antes de los archivos y cada foto aparece sin esperar al vídeo lento', async () => {
  const slow = deferred<Blob | null>(); const fast = deferred<Blob | null>();
  const cache = createLocalMediaCache(id => id === 'video' ? slow.promise : fast.promise, blob => `blob:${blob.size}`, () => {});
  const metadata: CommunityPost[][] = []; const media: string[] = [];
  const completion = publishLocalPosts([post('video'), post('photo'), post('text', '')], cache, values => metadata.push(values), value => media.push(value.id), () => true);
  assert.equal(metadata.length, 1);
  assert.deepEqual(metadata[0].map(value => value.id), ['video', 'photo', 'text']);
  assert.equal(metadata[0][0].text, 'Contenido de la cuenta');
  assert.deepEqual(media, []);
  fast.resolve(new Blob(['photo']));
  await cache.load('photo'); await Promise.resolve();
  assert.deepEqual(media, ['photo']);
  slow.resolve(new Blob(['video'])); await completion;
  assert.deepEqual(media, ['photo', 'video']);
  cache.dispose();
});

test('archivo ausente o rechazado no impide mostrar texto ni las otras fotos', async () => {
  const cache = createLocalMediaCache(async id => { if (id === 'broken') throw new Error('IndexedDB no disponible'); return id === 'missing' ? null : new Blob(['ok']); }, () => 'blob:ok', () => {});
  const visible: CommunityPost[][] = []; const hydrated: string[] = [];
  await publishLocalPosts([post('broken'), post('missing'), post('valid')], cache, records => visible.push(records), value => hydrated.push(value.id), () => true);
  assert.equal(visible[0].length, 3);
  assert.deepEqual(hydrated, ['valid']);
  cache.dispose();
});

test('una respuesta multimedia de la cuenta anterior no se publica tras cambiar de cuenta', async () => {
  const delayed = deferred<Blob | null>(); const cache = createLocalMediaCache(() => delayed.promise, () => 'blob:late', () => {});
  let session = 'a'; const updates: string[] = [];
  const completion = publishLocalPosts([post('previous')], cache, () => updates.push('text-a'), () => updates.push('media-a'), () => session === 'a');
  session = 'b'; delayed.resolve(new Blob(['late'])); await completion;
  assert.deepEqual(updates, ['text-a']);
  await publishLocalPosts([post('unmounted')], cache, () => updates.push('stale-text'), () => updates.push('stale-media'), () => false);
  assert.deepEqual(updates, ['text-a']);
  cache.dispose();
});

test('recargar datos mientras un archivo está pendiente publica sólo la versión actual', async () => {
  const delayed = deferred<Blob | null>(); let reads = 0; let revision = 1;
  const cache = createLocalMediaCache(() => { reads++; return delayed.promise; }, () => 'blob:shared', () => {});
  const updates: string[] = [];
  const earlier = publishLocalPosts([post('same')], cache, () => {}, () => updates.push('old'), () => revision === 1);
  revision = 2;
  const later = publishLocalPosts([{ ...post('same'), text: 'Texto editado' }], cache, values => assert.equal(values[0].text, 'Texto editado'), value => updates.push(value.text), () => revision === 2);
  delayed.resolve(new Blob(['same'])); await Promise.all([earlier, later]);
  assert.equal(reads, 1); assert.deepEqual(updates, ['Texto editado']);
  cache.dispose();
});

test('un error de lectura permite reintentar y no deja una promesa fallida en la caché', async () => {
  let reads = 0;
  const cache = createLocalMediaCache(async () => { if (++reads === 1) throw new Error('Fallo transitorio'); return new Blob(['retry']); }, () => 'blob:retry', () => {});
  await assert.rejects(cache.load('retry'), /Fallo transitorio/);
  assert.equal(await cache.load('retry'), 'blob:retry'); assert.equal(reads, 2);
  cache.dispose();
});

test('retirar y volver a leer un archivo invalida la respuesta antigua sin sobrescribir la nueva', async () => {
  const old = deferred<Blob | null>(); let reads = 0;
  const cache = createLocalMediaCache(() => ++reads === 1 ? old.promise : Promise.resolve(new Blob(['new'])), () => 'blob:new', () => {});
  const previous = cache.load('same'); await Promise.resolve(); cache.drop('same');
  assert.equal(await cache.load('same'), 'blob:new');
  old.resolve(new Blob(['old'])); assert.equal(await previous, ''); assert.equal(cache.cached('same'), 'blob:new');
  cache.dispose();
});

test('desmontar revoca las URL y una lectura pendiente nunca crea una URL después', async () => {
  const pending = deferred<Blob | null>(); const revoked: string[] = []; let created = 0;
  const cache = createLocalMediaCache(id => id === 'pending' ? pending.promise : Promise.resolve(new Blob(['ready'])), () => `blob:${++created}`, url => revoked.push(url));
  assert.equal(await cache.load('ready'), 'blob:1');
  const late = cache.load('pending'); await Promise.resolve(); cache.dispose(); cache.dispose();
  pending.resolve(new Blob(['late'])); assert.equal(await late, '');
  assert.equal(await cache.load('after'), ''); assert.equal(cache.cached('ready'), '');
  assert.equal(created, 1); assert.deepEqual(revoked, ['blob:1']);
});
