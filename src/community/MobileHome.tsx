import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, ChevronRight, MapPin, Play, Plus, Trophy, Users } from 'lucide-react';
import { useCommunity } from './CommunityContext';
import type { PlayEvent } from './types';

function AgendaRow({ event }: { event: PlayEvent }) {
  const date = new Date(event.startAt);
  const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es', { timeZone: event.timeZone, ...options }).format(date);
  return <Link className="c-mobile-event" to={`/play/${event.id}`}>
    <time className="c-mobile-date" dateTime={event.startAt}><strong>{format({ day: 'numeric' })}</strong><span>{format({ month: 'short' })}</span></time>
    <div><span className="c-mobile-event-kind">{event.type === 'match' ? 'Partido' : 'Torneo'} · F{event.format}</span><h3>{event.title}</h3><p>{event.city}, {event.country}</p><span>{format({ hour: '2-digit', minute: '2-digit' })} · {event.timeZone}</span></div>
    <ChevronRight size={18} aria-hidden="true" />
  </Link>;
}

export function MobileHome() {
  const { profile, events, posts, hiddenPostIds, loading, error } = useCommunity();
  const upcoming = events.filter(event => event.status !== 'cancelled' && Date.parse(event.startAt) > Date.now()).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  const agenda = profile ? upcoming.filter(event => event.ownerId === profile.id || event.participants[profile.id]).slice(0, 2) : [];
  const open = upcoming.filter(event => event.status === 'open' && !agenda.some(item => item.id === event.id)).slice(0, 3);
  const recent = posts.filter(post => !hiddenPostIds.includes(post.id)).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 2);
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
    {agenda.length > 0 ? <section className="c-mobile-block" aria-labelledby="c-mobile-agenda-title"><div className="c-mobile-block-head"><h2 id="c-mobile-agenda-title">Tu agenda</h2><Link to="/profile">Ver actividad <ChevronRight size={15} aria-hidden="true" /></Link></div><div className="c-mobile-event-list">{agenda.map(event => <AgendaRow key={event.id} event={event} />)}</div></section> : null}
    <section className="c-mobile-block" aria-labelledby="c-mobile-play-title"><div className="c-mobile-block-head"><h2 id="c-mobile-play-title">Para jugar</h2><Link to="/play">Ver todos <ChevronRight size={15} aria-hidden="true" /></Link></div>
      {open.length ? <div className="c-mobile-event-list">{open.map(event => <AgendaRow key={event.id} event={event} />)}</div> : <div className="c-mobile-empty"><CalendarDays size={25} aria-hidden="true" /><div><strong>{loading ? 'Buscando encuentros…' : error ? 'Consulta los encuentros' : 'Propón el próximo encuentro'}</strong><p>{loading ? 'La agenda se está actualizando.' : error ? 'Revisa tu conexión o tu cuenta para cargar la agenda.' : 'Busca en otra ciudad o reúne a tu gente para jugar.'}</p><Link to="/play">Explorar partidos y torneos <ArrowRight size={15} aria-hidden="true" /></Link></div></div>}
    </section>
    <section className="c-mobile-block" aria-labelledby="c-mobile-feed-title"><div className="c-mobile-block-head"><h2 id="c-mobile-feed-title">La comunidad</h2><Link to="/feed">Abrir feed <ChevronRight size={15} aria-hidden="true" /></Link></div>
      {recent.length ? <div className="c-mobile-stories">{recent.map(post => <Link key={post.id} to={`/feed?post=${encodeURIComponent(post.id)}`} className="c-mobile-story"><div className={`c-mobile-story-icon ${post.kind}`}>{post.kind === 'photo' && post.mediaUrl ? <img src={post.mediaUrl} alt="" loading="lazy" /> : post.kind === 'reel' ? <Play size={23} aria-hidden="true" /> : <Trophy size={23} aria-hidden="true" />}</div><div><span>{post.authorName} · {post.kind === 'achievement' ? 'Logro' : post.kind === 'reel' ? 'Reel' : 'Foto'}</span><h3>{post.title || post.text}</h3>{post.title ? <p>{post.text}</p> : null}</div><ChevronRight size={18} aria-hidden="true" /></Link>)}</div> : <div className="c-mobile-empty"><Users size={25} aria-hidden="true" /><div><strong>{loading ? 'Cargando la comunidad…' : error ? 'Consulta la comunidad' : 'Tu historia también cuenta'}</strong><p>{error ? 'Revisa tu cuenta para cargar las publicaciones.' : 'Comparte tu recorrido y descubre el de otros.'}</p><Link to="/feed">Ir a la comunidad <ArrowRight size={15} aria-hidden="true" /></Link></div></div>}
    </section>
  </div>;
}
