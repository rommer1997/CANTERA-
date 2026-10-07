import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, KeyRound, LockKeyhole, ScanLine, UserRound, Users } from 'lucide-react';
import { useCommunity } from './CommunityContext';
import { useInvitations } from './InvitationsContext';
import { InvitationButton, InvitationDialog } from './InvitationDialog';
import { formatInvitationCode, formatInvitationCountdown, invitationExpiresAt, invitationSecondsRemaining, normalizeInvitationCode, safeInvitationError } from './invitations';
import type { CommunityConnection, CommunityInvitation } from './invitationTypes';
import './invitations.css';

const QrScanner = lazy(() => import('./QrScanner'));

function ConnectionCard({ connection }: { connection: CommunityConnection }) {
  const api = useCommunity(); const invitations = useInvitations();
  const [confirm, setConfirm] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => api.watchPublicProfile(connection.peerId), [connection.peerId, api.watchPublicProfile]);
  const peer = api.publicProfiles[connection.peerId];
  return <article className="ci-person-card"><div className="ci-person-main"><span className="c-avatar" aria-hidden="true">{peer?.name.slice(0, 1).toUpperCase() || <UserRound size={20} />}</span><div><h3>{peer?.name || 'Conexión de LaCantera'}</h3><p>{peer ? `${peer.city}, ${peer.country}` : api.publicProfileStates[connection.peerId] === 'loading' ? 'Cargando perfil…' : 'El perfil público no está disponible.'}</p></div></div><div className="ci-person-actions">{peer ? <Link to={`/people/${connection.peerId}`} className="c-button secondary">Ver perfil <ArrowRight size={16} /></Link> : null}{confirm ? <><p className="c-small">La conexión se eliminará para ambos.</p><button className="ci-revoke" disabled={busy} onClick={() => { setBusy(true); setError(''); void invitations.removeConnection(connection.peerId).catch(err => setError(safeInvitationError(err))).finally(() => setBusy(false)); }}>{busy ? 'Eliminando…' : 'Confirmar desconexión'}</button><button className="ci-text-button" disabled={busy} onClick={() => setConfirm(false)}>Conservar conexión</button></> : <button className="ci-text-button" onClick={() => setConfirm(true)}>Desconectar</button>}</div>{error ? <p className="c-error" role="alert">{error}</p> : null}</article>;
}

