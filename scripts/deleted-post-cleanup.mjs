// Offline-testable policy for an explicitly scoped, owner-authorized maintenance run.
export const CLEANUP_BATCH_SIZE = 200;
export const DEFAULT_MAX_BATCHES = 8;
export const MAX_CLEANUP_BATCHES = 32;
export const MAX_CLEANUP_POSTS = 20;
const collections = ['communityLikes', 'communityComments'];
const validId = value => typeof value === 'string' && value.length > 0
  && Buffer.byteLength(value, 'utf8') <= 1500 && !value.includes('/')
  && !['.', '..'].includes(value) && !/^__.*__$/.test(value);

function optionsChecked({ postIds, apply = false, maxBatches = DEFAULT_MAX_BATCHES }) {
  if (!Array.isArray(postIds) || !postIds.length || postIds.length > MAX_CLEANUP_POSTS
    || postIds.some(id => !validId(id)) || typeof apply !== 'boolean'
    || !Number.isInteger(maxBatches) || maxBatches < 1 || maxBatches > MAX_CLEANUP_BATCHES) {
    throw new Error('Invalid bounded cleanup options');
  }
  return { postIds: [...new Set(postIds)], apply, maxBatches };
}

/** Explicit IDs only: never scan every post, accept a collection path or delete a parent. */
export function parseCleanupArguments(args) {
  const postIds = [];
  let apply = false, dryRun = false, maxBatches = DEFAULT_MAX_BATCHES, seenLimit = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--post') {
      const id = args[++index];
      if (!validId(id) || id.startsWith('--')) throw new Error('Invalid post ID');
      postIds.push(id);
    } else if (arg === '--apply' && !apply) apply = true;
    else if (arg === '--dry-run' && !dryRun) dryRun = true;
    else if (arg === '--max-batches' && !seenLimit) {
      const value = args[++index];
      if (!/^[1-9][0-9]*$/.test(value ?? '')) throw new Error('Invalid batch limit');
      maxBatches = Number(value); seenLimit = true;
    } else throw new Error('Unknown or repeated cleanup option');
  }
  if (apply && dryRun) throw new Error('Conflicting cleanup modes');
  return optionsChecked({ postIds, apply, maxBatches });
}

/**
 * The parent read participates in every deletion transaction. Firestore retries
 * if the missing parent is recreated before commit, preserving its interactions.
 * Dry-run transactions never enqueue writes. No result includes IDs or content.
 */
export async function cleanDeletedPostInteractions({ db, documentIdField, ...options }) {
  const { postIds, apply, maxBatches } = optionsChecked(options);
  if (!db?.collection || !db?.runTransaction || !documentIdField) throw new Error('Invalid cleanup adapter');
  const result = { mode: apply ? 'apply' : 'dry-run', requestedPosts: postIds.length,
    completedPosts: 0, protectedPosts: 0, batches: 0, candidateDocuments: 0,
    deletedDocuments: 0, exhausted: false };
  for (const postId of postIds) {
    const parentRef = db.collection('communityPosts').doc(postId);
    let protectedParent = false;
    for (const collectionName of collections) {
      let cursor;
      while (true) {
        if (result.batches >= maxBatches) { result.exhausted = true; return result; }
        let pageQuery = db.collection(collectionName).where('postId', '==', postId)
          .orderBy(documentIdField).limit(CLEANUP_BATCH_SIZE);
        // Dry-run advances without deleting. Apply always checks the remaining head.
        if (!apply && cursor) pageQuery = pageQuery.startAfter(cursor);
        const page = await db.runTransaction(async transaction => {
          const parent = await transaction.get(parentRef);
          if (typeof parent.exists !== 'boolean') throw new Error('Invalid parent snapshot');
          if (parent.exists) return { protected: true, docs: [] };
          const snapshot = await transaction.get(pageQuery);
          if (!Array.isArray(snapshot.docs) || snapshot.docs.length > CLEANUP_BATCH_SIZE) throw new Error('Invalid cleanup page');
          for (const document of snapshot.docs) {
            if (!validId(document.id) || document.data()?.postId !== postId
              || document.ref.parent.path !== collectionName
              || document.ref.path !== `${collectionName}/${document.id}`) {
              throw new Error('Unexpected cleanup query result');
            }
          }
          if (apply) for (const document of snapshot.docs) transaction.delete(document.ref);
          return { protected: false, docs: snapshot.docs };
        });
        result.batches++;
        if (page.protected) { protectedParent = true; result.protectedPosts++; break; }
        result.candidateDocuments += page.docs.length;
        if (apply) result.deletedDocuments += page.docs.length;
        cursor = page.docs.at(-1);
        if (page.docs.length < CLEANUP_BATCH_SIZE) break;
      }
      if (protectedParent) break;
    }
    if (!protectedParent) result.completedPosts++;
  }
  return result;
}
