// Read-only audit. Reports aggregate codes/counts, never IDs, profile fields or messages.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const backup = require('./community-backup.cjs');
const opening = require('./open-community.cjs');
const USAGE = 'node scripts/audit-backend.cjs --cloud | --input output/private/respaldo.json';
const PUBLIC_FIELDS = ['id', 'name', 'bio', 'city', 'country', 'position', 'team', 'level', 'verification', 'entityType', 'createdAt'];
const text = value => typeof value?.stringValue === 'string' ? value.stringValue : undefined;
const bool = value => value?.booleanValue;
const list = value => value?.arrayValue ? value.arrayValue.values || [] : undefined;
const map = value => value?.mapValue ? value.mapValue.fields || {} : undefined;
const integer = value => typeof value?.integerValue === 'string' ? BigInt(value.integerValue) : undefined;
const strings = value => { const values = list(value); return values && values.every(v => text(v) !== undefined) ? values.map(text) : undefined; };
const equal = (a, b) => a !== undefined && b !== undefined && backup.canonicalJson(a) === backup.canonicalJson(b);
const setEqual = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && new Set(a).size === a.length && a.every(v => b.includes(v));
const completed = data => bool(data?.adultConfirmed) === true && text(data?.acceptedTermsVersion) === '2026-10-08'
  && !!data?.acceptedTermsAt && text(data.acceptedTermsAt) !== '' && !!text(data.city)?.trim() && !!text(data.country)?.trim();

function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true };
  if (args.length === 1 && args[0] === '--cloud') return { cloud: true };
  if (args.length === 2 && args[0] === '--input' && args[1] && !args[1].startsWith('--')) return { input: args[1] };
  throw new Error('invalid-options');
}

