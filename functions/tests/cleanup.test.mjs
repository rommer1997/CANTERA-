import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPostCleanupHandler, ownedMediaPath } from '../cleanup.mjs';
import { DATABASE_ID, DELETE_BATCH_SIZE, REGION, STORAGE_BUCKET } from '../config.mjs';

const POST_ID = 'post-123';
const AUTHOR = 'owner-abc';
const MEDIA_PATH = `community/${AUTHOR}/${POST_ID}.mp4`;
const EVENT_TIME = '2026-10-06T12:00:00.000Z';
const photo = { authorId: AUTHOR, kind: 'photo', mediaPath: `community/${AUTHOR}/${POST_ID}.jpg` };
const reel = { authorId: AUTHOR, kind: 'reel', mediaPath: MEDIA_PATH };
const httpError = (code) => Object.assign(new Error(`test failure ${code}`), { code });

function deletedEvent(post = reel, overrides = {}) {
  return {
    id: 'event-1', database: DATABASE_ID, document: `communityPosts/${POST_ID}`,
    params: { postId: POST_ID }, time: EVENT_TIME,
    data: { id: POST_ID, ref: { path: `communityPosts/${POST_ID}` }, data: () => post },
    ...overrides,
  };
}

/** Offline Admin SDK doubles: state changes only at commit, with one retry on a parent conflict. */
function fixture({ likes = 0, comments = 0, post = reel } = {}) {
  const records = new Map();
  for (const [collection, count] of [['communityLikes', likes], ['communityComments', comments]]) {
    for (let index = 0; index < count; index++) records.set(`${collection}/owned-${index}`, { postId: POST_ID });
    records.set(`${collection}/foreign`, { postId: 'other-post' });
  }
  const foreignPath = 'community/another-user/other-post.mp4';
  const files = new Map([
    [MEDIA_PATH, { generation: '98765432101234567', timeCreated: '2026-10-06T11:59:00.000Z' }],
    [foreignPath, { generation: '2', timeCreated: '2026-10-06T11:59:00.000Z' }],
  ]);
  const state = { records, files, committed: [], attempts: 0, failCommitAt: 0, logs: [], accessedFiles: [], deleteCalls: [], limits: [] };
  const snapshot = (path) => {
    const id = path.split('/').at(-1);
    return { id, exists: records.has(path), ref: reference(path), data: () => records.get(path) };
  };
  const reference = (path) => ({
    kind: 'reference', path, parent: { path: path.slice(0, path.lastIndexOf('/')) },
    get: async () => snapshot(path),
  });
  const parentPath = `communityPosts/${POST_ID}`;
  const db = {
    collection: (name) => ({
      doc: (id) => reference(`${name}/${id}`),
      where: (field, operator, value) => {
        assert.equal(field, 'postId'); assert.equal(operator, '==');
        return { limit: (limit) => {
          state.limits.push(limit);
          return { kind: 'query', name, value, limit };
        } };
      },
    }),
    runTransaction: async (callback) => {
      for (let retry = 0; retry < 2; retry++) {
        const pending = [];
        const parentBefore = records.get(parentPath);
        const transaction = {
          get: async (target) => {
            if (target.kind === 'reference') return snapshot(target.path);
            if (state.onReadQuery) { const hook = state.onReadQuery; state.onReadQuery = null; hook(); }
            const paths = [...records.keys()].filter((path) => path.startsWith(`${target.name}/`)
              && records.get(path).postId === target.value).slice(0, target.limit);
            return { docs: state.injectedDocuments ?? paths.map(snapshot) };
          },
          delete: (ref) => pending.push(ref.path),
        };
        const result = await callback(transaction);
        if (records.get(parentPath) !== parentBefore) continue;
        if (pending.length) {
          state.attempts++;
          if (state.attempts === state.failCommitAt) throw httpError(503);
          assert.ok(pending.length <= DELETE_BATCH_SIZE);
          for (const path of pending) records.delete(path);
          state.committed.push(pending);
        }
        return result;
      }
      throw new Error('fixture transaction conflict');
    },
  };
  const bucket = { name: STORAGE_BUCKET, file: (path) => {
    state.accessedFiles.push(path);
    return {
      getMetadata: async () => {
        if (state.metadataError) { const error = state.metadataError; state.metadataError = null; throw error; }
        if (!files.has(path)) throw httpError(404);
        const metadata = { ...files.get(path) };
        if (state.onMetadata) { const hook = state.onMetadata; state.onMetadata = null; hook(); }
        return [metadata];
      },
      delete: async (options) => {
        state.deleteCalls.push({ path, ...options });
        if (state.deleteError) { const error = state.deleteError; state.deleteError = null; throw error; }
        if (!files.has(path)) {
          if (options.ignoreNotFound) return [];
          throw httpError(404);
        }
        if (String(files.get(path).generation) !== String(options.ifGenerationMatch)) throw httpError(412);
        files.delete(path);
        return [];
      },
    };
  } };
  const logger = Object.fromEntries(['warn', 'info'].map((level) => [level,
    (message, detail) => state.logs.push({ level, message, detail })]));
  return { state, db, bucket, logger, foreignPath, run: createPostCleanupHandler({ db, bucket, logger }), event: deletedEvent(post) };
}

