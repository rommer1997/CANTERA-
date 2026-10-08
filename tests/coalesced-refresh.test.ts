import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { createCoalescedRefresh } from '../src/community/coalescedRefresh.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

test('agrupa una ráfaga en una microtarea sin iniciar trabajo durante refresh ni repetir al terminar', async () => {
  let calls = 0;
  const refresh = createCoalescedRefresh(async () => { calls++; });
  for (let i = 0; i < 30; i++) assert.equal(refresh.refresh(), undefined);
  assert.equal(calls, 0);
  await nextTurn();
  assert.equal(calls, 1);
  await nextTurn();
  assert.equal(calls, 1);
  refresh.dispose();
});

test('nunca concurre y conserva una siguiente consulta por cada oleada de invalidaciones durante la petición', async () => {
  const requests = Array.from({ length: 3 }, () => deferred<void>());
  let calls = 0;
  let active = 0;
  let maxActive = 0;
  const refresh = createCoalescedRefresh(async () => {
    const index = calls++;
    active++;
    maxActive = Math.max(maxActive, active);
    try { await requests[index].promise; } finally { active--; }
  });
  refresh.refresh();
  await nextTurn();
  assert.equal(calls, 1);
  for (let i = 0; i < 30; i++) refresh.refresh();
  await nextTurn();
  assert.equal(calls, 1);
  requests[0].resolve(undefined);
  await nextTurn();
  assert.equal(calls, 2);
  for (let i = 0; i < 30; i++) refresh.refresh();
  requests[1].resolve(undefined);
  await nextTurn();
  assert.equal(calls, 3);
  requests[2].resolve(undefined);
  await nextTurn();
  assert.equal(calls, 3);
  assert.equal(active, 0);
  assert.equal(maxActive, 1);
  refresh.dispose();
});

test('no pierde las invalidaciones hechas dentro de la tarea, antes de await ni en finally', async () => {
  let calls = 0;
  const refresh = createCoalescedRefresh(async () => {
    const call = ++calls;
    if (call === 1) { refresh.refresh(); refresh.refresh(); }
    try { await Promise.resolve(); }
    finally { if (call === 2) { refresh.refresh(); refresh.refresh(); } }
  });
  refresh.refresh();
  await nextTurn();
  assert.equal(calls, 3);
  refresh.dispose();
});

test('dispose antes de la microtarea descarta la ráfaga y todas las solicitudes posteriores', async () => {
  let calls = 0;
  const refresh = createCoalescedRefresh(async () => { calls++; });
  refresh.refresh(); refresh.refresh();
  assert.equal(refresh.dispose(), undefined);
  refresh.dispose();
  refresh.refresh();
  await nextTurn();
  assert.equal(calls, 0);
});

test('dispose durante la petición descarta el refresco pendiente y su error tardío sin cancelación ficticia', async () => {
  const request = deferred<void>();
  let calls = 0;
  const errors: unknown[] = [];
  const refresh = createCoalescedRefresh(() => { calls++; return request.promise; }, error => { errors.push(error); });
  refresh.refresh();
  await nextTurn();
  refresh.refresh(); refresh.refresh();
  refresh.dispose();
  request.reject(new Error('La cuenta anterior dejó de estar activa'));
  await nextTurn();
  refresh.refresh();
  await nextTurn();
  assert.equal(calls, 1);
  assert.deepEqual(errors, []);
});

test('un rechazo asíncrono se captura, conserva una invalidación pendiente y permite reintentar después', async () => {
  const first = deferred<void>();
  const failure = new Error('Sin conexión');
  const errors: unknown[] = [];
  let calls = 0;
  const refresh = createCoalescedRefresh(() => ++calls === 1 ? first.promise : Promise.resolve(), error => { errors.push(error); });
  refresh.refresh();
  await nextTurn();
  refresh.refresh(); refresh.refresh();
  first.reject(failure);
  await nextTurn();
  assert.equal(calls, 2);
  assert.deepEqual(errors, [failure]);
  refresh.refresh();
  await nextTurn();
  assert.equal(calls, 3);
  refresh.dispose();
});

test('un fallo síncrono sin manejador no produce rechazo sin capturar ni un bucle de reintento', async () => {
  let calls = 0;
  const refresh = createCoalescedRefresh(() => {
    calls++;
    if (calls === 1) throw new Error('No se pudo crear la consulta');
    return Promise.resolve();
  });
  refresh.refresh();
  await nextTurn();
  assert.equal(calls, 1);
  await nextTurn();
  assert.equal(calls, 1);
  refresh.refresh();
  await nextTurn();
  assert.equal(calls, 2);
  refresh.dispose();
});

test('los errores síncronos y asíncronos del manejador no bloquean las consultas posteriores', async () => {
  for (const asynchronous of [false, true]) {
    let calls = 0;
    let errorCalls = 0;
    const refresh = createCoalescedRefresh(async () => { calls++; throw new Error('Consulta fallida'); }, () => {
      errorCalls++;
      if (asynchronous) return Promise.reject(new Error('Manejador fallido'));
      throw new Error('Manejador fallido');
    });
    refresh.refresh();
    await nextTurn();
    refresh.refresh();
    await nextTurn();
    assert.equal(calls, 2);
    assert.equal(errorCalls, 2);
    refresh.dispose();
  }
});

test('dispose mientras se procesa el error impide una consulta posterior ya solicitada', async () => {
  const handler = deferred<void>();
  let calls = 0;
  let errors = 0;
  const refresh = createCoalescedRefresh(async () => { calls++; throw new Error('Consulta fallida'); }, () => { errors++; return handler.promise; });
  refresh.refresh();
  await nextTurn();
  assert.equal(errors, 1);
  refresh.refresh();
  refresh.dispose();
  handler.resolve(undefined);
  await nextTurn();
  assert.equal(calls, 1);
});

test('las colas de instancias diferentes no comparten estado al cambiar de cuenta', async () => {
  let oldCalls = 0;
  let currentCalls = 0;
  const old = createCoalescedRefresh(async () => { oldCalls++; });
  const current = createCoalescedRefresh(async () => { currentCalls++; });
  old.refresh();
  old.dispose();
  current.refresh(); current.refresh();
  await nextTurn();
  assert.equal(oldCalls, 0);
  assert.equal(currentCalls, 1);
  current.refresh();
  await nextTurn();
  assert.equal(currentCalls, 2);
  current.dispose();
});
