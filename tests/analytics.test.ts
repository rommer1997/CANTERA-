import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsPage, createAnalytics } from '../src/community/analytics.ts';
const enabled = { enabled: true, provider: 'plausible', domain: 'lacantera.com.es', endpoint: 'https://plausible.io/api/event' };

test('ningún código, cuenta, conversación, búsqueda ni URL externa llega a la ruta analítica', () => {
  for (const [hash, route] of [['#/invite/SECRET?email=PRIVATE', '/invite/:id'], ['#/people/PRIVATE_UID', '/people/:id'], ['#/messages/PRIVATE_A:PRIVATE_B', '/messages/:id'], ['#/feed?post=PRIVATE', '/feed'], ['#/other/PRIVATE', '/other']]) assert.equal(analyticsPage(hash), route);
});

test('configuración pendiente, desarrollo y No rastrear no generan peticiones', () => {
  let sends = 0;
  const environment = { production: true, hash: () => '#/', doNotTrack: () => false, send: async () => { sends++; } };
  for (const settings of [{ ...enabled, enabled: false }, { ...enabled, domain: 'TODO_ANALYTICS_DOMAIN' }, { ...enabled, provider: 'unknown' }, { ...enabled, endpoint: 'http://insecure.test' }]) createAnalytics(settings, environment)('pageview');
  createAnalytics(enabled, { ...environment, production: false })('pageview');
  createAnalytics(enabled, { ...environment, doNotTrack: () => true })('pageview');
  assert.equal(sends, 0);
});

test('solo se envían acciones permitidas con URL saneada, sin cookies ni referente', () => {
  const sent: RequestInit[] = [];
  const track = createAnalytics(enabled, { production: true, hash: () => '#/play/PRIVATE?code=SECRET', doNotTrack: () => false, send: async (_url, request) => { sent.push(request); } });
  track('MatchCreated'); track('UNKNOWN' as never);
  assert.equal(sent.length, 1);
  assert.deepEqual(JSON.parse(sent[0].body as string), { name: 'MatchCreated', domain: enabled.domain, url: 'https://lacantera.com.es/#/play/:id' });
  assert.equal(sent[0].credentials, 'omit'); assert.equal(sent[0].referrerPolicy, 'no-referrer');
});


test('Umami recibe categorías y acciones sin ID de visitante, caché ni datos de sesión', () => {
 const requests: RequestInit[] = [];
 const settings = { ...enabled, provider: 'umami', endpoint: 'https://gateway.umami.is/api/send', websiteId: 'aabbccdd-1234-1234-1234-aabbccddeeff' };
 const environment = { production: true, hash: () => '#/invite/PRIVATE_CODE?email=PRIVATE', doNotTrack: () => false, send: async (_url: string, request: RequestInit) => { requests.push(request); return { sessionId: 'DO_NOT_PERSIST', cache: 'DO_NOT_REUSE' }; } };
 const track = createAnalytics(settings, environment);
 track('pageview'); track('RegistrationCompleted');
 assert.deepEqual(JSON.parse(requests[0].body as string), {type:'event',payload:{hostname:settings.domain,website:settings.websiteId,url:'/#/invite/:id',referrer:''}});
 assert.equal(JSON.parse(requests[1].body as string).payload.name, 'RegistrationCompleted');
 createAnalytics({ ...settings, websiteId: 'TODO_UMAMI_WEBSITE_ID' }, environment)('pageview');
 createAnalytics(settings, { ...environment, doNotTrack: () => true })('pageview');
 assert.equal(requests.length, 2);
 assert.ok(requests.every(request => !/PRIVATE|DO_NOT|sessionId|distinctId|"id"/.test(request.body as string)));
});
