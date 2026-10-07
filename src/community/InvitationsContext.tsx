import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { arrayUnion, collection, doc, FieldPath, getDoc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useCommunity, TERMS_VERSION } from './CommunityContext';
import { isPublicEvent } from './eventPrivacy';
import { joinParticipants, requireText } from './logic';
import { readDemo, writeDemo } from './local';
import { normalizeDemoData } from './normalization';
import { generateInvitationCode, InvitationError, normalizeConnection, normalizeInvitation, normalizeInvitationCode, validateInvitationAcceptance } from './invitations';
import { acceptDemoConnection, commitDemoEventInvitation, createDemoInvitation, readInvitationDemo, removeDemoConnection, revokeDemoInvitation } from './invitationDemo';
import type { CommunityConnection, CommunityInvitation, InvitationKind } from './invitationTypes';

interface InvitationsAPI {
  connections: CommunityConnection[]; ownInvitations: CommunityInvitation[]; loading: boolean; error: string;
  eligible: boolean; emailVerified: boolean;
  createInvitation(kind: InvitationKind, eventId?: string): Promise<CommunityInvitation>;
  revokeInvitation(code: string): Promise<void>;
  lookupInvitation(code: string): Promise<CommunityInvitation>;
  acceptInvitation(code: string, participantName?: string): Promise<CommunityInvitation>;
  removeConnection(peerId: string): Promise<void>;
}
const Context = createContext<InvitationsAPI | null>(null);
const validUid = (id: string) => id.length > 0 && id.length <= 128 && !['.', '..', '__proto__', 'constructor', 'prototype'].includes(id) && !/[\/\\\u0000-\u001f\u007f]/.test(id);

