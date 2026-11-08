export class PushError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export const uidValid = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
export const codeValid = value => typeof value === 'string' && /^[2-9A-HJ-NP-Z]{16}$/.test(value);
export const pairId = (a, b) => [a, b].sort().join(':');
export async function digest(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(v => v.toString(16).padStart(2,'0')).join('');
}
export function normalizeSubscription(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PushError('invalid-subscription');
  let url; try { url = new URL(value.endpoint); } catch { throw new PushError('invalid-subscription'); }
  const host = url.hostname;
  const allowed = host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com'
    || /^[a-z0-9-]+\.push\.apple\.com$/.test(host) || /^[a-z0-9-]+\.notify\.windows\.com$/.test(host);
  if (url.protocol !== 'https:' || !allowed || url.port || url.username || url.password || url.hash || url.href.length > 2048) throw new PushError('invalid-subscription');
  const p256dh = value.keys?.p256dh; const auth = value.keys?.auth;
  if (typeof p256dh !== 'string' || !/^[A-Za-z0-9_-]{87}$/.test(p256dh)
    || typeof auth !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(auth)) throw new PushError('invalid-subscription');
  return { endpoint: url.href, expirationTime: null, keys: { p256dh, auth } };
}
export function preferences(value) {
  if (!value || typeof value.messages !== 'boolean' || typeof value.invitations !== 'boolean') throw new PushError('invalid-preferences');
  return { messages: value.messages, invitations: value.invitations };
}
export function eventInput(value) {
  if (!value || typeof value !== 'object') throw new PushError('invalid-event');
  if (value.kind === 'message' && typeof value.conversationId === 'string' && /^[A-Za-z0-9_-]{1,128}:[A-Za-z0-9_-]{1,128}$/.test(value.conversationId)
    && value.conversationId.split(':')[0] < value.conversationId.split(':')[1] && /^[A-Za-z0-9]{20}$/.test(value.messageId)) return { kind: 'message', conversationId:value.conversationId, messageId:value.messageId };
  if (['invitation','invitation-accepted'].includes(value.kind) && codeValid(value.code)) return { kind:value.kind, code:value.code };
  throw new PushError('invalid-event');
}
export function decodeFields(fields = {}) {
  const value = raw => {
    if ('stringValue' in raw) return raw.stringValue;
    if ('booleanValue' in raw) return raw.booleanValue;
    if ('timestampValue' in raw) return raw.timestampValue;
    if ('integerValue' in raw) return Number(raw.integerValue);
    if ('mapValue' in raw) return decodeFields(raw.mapValue.fields);
    if ('arrayValue' in raw) return (raw.arrayValue.values || []).map(value);
    return null;
  };
  return Object.fromEntries(Object.entries(fields).map(([key,raw])=>[key,value(raw)]));
}
export function recent(value, now = Date.now()) {
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= now + 60_000 && now - time <= 10 * 60_000;
}
export async function verifiedEvent(input, actor, read, now = Date.now()) {
  if (input.kind === 'message') {
    const peers = input.conversationId.split(':');
    if (!peers.includes(actor)) throw new PushError('unavailable', 403);
    const message = await read(`communityConversations/${input.conversationId}/messages/${input.messageId}`);
    if (!message || message.senderId !== actor || message.id !== input.messageId || !recent(message.createdAt,now)) throw new PushError('unavailable',403);
    const recipientId = peers.find(id=>id!==actor);
    return { id:`message:${input.conversationId}:${input.messageId}`, actorId:actor, recipientId, category:'messages', kind:'message', route:`/#/messages/${encodeURIComponent(input.conversationId)}` };
  }
  const invite = await read(`communityInvitations/${input.code}`);
  if (!invite || invite.id !== input.code) throw new PushError('unavailable',403);
  let recipientId;
  if (input.kind === 'invitation') {
    if (invite.ownerId !== actor || invite.kind !== 'event' || !uidValid(invite.recipientId) || invite.recipientId === actor || invite.status !== 'active' || !recent(invite.createdAt,now)) throw new PushError('unavailable',403);
    recipientId = invite.recipientId;
    if(typeof invite.eventId!=='string'||!uidValid(invite.eventId))throw new PushError('unavailable',403);
    const event=await read(`communityEvents/${invite.eventId}`);
    if(!event||event.ownerId!==actor||event.visibility!=='private'||event.status!=='open'||!Number.isFinite(event.startAtMs)||event.startAtMs<=now)throw new PushError('unavailable',403);
  } else {
    if (invite.status !== 'used' || invite.usedBy !== actor || !uidValid(invite.ownerId) || invite.ownerId === actor || !recent(invite.usedAt,now)) throw new PushError('unavailable',403);
    recipientId = invite.ownerId;
  }
  // A get is authorized by the conversation rules even when the document is
  // absent. A 404 is allowed; a 403 rejects blocks, disconnection and suspension.
  await read(`communityConversations/${pairId(actor,recipientId)}`);
  return { id:`${input.kind}:${input.code}`, actorId:actor, recipientId, category:'invitations', kind:input.kind,
    route:input.kind === 'invitation' ? `/#/invite/${input.code}` : '/#/connect?tab=invitations' };
}
