import { DATABASE_ID, DELETE_BATCH_SIZE } from './config.mjs';

const safeId = (value) => typeof value === 'string'
  && /^[A-Za-z0-9_-]{1,128}$/.test(value)
  && !['__proto__', 'constructor', 'prototype'].includes(value);
// Queries may contain any valid Firestore document ID. Only media filenames
// need the narrower alphabet; user-created achievement IDs need cleanup too.
const documentId = (value) => typeof value === 'string' && value.length > 0
  && Buffer.byteLength(value, 'utf8') <= 1500 && !value.includes('/')
  && !['.', '..'].includes(value) && !/^__.*__$/.test(value);
const missingObject = (error) => Number(error?.code) === 404;
function timestampNanos(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.(\d{1,9}))?(?:Z|[+-]\d{2}:\d{2})$/);
  const milliseconds = Date.parse(value);
  if (!match || !Number.isFinite(milliseconds)) return null;
  return BigInt(Math.floor(milliseconds / 1000)) * 1_000_000_000n
    + BigInt((match[1] ?? '').padEnd(9, '0'));
}

/** Never derive a bucket or arbitrary object name from a user's URL. */
export function ownedMediaPath(post, postId) {
  if (!post || typeof post !== 'object' || !safeId(postId) || !safeId(post.authorId)) return null;
  const extensions = post.kind === 'photo' ? ['jpg', 'png', 'webp']
    : post.kind === 'reel' ? ['mp4', 'webm'] : [];
  return extensions.some((extension) => post.mediaPath === `community/${post.authorId}/${postId}.${extension}`)
    ? post.mediaPath : null;
}

function validEvent(event) {
  const id = event?.params?.postId;
  return documentId(id) && event.database === DATABASE_ID
    && event.document === `communityPosts/${id}`
    && event.data?.id === id && event.data?.ref?.path === event.document
    && typeof event.data.data === 'function';
}

/**
 * A transaction checks the parent on every page. If an ID was recreated while
 * an old delete event was in flight, its new interactions must survive.
 */
async function deleteInteractions(db, collectionName, postId, parentRef) {
  const query = db.collection(collectionName).where('postId', '==', postId).limit(DELETE_BATCH_SIZE);
  let deleted = 0;
  while (true) {
    const page = await db.runTransaction(async (transaction) => {
      const parent = await transaction.get(parentRef);
      if (parent.exists) return { recreated: true, count: 0 };
      const snapshot = await transaction.get(query);
      for (const document of snapshot.docs) {
        // The query itself guarantees this; fail closed if a future adapter does not.
        if (document.data()?.postId !== postId || document.ref.parent.path !== collectionName
          || document.ref.path !== `${collectionName}/${document.id}`) {
          throw new Error('Cleanup query returned an unexpected document');
        }
      }
      for (const document of snapshot.docs) transaction.delete(document.ref);
      return { recreated: false, count: snapshot.docs.length };
    });
    deleted += page.count;
    if (page.recreated || page.count === 0) return { deleted, recreated: page.recreated };
  }
}

async function deleteOwnedMedia({ bucket, postId, mediaPath, event, parentRef, logger }) {
  const file = bucket.file(mediaPath);
  let metadata;
  try {
    [metadata] = await file.getMetadata();
  } catch (error) {
    if (missingObject(error)) return 'absent';
    throw error;
  }
  // A later upload at a reused path is not the file from this deletion event.
  const eventTime = timestampNanos(event.time);
  const objectTime = timestampNanos(metadata.timeCreated);
  if (eventTime === null || objectTime === null
    || !/^[0-9]+$/.test(String(metadata.generation ?? ''))) {
    throw new Error('Cleanup requires valid event time and object generation');
  }
  if (objectTime > eventTime || (await parentRef.get()).exists) {
    logger.warn('cleanup_media_preserved', { postId, reason: 'recreated' });
    return 'preserved';
  }
  try {
    // A new generation appearing after getMetadata cannot be deleted by this call.
    await file.delete({ ignoreNotFound: true, ifGenerationMatch: metadata.generation });
    return 'deleted';
  } catch (error) {
    if (missingObject(error)) return 'absent';
    if (Number(error?.code) === 412) {
      logger.warn('cleanup_media_preserved', { postId, reason: 'generation_changed' });
      return 'preserved';
    }
    throw error;
  }
}

/** Dependency injection keeps tests offline; the deployed adapter uses Admin SDK. */
export function createPostCleanupHandler({ db, bucket, logger = console }) {
  return async (event) => {
    if (!validEvent(event)) {
      logger.warn('cleanup_event_rejected', { eventId: typeof event?.id === 'string' ? event.id : '' });
      return { status: 'invalid', likes: 0, comments: 0, media: 'skipped' };
    }
    const postId = event.params.postId;
    const post = event.data.data();
    const parentRef = db.collection('communityPosts').doc(postId);
    const likes = await deleteInteractions(db, 'communityLikes', postId, parentRef);
    if (likes.recreated) return { status: 'recreated', likes: likes.deleted, comments: 0, media: 'preserved' };
    const comments = await deleteInteractions(db, 'communityComments', postId, parentRef);
    if (comments.recreated) return { status: 'recreated', likes: likes.deleted, comments: comments.deleted, media: 'preserved' };
    const mediaPath = ownedMediaPath(post, postId);
    let media = 'none';
    if (mediaPath) {
      media = await deleteOwnedMedia({ bucket, postId, mediaPath, event, parentRef, logger });
    } else if (post?.mediaPath) {
      // Permanent invalid input must not trigger an endless retry or delete a foreign file.
      media = 'skipped';
      logger.warn('cleanup_media_path_rejected', { postId });
    }
    const result = { status: 'complete', likes: likes.deleted, comments: comments.deleted, media };
    logger.info('cleanup_post_complete', { postId, ...result });
    return result;
  };
}
