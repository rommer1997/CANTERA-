import { profileInitials } from './experience';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronRight, MapPin, QrCode, Search, CheckCircle2, KeyRound, LockKeyhole, MessageCircle, ScanLine, UserRound, Users } from 'lucide-react';
import { useCommunity } from './CommunityContext';
import { useInvitations } from './InvitationsContext';
import { useMessaging } from './MessagingContext';
import { safeMessagingError } from './messagingLogic';
import { InvitationDialog } from './InvitationDialog';
import { formatInvitationCode, formatInvitationCountdown, invitationExpiresAt, invitationSecondsRemaining, normalizeInvitationCode, safeInvitationError } from './invitations';
import type { CommunityConnection, CommunityInvitation } from './invitationTypes';
import './invitations.css';

const QrScanner = lazy(() => import('./QrScanner'));
const invitationReadTimeout = 20000;

function ConnectionCard({ connection }: { connection: CommunityConnection }) {
  const api = useCommunity(); const invitations = useInvitations(); const messaging = useMessaging(); const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => api.watchPublicProfile(connection.peerId), [connection.peerId, api.watchPublicProfile]);
  const peer = api.publicProfiles[connection.peerId];
  async function message() {
    if (busy) return;
    setBusy(true); setError('');
    try { const id = await messaging.openConversation(connection.peerId); navigate(`/messages/${encodeURIComponent(id)}`); }
    catch (err) { setError(safeMessagingError(err)); }
    finally { setBusy(false); }
  }
  return <article className="ci-person-card">
    <div className="ci-person-main"><span className="c-avatar" aria-hidden="true">{peer?.name ? profileInitials(peer.name) : <UserRound size={20} />}</span><div><h3>{peer?.name || 'Conexión de LaCantera'}</h3><p>{peer ? <><MapPin size={15} />{peer.city}</> : api.publicProfileStates[connection.peerId] === 'loading' ? 'Cargando perfil…' : 'El perfil público no está disponible.'}</p></div></div>
    <div className="ci-person-shortcuts">{messaging.eligible && !api.blockedIds.includes(connection.peerId) ? <button className="ci-icon-action" type="button" disabled={busy} onClick={() => void message()} aria-label={`Enviar mensaje a ${peer?.name || 'tu conexión'}`}><MessageCircle size={23} /></button> : null}{peer ? <Link className="ci-icon-action" to={`/people/${connection.peerId}`} aria-label={`Ver perfil de ${peer.name}`}><ChevronRight size={21} /></Link> : null}</div>
    <details className="ci-connection-options"><summary>Opciones de conexión</summary><div className="ci-person-actions">{confirm ? <><p className="c-small">La conexión se eliminará para ambos. También dejaréis de tener acceso a la conversación.</p><button className="ci-revoke" disabled={busy} onClick={() => { setBusy(true); setError(''); void invitations.removeConnection(connection.peerId).catch(err => setError(safeInvitationError(err))).finally(() => setBusy(false)); }}>{busy ? 'Eliminando…' : 'Confirmar desconexión'}</button><button className="ci-text-button" disabled={busy} onClick={() => setConfirm(false)}>Conservar conexión</button></> : <button className="ci-text-button" disabled={busy} onClick={() => setConfirm(true)}>Desconectar</button>}</div></details>{error ? <p className="c-error" role="alert">{error}</p> : null}
  </article>;
}

