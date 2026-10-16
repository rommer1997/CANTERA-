import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import type { Server, AddressInfo } from 'node:net';

// Exercise the HTTP server used by Firebase's Hosting emulator, without logging
// in, requesting a remote project or depending on an existing dist directory.
const require = createRequire(import.meta.url);
const firebaseRequire = createRequire(require.resolve('firebase-tools'));
const { server: hostingServer } = firebaseRequire('superstatic');
const { hosting } = JSON.parse(await readFile(new URL('../firebase.json', import.meta.url), 'utf8'));

test('Firebase Hosting sirve la SPA y actualiza la PWA con la política de caché preparada', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'cantera-hosting-'));
  let server: Server | undefined;
  const shell = '<!doctype html><html><body>Cantera shell</body></html>';
  try {
    const publicDirectory = join(directory, hosting.public);
    await mkdir(join(publicDirectory, 'assets'), { recursive: true });
    for (const [name, content] of Object.entries({
      'index.html': shell,
      'sw.js': 'self.addEventListener("fetch", () => {});',
      'manifest.webmanifest': '{"name":"Cantera","start_url":"./#/feed"}',
      'icon-192.png': 'test image',
      'assets/index-Ab12Cd_3.js': 'console.log("new application")',
      'assets/manrope-latin-wght-normal-HI8z8_Pq.woff2': 'test font',
      'assets/unversioned.js': 'console.log("unversioned")',
    })) await writeFile(join(publicDirectory, name), content);
    server = hostingServer({ config: hosting, cwd: directory, hostname: '127.0.0.1', port: 0, stack: 'strict' }).listen();
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    await t.test('la raíz, index y rutas de la SPA sirven HTML con revalidación', async () => {
      for (const path of ['/', '/index.html', '/feed', '/events/match-123']) {
        const response = await fetch(`${origin}${path}`);
        assert.equal(response.status, 200, path);
        assert.match(response.headers.get('content-type') || '', /text\/html/, path);
        assert.equal(response.headers.get('cache-control'), 'no-cache, max-age=0, must-revalidate', path);
        assert.equal(await response.text(), shell, path);
      }
    });

    await t.test('service worker, manifest e iconos no quedan congelados entre versiones', async () => {
      for (const path of ['/sw.js', '/manifest.webmanifest', '/icon-192.png']) {
        const response = await fetch(`${origin}${path}`);
        assert.equal(response.status, 200, path);
        assert.equal(response.headers.get('cache-control'), 'no-cache, max-age=0, must-revalidate', path);
        assert.notEqual(await response.text(), shell, path);
      }
    });

    await t.test('sólo los archivos con hash reciben un año de caché inmutable', async () => {
      for (const path of ['/assets/index-Ab12Cd_3.js', '/assets/manrope-latin-wght-normal-HI8z8_Pq.woff2']) {
        const response = await fetch(`${origin}${path}`);
        assert.equal(response.status, 200, path);
        assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable', path);
      }
      const response = await fetch(`${origin}/assets/unversioned.js`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-cache, max-age=0, must-revalidate');
    });

    await t.test('un asset retirado devuelve 404 y no HTML guardable como JavaScript', async () => {
      const response = await fetch(`${origin}/assets/old-Ab12Cd_3.js`);
      assert.equal(response.status, 404);
      assert.notEqual(await response.text(), shell);
    });
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