function auditSnapshot(payload) {
  backup.validateBackup(payload);
  const records = new Map(payload.documents.map(d => [d.path, d.fields]));
  const issues = new Map();
  const issue = (code, severity = 'error') => {
    const key = `${severity}:${code}`;
    issues.set(key, { code, severity, count: (issues.get(key)?.count || 0) + 1 });
  };
  const get = (collection, id) => typeof id === 'string' && !id.includes('/') ? records.get(`${collection}/${id}`) : undefined;
  const teamOwnerCounts = new Map();
  for (const row of payload.documents) if (row.path.startsWith('communityTeamMembers/') && text(row.fields.role) === 'owner') {
    const teamId = text(row.fields.teamId); teamOwnerCounts.set(teamId, (teamOwnerCounts.get(teamId) || 0) + 1);
  }
  const runtime = records.get('communityConfiguration/runtime');
  if (!runtime || !['open', 'pilot', 'paused', 'setup'].includes(text(runtime.serviceStatus))) issue('RUNTIME_MISSING_OR_INVALID');
  if (runtime && bool(runtime.mediaUploadsEnabled) !== false) issue('MEDIA_UPLOADS_UNEXPECTEDLY_ENABLED');

  for (const row of payload.documents) {
    const parts = row.path.split('/'), [collection, id, child, childId] = parts, data = row.fields;
    if (data.id && text(data.id) !== (parts.length === 4 ? childId : id)) issue('DOCUMENT_ID_MISMATCH');
    if (collection === 'communityPublicProfiles') {
      const profile = get('communityProfiles', id);
      if (!profile || !completed(profile)) issue('PUBLIC_PROFILE_WITHOUT_COMPLETED_PRIVATE_PROFILE');
      if (Object.keys(data).some(key => ![...PUBLIC_FIELDS, 'searchTokens'].includes(key))) issue('PUBLIC_PROFILE_PRIVATE_OR_UNKNOWN_FIELDS');
      if (profile && PUBLIC_FIELDS.some(key => !equal(data[key], profile[key]))) issue('PUBLIC_PROFILE_PROJECTION_MISMATCH');
      if (data.searchTokens && !strings(data.searchTokens)) issue('PUBLIC_PROFILE_SEARCH_TOKENS_INVALID');
    }
    if (collection === 'communityProfiles' && completed(data) && !get('communityPublicProfiles', id)) issue('COMPLETED_PROFILE_WITHOUT_PUBLIC_PROJECTION');
    if (collection === 'communityEvents') {
      const participants = map(data.participants), ids = data.participantIds ? strings(data.participantIds) : participants && Object.keys(participants);
      const capacity = integer(data.capacity), waitlist = map(data.waitlist) || {}, order = data.waitlistOrder ? strings(data.waitlistOrder) : Object.keys(waitlist);
      if (!participants || !setEqual(ids, Object.keys(participants))) issue('EVENT_PARTICIPANTS_INDEX_MISMATCH');
      if (capacity === undefined || capacity < 2n || capacity > (text(data.type) === 'tournament' ? 32n : 64n) || participants && BigInt(Object.keys(participants).length) > capacity) issue('EVENT_CAPACITY_INVALID');
      if (!setEqual(order, Object.keys(waitlist)) || participants && Object.keys(waitlist).some(uid => Object.hasOwn(participants, uid))) issue('EVENT_WAITLIST_INVALID');
      if (data.visibility && !['public', 'private'].includes(text(data.visibility))) issue('EVENT_VISIBILITY_INVALID');
      if (!data.visibility) issue('LEGACY_EVENT_WITHOUT_EXPLICIT_VISIBILITY', 'warning');
      const start = Date.parse(text(data.startAt));
      if (!Number.isSafeInteger(start) || integer(data.startAtMs) !== BigInt(start)) issue('EVENT_START_TIME_MISMATCH');
      const fixtureIds = strings(data.fixtureIds) || [];
      for (const fixtureId of fixtureIds) if (text(get('communityFixtures', fixtureId)?.eventId) !== id) issue('EVENT_FIXTURE_REFERENCE_INVALID');
      const teamId = text(data.teamId);
      if (teamId && !get('communityTeams', teamId)) issue('EVENT_TEAM_REFERENCE_MISSING', 'warning');
    }
    if (collection === 'communityFixtures' && !get('communityEvents', text(data.eventId))) issue('FIXTURE_EVENT_MISSING');
    if (collection === 'communityTeams') {
      const owner = text(data.ownerId), membership = get('communityTeamMembers', `${id}_${owner}`);
      if (!membership || text(membership.role) !== 'owner' || text(membership.userId) !== owner || text(membership.teamId) !== id) issue('TEAM_OWNER_MEMBERSHIP_INVALID');
      if (teamOwnerCounts.get(id) !== 1) issue('TEAM_OWNER_NOT_UNIQUE');
    }
    if (collection === 'communityTeamMembers') {
      const teamId = text(data.teamId), uid = text(data.userId), team = get('communityTeams', teamId);
      if (id !== `${teamId}_${uid}` || !team) issue('TEAM_MEMBERSHIP_REFERENCE_INVALID');
      if (text(data.role) === 'owner' && text(team?.ownerId) !== uid) issue('TEAM_OWNER_MEMBERSHIP_INVALID');
    }
    if (collection === 'communityConnections' && child === 'members') {
      if (id === childId || text(data.ownerId) !== id || text(data.peerId) !== childId) issue('CONNECTION_IDENTITY_INVALID');
      const mirror = records.get(`communityConnections/${childId}/members/${id}`);
      if (!mirror || text(mirror.ownerId) !== childId || text(mirror.peerId) !== id || !equal(mirror.inviteId, data.inviteId)) issue('CONNECTION_MIRROR_MISSING_OR_INVALID');
    }
    if (collection === 'communityConversations' && parts.length === 2) {
      const peers = strings(data.participantIds);
      if (bool(data.archived) === true) {
        if (!/^archive_[a-f0-9]{32}$/.test(id) || peers?.length !== 1) issue('ARCHIVED_CONVERSATION_INVALID');
      } else {
        const pair = id.split(':');
        if (pair.length !== 2 || pair[0] >= pair[1] || !setEqual(peers, pair)) issue('CONVERSATION_PARTICIPANTS_INVALID');
      }
    }
    if (collection === 'communityConversations' && child === 'messages') {
      const conversation = get(collection, id), sender = text(data.senderId);
      if (!conversation || !strings(conversation.participantIds)?.includes(sender)) issue('MESSAGE_CONVERSATION_OR_SENDER_INVALID');
    }
    if (collection === 'communityEventAdmissions' && child === 'members') {
      if (!get('communityEvents', id) || text(data.eventId) !== id || text(data.userId) !== childId) issue('ADMISSION_REFERENCE_INVALID');
    }
    if (['communityComments', 'communityLikes'].includes(collection) && !get('communityPosts', text(data.postId))) issue('DELETED_POST_INTERACTION_REQUIRES_CLEANUP', 'warning');
    if (['communityTeamInvites', 'communityTeamJoinRequests'].includes(collection) && !get('communityTeams', text(data.teamId))) issue('TEAM_RELATED_DOCUMENT_WITHOUT_TEAM');
  }
  const findings = [...issues.values()].sort((a, b) => a.severity.localeCompare(b.severity) || a.code.localeCompare(b.code));
  return { ...backup.backupSummary(payload), mode: 'read-only-integrity-audit', readTime: payload.readTime,
    passed: !findings.some(f => f.severity === 'error'), findings,
    coverage: ['public-private-profile-projection', 'event-capacity-rosters-waitlist-time', 'fixture-parent', 'team-ownership-membership', 'reciprocal-connections', 'conversation-sender-and-archives', 'admission-parent', 'deleted-post-interactions'],
    limits: ['not-a-complete-field-validator', 'no-production-writes', 'does-not-certify-backup-custody-or-availability'] };
}

