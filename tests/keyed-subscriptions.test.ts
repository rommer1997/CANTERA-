import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keyedSubscriptions } from '../src/community/keyedSubscriptions.ts';

function harness() {
  type Watch = { receive(value: string | null): void; fail(error: unknown): void; stopped: number };
  const watches = new Map<string, Watch[]>();
  const published: Map<string, string>[] = [];
  const errors: unknown[] = [];
  const subscriptions = keyedSubscriptions<string>((id, receive, fail) => {
    const watch = { receive, fail, stopped: 0 };
    watches.set(id, [...(watches.get(id) || []), watch]);
    return () => { watch.stopped += 1; };
  }, records => published.push(new Map(records)), error => errors.push(error));
  return { subscriptions, watches, published, errors };
}

test('cambiar roles conserva documentos y listeners de los mismos equipos', () => {
  const state = harness();
  const memberships = [{ teamId: 'a', role: 'member' }, { teamId: 'b', role: 'owner' }];
  state.subscriptions.reconcile(memberships.map(member => member.teamId));
  state.watches.get('a')![0].receive('Equipo A');
  state.watches.get('b')![0].receive('Equipo B');
  const previous = state.published.at(-1);
  memberships[0].role = 'manager';
  state.subscriptions.reconcile(memberships.map(member => member.teamId));
  assert.equal(state.published.at(-1), previous, 'no vacía ni republica los documentos');
  assert.equal(state.watches.get('a')!.length, 1);
  assert.equal(state.watches.get('b')!.length, 1);
  assert.equal(state.watches.get('a')![0].stopped, 0);
  state.watches.get('a')![0].receive('Equipo A actualizado');
  assert.deepEqual([...state.published.at(-1)!], [['a', 'Equipo A actualizado'], ['b', 'Equipo B']]);
});

test('salir y volver al equipo descarta datos y errores tardíos de su listener anterior', () => {
  const state = harness();
  state.subscriptions.reconcile(['a', 'b']);
  const old = state.watches.get('a')![0];
  old.receive('Equipo A'); state.watches.get('b')![0].receive('Equipo B');
  state.subscriptions.reconcile(['b']);
  assert.equal(old.stopped, 1);
  assert.deepEqual([...state.published.at(-1)!], [['b', 'Equipo B']]);
  state.subscriptions.reconcile(['a', 'b', 'a']);
  const next = state.watches.get('a')![1];
  next.receive('Nueva inscripción');
  const count = state.published.length;
  old.receive('Dato obsoleto'); old.fail(new Error('Error obsoleto'));
  assert.equal(state.published.length, count);
  assert.deepEqual(state.errors, []);
  assert.equal(state.watches.get('b')!.length, 1);
  assert.equal(state.watches.get('a')!.length, 2, 'la clave repetida no duplica suscripciones');
  assert.equal(state.published.at(-1)!.get('a'), 'Nueva inscripción');
});

test('cambiar de cuenta elimina todas las suscripciones y bloquea sus callbacks pendientes', () => {
  const oldAccount = harness();
  oldAccount.subscriptions.reconcile(['shared', 'private']);
  const pending = oldAccount.watches.get('shared')![0];
  pending.receive('Cuenta anterior');
  oldAccount.subscriptions.dispose(); oldAccount.subscriptions.dispose();
  const newAccount = harness();
  newAccount.subscriptions.reconcile(['shared']);
  newAccount.watches.get('shared')![0].receive('Cuenta actual');
  const count = oldAccount.published.length;
  pending.receive('Respuesta retrasada'); pending.fail(new Error('Error retrasado'));
  oldAccount.subscriptions.reconcile(['another']);
  assert.equal(oldAccount.published.length, count);
  assert.deepEqual(oldAccount.errors, []);
  assert.equal(oldAccount.watches.has('another'), false);
  for (const watches of oldAccount.watches.values()) assert.equal(watches[0].stopped, 1);
  assert.deepEqual([...newAccount.published.at(-1)!], [['shared', 'Cuenta actual']]);
});

test('una suscripción fallida retira el documento y permite reintentar la misma clave', () => {
  const state = harness();
  state.subscriptions.reconcile(['a']);
  const old = state.watches.get('a')![0];
  old.receive('Equipo A');
  old.fail(new Error('Conexión interrumpida'));
  assert.equal(old.stopped, 1);
  assert.equal(state.published.at(-1)!.size, 0);
  assert.equal(state.errors.length, 1);
  state.subscriptions.reconcile(['a']);
  state.watches.get('a')![1].receive('Equipo A recuperado');
  old.receive('No debe volver');
  assert.equal(state.published.at(-1)!.get('a'), 'Equipo A recuperado');
});
