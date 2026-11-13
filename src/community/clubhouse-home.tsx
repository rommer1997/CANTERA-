import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, ChevronRight, CalendarDays, MapPin, MessageCircle, Users } from 'lucide-react';
import { TERMS_VERSION, useCommunity } from './CommunityContext';
import { canReadEvent, isPublicEvent } from './eventPrivacy';
import { eventCover } from './eventCovers';
import { useClock } from './useClock';
import { useTeams } from './TeamsContext';
import type { PlayEvent } from './types';

function HomeEvent({ event }: { event: PlayEvent }) {
  const date = new Date(event.startAt);
  const parts = new Intl.DateTimeFormat('es', { weekday:'short', day:'numeric', month:'short', timeZone:event.timeZone });
  const part = (kind: Intl.DateTimeFormatPartTypes) => parts.formatToParts(date).find(item => item.type === kind)?.value.replace('.', '');
  const spaces = Math.max(0, event.capacity - Object.keys(event.participants || {}).length);
  return <Link className="lc-agenda-row" to={`/play/${encodeURIComponent(event.id)}`}>
    <time className="lc-agenda-date" dateTime={event.startAt}><span>{part('weekday')}</span><strong>{part('day')}</strong><span>{part('month')}</span></time>
    <span><strong>{event.title}</strong><span><MapPin size={15} />{event.venue || event.city}</span></span>
    {event.status === 'open' && spaces > 0 ? <span className="lc-spaces">Quedan {spaces} plazas</span> : null}<ChevronRight size={20} />
  </Link>;
}

function Landing() {
  return <div className="lc-landing">
    <section className="lc-landing-hero"><div className="lc-landing-copy"><span className="lc-kicker"><span className="lc-live-dot" />EL FÚTBOL NOS REÚNE</span><h1>La vida,<br />mejor <em>en<br />equipo.</em></h1><p>Organiza partidos, encuentra jugadores y únete a un equipo. Gratis.</p><div className="lc-landing-actions"><Link className="c-button" to="/play">Vamos a jugar<ArrowUpRight size={20} /></Link><Link className="lc-text-link" to="/profile" data-analytics-event="JoinClick">Únete gratis<ArrowRight size={18} /></Link></div><span className="lc-landing-note">Sin cuotas de uso · comunidad para mayores de 18 años.</span></div><div className="lc-landing-image"><img src="/images/design-2026-10/hero-community.webp" alt="Imagen ilustrativa de un jugador con un balón en un campo de barrio al atardecer" width={800} height={1000} fetchPriority="high" /><span className="lc-photo-label">DEL BARRIO AL MUNDO.</span><Link className="lc-photo-stamp" to="/play" aria-label="Encuentra tu próximo partido">Nos vemos<br /><b>en el campo.</b><ArrowUpRight size={32} aria-hidden="true" /></Link></div></section>
    <div className="lc-manifesto" aria-label="Nuestro propósito"><span>Jugar.</span><span>Encontrarse.</span><span>Volver a jugar.</span><span className="lc-manifesto-ball" aria-hidden="true">+</span></div>
    <section className="lc-landing-features"><header><span className="lc-kicker">TODO EMPIEZA CON UN BALÓN</span><h2>El resto,<br />lo ponemos juntos.</h2></header><div><Link to="/play" className="lc-feature-row"><span>01</span><div><h3>Sal a jugar.</h3><p>Partidos y torneos por ciudad, formato y nivel. Abiertos o con invitación privada.</p></div><ArrowUpRight size={26} /></Link><Link to="/teams" className="lc-feature-row"><span>02</span><div><h3>Encuentra tu equipo.</h3><p>Un grupo de amigos o un club. Un lugar para organizaros y compartir el campo.</p></div><ArrowUpRight size={26} /></Link><Link to="/feed" className="lc-feature-row"><span>03</span><div><h3>Hazte escuchar.</h3><p>Comparte tus publicaciones y logros. Conecta con quienes viven el fútbol como tú.</p></div><ArrowUpRight size={26} /></Link></div></section>
    <section className="lc-purpose"><span className="lc-kicker">UNA COMUNIDAD, NO UNA CUOTA</span><h2>El talento no debería<br />necesitar una suscripción.</h2><p>LaCantera es una iniciativa con vocación sin ánimo de lucro. El núcleo es gratuito; buscamos patrocinadores para seguir creciendo.</p><Link className="c-button" to="/about">Conoce el proyecto<ArrowUpRight size={18} /></Link></section>
  </div>;
}