function InvitationAcceptance({ rawCode }: { rawCode: string }) {
  const community = useCommunity(); const api = useInvitations(); const navigate = useNavigate();
  const code = normalizeInvitationCode(rawCode); const returnTo = code ? `/invite/${code}` : '/connect';
  const scope = `${community.mode}:${community.profile?.id || ''}:${code || ''}:${api.eligible}:${api.emailVerified}:${community.runtimeConfig.serviceStatus}`;
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
    if (!code || !api.eligible || !api.emailVerified || community.runtimeConfig.serviceStatus !== 'open') { setState({ scope, invitation: null, loading: false, error: !code ? 'El código no es válido. Comprueba el enlace o pide uno nuevo.' : '' }); return () => { active = false; }; }
    void currentApi.current.lookupInvitation(code).then(invitation => { if (active && latestScope.current === scope) setState({ scope, invitation, loading: false, error: '' }); }).catch(err => { if (active && latestScope.current === scope) setState({ scope, invitation: null, loading: false, error: safeInvitationError(err) }); });
    return () => { active = false; };
  }, [scope, code, api.eligible, api.emailVerified, community.runtimeConfig.serviceStatus]);
  const current = state.scope === scope ? state : { invitation: null, loading: true, error: '' };
  const invitation = current.invitation;
  const remaining = invitation ? invitationSecondsRemaining(invitationExpiresAt(invitation.createdAt), now) : 0;
  const completed = invitation?.status === 'used';
  return <section className="ci-accept c-panel"><div className="ci-accept-icon"><KeyRound size={26} /></div><p className="c-eyebrow">TE HAN INVITADO</p><h1>{invitation?.kind === 'event' ? 'Un encuentro privado te espera' : 'Conecta en LaCantera'}</h1><p>Un código, una persona. Acepta la invitación con tu propia cuenta.</p>{code ? <code className="ci-entry-code">{formatInvitationCode(code)}</code> : null}
    {community.mode === 'demo' ? <p className="ci-demo-note">Invitación de prueba: las cuentas y el código deben pertenecer a este navegador.</p> : null}
    {!community.profile || !api.eligible ? <><p>Primero entra y completa tu perfil. Guardaremos este enlace para que vuelvas a la invitación.</p><Link className="c-button" to={`/profile?returnTo=${encodeURIComponent(returnTo)}`}>Entrar o completar mi cuenta <ArrowRight size={17} /></Link></> : !api.emailVerified ? <p className="c-error" role="alert">Verifica el correo de tu cuenta antes de usar el código.</p> : community.runtimeConfig.serviceStatus !== 'open' ? <p className="c-empty">La comunidad está en preparación o mantenimiento. Conserva el enlace y pide un código nuevo cuando vuelva a abrir.</p> : current.loading ? <p role="status">Comprobando invitación…</p> : invitation ? <>
      <div className="ci-accept-details">{invitation.kind === 'event' ? <><LockKeyhole size={20} /><p>Al aceptar ocuparás una plaza disponible y podrás ver el lugar, horario y participantes. El encuentro no aparecerá en tu perfil público.</p></> : <><Users size={20} /><p>Al aceptar, la otra persona y tú apareceréis en vuestras conexiones. Podrás ver su perfil y desconectar cuando quieras.</p></>}</div>
      <p className="ci-expiry">{completed ? 'Ya aceptaste este código con tu cuenta.' : remaining ? `Caduca en ${formatInvitationCountdown(remaining)}` : 'Este código ha caducado. Pide uno nuevo.'}</p>
      {invitation.kind === 'event' && !completed ? <label className="ci-entry-input">Nombre de tu inscripción (jugador, grupo o equipo)<input className="c-input" value={participantName} onChange={event => setParticipantName(event.target.value)} maxLength={100} required autoComplete="off" /></label> : null}
      <button className="c-button" disabled={busy || !remaining && !completed || invitation.kind === 'event' && !participantName.trim()} onClick={() => {
        const start = scope; setBusy(true);
        void api.acceptInvitation(code!, invitation.kind === 'event' ? participantName : undefined).then(value => { if (mounted.current && latestScope.current === start) navigate(value.kind === 'event' ? `/play/${value.eventId}` : '/connect?connected=1', { replace: true }); }).catch(err => { if (mounted.current && latestScope.current === start) setState(old => ({ ...old, error: safeInvitationError(err) })); }).finally(() => { if (mounted.current && latestScope.current === start) setBusy(false); });
      }}>{busy ? 'Aceptando…' : completed ? 'Abrir mi acceso' : invitation.kind === 'event' ? 'Aceptar e inscribirme' : 'Aceptar conexión'}<ArrowRight size={17} /></button>
    </> : null}{current.error ? <p className="c-error" role="alert">{current.error}</p> : null}<Link className="ci-text-button" to="/connect">Introducir otro código</Link>
  </section>;
}

