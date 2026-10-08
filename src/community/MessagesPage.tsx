import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowRight, Ban, ChevronRight, LoaderCircle, LockKeyhole, MessageCircle, Search, Send, ShieldCheck, Trash2, Users, WifiOff } from 'lucide-react';
import { useCommunity, usePublicProfile } from './CommunityContext';
import { useInvitations } from './InvitationsContext';
import { useConversation, useMessaging } from './MessagingContext';
import { conversationParticipants, MESSAGE_MAX_LENGTH, safeMessagingError } from './messagingLogic';
import type { MessagingConversation, MessagingMessage } from './messagingTypes';
import './messages.css';

const dayFormatter = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });

function validDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
function dayLabel(value: string): string {
  const date = validDate(value);
  if (!date) return 'Fecha pendiente';
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Hoy';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  return dayFormatter.format(date);
}
function dayKey(value: string): string { return validDate(value)?.toDateString() || ''; }
function peerOf(conversation: MessagingConversation, uid: string): string { return conversation.participantIds.find(id => id !== uid) || ''; }

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return online;
}

function MessagesStatus({ title, children, login = false }: { title: string; children: React.ReactNode; login?: boolean }) {
  return <section className="cm-page"><header className="cm-page-heading"><div><p className="c-eyebrow">TU GENTE, MÁS CERCA</p><h1>Mensajes</h1></div></header><div className="cm-empty cm-status"><span className="cm-empty-icon"><LockKeyhole size={28} aria-hidden="true" /></span><h2>{title}</h2><p>{children}</p><Link className="c-button" to={login ? '/profile?returnTo=%2Fmessages' : '/profile'}>{login ? 'Entrar a mi cuenta' : 'Mi cuenta'}<ArrowRight size={17} aria-hidden="true" /></Link></div></section>;
}

function ContactRow({ peerId, selected, onOpen, opening, disabled, hidden }: { peerId: string; selected?: boolean; onOpen: (id: string) => void; opening?: boolean; disabled?: boolean; hidden: boolean }) {
  const person = usePublicProfile(peerId);
  const label = person?.name || 'Conexión de LaCantera';
  return <li hidden={hidden}><button className={`cm-contact ${selected ? 'is-current' : ''}`} type="button" disabled={disabled || opening} aria-current={selected ? 'page' : undefined} aria-label={`Escribir a ${label}`} onClick={() => onOpen(peerId)}><span className="cm-avatar" aria-hidden="true">{person?.name.slice(0, 1).toLocaleUpperCase('es') || <Users size={18} />}</span><span className="cm-contact-copy"><strong>{label}{person?.verification === 'verified' ? <ShieldCheck size={14} aria-label="Cuenta verificada" /> : null}</strong><small>Mensajes privados</small></span>{opening ? <LoaderCircle size={17} className="cm-spinning" aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}</button></li>;
}

