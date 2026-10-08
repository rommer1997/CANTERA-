import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as logic from '../src/community/messagingLogic.ts';
import { TERMS_VERSION } from '../src/community/policy.ts';

test('revocar sólo al peer del piloto cierra su hilo y descarta callbacks con el actor aún habilitado', async () => {
  const community = {
    mode: 'cloud', serviceAvailable: true, accountModeration: null, blockedIds: [],
    profile: { id: 'alice', adultConfirmed: true, city: 'Madrid', country: 'España', acceptedTermsVersion: TERMS_VERSION, acceptedTermsAt: '2026-10-08T12:00:00.000Z' },
    runtimeConfig: { serviceStatus: 'pilot', pilotUserIds: ['alice', 'bob'] },
  };
  const invitations = { connections: [{ ownerId: 'alice', peerId: 'bob', createdAt: '2026-10-08T12:00:00.000Z' }], loading: false, error: '' };
  const auth = { currentUser: { uid: 'alice', emailVerified: true } };
  let cursor = 0;
  const refs: any[] = [], writes: any[] = [];
  const react = { createContext: () => ({ Provider: 'provider' }), useRef(value: unknown) { return refs[cursor++] ||= { current: value }; } };
  const modules: Record<string, unknown> = {
    react, 'react/jsx-runtime': { jsx: (type: unknown, props: unknown) => ({ type, props }) },
    'firebase/firestore': { doc: (_db: unknown, ...parts: string[]) => ({ path: parts.join('/') }), serverTimestamp: () => 'server-time', runTransaction: async (_db: unknown, callback: any) => callback({ get: async () => ({ exists: () => false }), set: (target: unknown, value: unknown) => writes.push({ target, value }) }) },
    '../firebase': { auth, db: {} }, './CommunityContext': { useCommunity: () => community, TERMS_VERSION },
    './InvitationsContext': { useInvitations: () => invitations }, './messagingLogic': logic, './policy': { TERMS_VERSION },
  };
  const source = readFileSync(new URL('../src/community/MessagingContext.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports: any = {};
  new Function('exports', 'require', compiled)(exports, (name: string) => modules[name]);
  const render = () => { cursor = 0; return exports.MessagingProvider({ children: null }).props.value; };
  const initial = render();
  assert.equal(initial.eligible, true); assert.equal(initial.conversations.length, 1);
  assert.equal(await initial.openConversation('bob'), 'alice:bob'); assert.equal(writes.length, 1);
  community.runtimeConfig.pilotUserIds = ['alice'];
  const revoked = render();
  assert.equal(community.serviceAvailable, true); assert.equal(revoked.eligible, true);
  assert.deepEqual(revoked.conversations, []); assert.notEqual(revoked.scope, initial.scope);
  await assert.rejects(initial.openConversation('bob'), { code: 'signin-required' });
  await assert.rejects(revoked.openConversation('bob'), { code: 'unavailable' });
  assert.equal(writes.length, 1);
});
