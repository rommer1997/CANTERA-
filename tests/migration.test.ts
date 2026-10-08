import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { isoTimestamp, planMigration, type MigrationPatch } from '../scripts/migration-plan.ts';
import { profileSearchTokens } from '../src/community/normalization.ts';

const require = createRequire(import.meta.url);
const { parseArguments, migrateDocument, runMigration, PAGE_SIZE, DATABASE_ID } = require('../scripts/migrate-community.cjs');
const iso = '2026-10-05T12:30:15.123Z';
const profile = { id: 'alice', name: 'José Martínez', bio: '', city: 'A Coruña', country: 'España', position: '', team: '', level: 'amateur', verification: 'unverified', entityType: 'individual', createdAt: iso };

class FakeTimestamp {
  seconds: number;
  nanoseconds: number;
  constructor(seconds: number, nanoseconds: number) { this.seconds = seconds; this.nanoseconds = nanoseconds; }
  toDate() { return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6)); }
}
class FakeFieldPath {
  parts: string[];
  constructor(...parts: string[]) { this.parts = parts; }
  static documentId() { return '__documentId__'; }
}
const sdk = { FieldPath: FakeFieldPath, Timestamp: FakeTimestamp };
function materialize(source: Record<string, unknown>, patches: MigrationPatch[]) {
  const result = structuredClone(source);
  for (const patch of patches) {
    let target = result;
    for (const part of patch.path.slice(0, -1)) target = target[part] as Record<string, unknown>;
    target[patch.path.at(-1)!] = patch.type === 'timestamp' ? new FakeTimestamp(patch.value.seconds, patch.value.nanoseconds) : [...patch.value];
  }
  return result;
}

function fakeDatabase(initial: Record<string, Record<string, unknown>>) {
  const documents = new Map(Object.entries(initial));
  const updates: { path: string; fields: unknown[] }[] = [];
  const pages: { collection: string; size: number; after: string }[] = [];
  const transactionOptions: unknown[] = [];
  let beforeTransaction: (() => void) | undefined;
  const ref = (path: string) => ({ path, id: path.split('/').at(-1)! });
  const snapshot = (path: string) => ({ ref: ref(path), id: ref(path).id, exists: documents.has(path), data: () => documents.get(path) });
  const db = {
    beforeTransaction(fn: () => void) { beforeTransaction = fn; },
    collection(name: string) {
      let size = 0; let after = '';
      const page = {
        orderBy(field: string) { assert.equal(field, '__documentId__'); return page; },
        limit(value: number) { size = value; return page; },
        startAfter(item: { id: string }) { after = item.id; return page; },
        async get() {
          pages.push({ collection: name, size, after });
          const docs = [...documents.keys()].filter(path => path.split('/')[0] === name && ref(path).id > after)
            .sort().slice(0, size).map(snapshot);
          return { empty: !docs.length, docs };
        },
      };
      return page;
    },
    async runTransaction(callback: (transaction: unknown) => Promise<unknown>, options: unknown) {
      transactionOptions.push(options);
      beforeTransaction?.();
      beforeTransaction = undefined;
      return callback({
        get: async (reference: { path: string }) => snapshot(reference.path),
        update: (reference: { path: string }, ...fields: unknown[]) => {
          assert.notDeepEqual(options, { readOnly: true }, 'dry-run must never mutate');
          updates.push({ path: reference.path, fields });
          const data = documents.get(reference.path)!;
          for (let index = 0; index < fields.length; index += 2) {
            const path = (fields[index] as FakeFieldPath).parts;
            let target = data;
            for (const segment of path.slice(0, -1)) target = target[segment] as Record<string, unknown>;
            target[path.at(-1)!] = fields[index + 1];
          }
        },
      });
    },
  };
  return { db, documents, updates, pages, transactionOptions, ref };
}

test('ISO offsets preserve the exact instant and nanoseconds, including pre-epoch instants', () => {
  assert.deepEqual(isoTimestamp(iso), { seconds: Math.floor(Date.parse(iso) / 1000), nanoseconds: 123000000 });
  assert.deepEqual(isoTimestamp('2026-10-05T14:30:15.123456789+02:00'), { seconds: Math.floor(Date.parse(iso) / 1000), nanoseconds: 123456789 });
  assert.deepEqual(isoTimestamp('1969-12-31T23:59:59.999999999Z'), { seconds: -1, nanoseconds: 999999999 });
  assert.deepEqual(isoTimestamp('2026-10-05T09:00:15.123-03:30'), isoTimestamp(iso));
});

