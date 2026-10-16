import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanDeletedPostInteractions, parseCleanupArguments, CLEANUP_BATCH_SIZE, MAX_CLEANUP_POSTS,
} from '../scripts/deleted-post-cleanup.mjs';

const POST = 'deleted-post';
const parentPath = `communityPosts/${POST}`;

function fixture({ likes = 0, comments = 0, active = false } = {}) {
  const records = new Map<string, Record<string, unknown>>();
  for (const [name, size] of [['communityLikes', likes], ['communityComments', comments]] as const) {
    for (let index = 0; index < size; index++) records.set(`${name}/doc-${String(index).padStart(5, '0')}`, {
      postId: POST, authorId: 'private-user', text: 'private-content',
    });
    records.set(`${name}/foreign`, { postId: 'active-post', text: 'foreign-content' });
  }
  records.set('communityPosts/active-post', { authorId: 'other-author' });
  if (active) records.set(parentPath, { authorId: 'post-author' });
  const state = { records, committed: [] as string[][], parentReads: [] as string[], queryReads: 0,
    limits: [] as number[], failedCommit: 0, commitsAttempted: 0,
    onQuery: null as null | (() => void), onCommit: null as null | (() => void),
    injected: null as null | any[] };
  const reference = (path: string) => ({ kind: 'reference', path, parent: { path: path.slice(0, path.lastIndexOf('/')) } });
  const snapshot = (path: string) => ({ id: path.split('/').at(-1)!, ref: reference(path),
    exists: records.has(path), data: () => records.get(path) });
  const builder = (parts: any) => ({ ...parts,
    orderBy: (field: string) => { assert.equal(field, '__name__'); return builder(parts); },
    limit: (limit: number) => { state.limits.push(limit); return builder({ ...parts, pageSize: limit }); },
    startAfter: (cursor: any) => builder({ ...parts, after: cursor.id }),
  });
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => reference(`${name}/${id}`),
      where: (field: string, operator: string, value: string) => {
        assert.equal(field, 'postId'); assert.equal(operator, '==');
        assert.ok(['communityLikes', 'communityComments'].includes(name));
        return builder({ kind: 'query', name, value });
      },
    }),
    runTransaction: async (callback: (tx: any) => Promise<any>) => {
      for (let retry = 0; retry < 3; retry++) {
        const pending: string[] = [];
        const readParents = new Map<string, unknown>();
        const result = await callback({
          get: async (target: any) => {
            assert.equal(pending.length, 0, 'all reads precede writes');
            if (target.kind === 'reference') {
              assert.ok(target.path.startsWith('communityPosts/'));
              state.parentReads.push(target.path);
              readParents.set(target.path, records.get(target.path));
              return snapshot(target.path);
            }
            state.queryReads++;
            const hook = state.onQuery; state.onQuery = null; hook?.();
            const paths = [...records.keys()].filter(path => path.startsWith(`${target.name}/`)
              && records.get(path)?.postId === target.value
              && (!target.after || path.split('/').at(-1)! > target.after)).sort().slice(0, target.pageSize);
            return { docs: state.injected ?? paths.map(snapshot) };
          },
          delete: (ref: any) => pending.push(ref.path),
        });
        if ([...readParents].some(([path, value]) => records.get(path) !== value)) continue;
        if (pending.length) {
          state.commitsAttempted++;
          if (state.commitsAttempted === state.failedCommit) throw new Error('simulated unavailable');
          assert.ok(pending.length <= CLEANUP_BATCH_SIZE);
          for (const path of pending) records.delete(path);
          state.committed.push(pending);
          const hook = state.onCommit; state.onCommit = null; hook?.();
        }
        return result;
      }
      throw new Error('simulated exhausted retries');
    },
  };
  const run = (options: Record<string, unknown> = {}) => cleanDeletedPostInteractions({
    db, documentIdField: '__name__', postIds: [POST], ...options,
  });
  return { state, run, snapshot };
}

test('manual cleanup defaults to dry-run, deduplicates explicit IDs and limits its scope', () => {
  assert.deepEqual(parseCleanupArguments(['--post', POST, '--post', POST]), { postIds: [POST], apply: false, maxBatches: 8 });
  assert.deepEqual(parseCleanupArguments(['--post', 'logro ¿final?', '--apply', '--max-batches', '2']), {
    postIds: ['logro ¿final?'], apply: true, maxBatches: 2,
  });
  assert.equal(parseCleanupArguments(['--post', POST, '--dry-run']).apply, false);
  for (const args of [[], ['--post'], ['--post', '../foreign'], ['--post', '__private__'],
    ['--post', POST, '--apply', '--dry-run'], ['--post', POST, '--apply', '--apply'],
    ['--post', POST, '--max-batches', '33'], ['--post', POST, '--max-batches', '0'],
    ['--post', POST, '--max-batches', '1.5'], ['--post', POST, '--project', 'other'],
    Array.from({ length: MAX_CLEANUP_POSTS + 1 }, (_, index) => ['--post', `post-${index}`]).flat(),
  ]) assert.throws(() => parseCleanupArguments(args));
});