export function ClubhouseHome() {
  const { profile, ownEvents, events, posts, hiddenPostIds, blockedIds, loading, ownEventsLoading, eventsLoading, postsLoading, error } = useCommunity();
  const now = useClock();
  const { ownTeams } = useTeams();
  if (loading && !profile) return <div className="lc-home-skeleton" role="status"><span className="lc-kicker">LACANTERA</span><h1>Preparando tu espacio.</h1><div /><p>Cargando la comunidad…</p></div>;
  if (!profile) return <Landing />;
  const agenda = ownEvents.filter(event => canReadEvent(event, profile.id) && !['cancelled','completed'].includes(event.status) && Date.parse(event.startAt) > now).sort((a,b) => Date.parse(a.startAt)-Date.parse(b.startAt));
  const next = agenda[0];
  const open = events.filter(event => isPublicEvent(event) && event.status === 'open' && Date.parse(event.startAt) > now && !agenda.some(item=>item.id===event.id)).sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt)).slice(0,3);
  const featured = next || open[0];
  const agendaRows = agenda.filter(item => item.id !== featured?.id).slice(0,3);
  const nearby = open.filter(item => item.id !== featured?.id);
  const recent = posts.filter(post => !hiddenPostIds.includes(post.id) && !blockedIds.includes(post.authorId)).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,2);
  const agendaLoading = loading || ownEventsLoading;
  const complete = profile.adultConfirmed && profile.city.trim() && profile.country.trim() && profile.acceptedTermsVersion === TERMS_VERSION && Number.isFinite(Date.parse(profile.acceptedTermsAt));
  return <div className="lc-home">
    <header className="lc-home-heading"><div><p>Hola, {profile.name.split(' ')[0] || 'equipo'}</p><h1>¿Jugamos?</h1></div></header>
    {!complete && <div className="lc-onboarding" role="status"><div><strong>Tu espacio está casi listo.</strong><p>Completa tu perfil para organizar, participar y conectar.</p></div><Link className="c-button" to="/profile">Completar mi cuenta<ArrowUpRight size={18} /></Link></div>}
    <section className="lc-next-match" aria-label="Tu próximo partido">
      <img src={featured ? eventCover(featured).image : '/images/design-2026-10/event-night.webp'} alt="Imagen genérica de fútbol" width={1200} height={800} fetchPriority="high" />
      <div className="lc-next-match-copy">
        <span className="lc-date-chip">{agendaLoading ? 'Actualizando tu agenda' : featured ? new Intl.DateTimeFormat('es', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:featured.timeZone }).format(new Date(featured.startAt)) : 'El campo te espera'}</span>
        <h2>{agendaLoading ? 'Tu fútbol, al día.' : featured?.title || 'Tu próximo partido empieza aquí.'}</h2>
        {featured ? <p className="lc-hero-meta"><span><MapPin size={18} />{featured.venue || featured.city}</span><span><Users size={18} />{Object.keys(featured.participants || {}).length}/{featured.capacity} {featured.entry === 'teams' ? 'equipos' : 'jugadores'}</span></p> : <p>Reúne a tu gente y volved al campo.</p>}
        <Link className="c-button" to={featured ? `/play/${featured.id}` : '/play'}>{featured ? 'Ver partido' : 'Encuentra tu partido'}<ArrowRight size={22} /></Link>
      </div>
    </section>
    <div className="lc-home-columns"><section className="lc-home-section"><header><h2>{agenda.length ? 'Tu agenda' : 'Para jugar'}</h2><Link className="lc-text-link" to={agenda.length ? '/play?view=mine' : '/play'}>Ver todos<ChevronRight size={18} /></Link></header>
      {agendaLoading || eventsLoading ? <div className="lc-inline-state" role="status">Actualizando partidos…</div> : error ? <div className="lc-inline-state"><p>No hemos podido actualizar los partidos.</p><Link to="/play">Volver a consultar<ArrowRight size={18} /></Link></div> : (agenda.length ? agendaRows : nearby).length ? <div>{(agenda.length ? agendaRows : nearby).map(event=><HomeEvent key={event.id} event={event} />)}</div> : <div className="lc-inline-state"><CalendarDays size={26} /><h3>{featured ? 'Nos vemos en el campo.' : 'El próximo plan lo haces tú.'}</h3><p>{featured ? 'Consulta tu partido o reúne al equipo para otro partido.' : 'Tu agenda está libre. Es buen momento para reunir al equipo.'}</p><Link className="lc-text-link" to="/play?create=1">Organizar partido<ArrowRight size={18} /></Link></div>}
    </section>
    <Link className="lc-my-teams" to="/teams?view=mine"><span className="lc-team-icon"><Users size={28} /></span><span><strong>Tus equipos</strong><small>{ownTeams.length ? `${ownTeams.length} ${ownTeams.length === 1 ? 'equipo' : 'equipos'}` : 'Reúne a tu gente'}</small></span><ChevronRight size={22} /></Link>
    <section className="lc-home-section lc-home-community"><header><h2>En la comunidad</h2><Link className="lc-text-link" to="/feed">Ver todos<ChevronRight size={18} /></Link></header>
      {loading || postsLoading ? <div className="lc-inline-state" role="status">Actualizando publicaciones…</div> : error ? <div className="lc-inline-state"><p>No hemos podido actualizar la comunidad.</p><Link to="/feed">Volver a consultar<ArrowRight size={18} /></Link></div> : recent.length ? recent.map(post=><Link className="lc-home-post" to={`/feed?post=${encodeURIComponent(post.id)}`} key={post.id}><span>{post.authorName} · {post.kind==='achievement'?'Logro':'Publicación'}</span><h3>{post.title || post.text}</h3><ArrowRight size={20} /></Link>) : <div className="lc-inline-state"><MessageCircle size={26} /><h3>Las buenas historias se comparten.</h3><p>Una jugada, un logro o las ganas de volver a jugar.</p><Link className="lc-text-link" to="/feed?create=post">Escribir una publicación<ArrowRight size={18} /></Link></div>}
    </section></div>
  </div>;
}
