import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, startAfter, where, Timestamp, type DocumentData, type QueryDocumentSnapshot, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { TERMS_VERSION, useCommunity } from './CommunityContext';
import { useInvitations } from './InvitationsContext';
import { conversationIdFor, conversationParticipants, mergeMessagePages, MESSAGE_PAGE_SIZE, messageText, MessagingError, normalizeConversation, normalizeMessage, normalizeMessageRead, messageIsAfterRead, safeMessagingError, validMessagingUid } from './messagingLogic';
import type { ConversationState, MessagingConversation, MessagingMessage, ConversationPreview, MessageRead } from './messagingTypes';

interface MessagingAPI {
  conversations: MessagingConversation[];
  previews: Record<string, ConversationPreview>;
  reads: Record<string, MessageRead>;
  unreadCount: number;
  readsError: string;
  readsReady: boolean;
  previewsHasMore: boolean;
  loadMorePreviews(): void;
  markRead(conversationId: string, message: MessagingMessage): Promise<void>;
  loading: boolean;
  error: string;
  eligible: boolean;
  openConversation(peerId: string): Promise<string>;
  scope: string;
  uid: string;
  actor(participating?: boolean): string;
}
const Context = createContext<MessagingAPI | null>(null);

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const { mode, profile, runtimeConfig, serviceAvailable, accountModeration, blockedIds } = useCommunity();
  const { connections, loading, error } = useInvitations();
  const uid = profile?.id || '';
  const eligible = mode === 'cloud' && validMessagingUid(uid) && auth.currentUser?.uid === uid && auth.currentUser.emailVerified
    && !!profile?.adultConfirmed && profile.acceptedTermsVersion === TERMS_VERSION && !!profile.acceptedTermsAt
    && !!profile.city.trim() && !!profile.country.trim() && serviceAvailable && accountModeration?.status !== 'suspended';
  const pilotPeers = runtimeConfig.serviceStatus === 'pilot' ? runtimeConfig.pilotUserIds || [] : null;
  const available = connections.filter(connection => connection.ownerId === uid && validMessagingUid(connection.peerId) && !blockedIds.includes(connection.peerId)
    && (pilotPeers === null || pilotPeers.includes(connection.peerId)));
  const scope = `${mode}:${uid}:${eligible}:${available.map(item => item.peerId).sort().join(',')}:${blockedIds.slice().sort().join(',')}:${pilotPeers?.slice().sort().join(',') || ''}`;
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const conversations: MessagingConversation[] = eligible ? available.map(connection => ({ id: conversationIdFor(uid, connection.peerId), participantIds: conversationParticipants(conversationIdFor(uid, connection.peerId))!, createdAt: connection.createdAt })) : [];
  const [previewLimit, setPreviewLimit] = useState(20);
  const previewScope = `${scope}:${previewLimit}`;
  const latestPreviewScope = useRef(previewScope); latestPreviewScope.current = previewScope;
  const [previewState, setPreviewState] = useState<{ scope: string; values: Record<string, ConversationPreview> }>({ scope: previewScope, values: {} });
  const [readState, setReadState] = useState<{ scope: string; values: Record<string, MessageRead>; ready: boolean; error: string }>({ scope, values: {}, ready: false, error: '' });
  const marking = useRef(new Map<string, string>());
  useEffect(() => { setPreviewLimit(20); marking.current.clear(); }, [uid]);
  useEffect(() => {
    let alive = true;
    const current = () => alive && scopeRef.current === scope && auth.currentUser?.uid === uid;
    setReadState({ scope, values: {}, ready: false, error: '' });
    if (!eligible) return () => { alive = false; };
    const stop = onSnapshot(query(collection(db, 'communityMessageReads'), where('userId', '==', uid)), snapshot => {
      if (!current()) return;
      const values: Record<string, MessageRead> = {};
      snapshot.docs.forEach(record => { const read = normalizeMessageRead(record.data(), uid); if (read) values[read.conversationId] = read; });
      setReadState({ scope, values, ready: true, error: '' });
    }, () => { if (current()) setReadState({ scope, values: {}, ready: false, error: 'No se puede comprobar el estado de lectura. Los mensajes siguen disponibles.' }); });
    return () => { alive = false; stop(); };
  }, [scope, eligible, uid]);
  useEffect(() => {
    let alive = true;
    const current = () => alive && latestPreviewScope.current === previewScope && scopeRef.current === scope && auth.currentUser?.uid === uid;
    const stops: Unsubscribe[] = [];
    setPreviewState({ scope: previewScope, values: {} });
    if (!eligible) return () => { alive = false; };
    const put = (id: string, preview: ConversationPreview) => { if (current()) setPreviewState(previous => ({ scope: previewScope, values: { ...(previous.scope === previewScope ? previous.values : {}), [id]: preview } })); };
    conversations.slice(0, previewLimit).forEach(conversation => {
      put(conversation.id, { latest: null, loading: true, error: false });
      let messagesStop: Unsubscribe | undefined;
      const fail = () => { messagesStop?.(); messagesStop = undefined; put(conversation.id, { latest: null, loading: false, error: true }); };
      stops.push(onSnapshot(doc(db, 'communityConversations', conversation.id), snapshot => {
        if (!current()) return;
        if (!snapshot.exists()) { messagesStop?.(); messagesStop = undefined; put(conversation.id, { latest: null, loading: false, error: false }); return; }
        if (!normalizeConversation(snapshot.data(), conversation.id)) { fail(); return; }
        if (messagesStop) return;
        messagesStop = onSnapshot(query(collection(db, 'communityConversations', conversation.id, 'messages'), orderBy('createdAt', 'desc'), orderBy('__name__', 'desc'), limit(1)), page => {
          if (!current() || page.metadata.hasPendingWrites) return;
          const latest = page.docs[0];
          put(conversation.id, { latest: latest ? normalizeMessage(latest.data(), latest.id, conversation.id) : null, loading: false, error: false });
        }, fail);
      }, fail));
      stops.push(() => messagesStop?.());
    });
    return () => { alive = false; stops.forEach(stop => stop()); };
  }, [previewScope, scope, eligible, uid]);
  const previews = previewState.scope === previewScope ? previewState.values : {};
  const reads = readState.scope === scope ? readState.values : {};
  const readsError = readState.scope === scope ? readState.error : '';
  const unreadCount = readsError || readState.scope !== scope || !readState.ready ? 0 : Object.values(previews).filter(preview => preview.latest && preview.latest.senderId !== uid && messageIsAfterRead(preview.latest, reads[preview.latest.conversationId])).length;
  async function markRead(conversationId: string, message: MessagingMessage) {
    actor();
    if (!conversations.some(item => item.id === conversationId) || message.conversationId !== conversationId) throw new MessagingError('unavailable');
    const cursor = `${message.createdAt}:${message.id}`;
    if (marking.current.get(conversationId) === cursor || !messageIsAfterRead(message, reads[conversationId])) return;
    marking.current.set(conversationId, cursor);
    try {
      await runTransaction(db, async transaction => {
        const target = doc(db, 'communityMessageReads', `${uid}:${conversationId}`);
        const record = await transaction.get(target); actor();
        const previous = record.exists() ? normalizeMessageRead(record.data(), uid) : null;
        if (previous && !messageIsAfterRead(message, previous)) return;
        transaction.set(target, { userId: uid, conversationId, lastReadAt: Timestamp.fromDate(new Date(message.createdAt)), lastReadMessageId: message.id, updatedAt: serverTimestamp() });
      });
    } catch (error) { marking.current.delete(conversationId); throw error; }
  }
  function actor(participating = true) {
    if (mode !== 'cloud' || !uid || auth.currentUser?.uid !== uid || scopeRef.current !== scope) throw new MessagingError('signin-required');
    if (participating && !eligible) throw new MessagingError('unavailable');
    return uid;
  }
  async function openConversation(peerId: string) {
    actor();
    if (!available.some(item => item.peerId === peerId)) throw new MessagingError('unavailable');
    const id = conversationIdFor(uid, peerId);
    await runTransaction(db, async transaction => {
      const target = doc(db, 'communityConversations', id);
      const existing = await transaction.get(target); actor();
      if (existing.exists()) {
        if (!normalizeConversation(existing.data(), id)) throw new MessagingError('unavailable');
      } else transaction.set(target, { id, participantIds: conversationParticipants(id), createdAt: serverTimestamp() });
    });
    actor(); return id;
  }
  return <Context.Provider value={{ conversations, previews, reads, unreadCount, readsError, previewsHasMore: conversations.length > previewLimit, loadMorePreviews: () => setPreviewLimit(value => value + 20), markRead, readsReady: readState.scope === scope && readState.ready, loading, error, eligible, openConversation, scope, uid, actor }}>{children}</Context.Provider>;
}

