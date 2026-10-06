import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DELIVERY_BATCH_SIZE, commitDeliveryBatches, deliveryBatches } from '../src/community/deliveryBatches.ts';

test('lotes de avisos conservan orden y no superan el presupuesto de 20 accesos de reglas', () => {
  const candidates = Array.from({ length: 200 }, (_, index) => index);
  const batches = deliveryBatches(candidates);
  assert.equal(DELIVERY_BATCH_SIZE, 4);
  assert.equal(batches.length, 50);
  assert.deepEqual(batches.flat(), candidates);
  for (const batch of batches) assert.ok(5 + batch.length * 3 <= 20, 'cinco lecturas comunes más dos pruebas y una fuente por aviso');
  assert.deepEqual(deliveryBatches([]), []);
  assert.deepEqual(deliveryBatches([1, 2, 3, 4, 5]), [[1, 2, 3, 4], [5]]);
});

test('fallo parcial conserva recibos previos y el reintento entrega sólo los pendientes', async () => {
  const candidates = Array.from({ length: 11 }, (_, index) => `notice-${index}`);
  const receipts = new Set<string>();
  let commits = 0;
  await assert.rejects(commitDeliveryBatches(candidates, async batch => {
    commits += 1;
    if (commits === 2) throw new Error('Conexión interrumpida');
    for (const candidate of batch) receipts.add(candidate);
  }), /Conexión interrumpida/);
  assert.equal(commits, 2, 'no continúa enviando tras un fallo');
  assert.deepEqual([...receipts], candidates.slice(0, 4));
  const remaining = candidates.filter(candidate => !receipts.has(candidate));
  assert.equal(await commitDeliveryBatches(remaining, async batch => {
    for (const candidate of batch) { assert.equal(receipts.has(candidate), false); receipts.add(candidate); }
  }), 7);
  assert.deepEqual([...receipts], candidates);
  assert.equal(await commitDeliveryBatches(candidates.filter(candidate => !receipts.has(candidate)), async () => { throw new Error('No debe repetirse'); }), 0);
});