function InvitationAcceptance({ rawCode }: { rawCode: string }) {
  const community = useCommunity(); const api = useInvitations(); const navigate = useNavigate();
  const code = normalizeInvitationCode(rawCode); const returnTo = code ? `/invite/${code}` : '/connect';
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const scope = `${community.mode}:${community.profile?.id || ''}:${code || ''}:${api.eligible}:${api.emailVerified}:${community.runtimeConfig.serviceStatus}:${community.serviceAvailable}:${lookupAttempt}`;
  const latestScope = useRef(scope); latestScope.current = scope;
  const currentApi = useRef(api); currentApi.current = api;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [state, setState] = useState<{ scope: string; invitation: CommunityInvitation | null; loading: boolean; error: string }>({ scope, invitation: null, loading: true, error: '' });
  const [busy, setBusy] = useState(false); const [now, setNow] = useState(Date.now());
  const [participantName, setParticipantName] = useState(community.profile?.name || '');
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    let active = true; setBusy(false); setState({ scope, invitation: null, loading: true, error: '' });
    if (!code || !api.eligible || !api.emailVerified || !community.serviceAvailable) { setState({ scope, invitation: null, loading: false, error: !code ? 'El código no es válido. Comprueba el enlace o pide uno nuevo.' : '' }); return () => { active = false; }; }
    const timer = window.setTimeout(() => {
      if (!active || latestScope.current !== scope) return;
      active = false;
      setState({ scope, invitation: null, loading: false, error: 'La comprobación de la invitación está tardando demasiado. Revisa tu conexión y vuelve a intentarlo.' });
    }, invitationReadTimeout);
    void currentApi.current.lookupInvitation(code).then(invitation => { if (active && latestScope.current === scope) setState({ scope, invitation, loading: false, error: '' }); }).catch(err => { if (active && latestScope.current === scope) setState({ scope, invitation: null, loading: false, error: safeInvitationError(err) }); }).finally(() => window.clearTimeout(timer));
    return () => { active = false; window.clearTimeout(timer); };
  }, [scope, code, api.eligible, api.emailVerified, community.runtimeConfig.serviceStatus, community.serviceAvailable]);
  const current = state.scope === scope ? state : { invitation: null, loading: true, error: '' };
  const invitation = current.invitation;
  const senderScope = `${scope}:${invitation?.ownerId || ''}`;
  const [senderAttempt, setSenderAttempt] = useState(0);
  const senderRequestScope = `${senderScope}:${senderAttempt}`;
  const [senderWatch, setSenderWatch] = useState('');
  const [senderTimedOut, setSenderTimedOut] = useState('');
  useEffect(() => {
    setSenderWatch('');
    if (!invitation?.ownerId) return;
    community.retryPublicProfile(invitation.ownerId);
    const stop = community.watchPublicProfile(invitation.ownerId);
    setSenderWatch(senderRequestScope);
    return stop;
  }, [senderRequestScope, community.watchPublicProfile, community.retryPublicProfile]);
  const senderProfileState = senderWatch !== senderRequestScope ? 'loading' : community.publicProfileStates[invitation?.ownerId || ''] || 'loading';
  useEffect(() => {
    if (!invitation || senderWatch !== senderRequestScope || senderProfileState !== 'loading') return;
    const timer = window.setTimeout(() => setSenderTimedOut(senderRequestScope), invitationReadTimeout);
    return () => window.clearTimeout(timer);
  }, [senderRequestScope, senderWatch, senderProfileState, invitation]);
  const senderState = senderTimedOut === senderRequestScope && senderProfileState === 'loading' ? 'error' : senderProfileState;
  const cachedSender = invitation ? community.publicProfiles[invitation.ownerId] : null;
  const sender = senderState === 'ready' && cachedSender?.id === invitation?.ownerId && cachedSender.name.trim() ? cachedSender : null;
  const latestSender = useRef({ scope: senderScope, identified: Boolean(sender) });
  latestSender.current = { scope: senderScope, identified: Boolean(sender) };
  const remaining = invitation ? invitationSecondsRemaining(invitationExpiresAt(invitation.createdAt), now) : 0;
  const completed = invitation?.status === 'used' && invitation.usedBy === community.profile?.id;
  const retry = () => setLookupAttempt(attempt => attempt + 1);
  return <section className="ci-accept c-panel"><div className="ci-accept-icon"><KeyRound size={26} /></div><p className="c-eyebrow">TE HAN INVITADO</p><h1>{invitation?.kind === 'event' ? 'Un encuentro privado te espera' : 'Conecta en LaCantera'}</h1><p>Un código, una persona. Acepta la invitación con tu propia cuenta.</p>{code ? <code className="ci-entry-code">{formatInvitationCode(code)}</code> : null}
    {community.mode === 'demo' ? <p className="ci-demo-note">Invitación de prueba: las cuentas y el código deben pertenecer a este navegador.</p> : null}
    {!community.profile || !api.eligible ? <><p>Primero entra y completa tu perfil. Guardaremos este enlace para que vuelvas a la invitación.</p><Link className="c-button" to={`/profile?returnTo=${encodeURIComponent(returnTo)}`}>Entrar o completar mi cuenta <ArrowRight size={17} /></Link></> : !api.emailVerified ? <p className="c-error" role="alert">Verifica el correo de tu cuenta antes de usar el código.</p> : !community.serviceAvailable ? <p className="c-empty">La comunidad está en preparación o mantenimiento. Conserva el enlace y pide un código nuevo cuando vuelva a abrir.</p> : current.loading ? <p role="status">Comprobando invitación…</p> : invitation ? <>
      <div className="ci-inviter" aria-label="Quién te invita">
        {sender ? <><span className="c-avatar" aria-hidden="true">{profileInitials(sender.name)}</span><div><p>{invitation.kind === 'event' ? 'Te invita a un encuentro privado' : 'Quiere conectar contigo'}</p><strong>{sender.name}</strong><Link to={`/people/${encodeURIComponent(sender.id)}`} className="ci-text-button">Ver perfil <ArrowRight size={14} aria-hidden="true" /></Link></div></> : <div><p role={senderState === 'error' ? 'alert' : 'status'}>{senderState === 'loading' ? 'Comprobando quién te invita…' : senderState === 'error' ? senderTimedOut === senderRequestScope ? 'La comprobación del perfil está tardando demasiado. Revisa tu conexión y vuelve a intentarlo.' : 'No pudimos consultar el perfil de quien te invita.' : 'El perfil de quien te invita ya no está disponible.'}</p><p className="c-small">{completed ? 'Puedes abrir el acceso que ya aceptaste con esta cuenta.' : 'Para aceptar necesitamos identificar a quien te invita.'}</p>{senderState !== 'loading' ? <button type="button" className="ci-text-button" disabled={busy} onClick={() => setSenderAttempt(attempt => attempt + 1)}>Volver a comprobar</button> : null}</div>}
      </div>
      <div className="ci-accept-details">{invitation.kind === 'event' ? <><LockKeyhole size={20} /><p>Al aceptar ocuparás una plaza disponible y podrás ver el lugar, horario y participantes. El encuentro no aparecerá en tu perfil público.</p></> : <><Users size={20} /><p>Al aceptar, la otra persona y tú apareceréis en vuestras conexiones. Podrás ver su perfil y desconectar cuando quieras.</p></>}</div>
      <p className="ci-expiry">{completed ? 'Ya aceptaste este código con tu cuenta.' : remaining ? `Caduca en ${formatInvitationCountdown(remaining)}` : 'Este código ha caducado. Pide uno nuevo.'}</p>
      {invitation.kind === 'event' && !completed ? <label className="ci-entry-input">Nombre de tu inscripción (jugador, grupo o equipo)<input className="c-input" value={participantName} onChange={event => setParticipantName(event.target.value)} maxLength={100} required autoComplete="off" /></label> : null}
      <button className="c-button" disabled={busy || !completed && (!remaining || !sender || invitation.kind === 'event' && !participantName.trim())} onClick={() => {
        if (busy || latestScope.current !== scope || !completed && (!remaining || latestSender.current.scope !== senderScope || !latestSender.current.identified)) return;
        const start = scope; setBusy(true);
        void api.acceptInvitation(code!, invitation.kind === 'event' ? participantName : undefined).then(value => { if (mounted.current && latestScope.current === start) navigate(value.kind === 'event' ? `/play/${value.eventId}` : '/connect?connected=1', { replace: true }); }).catch(err => { if (mounted.current && latestScope.current === start) setState(old => ({ ...old, error: safeInvitationError(err) })); }).finally(() => { if (mounted.current && latestScope.current === start) setBusy(false); });
      }}>{busy ? 'Aceptando…' : completed ? 'Abrir mi acceso' : invitation.kind === 'event' ? 'Aceptar e inscribirme' : 'Aceptar conexión'}<ArrowRight size={17} /></button>
    </> : null}{current.error ? <><p className="c-error" role="alert">{current.error}</p>{!invitation ? <button type="button" className="ci-text-button" onClick={retry}>Volver a comprobar invitación</button> : null}</> : null}<Link className="ci-text-button" to="/connect">Introducir otro código</Link>
  </section>;
}

