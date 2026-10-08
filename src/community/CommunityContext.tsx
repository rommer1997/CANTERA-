import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, deleteDoc, getCountFromServer, serverTimestamp, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, setDoc, startAfter, updateDoc, where, writeBatch, type DocumentData, type DocumentSnapshot, type QueryDocumentSnapshot } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { auth, db, logout, signInWithGoogle, storage } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import { deleteLocalMedia, getLocalMedia, readDemo, saveLocalMedia, writeDemo, type DemoData } from './local';
import { createLocalMediaCache, publishLocalPosts } from './localMediaCache';
import { createCoalescedRefresh } from './coalescedRefresh';
import { removeDemoConnection } from './invitationDemo';
import { legalReady, operator } from './legal';
import { normalizeFixtureRecord, fixtureFields, sameFixture } from './fixtureRecords';
import { commitDeliveryBatches } from './deliveryBatches';
import { TERMS_VERSION } from './policy';
import { canReadEvent, isPublicEvent } from './eventPrivacy';
export { TERMS_VERSION } from './policy';
import { joinParticipants, makeFixtures, recordScore, requireText, validateEvent, validateEventEdit, validateFixtureSchedule, validateMatchResult } from './logic';
import { normalizeCommentRecord, normalizeDemoData, normalizeEvent, normalizeFollow, normalizeHiddenPostIds, normalizeLike, normalizePost, normalizeProfile, normalizePublicProfile, normalizeReport, normalizeVerification, normalizeNotice, normalizeRightsRequest, normalizeRuntime, profileSearchTokens, searchText } from './normalization';
import type { CommunityPost, CommunityProfile, ContentReport, EventInput, PlayEvent, PostComment, PostInput, PublicProfile, VerificationRequest, RuntimeConfig, AccountModeration, EventNotice, RightsRequest, FixtureSchedule, MatchResult, Rsvp, EventChange, Fixture, PeopleSearchField, PostInteractionState } from './types';

type Mode = 'demo' | 'cloud';
function noticeRecipientAllowed(event: Pick<PlayEvent, 'visibility' | 'ownerId' | 'participants'>, recipientId: string): boolean {
  if (recipientId.startsWith('guest-') || recipientId.startsWith('guest_')) return false;
  return isPublicEvent(event) || event.ownerId === recipientId || Object.hasOwn(event.participants, recipientId);
}
interface CommunityAPI {
  profile: CommunityProfile | null; mode: Mode; loading: boolean; error: string; isAdmin: boolean;
  demoEnabled: boolean; mediaUploadsEnabled: boolean; runtimeConfig: RuntimeConfig; accountModeration: AccountModeration | null;
  ownEvents: PlayEvent[]; ownEventsHasMore: boolean; ownEventsLoading: boolean; loadMoreOwnEvents(): Promise<void>; eventsHasMore: boolean; postsHasMore: boolean; eventsLoading: boolean; postsLoading: boolean;
  loadMoreEvents(reset?: boolean): Promise<void>; loadMorePosts(reset?: boolean): Promise<void>;
  adminRightsRequests: RightsRequest[]; adminQueueHasMore: Record<'verification' | 'reports' | 'rights', boolean>; adminQueueLoading: Record<'verification' | 'reports' | 'rights', boolean>; loadMoreAdminQueue(kind: 'verification' | 'reports' | 'rights'): Promise<void>;
  suspendAccount(userId: string, reason: string, suspend?: boolean): Promise<void>; reviewRightsRequest(id: string, status: 'processing' | 'completed' | 'rejected'): Promise<void>; updateRuntimeStatus(status: RuntimeConfig['serviceStatus']): Promise<void>;
  fixtureData: Record<string, Fixture[]>; fixtureStates: Record<string, 'loading' | 'ready' | 'error'>; watchFixtureData(id: string): () => void;
  eventHistories: Record<string, EventChange[]>; watchEventHistory(id: string): () => void;
  eventNotices: EventNotice[]; rightsRequests: RightsRequest[]; markNoticeRead(id: string): Promise<void>; requestRights(kind: 'export' | 'delete'): Promise<void>;
  retryEventNotices(id: string): Promise<{ created: number; inspected: number; hasMore: boolean }>;
  blockedIds: string[]; toggleBlock(id: string): Promise<void>;
  postInteractionStates: Record<string, PostInteractionState>; watchPostInteractions(id: string): () => void; loadMoreComments(id: string): Promise<void>;
  deleteComment(postId: string, commentId: string): Promise<void>; reportComment(postId: string, commentId: string, reason: string): Promise<void>;
  searchPeople(value: string, field: PeopleSearchField, reset?: boolean): Promise<void>;
  events: PlayEvent[]; posts: CommunityPost[]; likes: Record<string, string[]>; comments: Record<string, PostComment[]>;
  verificationRequests: VerificationRequest[]; reports: ContentReport[]; hiddenPostIds: string[];
  profiles: PublicProfile[]; publicProfiles: Record<string, PublicProfile>;
  publicProfileStates: Record<string, 'loading' | 'ready' | 'missing' | 'error'>;
  followingIds: string[]; peopleLoading: boolean; peopleError: string; peopleHasMore: boolean;
  linkedPostStates: Record<string, 'loading' | 'ready' | 'missing' | 'error'>; watchPost(id: string): () => void;
  loadMorePeople(reset?: boolean): Promise<void>; watchPublicProfile(id: string): () => void; toggleFollow(id: string): Promise<void>;
  login(): Promise<void>; loginAdmin(): Promise<void>; signOut(): Promise<void>; beginDemo(name: string): Promise<void>;
  saveProfile(input: Omit<CommunityProfile, 'id' | 'verification' | 'createdAt'>): Promise<void>;
  createEvent(input: EventInput): Promise<string>; createEventSeries(inputs: EventInput[]): Promise<string[]>; joinEvent(id: string, name: string): Promise<void>; leaveEvent(id: string): Promise<void>;
  updateEvent(id: string, input: EventInput, changeReason: string): Promise<void>; removeGuest(id: string, guestId: string): Promise<void>;
  setRsvp(id: string, response: Rsvp): Promise<void>; joinWaitlist(id: string, name: string): Promise<void>; leaveWaitlist(id: string): Promise<void>;
  saveMatchResult(id: string, result: MatchResult): Promise<void>; scheduleFixture(id: string, fixtureId: string, schedule: FixtureSchedule): Promise<void>;
  addGuest(id: string, name: string): Promise<void>; setEventStatus(id: string, status: PlayEvent['status'], reason?: string): Promise<void>;
  generateFixtures(id: string): Promise<void>; saveScore(id: string, fixture: string, home: number, away: number): Promise<void>;
  createPost(input: PostInput, progress?: (n: number) => void): Promise<string>; deletePost(id: string): Promise<void>;
  toggleLike(id: string): Promise<void>; addComment(id: string, text: string): Promise<void>;
  reportPost(id: string, reason: string): Promise<void>; hidePost(id: string): void;
  requestVerification(organization: string, evidence: string): Promise<void>;
  reviewVerification(id: string, approve: boolean): Promise<void>; resolveReport(id: string, removePost: boolean): Promise<void>;
}
const Context = createContext<CommunityAPI | null>(null);
const stamp = () => new Date().toISOString();
const newId = () => crypto.randomUUID();
const peoplePageSize = 40;
const contentPageSize = { events: 40, posts: 24 } as const;
const invalidOwnProfileError = 'Tu perfil contiene datos no válidos y necesita revisión.';
const validProfileId = (id: string) => id.length > 0 && id.length <= 128 && !['__proto__', 'constructor', 'prototype', '.', '..'].includes(id) && !/[\/\\\u0000-\u001f\u007f]/.test(id);
export function friendlyError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === 'permission-denied' || code === 'storage/unauthorized') return 'Tu cuenta no tiene permiso para completar esta acción. Revisa tu perfil o contacta con el administrador.';
  if (code === 'auth/unauthorized-domain') return 'El acceso con Google aún no está habilitado en este sitio. Contacta con el administrador.';
  if (code === 'auth/popup-closed-by-user') return 'Se ha cerrado el acceso con Google.';
  if (code === 'unavailable' || code === 'auth/network-request-failed') return 'No hay conexión. Inténtalo de nuevo cuando se restablezca.';
  if (code === 'storage/quota-exceeded') return 'El almacenamiento no está disponible en este momento. Inténtalo más tarde o contacta con el administrador.';
  if (code === 'storage/retry-limit-exceeded' || code === 'storage/canceled') return 'La carga no se ha completado. Puedes volver a intentarlo.';
  return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}
const demoEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO === 'true';
function defaultProfile(id: string, name: string): CommunityProfile {
  return { id, name: name.trim().slice(0, 100) || 'Mi perfil', bio: '', city: '', country: '', position: '', team: '', level: 'amateur', adultConfirmed: false,
    verification: 'unverified', entityType: 'individual', createdAt: stamp(), acceptedTermsVersion: '', acceptedTermsAt: '' };
}
export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => demoEnabled && localStorage.getItem('cantera-demo-active') === 'true' ? 'demo' : 'cloud');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig>(normalizeRuntime(null));
  const [accountModeration, setAccountModeration] = useState<AccountModeration | null>(null);
  const [ownEvents, setOwnEvents] = useState<PlayEvent[]>([]);
  const [fixtureData, setFixtureData] = useState<Record<string, Fixture[]>>({});
  const [fixtureStates, setFixtureStates] = useState<Record<string, 'loading' | 'ready' | 'error'>>({});
  const [eventHistories, setEventHistories] = useState<Record<string, EventChange[]>>({});
  const [eventNotices, setEventNotices] = useState<EventNotice[]>([]);
  const [adminRightsRequests, setAdminRightsRequests] = useState<RightsRequest[]>([]);
  const [adminQueueHasMore, setAdminQueueHasMore] = useState({ verification: true, reports: true, rights: true });
  const [adminQueueLoading, setAdminQueueLoading] = useState({ verification: false, reports: false, rights: false });
  const adminCursors = useRef<Record<'verification' | 'reports' | 'rights', QueryDocumentSnapshot<DocumentData> | null>>({ verification: null, reports: null, rights: null });
  const deliveryCursors = useRef(new Map<string, { stage: 'changes' | 'promotions' | 'done'; cursor: QueryDocumentSnapshot<DocumentData> | null; candidates: Array<{ id: string; value: DocumentData }>; busy: boolean }>());
  const [rightsRequests, setRightsRequests] = useState<RightsRequest[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [postInteractionStates, setPostInteractionStates] = useState<Record<string, PostInteractionState>>({});
  const interactions = useRef(new Map<string, { count: number; stop: () => void; cursor: QueryDocumentSnapshot<DocumentData> | null; offset: number; busy: boolean }>());
  const [pages, setPages] = useState({ eventsHasMore: true, postsHasMore: true, eventsLoading: true, postsLoading: true });
  const pageCursors = useRef<Record<'events' | 'posts', { cursor: QueryDocumentSnapshot<DocumentData> | null; offset: number; busy: boolean; ready: boolean }>>({ events: { cursor: null, offset: 0, busy: false, ready: false }, posts: { cursor: null, offset: 0, busy: false, ready: false } });
  const [olderEvents, setOlderEvents] = useState<PlayEvent[]>([]);
  const [olderPosts, setOlderPosts] = useState<CommunityPost[]>([]);
  const peopleSearch = useRef<{ value: string; field: PeopleSearchField }>({ value: '', field: 'name' });
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [events, setEvents] = useState<PlayEvent[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [likes, setLikes] = useState<Record<string, string[]>>({});
  const [comments, setComments] = useState<Record<string, PostComment[]>>({});
  const [verificationRequests, setVerifications] = useState<VerificationRequest[]>([]);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [isAdmin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hiddenPostIds, setHidden] = useState<string[]>([]);
  const [linkedPosts, setLinkedPosts] = useState<Record<Mode, Record<string, CommunityPost>>>({ demo: {}, cloud: {} });
  const [linkedStates, setLinkedStates] = useState<Record<Mode, Record<string, 'loading' | 'ready' | 'missing' | 'error'>>>({ demo: {}, cloud: {} });
  const postWatches = useRef(new Map<string, { count: number; stop: () => void }>());
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [publicCaches, setPublicCaches] = useState<Record<Mode, Record<string, PublicProfile>>>({ demo: {}, cloud: {} });
  const [profileStates, setProfileStates] = useState<Record<Mode, Record<string, 'loading' | 'ready' | 'missing' | 'error'>>>({ demo: {}, cloud: {} });
  const [peoplePage, setPeoplePage] = useState<{ mode: Mode; profiles: PublicProfile[]; loading: boolean; error: string; hasMore: boolean }>({ mode, profiles: [], loading: false, error: '', hasMore: true });
  const peopleCursor = useRef<{ mode: Mode; cursor: QueryDocumentSnapshot<DocumentData> | null; offset: number; sequence: number; busy: boolean }>({ mode, cursor: null, offset: 0, sequence: 0, busy: false });
  const currentMode = useRef(mode); currentMode.current = mode;
  const profileWatches = useRef(new Map<string, { count: number; stop: () => void }>());
  const mediaCache = useRef<ReturnType<typeof createLocalMediaCache> | null>(null);
  const localMedia = useCallback(() => mediaCache.current ||= createLocalMediaCache(getLocalMedia, blob => URL.createObjectURL(blob), url => URL.revokeObjectURL(url)), []);
  const setLegacyUser = useAppStore(s => s.setUser);
  const serviceOpen = mode === 'demo' || import.meta.env.VITE_SERVICE_OPEN === 'true' && legalReady && runtimeConfig.serviceStatus === 'open';
  const serviceOpenRef = useRef(serviceOpen); serviceOpenRef.current = serviceOpen;
  const readScope = JSON.stringify([mode, firebaseUser?.uid || '', isAdmin, runtimeConfig.serviceStatus, serviceOpen]);
  const currentReadScope = useRef(readScope); currentReadScope.current = readScope;
  const eventViewer = mode === 'demo' ? profile?.id : firebaseUser?.uid;
  const currentEventViewer = useRef(eventViewer); currentEventViewer.current = eventViewer;
  const fixtureWatches = useRef(new Map<string, symbol>());
  const historyWatches = useRef(new Map<string, symbol>());
  const ownSources = useRef<{ owner: PlayEvent[]; joined: PlayEvent[]; waiting: PlayEvent[] }>({ owner: [], joined: [], waiting: [] });
  const readFailure = useCallback((err: unknown) => { setError(friendlyError(err)); setLoading(false); }, []);

  useEffect(() => {
    setAccountModeration(null); if (mode !== 'cloud' || !firebaseUser) return;
    return onSnapshot(doc(db, 'communityAccountModeration', firebaseUser.uid), snapshot => { const data = snapshot.data(); const at = data?.updatedAt?.toDate?.(); setAccountModeration(data && ['active', 'suspended'].includes(data.status) && typeof data.reason === 'string' && at instanceof Date ? { status: data.status, reason: data.reason, updatedAt: at.toISOString() } : null); }, readFailure);
  }, [mode, firebaseUser?.uid, readFailure]);

  const watchPublicProfile = useCallback((id: string) => {
    if (!validProfileId(id) || mode === 'cloud' && !serviceOpen) return () => {};
    const key = `${mode}:${id}`;
    const current = profileWatches.current.get(key);
    if (current) current.count += 1;
    else {
      let active = true;
      setProfileStates(previous => ({ ...previous, [mode]: { ...previous[mode], [id]: 'loading' } }));
      const receive = (publicProfile: PublicProfile | null, failed = false) => {
        if (!active) return;
        setPublicCaches(previous => { const next = { ...previous[mode] }; if (publicProfile) next[id] = publicProfile; else delete next[id]; return { ...previous, [mode]: next }; });
        setProfileStates(previous => ({ ...previous, [mode]: { ...previous[mode], [id]: failed ? 'error' : publicProfile ? 'ready' : 'missing' } }));
      };
      let unsubscribe: () => void;
      if (mode === 'demo') {
        const refresh = () => { const record = normalizeDemoData(readDemo()).profiles.find(item => item.id === id); receive(record?.adultConfirmed && record.acceptedTermsVersion === TERMS_VERSION && record.city.trim() && record.country.trim() ? normalizePublicProfile(record, id) : null); };
        refresh(); window.addEventListener('storage', refresh); window.addEventListener('cantera-demo-updated', refresh);
        unsubscribe = () => { window.removeEventListener('storage', refresh); window.removeEventListener('cantera-demo-updated', refresh); };
      } else unsubscribe = onSnapshot(doc(db, 'communityPublicProfiles', id), snapshot => receive(snapshot.exists() ? normalizePublicProfile(snapshot.data(), snapshot.id) : null), () => receive(null, true));
      profileWatches.current.set(key, { count: 1, stop: () => { active = false; unsubscribe(); } });
    }
    let released = false;
    return () => { if (released) return; released = true; const entry = profileWatches.current.get(key); if (!entry) return; entry.count -= 1; if (!entry.count) { entry.stop(); profileWatches.current.delete(key); } };
  }, [mode, serviceOpen]);
  useEffect(() => () => { profileWatches.current.forEach(entry => entry.stop()); profileWatches.current.clear(); }, []);

  const watchPost = useCallback((id: string) => {
    if (!validProfileId(id) || mode === 'cloud' && !serviceOpen) return () => {};
    const key = `${mode}:${id}`; const existing = postWatches.current.get(key);
    if (existing) existing.count += 1;
    else {
      let active = true; let sequence = 0;
      setLinkedStates(previous => ({ ...previous, [mode]: { ...previous[mode], [id]: 'loading' } }));
      const receive = (post: CommunityPost | null, failed = false) => {
        if (!active) return;
        setLinkedPosts(previous => { const next = { ...previous[mode] }; if (post) next[id] = post; else delete next[id]; return { ...previous, [mode]: next }; });
        setLinkedStates(previous => ({ ...previous, [mode]: { ...previous[mode], [id]: failed ? 'error' : post ? 'ready' : 'missing' } }));
      };
      let stop: () => void;
      if (mode === 'demo') {
        const refresh = async () => {
          const current = ++sequence;
          const post = normalizeDemoData(readDemo()).posts.find(item => item.id === id) || null;
          if (post?.mediaPath.startsWith('local:')) {
            const mediaId = post.mediaPath.slice(6);
            receive({ ...post, mediaUrl: localMedia().cached(mediaId) });
            let mediaUrl = '';
            try { mediaUrl = await localMedia().load(mediaId); }
            catch { /* Text remains available if local media cannot be read. */ }
            if (current !== sequence) return;
            receive({ ...post, mediaUrl });
          } else receive(post);
        };
        void refresh(); window.addEventListener('storage', refresh); window.addEventListener('cantera-demo-updated', refresh);
        stop = () => { window.removeEventListener('storage', refresh); window.removeEventListener('cantera-demo-updated', refresh); };
      } else stop = onSnapshot(doc(db, 'communityPosts', id), snapshot => receive(snapshot.exists() ? normalizePost(snapshot.data(), snapshot.id) : null), () => receive(null, true));
      postWatches.current.set(key, { count: 1, stop: () => { active = false; stop(); } });
    }
    let released = false;
    return () => { if (released) return; released = true; const entry = postWatches.current.get(key); if (!entry) return; entry.count -= 1; if (!entry.count) {
      entry.stop(); postWatches.current.delete(key);
      setLinkedPosts(previous => { const next = { ...previous[mode] }; delete next[id]; return { ...previous, [mode]: next }; });
      setLinkedStates(previous => { const next = { ...previous[mode] }; delete next[id]; return { ...previous, [mode]: next }; });
    } };
  }, [mode, serviceOpen, localMedia]);
  useEffect(() => () => { postWatches.current.forEach(entry => entry.stop()); postWatches.current.clear(); }, []);

  const loadMorePeople = useCallback(async (reset = false) => {
    if (mode === 'cloud' && !serviceOpen) { setPeoplePage({ mode, profiles: [], loading: false, error: '', hasMore: false }); return; }
    if (reset || peopleCursor.current.mode !== mode) peopleCursor.current = { mode, cursor: null, offset: 0, sequence: peopleCursor.current.sequence + 1, busy: false };
    const paging = peopleCursor.current;
    if (paging.busy) return;
    paging.busy = true; const sequence = ++paging.sequence;
    setPeoplePage(previous => ({ mode, profiles: !reset && previous.mode === mode ? previous.profiles : [], loading: true, error: '', hasMore: true }));
    try {
      let records: PublicProfile[]; let hasMore: boolean;
      if (mode === 'demo') {
        const search = peopleSearch.current;
        const all = normalizeDemoData(readDemo()).profiles.filter(item => !search.value || profileSearchTokens(item).includes(`${search.field}:${search.value}`)).filter(item => item.adultConfirmed && item.acceptedTermsVersion === TERMS_VERSION && item.city.trim() && item.country.trim()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const batch = all.slice(paging.offset, paging.offset + peoplePageSize); paging.offset += batch.length;
        records = batch.map(item => normalizePublicProfile(item)!).filter(Boolean); hasMore = paging.offset < all.length;
      } else {
        const search = peopleSearch.current;
        const base = [...(search.value ? [where('searchTokens', 'array-contains', `${search.field}:${search.value}`)] : []), orderBy('createdAt', 'desc'), limit(peoplePageSize)];
        const snapshot = await getDocs(query(collection(db, 'communityPublicProfiles'), ...base, ...(paging.cursor ? [startAfter(paging.cursor)] : [])));
        records = snapshot.docs.map(item => normalizePublicProfile(item.data(), item.id)).filter((item): item is PublicProfile => item !== null);
        paging.cursor = snapshot.docs.at(-1) || paging.cursor; hasMore = snapshot.size === peoplePageSize;
      }
      if (currentMode.current !== mode || peopleCursor.current.sequence !== sequence) return;
      setPeoplePage(previous => ({ mode, profiles: [...new Map([...(previous.mode === mode ? previous.profiles : []), ...records].map(item => [item.id, item])).values()], loading: false, error: '', hasMore }));
      setPublicCaches(previous => ({ ...previous, [mode]: { ...previous[mode], ...Object.fromEntries(records.map(item => [item.id, item])) } }));
    } catch (err) { if (currentMode.current === mode && peopleCursor.current.sequence === sequence) setPeoplePage(previous => ({ ...previous, mode, loading: false, error: friendlyError(err) })); }
    finally { if (peopleCursor.current === paging) paging.busy = false; }
  }, [mode, serviceOpen]);

  const searchPeople = useCallback(async (value: string, field: PeopleSearchField, reset = true) => { peopleSearch.current = { value: searchText(value), field }; await loadMorePeople(reset); }, [loadMorePeople]);

  useEffect(() => {
    if (mode === 'demo') {
      const refresh = () => {
        const data = normalizeDemoData(readDemo());
        setFollowingIds(data.follows.filter(item => item.followerId === data.profile?.id).map(item => item.followingId));
        setPeoplePage(previous => {
          if (previous.mode !== 'demo' || !previous.profiles.length) return previous;
          const windowSize = Math.max(peoplePageSize, peopleCursor.current.offset);
          const search = peopleSearch.current;
          const all = data.profiles.filter(item => !search.value || profileSearchTokens(item).includes(`${search.field}:${search.value}`)).filter(item => item.adultConfirmed && item.acceptedTermsVersion === TERMS_VERSION && item.city.trim() && item.country.trim()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          const loaded = all.slice(0, windowSize).map(item => normalizePublicProfile(item)!);
          if (peopleCursor.current.mode === 'demo') peopleCursor.current.offset = loaded.length;
          return { ...previous, profiles: loaded, hasMore: all.length > windowSize };
        });
      };
      refresh(); window.addEventListener('storage', refresh); window.addEventListener('cantera-demo-updated', refresh);
      return () => { window.removeEventListener('storage', refresh); window.removeEventListener('cantera-demo-updated', refresh); };
    }
    setFollowingIds([]);
    if (!firebaseUser || !serviceOpen) return;
    return onSnapshot(query(collection(db, 'communityFollows'), where('followerId', '==', firebaseUser.uid)), snapshot => {
      setFollowingIds(snapshot.docs.map(item => normalizeFollow(item.data(), item.id)).filter(item => item !== null).map(item => item.followingId));
    }, readFailure);
  }, [mode, firebaseUser?.uid, runtimeConfig.serviceStatus, serviceOpen, readFailure]);

  useEffect(() => {
    let active = true;
    let authGeneration = 0;
    const stop = onAuthStateChanged(auth, async user => {
      const generation = ++authGeneration;
      const current = () => active && generation === authGeneration && auth.currentUser?.uid === user?.uid;
      setFirebaseUser(user);
      setAdmin(false);
      if (!user) { setLoading(false); return; }
      setMode('cloud'); setRuntimeConfig(normalizeRuntime(null)); setLoading(true); setError('');
      localStorage.removeItem('cantera-demo-active');
      try {
        const token = await user.getIdTokenResult();
        if (!current()) return;
        setAdmin(token.claims.admin === true);
      } catch (err) { if (current()) readFailure(err); }
    });
    return () => { active = false; stop(); };
  }, [readFailure]);

  useEffect(() => {
    if (mode !== 'cloud' || !firebaseUser || !serviceOpen && !isAdmin) return;
    let active = true;
    const user = firebaseUser;
    const current = () => active && currentMode.current === 'cloud' && auth.currentUser === user
      && currentReadScope.current === readScope && (serviceOpenRef.current || isAdmin);
    // Auth can be restored before the runtime document arrives. Retrying when
    // the service opens is separate from the identity callback, and the
    // transaction creates only an absent private draft. Existing profiles and
    // public projections are never rewritten on session restoration.
    setLoading(true);
    void runTransaction(db, async transaction => {
      const target = doc(db, 'communityProfiles', user.uid);
      const stored = await transaction.get(target);
      if (!current() || stored.exists()) return;
      const fresh = defaultProfile(user.uid, user.displayName || 'Mi perfil');
      transaction.set(target, { ...fresh, createdAt: serverTimestamp() });
    }).catch(err => { if (current()) readFailure(err); }).finally(() => { if (current()) setLoading(false); });
    return () => { active = false; };
  }, [mode, firebaseUser, serviceOpen, isAdmin, readScope, readFailure]);

  useEffect(() => {
    let active = true;
    const isCurrentRead = () => active && currentReadScope.current === readScope && (mode === 'demo' || auth.currentUser?.uid === firebaseUser?.uid);
    const failed = (err: unknown) => { if (isCurrentRead()) readFailure(err); };
    setError(''); setFixtureData({}); setFixtureStates({}); setEventHistories({}); if (mode === 'cloud' && !serviceOpen) { setLinkedPosts(previous => ({ ...previous, cloud: {} })); setPublicCaches(previous => ({ ...previous, cloud: {} })); } ownSources.current = { owner: [], joined: [], waiting: [] }; setOlderEvents([]); setOlderPosts([]); setOwnEvents([]); setEventNotices([]); setRightsRequests([]); setBlockedIds([]); setPostInteractionStates({}); pageCursors.current = { events: { cursor: null, offset: 0, busy: false, ready: false }, posts: { cursor: null, offset: 0, busy: false, ready: false } }; setPages({ eventsHasMore: serviceOpen, postsHasMore: serviceOpen, eventsLoading: serviceOpen, postsLoading: serviceOpen }); setEvents([]); setPosts([]); setLikes({}); setComments({}); setVerifications([]); setReports([]); setProfile(null);
    setLoading(true);
    if (mode === 'demo') {
      let refreshSequence = 0;
      const refresh = () => {
        const sequence = ++refreshSequence;
        try {
          const data = normalizeDemoData(readDemo());
          if (!isCurrentRead() || sequence !== refreshSequence) return;
          setProfile(data.profile); setPages({ eventsHasMore: false, postsHasMore: false, eventsLoading: false, postsLoading: false }); setOwnEvents(data.events.filter(e => canReadEvent(e, data.profile?.id) && (e.ownerId === data.profile?.id || Object.hasOwn(e.participants, data.profile?.id || '') || Object.hasOwn(e.waitlist || {}, data.profile?.id || '')))); setBlockedIds(data.blocked[data.profile?.id || ''] || []); setEventNotices(data.notices.filter(n => n.recipientId === data.profile?.id)); setRightsRequests(data.rightsRequests.filter(r => r.userId === data.profile?.id)); setEvents(data.events.filter(isPublicEvent)); setLikes(data.likes); setComments(data.comments);
          setVerifications(data.verifications.filter(v => v.userId === data.profile?.id)); setReports([]); setLoading(false);
          void publishLocalPosts(data.posts, localMedia(), setPosts, (post, mediaUrl) => setPosts(previous => previous.map(current => current.id === post.id && current.mediaPath === post.mediaPath ? { ...current, mediaUrl } : current)), () => isCurrentRead() && sequence === refreshSequence);
        } catch (err) { if (isCurrentRead() && sequence === refreshSequence) readFailure(err); }
      };
      void refresh();
      window.addEventListener('storage', refresh); window.addEventListener('cantera-demo-updated', refresh);
      return () => { active = false; window.removeEventListener('storage', refresh); window.removeEventListener('cantera-demo-updated', refresh); };
    }
    const runtimeStop = onSnapshot(doc(db, 'communityConfiguration', 'runtime'), snapshot => { if (isCurrentRead()) setRuntimeConfig(normalizeRuntime(snapshot.exists() ? snapshot.data() : null)); }, () => { if (isCurrentRead()) setRuntimeConfig(normalizeRuntime(null)); });
    const receiveOwnProfile = (snapshot: DocumentSnapshot<DocumentData>) => {
      // serverTimestamp fields are temporarily null in a local pending write.
      // Preserve the last confirmed profile until acknowledgement instead of
      // treating this transient projection as corrupted account data.
      if (!isCurrentRead() || snapshot.metadata.hasPendingWrites) return;
      const current = snapshot.exists() ? normalizeProfile(snapshot.data(), snapshot.id) : null;
      setProfile(current);
      if (snapshot.exists() && !current) readFailure(new Error(invalidOwnProfileError));
      else setError(previous => previous === invalidOwnProfileError ? '' : previous);
    };
    if (!serviceOpen) {
      const stops = [runtimeStop];
      if (firebaseUser) stops.push(onSnapshot(doc(db, 'communityProfiles', firebaseUser.uid), { includeMetadataChanges: true }, receiveOwnProfile, failed));
      if (firebaseUser) {
        stops.push(onSnapshot(query(collection(db, 'communityEventNotices'), where('recipientId', '==', firebaseUser.uid), orderBy('createdAt', 'desc'), limit(100)), snapshot => { if (isCurrentRead()) setEventNotices(snapshot.docs.map(d => normalizeNotice(d.data(), d.id)).filter((n): n is EventNotice => n !== null)); }, failed));
        stops.push(onSnapshot(query(collection(db, 'communityRightsRequests'), where('userId', '==', firebaseUser.uid), orderBy('createdAt', 'desc'), limit(30)), snapshot => { if (isCurrentRead()) setRightsRequests(snapshot.docs.map(d => normalizeRightsRequest(d.data(), d.id)).filter((r): r is RightsRequest => r !== null)); }, failed));
        stops.push(onSnapshot(query(collection(db, 'communityBlocks'), where('ownerId', '==', firebaseUser.uid)), snapshot => { if (isCurrentRead()) setBlockedIds(snapshot.docs.map(d => d.data().blockedId).filter((id): id is string => typeof id === 'string')); }, failed));
        if (isAdmin) {
          stops.push(onSnapshot(query(collection(db, 'communityVerifications'), where('status', '==', 'pending'), orderBy('createdAt', 'asc'), limit(100)), snapshot => { if (isCurrentRead()) { adminCursors.current.verification = snapshot.docs.at(-1) || null; setAdminQueueHasMore(previous => ({ ...previous, verification: snapshot.size === 100 })); setVerifications(snapshot.docs.map(d => normalizeVerification(d.data(), d.id)).filter((v): v is VerificationRequest => v !== null)); } }, failed));
          stops.push(onSnapshot(query(collection(db, 'communityReports'), where('status', '==', 'open'), orderBy('createdAt', 'asc'), limit(100)), snapshot => { if (isCurrentRead()) { adminCursors.current.reports = snapshot.docs.at(-1) || null; setAdminQueueHasMore(previous => ({ ...previous, reports: snapshot.size === 100 })); setReports(snapshot.docs.map(d => normalizeReport(d.data(), d.id)).filter((r): r is ContentReport => r !== null)); } }, failed));
          stops.push(onSnapshot(query(collection(db, 'communityRightsRequests'), where('status', 'in', ['pending', 'processing']), orderBy('createdAt', 'asc'), limit(100)), snapshot => { if (isCurrentRead()) { adminCursors.current.rights = snapshot.docs.at(-1) || null; setAdminQueueHasMore(previous => ({ ...previous, rights: snapshot.size === 100 })); setAdminRightsRequests(snapshot.docs.map(d => normalizeRightsRequest(d.data(), d.id)).filter((r): r is RightsRequest => r !== null)); } }, failed));
        }
      }
      setLoading(false);
      return () => { active = false; stops.forEach(stop => stop()); };
    }
    const listen = <T,>(name: 'communityEvents' | 'communityPosts', normalize: (value: unknown, id: string) => T | null, receive: (items: T[]) => void) => {
      const kind = name === 'communityEvents' ? 'events' : 'posts';
      const count = contentPageSize[kind];
      return onSnapshot(query(collection(db, name), ...(name === 'communityEvents' ? [where('visibility', '==', 'public')] : []), orderBy('createdAt', 'desc'), limit(count)), { includeMetadataChanges: true }, snapshot => {
        if (!isCurrentRead()) return;
        const paging = pageCursors.current[kind];
        if (paging.offset === 0 && !paging.busy) paging.cursor = snapshot.docs.at(-1) || null;
        paging.ready = !snapshot.metadata.fromCache;
        receive(snapshot.docs.map(d => normalize(d.data(), d.id)).filter((item): item is T => item !== null && (name !== 'communityEvents' || isPublicEvent(item as PlayEvent))));
        setPages(previous => ({ ...previous, [`${kind}Loading`]: paging.busy || !paging.ready, ...(paging.offset === 0 ? { [`${kind}HasMore`]: paging.ready && snapshot.size === count } : {}) }));
      }, err => { if (isCurrentRead()) { setPages(previous => ({ ...previous, [`${kind}Loading`]: false })); failed(err); } });
    };
    if (!firebaseUser) {
      const stops = [runtimeStop, listen('communityEvents', normalizeEvent, values => { setEvents(values); setLoading(false); }), listen('communityPosts', normalizePost, setPosts)];
      return () => { active = false; stops.forEach(stop => stop()); };
    }
    const stops = [runtimeStop,
      onSnapshot(doc(db, 'communityProfiles', firebaseUser.uid), { includeMetadataChanges: true }, receiveOwnProfile, failed),
      listen('communityEvents', normalizeEvent, values => { setEvents(values); setLoading(false); }),
      listen('communityPosts', normalizePost, setPosts),
      ...(['owner', 'joined', 'waiting'] as const).map(source => onSnapshot(query(collection(db, 'communityEvents'), source === 'owner' ? where('ownerId', '==', firebaseUser.uid) : where(source === 'joined' ? 'participantIds' : 'waitlistOrder', 'array-contains', firebaseUser.uid), ...(source === 'waiting' ? [where('visibility', '==', 'public')] : [])), snapshot => { if (isCurrentRead()) { ownSources.current[source] = snapshot.docs.map(d => normalizeEvent(d.data(), d.id)).filter((e): e is PlayEvent => e !== null && canReadEvent(e, firebaseUser.uid)); setOwnEvents([...new Map(Object.values(ownSources.current).flat().map(e => [e.id, e])).values()]); } }, failed)),
      onSnapshot(query(collection(db, 'communityBlocks'), where('ownerId', '==', firebaseUser.uid)), snapshot => { if (isCurrentRead()) setBlockedIds(snapshot.docs.map(d => d.data().blockedId).filter((id): id is string => typeof id === 'string')); }, failed),
      onSnapshot(query(collection(db, 'communityEventNotices'), where('recipientId', '==', firebaseUser.uid), orderBy('createdAt', 'desc'), limit(100)), snapshot => { if (isCurrentRead()) setEventNotices(snapshot.docs.map(d => normalizeNotice(d.data(), d.id)).filter((n): n is EventNotice => n !== null)); }, failed),
      onSnapshot(query(collection(db, 'communityRightsRequests'), where('userId', '==', firebaseUser.uid), orderBy('createdAt', 'desc'), limit(30)), snapshot => { if (isCurrentRead()) setRightsRequests(snapshot.docs.map(d => normalizeRightsRequest(d.data(), d.id)).filter((n): n is RightsRequest => n !== null)); }, failed)
    ];
    if (isAdmin) {
      stops.push(onSnapshot(query(collection(db, 'communityVerifications'), where('status', '==', 'pending'), orderBy('createdAt', 'asc'), limit(100)), snapshot => { if (isCurrentRead()) { adminCursors.current.verification = snapshot.docs.at(-1) || null; setAdminQueueHasMore(previous => ({ ...previous, verification: snapshot.size === 100 })); setVerifications(snapshot.docs.map(d => normalizeVerification(d.data(), d.id)).filter((v): v is VerificationRequest => v !== null)); }; }, failed));
      stops.push(onSnapshot(query(collection(db, 'communityReports'), where('status', '==', 'open'), orderBy('createdAt', 'asc'), limit(100)), snapshot => { if (isCurrentRead()) { adminCursors.current.reports = snapshot.docs.at(-1) || null; setAdminQueueHasMore(previous => ({ ...previous, reports: snapshot.size === 100 })); setReports(snapshot.docs.map(d => normalizeReport(d.data(), d.id)).filter((v): v is ContentReport => v !== null)); }; }, failed));
      stops.push(onSnapshot(query(collection(db, 'communityRightsRequests'), where('status', 'in', ['pending', 'processing']), orderBy('createdAt', 'asc'), limit(100)), snapshot => { if (isCurrentRead()) { adminCursors.current.rights = snapshot.docs.at(-1) || null; setAdminQueueHasMore(previous => ({ ...previous, rights: snapshot.size === 100 })); setAdminRightsRequests(snapshot.docs.map(d => normalizeRightsRequest(d.data(), d.id)).filter((r): r is RightsRequest => r !== null)); } }, failed));
    } else {
      stops.push(onSnapshot(doc(db, 'communityVerifications', firebaseUser.uid), snapshot => {
        if (!isCurrentRead()) return;
        const current = snapshot.exists() ? normalizeVerification(snapshot.data(), snapshot.id) : null;
        setVerifications(current ? [current] : []);
      }, failed));
    }
    return () => { active = false; stops.forEach(stop => stop()); };
  }, [mode, firebaseUser?.uid, isAdmin, runtimeConfig.serviceStatus, serviceOpen, readFailure, localMedia, readScope]);

  useEffect(() => {
    try { setHidden(normalizeHiddenPostIds(JSON.parse(localStorage.getItem(`cantera-hidden-${profile?.id || 'visitor'}`) || '[]'))); } catch { setHidden([]); }
    if (!profile) { setLegacyUser(null); return; }
    setLegacyUser({ uid: mode === 'cloud' ? profile.id : undefined, name: profile.name, email: firebaseUser?.email || '', role: 'PLAYER', bio: profile.bio, avatar: firebaseUser?.photoURL || '', plan: 'GRATUITO' });
  }, [profile, mode, firebaseUser?.email, setLegacyUser]);
  useEffect(() => () => { mediaCache.current?.dispose(); mediaCache.current = null; }, []);

  async function loadPage(kind: 'events' | 'posts', reset = false) {
    const current = () => currentReadScope.current === readScope && (mode === 'demo' || auth.currentUser?.uid === firebaseUser?.uid);
    if (!current()) return;
    const paging = pageCursors.current[kind]; if (paging.busy || !reset && !paging.ready) return;
    if (reset) { paging.cursor = null; paging.offset = 0; kind === 'events' ? setOlderEvents([]) : setOlderPosts([]); }
    paging.busy = true; setPages(previous => ({ ...previous, [`${kind}Loading`]: true }));
    try {
      if (mode === 'demo') { setPages(previous => ({ ...previous, [`${kind}HasMore`]: false })); return; }
      if (!serviceOpen) return;
      const collectionName = kind === 'events' ? 'communityEvents' : 'communityPosts';
      const snapshot = await getDocs(query(collection(db, collectionName), ...(kind === 'events' ? [where('visibility', '==', 'public')] : []), orderBy('createdAt', 'desc'), ...(paging.cursor ? [startAfter(paging.cursor)] : []), limit(contentPageSize[kind])));
      if (!current() || pageCursors.current[kind] !== paging) return;
      paging.cursor = snapshot.docs.at(-1) || paging.cursor; paging.offset += snapshot.size; paging.ready = true;
      if (kind === 'events') setOlderEvents(previous => [...new Map([...previous, ...snapshot.docs.map(d => normalizeEvent(d.data(), d.id)).filter((e): e is PlayEvent => e !== null && isPublicEvent(e))].map(e => [e.id, e])).values()]);
      else setOlderPosts(previous => [...new Map([...previous, ...snapshot.docs.map(d => normalizePost(d.data(), d.id)).filter((p): p is CommunityPost => p !== null)].map(p => [p.id, p])).values()]);
      setPages(previous => ({ ...previous, [`${kind}HasMore`]: snapshot.size === contentPageSize[kind] }));
    } finally { paging.busy = false; if (current() && pageCursors.current[kind] === paging) setPages(previous => ({ ...previous, [`${kind}Loading`]: false })); }
  }
  const watchFixtureData = useCallback((id: string) => {
    if (!validProfileId(id) || mode === 'cloud' && !serviceOpen) return () => {};
    const lease = Symbol(id); fixtureWatches.current.set(id, lease);
    let active = true, failed = false;
    let raw: DocumentData | null = null; let receivedFixtures = false; let records: Fixture[] = [];
    const scopeCurrent = () => currentReadScope.current === readScope && currentEventViewer.current === eventViewer && (mode === 'demo' || auth.currentUser?.uid === firebaseUser?.uid);
    const current = () => active && !failed && scopeCurrent() && fixtureWatches.current.get(id) === lease;
    const clear = () => {
      setFixtureData(previous => { if (fixtureWatches.current.has(id) && fixtureWatches.current.get(id) !== lease) return previous; const next = { ...previous }; delete next[id]; return next; });
    };
    const fail = () => {
      if (!current()) return;
      failed = true; raw = null; receivedFixtures = false; records = []; clear();
      setFixtureStates(previous => scopeCurrent() && fixtureWatches.current.get(id) === lease ? { ...previous, [id]: 'error' } : previous);
    };
    const receive = (event: PlayEvent | null) => {
      if (!current()) return;
      if (!event || !canReadEvent(event, eventViewer)) { fail(); return; }
      setFixtureData(previous => current() ? { ...previous, [id]: event.fixtures } : previous);
      setFixtureStates(previous => current() ? { ...previous, [id]: 'ready' } : previous);
    };
    const cleanup = () => {
      active = false;
      if (fixtureWatches.current.get(id) !== lease) return;
      fixtureWatches.current.delete(id); clear();
      setFixtureStates(previous => { if (fixtureWatches.current.has(id)) return previous; const next = { ...previous }; delete next[id]; return next; });
    };
    clear();
    if (mode === 'demo') {
      const refresh = () => {
        if (!current()) return;
        const data = normalizeDemoData(readDemo());
        if (data.profile?.id !== eventViewer) { fail(); return; }
        receive(data.events.find(event => event.id === id) || null);
      };
      refresh(); window.addEventListener('cantera-demo-updated', refresh);
      return () => { window.removeEventListener('cantera-demo-updated', refresh); cleanup(); };
    }
    setFixtureStates(previous => current() ? { ...previous, [id]: 'loading' } : previous);
    const publish = () => {
      if (!current() || !raw) return;
      const manifest = raw.fixtureIds;
      if (!Array.isArray(manifest)) { receive(normalizeEvent(raw, id)); return; }
      if (!canReadEvent({ ...raw, visibility: raw.visibility, ownerId: raw.ownerId, participantIds: raw.participantIds || Object.keys(raw.participants || {}) }, eventViewer)) { fail(); return; }
      if (!receivedFixtures) return;
      const byId = new Map(records.map(record => [record.id, record]));
      const fixtures = manifest.map(fixtureId => byId.get(fixtureId)).filter((fixture): fixture is Fixture => !!fixture);
      receive(fixtures.length === manifest.length ? normalizeEvent({ ...raw, fixtures }, id) : null);
    };
    const stops = [onSnapshot(doc(db, 'communityEvents', id), snapshot => {
      if (!current()) return;
      raw = snapshot.exists() ? snapshot.data() : null; if (!raw) fail(); else publish();
    }, fail), onSnapshot(query(collection(db, 'communityFixtures'), where('eventId', '==', id)), snapshot => {
      if (!current()) return;
      records = snapshot.docs.map(record => normalizeFixtureRecord(record.data(), id)).filter((record): record is Fixture => record !== null); receivedFixtures = true; publish();
    }, fail)];
    return () => { stops.forEach(stop => stop()); cleanup(); };
  }, [mode, serviceOpen, readScope, eventViewer, firebaseUser?.uid]);
  const watchEventHistory = useCallback((id: string) => {
    if (!validProfileId(id) || mode === 'cloud' && !serviceOpen) return () => {};
    const lease = Symbol(id); historyWatches.current.set(id, lease);
    let active = true;
    const current = () => active && currentReadScope.current === readScope && currentEventViewer.current === eventViewer && historyWatches.current.get(id) === lease && (mode === 'demo' || auth.currentUser?.uid === firebaseUser?.uid);
    const clear = () => {
      setEventHistories(previous => { if (historyWatches.current.has(id) && historyWatches.current.get(id) !== lease) return previous; const next = { ...previous }; delete next[id]; return next; });
    };
    const cleanup = () => {
      active = false;
      if (historyWatches.current.get(id) !== lease) return;
      historyWatches.current.delete(id); clear();
    };
    const fail = (error?: unknown) => {
      if (!current()) return;
      cleanup();
      if (error && (error as { code?: string }).code !== 'permission-denied') readFailure(error);
    };
    clear();
    if (mode === 'demo') {
      const refresh = () => {
        if (!current()) return;
        const data = normalizeDemoData(readDemo()); const event = data.events.find(event => event.id === id);
        if (data.profile?.id !== eventViewer || !event || !canReadEvent(event, eventViewer)) { fail(); return; }
        setEventHistories(previous => current() ? { ...previous, [id]: event.history || [] } : previous);
      };
      refresh(); window.addEventListener('cantera-demo-updated', refresh);
      return () => { window.removeEventListener('cantera-demo-updated', refresh); cleanup(); };
    }
    const stop = onSnapshot(query(collection(db, 'communityEventChanges'), where('eventId', '==', id), orderBy('revision', 'desc'), limit(50)), snapshot => {
      if (!current()) return;
      const values = snapshot.docs.map(record => { const value = record.data(); const date = value.createdAt?.toDate?.(); return Number.isSafeInteger(value.revision) && value.revision > 0 && typeof value.summary === 'string' && date instanceof Date ? { revision: value.revision, summary: value.summary, changedAt: date.toISOString() } as EventChange : null; }).filter((entry): entry is EventChange => entry !== null);
      const history = values.reverse();
      setEventHistories(previous => current() ? { ...previous, [id]: history } : previous);
    }, fail);
    return () => { stop(); cleanup(); };
  }, [mode, serviceOpen, readScope, eventViewer, firebaseUser?.uid, readFailure]);
  const loadMoreEvents = (reset = false) => loadPage('events', reset);
  const loadMorePosts = (reset = false) => loadPage('posts', reset);
  async function loadMoreOwnEvents() { /* Own subscriptions query by UID, without a global window. */ }

  const watchPostInteractions = useCallback((id: string) => {
    if (!validProfileId(id) || mode === 'cloud' && (!firebaseUser || !serviceOpen)) return () => {};
    const key = `${mode}:${firebaseUser?.uid || profile?.id || ''}:${id}`;
    const existing = interactions.current.get(key);
    if (existing) existing.count += 1;
    else {
      let active = true;
      const entry = { count: 1, stop: () => {}, cursor: null as QueryDocumentSnapshot<DocumentData> | null, offset: 0, busy: false };
      const fail = (err: unknown) => { if (active) setPostInteractionStates(previous => ({ ...previous, [id]: { ...(previous[id] || { likesCount: 0, commentsCount: 0, hasMoreComments: false }), loading: false, error: friendlyError(err) } })); };
      setPostInteractionStates(previous => ({ ...previous, [id]: { loading: true, error: '', hasMoreComments: false, likesCount: 0, commentsCount: 0 } }));
      if (mode === 'demo') {
        const refresh = () => { const data = normalizeDemoData(readDemo()); if (active) { entry.offset = Math.max(30, entry.offset); const all = data.comments[id] || []; setComments(previous => ({ ...previous, [id]: all.slice(-entry.offset) })); setLikes(previous => ({ ...previous, [id]: data.likes[id] || [] })); setPostInteractionStates(previous => ({ ...previous, [id]: { loading: false, error: '', hasMoreComments: all.length > entry.offset, likesCount: (data.likes[id] || []).length, commentsCount: all.length } })); } };
        refresh(); window.addEventListener('storage', refresh); window.addEventListener('cantera-demo-updated', refresh);
        entry.stop = () => { active = false; window.removeEventListener('storage', refresh); window.removeEventListener('cantera-demo-updated', refresh); };
      } else {
        const counts = async () => {
          try { const [likeCount, commentCount] = await Promise.all([getCountFromServer(query(collection(db, 'communityLikes'), where('postId', '==', id))), getCountFromServer(query(collection(db, 'communityComments'), where('postId', '==', id)))]);
            if (active) setPostInteractionStates(previous => ({ ...previous, [id]: { ...(previous[id] || { loading: false, error: '', hasMoreComments: false }), loading: false, error: '', likesCount: likeCount.data().count, commentsCount: commentCount.data().count } }));
          } catch (err) { fail(err); }
        };
        const refreshCounts = createCoalescedRefresh(counts);
        const stops = [onSnapshot(query(collection(db, 'communityComments'), where('postId', '==', id), orderBy('createdAt', 'desc'), limit(30)), snapshot => {
          if (!active) return; entry.cursor ||= snapshot.docs.at(-1) || null;
          const records = snapshot.docs.map(d => normalizeCommentRecord(d.data(), d.id)).filter((c): c is NonNullable<ReturnType<typeof normalizeCommentRecord>> => c !== null);
          for (const change of snapshot.docChanges()) if (change.type === 'removed') void getDoc(change.doc.ref).then(current => { if (active && !current.exists()) setComments(previous => ({ ...previous, [id]: (previous[id] || []).filter(c => c.id !== change.doc.id) })); }).catch(fail);
          setComments(previous => ({ ...previous, [id]: [...new Map([...(previous[id] || []).filter(c => !records.some(r => r.id === c.id)), ...records].map(c => [c.id, c])).values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }));
          setPostInteractionStates(previous => ({ ...previous, [id]: { ...(previous[id] || { likesCount: 0, commentsCount: 0 }), loading: previous[id]?.loading ?? true, error: '', hasMoreComments: previous[id]?.hasMoreComments || snapshot.size === 30 } })); refreshCounts.refresh();
        }, fail), onSnapshot(query(collection(db, 'communityLikes'), where('postId', '==', id), orderBy('createdAt', 'desc'), limit(1)), () => { refreshCounts.refresh(); }, fail), onSnapshot(doc(db, 'communityLikes', `${id}_${firebaseUser!.uid}`), snapshot => { if (active) { setLikes(previous => ({ ...previous, [id]: snapshot.exists() ? [firebaseUser!.uid] : [] })); refreshCounts.refresh(); } }, fail)];
        entry.stop = () => { active = false; refreshCounts.dispose(); stops.forEach(stop => stop()); };
      }
      interactions.current.set(key, entry);
    }
    let released = false;
    return () => { if (released) return; released = true; const entry = interactions.current.get(key); if (!entry) return; if (--entry.count === 0) { entry.stop(); interactions.current.delete(key); } };
  }, [mode, firebaseUser?.uid, profile?.id, runtimeConfig.serviceStatus, serviceOpen]);
  useEffect(() => () => { interactions.current.forEach(entry => entry.stop()); interactions.current.clear(); }, []);
  async function loadMoreComments(id: string) {
    const entry = [...interactions.current.entries()].find(([key]) => key.endsWith(`:${id}`))?.[1]; if (!entry || entry.busy) return;
    entry.busy = true;
    try {
      if (mode === 'demo') { entry.offset += 30; window.dispatchEvent(new Event('cantera-demo-updated')); return; }
      const snapshot = await getDocs(query(collection(db, 'communityComments'), where('postId', '==', id), orderBy('createdAt', 'desc'), ...(entry.cursor ? [startAfter(entry.cursor)] : []), limit(30)));
      entry.cursor = snapshot.docs.at(-1) || entry.cursor;
      const records = snapshot.docs.map(d => normalizeCommentRecord(d.data(), d.id)).filter((c): c is NonNullable<ReturnType<typeof normalizeCommentRecord>> => c !== null);
      setComments(previous => ({ ...previous, [id]: [...new Map([...(previous[id] || []), ...records].map(c => [c.id, c])).values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }));
      setPostInteractionStates(previous => ({ ...previous, [id]: { ...previous[id], hasMoreComments: snapshot.size === 30, error: '' } }));
    } catch (err) { setPostInteractionStates(previous => ({ ...previous, [id]: { ...previous[id], error: friendlyError(err) } })); throw err; }
    finally { entry.busy = false; }
  }

  async function toggleBlock(id: string) {
    const user = sessionActor(); if (!validProfileId(id) || id === user.id) throw new Error('Cuenta inválida.');
    if (mode === 'demo') {
      const blocking = !(readDemo().blocked[user.id] || []).includes(id);
      mutateDemo(data => { const current = data.blocked[user.id] || []; return { ...data, blocked: { ...data.blocked, [user.id]: current.includes(id) ? current.filter(uid => uid !== id) : [...current, id] } }; });
      if (blocking) removeDemoConnection(user.id, id);
    } else {
      const target = doc(db, 'communityBlocks', `${user.id}_${id}`);
      if (blockedIds.includes(id)) await deleteDoc(target);
      else {
        // A block removes both connections atomically. Each recipient observes
        // their own contacts disappear, so an open chat clears immediately
        // without revealing the other person's private block document.
        const batch = writeBatch(db);
        batch.set(target, { ownerId: user.id, blockedId: id, createdAt: serverTimestamp() });
        batch.delete(doc(db, 'communityConnections', user.id, 'members', id));
        batch.delete(doc(db, 'communityConnections', id, 'members', user.id));
        await batch.commit();
      }
    }
  }
  async function deleteComment(postId: string, commentId: string) {
    const user = sessionActor();
    if (mode === 'demo') mutateDemo(data => { const current = (data.comments[postId] || []).find(c => c.id === commentId); if (!current || current.authorId !== user.id) throw new Error('No puedes borrar este comentario.'); return { ...data, comments: { ...data.comments, [postId]: data.comments[postId].filter(c => c.id !== commentId) } }; });
    else { const target = doc(db, 'communityComments', commentId); const current = await getDoc(target); if (!current.exists() || current.data().postId !== postId || current.data().authorId !== user.id && !isAdmin) throw new Error('No puedes borrar este comentario.'); await deleteDoc(target); setComments(previous => ({ ...previous, [postId]: (previous[postId] || []).filter(c => c.id !== commentId) })); }
  }
  async function reportComment(postId: string, commentId: string, reason: string) {
    const user = sessionActor(); const report: ContentReport = { id: newId(), reporterId: user.id, postId, commentId, reason: requireText(reason, 'Motivo', 1000), status: 'open', createdAt: stamp() };
    if (mode === 'demo') mutateDemo(data => { if (!(data.comments[postId] || []).some(c => c.id === commentId)) throw new Error('Comentario no encontrado.'); return { ...data, reports: [...data.reports, report] }; });
    else await setDoc(doc(db, 'communityReports', report.id), { ...report, createdAt: serverTimestamp() });
  }
  async function loadMoreAdminQueue(kind: 'verification' | 'reports' | 'rights') {
    sessionActor(); if (!isAdmin || mode !== 'cloud' || adminQueueLoading[kind]) return;
    setAdminQueueLoading(previous => ({ ...previous, [kind]: true }));
    try { const names = { verification: 'communityVerifications', reports: 'communityReports', rights: 'communityRightsRequests' }; const condition = kind === 'rights' ? where('status', 'in', ['pending', 'processing']) : where('status', '==', kind === 'verification' ? 'pending' : 'open');
      const cursor = adminCursors.current[kind]; const snapshot = await getDocs(query(collection(db, names[kind]), condition, orderBy('createdAt', 'asc'), ...(cursor ? [startAfter(cursor)] : []), limit(100)));
      adminCursors.current[kind] = snapshot.docs.at(-1) || cursor; setAdminQueueHasMore(previous => ({ ...previous, [kind]: snapshot.size === 100 }));
      if (kind === 'verification') { const values = snapshot.docs.map(d => normalizeVerification(d.data(), d.id)).filter((v): v is VerificationRequest => v !== null); setVerifications(previous => [...new Map([...previous, ...values].map(v => [v.id, v])).values()]); }
      else if (kind === 'reports') { const values = snapshot.docs.map(d => normalizeReport(d.data(), d.id)).filter((v): v is ContentReport => v !== null); setReports(previous => [...new Map([...previous, ...values].map(v => [v.id, v])).values()]); }
      else { const values = snapshot.docs.map(d => normalizeRightsRequest(d.data(), d.id)).filter((v): v is RightsRequest => v !== null); setAdminRightsRequests(previous => [...new Map([...previous, ...values].map(v => [v.id, v])).values()]); }
    } finally { setAdminQueueLoading(previous => ({ ...previous, [kind]: false })); }
  }
  async function suspendAccount(userId: string, reason: string, suspend = true) {
    const user = sessionActor(); if (!isAdmin || mode !== 'cloud') throw new Error('Esta acción requiere la cuenta administradora.'); if (!validProfileId(userId) || userId === user.id) throw new Error('Cuenta inválida o propia.');
    await setDoc(doc(db, 'communityAccountModeration', userId), { status: suspend ? 'suspended' : 'active', reason: requireText(reason, 'Motivo', 1000), updatedAt: serverTimestamp() });
  }
  async function reviewRightsRequest(id: string, status: 'processing' | 'completed' | 'rejected') {
    sessionActor(); if (!isAdmin || mode !== 'cloud' || !['processing', 'completed', 'rejected'].includes(status)) throw new Error('Esta acción requiere la cuenta administradora.');
    await updateDoc(doc(db, 'communityRightsRequests', id), { status, reviewedAt: serverTimestamp() }); setAdminRightsRequests(previous => status === 'processing' ? previous.map(r => r.id === id ? { ...r, status } : r) : previous.filter(r => r.id !== id));
  }
  async function updateRuntimeStatus(status: RuntimeConfig['serviceStatus']) {
    sessionActor(); if (!isAdmin || mode !== 'cloud' || !['setup', 'open', 'paused'].includes(status)) throw new Error('Esta acción requiere la cuenta administradora.');
    if (status === 'open' && !legalReady) throw new Error('Completa el nombre, país y contacto del responsable antes de abrir el servicio.');
    await setDoc(doc(db, 'communityConfiguration', 'runtime'), { serviceStatus: status, mediaUploadsEnabled: false, contactEmail: operator.email || runtimeConfig.contactEmail, updatedAt: serverTimestamp() });
  }
  async function markNoticeRead(id: string) {
    const user = sessionActor(); if (mode === 'demo') mutateDemo(data => ({ ...data, notices: data.notices.map(n => n.id === id && n.recipientId === user.id ? { ...n, readAt: stamp() } : n) }));
    else await updateDoc(doc(db, 'communityEventNotices', id), { readAt: serverTimestamp() });
  }
  async function retryEventNotices(id: string) {
    const user = actor();
    if (mode === 'demo') return { created: 0, inspected: 0, hasMore: false };
    const snapshot = await getDoc(doc(db, 'communityEvents', id));
    const event = snapshot.exists() ? normalizeEvent(snapshot.data(), id) : null;
    if (!event || event.ownerId !== user.id) throw new Error('Solo el organizador puede recuperar los avisos.');
    const key = `${user.id}:${id}`;
    let state = deliveryCursors.current.get(key);
    if (!state) { state = { stage: 'changes', cursor: null, candidates: [], busy: false }; deliveryCursors.current.set(key, state); }
    if (state.busy) throw new Error('Ya se están recuperando los avisos de este encuentro.');
    state.busy = true;
    try {
      while (state.candidates.length < 200 && state.stage !== 'done') {
        const isChange = state.stage === 'changes';
        const base = query(collection(db, isChange ? 'communityEventChanges' : 'communityEventPromotions'), where('eventId', '==', id), orderBy(isChange ? 'revision' : 'createdAt', 'asc'), limit(50));
        const page = await getDocs(state.cursor ? query(base, startAfter(state.cursor)) : base);
        for (const record of page.docs) {
          const data = record.data();
          if (isChange) {
            if (data.ownerId !== user.id || !Array.isArray(data.audienceIds)) throw new Error('El historial de avisos necesita revisión.');
            for (const recipientId of data.audienceIds.filter((uid: unknown): uid is string => typeof uid === 'string' && !uid.startsWith('guest-'))) {
              const noticeId = `${id}_${data.revision}_${recipientId}`;
              state.candidates.push({ id: noticeId, value: { id: noticeId, eventId: id, recipientId, revision: data.revision, title: data.title, summary: data.summary, createdAt: serverTimestamp(), readAt: '' } });
            }
          } else {
            const deliveryId = record.id.slice(id.length + 1);
            if (!deliveryId || typeof data.recipientId !== 'string') throw new Error('El registro de una plaza necesita revisión.');
            const noticeId = `${id}_place_${deliveryId}`;
            state.candidates.push({ id: noticeId, value: { id: noticeId, eventId: id, recipientId: data.recipientId, revision: Math.max(1, snapshot.data().revision || 0), title: data.title, summary: data.summary, createdAt: serverTimestamp(), readAt: '', kind: 'place', deliveryId } });
          }
        }
        state.cursor = page.docs.at(-1) || state.cursor;
        if (page.size < 50) { state.stage = isChange ? 'promotions' : 'done'; state.cursor = null; }
      }
      const inspected = state.candidates.slice(0, 200);
      const candidates = inspected.filter(candidate => noticeRecipientAllowed(event, candidate.value.recipientId));
      const receipts = await Promise.all(candidates.map(candidate => getDoc(doc(db, 'communityEventDeliveries', candidate.id))));
      const missing = candidates.filter((_, index) => !receipts[index].exists());
      let created = 0;
      if (missing.length) {
        await commitDeliveryBatches(missing, async candidates => {
          const current = await getDoc(doc(db, 'communityEvents', id));
          const latest = current.exists() ? normalizeEvent(current.data(), id) : null;
          if (!latest || latest.ownerId !== user.id) throw new Error('El encuentro ya no está disponible para entregar avisos.');
          const eligible = candidates.filter(candidate => noticeRecipientAllowed(latest, candidate.value.recipientId));
          if (!eligible.length) return;
          const batch = writeBatch(db);
          for (const notice of eligible) {
            batch.set(doc(db, 'communityEventNotices', notice.id), notice.value);
            batch.set(doc(db, 'communityEventDeliveries', notice.id), { actorId: user.id, eventId: id, recipientId: notice.value.recipientId, createdAt: serverTimestamp() });
          }
          await batch.commit();
          created += eligible.length;
        });
      }
      state.candidates.splice(0, inspected.length);
      const hasMore = state.candidates.length > 0 || state.stage !== 'done';
      if (!hasMore) deliveryCursors.current.delete(key);
      return { created, inspected: inspected.length, hasMore };
    } catch (error) {
      deliveryCursors.current.delete(key);
      throw new Error(`La recuperación no se ha completado. Los avisos entregados se conservan y puedes volver a intentarlo. ${friendlyError(error)}`);
    } finally { state.busy = false; }
  }
  async function requestRights(kind: 'export' | 'delete') {
    const user = sessionActor(); if (!['export', 'delete'].includes(kind)) throw new Error('Solicitud inválida.');
    const id = `${user.id}_${kind}`; const request: RightsRequest = { id, userId: user.id, kind, status: 'pending', createdAt: stamp(), reviewedAt: '' };
    if (mode === 'demo') mutateDemo(data => { if (data.rightsRequests.some(r => r.id === id && ['pending', 'processing'].includes(r.status))) throw new Error('Ya hay una solicitud pendiente.'); return { ...data, rightsRequests: [...data.rightsRequests.filter(r => r.id !== id), request] }; });
    else await setDoc(doc(db, 'communityRightsRequests', id), { ...request, createdAt: serverTimestamp() });
  }

  const viewer = mode === 'demo' ? profile?.id : auth.currentUser?.uid === firebaseUser?.uid ? firebaseUser?.uid : undefined;
  const readableOwnEvents = ownEvents.filter(event => canReadEvent(event, viewer));
  const availableEvents = [...new Map([...olderEvents, ...events, ...readableOwnEvents].map(event => [event.id, event])).values()].filter(event => canReadEvent(event, viewer)).map(event => event.fixtureIds && fixtureStates[event.id] === 'ready' ? { ...event, fixtures: fixtureData[event.id] || [] } : event).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const availablePosts = [...new Map([...olderPosts, ...Object.values(linkedPosts[mode]), ...posts].map(post => [post.id, post])).values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function sessionActor() {
    if (!profile) throw new Error('Entra con tu cuenta o activa el modo de prueba.');
    if (mode === 'cloud' && auth.currentUser?.uid !== profile.id) throw new Error('Tu sesión ha caducado.');
    return profile;
  }
  function actor() {
    const profile = sessionActor();
    if (mode === 'cloud' && accountModeration?.status === 'suspended') throw new Error(`Tu cuenta está suspendida: ${accountModeration.reason}`);
    if (mode === 'cloud' && !serviceOpen) throw new Error(runtimeConfig.serviceStatus === 'paused' ? 'El servicio está temporalmente pausado.' : 'El servicio todavía está en preparación.');
    if (!profile.city.trim() || !profile.country.trim()) throw new Error('Completa la ciudad y el país de tu perfil antes de participar.');
    if (!profile.adultConfirmed) throw new Error('Completa tu perfil y confirma que eres mayor de edad para participar en esta beta.');
    if (profile.acceptedTermsVersion !== TERMS_VERSION) throw new Error('Revisa y acepta los términos actuales en tu perfil.');
    if (mode === 'cloud' && auth.currentUser?.uid !== profile.id) throw new Error('Tu sesión ha caducado.');
    return profile;
  }
  function mutateDemo(change: (data: DemoData) => DemoData) { writeDemo(normalizeDemoData(change(normalizeDemoData(readDemo())))); }
  async function mutateEvent(id: string, change: (event: PlayEvent, user: CommunityProfile) => PlayEvent, ownerOnly = false, reason = 'Se ha actualizado el encuentro.', withdrawal = false, notifyOnly?: string[]) {
    const user = withdrawal ? sessionActor() : actor();
    const apply = (event: PlayEvent) => {
      if (!canReadEvent(event, user.id)) throw new Error('Necesitas una invitación para acceder a este encuentro privado.');
      if (ownerOnly && event.ownerId !== user.id) throw new Error('Solo el organizador puede realizar esta acción.');
      const changed = change(event, user);
      const promoted = Object.keys(changed.participants).find(uid => !event.participants[uid] && event.waitlist?.[uid]);
      if (promoted) { changed.rsvps = { ...(changed.rsvps || {}) }; delete changed.rsvps[promoted]; }
      return { ...changed, participantIds: Object.keys(changed.participants), ...(ownerOnly ? { revision: (event.revision || 0) + 1, updatedAt: stamp(), history: [...(event.history || []), { revision: (event.revision || 0) + 1, changedAt: stamp(), summary: requireText(reason, 'Motivo del cambio', 500) }].slice(-50) } : {}) };
    };
    if (mode === 'demo') {
      mutateDemo(data => { const event = data.events.find(e => e.id === id); if (!event) throw new Error('Evento no encontrado.');
        const next = apply(event); const recipients = [...new Set([event.ownerId, ...Object.keys(event.participants), ...Object.keys(next.participants), ...Object.keys(event.waitlist || {}), ...Object.keys(next.waitlist || {})])].filter(uid => noticeRecipientAllowed(next, uid));
        const notices: EventNotice[] = ownerOnly ? (notifyOnly || recipients).filter(uid => noticeRecipientAllowed(next, uid)).map(uid => ({ id: `${id}_${next.revision}_${uid}`, eventId: id, recipientId: uid, revision: next.revision!, title: next.title, summary: reason, createdAt: stamp(), readAt: '' })) : [];
        const promoted = Object.keys(next.participants).find(uid => !event.participants[uid] && event.waitlist?.[uid]);
        if (promoted) { const deliveryId = newId(); notices.push({ id: `${id}_place_${deliveryId}`, eventId: id, recipientId: promoted, revision: Math.max(1, next.revision || 0), title: next.title, summary: 'Has conseguido una plaza al liberarse un puesto.', createdAt: stamp(), readAt: '', kind: 'place', deliveryId }); }
        return { ...data, events: data.events.map(e => e.id === id ? next : e), notices: [...notices, ...data.notices] }; }); return;
    }
    const notifications: Array<{ id: string; value: DocumentData }> = []; let notificationOwnerId = ''; let notificationEvent: PlayEvent | null = null;
    await runTransaction(db, async tx => { notifications.length = 0; const eventRef = doc(db, 'communityEvents', id); const snapshot = await tx.get(eventRef);
      if (!snapshot.exists()) throw new Error('Evento no encontrado.');
      const raw = snapshot.data(); const canonical = new Map<string, { fixture: Fixture; raw: DocumentData }>();
      if (Array.isArray(raw.fixtureIds)) { const records = await Promise.all(raw.fixtureIds.map((fixtureId: string) => tx.get(doc(db, 'communityFixtures', `${id}_${fixtureId}`)))); for (const record of records) { const fixture = record.exists() ? normalizeFixtureRecord(record.data(), id) : null; if (!fixture) throw new Error('El calendario está incompleto o contiene un cruce inválido.'); canonical.set(fixture.id, { fixture, raw: record.data()! }); } }
      const current = normalizeEvent({ ...raw, ...(Array.isArray(raw.fixtureIds) ? { fixtures: raw.fixtureIds.map((fixtureId: string) => canonical.get(fixtureId)?.fixture) } : {}) }, snapshot.id);
      if (!current) throw new Error('El evento contiene datos no válidos y necesita revisión.');
      notificationOwnerId = current.ownerId;
      const next = apply(current);
      notificationEvent = next;
      const waitlist = Object.fromEntries(Object.entries(next.waitlist || {}).map(([uid, item]) => [uid, { ...item, joinedAt: raw.waitlist?.[uid]?.joinedAt || serverTimestamp() }]));
      const useCanonical = Array.isArray(raw.fixtureIds) || ownerOnly && next.fixtures.length > 0;
      if (useCanonical && ownerOnly) for (const fixture of next.fixtures) { const existing = canonical.get(fixture.id); if (!existing || !sameFixture(existing.fixture, fixture)) tx.set(doc(db, 'communityFixtures', `${id}_${fixture.id}`), { ...fixtureFields(existing ? { ...next, timeZone: existing.raw.timeZone, venue: existing.raw.venue } : next, fixture), createdAt: existing?.raw.createdAt || serverTimestamp(), updatedAt: serverTimestamp() }); }
      const { history: _clientHistory, ...nextFields } = next;
      tx.set(eventRef, { ...raw, ...nextFields, fixtures: raw.fixtures || [], ...(useCanonical ? { fixtureIds: next.fixtures.map(fixture => fixture.id) } : {}), ...(raw.waitlist !== undefined || next.waitlist !== undefined ? { waitlist } : {}), ...(raw.history !== undefined ? { history: raw.history } : {}), createdAt: raw.createdAt, ...(ownerOnly ? { updatedAt: serverTimestamp() } : raw.updatedAt ? { updatedAt: raw.updatedAt } : {}) });
      const promoted = Object.keys(next.participants).find(uid => !current.participants[uid] && current.waitlist?.[uid]);
      if (promoted) { const deliveryId = newId(); tx.set(doc(db, 'communityEventPromotions', `${id}_${deliveryId}`), { eventId: id, authorId: user.id, recipientId: promoted, title: next.title, summary: 'Has conseguido una plaza al liberarse un puesto.', createdAt: serverTimestamp() }); notifications.push({ id: `${id}_place_${deliveryId}`, value: { id: `${id}_place_${deliveryId}`, eventId: id, recipientId: promoted, revision: Math.max(1, next.revision || 0), title: next.title, summary: 'Has conseguido una plaza al liberarse un puesto.', createdAt: serverTimestamp(), readAt: '', kind: 'place', deliveryId } }); }
      if (ownerOnly) {
        const revision = next.revision!; const summary = requireText(reason, 'Motivo del cambio', 500);
        const audienceIds = [...new Set([current.ownerId, ...Object.keys(current.participants), ...Object.keys(next.participants), ...Object.keys(current.waitlist || {}), ...Object.keys(next.waitlist || {})])];
        tx.set(doc(db, 'communityEventChanges', `${id}_${revision}`), { audienceIds, id: `${id}_${revision}`, eventId: id, ownerId: user.id, revision, summary, title: next.title, createdAt: serverTimestamp() });
        const recipients = [...new Set([current.ownerId, ...Object.keys(current.participants), ...Object.keys(next.participants), ...Object.keys(current.waitlist || {}), ...Object.keys(next.waitlist || {})])].filter(uid => noticeRecipientAllowed(next, uid));
        for (const uid of (notifyOnly || recipients).filter(uid => noticeRecipientAllowed(next, uid))) notifications.push({ id: `${id}_${revision}_${uid}`, value: { id: `${id}_${revision}_${uid}`, eventId: id, recipientId: uid, revision, title: next.title, summary, createdAt: serverTimestamp(), readAt: '' } });
      } });
    if (notifications.length) {
      try { await commitDeliveryBatches(notifications, async notices => {
        // A private participant who just left cannot read the parent any more.
        // Their promotion proof comes from the completed transaction; rules
        // still verify the recipient's current membership at delivery time.
        const current = user.id === notificationOwnerId ? await getDoc(doc(db, 'communityEvents', id)) : null;
        const latest = current ? current.exists() ? normalizeEvent(current.data(), id) : null : notificationEvent;
        if (!latest || latest.ownerId !== notificationOwnerId) throw new Error('El encuentro ya no está disponible para entregar avisos.');
        const eligible = notices.filter(notice => noticeRecipientAllowed(latest, notice.value.recipientId));
        if (!eligible.length) return;
        const batch = writeBatch(db);
        for (const notice of eligible) { batch.set(doc(db, 'communityEventNotices', notice.id), notice.value); batch.set(doc(db, 'communityEventDeliveries', notice.id), { actorId: notificationOwnerId, eventId: id, recipientId: notice.value.recipientId, createdAt: serverTimestamp() }); }
        await batch.commit();
      }); } catch { throw new Error('El cambio se ha guardado, pero no se han podido entregar todos los avisos. El organizador puede usar «Recuperar avisos» para completar la entrega.'); }
    }
  }
  async function login() { if (!serviceOpen) throw new Error('El acceso está disponible cuando el servicio esté abierto.'); setError(''); await signInWithGoogle(); }
  async function loginAdmin() { setError(''); const user = await signInWithGoogle(); const token = await user.getIdTokenResult(true); if (token.claims.admin !== true) { await logout(); throw new Error('Esta cuenta no tiene el permiso de administración.'); } }
  async function signOut() { await logout(); localStorage.removeItem('cantera-demo-active'); setFirebaseUser(null); setProfile(null); setLegacyUser(null); setMode('cloud'); }
  async function beginDemo(name: string) {
    if (!demoEnabled) throw new Error('El modo de prueba no está disponible en producción.');
    if (auth.currentUser) await logout();
    const cleanName = requireText(name, 'Nombre', 100);
    const existing = normalizeDemoData(readDemo()).profiles.find(item => item.name === cleanName);
    const user = existing || defaultProfile(`demo-${newId()}`, cleanName);
    localStorage.setItem('cantera-demo-active', 'true');
    mutateDemo(data => ({ ...data, profile: { ...user, name: requireText(name, 'Nombre', 100), adultConfirmed: true, acceptedTermsVersion: TERMS_VERSION, acceptedTermsAt: stamp() } }));
    setMode('demo');
  }
  async function toggleFollow(id: string) {
    const user = profile;
    if (!user) throw new Error('Entra con tu cuenta o activa el modo de prueba.');
    if (mode === 'cloud' && auth.currentUser?.uid !== user.id) throw new Error('Tu sesión ha caducado.');
    if (!validProfileId(id) || id === user.id) throw new Error('No puedes seguir tu propia cuenta ni un perfil inválido.');
    const followId = `${user.id}_${id}`;
    if (mode === 'demo') {
      mutateDemo(data => {
        if (data.profile?.id !== user.id) throw new Error('Tu sesión de prueba ha cambiado.');
        const current = data.follows.find(item => item.id === followId);
        if (current) {
          if (current.followerId !== user.id || current.followingId !== id) throw new Error('Este seguimiento no corresponde a tu cuenta.');
          return { ...data, follows: data.follows.filter(item => item.id !== followId) };
        }
        actor();
        if (!data.profiles.some(item => item.id === id && item.adultConfirmed && item.acceptedTermsVersion === TERMS_VERSION && item.city.trim() && item.country.trim())) throw new Error('Este perfil ya no está disponible.');
        return { ...data, follows: [...data.follows, { id: followId, followerId: user.id, followingId: id, createdAt: stamp() }] };
      });
    } else await runTransaction(db, async transaction => {
      const relation = doc(db, 'communityFollows', followId); const current = await transaction.get(relation);
      if (current.exists()) {
        if (current.data().followerId !== user.id || current.data().followingId !== id) throw new Error('Este seguimiento no corresponde a tu cuenta.');
        transaction.delete(relation); return;
      }
      actor();
      const target = await transaction.get(doc(db, 'communityPublicProfiles', id));
      if (!target.exists() || !normalizePublicProfile(target.data(), target.id)) throw new Error('Este perfil ya no está disponible.');
      transaction.set(relation, { followerId: user.id, followingId: id, createdAt: serverTimestamp() });
    });
  }
  async function saveProfile(input: Omit<CommunityProfile, 'id' | 'verification' | 'createdAt'>) {
    const user = sessionActor();
    if (!input.adultConfirmed) throw new Error('La beta requiere confirmar la mayoría de edad.');
    if (input.acceptedTermsVersion !== TERMS_VERSION) throw new Error('Debes aceptar los términos de uso.');
    if (!['individual', 'group', 'club'].includes(input.entityType) || !['amateur', 'professional'].includes(input.level)) throw new Error('Tipo de perfil inválido.');
    const cleaned = { ...input, name: requireText(input.name, 'Nombre', 100), country: requireText(input.country, 'País', 100),
      city: requireText(input.city, 'Ciudad', 100), bio: input.bio.trim(), team: input.team.trim(), position: input.position.trim() };
    if (cleaned.bio.length > 1000 || cleaned.team.length > 100 || cleaned.position.length > 100) throw new Error('El texto del perfil supera el límite.');
    const updated = { ...user, ...cleaned };
    if (mode === 'demo') mutateDemo(data => ({ ...data, profile: updated }));
    else {
      const target = doc(db, 'communityProfiles', user.id); const stored = await getDoc(target);
      sessionActor();
      const createdAt = stored.exists() ? stored.data().createdAt : serverTimestamp();
      const acceptedTermsAt = stored.exists() && stored.data().acceptedTermsVersion === input.acceptedTermsVersion ? stored.data().acceptedTermsAt : serverTimestamp();
      const batch = writeBatch(db); batch.set(target, { ...updated, createdAt, acceptedTermsAt });
      batch.set(doc(db, 'communityPublicProfiles', user.id), { ...normalizePublicProfile(updated)!, createdAt, searchTokens: profileSearchTokens(updated) }); await batch.commit();
      if (auth.currentUser?.uid === user.id) setError(previous => previous === invalidOwnProfileError ? '' : previous);
    }
  }
  async function createEvent(input: EventInput) {
    const user = actor(); const cleaned = validateEvent(input); const id = newId();
    const event: PlayEvent = { ...cleaned, startAtMs: Date.parse(cleaned.startAt), id, ownerId: user.id, ownerName: user.name, status: 'open', participants: {}, participantIds: [], rsvps: {}, waitlist: {}, waitlistOrder: [], revision: 0, history: [], updatedAt: stamp(), fixtures: [], createdAt: stamp() };
    if (mode === 'demo') mutateDemo(data => ({ ...data, events: [event, ...data.events] }));
    else await setDoc(doc(db, 'communityEvents', id), { ...event, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return id;
  }
  async function createEventSeries(inputs: EventInput[]) {
    const user = actor(); if (inputs.length < 2 || inputs.length > 12) throw new Error('La serie admite entre 2 y 12 encuentros.');
    const records = inputs.map(input => { const cleaned = validateEvent(input); const id = newId(); return { ...cleaned, id, ownerId: user.id, ownerName: user.name, startAtMs: Date.parse(cleaned.startAt), status: 'open' as const, participants: {}, participantIds: [], fixtures: [], waitlist: {}, waitlistOrder: [], rsvps: {}, revision: 0, history: [], createdAt: stamp(), updatedAt: stamp() }; });
    if (mode === 'demo') mutateDemo(data => ({ ...data, events: [...records, ...data.events] }));
    else { const batch = writeBatch(db); for (const record of records) batch.set(doc(db, 'communityEvents', record.id), { ...record, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); await batch.commit(); }
    return records.map(event => event.id);
  }
  function releasePlace(event: PlayEvent, uid: string): PlayEvent {
    const participants = { ...event.participants }; delete participants[uid];
    const waitlist = { ...(event.waitlist || {}) }; const order = [...(event.waitlistOrder || [])];
    if (event.status === 'open' && !event.fixtures.length && Date.parse(event.startAt) > Date.now() && Object.keys(participants).length < event.capacity && order.length) { const promoted = order.shift()!; if (waitlist[promoted]) participants[promoted] = waitlist[promoted].name; delete waitlist[promoted]; }
    return { ...event, participants, waitlist, waitlistOrder: order };
  }
  async function joinEvent(id: string, name: string) { await mutateEvent(id, (event, user) => { if ((event.waitlistOrder || []).length) throw new Error('Hay una lista de espera. Solicita tu turno.'); return { ...event, participants: joinParticipants(event, user.id, name), rsvps: { ...(event.rsvps || {}), [user.id]: 'yes' } }; }); }
  async function leaveEvent(id: string) { await mutateEvent(id, (event, user) => {
    if (event.fixtures.length || Date.parse(event.startAt) <= Date.now()) throw new Error('El calendario ya está cerrado. Contacta con el organizador.');
    return { ...releasePlace(event, user.id), rsvps: { ...(event.rsvps || {}), [user.id]: 'no' } };
  }, false, '', true); }
  async function addGuest(id: string, name: string) { await mutateEvent(id, event => { if ((event.waitlistOrder || []).length) throw new Error('Hay participantes esperando una plaza.'); return { ...event, participants: joinParticipants(event, `guest-${newId()}`, name) }; }, true, 'El organizador ha añadido un invitado.'); }
  async function removeGuest(id: string, guestId: string) { await mutateEvent(id, event => { if (!guestId.startsWith('guest-') || !event.participants[guestId]) throw new Error('Invitado no encontrado.'); if (event.fixtures.length || Date.parse(event.startAt) <= Date.now()) throw new Error('No se pueden cambiar invitados después de cerrar el calendario.'); return releasePlace(event, guestId); }, true, 'El organizador ha retirado un invitado.'); }
  async function promoteWaitingPlayers(id: string) {
    for (let attempt = 0; attempt < 64; attempt++) {
      const source = mode === 'demo' ? normalizeDemoData(readDemo()).events.find(event => event.id === id) : await getDoc(doc(db, 'communityEvents', id)).then(snapshot => snapshot.exists() ? normalizeEvent(snapshot.data(), id) : null);
      if (!source || source.status !== 'open' || source.fixtures.length || Date.parse(source.startAt) <= Date.now() || Object.keys(source.participants).length >= source.capacity || !(source.waitlistOrder || []).length) return;
      const uid = source.waitlistOrder![0];
      await mutateEvent(id, event => { const first = event.waitlistOrder?.[0]; if (!first || Object.keys(event.participants).length >= event.capacity || event.status !== 'open') throw new Error('La lista de espera ha cambiado. Actualiza el encuentro.'); const waitlist = { ...(event.waitlist || {}) }; const name = waitlist[first].name; delete waitlist[first]; return { ...event, participants: { ...event.participants, [first]: name }, waitlist, waitlistOrder: event.waitlistOrder!.slice(1) }; }, true, 'Has conseguido una plaza al ampliar la convocatoria.', false, [uid]);
    }
  }
  async function updateEvent(id: string, input: EventInput, changeReason: string) { await mutateEvent(id, event => ({ ...event, ...validateEventEdit(event, input, changeReason), startAtMs: Date.parse(input.startAt) }), true, changeReason); try { await promoteWaitingPlayers(id); } catch { throw new Error('El cambio se ha guardado, pero queda una promoción pendiente. Vuelve a guardar el aforo para reintentarlo.'); } }
  async function setEventStatus(id: string, status: PlayEvent['status'], reason?: string) {
    if (!['open', 'closed', 'cancelled', 'completed'].includes(status)) throw new Error('Estado inválido.');
    await mutateEvent(id, event => { if (status === 'open' && (event.fixtures.length || Date.parse(event.startAt) <= Date.now())) throw new Error('No puedes reabrir un calendario ya generado o celebrado.'); if (status === 'completed') { if (Date.parse(event.startAt) > Date.now()) throw new Error('El encuentro todavía no ha comenzado.'); if (event.status === 'cancelled') throw new Error('Un encuentro cancelado no puede marcarse celebrado.'); if (event.type === 'match' && !event.result) throw new Error('Registra primero el resultado del partido.'); if (event.type === 'tournament' && (!event.fixtures.length || event.fixtures.some(f => f.awayId && f.homeScore === null) || event.tournamentFormat === 'knockout' && event.fixtures.filter(f => f.round === Math.max(...event.fixtures.map(f => f.round))).length !== 1)) throw new Error('Completa los resultados del torneo.'); } return { ...event, status }; }, true, reason || (status === 'cancelled' ? 'El organizador ha cancelado el encuentro.' : `El organizador ha cambiado el estado a ${status}.`)); if (status === 'open') { try { await promoteWaitingPlayers(id); } catch { throw new Error('Se han abierto las inscripciones, pero queda una promoción pendiente. Vuelve a abrirlas para reintentarlo.'); } }
  }
  async function setRsvp(id: string, response: Rsvp) { if (!['yes', 'no', 'maybe'].includes(response)) throw new Error('Respuesta inválida.'); await mutateEvent(id, (event, user) => {
    if (!event.participants[user.id]) throw new Error('Primero inscríbete en el encuentro.');
    if (Date.parse(event.startAt) <= Date.now() || event.status === 'cancelled' || event.status === 'completed') throw new Error('La convocatoria ha terminado.');
    if (response === 'no' && event.fixtures.length) throw new Error('El calendario ya está cerrado. Contacta con el organizador.');
    return { ...(response === 'no' ? releasePlace(event, user.id) : event), rsvps: { ...(event.rsvps || {}), [user.id]: response } };
  }, false, '', response === 'no'); }
  async function joinWaitlist(id: string, name: string) { await mutateEvent(id, (event, user) => {
    if (event.status !== 'open' || event.fixtures.length || Date.parse(event.startAt) <= Date.now()) throw new Error('Las inscripciones están cerradas.');
    if (event.participants[user.id] || event.waitlist?.[user.id]) throw new Error('Ya estás inscrito o en espera.');
    if (Object.keys(event.participants).length < event.capacity && !(event.waitlistOrder || []).length) throw new Error('Quedan plazas. Inscríbete directamente.');
    if ((event.waitlistOrder || []).length >= 64) throw new Error('La lista de espera está completa.');
    return { ...event, waitlist: { ...(event.waitlist || {}), [user.id]: { name: requireText(name, 'Nombre', 100), joinedAt: stamp() } }, waitlistOrder: [...(event.waitlistOrder || []), user.id] };
  }); }
  async function leaveWaitlist(id: string) { await mutateEvent(id, (event, user) => { const waitlist = { ...(event.waitlist || {}) }; delete waitlist[user.id]; return { ...event, waitlist, waitlistOrder: (event.waitlistOrder || []).filter(uid => uid !== user.id) }; }, false, '', true); }
  async function saveMatchResult(id: string, result: MatchResult) { await mutateEvent(id, event => { if (event.type !== 'match' || event.status === 'cancelled' || Date.parse(event.startAt) > Date.now()) throw new Error('Sólo se pueden registrar resultados de partidos celebrados.'); return { ...event, result: validateMatchResult(result), status: 'completed' }; }, true, 'El organizador ha registrado el resultado del partido.'); }
  async function scheduleFixture(id: string, fixtureId: string, schedule: FixtureSchedule) { await mutateEvent(id, event => { const cleaned = validateFixtureSchedule(schedule); const fixture = event.fixtures.find(f => f.id === fixtureId); if (!fixture || !fixture.awayId || fixture.homeScore !== null || event.status === 'cancelled' || event.status === 'completed') throw new Error('No se puede programar este cruce.'); return { ...event, fixtures: event.fixtures.map(f => f.id === fixtureId ? { ...f, ...cleaned } : f) }; }, true, 'El organizador ha actualizado la fecha, hora o campo de un cruce.'); }
  async function generateFixtures(id: string) { await mutateEvent(id, event => { if (event.type !== 'tournament') throw new Error('Los cruces son para torneos.'); return { ...event, fixtures: makeFixtures(event), status: 'closed' }; }, true, 'El organizador ha publicado los cruces del torneo.'); }
  async function saveScore(id: string, fixture: string, home: number, away: number) { await mutateEvent(id, event => ({ ...event, fixtures: recordScore(event, fixture, home, away) }), true, 'El organizador ha registrado un resultado del torneo.'); }

  async function createPost(input: PostInput, progress?: (n: number) => void) {
    const user = actor(); const id = newId();
    if (!['reel', 'photo', 'achievement'].includes(input.kind)) throw new Error('Tipo de publicación inválido.');
    if (input.kind !== 'achievement' && mode !== 'demo') throw new Error('Las fotos y los reels se habilitarán cuando el patrocinio permita activar el almacenamiento. Puedes compartir un logro escrito.');
    const text = requireText(input.text, 'Texto', 2000);
    const title = input.kind === 'achievement' ? requireText(input.title, 'Logro', 100) : input.title.trim().slice(0, 100);
    if (input.eventId) {
      if (!validProfileId(input.eventId)) throw new Error('Evento asociado inválido.');
      let associated: PlayEvent | null = null;
      if (mode === 'demo') associated = normalizeDemoData(readDemo()).events.find(event => event.id === input.eventId) || null;
      else {
        const parent = await getDoc(doc(db, 'communityEvents', input.eventId));
        associated = parent.exists() ? normalizeEvent(parent.data(), parent.id) : null;
      }
      if (!associated || !isPublicEvent(associated)) throw new Error('Las publicaciones son públicas: sólo puedes asociar un encuentro público disponible.');
    }
    let mediaUrl = '', mediaPath = '';
    try {
      if (input.kind !== 'achievement') {
        const file = input.file;
        if (!file) throw new Error('Selecciona un archivo.');
        const allowed = input.kind === 'reel' ? ['video/mp4', 'video/webm'] : ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type) || file.size > (input.kind === 'reel' ? 50 : 10) * 1024 * 1024 || file.size === 0) throw new Error('Formato o tamaño de archivo no permitido.');
        if (input.kind === 'reel') await validateVideo(file);
        if (mode === 'demo') { mediaPath = `local:${id}`; await saveLocalMedia(id, file); progress?.(100); }
        else {
          const ext = ({ 'video/mp4': 'mp4', 'video/webm': 'webm', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[file.type];
          mediaPath = `community/${user.id}/${id}.${ext}`;
          const asset = ref(storage, mediaPath); const upload = uploadBytesResumable(asset, file, { contentType: file.type });
          await new Promise<void>((resolve, reject) => upload.on('state_changed', state => progress?.(Math.round(state.bytesTransferred / state.totalBytes * 100)), reject, resolve));
          mediaUrl = await getDownloadURL(asset);
        }
      }
      const post: CommunityPost = { id, authorId: user.id, authorName: user.name, kind: input.kind, text, title, mediaUrl, mediaPath, createdAt: stamp(), eventId: input.eventId };
      if (mode === 'demo') mutateDemo(data => ({ ...data, posts: [post, ...data.posts] }));
      else await setDoc(doc(db, 'communityPosts', id), { ...post, createdAt: serverTimestamp() });
    } catch (err) {
      if (mediaPath) { try { if (mode === 'demo') await deleteLocalMedia(id); else await deleteObject(ref(storage, mediaPath)); } catch { /* cleanup can be retried by admin */ } }
      throw err;
    }
    return id;
  }
  async function deletePost(id: string) {
    const user = sessionActor(); const cloudSnapshot = mode === 'cloud' ? await getDoc(doc(db, 'communityPosts', id)) : null; const post = cloudSnapshot?.exists() ? normalizePost(cloudSnapshot.data(), id) : availablePosts.find(p => p.id === id);
    if (!post || post.authorId !== user.id && !isAdmin) throw new Error('No tienes permiso para borrar esta publicación.');
    if (mode === 'demo') {
      mutateDemo(data => { const l = { ...data.likes }, c = { ...data.comments }; delete l[id]; delete c[id];
        return { ...data, posts: data.posts.filter(p => p.id !== id), likes: l, comments: c }; });
      if (post.mediaPath) { const mediaId = post.mediaPath.startsWith('local:') ? post.mediaPath.slice(6) : id; await deleteLocalMedia(mediaId); mediaCache.current?.drop(mediaId); }
    } else {
      await deleteDoc(doc(db, 'communityPosts', id));
      // Retained interactions become unavailable to others under the prepared rules.
      // Physical cleanup uses the owner's bounded maintenance script until the trigger is funded.
      if (post.mediaPath) {
        try { await deleteObject(ref(storage, post.mediaPath)); } catch (err) { console.error('Media cleanup deferred to the server', err); }
      }
    }
  }
  async function toggleLike(id: string) {
    const user = sessionActor();
    if (mode === 'demo') mutateDemo(data => { const current = data.likes[id] || []; if (!current.includes(user.id)) actor(); return { ...data, likes: { ...data.likes, [id]: current.includes(user.id) ? current.filter(i => i !== user.id) : [...current, user.id] } }; });
    else await runTransaction(db, async tx => { const like = doc(db, 'communityLikes', `${id}_${user.id}`); const snap = await tx.get(like);
      if (snap.exists()) tx.delete(like); else { actor(); tx.set(like, { userId: user.id, postId: id, createdAt: serverTimestamp() }); } });
  }
  async function addComment(id: string, value: string) {
    const user = actor(); if (!availablePosts.some(p => p.id === id)) throw new Error('Publicación no encontrada.');
    const comment = { id: newId(), authorId: user.id, authorName: user.name, text: requireText(value, 'Comentario', 1000), createdAt: stamp() };
    if (mode === 'demo') mutateDemo(data => ({ ...data, comments: { ...data.comments, [id]: [...(data.comments[id] || []), comment] } }));
    else await setDoc(doc(db, 'communityComments', comment.id), { ...comment, postId: id, createdAt: serverTimestamp() });
  }
  async function reportPost(postId: string, reason: string) {
    const user = sessionActor(); const report: ContentReport = { id: newId(), reporterId: user.id, postId, reason: requireText(reason, 'Motivo', 1000), status: 'open', createdAt: stamp() };
    if (mode === 'demo') mutateDemo(data => ({ ...data, reports: [...data.reports, report] })); else await setDoc(doc(db, 'communityReports', report.id), { ...report, createdAt: serverTimestamp() });
  }
  function hidePost(id: string) { const next = [...new Set([...hiddenPostIds, id])]; setHidden(next); localStorage.setItem(`cantera-hidden-${profile?.id || 'visitor'}`, JSON.stringify(next)); }
  async function requestVerification(organization: string, evidence: string) {
    const user = actor();
    if (user.verification === 'verified') throw new Error('Tu cuenta ya está verificada.');
    if (verificationRequests.some(v => v.userId === user.id && v.status === 'pending')) throw new Error('Ya tienes una solicitud pendiente.');
    const request: VerificationRequest = { id: user.id, userId: user.id, name: user.name, organization: requireText(organization, 'Entidad', 100),
      evidence: requireText(evidence, 'Información para el administrador', 2000), status: 'pending', createdAt: stamp(), reviewedAt: '' };
    if (mode === 'demo') mutateDemo(data => ({ ...data, verifications: [...data.verifications.filter(v => v.id !== user.id), request] }));
    else await setDoc(doc(db, 'communityVerifications', user.id), { ...request, createdAt: serverTimestamp() });
  }
  async function reviewVerification(id: string, approve: boolean) {
    sessionActor(); if (!isAdmin || mode !== 'cloud') throw new Error('Esta acción requiere la cuenta administradora.');
    await runTransaction(db, async tx => { const r = doc(db, 'communityVerifications', id); const snapshot = await tx.get(r);
      if (!snapshot.exists() || snapshot.data().status !== 'pending') throw new Error('Solicitud no pendiente.');
      const target = approve ? await tx.get(doc(db, 'communityProfiles', id)) : null;
      const targetProfile = target?.exists() ? normalizeProfile(target.data(), target.id) : null;
      if (approve && !targetProfile) throw new Error('Perfil no disponible.');
      tx.update(r, { status: approve ? 'approved' : 'rejected', reviewedAt: serverTimestamp() });
      if (approve && targetProfile) {
        tx.update(doc(db, 'communityProfiles', id), { verification: 'verified' });
        tx.set(doc(db, 'communityPublicProfiles', id), { ...normalizePublicProfile(targetProfile)!, createdAt: target!.data().createdAt, searchTokens: profileSearchTokens(targetProfile), verification: 'verified' });
      } });
  }
  async function resolveReport(id: string, removePost: boolean) {
    sessionActor(); if (!isAdmin || mode !== 'cloud') throw new Error('Esta acción requiere la cuenta administradora.');
    const report = reports.find(r => r.id === id); if (!report) throw new Error('Denuncia no encontrada.');
    if (removePost) { if (report.commentId) await deleteComment(report.postId, report.commentId); else await deletePost(report.postId); }
    await updateDoc(doc(db, 'communityReports', id), { status: 'resolved' });
  }
  const value: CommunityAPI = { profile, mode, loading, error, isAdmin, demoEnabled, accountModeration, mediaUploadsEnabled: mode === 'demo', runtimeConfig: mode === 'demo' ? { serviceStatus: 'open', mediaUploadsEnabled: true, contactEmail: '', updatedAt: '' } : { ...runtimeConfig, serviceStatus: serviceOpen ? 'open' : runtimeConfig.serviceStatus === 'paused' ? 'paused' : 'setup' }, adminRightsRequests, adminQueueHasMore, adminQueueLoading, loadMoreAdminQueue, suspendAccount, reviewRightsRequest, updateRuntimeStatus, ownEvents: readableOwnEvents, ownEventsHasMore: false, ownEventsLoading: loading, loadMoreOwnEvents, ...pages, loadMoreEvents, loadMorePosts, fixtureData, fixtureStates, watchFixtureData, eventHistories, watchEventHistory, eventNotices, rightsRequests, blockedIds, toggleBlock, markNoticeRead, requestRights, retryEventNotices, postInteractionStates, watchPostInteractions, loadMoreComments, deleteComment, reportComment, searchPeople, events: availableEvents, posts: availablePosts, likes, comments, verificationRequests, reports, hiddenPostIds,
    profiles: peoplePage.mode === mode ? peoplePage.profiles : [], publicProfiles: publicCaches[mode], publicProfileStates: profileStates[mode], followingIds,
    peopleLoading: peoplePage.mode === mode && peoplePage.loading, peopleError: peoplePage.mode === mode ? peoplePage.error : '', peopleHasMore: peoplePage.mode !== mode || peoplePage.hasMore,
    loadMorePeople, watchPublicProfile, toggleFollow, watchPost, linkedPostStates: linkedStates[mode],
    login, loginAdmin, signOut, beginDemo, saveProfile, createEvent, createEventSeries, updateEvent, removeGuest, setRsvp, joinWaitlist, leaveWaitlist, saveMatchResult, scheduleFixture, joinEvent, leaveEvent, addGuest, setEventStatus, generateFixtures, saveScore,
    createPost, deletePost, toggleLike, addComment, reportPost, hidePost, requestVerification, reviewVerification, resolveReport };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCommunity() { const value = useContext(Context); if (!value) throw new Error('CommunityProvider requerido.'); return value; }
export function usePublicProfile(id: string): PublicProfile | null {
  const { watchPublicProfile, publicProfiles } = useCommunity();
  useEffect(() => watchPublicProfile(id), [id, watchPublicProfile]);
  return validProfileId(id) ? publicProfiles[id] || null : null;
}
async function validateVideo(file: File) {
  const url = URL.createObjectURL(file);
  try { await new Promise<void>((resolve, reject) => {
    const video = document.createElement('video'); video.preload = 'metadata';
    const timer = window.setTimeout(() => { video.removeAttribute('src'); video.load(); reject(new Error('No se pudo leer la duración del vídeo.')); }, 10000);
    const finish = (err?: Error) => { clearTimeout(timer); video.removeAttribute('src'); video.load(); err ? reject(err) : resolve(); };
    video.onloadedmetadata = () => finish(!Number.isFinite(video.duration) || video.duration > 90 ? new Error('El reel debe durar como máximo 90 segundos.') : undefined);
    video.onerror = () => finish(new Error('Este navegador no puede leer el vídeo. Usa MP4 o WebM.')); video.src = url;
  }); } finally { URL.revokeObjectURL(url); }
}