function ConversationSidebar({ selectedId, online }: { selectedId?: string; online: boolean }) {
  const community = useCommunity(); const messaging = useMessaging(); const navigate = useNavigate();
  const [search, setSearch] = useState(''); const [opening, setOpening] = useState(''); const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const uid = community.profile!.id;
  const matches = (id: string) => !search.trim() || (community.publicProfiles[id]?.name || '').toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es'));
  const conversations = messaging.conversations;
  const matchedCount = conversations.filter(item => matches(peerOf(item, uid))).length;
  const searchPending = !!search.trim() && conversations.some(item => { const state = community.publicProfileStates[peerOf(item, uid)]; return !state || state === 'loading'; });
  async function open(peerId: string) {
    if (opening || !online) return;
    setOpening(peerId); setError('');
    try { const id = await messaging.openConversation(peerId); if (mounted.current) navigate(`/messages/${encodeURIComponent(id)}`); }
    catch (err) { if (mounted.current) setError(safeMessagingError(err)); }
    finally { if (mounted.current) setOpening(''); }
  }
  return <aside className="cm-sidebar" aria-label="Contactos con quienes puedes conversar"><header className="cm-sidebar-heading"><h2>Tus conexiones</h2><span><LockKeyhole size={13} aria-hidden="true" />Privada</span></header><label className="cm-search"><Search size={17} aria-hidden="true" /><span className="cm-sr-only">Buscar en tus contactos cargados</span><input type="search" placeholder="Buscar un contacto" value={search} onChange={event => setSearch(event.target.value)} maxLength={100} /></label>
    {messaging.loading ? <p className="cm-list-note" role="status">Cargando tus contactos…</p> : null}
    {messaging.error || error ? <p className="c-error" role="alert">{error || messaging.error}</p> : null}
    <div className="cm-sidebar-scroll"><h3 className="cm-list-label">Escribir a una conexión</h3><ul className="cm-contact-list">{conversations.map(item => <ContactRow key={item.id} peerId={peerOf(item, uid)} selected={item.id === selectedId} opening={opening === peerOf(item, uid)} hidden={!matches(peerOf(item, uid))} disabled={!!opening || !online || !messaging.eligible} onOpen={id => void open(id)} />)}</ul>{!matchedCount && !messaging.loading ? <p className="cm-list-note" role="status">{searchPending ? 'Buscando en los perfiles que se están cargando…' : search.trim() ? 'No hay contactos con ese nombre entre los cargados.' : 'Acepta una invitación para conectar con alguien y escribirle.'}</p> : null}
    </div><Link className="cm-connect-link" to="/connect"><Users size={17} aria-hidden="true" />Gestionar conexiones<ArrowRight size={16} aria-hidden="true" /></Link>
  </aside>;
}

function MessageBubble({ message, mine, onDelete, deleting }: { message: MessagingMessage; mine: boolean; onDelete: (id: string) => void; deleting: boolean }) {
  const time = validDate(message.createdAt);
  return <div className={`cm-message-row ${mine ? 'is-mine' : ''}`}><article className={`cm-bubble ${message.deleted ? 'is-deleted' : ''}`} aria-label={mine ? 'Tu mensaje' : 'Mensaje de tu contacto'}><p>{message.deleted ? 'Mensaje eliminado por su autor.' : message.text}</p><footer>{time ? <time dateTime={message.createdAt} title={dayFormatter.format(time)}>{timeFormatter.format(time)}</time> : <span>Guardando…</span>}{mine && !message.deleted ? <button type="button" className="cm-delete-message" disabled={deleting} onClick={() => onDelete(message.id)} aria-label="Eliminar este mensaje" title="Eliminar mensaje"><Trash2 size={13} aria-hidden="true" /></button> : null}</footer></article></div>;
}