// Even the cloud-client abstraction is denied all mutation endpoints.
function readOnlyApi(api) {
  return { request(options) {
    const allowed = options.method === 'GET' || options.method === 'POST' && /:(runQuery|listCollectionIds)$/.test(options.path);
    if (!allowed || /:(commit|batchWrite|rollback|beginTransaction)$/.test(options.path)) throw new Error('read-only-audit');
    return api.request(options);
  } };
}

async function inspectCloud(root, cloud) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'firebase-applet-config.json'), 'utf8'));
  backup.validateConfig(config);
  const api = readOnlyApi(cloud.api);
  const payload = await backup.collectBackup({ config, api });
  const result = auditSnapshot(payload);
  const databasePath = `projects/${backup.PROJECT_ID}/databases/${backup.DATABASE_ID}`;
  const metadata = (await api.request({ method: 'GET', path: databasePath })).body;
  if (metadata.name !== databasePath) throw new Error('wrong-database');
  const release = (await cloud.rulesApi.request({ method: 'GET', path: `${opening.RELEASE_NAME}` })).body;
  if (!new RegExp(`^projects/${backup.PROJECT_ID}/rulesets/[A-Za-z0-9_-]+$`).test(release.rulesetName || '')) throw new Error('wrong-ruleset');
  const ruleset = (await cloud.rulesApi.request({ method: 'GET', path: release.rulesetName })).body;
  const localRules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
  const rulesMatch = ruleset.source?.files?.length === 1 && ruleset.source.files[0].name === 'firestore.rules' && ruleset.source.files[0].content === localRules;
  const spec = JSON.parse(fs.readFileSync(path.join(root, 'firestore.indexes.json'), 'utf8'));
  const indexes = await opening.paginated(api, `${databasePath}/collectionGroups/-/indexes`, 'indexes', { pageSize: 0 });
  const remaining = [...indexes];
  const indexesMatch = spec.indexes.every(expected => {
    const index = remaining.findIndex(actual => actual.state === 'READY' && cloud.indexMatchesSpec(actual, expected, metadata.databaseEdition));
    if (index < 0) return false; remaining.splice(index, 1); return true;
  }) && remaining.length === 0;
  result.infrastructure = { location: metadata.locationId, edition: metadata.databaseEdition,
    deleteProtection: metadata.deleteProtectionState, pointInTimeRecovery: metadata.pointInTimeRecoveryEnablement,
    rulesMatch, rulesSha256: createHash('sha256').update(localRules).digest('hex'), indexes: indexes.length, indexesReadyAndMatch: indexesMatch };
  if (!rulesMatch || !indexesMatch || metadata.deleteProtectionState !== 'DELETE_PROTECTION_ENABLED') result.passed = false;
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(`${USAGE}\n--cloud lee producción sin guardar el snapshot. --input sólo abre una copia privada validada. La salida no contiene datos personales. No aplica reparaciones.`); return; }
  const root = fs.realpathSync(path.resolve(__dirname, '..'));
  const result = options.cloud ? await inspectCloud(root, await opening.createCloudApis(root)) : auditSnapshot(backup.readPrivateBackup(root, options.input));
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
}
module.exports = { parseArgs, auditSnapshot, readOnlyApi, inspectCloud };
if (require.main === module) main().catch(() => { console.error('Auditoría no completada. No se modificó la nube ni se guardaron datos personales. Consulta --help.'); process.exitCode = 1; });