test('calendar, timezone and precision validation never coerces invalid dates', () => {
  for (const invalid of ['2026-02-30T12:00:00.000Z', '2025-02-29T12:00:00Z', '2026-10-05', '2026-10-05T12:00:00', '2026-10-05T24:00:00Z', '2026-10-05T12:60:00Z', '2026-10-05T12:00:60Z', '2026-10-05T12:00:00.1234567890Z', '2026-10-05T12:00:00+14:01', '2026-10-05T12:00:00-00:00', '0000-01-01T00:00:00Z', '0001-01-01T00:00:00+01:00', '9999-12-31T23:59:59-01:00', 'tomorrow', null, new Date(iso)]) assert.equal(isoTimestamp(invalid), null);
  assert.ok(isoTimestamp('2024-02-29T12:00:00Z'));
  assert.ok(isoTimestamp('0001-01-01T00:00:00Z'));
  assert.ok(isoTimestamp('9999-12-31T23:59:59.999999999Z'));
});

test('Timestamp metadata is idempotent without losing existing submillisecond precision', () => {
  const createdAt = new FakeTimestamp(1791203415, 987654321);
  assert.deepEqual(planMigration('communityPosts', 'post', { createdAt }).patches, []);
  const source = { createdAt: iso, title: 'Mi gol', teamId: 'club' };
  const plan = planMigration('communityPosts', 'post', source);
  assert.equal(plan.patches.length, 1);
  const migrated = materialize(source, plan.patches);
  assert.equal(migrated.teamId, 'club');
  assert.deepEqual(planMigration('communityPosts', 'post', migrated).patches, []);
  assert.deepEqual(source, { createdAt: iso, title: 'Mi gol', teamId: 'club' });
});

test('invalid or missing original createdAt skips the whole document without a current-time fallback', () => {
  for (const createdAt of [undefined, '', 'invalid', '2026-02-30T12:00:00.000Z', { seconds: 1, nanoseconds: 0 }]) {
    const source = { createdAt, updatedAt: iso, participants: { alice: 'Alice' }, teamId: 'club' };
    const plan = planMigration('communityEvents', 'event', source);
    assert.equal(plan.blocked, true);
    assert.deepEqual(plan.patches, []);
    assert.ok(plan.issues.some(issue => issue.code.includes('DATE')));
    assert.equal(source.createdAt, createdAt);
  }
});

test('empty pending/unread/unaccepted dates stay empty; consent and verification are never fabricated', () => {
  for (const [collection, field] of [['communityProfiles', 'acceptedTermsAt'], ['communityVerifications', 'reviewedAt'], ['communityEventNotices', 'readAt'], ['communityRightsRequests', 'reviewedAt'], ['communityTeamJoinRequests', 'reviewedAt']]) {
    const plan = planMigration(collection, 'alice', { createdAt: iso, [field]: '', acceptedTermsVersion: '', adultConfirmed: false, verification: 'unverified' });
    assert.equal(plan.blocked, false);
    assert.deepEqual(plan.patches.map(patch => patch.path), [['createdAt']]);
  }
});

test('public search prefixes use the existing sporting projection, preserving identity fields', () => {
  const original = structuredClone(profile);
  const plan = planMigration('communityPublicProfiles', 'alice', profile);
  assert.equal(plan.blocked, false);
  const tokens = plan.patches.find(patch => patch.path[0] === 'searchTokens')?.value as string[];
  assert.deepEqual(tokens, profileSearchTokens(profile));
  assert.ok(tokens.includes('name:jose') && tokens.includes('name:mart') && tokens.includes('city:coru') && tokens.includes('country:esp'));
  assert.deepEqual(plan.patches.map(patch => patch.path[0]).sort(), ['createdAt', 'searchTokens']);
  assert.deepEqual(profile, original);
  const migrated = materialize(profile, plan.patches);
  assert.deepEqual(planMigration('communityPublicProfiles', 'alice', migrated).patches, []);
});

