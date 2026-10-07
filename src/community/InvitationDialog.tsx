import { useEffect, useId, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Link2, MessageCircle, QrCode, Share2, X } from 'lucide-react';
import { useCommunity } from './CommunityContext';
import { useInvitations } from './InvitationsContext';
import { formatInvitationCode, formatInvitationCountdown, invitationExpiresAt, invitationLink, invitationSecondsRemaining, safeInvitationError } from './invitations';
import type { CommunityInvitation, InvitationKind } from './invitationTypes';
import type { PlayEvent } from './types';
import './invitations.css';

export function InvitationDialog({ initial, onClose }: { initial: CommunityInvitation; onClose(): void }) {
  const api = useInvitations(); const { mode } = useCommunity();
  const [invitation, setInvitation] = useState(initial);
  const [now, setNow] = useState(Date.now()); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null); const titleId = useId(); const mounted = useRef(true);
  const current = api.ownInvitations.find(item => item.id === invitation.id) || invitation;
  const remaining = invitationSecondsRemaining(invitationExpiresAt(current.createdAt), now);
  const active = current.status === 'active' && remaining > 0;
  const url = invitationLink(current.id, window.location.origin);
  const text = `Te invito ${current.kind === 'event' ? 'a un encuentro privado' : 'a conectar'} en LaCantera. Código: ${formatInvitationCode(current.id)}. Es para una persona y caduca en 10 minutos. ${url}`;
  useEffect(() => {
    mounted.current = true; const element = dialog.current; element?.showModal();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { mounted.current = false; window.clearInterval(timer); element?.close(); };
  }, []);
  async function work(action: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (err) { if (mounted.current) setError(safeInvitationError(err)); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); if (mounted.current) setMessage(label); }
    catch { if (mounted.current) setError('No se pudo copiar. Puedes seleccionar el código o compartir el enlace.'); }
  }
  return <dialog ref={dialog} className="ci-dialog" aria-labelledby={titleId} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }}>
    <div className="ci-dialog-head"><div><p className="c-eyebrow">INVITA A TU GENTE</p><h2 id={titleId}>{current.kind === 'event' ? 'Acceso al encuentro privado' : 'Código de conexión'}</h2></div><button className="ci-close" aria-label="Cerrar invitación" onClick={onClose}><X size={22} /></button></div>
    <p>Compártelo sólo con quien quieras invitar. Caduca en diez minutos y sirve para una persona.</p>
    {mode === 'demo' ? <p className="ci-demo-note">Código de prueba: sólo funciona con las cuentas de este navegador.</p> : null}
    <div className={`ci-code-card ${active ? '' : 'inactive'}`}>
      <code className="ci-code">{formatInvitationCode(current.id)}</code>
      {active ? <div className="ci-qr"><QRCodeSVG value={url} size={168} level="M" marginSize={2} title="Escanea para abrir esta invitación en LaCantera" /></div> : <div className="ci-code-ended"><Check size={32} /><span>{current.status === 'used' ? 'Invitación utilizada' : current.status === 'revoked' ? 'Código cancelado' : 'Este código ha caducado'}</span></div>}
      <p className="ci-expiry">{active ? <>Caduca en <strong>{formatInvitationCountdown(remaining)}</strong></> : 'Genera otro código para invitar a una nueva persona.'}</p>
    </div>
    <p className="c-small">La otra persona necesita entrar, verificar su correo y completar su perfil. {current.kind === 'event' ? 'Al aceptar se inscribirá, si queda una plaza.' : 'Al aceptar apareceréis en vuestras conexiones.'}</p>
    {active ? <div className="ci-actions">
      <button className="c-button" disabled={busy} onClick={() => void copy(formatInvitationCode(current.id), 'Código copiado.')}><Copy size={17} />Copiar código</button>
      <button className="c-button secondary" disabled={busy} onClick={() => void work(async () => { if (navigator.share) { try { await navigator.share({ title: 'Invitación a LaCantera', text, url }); } catch (err) { if ((err as { name?: string }).name !== 'AbortError') throw err; } } else await copy(url, 'Enlace copiado.'); })}><Share2 size={17} />Compartir</button>
      <a className="c-button secondary" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} />WhatsApp</a>
      <a className="c-button secondary" href={`sms:?body=${encodeURIComponent(text)}`}><MessageCircle size={17} />SMS</a>
      <button className="ci-copy-link" disabled={busy} onClick={() => void copy(url, 'Enlace copiado.')}><Link2 size={16} />Copiar enlace</button>
      <button className="ci-revoke" disabled={busy} onClick={() => void work(async () => { await api.revokeInvitation(current.id); if (mounted.current) setInvitation({ ...current, status: 'revoked' }); })}>{busy ? 'Espera…' : 'Cancelar código'}</button>
    </div> : <button className="c-button ci-new-code" disabled={busy} onClick={() => void work(async () => { const next = await api.createInvitation(current.kind, current.eventId); if (mounted.current) { setInvitation(next); setNow(Date.now()); } })}><QrCode size={18} />{busy ? 'Creando…' : 'Generar otro código'}</button>}
    {message ? <p className="c-success" role="status">{message}</p> : null}{error ? <p className="c-error" role="alert">{error}</p> : null}
  </dialog>;
}

function InvitationControl({ kind = 'connection', eventId = '', label = 'Invitar a conectar' }: { kind?: InvitationKind; eventId?: string; label?: string }) {
  const api = useInvitations(); const { mode, profile } = useCommunity();
  const [invitation, setInvitation] = useState<CommunityInvitation | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const scope = `${mode}:${profile?.id || ''}`; const latestScope = useRef(scope); latestScope.current = scope;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  return <div className="ci-invite-control"><button className="c-button secondary" disabled={busy || !api.eligible} onClick={() => { setBusy(true); setError(''); const start = scope; void api.createInvitation(kind, eventId).then(value => { if (mounted.current && latestScope.current === start) setInvitation(value); }).catch(err => { if (mounted.current && latestScope.current === start) setError(safeInvitationError(err)); }).finally(() => { if (mounted.current && latestScope.current === start) setBusy(false); }); }}><QrCode size={18} />{busy ? 'Creando código…' : label}</button>{error ? <p className="c-error" role="alert">{error}</p> : null}{invitation && invitation.ownerId === profile?.id ? <InvitationDialog key={invitation.id} initial={invitation} onClose={() => setInvitation(null)} /> : null}</div>;
}
export function EventInviteButton({ event }: { event: PlayEvent }) {
  const { profile } = useCommunity();
  if (event.visibility !== 'private' || event.ownerId !== profile?.id || event.status !== 'open' || Date.parse(event.startAt) <= Date.now() || event.fixtures.length || event.fixtureIds?.length || Object.keys(event.participants).length >= event.capacity) return null;
  return <InvitationButton kind="event" eventId={event.id} label="Invitar por código" />;
}

export function InvitationButton(props: { kind?: InvitationKind; eventId?: string; label?: string }) {
  const { mode, profile } = useCommunity();
  return <InvitationControl key={`${mode}:${profile?.id || ''}:${props.kind || 'connection'}:${props.eventId || ''}`} {...props} />;
}
