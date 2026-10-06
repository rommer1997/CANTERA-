import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, MapPin, Search, Share2, UserPlus, Users } from 'lucide-react';
import { collection, getCountFromServer, getDocs, limit, orderBy, query, startAfter, where, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { friendlyError, useCommunity, usePublicProfile } from './CommunityContext';
import { readDemo } from './local';
import { normalizeDemoData, normalizeEvent, normalizePost } from './normalization';
import type { CommunityPost, PlayEvent, PublicProfile } from './types';
import './people.css';

const entityLabels = { individual: 'Persona', group: 'Grupo', club: 'Club o equipo' };
const searchable = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const location = (profile: PublicProfile) => [profile.city, profile.country].filter(Boolean).join(', ');
const dateLabel = (value: string) => new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(value));

function FollowButton({ target }: { target: PublicProfile }) {
  const { profile, followingIds, toggleFollow } = useCommunity();
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  if (profile?.id === target.id) return <Link className="people-button people-button-secondary" to="/profile">Editar mi perfil</Link>;
  if (!profile) return <Link className="people-button people-button-secondary" to="/profile">Entra para seguir</Link>;
  const following = followingIds.includes(target.id);
  async function follow() { setBusy(true); setError(''); try { await toggleFollow(target.id); } catch (err) { setError(friendlyError(err)); } finally { setBusy(false); } }
  return <div className="people-follow"><button className={`people-button ${following ? 'people-button-secondary' : ''}`} aria-pressed={following} disabled={busy} onClick={() => void follow()}>
    {following ? <Check size={17} aria-hidden="true" /> : <UserPlus size={17} aria-hidden="true" />}{busy ? 'Guardando…' : following ? 'Siguiendo' : 'Seguir'}
  </button>{error && <p className="people-error" role="alert">{error}</p>}</div>;
}
function PersonRow({ record }: { record: PublicProfile }) {
  const live = usePublicProfile(record.id); const person = live || record;
  return <li className="people-row"><Link className="people-person" to={`/people/${encodeURIComponent(person.id)}`}>
    <span className="people-avatar" aria-hidden="true">{person.name.slice(0, 1).toLocaleUpperCase('es')}</span>
    <span><strong>{person.name}{person.verification === 'verified' && <CheckCircle2 size={16} aria-label="Cuenta verificada por el administrador" />}</strong>
      <span className="people-meta">{entityLabels[person.entityType]}{location(person) ? ` · ${location(person)}` : ' · Ubicación sin indicar'}</span>
      {person.bio && <span className="people-preview">{person.bio}</span>}
    </span><ArrowRight size={18} aria-hidden="true" />
  </Link><FollowButton target={person} /></li>;
}
export function PeoplePage() {
  const { mode, profiles, publicProfiles, peopleLoading, peopleError, peopleHasMore, loadMorePeople } = useCommunity();
  const [search, setSearch] = useState(''); const [entity, setEntity] = useState('all');
  useEffect(() => { void loadMorePeople(true); }, [mode, loadMorePeople]);
  const needle = searchable(search.trim());
  const loaded = profiles.map(item => publicProfiles[item.id] || item);
  const matches = loaded.filter(item => (entity === 'all' || item.entityType === entity) && searchable(`${item.name} ${item.city} ${item.country}`).includes(needle));
  return <section className="people-page"><header className="people-heading"><span className="people-eyebrow">Comunidad</span><h1>Encuentra tu gente.</h1><p>Personas, grupos y equipos con los que compartir el fútbol.</p></header>
    <div className="people-search"><label htmlFor="people-search"><Search size={19} aria-hidden="true" /><span className="people-sr-only">Buscar por nombre, ciudad o país</span><input id="people-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nombre, ciudad o país" /></label>
      <label className="people-type-label" htmlFor="people-type">Tipo<select id="people-type" value={entity} onChange={event => setEntity(event.target.value)}><option value="all">Todos</option><option value="individual">Personas</option><option value="group">Grupos</option><option value="club">Clubes y equipos</option></select></label></div>
    <p className="people-window" aria-live="polite">{loaded.length} perfiles mostrados{search || entity !== 'all' ? ` · ${matches.length} coincidencias en esta lista` : ''}. La búsqueda se aplica a los perfiles mostrados, en páginas de 40.</p>
    {peopleError && <p className="people-error" role="alert">No se pudieron consultar los perfiles: {peopleError}</p>}
    {matches.length > 0 ? <ul className="people-list">{matches.map(person => <PersonRow key={person.id} record={person} />)}</ul> : !peopleLoading && !peopleError ? <div className="people-empty"><Users size={30} aria-hidden="true" /><h2>{loaded.length ? 'Sin coincidencias en esta lista' : 'La comunidad empieza aquí'}</h2><p>{loaded.length ? 'Prueba otro nombre o carga más perfiles.' : 'Todavía no hay perfiles disponibles en esta consulta.'}</p></div> : null}
    <div className="people-pagination">{peopleLoading && <p role="status">Cargando perfiles…</p>}{peopleHasMore && <button className="people-button people-button-secondary" disabled={peopleLoading} onClick={() => void loadMorePeople()}>Mostrar más perfiles</button>}{!peopleHasMore && loaded.length > 0 && <p>Has llegado al final de esta consulta.</p>}<button className="people-refresh" disabled={peopleLoading} onClick={() => void loadMorePeople(true)}>Actualizar lista</button></div>
  </section>;
}

