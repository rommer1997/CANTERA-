import assert from 'node:assert/strict';
import test from 'node:test';
import { deleteApp, initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { firestoreTransport } from '../src/firestoreTransport.ts';

test('iPhone e iPad utilizan un transporte válido para la base nombrada del SDK', async () => {
  const browsers = [
    { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', platform: 'iPhone', maxTouchPoints: 5 },
    { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Safari/605.1.15', platform: 'MacIntel', maxTouchPoints: 5 },
  ];
  for (const [index, browser] of browsers.entries()) {
    const app = initializeApp({ projectId: 'demo-cantera-transport', apiKey: 'demo-key' }, `ios-transport-${index}`);
    try {
      const settings = firestoreTransport(browser);
      assert.equal(settings.experimentalForceLongPolling, true);
      assert.equal(settings.experimentalAutoDetectLongPolling, false);
      const db = initializeFirestore(app, settings, 'cantera-transport-test');
      assert.equal(getFirestore(app, 'cantera-transport-test'), db);
    } finally { await deleteApp(app); }
  }
});

test('escritorio y Android conservan el transporte por defecto, sin forzar polling', () => {
  for (const browser of [
    { userAgent: 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15', platform: 'MacIntel', maxTouchPoints: 0 },
    { userAgent: 'Mozilla/5.0 (Linux; Android) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36', platform: 'Linux armv8l', maxTouchPoints: 5 },
  ]) assert.deepEqual(firestoreTransport(browser), {});
});