test('media cleanup accepts only the deleted author and post path with matching media type', () => {
  assert.equal(ownedMediaPath(photo, POST_ID), photo.mediaPath);
  assert.equal(ownedMediaPath(reel, POST_ID), MEDIA_PATH);
  for (const malicious of [
    { ...reel, mediaPath: `community/another-user/${POST_ID}.mp4` },
    { ...reel, mediaPath: `community/${AUTHOR}/another-post.mp4` },
    { ...reel, mediaPath: `community/${AUTHOR}/../${POST_ID}.mp4` },
    { ...reel, mediaPath: `gs://foreign-bucket/${MEDIA_PATH}` },
    { ...reel, mediaPath: `https://example.org/${MEDIA_PATH}` },
    { ...reel, mediaPath: MEDIA_PATH.replaceAll('/', '\\') },
    { ...reel, authorId: '../another-user' },
    { ...reel, authorId: '__proto__' },
    { ...reel, kind: 'achievement' },
    { ...photo, kind: 'reel' },
  ]) assert.equal(ownedMediaPath(malicious, POST_ID), null);
  assert.equal(ownedMediaPath(reel, '../post-123'), null);
});

test('deletes all pages of linked interactions, preserving foreign documents and bucket paths', async () => {
  const { run, event, state, foreignPath } = fixture({ likes: 951, comments: 511 });
  assert.deepEqual(await run(event), { status: 'complete', likes: 951, comments: 511, media: 'deleted' });
  assert.deepEqual(state.committed.map((page) => page.length), [450, 450, 51, 450, 61]);
  assert.ok(state.limits.every((limit) => limit === 450));
  assert.deepEqual([...state.records.keys()].sort(), ['communityComments/foreign', 'communityLikes/foreign']);
  assert.equal(state.files.has(foreignPath), true);
  assert.deepEqual(state.deleteCalls, [{ path: MEDIA_PATH, ignoreNotFound: true, ifGenerationMatch: '98765432101234567' }]);
});

test('repeated delivery is idempotent when documents and media already disappeared', async () => {
  const { run, event, state } = fixture({ likes: 2, comments: 3 });
  await run(event);
  assert.deepEqual(await run(event), { status: 'complete', likes: 0, comments: 0, media: 'absent' });
  assert.equal(state.deleteCalls.length, 1);
});

test('a failed Firestore page propagates the error; retry finishes remaining pages', async () => {
  const { run, event, state } = fixture({ likes: 901, comments: 1 });
  state.failCommitAt = 2;
  await assert.rejects(run(event), { code: 503 });
  assert.equal(state.records.size, 454); // 451 likes, one comment, two foreign records.
  assert.equal(state.files.has(MEDIA_PATH), true);
  assert.deepEqual(await run(event), { status: 'complete', likes: 451, comments: 1, media: 'deleted' });
  assert.equal(state.records.size, 2);
});

test('a metadata outage is retryable after interactions were removed', async () => {
  const { run, event, state } = fixture({ likes: 1, comments: 1 });
  state.metadataError = httpError(503);
  await assert.rejects(run(event), { code: 503 });
  assert.equal(state.records.size, 2);
  assert.equal(state.files.has(MEDIA_PATH), true);
  assert.equal((await run(event)).media, 'deleted');
});

test('a failed Storage delete propagates rather than claiming cleanup succeeded', async () => {
  const { run, event, state } = fixture({ comments: 1 });
  state.deleteError = httpError(503);
  await assert.rejects(run(event), { code: 503 });
  assert.equal(state.files.has(MEDIA_PATH), true);
  assert.equal((await run(event)).media, 'deleted');
});

test('Storage 404 during deletion is harmless when the client deleted the file first', async () => {
  const { run, event, state } = fixture();
  state.deleteError = httpError(404);
  assert.equal((await run(event)).media, 'absent');
  assert.equal(state.deleteCalls[0].ignoreNotFound, true);
});

test('foreign media is skipped while the deleted post interactions are cleaned', async () => {
  const { run, state, event, foreignPath } = fixture({ likes: 1, comments: 1,
    post: { ...reel, mediaPath: 'community/another-user/other-post.mp4', mediaUrl: 'gs://another-bucket/anything' } });
  assert.deepEqual(await run(event), { status: 'complete', likes: 1, comments: 1, media: 'skipped' });
  assert.equal(state.files.has(foreignPath), true);
  assert.deepEqual(state.accessedFiles, []);
  assert.equal(state.logs.at(-2).message, 'cleanup_media_path_rejected');
});