test('private profiles are not projected and existing public records with extra fields are blocked', () => {
  const privateProfile = { ...profile, email: 'private@example.test', adultConfirmed: true, acceptedTermsVersion: '2026-10-08', acceptedTermsAt: iso, role: 'ADMIN' };
  const privatePlan = planMigration('communityProfiles', 'alice', privateProfile);
  assert.deepEqual(privatePlan.patches.map(patch => patch.path), [['createdAt'], ['acceptedTermsAt']]);
  for (const extra of ['email', 'adultConfirmed', 'acceptedTermsAt', 'acceptedTermsVersion', 'admin', 'role']) {
    const publicPlan = planMigration('communityPublicProfiles', 'alice', { ...profile, [extra]: privateProfile[extra as keyof typeof privateProfile] ?? true });
    assert.equal(publicPlan.blocked, true);
    assert.deepEqual(publicPlan.patches, []);
    assert.equal(publicPlan.issues[0].code, 'PUBLIC_FIELDS_OUTSIDE_ALLOWLIST');
    assert.ok(!JSON.stringify(publicPlan).includes('private@example.test'));
  }
  assert.equal(planMigration('communityPublicProfiles', 'bob', profile).blocked, true);
  assert.equal(planMigration('communityPublicProfiles', 'alice', { ...profile, name: {} }).blocked, true);
});

test('participant index comes only from the map; valid existing order, teamId and sporting history are preserved', () => {
  const source = { createdAt: iso, updatedAt: iso, participants: { alice: 'Alice', bob: 'Bob' }, teamId: 'club', startAt: iso, history: [{ changedAt: iso }], fixtures: [{ startAt: iso, homeScore: 2, awayScore: 1 }], revision: 7, rsvps: { alice: 'yes' }, result: { home: 2, away: 1 }, waitlistOrder: ['waiting'] };
  const plan = planMigration('communityEvents', 'event', source);
  assert.equal(plan.blocked, false);
  assert.deepEqual(plan.patches.find(patch => patch.path[0] === 'participantIds')?.value, ['alice', 'bob']);
  const migrated = materialize(source, plan.patches);
  for (const field of ['teamId', 'startAt', 'history', 'fixtures', 'revision', 'rsvps', 'result', 'waitlistOrder']) assert.deepEqual(migrated[field], source[field as keyof typeof source]);
  assert.deepEqual(planMigration('communityEvents', 'event', migrated).patches, []);
  const reordered = { ...migrated, participantIds: ['bob', 'alice'] };
  assert.deepEqual(planMigration('communityEvents', 'event', reordered).patches, []);
  const stale = { ...migrated, participantIds: ['alice', 'alice'] };
  assert.deepEqual(planMigration('communityEvents', 'event', stale).patches, [{ path: ['participantIds'], type: 'value', value: ['alice', 'bob'] }]);
});

test('malformed participant maps never manufacture identities or replace their current index', () => {
  for (const participants of [null, [], { alice: {} }, { 'bad/path': 'A' }, JSON.parse('{"__proto__":"A"}'), Object.fromEntries(Array.from({ length: 65 }, (_, index) => [`user${index}`, 'A']))]) {
    const plan = planMigration('communityEvents', 'event', { createdAt: iso, participants, participantIds: ['existing'] });
    assert.equal(plan.blocked, true);
    assert.deepEqual(plan.patches, []);
  }
});

test('waitlist joinedAt migrates with separate FieldPath segments, preserving FIFO order and history ISO', () => {
  const source = { createdAt: iso, participants: {}, waitlist: { 'alice.with.dot': { name: 'Alice', joinedAt: iso } }, waitlistOrder: ['alice.with.dot'], history: [{ changedAt: iso }] };
  const plan = planMigration('communityEvents', 'event', source);
  assert.equal(plan.blocked, false);
  assert.ok(plan.patches.some(patch => patch.path.join('/') === 'waitlist/alice.with.dot/joinedAt'));
  const migrated = materialize(source, plan.patches);
  assert.deepEqual(migrated.waitlistOrder, source.waitlistOrder);
  assert.deepEqual(migrated.history, source.history);
  assert.deepEqual(planMigration('communityEvents', 'event', migrated).patches, []);
  assert.equal(planMigration('communityEvents', 'event', { ...source, waitlist: { alice: { joinedAt: 'bad' } } }).blocked, true);
});