function ConnectionsContent() {
  const { code } = useParams(); const community = useCommunity(); const api = useInvitations(); const navigate = useNavigate();
  const [input, setInput] = useState(''); const [error, setError] = useState(''); const [opened, setOpened] = useState<CommunityInvitation | null>(null); const [now, setNow] = useState(Date.now());
  const [scanning, setScanning] = useState(false);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  if (code !== undefined) return <InvitationAcceptance key={`${community.mode}:${community.profile?.id || ''}:${code}`} rawCode={code} />;
  const activeInvitations = api.ownInvitations.filter(item => item.status === 'active' && invitationSecondsRemaining(invitationExpiresAt(item.createdAt), now) > 0);
  return <div className="ci-page"><header className="ci-page-head"><div><p className="c-eyebrow">TU GENTE, TU FÚTBOL</p><h1>Conexiones e invitaciones</h1><p>Conecta con otras cuentas y accede a partidos o torneos privados.</p></div>{api.eligible && community.runtimeConfig.serviceStatus === 'open' ? <InvitationButton /> : <Link className="c-button secondary" to="/profile">Completar mi cuenta</Link>}</header>
    <form className="ci-entry c-panel" onSubmit={event => { event.preventDefault(); const normalized = normalizeInvitationCode(input); if (!normalized) { setError('Introduce el código de 16 caracteres que te han enviado.'); return; } setError(''); navigate(`/invite/${normalized}`); }}><div><h2><KeyRound size={20} />Tengo un código</h2><p>Escribe el código o escanea su QR para conectar o entrar en un encuentro privado.</p></div><label className="ci-entry-input">Código de invitación<input className="c-input" value={input} onChange={event => setInput(event.target.value)} placeholder="XXXX XXXX XXXX XXXX" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={32} required /></label><button className="c-button" type="submit">Continuar <ArrowRight size={17} /></button><div className="ci-scan-entry"><button className="c-button secondary" type="button" onClick={() => { setError(''); setScanning(true); }}><ScanLine size={19} />Escanear QR</button><p>Con la cámara o una imagen guardada.</p></div>{error ? <p className="c-error" role="alert">{error}</p> : null}</form>
    <section><div className="c-section-head"><h2>Mis conexiones <span className="ci-count">{api.connections.length}</span></h2></div><p className="c-small">Son contactos aceptados por invitación. Conectar no da acceso a sus eventos privados.</p>{api.loading ? <p className="c-empty" role="status">Cargando tus conexiones…</p> : api.connections.length ? <div className="ci-people-grid">{api.connections.map(connection => <ConnectionCard key={`${connection.ownerId}:${connection.peerId}`} connection={connection} />)}</div> : <div className="ci-empty"><Users size={30} /><h3>Empieza con alguien de tu equipo</h3><p>Comparte un código o acepta el que te envíen. Vuestras cuentas quedarán conectadas.</p></div>}{api.error ? <p className="c-error" role="alert">{api.error}</p> : null}</section>
    {activeInvitations.length ? <section className="ci-active-invitations"><h2>Códigos activos</h2><p className="c-small">Cada código admite una persona. Puedes cancelarlo antes de que se use.</p>{activeInvitations.map(invitation => <button key={invitation.id} className="ci-active-code" onClick={() => setOpened(invitation)}><span><code>{formatInvitationCode(invitation.id)}</code><small>{invitation.kind === 'event' ? 'Acceso privado' : 'Conexión'}</small></span><span>{formatInvitationCountdown(invitationSecondsRemaining(invitationExpiresAt(invitation.createdAt), now))}<ArrowRight size={17} /></span></button>)}</section> : null}
    {new URLSearchParams(window.location.hash.split('?')[1] || '').get('connected') === '1' ? <p className="c-success" role="status"><CheckCircle2 size={18} />Conexión aceptada.</p> : null}
    {opened && opened.ownerId === community.profile?.id ? <InvitationDialog initial={opened} onClose={() => setOpened(null)} /> : null}
    {scanning ? <Suspense fallback={<p role="status">Abriendo lector de QR…</p>}><QrScanner onClose={() => setScanning(false)} onCode={detected => { setScanning(false); navigate(`/invite/${detected}`); }} /></Suspense> : null}
  </div>;
}

export default function ConnectionsPage() {
  const { mode, profile } = useCommunity();
  return <ConnectionsContent key={`${mode}:${profile?.id || 'guest'}`} />;
}
