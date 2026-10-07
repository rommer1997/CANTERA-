import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, ChevronRight, MapPin, Play, Plus, Trophy, Users } from 'lucide-react';
import { useCommunity, usePublicProfile } from './CommunityContext';
import { canReadEvent, isPublicEvent } from './eventPrivacy';
import type { CommunityPost, PlayEvent } from './types';

function AgendaRow({ event }: { event: PlayEvent }) {
  const date = new Date(event.startAt);
  const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es', { timeZone: event.timeZone, ...options }).format(date);
  return <Link className="c-mobile-event" to={`/play/${event.id}`}>
    <time className="c-mobile-date" dateTime={event.startAt}><strong>{format({ day: 'numeric' })}</strong><span>{format({ month: 'short' })}</span></time>
    <div><span className="c-mobile-event-kind">{event.type === 'match' ? 'Partido' : 'Torneo'} · F{event.format}</span><h3>{event.title}</h3><p>{event.city}, {event.country}</p><span>{format({ hour: '2-digit', minute: '2-digit' })}</span></div>
    <ChevronRight size={18} aria-hidden="true" />
  </Link>;
}

function RecentPost({ post }: { post: CommunityPost }) {
  const author = usePublicProfile(post.authorId === 'example-community' ? '' : post.authorId);
  return <Link to={`/feed?post=${encodeURIComponent(post.id)}`} className="c-mobile-story"><div className={`c-mobile-story-icon ${post.kind}`}>{post.kind === 'photo' && post.mediaUrl ? <img src={post.mediaUrl} alt="" loading="lazy" /> : post.kind === 'reel' ? <Play size={23} aria-hidden="true" /> : <Trophy size={23} aria-hidden="true" />}</div><div><span>{author?.name || post.authorName} · {post.kind === 'achievement' ? 'Logro' : post.kind === 'reel' ? 'Reel' : 'Foto'}</span><h3>{post.title || post.text}</h3>{post.title ? <p>{post.text}</p> : null}</div><ChevronRight size={18} aria-hidden="true" /></Link>;
}

export function MobileHome() {
  const { profile, events, ownEvents, posts, hiddenPostIds, loading, error, blockedIds } = useCommunity();
  const upcoming = events.filter(event => isPublicEvent(event) && event.status !== 'cancelled' && Date.parse(event.startAt) > Date.now()).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  const agenda = profile ? ownEvents.filter(event => canReadEvent(event, profile.id) && !['cancelled', 'completed'].includes(event.status) && Date.parse(event.startAt) > Date.now()).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)).slice(0, 3) : [];
  const open = upcoming.filter(event => event.status === 'open' && !agenda.some(item => item.id === event.id)).slice(0, 3);
  const recent = posts.filter(post => !hiddenPostIds.includes(post.id) && !blockedIds.includes(post.authorId)).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 2);
  const locationQuery = profile?.city && profile.country ? `?${new URLSearchParams({ city: profile.city, country: profile.country })}` : '';
  return <div className="c-mobile-home">
    <section className="c-mobile-welcome" aria-labelledby="c-mobile-home-title">
      <p>{profile ? `Hola, ${profile.name.split(' ')[0]}` : 'Bienvenido a Cantera'}</p><h1 id="c-mobile-home-title">Tu fútbol, hoy.</h1>
      <Link className="c-mobile-location" to={`/play${locationQuery}`}><MapPin size={16} aria-hidden="true" /><span>{locationQuery ? `${profile!.city}, ${profile!.country}` : 'Explorar por ciudad'}</span><ChevronRight size={15} aria-hidden="true" /></Link>
    </section>
    <div className="c-mobile-actions">
      <Link className="c-mobile-action c-mobile-action-play" to="/play"><CalendarDays size={25} aria-hidden="true" /><strong>Vamos a jugar</strong><span>Busca tu próximo encuentro</span><ArrowRight size={18} aria-hidden="true" /></Link>
      <Link className="c-mobile-action c-mobile-action-create" to={profile ? '/play?create=1' : '/profile'}><Plus size={25} aria-hidden="true" /><strong>Organiza gratis</strong><span>Un partido o un torneo</span><ArrowRight size={18} aria-hidden="true" /></Link>
    </div>
    <Link className="c-home-teams" to="/teams"><Users size={21} /><div><strong>Tus equipos y grupos</strong><span>Miembros, responsables e invitaciones</span></div><ChevronRight size={18} /></Link>
    {agenda.length > 0 ? <section className="c-mobile-block" aria-labelledby="c-mobile-agenda-title"><div className="c-mobile-block-head"><h2 id="c-mobile-agenda-title">Tu agenda</h2><Link to="/play?view=mine">Ver actividad <ChevronRight size={15} aria-hidden="true" /></Link></div><div className="c-mobile-event-list">{agenda.map(event => <AgendaRow key={event.id} event={event} />)}</div></section> : null}
    <section className="c-mobile-block" aria-labelledby="c-mobile-play-title"><div className="c-mobile-block-head"><h2 id="c-mobile-play-title">Para jugar</h2><Link to="/play">Ver todos <ChevronRight size={15} aria-hidden="true" /></Link></div>
      {open.length ? <div className="c-mobile-event-list">{open.map(event => <AgendaRow key={event.id} event={event} />)}</div> : <div className="c-mobile-empty"><CalendarDays size={25} aria-hidden="true" /><div><strong>{loading ? 'Buscando encuentros…' : error ? 'Consulta los encuentros' : 'Propón el próximo encuentro'}</strong><p>{loading ? 'La agenda se está actualizando.' : error ? 'Revisa tu conexión o tu cuenta para cargar la agenda.' : 'Busca en otra ciudad o reúne a tu gente para jugar.'}</p><Link to="/play">Explorar partidos y torneos <ArrowRight size={15} aria-hidden="true" /></Link></div></div>}
    </section>
    <section className="c-mobile-block" aria-labelledby="c-mobile-feed-title"><div className="c-mobile-block-head"><h2 id="c-mobile-feed-title">La comunidad</h2><Link to="/feed">Abrir feed <ChevronRight size={15} aria-hidden="true" /></Link></div>
      {recent.length ? <div className="c-mobile-stories">{recent.map(post => <RecentPost key={post.id} post={post} />)}</div> : <div className="c-mobile-empty"><Users size={25} aria-hidden="true" /><div><strong>{loading ? 'Cargando la comunidad…' : error ? 'Consulta la comunidad' : 'Tu historia también cuenta'}</strong><p>{error ? 'Revisa tu cuenta para cargar las publicaciones.' : 'Comparte tu recorrido y descubre el de otros.'}</p><Link to="/feed">Ir a la comunidad <ArrowRight size={15} aria-hidden="true" /></Link></div></div>}
    </section>
  </div>;
}