test('team lifecycle metadata migrates without changing owner, roles, invite expiry instant or decisions', () => {
  const team = { createdAt: iso, updatedAt: iso, ownerId: 'alice', teamId: 'club', status: 'archived' };
  const teamPlan = planMigration('communityTeams', 'club', team);
  assert.deepEqual(teamPlan.patches.map(patch => patch.path), [['createdAt'], ['updatedAt']]);
  const member = { joinedAt: iso, userId: 'bob', role: 'manager' };
  assert.deepEqual(planMigration('communityTeamMembers', 'club_bob', member).patches.map(patch => patch.path), [['joinedAt']]);
  const expiresAt = '2026-10-12T14:30:15.123+02:00';
  const invitation = { createdAt: iso, expiresAt, revoked: false };
  const invitePlan = planMigration('communityTeamInvites', 'invitation', invitation);
  assert.deepEqual(invitePlan.patches.find(patch => patch.path[0] === 'expiresAt')?.value, isoTimestamp(expiresAt));
  assert.deepEqual(invitation, { createdAt: iso, expiresAt, revoked: false });
});

test('unsupported collections and dangerous document IDs remain outside the migration boundary', () => {
  for (const [collection, id] of [['users', 'alice'], ['likes', 'legacy'], ['communityPosts', '__proto__'], ['communityPosts', 'bad/path']]) {
    const plan = planMigration(collection, id, { createdAt: iso });
    assert.equal(plan.blocked, true);
    assert.deepEqual(plan.patches, []);
  }
});

test('valid composite relationship/member document IDs support two 128-character Firebase UIDs', () => {
  const relationId = `${'a'.repeat(128)}_${'b'.repeat(128)}`;
  assert.equal(planMigration('communityFollows', relationId, { createdAt: iso }).blocked, false);
  assert.equal(planMigration('communityTeamMembers', `team_${'a'.repeat(128)}`, { joinedAt: iso }).blocked, false);
  assert.equal(planMigration('communityPosts', 'x'.repeat(1501), { createdAt: iso }).blocked, true);
  assert.equal(planMigration('communityPosts', 'ó'.repeat(751), { createdAt: iso }).blocked, true);
});

test('CLI defaults to dry-run, rejects ambiguous mutation modes and cannot select other collections', async () => {
  assert.equal((await parseArguments([])).apply, false);
  assert.equal((await parseArguments(['--dry-run'])).apply, false);
  assert.equal((await parseArguments(['--apply'])).apply, true);
  assert.deepEqual((await parseArguments(['--collection=communityPosts', '--collection=communityPosts'])).collections, ['communityPosts']);
  assert.equal((await parseArguments(['--help'])).help, true);
  for (const args of [['--apply', '--dry-run'], ['--force'], ['--collection=users'], ['--collection='], ['--help', '--apply']]) await assert.rejects(parseArguments(args));
  assert.equal(DATABASE_ID, 'ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb');
});

test('default dry-run reads current documents in read-only transactions and performs no writes', async () => {
  const fake = fakeDatabase({ 'communityPosts/post': { createdAt: iso, text: 'Private text must not appear in counts' } });
  const counts = await runMigration({ db: fake.db, ...sdk, collections: ['communityPosts'] });
  assert.equal(counts.communityPosts.planned, 1);
  assert.equal(counts.communityPosts.updated, 0);
  assert.deepEqual(fake.updates, []);
  assert.deepEqual(fake.transactionOptions, [{ readOnly: true }]);
  assert.equal(fake.documents.get('communityPosts/post')?.createdAt, iso);
  assert.ok(!JSON.stringify(counts).includes('Private text'));
});

