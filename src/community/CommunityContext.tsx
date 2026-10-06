import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, setDoc, startAfter, updateDoc, where, writeBatch, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { auth, db, logout, signInWithGoogle, storage } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import { deleteLocalMedia, getLocalMedia, readDemo, saveLocalMedia, writeDemo, type DemoData } from './local';
import { TERMS_VERSION } from './policy';
export { TERMS_VERSION } from './policy';
import { joinParticipants, makeFixtures, recordScore, requireText, validateEvent } from './logic';
import { normalizeCommentRecord, normalizeDemoData, normalizeEvent, normalizeFollow, normalizeHiddenPostIds, normalizeLike, normalizePost, normalizeProfile, normalizePublicProfile, normalizeReport, normalizeVerification } from './normalization';
import type { CommunityPost, CommunityProfile, ContentReport, EventInput, PlayEvent, PostComment, PostInput, PublicProfile, VerificationRequest } from './types';

type Mode = 'demo' | 'cloud';
interface CommunityAPI {
  profile: CommunityProfile | null; mode: Mode; loading: boolean; error: string; isAdmin: boolean;
  demoEnabled: boolean; mediaUploadsEnabled: boolean;
  events: PlayEvent[]; posts: CommunityPost[]; likes: Record<string, string[]>; comments: Record<string, PostComment[]>;
  verificationRequests: VerificationRequest[]; reports: ContentReport[]; hiddenPostIds: string[];
  profiles: PublicProfile[]; publicProfiles: Record<string, PublicProfile>;
  publicProfileStates: Record<string, 'loading' | 'ready' | 'missing' | 'error'>;
  followingIds: string[]; peopleLoading: boolean; peopleError: string; peopleHasMore: boolean;
  linkedPostStates: Record<string, 'loading' | 'ready' | 'missing' | 'error'>; watchPost(id: string): () => void;
  loadMorePeople(reset?: boolean): Promise<void>; watchPublicProfile(id: string): () => void; toggleFollow(id: string): Promise<void>;
  login(): Promise<void>; signOut(): Promise<void>; beginDemo(name: string): Promise<void>;
  saveProfile(input: Omit<CommunityProfile, 'id' | 'verification' | 'createdAt'>): Promise<void>;
  createEvent(input: EventInput): Promise<string>; joinEvent(id: string, name: string): Promise<void>; leaveEvent(id: string): Promise<void>;
  addGuest(id: string, name: string): Promise<void>; setEventStatus(id: string, status: PlayEvent['status']): Promise<void>;
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
  const urls = useRef(new Map<string, string>());
  const setLegacyUser = useAppStore(s => s.setUser);
  const readFailure = useCallback((err: unknown) => { setError(friendlyError(err)); setLoading(false); }, []);

