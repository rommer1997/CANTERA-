import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, startAfter, Timestamp, where, writeBatch, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { friendlyError, TERMS_VERSION, useCommunity } from './CommunityContext';
import { normalizeTeam, normalizeTeamMember, normalizeTeamInvite, normalizeTeamRequest } from './teamNormalization';
import { assertInvite, isTeamManager, memberId, validTeamInput } from './teamLogic';
import { readDemo } from './local';
import { normalizeEvent } from './normalization';
import { isPublicEvent } from './eventPrivacy';
import { keyedSubscriptions } from './keyedSubscriptions';
import type { PlayEvent } from './types';
import type { CommunityTeam, TeamInput, TeamInvite, TeamJoinRequest, TeamMember } from './teamTypes';
interface LocalTeams { teams: CommunityTeam[]; members: TeamMember[]; invites: TeamInvite[]; requests: TeamJoinRequest[]; }
const key = 'cantera-teams-v1';
const empty = (): LocalTeams => ({ teams: [], members: [], invites: [], requests: [] });
const stamp = () => new Date().toISOString();
function read(): LocalTeams { try { const raw = JSON.parse(localStorage.getItem(key) || '{}'); const records = <T,>(v: unknown, normalize: (v: unknown) => T | null): T[] => Array.isArray(v) ? v.map(item => normalize(item)).filter((item): item is T => item !== null) : []; return { teams: records(raw.teams, normalizeTeam), members: records(raw.members, normalizeTeamMember), invites: records(raw.invites, normalizeTeamInvite), requests: records(raw.requests, normalizeTeamRequest) }; } catch { return empty(); } }
function write(data: LocalTeams) { localStorage.setItem(key, JSON.stringify(data)); window.dispatchEvent(new Event('cantera-teams-updated')); }
const teamRecord = (data: DocumentData, id: string) => normalizeTeam(data, id);
const memberRecord = (data: DocumentData, id: string) => normalizeTeamMember(data, id);
const inviteRecord = (data: DocumentData, id: string) => normalizeTeamInvite(data, id);
const requestRecord = (data: DocumentData, id: string) => normalizeTeamRequest(data, id);
interface TeamsAPI {
  teams: CommunityTeam[]; ownTeams: CommunityTeam[]; managedTeams: CommunityTeam[]; myRoles: Record<string, TeamMember['role']>;
  loading: boolean; error: string; hasMore: boolean; loadMore(reset?: boolean): Promise<void>;
  createTeam(input: TeamInput): Promise<string>; updateTeam(id: string, input: TeamInput): Promise<void>; archiveTeam(id: string): Promise<void>;
  getTeam(id: string): Promise<CommunityTeam | null>; getInvite(id: string): Promise<TeamInvite | null>;
  requestJoin(teamId: string, inviteId?: string): Promise<void>; reviewJoin(teamId: string, userId: string, approve: boolean): Promise<void>;
  createInvite(teamId: string): Promise<string>; revokeInvite(id: string): Promise<void>;
  changeRole(teamId: string, userId: string, role: 'manager' | 'member'): Promise<void>;
  transferOwnership(teamId: string, userId: string): Promise<void>; leaveTeam(teamId: string): Promise<void>; removeMember(teamId: string, userId: string): Promise<void>;
}
const Context = createContext<TeamsAPI | null>(null);
export function TeamsProvider({ children }: { children: React.ReactNode }) {
  const community = useCommunity(); const { profile, mode } = community;
  const [teams, setTeams] = useState<CommunityTeam[]>([]); const [ownTeams, setOwnTeams] = useState<CommunityTeam[]>([]); const [myRoles, setRoles] = useState<Record<string, TeamMember['role']>>({});
  const membershipKey = `${mode}:${profile?.id || 'guest'}`;
  const currentMembershipKey = useRef(membershipKey); currentMembershipKey.current = membershipKey;
  const [ownKey, setOwnKey] = useState(membershipKey);
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [hasMore, setMore] = useState(true);
  const cursor = useRef<QueryDocumentSnapshot<DocumentData> | null>(null); const busy = useRef(false); const epoch = useRef(0);
  const available = community.serviceAvailable;
  const publicScope = `${mode}:${available}`; const currentPublicScope = useRef(publicScope); currentPublicScope.current = publicScope;
  const mutationScope = `${membershipKey}:${available}`; const currentMutationScope = useRef(mutationScope); currentMutationScope.current = mutationScope;
  const actor = (participating = true) => {
    if (currentMutationScope.current !== mutationScope) throw new Error('Tu cuenta ha cambiado. Vuelve a intentar la acción.');
    if (!profile || (mode === 'cloud' && auth.currentUser?.uid !== profile.id)) throw new Error('Entra con tu cuenta para continuar.');
    if (participating && community.accountModeration?.status === 'suspended') throw new Error(`Tu cuenta está suspendida: ${community.accountModeration.reason}`);
    if (participating && (!profile.city.trim() || !profile.country.trim())) throw new Error('Completa la ciudad y el país de tu perfil antes de participar.');
    if (participating && (!available || !profile.adultConfirmed || profile.acceptedTermsVersion !== TERMS_VERSION)) throw new Error('Completa tu perfil y acepta las condiciones para participar.');
    return profile;
  };
  const loadMore = useCallback(async (reset = false) => {
    if (currentPublicScope.current !== publicScope) return;
    if (!available) { epoch.current += 1; busy.current = false; setLoading(false); setError(''); setTeams([]); setMore(false); return; }
    if (busy.current && !reset) return;
    if (reset) { cursor.current = null; epoch.current += 1; setTeams([]); }
    const current = epoch.current; busy.current = true; setLoading(true); setError('');
    try {
      if (mode === 'demo') { const all = read().teams.filter(t => t.status === 'active').sort((a, b) => b.createdAt.localeCompare(a.createdAt)); setTeams(all); setMore(false); }
      else { const snapshot = await getDocs(query(collection(db, 'communityTeams'), where('status', '==', 'active'), orderBy('createdAt', 'desc'), ...(cursor.current ? [startAfter(cursor.current)] : []), limit(40))); if (current !== epoch.current || currentPublicScope.current !== publicScope) return; cursor.current = snapshot.docs.at(-1) || cursor.current; const batch = snapshot.docs.map(item => teamRecord(item.data(), item.id)).filter((item): item is CommunityTeam => item !== null); setTeams(previous => [...new Map([...(reset ? [] : previous), ...batch].map(t => [t.id, t])).values()]); setMore(snapshot.size === 40); }
    } catch (err) { if (current === epoch.current && currentPublicScope.current === publicScope) setError(friendlyError(err)); } finally { if (current === epoch.current && currentPublicScope.current === publicScope) { busy.current = false; setLoading(false); } }
  }, [mode, available, publicScope]);
  useEffect(() => { void loadMore(true); const refresh = () => { if (mode === 'demo') void loadMore(true); }; window.addEventListener('storage', refresh); window.addEventListener('cantera-teams-updated', refresh); return () => { epoch.current += 1; busy.current = false; window.removeEventListener('storage', refresh); window.removeEventListener('cantera-teams-updated', refresh); }; }, [loadMore, mode]);
  useEffect(() => {
    let active = true; setOwnKey(membershipKey); setOwnTeams([]); setRoles({}); if (!profile) return;
    const current = () => active && currentMembershipKey.current === membershipKey && (mode === 'demo' || auth.currentUser?.uid === profile.id);
    const subscriptions = keyedSubscriptions<CommunityTeam>(
      (id, receive, fail) => onSnapshot(doc(db, 'communityTeams', id), snapshot => receive(snapshot.exists() ? teamRecord(snapshot.data(), snapshot.id) : null), fail),
      rows => { if (current()) setOwnTeams([...rows.values()]); },
      err => { if (current()) setError(friendlyError(err)); },
    );
    const receive = (members: TeamMember[]) => {
      if (!current()) return; setRoles(Object.fromEntries(members.map(m => [m.teamId, m.role])));
      if (mode === 'demo') { const data = read(); setOwnTeams(data.teams.filter(t => members.some(m => m.teamId === t.id))); return; }
      subscriptions.reconcile(members.map(member => member.teamId));
    };
    if (mode === 'demo') { const refresh = () => receive(read().members.filter(m => m.userId === profile.id)); refresh(); window.addEventListener('storage', refresh); window.addEventListener('cantera-teams-updated', refresh); return () => { active = false; subscriptions.dispose(); window.removeEventListener('storage', refresh); window.removeEventListener('cantera-teams-updated', refresh); }; }
    const stop = onSnapshot(query(collection(db, 'communityTeamMembers'), where('userId', '==', profile.id)), snap => receive(snap.docs.map(item => memberRecord(item.data(), item.id)).filter((item): item is TeamMember => item !== null)), err => { if (current()) setError(friendlyError(err)); });
    return () => { active = false; stop(); subscriptions.dispose(); };
  }, [mode, profile?.id]);
  async function getTeam(id: string) { if (mode === 'demo') return read().teams.find(t => t.id === id) || null; const item = await getDoc(doc(db, 'communityTeams', id)); return item.exists() ? teamRecord(item.data(), item.id) : null; }
  async function getInvite(id: string) { actor(false); if (mode === 'demo') return read().invites.find(t => t.id === id) || null; const item = await getDoc(doc(db, 'communityTeamInvites', id)); return item.exists() ? inviteRecord(item.data(), item.id) : null; }
  function localManager(data: LocalTeams, id: string, owner = false) { const user = actor(); const role = data.members.find(m => m.teamId === id && m.userId === user.id)?.role; if (owner ? role !== 'owner' : !isTeamManager(role)) throw new Error('Sólo los responsables del equipo pueden hacer este cambio.'); return user; }
  async function createTeam(input: TeamInput) {
    const startedScope = currentMutationScope.current; const user = actor(); const clean = validTeamInput(input); const id = crypto.randomUUID(); const now = stamp(); const team: CommunityTeam = { ...clean, id, ownerId: user.id, status: 'active', createdAt: now, updatedAt: now }; const membership: TeamMember = { id: memberId(id, user.id), teamId: id, userId: user.id, name: user.name, role: 'owner', joinedAt: now };
    if (mode === 'demo') { const data = read(); data.teams.push(team); data.members.push(membership); write(data); }
    else { const batch = writeBatch(db); batch.set(doc(db, 'communityTeams', id), { ...team, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); batch.set(doc(db, 'communityTeamMembers', membership.id), { ...membership, joinedAt: serverTimestamp() }); await batch.commit(); if (currentMutationScope.current !== startedScope) return id; await loadMore(true); }
    return id;
  }
  async function updateTeam(id: string, input: TeamInput) { const startedScope = currentMutationScope.current; actor(); const clean = validTeamInput(input); if (mode === 'demo') { const data = read(); localManager(data, id, true); const team = data.teams.find(t => t.id === id); if (!team) throw new Error('Equipo no encontrado.'); Object.assign(team, clean, { updatedAt: stamp() }); write(data); } else { const batch = writeBatch(db); batch.update(doc(db, 'communityTeams', id), { ...clean, updatedAt: serverTimestamp() }); await batch.commit(); if (currentMutationScope.current !== startedScope) return; setOwnTeams(previous => previous.map(t => t.id === id ? { ...t, ...clean, updatedAt: stamp() } : t)); await loadMore(true); } }
  async function archiveTeam(id: string) { const startedScope = currentMutationScope.current; actor(); if (mode === 'demo') { const data = read(); localManager(data, id, true); const team = data.teams.find(t => t.id === id); if (!team) throw new Error('Equipo no encontrado.'); team.status = 'archived'; team.updatedAt = stamp(); write(data); } else { const batch = writeBatch(db); batch.update(doc(db, 'communityTeams', id), { status: 'archived', updatedAt: serverTimestamp() }); await batch.commit(); if (currentMutationScope.current !== startedScope) return; setOwnTeams(previous => previous.map(t => t.id === id ? { ...t, status: 'archived', updatedAt: stamp() } : t)); await loadMore(true); } }
  async function requestJoin(teamId: string, inviteId = '') {
    const user = actor(); const id = memberId(teamId, user.id); const entry: TeamJoinRequest = { id, teamId, userId: user.id, name: user.name, inviteId, status: 'pending', createdAt: stamp(), reviewedAt: '' };
    if (mode === 'demo') { const data = read(); const team = data.teams.find(t => t.id === teamId); if (!team || team.status !== 'active') throw new Error('Este equipo no admite nuevas solicitudes.'); if (inviteId) assertInvite(data.invites.find(i => i.id === inviteId) || null, team); if (data.members.some(m => m.id === id)) throw new Error('Ya formas parte de este equipo.'); const existing = data.requests.find(r => r.id === id); if (existing?.status === 'pending') throw new Error('Tu solicitud ya está pendiente.'); data.requests = [...data.requests.filter(r => r.id !== id), entry]; write(data); }
    else await runTransaction(db, async tx => { const teamRef = doc(db, 'communityTeams', teamId); const membership = doc(db, 'communityTeamMembers', id); const requestRef = doc(db, 'communityTeamJoinRequests', id); const [teamSnap, memberSnap, existing] = await Promise.all([tx.get(teamRef), tx.get(membership), tx.get(requestRef)]); if (!teamSnap.exists() || teamSnap.data().status !== 'active') throw new Error('Este equipo no admite nuevas solicitudes.'); if (memberSnap.exists()) throw new Error('Ya formas parte de este equipo.'); if (existing.exists() && existing.data().status === 'pending') throw new Error('Tu solicitud ya está pendiente.'); if (inviteId) { const invitation = await tx.get(doc(db, 'communityTeamInvites', inviteId)); assertInvite(invitation.exists() ? inviteRecord(invitation.data(), invitation.id) : null, teamRecord(teamSnap.data(), teamSnap.id)); } tx.set(requestRef, { ...entry, createdAt: serverTimestamp() }); });
  }
  async function reviewJoin(teamId: string, userId: string, approve: boolean) {
    actor(); const id = memberId(teamId, userId);
    if (mode === 'demo') { const data = read(); localManager(data, teamId); const request = data.requests.find(r => r.id === id); if (!request || request.status !== 'pending') throw new Error('La solicitud ya ha sido revisada.'); const team = data.teams.find(t => t.id === teamId); if (approve && team?.status !== 'active') throw new Error('El equipo está archivado.'); request.status = approve ? 'approved' : 'rejected'; request.reviewedAt = stamp(); if (approve && !data.members.some(m => m.id === id)) data.members.push({ id, teamId, userId, name: request.name, role: 'member', joinedAt: stamp() }); write(data); }
    else await runTransaction(db, async tx => { const requestRef = doc(db, 'communityTeamJoinRequests', id); const memberRef = doc(db, 'communityTeamMembers', id); const [entry, member] = await Promise.all([tx.get(requestRef), tx.get(memberRef)]); if (!entry.exists() || entry.data().status !== 'pending') throw new Error('La solicitud ya ha sido revisada.'); tx.update(requestRef, { status: approve ? 'approved' : 'rejected', reviewedAt: serverTimestamp() }); if (approve && !member.exists()) tx.set(memberRef, { id, teamId, userId, name: entry.data().name, role: 'member', joinedAt: serverTimestamp() }); });
  }
  async function createInvite(teamId: string) { const user = actor(); const id = crypto.randomUUID(); const entry: TeamInvite = { id, teamId, createdBy: user.id, revoked: false, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), createdAt: stamp() }; if (mode === 'demo') { const data = read(); localManager(data, teamId); if (data.teams.find(t => t.id === teamId)?.status !== 'active') throw new Error('El equipo está archivado.'); data.invites.push(entry); write(data); } else { const batch = writeBatch(db); batch.set(doc(db, 'communityTeamInvites', id), { ...entry, createdAt: serverTimestamp(), expiresAt: Timestamp.fromDate(new Date(entry.expiresAt)) }); await batch.commit(); } return id; }
  async function revokeInvite(id: string) { actor(); if (mode === 'demo') { const data = read(); const entry = data.invites.find(i => i.id === id); if (!entry) throw new Error('Enlace no encontrado.'); localManager(data, entry.teamId); entry.revoked = true; write(data); } else { const batch = writeBatch(db); batch.update(doc(db, 'communityTeamInvites', id), { revoked: true }); await batch.commit(); } }
  async function changeRole(teamId: string, userId: string, role: 'manager' | 'member') { const user = actor(); if (user.id === userId) throw new Error('Para cambiar al propietario, utiliza Transferir equipo.'); if (mode === 'demo') { const data = read(); localManager(data, teamId, true); const member = data.members.find(m => m.id === memberId(teamId, userId)); if (!member || member.role === 'owner') throw new Error('No se puede cambiar este rol.'); member.role = role; write(data); } else { const batch = writeBatch(db); batch.update(doc(db, 'communityTeamMembers', memberId(teamId, userId)), { role }); await batch.commit(); } }
  async function transferOwnership(teamId: string, userId: string) { const user = actor(); if (userId === user.id) throw new Error('Ya eres el propietario.'); if (mode === 'demo') { const data = read(); localManager(data, teamId, true); const next = data.members.find(m => m.id === memberId(teamId, userId)); const current = data.members.find(m => m.id === memberId(teamId, user.id)); const team = data.teams.find(t => t.id === teamId); if (!next || !current || !team) throw new Error('El nuevo responsable debe formar parte del equipo.'); next.role = 'owner'; current.role = 'manager'; team.ownerId = userId; team.updatedAt = stamp(); write(data); } else await runTransaction(db, async tx => { const nextRef = doc(db, 'communityTeamMembers', memberId(teamId, userId)); const next = await tx.get(nextRef); if (!next.exists()) throw new Error('El nuevo responsable debe formar parte del equipo.'); tx.update(doc(db, 'communityTeams', teamId), { ownerId: userId, updatedAt: serverTimestamp() }); tx.update(doc(db, 'communityTeamMembers', memberId(teamId, user.id)), { role: 'manager' }); tx.update(nextRef, { role: 'owner' }); }); }
  async function removeMember(teamId: string, userId: string) { const user = actor(userId !== profile?.id); if (mode === 'demo') { const data = read(); const member = data.members.find(m => m.id === memberId(teamId, userId)); if (!member) return; if (member.role === 'owner') throw new Error('Transfiere el equipo antes de salir.'); if (user.id !== userId) localManager(data, teamId, true); data.members = data.members.filter(m => m.id !== member.id); write(data); } else { const batch = writeBatch(db); batch.delete(doc(db, 'communityTeamMembers', memberId(teamId, userId))); await batch.commit(); } }
  const ownIdentityMatches = ownKey === membershipKey && (mode === 'demo' || auth.currentUser?.uid === profile?.id);
  const currentTeams = ownIdentityMatches ? ownTeams : []; const currentRoles = ownIdentityMatches ? myRoles : {};
  const value: TeamsAPI = { teams, ownTeams: currentTeams, managedTeams: currentTeams.filter(t => t.status === 'active' && isTeamManager(currentRoles[t.id])), myRoles: currentRoles, loading, error, hasMore, loadMore, createTeam, updateTeam, archiveTeam, getTeam, getInvite, requestJoin, reviewJoin, createInvite, revokeInvite, changeRole, transferOwnership, leaveTeam: id => removeMember(id, actor(false).id), removeMember };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTeams() { const api = useContext(Context); if (!api) throw new Error('TeamsProvider no disponible'); return api; }

interface TeamEventsState {
  key: string; events: PlayEvent[]; status: 'loading' | 'ready' | 'error' | 'unavailable';
  loading: boolean; error: string; hasMore: boolean; invalidCount: number; fromCache: boolean;
}
// Team agendas query their own collection pages and never depend on the global
// community window. Only public event metadata is needed here; fixture details
// are loaded by the encounter page when the person follows its direct link.
export function useTeamEvents(teamId: string) {
  const { mode, serviceAvailable } = useCommunity();
  const validId = !!teamId && teamId.length <= 128 && !/[\/\\\u0000-\u001f\u007f]/.test(teamId) && !['.', '..', '__proto__', 'constructor', 'prototype'].includes(teamId);
  const available = serviceAvailable;
  const key = JSON.stringify([mode, available, teamId]);
  const currentKey = useRef(key); currentKey.current = key;
  const [state, setState] = useState<TeamEventsState>({ key, events: [], status: 'loading', loading: true, error: '', hasMore: false, invalidCount: 0, fromCache: false });
  const cursor = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const busy = useRef(false), epoch = useRef(0), more = useRef(true);
  const loadMore = useCallback(async (reset = false) => {
    if (!validId || !available) {
      epoch.current += 1; cursor.current = null; busy.current = false; more.current = false;
      setState({ key, events: [], status: validId ? 'unavailable' : 'error', loading: false, error: validId ? '' : 'El enlace del equipo no es válido.', hasMore: false, invalidCount: 0, fromCache: false }); return;
    }
    if (!reset && (busy.current || !more.current)) return;
    if (reset) { epoch.current += 1; cursor.current = null; more.current = true; }
    const version = epoch.current;
    const active = () => currentKey.current === key && epoch.current === version;
    busy.current = true;
    setState(previous => ({ key, events: reset || previous.key !== key ? [] : previous.events, status: 'loading', loading: true, error: '', hasMore: reset ? false : previous.hasMore, invalidCount: reset ? 0 : previous.invalidCount, fromCache: reset ? false : previous.fromCache }));
    try {
      if (mode === 'demo') {
        const all = readDemo().events.filter(event => event && event.teamId === teamId && isPublicEvent(event));
        const events = all.map(event => normalizeEvent(event, event.id)).filter((event): event is PlayEvent => event !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
        if (!active()) return;
        more.current = false;
        setState({ key, events, status: 'ready', loading: false, error: '', hasMore: false, invalidCount: all.length - events.length, fromCache: false });
      } else {
        const snapshot = await getDocs(query(collection(db, 'communityEvents'), where('teamId', '==', teamId), where('visibility', '==', 'public'), orderBy('createdAt', 'desc'), ...(cursor.current ? [startAfter(cursor.current)] : []), limit(20)));
        if (!active()) return;
        const events = snapshot.docs.map(document => normalizeEvent(document.data(), document.id)).filter((event): event is PlayEvent => event !== null && event.teamId === teamId && isPublicEvent(event));
        cursor.current = snapshot.docs.at(-1) || cursor.current; more.current = snapshot.size === 20;
        setState(previous => ({ key, events: [...new Map([...(reset ? [] : previous.events), ...events].map(event => [event.id, event])).values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)), status: 'ready', loading: false, error: '', hasMore: more.current, invalidCount: (reset ? 0 : previous.invalidCount) + snapshot.size - events.length, fromCache: (reset ? false : previous.fromCache) || snapshot.metadata.fromCache }));
      }
    } catch (error) {
      if (active()) {
        const code = (error as { code?: string })?.code;
        const message = code === 'failed-precondition' ? 'La agenda del equipo todavía no está disponible. Contacta con la organización para revisar el servicio.' : code === 'permission-denied' ? 'El servicio no permite consultar esta agenda en este momento.' : code === 'unavailable' ? 'No hay conexión para cargar la agenda. Vuelve a intentarlo.' : 'No se pudo cargar la agenda del equipo. Vuelve a intentarlo.';
        setState(previous => ({ ...previous, key, status: 'error', loading: false, error: message }));
      }
    } finally { if (active()) busy.current = false; }
  }, [key, validId, available, mode, teamId]);
  useEffect(() => {
    void loadMore(true);
    const refresh = () => { if (mode === 'demo') void loadMore(true); };
    if (mode === 'demo') { window.addEventListener('storage', refresh); window.addEventListener('cantera-demo-updated', refresh); }
    return () => { epoch.current += 1; busy.current = false; window.removeEventListener('storage', refresh); window.removeEventListener('cantera-demo-updated', refresh); };
  }, [loadMore, mode]);
  // A route or service change must hide the previous team's data immediately,
  // before the next effect runs or an older request finishes.
  const current: TeamEventsState = state.key === key ? state : { key, events: [], status: available && validId ? 'loading' : validId ? 'unavailable' : 'error', loading: available && validId, error: validId ? '' : 'El enlace del equipo no es válido.', hasMore: false, invalidCount: 0, fromCache: false };
  return { ...current, loadMore, refresh: () => loadMore(true) };
}

export function useTeamDetail(id: string) {
  const { mode, profile, serviceAvailable } = useCommunity(); const { myRoles } = useTeams();
  const [team, setTeam] = useState<CommunityTeam | null>(null); const [members, setMembers] = useState<TeamMember[]>([]); const [requests, setRequests] = useState<TeamJoinRequest[]>([]); const [invites, setInvites] = useState<TeamInvite[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const role = myRoles[id];
  useEffect(() => { let active = true; setTeam(null); setMembers([]); setRequests([]); setInvites([]); setLoading(Boolean(id)); setError(''); if (!id) return;
    const failed = (err: unknown) => { if (active) { setError(friendlyError(err)); setLoading(false); } };
    if (mode === 'demo') { const refresh = () => { const data = read(); setTeam(data.teams.find(t => t.id === id) || null); setMembers(role ? data.members.filter(m => m.teamId === id) : []); setRequests(data.requests.filter(r => r.teamId === id && (isTeamManager(role) || r.userId === profile?.id))); setInvites(isTeamManager(role) ? data.invites.filter(i => i.teamId === id) : []); setLoading(false); }; refresh(); window.addEventListener('storage', refresh); window.addEventListener('cantera-teams-updated', refresh); return () => { active = false; window.removeEventListener('storage', refresh); window.removeEventListener('cantera-teams-updated', refresh); }; }
    if (!serviceAvailable && !role) { setLoading(false); return; }
    const stops = [onSnapshot(doc(db, 'communityTeams', id), snap => { if (active) { setTeam(snap.exists() ? teamRecord(snap.data(), snap.id) : null); setLoading(false); } }, failed)];
    if (role) stops.push(onSnapshot(query(collection(db, 'communityTeamMembers'), where('teamId', '==', id)), snap => { if (active) setMembers(snap.docs.map(d => memberRecord(d.data(), d.id)).filter((item): item is TeamMember => item !== null)); }, failed));
    if (profile) stops.push(onSnapshot(query(collection(db, 'communityTeamJoinRequests'), where('teamId', '==', id), ...(isTeamManager(role) ? [] : [where('userId', '==', profile.id)])), snap => { if (active) setRequests(snap.docs.map(d => requestRecord(d.data(), d.id)).filter((item): item is TeamJoinRequest => item !== null)); }, failed));
    if (isTeamManager(role)) stops.push(onSnapshot(query(collection(db, 'communityTeamInvites'), where('teamId', '==', id)), snap => { if (active) setInvites(snap.docs.map(d => inviteRecord(d.data(), d.id)).filter((item): item is TeamInvite => item !== null)); }, failed));
    return () => { active = false; stops.forEach(stop => stop()); };
  }, [id, mode, profile?.id, role, serviceAvailable]);
  return { team, members, requests, invites, loading, error, role };
}