test('apply replans after a concurrent edit and later reruns are no-ops, preserving new teamId and participants', async () => {
  const fake = fakeDatabase({ 'communityEvents/event': { createdAt: iso, participants: { alice: 'Alice' }, teamId: 'old' } });
  const newerDate = '2026-10-06T12:00:00.000Z';
  fake.db.beforeTransaction(() => { fake.documents.set('communityEvents/event', { createdAt: newerDate, participants: { alice: 'Alice', bob: 'Bob' }, teamId: 'new' }); });
  const first = await runMigration({ db: fake.db, ...sdk, collections: ['communityEvents'], apply: true });
  const current = fake.documents.get('communityEvents/event')!;
  assert.equal(first.communityEvents.updated, 1);
  assert.equal(current.teamId, 'new');
  assert.deepEqual(current.participantIds, ['alice', 'bob']);
  assert.deepEqual(current.createdAt, new FakeTimestamp(isoTimestamp(newerDate)!.seconds, 0));
  const second = await runMigration({ db: fake.db, ...sdk, collections: ['communityEvents'], apply: true });
  assert.equal(second.communityEvents.unchanged, 1);
  assert.equal(fake.updates.length, 1);
});

test('documents deleted after a page snapshot stay deleted; invalid records are skipped without partial writes', async () => {
  const fake = fakeDatabase({ 'communityPosts/post': { createdAt: iso }, 'communityPosts/invalid': { createdAt: 'broken', text: 'Keep original' } });
  fake.db.beforeTransaction(() => { fake.documents.delete('communityPosts/post'); });
  const deleted = await migrateDocument({ db: fake.db, ...sdk, collection: 'communityPosts', ref: fake.ref('communityPosts/post'), apply: true });
  assert.equal(deleted.status, 'missing');
  const skipped = await migrateDocument({ db: fake.db, ...sdk, collection: 'communityPosts', ref: fake.ref('communityPosts/invalid'), apply: true });
  assert.equal(skipped.status, 'skipped');
  assert.deepEqual(fake.updates, []);
  assert.deepEqual(fake.documents.get('communityPosts/invalid'), { createdAt: 'broken', text: 'Keep original' });
});

test('a transaction retry recalculates patches from its new snapshot instead of reusing an earlier plan', async () => {
  const attempts: unknown[][] = [];
  const newerDate = '2026-10-06T12:00:00.000Z';
  const snapshots = [
    { createdAt: iso, participants: { alice: 'Alice' }, teamId: 'old' },
    { createdAt: newerDate, participants: { alice: 'Alice', bob: 'Bob' }, teamId: 'new' },
  ];
  const reference = { path: 'communityEvents/event' };
  const db = { async runTransaction(callback: (transaction: unknown) => Promise<unknown>) {
    let result;
    for (let attempt = 0; attempt < 2; attempt++) {
      result = await callback({
        get: async (ref: unknown) => { assert.equal(ref, reference); return { exists: true, id: 'event', data: () => snapshots[attempt] }; },
        update: (_ref: unknown, ...fields: unknown[]) => { attempts.push(fields); },
      });
      // The first attempted writes are discarded, as with a Firestore conflict.
    }
    return result;
  } };
  const result = await migrateDocument({ db, ...sdk, collection: 'communityEvents', ref: reference, apply: true });
  assert.equal(result.status, 'updated');
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[0][1], new FakeTimestamp(isoTimestamp(iso)!.seconds, 123000000));
  assert.deepEqual(attempts[1][1], new FakeTimestamp(isoTimestamp(newerDate)!.seconds, 0));
  assert.deepEqual(attempts[0][3], ['alice']);
  assert.deepEqual(attempts[1][3], ['alice', 'bob']);
  assert.ok(attempts.every(fields => fields.filter((_, index) => index % 2 === 0).every(path => !(path as FakeFieldPath).parts.includes('teamId'))));
});

test('pagination uses document-ID cursors with 200-document pages across mixed legacy/Timestamp dates', async () => {
  const records = Object.fromEntries(Array.from({ length: 401 }, (_, index) => [`communityPosts/p${String(index).padStart(3, '0')}`, { createdAt: index % 2 ? new FakeTimestamp(1, 9) : iso }]));
  const fake = fakeDatabase(records);
  const counts = await runMigration({ db: fake.db, ...sdk, collections: ['communityPosts'] });
  assert.equal(PAGE_SIZE, 200);
  assert.equal(counts.communityPosts.scanned, 401);
  assert.equal(counts.communityPosts.planned, 201);
  assert.equal(counts.communityPosts.unchanged, 200);
  assert.deepEqual(fake.pages.map(page => page.after), ['', 'p199', 'p399', 'p400']);
  assert.ok(fake.pages.every(page => page.size === 200));
  assert.deepEqual(fake.updates, []);
});
