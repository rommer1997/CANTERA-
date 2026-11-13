import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { PushSettings } from './PushSettings';
import { useInvitations } from './InvitationsContext';
import { invitationExpiresAt } from './invitations';
import { friendlyError, useCommunity } from './CommunityContext';
export default function ActivityPage() {
 const api = useCommunity(); const invitations=useInvitations(); const received=invitations.incomingInvitations.filter(item=>item.status==='active'&&Date.parse(invitationExpiresAt(item.createdAt,true))>Date.now()); const [busy, setBusy] = useState(''); const [error, setError] = useState('');
 if (!api.profile) return <div className="c-empty"><Bell /><h1>Tu actividad</h1><p>Entra para consultar los cambios de tus encuentros.</p><Link className="c-button" to="/profile?returnTo=%2Factivity">Entrar</Link></div>;
 return <section className="c-section c-activity"><div className="c-section-head"><div><p className="c-eyebrow">AL DÍA CON TU EQUIPO</p><h1>Avisos</h1></div></div><PushSettings/>{received.length?<Link className="c-panel c-direct-notice" to="/connect?tab=invitations">Tienes {received.length} {received.length===1?'invitación pendiente':'invitaciones pendientes'} · Revisar</Link>:null}{error ? <p className="c-error" role="alert">{error}</p> : null}{api.eventNotices.length ? api.eventNotices.map(notice => <article className={`c-notice ${notice.readAt ? '' : 'unread'}`} key={notice.id}><Bell size={21} /><div><Link to={`/play/${notice.eventId}`}><h2>{notice.title}</h2></Link><p>{notice.summary}</p><time dateTime={notice.createdAt}>{new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notice.createdAt))}</time></div>{!notice.readAt ? <button className="c-button secondary" disabled={Boolean(busy)} aria-label={`Marcar como leído: ${notice.title}`} onClick={() => { setBusy(notice.id); void api.markNoticeRead(notice.id).catch(err => setError(friendlyError(err))).finally(() => setBusy('')); }}><Check size={18} />Marcar como leído</button> : <span className="c-notice-read"><Check size={18} aria-hidden="true" />Leído</span>}</article>) : <div className="c-empty"><Bell /><h2>Estás al día</h2><p>Los cambios de encuentros en los que participas aparecerán aquí.</p><Link to="/play?view=mine">Ver tu agenda</Link></div>}</section>;
}