export function useMessaging(): MessagingAPI {
  const api = useContext(Context); if (!api) throw new Error('MessagingProvider requerido.'); return api;
}

interface ThreadState {
  scope: string;
  conversation: MessagingConversation | null;
  messages: MessagingMessage[];
  loading: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  error: string;
}
const empty = (scope: string, loading = false): ThreadState => ({ scope, conversation: null, messages: [], loading, loadingOlder: false, hasMore: false, error: '' });

export function useConversation(conversationId = ''): ConversationState {
  const api = useMessaging();
  const allowed = api.eligible && api.conversations.some(item => item.id === conversationId);
  const scope = `${api.scope}:${conversationId}:${allowed}`;
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const wantedPages = useRef(1);
  const requestNextPage = useRef<(() => Promise<void>) | null>(null);
  const [state, setState] = useState<ThreadState>(() => empty(scope, allowed));
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  useEffect(() => {
    let active = true;
    const current = () => active && scopeRef.current === scope && auth.currentUser?.uid === api.uid;
    const stops: Unsubscribe[] = [];
    const pageStops = new Map<number, Unsubscribe>();
    const generations = new Map<number, number>();
    const pages = new Map<number, QueryDocumentSnapshot<DocumentData>[]>();
    const cursors = new Map<number, string>();
    let loadingResolver: (() => void) | null = null;
    let loadedConversation: MessagingConversation | null = null;
    wantedPages.current = 1;
    setState(empty(scope, allowed));

    const finishPending = () => { loadingResolver?.(); loadingResolver = null; };
    const stopPagesFrom = (index: number) => {
      for (const [page, stop] of pageStops) if (page >= index) { stop(); pageStops.delete(page); generations.set(page, (generations.get(page) || 0) + 1); }
      for (const page of pages.keys()) if (page >= index) { pages.delete(page); cursors.delete(page); }
    };
    const failed = (failure: unknown) => {
      if (!current()) return;
      stopPagesFrom(0); finishPending(); loadedConversation = null;
      setState({ ...empty(scope), error: safeMessagingError(failure) });
      // A definitive read failure is terminal for this subscription scope.
      // Late metadata/cache callbacks must not restart a denied thread.
      active = false; stops.forEach(stop => stop());
    };
    function publish() {
      if (!current()) return;
      const ordered = [...pages.entries()].sort(([a], [b]) => a - b);
      const messages = mergeMessagePages(...ordered.map(([, records]) => records.map(record => normalizeMessage(record.data(), record.id, conversationId)).filter((message): message is MessagingMessage => !!message)));
      const last = ordered.at(-1);
      const waiting = !!last && last[0] + 1 < wantedPages.current && last[1].length === MESSAGE_PAGE_SIZE;
      setState({ scope, conversation: loadedConversation, messages, loading: !pages.has(0), loadingOlder: waiting, hasMore: !!last && last[1].length === MESSAGE_PAGE_SIZE, error: '' });
      if (!waiting && pages.has(0)) finishPending();
    }
    function subscribePage(index: number, cursor?: QueryDocumentSnapshot<DocumentData>) {
      if (!current() || index >= wantedPages.current) return;
      const generation = (generations.get(index) || 0) + 1; generations.set(index, generation);
      const base = collection(db, 'communityConversations', conversationId, 'messages');
      const ordered = [orderBy('createdAt', 'desc'), orderBy('__name__', 'desc')];
      const target = cursor ? query(base, ...ordered, startAfter(cursor), limit(MESSAGE_PAGE_SIZE)) : query(base, ...ordered, limit(MESSAGE_PAGE_SIZE));
      const stop = onSnapshot(target, snapshot => {
        if (!current() || generations.get(index) !== generation) return;
        const records = snapshot.docs;
        // Uncommitted local writes have no authoritative timestamp yet. They
        // remain in the query, but are displayed only after server acceptance.
        pages.set(index, records);
        const last = records.at(-1);
        const boundary = last ? `${last.id}:${last.data().createdAt?.toMillis?.() || ''}` : '';
        if (cursors.get(index) !== boundary) {
          cursors.set(index, boundary); stopPagesFrom(index + 1);
          if (last && records.length === MESSAGE_PAGE_SIZE) subscribePage(index + 1, last);
        }
        publish();
      }, failure => {
        if (current() && generations.get(index) === generation) failed(failure);
      });
      pageStops.set(index, stop);
    }
    requestNextPage.current = () => {
      if (!current() || loadingResolver) return Promise.resolve();
      const index = wantedPages.current;
      const last = pages.get(index - 1);
      if (!last || last.length < MESSAGE_PAGE_SIZE) return Promise.resolve();
      wantedPages.current += 1;
      const promise = new Promise<void>(resolve => { loadingResolver = resolve; });
      setState(old => old.scope === scope ? { ...old, loadingOlder: true } : old);
      subscribePage(index, last.at(-1)); return promise;
    };
    if (allowed && conversationParticipants(conversationId)) {
      stops.push(onSnapshot(doc(db, 'communityConversations', conversationId), snapshot => {
        if (!current()) return;
        const conversation = snapshot.exists() ? normalizeConversation(snapshot.data(), conversationId) : null;
        if (!conversation) { failed(new MessagingError('unavailable')); return; }
        loadedConversation = conversation;
        if (!pageStops.has(0)) subscribePage(0);
        else publish();
      }, failed));
    }
    return () => { active = false; requestNextPage.current = null; finishPending(); stops.forEach(stop => stop()); stopPagesFrom(0); };
  }, [scope, allowed, conversationId, api.uid]);

  const visible = state.scope === scope ? state : empty(scope, allowed);
  const canSend = allowed && online && !!visible.conversation && !visible.loading && !visible.error;
  const loadOlder = useCallback(() => requestNextPage.current?.() || Promise.resolve(), []);
  async function sendMessage(raw: string) {
    api.actor();
    if (!canSend || scopeRef.current !== scope) throw new MessagingError(online ? 'unavailable' : 'offline');
    const text = messageText(raw);
    const target = doc(collection(db, 'communityConversations', conversationId, 'messages'));
    await setDoc(target, { id: target.id, senderId: api.uid, text, createdAt: serverTimestamp() });
  }
  async function deleteMessage(id: string) {
    api.actor(false);
    if (!conversationParticipants(conversationId)?.includes(api.uid) || !/^[A-Za-z0-9]{20}$/.test(id)) throw new MessagingError('unavailable');
    // Rules allow withdrawal by the immutable sender even after disconnection
    // or service pause. They never permit deleting somebody else's text.
    await deleteDoc(doc(db, 'communityConversations', conversationId, 'messages', id));
  }
  return { ...visible, canSend, loadOlder, sendMessage, deleteMessage };
}