type Activity = CommunityPost | PlayEvent;
const activityPageSize = 20;
function useProfileActivity<T extends Activity>(id: string, enabled: boolean, name: 'communityPosts' | 'communityEvents', field: 'authorId' | 'ownerId', normalize: (value: unknown, id?: string) => T | null) {
  const { mode } = useCommunity();
  const [state, setState] = useState<{ records: T[]; loading: boolean; error: string; more: boolean }>({ records: [], loading: false, error: '', more: true });
  const paging = useRef<{ cursor: QueryDocumentSnapshot<DocumentData> | null; offset: number; busy: boolean; active: boolean }>({ cursor: null, offset: 0, busy: false, active: true });
  const load = useCallback(async () => {
    const page = paging.current; if (!enabled || page.busy || !page.active) return; page.busy = true;
    setState(previous => ({ ...previous, loading: true, error: '' }));
    try {
      let records: T[]; let more: boolean;
      if (mode === 'demo') {
        const data = normalizeDemoData(readDemo());
        const all = (name === 'communityPosts' ? data.posts.filter(item => item.authorId === id) : data.events.filter(item => item.ownerId === id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        records = all.slice(page.offset, page.offset + activityPageSize) as T[]; page.offset += records.length; more = page.offset < all.length;
      } else {
        const snapshot = await getDocs(query(collection(db, name), where(field, '==', id), orderBy('createdAt', 'desc'), limit(activityPageSize), ...(page.cursor ? [startAfter(page.cursor)] : [])));
        records = snapshot.docs.map(item => normalize(item.data(), item.id)).filter((item): item is T => item !== null); page.cursor = snapshot.docs.at(-1) || page.cursor; more = snapshot.size === activityPageSize;
      }
      if (page.active) setState(previous => ({ records: [...new Map([...previous.records, ...records].map(item => [item.id, item])).values()], loading: false, error: '', more }));
    } catch (err) { if (page.active) setState(previous => ({ ...previous, loading: false, error: friendlyError(err) })); }
    finally { page.busy = false; }
  }, [enabled, field, id, mode, name, normalize]);
  useEffect(() => {
    let page: { cursor: QueryDocumentSnapshot<DocumentData> | null; offset: number; busy: boolean; active: boolean } = { cursor: null, offset: 0, busy: false, active: true }; paging.current = page;
    setState({ records: [], loading: false, error: '', more: true }); void load();
    const refresh = () => { page.active = false; page = { cursor: null, offset: 0, busy: false, active: true }; paging.current = page; setState({ records: [], loading: false, error: '', more: true }); void load(); };
    if (mode === 'demo') { window.addEventListener('storage', refresh); window.addEventListener('cantera-demo-updated', refresh); }
    return () => { page.active = false; window.removeEventListener('storage', refresh); window.removeEventListener('cantera-demo-updated', refresh); };
  }, [load, mode]);
  return { ...state, load };
}
function RelationshipCounts({ id }: { id: string }) {
  const { mode, followingIds } = useCommunity();
  const [counts, setCounts] = useState<{ followers: number; following: number } | null>(null); const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true; setCounts(null); setFailed(false);
    const refresh = async () => {
      try {
        let followers: number; let following: number;
        if (mode === 'demo') { const data = normalizeDemoData(readDemo()); followers = data.follows.filter(item => item.followingId === id).length; following = data.follows.filter(item => item.followerId === id).length; }
        else { const [a, b] = await Promise.all([getCountFromServer(query(collection(db, 'communityFollows'), where('followingId', '==', id))), getCountFromServer(query(collection(db, 'communityFollows'), where('followerId', '==', id)))]); followers = a.data().count; following = b.data().count; }
        if (active) setCounts({ followers, following });
      } catch { if (active) setFailed(true); }
    };
    void refresh(); if (mode === 'demo') { window.addEventListener('storage', refresh); window.addEventListener('cantera-demo-updated', refresh); }
    return () => { active = false; window.removeEventListener('storage', refresh); window.removeEventListener('cantera-demo-updated', refresh); };
  }, [id, mode, followingIds]);
  return <div className="people-counts" aria-live="polite">{counts ? <><span><strong>{counts.followers}</strong> seguidores</span><span><strong>{counts.following}</strong> siguiendo</span><small>Última consulta del seguimiento.</small></> : <span>{failed ? 'Seguimiento: recuento no disponible.' : 'Consultando seguimiento…'}</span>}</div>;
}
function ActivityFooter({ activity, noun }: { activity: { loading: boolean; error: string; more: boolean; records: Activity[]; load: () => Promise<void> }; noun: string }) {
  return <div className="people-activity-footer">{activity.error && <p role="alert" className="people-error">No se pudieron consultar {noun}: {activity.error}</p>}{activity.loading && <p role="status">Cargando {noun}…</p>}{!activity.loading && !activity.error && !activity.records.length && <p>Todavía no ha publicado {noun}.</p>}{activity.more && activity.records.length > 0 && <button className="people-button people-button-secondary" disabled={activity.loading} onClick={() => void activity.load()}>Mostrar más {noun}</button>}{activity.error && <button className="people-refresh" onClick={() => void activity.load()}>Volver a intentar</button>}<p className="people-window">{activity.records.length} {noun} de este perfil mostrados. Usa «Mostrar más» para ver anteriores.</p></div>;
}
export function PublicProfilePage() {
  const { profileId = '' } = useParams();
  const person = usePublicProfile(profileId); const { publicProfileStates, posts, followingIds, toggleFollow } = useCommunity();
  const state = !profileId || profileId.length > 128 || ['__proto__', 'constructor', 'prototype', '.', '..'].includes(profileId) || /[\/\\\u0000-\u001f\u007f]/.test(profileId) ? 'missing' : publicProfileStates[profileId];
  const publications = useProfileActivity(profileId, !!person, 'communityPosts', 'authorId', normalizePost);
  const organized = useProfileActivity(profileId, !!person, 'communityEvents', 'ownerId', normalizeEvent);
  const [unfollowBusy, setUnfollowBusy] = useState(false); const [unfollowError, setUnfollowError] = useState('');
  const [shareStatus, setShareStatus] = useState(''); const [shareFallback, setShareFallback] = useState('');
  useEffect(() => { setShareStatus(''); setShareFallback(''); setUnfollowError(''); }, [profileId]);
  async function unfollowMissing() { setUnfollowBusy(true); setUnfollowError(''); try { await toggleFollow(profileId); } catch (err) { setUnfollowError(friendlyError(err)); } finally { setUnfollowBusy(false); } }
  async function share() {
    if (!person) return;
    const url = new URL(window.location.href); url.hash = `/people/${encodeURIComponent(person.id)}`;
    try { if (navigator.share) await navigator.share({ title: `${person.name} · Cantera`, url: url.href }); else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url.href); setShareStatus('Enlace copiado.'); } else { setShareFallback(url.href); setShareStatus('Copia el enlace de este perfil.'); } }
    catch (err) { if ((err as { name?: string }).name !== 'AbortError') { setShareFallback(url.href); setShareStatus('Copia el enlace de este perfil.'); } }
  }
  if (!person) return <section className="people-page"><Link className="people-back" to="/people"><ArrowLeft size={18} aria-hidden="true" />Comunidad</Link><div className="people-empty"><h1>{state === 'missing' ? 'Perfil no encontrado' : state === 'error' ? 'Perfil no disponible' : 'Consultando perfil…'}</h1><p>{state === 'missing' ? 'Comprueba el enlace o encuentra otro perfil en la comunidad.' : state === 'error' ? 'No se ha podido consultar este perfil. Inténtalo de nuevo cuando haya conexión.' : 'Estamos buscando los datos publicados por esta cuenta.'}</p>{(state === 'missing' || state === 'error') && followingIds.includes(profileId) && <div className="people-follow"><button className="people-button people-button-secondary" disabled={unfollowBusy} onClick={() => void unfollowMissing()}>{unfollowBusy ? 'Guardando…' : 'Dejar de seguir esta cuenta'}</button>{unfollowError && <p className="people-error" role="alert">{unfollowError}</p>}</div>}</div></section>;
  return <section className="people-page"><Link className="people-back" to="/people"><ArrowLeft size={18} aria-hidden="true" />Comunidad</Link><header className="people-profile-heading"><span className="people-profile-avatar" aria-hidden="true">{person.name.slice(0, 1).toLocaleUpperCase('es')}</span><div><p className="people-eyebrow">{entityLabels[person.entityType]}</p><h1>{person.name}</h1>{location(person) && <p className="people-location"><MapPin size={16} aria-hidden="true" />{location(person)}</p>}<p className="people-verification">{person.verification === 'verified' ? <><CheckCircle2 size={17} aria-hidden="true" />Cuenta verificada por el administrador</> : 'Cuenta sin verificar'}</p></div></header>
    <p className="people-bio">{person.bio || 'Esta cuenta aún no ha añadido una presentación.'}</p><dl className="people-details"><div><dt>Nivel declarado</dt><dd>{person.level === 'professional' ? 'Profesional' : 'Amateur'}</dd></div>{person.position && <div><dt>Posición o función</dt><dd>{person.position}</dd></div>}{person.team && <div><dt>Equipo declarado</dt><dd>{person.team}</dd></div>}</dl><p className="people-window">La información deportiva la declara esta cuenta. La verificación de identidad no certifica sus logros.</p>
    <RelationshipCounts id={person.id} /><div className="people-actions"><FollowButton target={person} /><button className="people-button people-button-secondary" onClick={() => void share()}><Share2 size={17} aria-hidden="true" />Compartir perfil</button></div><p role="status" className="people-share-status">{shareStatus}</p>{shareFallback && <label className="people-share-fallback">Enlace público<input readOnly value={shareFallback} onFocus={event => event.target.select()} /></label>}
    <section className="people-activity" aria-labelledby="profile-posts"><h2 id="profile-posts">Publicaciones</h2><ul>{publications.records.map(post => { const mediaUrl = posts.find(item => item.id === post.id)?.mediaUrl || post.mediaUrl; return <li key={post.id} className="people-post"><div className="people-meta">{post.kind === 'achievement' ? 'Logro declarado' : post.kind === 'reel' ? 'Reel' : 'Foto'} · <time dateTime={post.createdAt}>{dateLabel(post.createdAt)}</time></div>{post.title && <h3>{post.title}</h3>}<p>{post.text}</p>{mediaUrl && post.kind === 'photo' && <img src={mediaUrl} alt={post.title || 'Foto publicada por esta cuenta'} loading="lazy" />}{mediaUrl && post.kind === 'reel' && <video controls preload="none" src={mediaUrl} aria-label={`Reel de ${person.name}`} />}{post.eventId && <Link to={`/play/${encodeURIComponent(post.eventId)}`}>Ver evento relacionado</Link>}<Link to={`/feed?post=${encodeURIComponent(post.id)}`}>Abrir en Comunidad <ArrowRight size={15} aria-hidden="true" /></Link></li>; })}</ul><ActivityFooter activity={publications} noun="publicaciones" /></section>
    <section className="people-activity" aria-labelledby="profile-events"><h2 id="profile-events">Eventos organizados</h2><ul>{organized.records.map(event => <li key={event.id} className="people-event"><div><span className="people-meta">{event.type === 'match' ? 'Partido' : 'Torneo'} · {event.status === 'open' ? 'Inscripciones abiertas' : event.status === 'closed' ? 'Inscripciones cerradas' : 'Cancelado'}</span><h3><Link to={`/play/${encodeURIComponent(event.id)}`}>{event.title}</Link></h3><p>{event.city}, {event.country} · <time dateTime={event.startAt}>{new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short', timeZone: event.timeZone }).format(new Date(event.startAt))}</time> ({event.timeZone})</p></div><Link className="people-event-link" to={`/play/${encodeURIComponent(event.id)}`} aria-label={`Ver ${event.title}`}><ArrowRight size={22} aria-hidden="true" /></Link></li>)}</ul><ActivityFooter activity={organized} noun="eventos" /></section>
  </section>;
}
export default function PeoplePages() { const { profileId } = useParams(); return profileId ? <PublicProfilePage key={profileId} /> : <PeoplePage />; }
