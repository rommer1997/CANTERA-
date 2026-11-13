import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, X, Mail, ChevronRight } from 'lucide-react';
import { useCommunity } from './CommunityContext';
import { useInvitations } from './InvitationsContext';
import { invitationExpiresAt, safeInvitationError } from './invitations';
import type { CommunityInvitation } from './invitationTypes';

export function DirectInviteButton({eventId}:{eventId:string}) {
  const {mode,profile}=useCommunity();const [open,setOpen]=useState(false);const trigger=useRef<HTMLButtonElement>(null);
  if(mode!=='cloud'||!profile)return null;
  return <div className="ci-invite-control"><button ref={trigger} type="button" className="c-button" onClick={()=>setOpen(true)} aria-haspopup="dialog"><Send size={17}/>Invitar a una conexión</button>{open?<DirectInviteDialog key={`${profile.id}:${eventId}`} eventId={eventId} close={()=>{setOpen(false);requestAnimationFrame(()=>trigger.current?.focus());}}/>:null}</div>;
}
function DirectInviteDialog({eventId,close}:{eventId:string;close():void}) {
  const api=useInvitations();const community=useCommunity();const [recipient,setRecipient]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [sent,setSent]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);const title=useId();const alive=useRef(true);
  const connections=api.connections.filter(connection=>!community.blockedIds.includes(connection.peerId));
  useEffect(()=>{alive.current=true;dialog.current?.showModal();return()=>{alive.current=false;dialog.current?.close();};},[]);
  const failedPeers=connections.filter(connection=>community.publicProfileStates[connection.peerId]==='error');
  const peers=connections.map(connection=>connection.peerId).sort().join(',');
  useEffect(()=>{const stops=connections.map(connection=>community.watchPublicProfile(connection.peerId));return()=>stops.forEach(stop=>stop());},[peers,community.watchPublicProfile]);
  async function send(){
    if(busy||!recipient)return;setBusy(true);setError('');
    try{await api.createInvitation('event',eventId,recipient);if(alive.current)setSent(true);}
    catch(failure){if(alive.current)setError(safeInvitationError(failure));}
    finally{if(alive.current)setBusy(false);}
  }
  return <dialog ref={dialog} className="ci-dialog" aria-labelledby={title} onCancel={event=>{event.preventDefault();if(!busy)close();}}>
    <div className="ci-dialog-head"><h2 id={title}>Invita a tu gente</h2><button type="button" className="ci-close" aria-label="Cerrar invitación directa" disabled={busy} onClick={close}><X size={21}/></button></div>
    {sent?<><p className="c-success" role="status">Invitación enviada.</p><p>La encontrará en sus invitaciones. Recibirá un aviso en el móvil si tiene las notificaciones activadas.</p><button className="c-button" onClick={close}>Entendido</button></>:<form onSubmit={event=>{event.preventDefault();void send();}}>
      <p>El acceso es solo para la cuenta elegida. Podrá revisarlo y aceptar mientras haya plazas y el partido siga abierto, hasta siete días.</p>
      {api.loading?<p role="status">Cargando tus conexiones…</p>:api.error?<p className="c-error" role="alert">{api.error}</p>:connections.length?<label>¿A quién invitas?<select className="c-input" value={recipient} onChange={event=>setRecipient(event.target.value)} required disabled={busy}><option value="">Elige una conexión</option>{connections.map(connection=><option key={connection.peerId} value={connection.peerId} disabled={!community.publicProfiles[connection.peerId]?.name}>{community.publicProfiles[connection.peerId]?.name||(community.publicProfileStates[connection.peerId]==='error'?'Perfil no disponible':community.publicProfileStates[connection.peerId]==='missing'?'Perfil no disponible':'Cargando perfil…')}</option>)}</select></label>:<p>Aún no tienes conexiones disponibles. <Link to="/connect" onClick={close}>Conecta con tu gente</Link> para invitarla directamente.</p>}
      {failedPeers.length?<div role="alert"><p className="c-small">No pudimos cargar algunos perfiles.</p><button type="button" className="ci-text-button" onClick={()=>failedPeers.forEach(connection=>community.retryPublicProfile(connection.peerId))}>Reintentar perfiles</button></div>:null}
      <button className="c-button" disabled={busy||!recipient||api.loading||!!api.error}>{busy?'Enviando…':'Enviar invitación'}</button>
      {error?<p className="c-error" role="alert">{error}</p>:null}
    </form>}
  </dialog>;
}
function IncomingCard({invitation}:{invitation:CommunityInvitation}) {
  const community=useCommunity();const api=useInvitations();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  useEffect(()=>community.watchPublicProfile(invitation.ownerId),[invitation.ownerId,community.watchPublicProfile]);
  return <article className="ci-direct-card"><Mail size={22} aria-hidden="true"/><div><h3>{community.publicProfiles[invitation.ownerId]?.name||'Invitación de LaCantera'}</h3><p>Partido privado · solo para tu cuenta</p><small>Disponible hasta {new Intl.DateTimeFormat('es',{dateStyle:'medium',timeStyle:'short'}).format(new Date(invitationExpiresAt(invitation.createdAt,true)))}</small><div className="c-actions"><Link className="c-button" to={`/invite/${invitation.id}`}>Revisar invitación<ChevronRight size={17}/></Link><button className="c-button secondary" disabled={busy} onClick={()=>{setBusy(true);setError('');void api.declineInvitation(invitation.id).catch(failure=>setError(safeInvitationError(failure))).finally(()=>setBusy(false));}}>{busy?'Rechazando…':'Rechazar'}</button></div>{error?<p className="c-error" role="alert">{error}</p>:null}</div></article>;
}
export function DirectInvitationInbox({now}:{now:number}) {
  const api=useInvitations();
  const [busy,setBusy]=useState('');const [error,setError]=useState('');
  const incoming=api.incomingInvitations.filter(item=>item.status==='active'&&Date.parse(invitationExpiresAt(item.createdAt,true))>now);
  const outgoing=api.ownInvitations.filter(item=>item.recipientId);
  return <><section className="ci-direct-invitations"><h2>Recibidas</h2>{api.loading?<p role="status">Cargando invitaciones…</p>:api.error?<p className="c-error" role="alert">{api.error}</p>:incoming.length?incoming.map(item=><IncomingCard key={item.id} invitation={item}/>):<p className="c-small">No tienes invitaciones directas pendientes.</p>}</section>{outgoing.length?<section className="ci-direct-invitations"><h2>Enviadas a tus conexiones</h2>{outgoing.map(item=><article className="ci-direct-outgoing" key={item.id}><span>Partido privado</span><strong>{item.status==='used'?'Aceptada':item.status==='declined'?'Rechazada':item.status==='revoked'?'Cancelada':Date.parse(invitationExpiresAt(item.createdAt,true))<=now?'Caducada':'Pendiente'}</strong>{item.status==='active'&&Date.parse(invitationExpiresAt(item.createdAt,true))>now?<button type="button" className="ci-text-button" disabled={!!busy} onClick={()=>{setBusy(item.id);setError('');void api.revokeInvitation(item.id).catch(failure=>setError(safeInvitationError(failure))).finally(()=>setBusy(''));}}>{busy===item.id?'Cancelando…':'Cancelar'}</button>:null}</article>)}{error?<p className="c-error" role="alert">{error}</p>:null}</section>:null}</>;
}