function ConversationThread({ conversationId, online }: { conversationId: string; online: boolean }) {
  const community = useCommunity(); const messaging = useMessaging(); const thread = useConversation(conversationId);
  const conversation = thread.conversation || messaging.conversations.find(item => item.id === conversationId);
  const pair = conversationParticipants(conversationId);
  const peerId = conversation ? peerOf(conversation, community.profile!.id) : pair?.includes(community.profile!.id) ? pair.find(id => id !== community.profile!.id) || '' : '';
  const person = usePublicProfile(peerId);
  const name = person?.name || 'Tu conexión';
  const blocked = community.blockedIds.includes(peerId);
  const [draft, setDraft] = useState(''); const [sending, setSending] = useState(false); const [deleting, setDeleting] = useState(''); const [error, setError] = useState(''); const [below, setBelow] = useState(false); const [status, setStatus] = useState({ message: '', sequence: 0 });
  const viewport = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true); const initialized = useRef(false); const previousLast = useRef<{ id: string; createdAt: string } | null>(null);
  const olderAnchor = useRef<{ height: number; top: number } | null>(null); const mounted = useRef(true);
  const [olderSettled, setOlderSettled] = useState(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const messages = thread.messages;
  const uid = community.profile!.id;
  const lastMessage = messages.at(-1);
  const lastId = lastMessage?.id || '';
  const canSend = messaging.eligible && thread.canSend && online && !blocked && !!conversation && !thread.error;
  function scrollToLatest() { const element = viewport.current; if (!element) return; element.scrollTop = element.scrollHeight; atBottom.current = true; setBelow(false); }
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    if (thread.loading || thread.error || !conversation) { initialized.current = false; previousLast.current = null; setBelow(false); return; }
    const previous = previousLast.current;
    const appended = !!lastMessage && (!previous || lastMessage.createdAt > previous.createdAt || lastMessage.createdAt === previous.createdAt && lastMessage.id.localeCompare(previous.id) > 0);
    if (initialized.current && appended) {
      const incoming = messages.filter(message => message.senderId !== uid && (!previous || message.createdAt > previous.createdAt || message.createdAt === previous.createdAt && message.id.localeCompare(previous.id) > 0)).length;
      if (incoming) setStatus(current => ({ sequence: current.sequence + 1, message: incoming === 1 ? `Nuevo mensaje de ${name}.` : `${incoming} mensajes nuevos de ${name}.` }));
    }
    if (olderAnchor.current) { const anchor = olderAnchor.current; element.scrollTop = anchor.top + element.scrollHeight - anchor.height; olderAnchor.current = null; }
    else if (!initialized.current || appended && atBottom.current) { element.scrollTop = element.scrollHeight; setBelow(false); }
    else if (appended) setBelow(true);
    initialized.current = true; previousLast.current = lastMessage ? { id: lastMessage.id, createdAt: lastMessage.createdAt } : null;
  }, [messages, lastId, thread.loading, thread.error, !!conversation, olderSettled, uid, name]);
  async function older() {
    if (thread.loadingOlder) return;
    const element = viewport.current;
    if (element) olderAnchor.current = { height: element.scrollHeight, top: element.scrollTop };
    setError('');
    try { await thread.loadOlder(); }
    catch (err) { if (mounted.current) setError(safeMessagingError(err)); }
    finally { if (mounted.current) setOlderSettled(value => value + 1); }
  }
  async function send() {
    const text = draft.trim();
    if (sending || !canSend || !text || text.length > MESSAGE_MAX_LENGTH) return;
    setSending(true); setError(''); setStatus(current => ({ sequence: current.sequence + 1, message: 'Enviando mensaje…' }));
    try {
      await thread.sendMessage(text);
      if (mounted.current) { setDraft(current => current.trim() === text ? '' : current); scrollToLatest(); setStatus(current => ({ sequence: current.sequence + 1, message: 'Mensaje enviado.' })); }
    } catch (err) { if (mounted.current) { setError(safeMessagingError(err)); setStatus(current => ({ sequence: current.sequence + 1, message: '' })); } }
    finally { if (mounted.current) setSending(false); }
  }
  async function remove(id: string) {
    if (deleting || !online || !window.confirm('¿Eliminar este mensaje? Dejará de mostrarse para ambos participantes.')) return;
    setDeleting(id); setError('');
    try { await thread.deleteMessage(id); }
    catch (err) { if (mounted.current) setError(safeMessagingError(err)); }
    finally { if (mounted.current) setDeleting(''); }
  }
  return <section className="cm-thread" aria-label="Conversación privada"><header className="cm-thread-heading"><Link className="cm-icon-button cm-thread-back" to="/messages" aria-label="Volver a mensajes"><ArrowLeft size={21} aria-hidden="true" /></Link><span className="cm-avatar" aria-hidden="true">{person?.name.slice(0, 1).toLocaleUpperCase('es') || <Users size={19} />}</span><div className="cm-thread-person"><h2>{name}</h2><p><LockKeyhole size={12} aria-hidden="true" />Conversación entre dos cuentas</p></div>{peerId ? <Link className="cm-profile-link" to={`/people/${encodeURIComponent(peerId)}`}>Ver perfil<ChevronRight size={15} aria-hidden="true" /></Link> : null}</header>
    {blocked ? <p className="cm-notice" role="status"><Ban size={17} aria-hidden="true" />Has bloqueado esta cuenta. Puedes gestionar el bloqueo desde su perfil.</p> : null}
    <div className="cm-message-viewport" ref={viewport} tabIndex={0} aria-label="Historial de mensajes" aria-busy={thread.loading || thread.loadingOlder} onScroll={() => { const element = viewport.current; if (!element) return; atBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 70; if (atBottom.current) setBelow(false); }}>
      {thread.loading ? <div className="cm-thread-state" role="status"><LoaderCircle size={24} className="cm-spinning" aria-hidden="true" /><p>Cargando conversación…</p></div> : thread.error ? <div className="cm-thread-state" role="alert"><LockKeyhole size={26} aria-hidden="true" /><h3>No se puede abrir esta conversación</h3><p>{thread.error}</p><Link className="c-button secondary" to="/messages">Volver a mi bandeja</Link></div> : !conversation ? <div className="cm-thread-state" role="status"><MessageCircle size={27} aria-hidden="true" /><h3>Conversación no disponible</h3><p>Comprueba el enlace o inicia una conversación desde tus conexiones.</p><Link className="c-button secondary" to="/connect">Mis conexiones</Link></div> : <>
        {thread.hasMore ? <button type="button" className="cm-older" disabled={thread.loadingOlder} onClick={() => void older()}>{thread.loadingOlder ? 'Cargando…' : 'Cargar mensajes anteriores'}</button> : null}
        {!messages.length ? <div className="cm-thread-state cm-first-message"><MessageCircle size={29} aria-hidden="true" /><h3>El fútbol también empieza hablando</h3><p>Organiza el próximo partido o saluda a tu conexión. Escribe tu primer mensaje.</p></div> : messages.map((message, index) => <Fragment key={message.id}>{index === 0 || dayKey(message.createdAt) !== dayKey(messages[index - 1].createdAt) ? <div className="cm-date-divider"><span>{dayLabel(message.createdAt)}</span></div> : null}<MessageBubble message={message} mine={message.senderId === community.profile!.id} deleting={deleting === message.id} onDelete={id => void remove(id)} /></Fragment>)}
      </>}
    </div>
    {below ? <button type="button" className="cm-new-messages" onClick={scrollToLatest}><ArrowDown size={15} aria-hidden="true" />Ir a los últimos mensajes</button> : null}
    {error ? <p className="c-error cm-send-error" role="alert">{error}</p> : null}
    {conversation && !thread.loading && !thread.error && !blocked && !thread.canSend ? <p className="cm-notice" role="status"><LockKeyhole size={16} aria-hidden="true" />No puedes enviar mensajes a esta cuenta. Ambos debéis conservar la conexión y tener una cuenta habilitada.</p> : null}
    <p className="cm-sr-only" role="status" aria-live="polite" aria-atomic="true"><span key={status.sequence}>{below ? `${status.message || 'Hay mensajes nuevos.'} Puedes ir al final de la conversación.` : status.message}</span></p>
    <form className="cm-composer" onSubmit={event => { event.preventDefault(); void send(); }}><label htmlFor="cm-message"><span className="cm-sr-only">Mensaje a {name}</span><textarea id="cm-message" value={draft} onChange={event => setDraft(event.target.value)} maxLength={MESSAGE_MAX_LENGTH} rows={2} placeholder={canSend ? 'Escribe un mensaje…' : 'Envío no disponible'} disabled={!canSend} onKeyDown={event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} aria-describedby="cm-composer-note" /></label><button className="cm-send" type="submit" disabled={sending || !canSend || !draft.trim()} aria-label={sending ? 'Enviando mensaje' : 'Enviar mensaje'} title="Enviar mensaje">{sending ? <LoaderCircle size={20} className="cm-spinning" aria-hidden="true" /> : <Send size={20} aria-hidden="true" />}</button><div className="cm-composer-note" id="cm-composer-note"><span>{sending ? 'Enviando… Conservamos el texto hasta confirmarlo.' : 'Solo texto · Ctrl/⌘ + Intro para enviar'}</span><span>{draft.length}/{MESSAGE_MAX_LENGTH}</span></div></form>
  </section>;
}