  const watchPublicProfile = useCallback((id: string) => {
    if (!validProfileId(id)) return () => {};
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
        const refresh = () => { const record = normalizeDemoData(readDemo()).profiles.find(item => item.id === id); receive(record?.adultConfirmed && record.acceptedTermsVersion === TERMS_VERSION ? normalizePublicProfile(record, id) : null); };
        refresh(); window.addEventListener('storage', refresh); window.addEventListener('cantera-demo-updated', refresh);
        unsubscribe = () => { window.removeEventListener('storage', refresh); window.removeEventListener('cantera-demo-updated', refresh); };
      } else unsubscribe = onSnapshot(doc(db, 'communityPublicProfiles', id), snapshot => receive(snapshot.exists() ? normalizePublicProfile(snapshot.data(), snapshot.id) : null), () => receive(null, true));
      profileWatches.current.set(key, { count: 1, stop: () => { active = false; unsubscribe(); } });
    }
    let released = false;
    return () => { if (released) return; released = true; const entry = profileWatches.current.get(key); if (!entry) return; entry.count -= 1; if (!entry.count) { entry.stop(); profileWatches.current.delete(key); } };
  }, [mode]);
  useEffect(() => () => { profileWatches.current.forEach(entry => entry.stop()); profileWatches.current.clear(); }, []);

  const watchPost = useCallback((id: string) => {
    if (!validProfileId(id)) return () => {};
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
            try { if (!urls.current.has(mediaId)) { const blob = await getLocalMedia(mediaId); if (blob instanceof Blob) urls.current.set(mediaId, URL.createObjectURL(blob)); } }
            catch { /* Text remains available if local media cannot be read. */ }
            if (current !== sequence) return;
            receive({ ...post, mediaUrl: urls.current.get(mediaId) || '' });
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
  }, [mode]);
  useEffect(() => () => { postWatches.current.forEach(entry => entry.stop()); postWatches.current.clear(); }, []);

  const loadMorePeople = useCallback(async (reset = false) => {
    if (reset || peopleCursor.current.mode !== mode) peopleCursor.current = { mode, cursor: null, offset: 0, sequence: peopleCursor.current.sequence + 1, busy: false };
    const paging = peopleCursor.current;
    if (paging.busy) return;
    paging.busy = true; const sequence = ++paging.sequence;
    setPeoplePage(previous => ({ mode, profiles: !reset && previous.mode === mode ? previous.profiles : [], loading: true, error: '', hasMore: true }));
    try {
      let records: PublicProfile[]; let hasMore: boolean;
      if (mode === 'demo') {
        const all = normalizeDemoData(readDemo()).profiles.filter(item => item.adultConfirmed && item.acceptedTermsVersion === TERMS_VERSION).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const batch = all.slice(paging.offset, paging.offset + peoplePageSize); paging.offset += batch.length;
        records = batch.map(item => normalizePublicProfile(item)!).filter(Boolean); hasMore = paging.offset < all.length;
      } else {
        const base = [orderBy('createdAt', 'desc'), limit(peoplePageSize)];
        const snapshot = await getDocs(query(collection(db, 'communityPublicProfiles'), ...base, ...(paging.cursor ? [startAfter(paging.cursor)] : [])));
        records = snapshot.docs.map(item => normalizePublicProfile(item.data(), item.id)).filter((item): item is PublicProfile => item !== null);
        paging.cursor = snapshot.docs.at(-1) || paging.cursor; hasMore = snapshot.size === peoplePageSize;
      }
      if (currentMode.current !== mode || peopleCursor.current.sequence !== sequence) return;
      setPeoplePage(previous => ({ mode, profiles: [...new Map([...(previous.mode === mode ? previous.profiles : []), ...records].map(item => [item.id, item])).values()], loading: false, error: '', hasMore }));
      setPublicCaches(previous => ({ ...previous, [mode]: { ...previous[mode], ...Object.fromEntries(records.map(item => [item.id, item])) } }));
    } catch (err) { if (currentMode.current === mode && peopleCursor.current.sequence === sequence) setPeoplePage(previous => ({ ...previous, mode, loading: false, error: friendlyError(err) })); }
    finally { if (peopleCursor.current === paging) paging.busy = false; }
  }, [mode]);

  useEffect(() => {
    if (mode === 'demo') {
      const refresh = () => {
        const data = normalizeDemoData(readDemo());
        setFollowingIds(data.follows.filter(item => item.followerId === data.profile?.id).map(item => item.followingId));
        setPeoplePage(previous => {
          if (previous.mode !== 'demo' || !previous.profiles.length) return previous;
          const windowSize = Math.max(peoplePageSize, peopleCursor.current.offset);
          const all = data.profiles.filter(item => item.adultConfirmed && item.acceptedTermsVersion === TERMS_VERSION).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          const loaded = all.slice(0, windowSize).map(item => normalizePublicProfile(item)!);
          if (peopleCursor.current.mode === 'demo') peopleCursor.current.offset = loaded.length;
          return { ...previous, profiles: loaded, hasMore: all.length > windowSize };
        });
      };
      refresh(); window.addEventListener('storage', refresh); window.addEventListener('cantera-demo-updated', refresh);
      return () => { window.removeEventListener('storage', refresh); window.removeEventListener('cantera-demo-updated', refresh); };
    }
    setFollowingIds([]);
    if (!firebaseUser) return;
    return onSnapshot(query(collection(db, 'communityFollows'), where('followerId', '==', firebaseUser.uid)), snapshot => {
      setFollowingIds(snapshot.docs.map(item => normalizeFollow(item.data(), item.id)).filter(item => item !== null).map(item => item.followingId));
    }, readFailure);
  }, [mode, firebaseUser?.uid, readFailure]);

  useEffect(() => {
    let active = true;
    const stop = onAuthStateChanged(auth, async user => {
      setFirebaseUser(user);
      setAdmin(false);
      if (!user) { setLoading(false); return; }
      setMode('cloud'); setLoading(true); setError('');
      localStorage.removeItem('cantera-demo-active');
      try {
        const [snapshot, token] = await Promise.all([getDoc(doc(db, 'communityProfiles', user.uid)), user.getIdTokenResult()]);
        if (!active || auth.currentUser?.uid !== user.uid) return;
        setAdmin(token.claims.admin === true);
        if (!snapshot.exists()) {
          const fresh = defaultProfile(user.uid, user.displayName || 'Mi perfil');
          await setDoc(doc(db, 'communityProfiles', user.uid), fresh);
        } else {
          const current = normalizeProfile(snapshot.data(), snapshot.id);
          if (current?.adultConfirmed && current.acceptedTermsVersion === TERMS_VERSION) await setDoc(doc(db, 'communityPublicProfiles', user.uid), normalizePublicProfile(current)!);
        }
      } catch (err) { if (active) readFailure(err); }
    });
    return () => { active = false; stop(); };
  }, [readFailure]);

  useEffect(() => {
    let active = true;
    setError(''); setEvents([]); setPosts([]); setLikes({}); setComments({}); setVerifications([]); setReports([]); setProfile(null);
    setLoading(true);
    if (mode === 'demo') {
      let refreshSequence = 0;
      const refresh = async () => {
        const sequence = ++refreshSequence;
        try {
          const data = normalizeDemoData(readDemo());
          const hydrated = await Promise.all(data.posts.map(async p => {
            if (!p.mediaPath.startsWith('local:')) return p;
            const id = p.mediaPath.slice(6);
            if (!urls.current.has(id)) { const blob = await getLocalMedia(id); if (blob instanceof Blob) urls.current.set(id, URL.createObjectURL(blob)); }
            return { ...p, mediaUrl: urls.current.get(id) || '' };
          }));
          if (!active || sequence !== refreshSequence) return;
          setProfile(data.profile); setEvents(data.events); setPosts(hydrated); setLikes(data.likes); setComments(data.comments);
          setVerifications(data.verifications.filter(v => v.userId === data.profile?.id)); setReports([]); setLoading(false);
        } catch (err) { if (active && sequence === refreshSequence) readFailure(err); }
      };
      void refresh();
      window.addEventListener('storage', refresh); window.addEventListener('cantera-demo-updated', refresh);
      return () => { active = false; window.removeEventListener('storage', refresh); window.removeEventListener('cantera-demo-updated', refresh); };
    }
    const listen = <T,>(name: string, normalize: (value: unknown, id: string) => T | null, receive: (items: T[]) => void, count = 100) => onSnapshot(
      query(collection(db, name), orderBy('createdAt', 'desc'), limit(count)), snapshot => {
        if (active) receive(snapshot.docs.map(d => normalize(d.data(), d.id)).filter((item): item is T => item !== null));
      }, readFailure);
    if (!firebaseUser) {
      const stops = [listen('communityEvents', normalizeEvent, values => { setEvents(values); setLoading(false); }), listen('communityPosts', normalizePost, setPosts)];
      return () => { active = false; stops.forEach(stop => stop()); };
    }
    const stops = [
      onSnapshot(doc(db, 'communityProfiles', firebaseUser.uid), snapshot => {
        if (!active) return;
        const current = snapshot.exists() ? normalizeProfile(snapshot.data(), snapshot.id) : null;
        setProfile(current);
        if (snapshot.exists() && !current) readFailure(new Error('Tu perfil contiene datos no válidos y necesita revisión.'));
      }, readFailure),
      listen('communityEvents', normalizeEvent, values => { setEvents(values); setLoading(false); }),
      listen('communityPosts', normalizePost, setPosts),
      listen('communityLikes', normalizeLike, values => {
        const grouped: Record<string, string[]> = Object.create(null); for (const v of values) (grouped[v.postId] ||= []).push(v.userId); setLikes(grouped);
      }, 1000),
      listen('communityComments', normalizeCommentRecord, values => {
        const grouped: Record<string, PostComment[]> = Object.create(null); for (const v of [...values].reverse()) (grouped[v.postId] ||= []).push(v); setComments(grouped);
      }, 1000)
    ];
    if (isAdmin) {
      stops.push(listen('communityVerifications', normalizeVerification, setVerifications));
      stops.push(listen('communityReports', normalizeReport, setReports));
    } else {
      stops.push(onSnapshot(doc(db, 'communityVerifications', firebaseUser.uid), snapshot => {
        if (!active) return;
        const current = snapshot.exists() ? normalizeVerification(snapshot.data(), snapshot.id) : null;
        setVerifications(current ? [current] : []);
      }, readFailure));
    }
    return () => { active = false; stops.forEach(stop => stop()); };
  }, [mode, firebaseUser?.uid, isAdmin, readFailure]);

  useEffect(() => {
    try { setHidden(normalizeHiddenPostIds(JSON.parse(localStorage.getItem(`cantera-hidden-${profile?.id || 'visitor'}`) || '[]'))); } catch { setHidden([]); }
    if (!profile) { setLegacyUser(null); return; }
    setLegacyUser({ uid: mode === 'cloud' ? profile.id : undefined, name: profile.name, email: firebaseUser?.email || '', role: 'PLAYER', bio: profile.bio, avatar: firebaseUser?.photoURL || '', plan: 'GRATUITO' });
  }, [profile, mode, firebaseUser?.email, setLegacyUser]);
  useEffect(() => () => { urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear(); }, []);

  const availablePosts = [...new Map([...Object.values(linkedPosts[mode]), ...posts].map(post => [post.id, post])).values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function actor() {
    if (!profile) throw new Error('Entra con tu cuenta o activa el modo de prueba.');
    if (!profile.adultConfirmed) throw new Error('Completa tu perfil y confirma que eres mayor de edad para participar en esta beta.');
    if (profile.acceptedTermsVersion !== TERMS_VERSION) throw new Error('Revisa y acepta los términos actuales en tu perfil.');
    if (mode === 'cloud' && auth.currentUser?.uid !== profile.id) throw new Error('Tu sesión ha caducado.');
    return profile;
  }
  function mutateDemo(change: (data: DemoData) => DemoData) { writeDemo(normalizeDemoData(change(normalizeDemoData(readDemo())))); }
  async function mutateEvent(id: string, change: (event: PlayEvent, user: CommunityProfile) => PlayEvent, ownerOnly = false) {
    const user = actor();
    const apply = (event: PlayEvent) => {
      if (ownerOnly && event.ownerId !== user.id) throw new Error('Solo el organizador puede realizar esta acción.');
      return change(event, user);
    };
    if (mode === 'demo') {
      mutateDemo(data => { const event = data.events.find(e => e.id === id); if (!event) throw new Error('Evento no encontrado.');
        return { ...data, events: data.events.map(e => e.id === id ? apply(e) : e) }; }); return;
    }
    await runTransaction(db, async tx => { const eventRef = doc(db, 'communityEvents', id); const snapshot = await tx.get(eventRef);
      if (!snapshot.exists()) throw new Error('Evento no encontrado.');
      const current = normalizeEvent(snapshot.data(), snapshot.id);
      if (!current) throw new Error('El evento contiene datos no válidos y necesita revisión.');
      tx.set(eventRef, { ...snapshot.data(), ...apply(current) }); });
  }
  async function login() { setError(''); await signInWithGoogle(); }
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
        if (!data.profiles.some(item => item.id === id && item.adultConfirmed && item.acceptedTermsVersion === TERMS_VERSION)) throw new Error('Este perfil ya no está disponible.');
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
      transaction.set(relation, { followerId: user.id, followingId: id, createdAt: stamp() });
    });
  }
  async function saveProfile(input: Omit<CommunityProfile, 'id' | 'verification' | 'createdAt'>) {
    if (!profile) throw new Error('Inicia sesión primero.');
    if (!input.adultConfirmed) throw new Error('La beta requiere confirmar la mayoría de edad.');
    if (input.acceptedTermsVersion !== TERMS_VERSION) throw new Error('Debes aceptar los términos de uso.');
    if (!['individual', 'group', 'club'].includes(input.entityType) || !['amateur', 'professional'].includes(input.level)) throw new Error('Tipo de perfil inválido.');
    const cleaned = { ...input, name: requireText(input.name, 'Nombre', 100), country: requireText(input.country, 'País', 100),
      city: requireText(input.city, 'Ciudad', 100), bio: input.bio.trim(), team: input.team.trim(), position: input.position.trim() };
    if (cleaned.bio.length > 1000 || cleaned.team.length > 100 || cleaned.position.length > 100) throw new Error('El texto del perfil supera el límite.');
    const updated = { ...profile, ...cleaned };
    if (mode === 'demo') mutateDemo(data => ({ ...data, profile: updated }));
    else {
      const batch = writeBatch(db); batch.set(doc(db, 'communityProfiles', profile.id), updated);
      batch.set(doc(db, 'communityPublicProfiles', profile.id), normalizePublicProfile(updated)!); await batch.commit();
    }
  }
  async function createEvent(input: EventInput) {
    const user = actor(); const cleaned = validateEvent(input); const id = newId();
    const event: PlayEvent = { ...cleaned, startAtMs: Date.parse(cleaned.startAt), id, ownerId: user.id, ownerName: user.name, status: 'open', participants: {}, fixtures: [], createdAt: stamp() };
    if (mode === 'demo') mutateDemo(data => ({ ...data, events: [event, ...data.events] }));
    else await setDoc(doc(db, 'communityEvents', id), event);
    return id;
  }
  async function joinEvent(id: string, name: string) { await mutateEvent(id, (event, user) => ({ ...event, participants: joinParticipants(event, user.id, name) })); }
  async function leaveEvent(id: string) { await mutateEvent(id, (event, user) => {
    if (event.fixtures.length || Date.parse(event.startAt) <= Date.now()) throw new Error('El calendario ya está cerrado. Contacta con el organizador.');
    const participants = { ...event.participants }; delete participants[user.id]; return { ...event, participants };
  }); }
  async function addGuest(id: string, name: string) { await mutateEvent(id, event => ({ ...event, participants: joinParticipants(event, `guest-${newId()}`, name) }), true); }
  async function setEventStatus(id: string, status: PlayEvent['status']) {
    if (!['open', 'closed', 'cancelled'].includes(status)) throw new Error('Estado inválido.');
    await mutateEvent(id, event => { if (status === 'open' && event.fixtures.length) throw new Error('No puedes reabrir un calendario ya generado.'); return { ...event, status }; }, true);
  }
  async function generateFixtures(id: string) { await mutateEvent(id, event => ({ ...event, fixtures: makeFixtures(event), status: 'closed' }), true); }
  async function saveScore(id: string, fixture: string, home: number, away: number) { await mutateEvent(id, event => ({ ...event, fixtures: recordScore(event, fixture, home, away) }), true); }

  async function createPost(input: PostInput, progress?: (n: number) => void) {
    const user = actor(); const id = newId();
    if (!['reel', 'photo', 'achievement'].includes(input.kind)) throw new Error('Tipo de publicación inválido.');
    if (input.kind !== 'achievement' && mode !== 'demo' && import.meta.env.VITE_ENABLE_MEDIA_UPLOADS !== 'true') throw new Error('Las fotos y los reels se habilitarán cuando el patrocinio permita activar el almacenamiento. Puedes compartir un logro escrito.');
    const text = requireText(input.text, 'Texto', 2000);
    const title = input.kind === 'achievement' ? requireText(input.title, 'Logro', 100) : input.title.trim().slice(0, 100);
    if (input.eventId && !events.some(e => e.id === input.eventId)) throw new Error('Evento asociado no encontrado.');
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
      else await setDoc(doc(db, 'communityPosts', id), post);
    } catch (err) {
      if (mediaPath) { try { if (mode === 'demo') await deleteLocalMedia(id); else await deleteObject(ref(storage, mediaPath)); } catch { /* cleanup can be retried by admin */ } }
      throw err;
    }
    return id;
  }
  async function deletePost(id: string) {
    const user = actor(); const post = availablePosts.find(p => p.id === id);
    if (!post || post.authorId !== user.id && !isAdmin) throw new Error('No tienes permiso para borrar esta publicación.');
    if (mode === 'demo') {
      mutateDemo(data => { const l = { ...data.likes }, c = { ...data.comments }; delete l[id]; delete c[id];
        return { ...data, posts: data.posts.filter(p => p.id !== id), likes: l, comments: c }; });
      if (post.mediaPath) await deleteLocalMedia(id);
    } else {
      await deleteDoc(doc(db, 'communityPosts', id));
      // The server deletion trigger also removes interactions and retries failed media cleanup.
      if (post.mediaPath) {
        try { await deleteObject(ref(storage, post.mediaPath)); } catch (err) { console.error('Media cleanup deferred to the server', err); }
      }
    }
  }
  async function toggleLike(id: string) {
    const user = actor(); if (!availablePosts.some(p => p.id === id)) throw new Error('Publicación no encontrada.');
    if (mode === 'demo') mutateDemo(data => { const current = data.likes[id] || []; return { ...data, likes: { ...data.likes, [id]: current.includes(user.id) ? current.filter(i => i !== user.id) : [...current, user.id] } }; });
    else await runTransaction(db, async tx => { const like = doc(db, 'communityLikes', `${id}_${user.id}`); const snap = await tx.get(like);
      if (snap.exists()) tx.delete(like); else tx.set(like, { userId: user.id, postId: id, createdAt: stamp() }); });
  }
  async function addComment(id: string, value: string) {
    const user = actor(); if (!availablePosts.some(p => p.id === id)) throw new Error('Publicación no encontrada.');
    const comment = { id: newId(), authorId: user.id, authorName: user.name, text: requireText(value, 'Comentario', 1000), createdAt: stamp() };
    if (mode === 'demo') mutateDemo(data => ({ ...data, comments: { ...data.comments, [id]: [...(data.comments[id] || []), comment] } }));
    else await setDoc(doc(db, 'communityComments', comment.id), { ...comment, postId: id });
  }
  async function reportPost(postId: string, reason: string) {
    const user = actor(); const report: ContentReport = { id: newId(), reporterId: user.id, postId, reason: requireText(reason, 'Motivo', 1000), status: 'open', createdAt: stamp() };
    if (mode === 'demo') mutateDemo(data => ({ ...data, reports: [...data.reports, report] })); else await setDoc(doc(db, 'communityReports', report.id), report);
  }
  function hidePost(id: string) { const next = [...new Set([...hiddenPostIds, id])]; setHidden(next); localStorage.setItem(`cantera-hidden-${profile?.id || 'visitor'}`, JSON.stringify(next)); }
  async function requestVerification(organization: string, evidence: string) {
    const user = actor();
    if (user.verification === 'verified') throw new Error('Tu cuenta ya está verificada.');
    if (verificationRequests.some(v => v.userId === user.id && v.status === 'pending')) throw new Error('Ya tienes una solicitud pendiente.');
    const request: VerificationRequest = { id: user.id, userId: user.id, name: user.name, organization: requireText(organization, 'Entidad', 100),
      evidence: requireText(evidence, 'Información para el administrador', 2000), status: 'pending', createdAt: stamp(), reviewedAt: '' };
    if (mode === 'demo') mutateDemo(data => ({ ...data, verifications: [...data.verifications.filter(v => v.id !== user.id), request] }));
    else await setDoc(doc(db, 'communityVerifications', user.id), request);
  }
  async function reviewVerification(id: string, approve: boolean) {
    actor(); if (!isAdmin || mode !== 'cloud') throw new Error('Esta acción requiere la cuenta administradora.');
    await runTransaction(db, async tx => { const r = doc(db, 'communityVerifications', id); const snapshot = await tx.get(r);
      if (!snapshot.exists() || snapshot.data().status !== 'pending') throw new Error('Solicitud no pendiente.');
      const target = approve ? await tx.get(doc(db, 'communityProfiles', id)) : null;
      const targetProfile = target?.exists() ? normalizeProfile(target.data(), target.id) : null;
      if (approve && !targetProfile) throw new Error('Perfil no disponible.');
      tx.update(r, { status: approve ? 'approved' : 'rejected', reviewedAt: stamp() });
      if (approve && targetProfile) {
        tx.update(doc(db, 'communityProfiles', id), { verification: 'verified' });
        tx.set(doc(db, 'communityPublicProfiles', id), { ...normalizePublicProfile(targetProfile)!, verification: 'verified' });
      } });
  }
  async function resolveReport(id: string, removePost: boolean) {
    actor(); if (!isAdmin || mode !== 'cloud') throw new Error('Esta acción requiere la cuenta administradora.');
    const report = reports.find(r => r.id === id); if (!report) throw new Error('Denuncia no encontrada.');
    if (removePost) await deletePost(report.postId);
    await updateDoc(doc(db, 'communityReports', id), { status: 'resolved' });
  }
  const value: CommunityAPI = { profile, mode, loading, error, isAdmin, demoEnabled, mediaUploadsEnabled: mode === 'demo' || import.meta.env.VITE_ENABLE_MEDIA_UPLOADS === 'true', events, posts: availablePosts, likes, comments, verificationRequests, reports, hiddenPostIds,
    profiles: peoplePage.mode === mode ? peoplePage.profiles : [], publicProfiles: publicCaches[mode], publicProfileStates: profileStates[mode], followingIds,
    peopleLoading: peoplePage.mode === mode && peoplePage.loading, peopleError: peoplePage.mode === mode ? peoplePage.error : '', peopleHasMore: peoplePage.mode !== mode || peoplePage.hasMore,
    loadMorePeople, watchPublicProfile, toggleFollow, watchPost, linkedPostStates: linkedStates[mode],
    login, signOut, beginDemo, saveProfile, createEvent, joinEvent, leaveEvent, addGuest, setEventStatus, generateFixtures, saveScore,
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