test('dry-run counts every bounded page without writing or emitting identifiers or user content', async () => {
  const { state, run } = fixture({ likes: 451, comments: 210 });
  const before = new Map(state.records);
  const result = await run();
  assert.deepEqual(result, { mode: 'dry-run', requestedPosts: 1, completedPosts: 1, protectedPosts: 0,
    batches: 5, candidateDocuments: 661, deletedDocuments: 0, exhausted: false });
  assert.deepEqual(state.records, before);
  assert.deepEqual(state.committed, []);
  assert.equal(state.parentReads.length, 5);
  assert.ok(state.limits.every(value => value === CLEANUP_BATCH_SIZE));
  for (const privateValue of [POST, 'private-user', 'private-content', 'doc-']) assert.ok(!JSON.stringify(result).includes(privateValue));
});

test('apply removes only deleted-parent interactions in bounded transactions and is idempotent', async () => {
  const { state, run } = fixture({ likes: 451, comments: 210 });
  assert.equal((await run({ apply: true })).deletedDocuments, 661);
  assert.deepEqual(state.committed.map(page => page.length), [200, 200, 51, 200, 10]);
  assert.equal(state.parentReads.length, 5, 'every page checks the parent');
  assert.deepEqual([...state.records.keys()].sort(), [
    'communityComments/foreign', 'communityLikes/foreign', 'communityPosts/active-post',
  ]);
  const repeated = await run({ apply: true });
  assert.equal(repeated.deletedDocuments, 0);
  assert.equal(repeated.completedPosts, 1);
  assert.equal(state.committed.length, 5);
});

test('an existing parent is protected before any interaction query in either mode', async () => {
  for (const apply of [false, true]) {
    const { state, run } = fixture({ likes: 1, comments: 1, active: true });
    const before = new Map(state.records);
    const result = await run({ apply });
    assert.equal(result.protectedPosts, 1);
    assert.equal(result.completedPosts, 0);
    assert.equal(result.candidateDocuments, 0);
    assert.equal(state.queryReads, 0);
    assert.deepEqual(state.records, before);
  }
});

test('global batch budget stops safely and a repeat finishes remaining pages', async () => {
  const { state, run } = fixture({ likes: 451, comments: 210 });
  const limited = await run({ apply: true, maxBatches: 2 });
  assert.equal(limited.batches, 2);
  assert.equal(limited.deletedDocuments, 400);
  assert.equal(limited.exhausted, true);
  assert.equal(limited.completedPosts, 0);
  const remaining = await run({ apply: true });
  assert.equal(remaining.deletedDocuments, 261);
  assert.equal(remaining.exhausted, false);
  assert.equal(state.records.size, 3);
});

test('a parent recreation before commit retries the transaction and preserves all interactions', async () => {
  const { state, run } = fixture({ likes: 10, comments: 10 });
  state.onQuery = () => state.records.set(parentPath, { authorId: 'replacement-author' });
  const result = await run({ apply: true });
  assert.equal(result.protectedPosts, 1);
  assert.equal(result.deletedDocuments, 0);
  assert.equal(state.records.size, 24);
  assert.deepEqual(state.committed, []);
  assert.equal(state.parentReads.length, 2, 'absence conflict causes a new parent read');
});

test('parent recreation between pages stops later batches and never modifies the new post', async () => {
  const { state, run } = fixture({ likes: 451, comments: 1 });
  const replacement = { authorId: 'replacement-author' };
  state.onCommit = () => state.records.set(parentPath, replacement);
  const result = await run({ apply: true });
  assert.equal(result.deletedDocuments, 200);
  assert.equal(result.protectedPosts, 1);
  assert.deepEqual(state.committed.map(page => page.length), [200]);
  assert.equal(state.records.get(parentPath), replacement);
  assert.equal(state.records.has('communityComments/doc-00000'), true);
});

test('failed commits propagate and an explicit repeat cleans only the remaining data', async () => {
  const { state, run } = fixture({ likes: 451, comments: 1 });
  state.failedCommit = 2;
  await assert.rejects(run({ apply: true }), /simulated unavailable/);
  assert.deepEqual(state.committed.map(page => page.length), [200]);
  assert.equal((await run({ apply: true })).deletedDocuments, 252);
  assert.equal(state.records.size, 3);
});

test('unexpected paths, parent links and oversized pages fail closed before any page write', async () => {
  for (const invalid of [
    [{ id: 'foreign', ref: { path: 'communityLikes/foreign', parent: { path: 'communityLikes' } }, data: () => ({ postId: 'other-post' }) }],
    [{ id: 'foreign', ref: { path: 'communityComments/foreign', parent: { path: 'communityComments' } }, data: () => ({ postId: POST }) }],
    [{ id: 'foreign', ref: { path: 'communityLikes/mismatch', parent: { path: 'communityLikes' } }, data: () => ({ postId: POST }) }],
    Array.from({ length: CLEANUP_BATCH_SIZE + 1 }, (_, index) => ({ id: `injected-${index}` })),
  ]) {
    const { state, run } = fixture({ likes: 1 });
    const before = new Map(state.records);
    state.injected = invalid;
    await assert.rejects(run({ apply: true }), /Unexpected cleanup|Invalid cleanup/);
    assert.deepEqual(state.records, before);
    assert.deepEqual(state.committed, []);
  }
});

test('invalid direct API scope is rejected before database access', async () => {
  const { state, run } = fixture({ likes: 1 });
  for (const options of [{ postIds: [] }, { postIds: ['../other'] }, { maxBatches: 1000 },
    { apply: 'yes' }, { maxBatches: NaN }, { documentIdField: null },
  ]) await assert.rejects(run(options));
  assert.equal(state.parentReads.length, 0);
  assert.deepEqual(state.committed, []);
});