function ConnectionsContent() {
  const { code } = useParams(); const community = useCommunity(); const api = useInvitations(); const navigate = useNavigate();
  const [input, setInput] = useState(''); const [error, setError] = useState(''); const [opened, setOpened] = useState<CommunityInvitation | null>(null); const [now, setNow] = useState(Date.now());
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState<'connections' | 'invitations'>('connections');
  const [query, setQuery] = useState(''); const [creating, setCreating] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const stops = api.connections.map(connection => community.watchPublicProfile(connection.peerId));
    return () => stops.forEach(stop => stop());
  }, [api.connections, community.watchPublicProfile]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  if (code !== undefined) return <InvitationAcceptance key={`${community.mode}:${community.profile?.id || ''}:${code}`} rawCode={code} />;
  const activeInvitations = api.ownInvitations.filter(item => item.status === 'active' && invitationSecondsRemaining(invitationExpiresAt(item.createdAt), now) > 0);
  const matches = api.connections.filter(connection => !query.trim() || (community.publicProfiles[connection.peerId]?.name || '').toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')));
  const searchingProfiles = Boolean(query.trim()) && api.connections.some(connection => community.publicProfileStates[connection.peerId] === 'loading');
  async function invite() {
    if (creating) return;
    const existing = activeInvitations.find(item => item.kind === 'connection');
    if (existing) { setOpened(existing); return; }
    setCreating(true); setError('');
    try { const invitation = await api.createInvitation('connection'); if (mounted.current) setOpened(invitation); }
    catch (err) { if (mounted.current) setError(safeInvitationError(err)); }
    finally { if (mounted.current) setCreating(false); }
  }
  return <div className="ci-page">
    <header className="ci-page-head"><Link className="ci-icon-action" to="/feed" aria-label="Volver a Comunidad"><ArrowLeft size={24} /></Link><h1>Tu gente</h1><button className="ci-icon-action" type="button" aria-label="Escanear un código QR" aria-haspopup="dialog" onClick={() => setScanning(true)}><QrCode size={26} /></button></header>
    <p className="ci-page-intro">Juega con gente que conoces.</p>
    <nav className="ci-tabs" aria-label="Conexiones e invitaciones"><button type="button" aria-pressed={tab === 'connections'} onClick={() => setTab('connections')}>Conexiones<span>{api.connections.length}</span></button><button type="button" aria-pressed={tab === 'invitations'} onClick={() => setTab('invitations')}>Invitaciones<span>{activeInvitations.length}</span></button></nav>
    {tab === 'connections' ? <label className="ci-search"><Search size={22} /><span className="ci-sr-only">Buscar en tus conexiones</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar personas" /></label> : null}
    <section className="ci-invite-banner" aria-label="Invita a tu gente"><div><h2>Invita a tu gente</h2><p>Comparte tu enlace o tu QR.</p>{api.eligible && community.serviceAvailable ? <button type="button" className="ci-invite-link" disabled={creating} onClick={() => void invite()}>Ver mi enlace<ArrowRight size={20} /></button> : <Link className="ci-invite-link" to="/profile">Completar mi cuenta<ArrowRight size={20} /></Link>}</div>{api.eligible && community.serviceAvailable ? <button className="c-button" type="button" disabled={creating} onClick={() => void invite()}><QrCode size={24} /><span>{creating ? 'Creando…' : 'Compartir'}</span></button> : null}</section>
    {tab === 'connections' ? <section><div className="c-section-head"><h2>Mis conexiones</h2></div>{api.loading ? <p className="c-empty" role="status">Cargando tus conexiones…</p> : matches.length ? <div className="ci-people-grid">{matches.map(connection => <ConnectionCard key={`${connection.ownerId}:${connection.peerId}`} connection={connection} />)}</div> : <div className="ci-empty"><Users size={30} /><h3>{searchingProfiles ? 'Buscando tus conexiones…' : query ? 'No hay coincidencias' : 'Tu gente, aquí'}</h3><p>{searchingProfiles ? 'Estamos cargando sus perfiles.' : query ? 'Busca otro nombre entre tus conexiones.' : 'Comparte una invitación para empezar.'}</p></div>}</section> : <section className="ci-active-invitations"><h2>Tus invitaciones</h2><p className="c-small">Códigos que has creado. Cada uno sirve para una persona y caduca en diez minutos.</p>{api.loading ? <p role="status">Cargando invitaciones…</p> : activeInvitations.length ? activeInvitations.map(invitation => <button key={invitation.id} className="ci-active-code" onClick={() => setOpened(invitation)}><span><code>{formatInvitationCode(invitation.id)}</code><small>{invitation.kind === 'event' ? 'Acceso privado' : 'Conexión'}</small></span><span>{formatInvitationCountdown(invitationSecondsRemaining(invitationExpiresAt(invitation.createdAt), now))}<ChevronRight size={17} /></span></button>) : <div className="ci-empty"><QrCode size={28} /><h3>Sin códigos activos</h3><p>Crea una invitación y compártela con tu gente.</p></div>}</section>}
    {api.error ? <p className="c-error" role="alert">{api.error}</p> : null}
    <form className="ci-entry" onSubmit={event => { event.preventDefault(); const normalized = normalizeInvitationCode(input); if (!normalized) { setError('Introduce el código de 16 caracteres que te han enviado.'); return; } setError(''); navigate(`/invite/${normalized}`); }}><h2>¿Tienes una invitación?</h2><div className="ci-code-input-row"><label className="ci-entry-input"><span className="ci-sr-only">Código de invitación</span><input className="c-input" value={input} onChange={event => setInput(event.target.value)} placeholder="Introducir código" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={32} required /></label><button className="c-button" type="submit">Unirme</button></div><button className="ci-scan-link" type="button" aria-haspopup="dialog" onClick={() => { setError(''); setScanning(true); }}><ScanLine size={23} />Escanear QR</button><p className="ci-privacy-note">Conectar no da acceso a partidos privados.</p>{error ? <p className="c-error" role="alert">{error}</p> : null}</form>
    {new URLSearchParams(window.location.hash.split('?')[1] || '').get('connected') === '1' ? <p className="c-success" role="status"><CheckCircle2 size={18} />Conexión aceptada.</p> : null}
    {opened && opened.ownerId === community.profile?.id ? <InvitationDialog initial={opened} onClose={() => setOpened(null)} /> : null}
    {scanning ? <Suspense fallback={<p role="status">Abriendo lector de QR…</p>}><QrScanner onClose={() => setScanning(false)} onCode={detected => { setScanning(false); navigate(`/invite/${detected}`); }} /></Suspense> : null}
  </div>;
}

export default function ConnectionsPage() {
  const { mode, profile } = useCommunity();
  return <ConnectionsContent key={`${mode}:${profile?.id || 'guest'}`} />;
}