export function InvitationsProvider({ children }: { children: React.ReactNode }) {
  const api = useCommunity(); const { mode, profile, runtimeConfig, accountModeration } = api;
  const uid = profile?.id || '';
  const scope = `${mode}:${uid}:${runtimeConfig.serviceStatus}`;
  const currentScope = useRef(scope); currentScope.current = scope;
  const [state, setState] = useState<{ scope: string; connections: CommunityConnection[]; invitations: CommunityInvitation[]; loading: boolean; error: string }>({ scope, connections: [], invitations: [], loading: false, error: '' });
  const eligible = !!profile?.adultConfirmed && profile.acceptedTermsVersion === TERMS_VERSION && !!profile.city.trim() && !!profile.country.trim();
  const emailVerified = mode === 'demo' || auth.currentUser?.uid === uid && auth.currentUser.emailVerified;

  useEffect(() => {
    let active = true;
    const current = () => active && currentScope.current === scope && (mode === 'demo' || auth.currentUser?.uid === uid);
    setState({ scope, connections: [], invitations: [], loading: !!uid, error: '' });
    if (!uid) return () => { active = false; };
    if (mode === 'demo') {
      const refresh = () => { if (!current()) return; const data = readInvitationDemo(); setState({ scope, connections: data.connections.filter(item => item.ownerId === uid), invitations: data.invitations.filter(item => item.ownerId === uid).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), loading: false, error: '' }); };
      refresh(); window.addEventListener('cantera-invitations-updated', refresh); window.addEventListener('storage', refresh);
      return () => { active = false; window.removeEventListener('cantera-invitations-updated', refresh); window.removeEventListener('storage', refresh); };
    }
    let connectionsReady = false; let invitationsReady = false;
    const failed = () => { if (current()) setState({ scope, connections: [], invitations: [], loading: false, error: 'No se pudieron cargar tus conexiones e invitaciones. Inténtalo de nuevo.' }); };
    const stops = [
      onSnapshot(query(collection(db, 'communityConnections', uid, 'members'), orderBy('createdAt', 'desc')), snapshot => {
        if (!current()) return; connectionsReady = true;
        setState(old => ({ ...old, connections: snapshot.docs.map(record => normalizeConnection(record.data(), uid, record.id)).filter((item): item is CommunityConnection => !!item), loading: !invitationsReady }));
      }, failed),
      onSnapshot(query(collection(db, 'communityInvitations'), where('ownerId', '==', uid), orderBy('createdAt', 'desc'), limit(100)), snapshot => {
        if (!current()) return; invitationsReady = true;
        setState(old => ({ ...old, invitations: snapshot.docs.map(record => normalizeInvitation(record.data(), record.id)).filter((item): item is CommunityInvitation => !!item), loading: !connectionsReady }));
      }, failed),
    ];
    return () => { active = false; stops.forEach(stop => stop()); };
  }, [scope, mode, uid]);

  function actor(participating = true) {
    if (!profile || currentScope.current !== scope || mode === 'cloud' && auth.currentUser?.uid !== uid || mode === 'demo' && readDemo().profile?.id !== uid) throw new InvitationError('signin-required');
    if (participating && (!eligible || runtimeConfig.serviceStatus !== 'open' || accountModeration?.status === 'suspended')) throw new InvitationError('unavailable');
    return profile;
  }
  function codeOf(raw: string) { const code = normalizeInvitationCode(raw); if (!code) throw new InvitationError('invalid-code'); return code; }
  async function lookupInvitation(raw: string) {
    actor(); const code = codeOf(raw);
    if (!emailVerified) throw new InvitationError('email-verification-required');
    const invitation = mode === 'demo' ? readInvitationDemo().invitations.find(item => item.id === code) || null : await getDoc(doc(db, 'communityInvitations', code)).then(record => record.exists() ? normalizeInvitation(record.data(), record.id) : null);
    actor();
    if (invitation?.status === 'used' && invitation.usedBy === uid) return invitation;
    validateInvitationAcceptance(invitation, { userId: uid, emailVerified });
    return invitation!;
  }
  async function createInvitation(kind: InvitationKind, eventId = '') {
    actor();
    if (kind === 'event') {
      const event = mode === 'demo' ? normalizeDemoData(readDemo()).events.find(item => item.id === eventId) : await getDoc(doc(db, 'communityEvents', eventId)).then(record => record.exists() ? record.data() : null);
      actor();
      if (!event || event.ownerId !== uid || event.visibility !== 'private' || event.status !== 'open' || Date.parse(event.startAt) <= Date.now() || Object.keys(event.participants).length >= event.capacity || event.fixtures.length || event.fixtureIds?.length) throw new InvitationError('unavailable');
    }
    if (mode === 'demo') return createDemoInvitation(uid, kind, eventId);
    const id = generateInvitationCode();
    const target = doc(db, 'communityInvitations', id);
    await setDoc(target, { id, kind, ownerId: uid, eventId: kind === 'connection' ? '' : eventId, status: 'active', createdAt: serverTimestamp(), usedBy: '', usedAt: '' });
    const snapshot = await getDoc(target); actor();
    const invitation = normalizeInvitation(snapshot.data(), id);
    if (!invitation) throw new InvitationError('unavailable'); return invitation;
  }
  async function revokeInvitation(raw: string) {
    actor(false); const code = codeOf(raw);
    if (mode === 'demo') { revokeDemoInvitation(code, uid); return; }
    await runTransaction(db, async tx => {
      const target = doc(db, 'communityInvitations', code); const record = await tx.get(target); actor(false);
      if (!record.exists() || record.data().ownerId !== uid) throw new InvitationError('unavailable');
      if (record.data().status === 'revoked') return;
      if (record.data().status !== 'active') throw new InvitationError('unavailable');
      tx.update(target, { status: 'revoked' });
    });
  }
  async function acceptInvitation(raw: string, participantName?: string): Promise<CommunityInvitation> {
    const user = actor(); const code = codeOf(raw);
    const name = requireText(participantName ?? user.name, 'Nombre de la inscripción', 100);
    if (!emailVerified) throw new InvitationError('email-verification-required');
    if (mode === 'demo') {
      const invite = await lookupInvitation(code);
      if (invite.kind === 'connection') return acceptDemoConnection(code, { userId: uid, emailVerified });
      const data = normalizeDemoData(readDemo()); const event = data.events.find(item => item.id === invite.eventId);
      if (invite.status === 'used') { if (!event || !Object.hasOwn(event.participants, uid)) throw new InvitationError('unavailable'); return invite; }
      return commitDemoEventInvitation(code, { userId: uid, emailVerified }, () => {
        actor(); const latest = normalizeDemoData(readDemo()); const current = latest.events.find(item => item.id === invite.eventId);
        if (!current || isPublicEvent(current) || current.ownerId !== invite.ownerId || Object.hasOwn(current.participants, uid) || current.waitlistOrder?.length) throw new InvitationError('unavailable');
        const participants = joinParticipants(current, uid, name);
        writeDemo({ ...latest, events: latest.events.map(item => item.id === current.id ? { ...current, participants, participantIds: Object.keys(participants), rsvps: { ...(current.rsvps || {}), [uid]: 'yes' } } : item) });
      });
    }
    return runTransaction(db, async tx => {
      const target = doc(db, 'communityInvitations', code); const record = await tx.get(target); actor();
      const invitation = record.exists() ? normalizeInvitation(record.data(), code) : null;
      if (!invitation) throw new InvitationError('unavailable');
      if (invitation.kind === 'connection') {
        const own = doc(db, 'communityConnections', uid, 'members', invitation.ownerId);
        const peer = doc(db, 'communityConnections', invitation.ownerId, 'members', uid);
        const [ownRecord, peerRecord] = await Promise.all([tx.get(own), tx.get(peer)]); actor();
        if (invitation.status === 'used' && invitation.usedBy === uid && ownRecord.exists() && peerRecord.exists()) return invitation;
        validateInvitationAcceptance(invitation, { userId: uid, emailVerified });
        if (ownRecord.exists() || peerRecord.exists() || api.blockedIds.includes(invitation.ownerId)) throw new InvitationError('unavailable');
        tx.set(own, { ownerId: uid, peerId: invitation.ownerId, inviteId: code, createdAt: serverTimestamp() });
        tx.set(peer, { ownerId: invitation.ownerId, peerId: uid, inviteId: code, createdAt: serverTimestamp() });
      } else {
        // A code holder cannot read the event yet. Rules validate its current
        // capacity, date and status atomically with this narrowly scoped update.
        if (invitation.status === 'used' && invitation.usedBy === uid) {
          const current = await tx.get(doc(db, 'communityEvents', invitation.eventId)); actor();
          if (current.exists() && Object.hasOwn(current.data().participants, uid)) return invitation;
          throw new InvitationError('unavailable');
        }
        validateInvitationAcceptance(invitation, { userId: uid, emailVerified });
        tx.set(doc(db, 'communityEventAdmissions', invitation.eventId, 'members', uid), { eventId: invitation.eventId, userId: uid, inviteId: code, createdAt: serverTimestamp() });
        tx.update(doc(db, 'communityEvents', invitation.eventId), new FieldPath('participants', uid), name, 'participantIds', arrayUnion(uid), new FieldPath('rsvps', uid), 'yes');
      }
      tx.update(target, { status: 'used', usedBy: uid, usedAt: serverTimestamp() });
      return { ...invitation, status: 'used', usedBy: uid, usedAt: new Date().toISOString() };
    });
  }
  async function removeConnection(peerId: string) {
    actor(false); if (!validUid(peerId) || peerId === uid) throw new InvitationError('unavailable');
    if (mode === 'demo') { removeDemoConnection(uid, peerId); return; }
    await runTransaction(db, async tx => {
      const own = doc(db, 'communityConnections', uid, 'members', peerId); const peer = doc(db, 'communityConnections', peerId, 'members', uid);
      const [a, b] = await Promise.all([tx.get(own), tx.get(peer)]); actor(false);
      if (a.exists()) tx.delete(own); if (b.exists()) tx.delete(peer);
    });
  }
  const visible = state.scope === scope ? state : { connections: [], invitations: [], loading: !!uid, error: '' };
  return <Context.Provider value={{ connections: visible.connections, ownInvitations: visible.invitations, loading: visible.loading, error: visible.error, eligible, emailVerified, createInvitation, revokeInvitation, lookupInvitation, acceptInvitation, removeConnection }}>{children}</Context.Provider>;
}
export function useInvitations() { const api = useContext(Context); if (!api) throw new Error('InvitationsProvider requerido.'); return api; }
