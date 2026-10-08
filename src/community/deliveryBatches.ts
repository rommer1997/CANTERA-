// Each notice/receipt pair requires distinct getAfter proofs. Four pairs keep
// the entire batch below Firestore's 20 document-access-call limit, including
// shared service/profile/event checks and one ledger/promotion per notice.
export const DELIVERY_BATCH_SIZE = 4;

export function deliveryBatches<T>(candidates: readonly T[]): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < candidates.length; index += DELIVERY_BATCH_SIZE) batches.push(candidates.slice(index, index + DELIVERY_BATCH_SIZE));
  return batches;
}

export async function commitDeliveryBatches<T>(candidates: readonly T[], commit: (batch: readonly T[]) => Promise<void>): Promise<number> {
  let delivered = 0;
  for (const batch of deliveryBatches(candidates)) { await commit(batch); delivered += batch.length; }
  return delivered;
}
