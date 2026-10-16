import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installationDevice, isInstalledExperience, nativeInstallation } from '../src/community/installation.ts';

const desktopMacUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

test('iPhone, iPad e iPod usan la guía iOS aunque no informen una plataforma o pantalla táctil', () => {
  for (const userAgent of ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)', 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)']) {
    assert.equal(installationDevice({ userAgent, platform: '', maxTouchPoints: 0 }), 'ios');
  }
});

test('el iPad con agente de escritorio se distingue del Mac y de Windows táctil', () => {
  assert.equal(installationDevice({ userAgent: desktopMacUserAgent, platform: 'MacIntel', maxTouchPoints: 5 }), 'ios');
  for (const maxTouchPoints of [0, 1]) {
    assert.equal(installationDevice({ userAgent: desktopMacUserAgent, platform: 'MacIntel', maxTouchPoints }), 'desktop');
  }
  assert.equal(installationDevice({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0', platform: 'Win32', maxTouchPoints: 10 }), 'desktop');
});

test('Android se detecta por su agente y Linux de escritorio mantiene la guía de ordenador', () => {
  assert.equal(installationDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/140.0 Mobile', platform: 'Linux armv8l', maxTouchPoints: 5 }), 'android');
  assert.equal(installationDevice({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/140.0', platform: 'Linux x86_64', maxTouchPoints: 0 }), 'desktop');
});

test('los modos de aplicación ocultan la recomendación, aunque también haya otros modos', () => {
  for (const mode of ['standalone', 'minimal-ui', 'fullscreen', 'window-controls-overlay']) {
    assert.equal(isInstalledExperience({ displayModes: ['browser', mode] }), true, mode);
  }
});

test('iOS standalone y el referente de una TWA se reconocen sin depender del display-mode', () => {
  assert.equal(isInstalledExperience({ displayModes: [], iosStandalone: true }), true);
  assert.equal(isInstalledExperience({ displayModes: ['browser'], referrer: 'android-app://app.cantera.example/' }), true);
});

test('una visita web normal mantiene la recomendación, también en iOS y con referente externo', () => {
  for (const environment of [
    { displayModes: [] },
    { displayModes: ['browser'], iosStandalone: false },
    { displayModes: ['browser'], referrer: 'https://example.test/android-app://app.cantera.example/' },
    { displayModes: ['unknown-mode'], referrer: '' },
  ]) assert.equal(isInstalledExperience(environment), false);
});

test('preparar el evento no abre el prompt: la solicitud explícita lo activa una sola vez', async () => {
  let prompts = 0;
  const installation = nativeInstallation({
    prompt: async () => { prompts++; },
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  });
  assert.equal(prompts, 0);
  const result = installation.request();
  assert.equal(prompts, 1);
  assert.deepEqual(await result, { outcome: 'accepted' });
  assert.strictEqual(installation.request(), result);
  assert.equal(prompts, 1);
});

test('dos solicitudes concurrentes comparten el mismo prompt y esperan su elección', async () => {
  const prompt = deferred<void>();
  const choice = deferred<{ outcome: 'accepted' | 'dismissed' }>();
  let prompts = 0;
  let choiceReads = 0;
  const installation = nativeInstallation({
    prompt: () => { prompts++; return prompt.promise; },
    get userChoice() { choiceReads++; return choice.promise; },
  });
  const first = installation.request();
  const concurrent = installation.request();
  assert.strictEqual(first, concurrent);
  assert.equal(prompts, 1);
  assert.equal(choiceReads, 0);
  prompt.resolve(undefined);
  await Promise.resolve();
  assert.equal(choiceReads, 1);
  choice.resolve({ outcome: 'accepted' });
  assert.deepEqual(await Promise.all([first, concurrent]), [{ outcome: 'accepted' }, { outcome: 'accepted' }]);
  assert.equal(prompts, 1);
});

test('declinar consume el evento y una segunda solicitud no vuelve a molestar', async () => {
  let prompts = 0;
  const installation = nativeInstallation({
    prompt: async () => { prompts++; },
    userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
  });
  const result = installation.request();
  assert.deepEqual(await result, { outcome: 'dismissed' });
  assert.strictEqual(installation.request(), result);
  assert.deepEqual(await installation.request(), { outcome: 'dismissed' });
  assert.equal(prompts, 1);
});

test('un error síncrono al abrir el prompt se devuelve como rechazo y consume el evento', async () => {
  const failure = new Error('La instalación no está disponible');
  let prompts = 0;
  const installation = nativeInstallation({
    prompt: () => { prompts++; throw failure; },
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  });
  const result = installation.request();
  await assert.rejects(result, error => error === failure);
  assert.strictEqual(installation.request(), result);
  await assert.rejects(installation.request(), error => error === failure);
  assert.equal(prompts, 1);
});

test('un rechazo asíncrono del prompt también consume el evento sin consultar la elección', async () => {
  const failure = new Error('El navegador ha rechazado la solicitud');
  const prompt = deferred<void>();
  let prompts = 0;
  let choiceReads = 0;
  const installation = nativeInstallation({
    prompt: () => { prompts++; return prompt.promise; },
    get userChoice() { choiceReads++; return Promise.resolve({ outcome: 'accepted' as const }); },
  });
  const result = installation.request();
  const rejection = assert.rejects(result, error => error === failure);
  prompt.reject(failure);
  await rejection;
  assert.strictEqual(installation.request(), result);
  await assert.rejects(installation.request(), error => error === failure);
  assert.equal(prompts, 1);
  assert.equal(choiceReads, 0);
});

test('el rechazo de userChoice se propaga y no permite repetir el mismo prompt', async () => {
  const failure = new Error('No se recibió la elección');
  const choice = deferred<{ outcome: 'accepted' | 'dismissed' }>();
  let prompts = 0;
  const installation = nativeInstallation({ prompt: async () => { prompts++; }, userChoice: choice.promise });
  const result = installation.request();
  const rejection = assert.rejects(result, error => error === failure);
  await Promise.resolve();
  choice.reject(failure);
  await rejection;
  assert.strictEqual(installation.request(), result);
  await assert.rejects(installation.request(), error => error === failure);
  assert.equal(prompts, 1);
});

test('un evento posterior del navegador permite instalar sin reutilizar el evento ya declinado', async () => {
  let prompts = 0;
  const first = nativeInstallation({ prompt: async () => { prompts++; }, userChoice: Promise.resolve({ outcome: 'dismissed' as const }) });
  const next = nativeInstallation({ prompt: async () => { prompts++; }, userChoice: Promise.resolve({ outcome: 'accepted' as const }) });
  assert.deepEqual(await first.request(), { outcome: 'dismissed' });
  assert.deepEqual(await next.request(), { outcome: 'accepted' });
  assert.equal(prompts, 2);
  assert.notStrictEqual(first.request(), next.request());
});