test('non-UUID Firestore IDs still receive interaction cleanup without widening media paths', async () => {
  const { run, state } = fixture({ likes: 1, comments: 1 });
  const customId = 'logro ¿final? #1';
  for (const [path, data] of state.records) if (data.postId === POST_ID) state.records.set(path, { postId: customId });
  const event = deletedEvent({ authorId: AUTHOR, kind: 'achievement', mediaPath: '' }, {
    document: `communityPosts/${customId}`, params: { postId: customId },
    data: { id: customId, ref: { path: `communityPosts/${customId}` },
      data: () => ({ authorId: AUTHOR, kind: 'achievement', mediaPath: '' }) },
  });
  assert.deepEqual(await run(event), { status: 'complete', likes: 1, comments: 1, media: 'none' });
  assert.equal(state.records.size, 2);
  assert.deepEqual(state.accessedFiles, []);
});

test('wrong database, document, snapshot identity or unsafe post ID cannot initiate cleanup', async () => {
  const { run, state, event } = fixture({ likes: 1 });
  for (const invalid of [
    { ...event, database: '(default)' }, { ...event, document: 'communityPosts/another-post' },
    { ...event, data: { ...event.data, id: 'another-post' } },
    { ...event, params: { postId: '../post-123' } }, { ...event, data: undefined },
  ]) assert.equal((await run(invalid)).status, 'invalid');
  assert.equal(state.records.size, 3);
  assert.deepEqual(state.accessedFiles, []);
  assert.deepEqual(state.committed, []);
});

test('a recreated parent preserves its interactions and file', async () => {
  const { run, state, event } = fixture({ likes: 1, comments: 1 });
  state.records.set(`communityPosts/${POST_ID}`, { authorId: AUTHOR });
  assert.equal((await run(event)).status, 'recreated');
  assert.equal(state.records.size, 5);
  assert.deepEqual(state.accessedFiles, []);
});

test('a parent recreation during a page transaction prevents that page deletion', async () => {
  const { run, state, event } = fixture({ likes: 1, comments: 1 });
  state.onReadQuery = () => state.records.set(`communityPosts/${POST_ID}`, { authorId: AUTHOR });
  assert.equal((await run(event)).status, 'recreated');
  assert.deepEqual(state.committed, []);
  assert.equal(state.records.size, 5);
});

test('a new file uploaded after the delete event is preserved', async () => {
  for (const timeCreated of ['2026-10-06T12:00:01.000Z', '2026-10-06T12:00:00.000000200Z']) {
    const { run, event, state } = fixture();
    event.time = '2026-10-06T12:00:00.000000100Z';
    state.files.set(MEDIA_PATH, { generation: '7654321', timeCreated });
    assert.equal((await run(event)).media, 'preserved');
    assert.equal(state.deleteCalls.length, 0);
  }
});

test('a replacement generation appearing after metadata lookup is preserved on 412', async () => {
  const { run, event, state } = fixture();
  state.onMetadata = () => state.files.set(MEDIA_PATH, { generation: '3', timeCreated: '2026-10-06T12:00:01.000Z' });
  assert.equal((await run(event)).media, 'preserved');
  assert.equal(state.files.get(MEDIA_PATH).generation, '3');
  assert.equal(state.deleteCalls[0].ifGenerationMatch, '98765432101234567');
});

test('an unexpected query result fails closed without deleting a foreign document', async () => {
  const { run, event, state } = fixture({ likes: 1 });
  state.injectedDocuments = [{ id: 'foreign', ref: { path: 'communityLikes/foreign', parent: { path: 'communityLikes' } },
    data: () => ({ postId: 'other-post' }) }];
  await assert.rejects(run(event), /unexpected document/);
  assert.equal(state.records.has('communityLikes/foreign'), true);
  assert.equal(state.records.has('communityLikes/owned-0'), true);
  assert.deepEqual(state.committed, []);
});

test('configured trigger is Gen2 with the exact named database, EU region and retries', async () => {
  const { cleanupCommunityPost } = await import('../index.mjs');
  const endpoint = cleanupCommunityPost.__endpoint;
  assert.equal(endpoint.platform, 'gcfv2');
  assert.equal(endpoint.eventTrigger.eventType, 'google.cloud.firestore.document.v1.deleted');
  assert.equal(endpoint.eventTrigger.eventFilters.database, DATABASE_ID);
  assert.equal(endpoint.eventTrigger.eventFilterPathPatterns.document, 'communityPosts/{postId}');
  assert.equal(endpoint.eventTrigger.retry, true);
  assert.deepEqual(endpoint.region, [REGION]);
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const firebaseJson = JSON.parse(await readFile(new URL('../../firebase.json', import.meta.url), 'utf8'));
  assert.equal(packageJson.engines.node, '22');
  assert.equal(firebaseJson.functions.find((codebase) => codebase.codebase === 'cantera-cleanup').runtime, 'nodejs22');
});