function MessagesContent() {
  const { conversationId } = useParams(); const community = useCommunity(); const messaging = useMessaging(); const invitations = useInvitations(); const online = useOnline();
  if (community.loading && !community.profile) return <MessagesStatus title="Cargando tu cuenta…">Estamos comprobando tu sesión.</MessagesStatus>;
  if (community.mode === 'demo') return <MessagesStatus title="Mensajes entre cuentas reales">La demostración no envía ni guarda mensajes. Esta función requiere una cuenta real y una conexión aceptada.</MessagesStatus>;
  if (community.runtimeConfig.serviceStatus !== 'open') return <MessagesStatus title={community.runtimeConfig.serviceStatus === 'paused' ? 'Mensajes temporalmente pausados' : 'La comunidad está en preparación'}>Los mensajes estarán disponibles cuando el servicio esté abierto. Puedes consultar tu cuenta y tus derechos.</MessagesStatus>;
  if (!community.profile) return <MessagesStatus title="Habla con tus conexiones" login>Entra con tu propia cuenta. Solo tú y la otra persona podréis consultar vuestra conversación.</MessagesStatus>;
  if (community.accountModeration?.status === 'suspended') return <MessagesStatus title="Tu cuenta tiene el acceso limitado">Consulta el estado de tu cuenta o contacta con el administrador desde tu perfil.</MessagesStatus>;
  if (!invitations.emailVerified) return <MessagesStatus title="Verifica tu correo">Verifica el correo de tu cuenta antes de enviar o consultar mensajes.</MessagesStatus>;
  if (!messaging.eligible) return <MessagesStatus title="Completa tu cuenta para conversar">Completa tu perfil, ubicación y aceptación de los términos para escribir a tus conexiones.</MessagesStatus>;
  return <section className={`cm-page ${conversationId ? 'has-conversation' : ''}`}><header className="cm-page-heading"><div><p className="c-eyebrow">TU GENTE, MÁS CERCA</p><h1>Mensajes</h1><p>Coordina el próximo encuentro con tus conexiones.</p></div><Link className="c-button secondary" to="/connect"><Users size={17} aria-hidden="true" />Conexiones</Link></header>{!online ? <p className="cm-notice cm-offline" role="status"><WifiOff size={18} aria-hidden="true" />Sin conexión. Los mensajes se actualizarán al recuperar la conexión; el envío queda pausado.</p> : null}<div className="cm-workspace"><ConversationSidebar selectedId={conversationId} online={online} />{conversationId ? <ConversationThread key={conversationId} conversationId={conversationId} online={online} /> : <div className="cm-welcome"><span className="cm-empty-icon"><MessageCircle size={32} aria-hidden="true" /></span><p className="c-eyebrow">UNA CONVERSACIÓN, UN PLAN</p><h2>Tu próximo partido empieza aquí.</h2><p>Elige una conversación o escribe a una de tus conexiones. Los mensajes se guardan entre las dos cuentas.</p><span className="cm-privacy-note"><LockKeyhole size={15} aria-hidden="true" />Los mensajes no aparecen en el feed.</span></div>}</div></section>;
}

export default function MessagesPage() {
  const community = useCommunity();
  return <MessagesContent key={`${community.mode}:${community.profile?.id || 'guest'}`} />;
}
