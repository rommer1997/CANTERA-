import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Clock3, Flag, MapPin, Plus, Search, Share2, ShieldCheck, SlidersHorizontal, Trophy, Users, X } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useCommunity } from './CommunityContext';
import { standings, zonedDateTimeToIso } from './logic';
import { normalizeEvent } from './normalization';
import type { EventInput, Fixture, PlayEvent } from './types';
import './events.css';

const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const timeZones = [...new Set([browserTimeZone, 'UTC', ...(typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Africa/Cairo', 'Africa/Johannesburg', 'America/Argentina/Buenos_Aires', 'America/Bogota', 'America/Lima', 'America/Los_Angeles', 'America/Mexico_City', 'America/New_York', 'America/Santiago', 'America/Sao_Paulo', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'Europe/London', 'Europe/Madrid', 'Europe/Paris', 'Pacific/Auckland'])])].sort();
const formatDate = (date: string, timeZone = browserTimeZone) => new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone }).format(new Date(date));
const formatTime = (date: string, timeZone = browserTimeZone) => new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(date));
const levelLabel = (level: PlayEvent['level']) => level === 'professional' ? 'Profesional' : 'Amateur';
const entryLabel = (event: PlayEvent) => event.entry === 'teams' ? 'equipos' : 'jugadores';
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'No hemos podido completar la acción. Vuelve a intentarlo.';
const statusLabel = (event: PlayEvent) => event.status === 'cancelled' ? 'Cancelado' : Date.parse(event.startAt) < Date.now() ? 'Fecha pasada' : event.status === 'closed' ? 'Inscripción cerrada' : Object.keys(event.participants).length >= event.capacity ? 'Completo' : 'Inscripción abierta';
const invitationUrl = (id: string) => `${window.location.origin}${window.location.pathname}#/play/${id}`;
const locationKey = (value: string) => value.trim().normalize('NFKC').toLocaleLowerCase('es');
const locationOptions = (values: string[]) => [...new Map(values.filter(Boolean).map(value => [locationKey(value), value])).values()].sort((a, b) => a.localeCompare(b));
const queryLocation = (value: string | null, limit: number) => (value || '').trim().slice(0, limit);

function initialDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(18, 0, 0, 0);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function CreateEvent({ onClose, initialType }: { onClose: () => void; initialType: EventInput['type'] }) {
  const { profile, createEvent } = useCommunity();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventInput['type']>(initialType);
  const [entry, setEntry] = useState<EventInput['entry']>(initialType === 'tournament' ? 'teams' : 'players');
  const [format, setFormat] = useState<EventInput['format']>('7');
  const [level, setLevel] = useState<EventInput['level']>(profile?.level || 'amateur');
  const [city, setCity] = useState(profile?.city || '');
  const [country, setCountry] = useState(profile?.country || '');
  const [timeZone, setTimeZone] = useState(browserTimeZone);
  const [venue, setVenue] = useState('');
  const [startAt, setStartAt] = useState(initialDate);
  const [capacity, setCapacity] = useState(initialType === 'tournament' ? '8' : '14');
  const [tournamentFormat, setTournamentFormat] = useState<EventInput['tournamentFormat']>('league');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const maxCapacity = type === 'tournament' ? 32 : 64;
  const modalRef = useRef<HTMLDialogElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const savingRef = useRef(saving);
  const closeRef = useRef(onClose);
  savingRef.current = saving;
  closeRef.current = onClose;

  useEffect(() => {
    const dialog = modalRef.current;
    if (!dialog) return;
    const active = document.activeElement;
    const triggers = [
      active instanceof HTMLElement && active !== document.body && !active.closest('dialog') ? active : null,
      document.querySelector<HTMLElement>('.c-bottom-create'),
      document.querySelector<HTMLElement>('.ce-workspace-header button'),
    ];
    restoreFocusRef.current = triggers.find(element => element?.isConnected && element.getClientRects().length > 0) || null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();
    let focusFrame = 0;
    // The creation selector may restore its own focus as it closes. Refocus
    // after that transition while the native dialog keeps the page inert.
    const openFrame = requestAnimationFrame(() => {
      focusFrame = requestAnimationFrame(() => {
        if (dialog.open) titleInputRef.current?.focus({ preventScroll: true });
      });
    });
    return () => {
      cancelAnimationFrame(openFrame);
      cancelAnimationFrame(focusFrame);
      if (dialog.open) dialog.close();
      document.body.style.overflow = previous;
      const trigger = restoreFocusRef.current;
      requestAnimationFrame(() => {
        if (!document.querySelector('dialog[open]') && trigger?.isConnected && trigger.getClientRects().length > 0) trigger.focus({ preventScroll: true });
      });
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const parsedCapacity = Number(capacity);
    let parsedDate: Date;
    try { parsedDate = new Date(zonedDateTimeToIso(startAt, timeZone)); } catch (error) { setError(errorMessage(error)); return; }
    if (title.trim().length < 3) { setError('Escribe un título de al menos 3 caracteres.'); return; }
    if (!country.trim() || !city.trim() || !venue.trim()) { setError('Indica el país, la ciudad y el lugar del encuentro.'); return; }
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.getTime() <= Date.now()) { setError('Elige una fecha y hora futuras.'); return; }
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 2 || parsedCapacity > maxCapacity) { setError(`El aforo debe ser un número entero entre 2 y ${maxCapacity}.`); return; }
    setSaving(true);
    try {
      const id = await createEvent({ title: title.trim(), type, entry, format, level, country: country.trim(), timeZone, city: city.trim(), venue: venue.trim(), startAt: parsedDate.toISOString(), capacity: parsedCapacity, tournamentFormat, description: description.trim() });
      onClose();
      navigate(`/play/${id}`);
    } catch (error) { setError(errorMessage(error)); } finally { setSaving(false); }
  }

  return <dialog ref={modalRef} className="ce-modal-backdrop" aria-labelledby="ce-create-title" onCancel={event => { event.preventDefault(); if (!savingRef.current) closeRef.current(); }} onClose={() => { if (!modalRef.current?.open) closeRef.current(); }} onClick={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <section className="ce-modal" onClick={event => event.stopPropagation()}>
      <div className="ce-modal-heading"><div><span className="c-eyebrow">Nuevo encuentro</span><h2 id="ce-create-title">{type === 'tournament' ? 'Crear torneo' : 'Crear partido'}</h2></div><button className="ce-icon-button" type="button" aria-label="Cerrar formulario" onClick={onClose} disabled={saving}><X size={22} /></button></div>
      <p className="ce-form-intro">Publicar, invitar y gestionar inscripciones en Cantera es gratis. Acordad directamente cualquier coste del campo.</p>
      <form className="ce-form" onSubmit={submit}>
        <label className="ce-field ce-full">Nombre del encuentro<input ref={titleInputRef} autoFocus aria-label="Nombre del encuentro" className="c-input" maxLength={100} placeholder="Por ejemplo: Partido del domingo" value={title} onChange={event => setTitle(event.target.value)} required minLength={3} /></label>
        <fieldset className="ce-choice-field ce-full"><legend>Tipo de encuentro</legend><div className="ce-type-choices">{(['match', 'tournament'] as const).map(value => <button type="button" key={value} className={`ce-type-choice ${type === value ? 'active' : ''}`} aria-pressed={type === value} onClick={() => { setType(value); setEntry(value === 'tournament' ? 'teams' : 'players'); setCapacity(value === 'tournament' ? '8' : '14'); }}>{value === 'match' ? <Flag size={23} /> : <Trophy size={23} />}<span>{value === 'match' ? 'Partido' : 'Torneo'}<small>{value === 'match' ? 'Convocatoria para jugadores o equipos.' : 'Liga o eliminatoria, hasta 32 inscripciones.'}</small></span>{type === value && <Check size={17} />}</button>)}</div></fieldset>
        <div className="ce-form-section ce-full"><h3>Dónde y cuándo</h3></div>
        <label className="ce-field">País<input aria-label="País" className="c-input" maxLength={100} placeholder="País del encuentro" value={country} onChange={event => setCountry(event.target.value)} required /></label>
        <label className="ce-field">Ciudad<input aria-label="Ciudad" className="c-input" maxLength={80} placeholder="Ciudad del encuentro" value={city} onChange={event => setCity(event.target.value)} required /></label>
        <label className="ce-field">Campo o punto de encuentro<input aria-label="Campo o punto de encuentro" className="c-input" maxLength={160} placeholder="Nombre y dirección del campo" value={venue} onChange={event => setVenue(event.target.value)} required /></label>
        <label className="ce-field">Fecha y hora del encuentro<input aria-label="Fecha y hora del encuentro" className="c-input" type="datetime-local" value={startAt} onChange={event => setStartAt(event.target.value)} required /></label>
        <label className="ce-field ce-full">Zona horaria del campo<select aria-label="Zona horaria del campo" className="c-input" value={timeZone} onChange={event => setTimeZone(event.target.value)}>{timeZones.map(zone => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}</select><small className="ce-optional">La fecha se interpreta en esta zona horaria para que todos lleguen a la misma hora.</small></label>
        <div className="ce-form-section ce-full"><h3>Convocatoria</h3></div>
        <label className="ce-field">Formato<select aria-label="Formato" className="c-input" value={format} onChange={event => setFormat(event.target.value as EventInput['format'])}><option value="5">Fútbol 5</option><option value="7">Fútbol 7</option><option value="11">Fútbol 11</option></select></label>
        <label className="ce-field">Nivel<select aria-label="Nivel" className="c-input" value={level} onChange={event => setLevel(event.target.value as EventInput['level'])}><option value="amateur">Amateur</option><option value="professional">Profesional</option></select></label>
        <label className="ce-field">Inscripción por<select aria-label="Inscripción por" className="c-input" value={entry} onChange={event => { setEntry(event.target.value as EventInput['entry']); setCapacity(event.target.value === 'teams' ? '8' : '14'); }}><option value="players">Jugador individual</option><option value="teams">Equipo o grupo</option></select></label>
        <label className="ce-field">Aforo de {entry === 'teams' ? 'equipos' : 'jugadores'}<input aria-label={`Aforo de ${entry === 'teams' ? 'equipos' : 'jugadores'}`} className="c-input" type="number" min={2} max={maxCapacity} step={1} value={capacity} onChange={event => setCapacity(event.target.value)} required /></label>
        {type === 'tournament' && <label className="ce-field">Sistema del torneo<select aria-label="Sistema del torneo" className="c-input" value={tournamentFormat} onChange={event => setTournamentFormat(event.target.value as EventInput['tournamentFormat'])}><option value="league">Liga: todos contra todos</option><option value="knockout">Eliminatoria directa</option></select></label>}
        {type === 'tournament' && <p className="ce-helper ce-full">En esta beta, los torneos admiten de 2 a 32 participantes. Los partidos admiten hasta 64 inscripciones.</p>}
        <label className="ce-field ce-full">Información para participantes <span className="ce-optional">Opcional</span><textarea aria-label="Información para participantes" className="c-input" rows={3} maxLength={2000} placeholder="Qué llevar, reglas del encuentro, cómo llegar y costes del campo si los hay…" value={description} onChange={event => setDescription(event.target.value)} /></label>
        {error && <p className="c-error ce-full" role="alert">{error}</p>}
        <div className="ce-form-footer ce-full"><span><ShieldCheck size={17} /> Los detalles publicados serán visibles para todos.</span><button className="c-button" type="submit" disabled={saving}>{saving ? 'Publicando…' : 'Publicar encuentro'}<ArrowRight size={17} /></button></div>
      </form>
    </section>
  </dialog>;
}

function EventCard({ event }: { event: PlayEvent }) {
  const { profile } = useCommunity();
  const count = Object.keys(event.participants).length;
  const percentage = Math.min(100, (count / event.capacity) * 100);
  const date = new Date(event.startAt);
  const day = new Intl.DateTimeFormat('es', { day: 'numeric', timeZone: event.timeZone }).format(date);
  const month = new Intl.DateTimeFormat('es', { month: 'short', timeZone: event.timeZone }).format(date).replace('.', '');
  const isOwner = profile?.id === event.ownerId;
  const hasJoined = !!profile && Object.hasOwn(event.participants, profile.id);
  return <Link className={`ce-event-card ${event.status === 'cancelled' ? 'ce-cancelled' : ''}`} to={`/play/${event.id}`}>
    <time className="ce-card-date" dateTime={event.startAt} aria-label={`${formatDate(event.startAt, event.timeZone)}, ${formatTime(event.startAt, event.timeZone)}`}><strong>{day}</strong><span>{month}</span><small>{formatTime(event.startAt, event.timeZone)}</small></time>
    <div className="ce-card-body"><div className="ce-card-meta"><span>{event.type === 'tournament' ? 'Torneo' : 'Partido'} · Fútbol {event.format}</span><span>{levelLabel(event.level)}</span>{event.type === 'tournament' && <span>{event.tournamentFormat === 'league' ? 'Liga' : 'Eliminatoria'}</span>}</div><h3>{event.title}</h3><p><MapPin size={15} aria-hidden="true" /><span>{event.city}, {event.country} · {event.venue}</span></p><div className="ce-card-footer"><span>{isOwner ? 'Organizas este encuentro' : hasJoined ? 'Estás inscrito' : `Por ${event.ownerName}`}</span><span>Ver encuentro<ArrowUpRightIcon /></span></div></div>
    <div className="ce-card-summary"><span className={`ce-status ${event.status !== 'open' || count >= event.capacity || Date.parse(event.startAt) < Date.now() ? 'ce-status-muted' : ''}`}>{statusLabel(event)}</span><div className="ce-card-occupancy"><span>{count} / {event.capacity} {entryLabel(event)}</span><div className="ce-progress-track"><span style={{ width: `${percentage}%` }} /></div></div></div>
  </Link>;
}

function ArrowUpRightIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

function MatchResult({ event, fixture, isOwner }: { event: PlayEvent; fixture: Fixture; isOwner: boolean }) {
  const { saveScore } = useCommunity();
  const [home, setHome] = useState(fixture.homeScore === null ? '' : String(fixture.homeScore));
  const [away, setAway] = useState(fixture.awayScore === null ? '' : String(fixture.awayScore));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const homeName = event.participants[fixture.homeId] || 'Por definir';
  const awayName = fixture.awayId ? event.participants[fixture.awayId] || 'Por definir' : 'Pase libre';
  const editable = isOwner && event.status !== 'cancelled' && !!fixture.awayId && !(event.tournamentFormat === 'knockout' && event.fixtures.some(item => item.round > fixture.round));
  useEffect(() => { setHome(fixture.homeScore === null ? '' : String(fixture.homeScore)); setAway(fixture.awayScore === null ? '' : String(fixture.awayScore)); }, [fixture.homeScore, fixture.awayScore]);
  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault();
    setError(''); setSaved(false);
    const homeScore = Number(home); const awayScore = Number(away);
    if (home === '' || away === '' || !Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0 || homeScore > 99 || awayScore > 99) { setError('Introduce dos resultados enteros entre 0 y 99.'); return; }
    if (event.tournamentFormat === 'knockout' && homeScore === awayScore) { setError('En eliminatoria debe haber un ganador. Incluye los goles del desempate.'); return; }
    setSaving(true);
    try { await saveScore(event.id, fixture.id, homeScore, awayScore); setSaved(true); } catch (error) { setError(errorMessage(error)); } finally { setSaving(false); }
  }
  return <div className="ce-fixture-wrap"><form className="ce-fixture" onSubmit={submit}><span className="ce-team-name">{homeName}</span>{editable ? <div className="ce-score-inputs"><input type="number" min="0" max="99" step="1" aria-label={`Goles de ${homeName}`} value={home} onChange={change => { setHome(change.target.value); setSaved(false); }} /><span>–</span><input type="number" min="0" max="99" step="1" aria-label={`Goles de ${awayName}`} value={away} onChange={change => { setAway(change.target.value); setSaved(false); }} /></div> : <strong className="ce-score-view">{!fixture.awayId ? <Check size={16} aria-label="Clasificado por pase libre" /> : <>{fixture.homeScore ?? '–'}<span>:</span>{fixture.awayScore ?? '–'}</>}</strong>}<span className="ce-team-name ce-away-team">{awayName}</span>{editable && <button type="submit" className="ce-score-save" disabled={saving} aria-label={`Guardar resultado de ${homeName} contra ${awayName}`}>{saving ? '…' : saved ? <Check size={16} /> : 'Guardar'}</button>}</form>{error && <p className="c-error ce-score-error" role="alert">{error}</p>}{saved && <span className="ce-score-feedback" role="status">Resultado guardado.</span>}</div>;
}

function downloadCalendar(event: PlayEvent) {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const start = new Date(event.startAt);
  const end = new Date(start.getTime() + 90 * 60_000);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cantera//Encuentros//ES', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${event.id}@cantera`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escape(event.title)}`, `LOCATION:${escape(`${event.venue}, ${event.city}, ${event.country}`)}`, `DESCRIPTION:${escape(`${event.description}\n${invitationUrl(event.id)}\nZona horaria: ${event.timeZone}. Duración orientativa: 90 minutos. Confirmar con la organización.`)}`, `STATUS:${event.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`, 'END:VEVENT', 'END:VCALENDAR'];
  const fold = (line: string) => {
    const encoder = new TextEncoder();
    let result = ''; let size = 0;
    for (const char of line) {
      const bytes = encoder.encode(char).length;
      if (size + bytes > 73) { result += '\r\n '; size = 1; }
      result += char; size += bytes;
    }
    return result;
  };
  const url = URL.createObjectURL(new Blob([`${lines.map(fold).join('\r\n')}\r\n`], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `cantera-${event.id}.ics`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function EventDetail({ event }: { event: PlayEvent }) {
  const { hash } = useLocation();
  const { profile, mode, joinEvent, leaveEvent, addGuest, setEventStatus, generateFixtures } = useCommunity();
  const [joinName, setJoinName] = useState(event.entry === 'teams' ? profile?.team || '' : profile?.name || '');
  const [guestName, setGuestName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const isOwner = profile?.id === event.ownerId;
  const hasJoined = !!profile && Object.hasOwn(event.participants, profile.id);
  const entries = Object.entries(event.participants);
  const full = entries.length >= event.capacity;
  const inPast = new Date(event.startAt).getTime() < Date.now();
  const table = useMemo(() => standings(event), [event]);
  const rounds = [...new Set(event.fixtures.map(fixture => fixture.round))].sort((a, b) => a - b);
  const winnerFixture = event.tournamentFormat === 'knockout' && event.fixtures.length ? event.fixtures.filter(fixture => fixture.round === Math.max(...rounds)) : [];
  const winner = winnerFixture.length === 1 && winnerFixture[0].homeScore !== null && winnerFixture[0].awayScore !== null && event.fixtures.length >= entries.length - 1 ? event.participants[winnerFixture[0].homeScore > winnerFixture[0].awayScore ? winnerFixture[0].homeId : winnerFixture[0].awayId] : null;

  useEffect(() => { setJoinName(event.entry === 'teams' ? profile?.team || '' : profile?.name || ''); }, [profile?.name, profile?.team, event.entry]);
  useEffect(() => { setCancelConfirm(false); }, [event.status]);
  function focusSection(sectionId: string) {
    requestAnimationFrame(() => {
      const section = document.getElementById(sectionId);
      if (!section) return;
      section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      section.focus({ preventScroll: true });
    });
  }
  useEffect(() => {
    if (['#ce-info', '#ce-participants', '#ce-competition', '#ce-standings'].includes(hash)) focusSection(hash.slice(1));
  }, [hash]);

  async function action(key: string, run: () => Promise<unknown>, success: string) {
    setBusy(key); setError(''); setMessage('');
    try { await run(); setMessage(success); } catch (error) { setError(errorMessage(error)); } finally { setBusy(''); }
  }
  async function join(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (joinName.trim().length < 2) { setError(`Escribe un nombre de ${event.entry === 'teams' ? 'equipo' : 'jugador'} de al menos 2 caracteres.`); return; }
    await action('join', () => joinEvent(event.id, joinName.trim()), 'Inscripción confirmada. ¡Nos vemos en el campo!');
  }
  async function guest(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (guestName.trim().length < 2) { setError('Escribe un nombre de al menos 2 caracteres para tu invitado.'); return; }
    await action('guest', async () => { await addGuest(event.id, guestName.trim()); setGuestName(''); }, 'Invitado añadido a la lista.');
  }
  async function copyInvite() {
    setError(''); setMessage('');
    try { await navigator.clipboard.writeText(invitationUrl(event.id)); setMessage('Enlace de invitación copiado. Compártelo con tu grupo.'); } catch { setError('No se pudo copiar el enlace. Puedes copiar la dirección de esta página desde el navegador.'); }
  }

  return <div className="ce-detail">
    <Link to="/play" className="ce-back-link"><ArrowLeft size={17} />Volver a Juega</Link>
    <header className="ce-detail-header"><div className="ce-detail-tags"><span>{event.type === 'tournament' ? <Trophy size={15} /> : <Flag size={15} />}{event.type === 'tournament' ? 'Torneo' : 'Partido'}</span><span>Fútbol {event.format}</span><span>{levelLabel(event.level)}</span>{isOwner && <span className="ce-owner-tag">Tu encuentro</span>}</div><div className="ce-detail-title"><h1>{event.title}</h1><span className="ce-detail-status">{statusLabel(event)}</span></div><p>Organizado por <strong>{event.ownerName}</strong></p><div className="ce-detail-location"><span><MapPin size={17} aria-hidden="true" />{event.city}, {event.country}</span><span><CalendarDays size={17} aria-hidden="true" />{formatDate(event.startAt, event.timeZone)} · {formatTime(event.startAt, event.timeZone)}</span></div></header>
    {mode === 'demo' && <p className="ce-demo-note">Este encuentro se guarda sólo en este navegador de prueba. Las invitaciones y las inscripciones de otras personas estarán disponibles cuando el servicio esté publicado.</p>}
    {error && <div className="c-error" role="alert">{error}</div>}{message && <div className="ce-success" role="status"><Check size={18} />{message}</div>}
    <nav className="ce-detail-nav" aria-label="Secciones del encuentro">
      {[{ id: 'ce-info', label: 'Información' }, { id: 'ce-participants', label: `Participantes (${entries.length})` }, ...(event.type === 'tournament' ? [{ id: 'ce-competition', label: 'Cruces y resultados' }] : []), ...(event.type === 'tournament' && event.tournamentFormat === 'league' && event.fixtures.length ? [{ id: 'ce-standings', label: 'Clasificación' }] : [])].map(section => <Link key={section.id} to={{ pathname: `/play/${event.id}`, hash: `#${section.id}` }} aria-current={hash === `#${section.id}` || !hash && section.id === 'ce-info' ? 'location' : undefined} onClick={() => focusSection(section.id)}>{section.label}</Link>)}
    </nav>
    <div className="ce-detail-grid"><div className="ce-detail-main">
      <section id="ce-info" tabIndex={-1} aria-labelledby="ce-info-title" className="c-panel ce-about"><h2 id="ce-info-title">Datos del encuentro</h2><div className="ce-info-grid"><div><MapPin size={20} aria-hidden="true" /><span>Lugar<strong>{event.venue}</strong><small>{event.city}, {event.country}</small></span></div><div><Users size={20} aria-hidden="true" /><span>Inscripción<strong>{event.entry === 'teams' ? 'Equipos y grupos' : 'Jugadores individuales'}</strong><small>Hasta {event.capacity} {entryLabel(event)}</small></span></div><div><Clock3 size={20} aria-hidden="true" /><span>Inicio<strong>{formatTime(event.startAt, event.timeZone)}</strong><small>{formatDate(event.startAt, event.timeZone)} · {event.timeZone}</small></span></div>{event.type === 'tournament' && <div><Trophy size={20} aria-hidden="true" /><span>Sistema<strong>{event.tournamentFormat === 'league' ? 'Liga a una vuelta' : 'Eliminatoria directa'}</strong><small>{event.tournamentFormat === 'league' ? 'Todos contra todos' : 'Avanza el ganador de cada cruce'}</small></span></div>}</div>{event.description && <div className="ce-description"><h3>Información de la organización</h3><p>{event.description}</p></div>}<div className="ce-free-note"><ShieldCheck size={18} aria-hidden="true" /><span><strong>Organización gratuita en Cantera.</strong> Campo, desplazamiento y material se acuerdan con la organización.</span></div></section>
      <section id="ce-participants" tabIndex={-1} aria-labelledby="ce-participants-title" className="c-panel ce-participants"><div className="ce-section-heading"><h2 id="ce-participants-title">{event.entry === 'teams' ? 'Equipos inscritos' : 'Participantes'}</h2><span className="ce-count">{entries.length} / {event.capacity}</span></div>{entries.length ? <ul className="ce-participant-list">{entries.map(([id, name], index) => <li key={id}><span className="ce-avatar" aria-hidden="true">{name.trim().slice(0, 2).toUpperCase()}</span><span><strong>{name}</strong><small>{id === profile?.id ? 'Tu inscripción' : id.startsWith('guest_') || id.startsWith('guest-') ? 'Invitado por la organización' : `Inscripción ${String(index + 1).padStart(2, '0')}`}</small></span>{id === profile?.id && <span className="ce-you">Tú</span>}</li>)}</ul> : <div className="ce-inline-empty"><Users size={24} aria-hidden="true" /><p>Aún no hay inscripciones.<span>Comparte la invitación para completar la convocatoria.</span></p></div>}{isOwner && event.status === 'open' && !full && !event.fixtures.length && !inPast && <form className="ce-guest-form" onSubmit={guest}><label htmlFor="ce-guest">Añadir {event.entry === 'teams' ? 'equipo' : 'jugador'} invitado</label><div><input id="ce-guest" aria-label={`Añadir ${event.entry === 'teams' ? 'equipo' : 'jugador'} invitado`} className="c-input" placeholder={event.entry === 'teams' ? 'Nombre del equipo' : 'Nombre del invitado'} value={guestName} maxLength={80} required minLength={2} onChange={change => setGuestName(change.target.value)} /><button type="submit" className="c-button secondary" disabled={!!busy}>{busy === 'guest' ? 'Añadiendo…' : 'Añadir'}<Plus size={16} /></button></div><small>Para personas o equipos que todavía no tienen cuenta.</small></form>}</section>
      {event.type === 'tournament' && <section id="ce-competition" tabIndex={-1} aria-labelledby="ce-competition-title" className="c-panel ce-competition"><div className="ce-section-heading"><h2 id="ce-competition-title">Cruces y resultados</h2><Trophy size={22} aria-hidden="true" /></div><p className="ce-section-intro">Cruces por {event.tournamentFormat === 'league' ? 'jornada' : 'ronda'}. Los horarios de cada partido se acuerdan con la organización.</p>{!event.fixtures.length ? <div className="ce-inline-empty"><CalendarDays size={28} /><p>Todavía no se han generado los cruces.<span>{isOwner ? 'Con 2–32 inscripciones puedes generar los cruces. Esta acción cierra la convocatoria y fija los participantes.' : 'La organización publicará los cruces cuando esté lista la convocatoria.'}</span></p></div> : <div className="ce-rounds">{rounds.map(round => <div key={round} className="ce-round"><h3>{event.tournamentFormat === 'league' ? 'Jornada' : 'Ronda'} {round}</h3>{event.fixtures.filter(fixture => fixture.round === round).map(fixture => <MatchResult key={fixture.id} event={event} fixture={fixture} isOwner={isOwner} />)}</div>)}</div>}{winner && <div className="ce-winner"><Trophy size={24} /><span>Campeón<strong>{winner}</strong></span></div>}{isOwner && event.status !== 'cancelled' && !event.fixtures.length && <button className="c-button secondary ce-generate-button" disabled={!!busy || entries.length < 2 || entries.length > 32} onClick={() => action('fixtures', () => generateFixtures(event.id), 'Calendario actualizado. Las inscripciones están cerradas.')}>{busy === 'fixtures' ? 'Generando…' : 'Generar calendario'}<ChevronRight size={17} /></button>}{entries.length > 32 && !event.fixtures.length && <p className="ce-helper">El calendario automático admite hasta 32 participantes en esta beta.</p>}{event.tournamentFormat === 'knockout' && event.fixtures.length > 0 && isOwner && <p className="ce-helper">La siguiente ronda se crea al guardar todos los resultados de la ronda actual. Los pases libres avanzan automáticamente. En eliminatoria no se permiten empates.</p>}</section>}
      {event.type === 'tournament' && event.tournamentFormat === 'league' && event.fixtures.length > 0 && <section id="ce-standings" tabIndex={-1} aria-labelledby="ce-standings-title" className="c-panel ce-standings"><h2 id="ce-standings-title">Clasificación</h2><div className="ce-table-scroll"><table><caption className="ce-sr-only">Clasificación de {event.title}</caption><thead><tr><th scope="col">Pos.</th><th scope="col">{event.entry === 'teams' ? 'Equipo' : 'Jugador'}</th><th scope="col"><abbr title="Partidos jugados">PJ</abbr></th><th scope="col"><abbr title="Partidos ganados">G</abbr></th><th scope="col"><abbr title="Partidos empatados">E</abbr></th><th scope="col"><abbr title="Partidos perdidos">P</abbr></th><th scope="col"><abbr title="Diferencia de goles">DG</abbr></th><th scope="col">Pts</th></tr></thead><tbody>{table.map((standing, index) => <tr key={standing.id}><td>{index + 1}</td><th scope="row">{standing.name}</th><td>{standing.played}</td><td>{standing.won}</td><td>{standing.drawn}</td><td>{standing.lost}</td><td>{standing.goalsFor - standing.goalsAgainst}</td><td><strong>{standing.points}</strong></td></tr>)}</tbody></table></div><p className="ce-helper">Victoria: 3 puntos · Empate: 1 · Derrota: 0. Resultados registrados por la organización.</p></section>}
    </div><aside className="ce-detail-aside"><section className="c-panel ce-join-panel"><span className="c-eyebrow">Tu inscripción</span><h2>{event.status === 'cancelled' ? 'Encuentro cancelado.' : hasJoined ? 'Estás en la lista.' : inPast ? 'La fecha ha pasado.' : full ? 'Convocatoria completa.' : event.status === 'closed' ? 'Inscripción cerrada.' : 'Inscríbete al encuentro.'}</h2><p>{event.status === 'cancelled' ? 'Las inscripciones han quedado sin efecto.' : hasJoined ? `Tu plaza para ${event.participants[profile!.id]} está confirmada.` : `${Math.max(0, event.capacity - entries.length)} plazas disponibles de ${event.capacity} ${entryLabel(event)}.`}</p><div className="ce-progress-track ce-detail-progress"><span style={{ width: `${Math.min(100, entries.length / event.capacity * 100)}%` }} /></div>{hasJoined ? <div className="ce-joined"><div><Check size={18} />{event.status === 'cancelled' ? 'Encuentro cancelado' : 'Inscripción confirmada'}</div>{event.status !== 'cancelled' && !event.fixtures.length && !inPast && <button className="ce-text-button" disabled={!!busy} onClick={() => action('leave', () => leaveEvent(event.id), 'Has dejado tu plaza disponible.')}>{busy === 'leave' ? 'Cancelando…' : 'Cancelar mi inscripción'}</button>}</div> : event.status === 'open' && !full && !inPast ? profile ? <form onSubmit={join} className="ce-join-form"><label htmlFor="ce-join-name">{event.entry === 'teams' ? 'Nombre de tu equipo o grupo' : 'Nombre en la convocatoria'}</label><input aria-label={event.entry === 'teams' ? 'Nombre de tu equipo o grupo' : 'Nombre en la convocatoria'} className="c-input" id="ce-join-name" value={joinName} maxLength={80} minLength={2} required onChange={change => setJoinName(change.target.value)} /><button className="c-button" disabled={!!busy} type="submit">{busy === 'join' ? 'Confirmando…' : event.entry === 'teams' ? 'Inscribir mi equipo' : 'Apuntarme'}<ArrowRight size={18} /></button></form> : <Link className="c-button" to="/profile">Crea tu perfil para apuntarte<ArrowRight size={17} /></Link> : <p className="ce-registration-state">{event.status === 'cancelled' ? 'La organización ha cancelado este encuentro.' : inPast ? 'La fecha de este encuentro ya ha pasado.' : full ? 'No quedan plazas disponibles.' : 'La organización ha cerrado las inscripciones.'}</p>}<div className="ce-join-bottom"><ShieldCheck size={15} />Inscripción gratuita en Cantera</div></section>{isOwner && <section className="c-panel ce-manage-panel"><span className="c-eyebrow">Organización</span><h3>Gestiona la convocatoria</h3>{<button className="c-button secondary" disabled={!!busy || (event.status !== 'open' && (event.fixtures.length > 0 || inPast))} onClick={() => action('status', () => setEventStatus(event.id, event.status === 'open' ? 'closed' : 'open'), event.status === 'open' ? 'Inscripciones cerradas.' : 'Inscripciones abiertas.')}>{busy === 'status' ? 'Actualizando…' : event.status === 'open' ? 'Cerrar inscripciones' : event.status === 'cancelled' ? 'Reactivar encuentro' : 'Reabrir inscripciones'}</button>}{event.fixtures.length > 0 && <p className="ce-helper">El calendario fija los participantes del torneo.</p>}{event.status !== 'cancelled' && !cancelConfirm && <button className="ce-text-button ce-danger" disabled={!!busy} onClick={() => setCancelConfirm(true)}>Cancelar encuentro</button>}{cancelConfirm && event.status !== 'cancelled' && <div className="ce-cancel-confirm"><p>El encuentro dejará de aceptar inscripciones y se marcará como cancelado.</p><button className="ce-danger-button" disabled={!!busy} onClick={() => action('cancel', () => setEventStatus(event.id, 'cancelled'), 'Encuentro cancelado.')}>{busy === 'cancel' ? 'Cancelando…' : 'Confirmar cancelación'}</button><button className="ce-text-button" disabled={!!busy} onClick={() => setCancelConfirm(false)}>Mantener encuentro</button></div>}{event.status === 'cancelled' && <p className="ce-helper">Este encuentro está cancelado. Puedes reactivarlo si su fecha es futura y no tiene un calendario generado.</p>}</section>}<section className="c-panel ce-share-panel"><h3>Invitación y agenda</h3><p>Comparte el enlace con tu grupo o descarga la fecha del encuentro.</p><button className="c-button secondary" type="button" onClick={copyInvite}><Share2 size={17} />Copiar invitación</button><button className="ce-calendar-button" type="button" onClick={() => downloadCalendar(event)}><ArrowDownToLine size={17} />Descargar agenda (.ics)</button><small>Un evento de 90 minutos orientativos. Confirma la duración con la organización.</small></section></aside></div>
  </div>;
}

export default function EventsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedType = searchParams.get('type');
  const requestedCreate = searchParams.get('create') === '1';
  const country = queryLocation(searchParams.get('country'), 100);
  const city = queryLocation(searchParams.get('city'), 80);
  const type = requestedType === 'match' || requestedType === 'tournament' ? requestedType : 'all';
  const view = searchParams.get('view') === 'mine' ? 'mine' : 'explore';
  const { events, loading, profile, mode } = useCommunity();
  const listedEvent = eventId ? events.find(item => item.id === eventId) : undefined;
  const hasListedEvent = !!listedEvent;
  const [directEvent, setDirectEvent] = useState<{ id: string; event: PlayEvent | null; loading: boolean; error: string } | null>(null);
  const [eventRetry, setEventRetry] = useState(0);
  const [creating, setCreating] = useState(false);
  const [creationType, setCreationType] = useState<EventInput['type']>('match');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [level, setLevel] = useState('all');
  const [onlyOpen, setOnlyOpen] = useState(() => searchParams.get('view') !== 'mine');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!eventId || mode !== 'cloud' || hasListedEvent) { setDirectEvent(null); return; }
    if (eventId.length > 128 || /[\/\\\u0000-\u001f\u007f]/.test(eventId) || ['.', '..', '__proto__', 'constructor', 'prototype'].includes(eventId)) {
      setDirectEvent({ id: eventId, event: null, loading: false, error: '' }); return;
    }
    let active = true;
    setDirectEvent({ id: eventId, event: null, loading: true, error: '' });
    const stop = onSnapshot(doc(db, 'communityEvents', eventId), snapshot => {
      if (!active) return;
      const current = snapshot.exists() ? normalizeEvent(snapshot.data(), snapshot.id) : null;
      setDirectEvent({ id: eventId, event: current, loading: false, error: snapshot.exists() && !current ? 'La información de este encuentro necesita revisión por la organización.' : '' });
    }, error => {
      if (!active) return;
      const message = error.code === 'permission-denied' ? 'El servicio todavía no permite consultar este encuentro.' : error.code === 'unavailable' ? 'No hay conexión con el servicio. Comprueba tu conexión y vuelve a intentarlo.' : 'No hemos podido cargar este encuentro. Vuelve a intentarlo.';
      setDirectEvent({ id: eventId, event: null, loading: false, error: message });
    });
    return () => { active = false; stop(); };
  }, [eventId, mode, hasListedEvent, eventRetry]);

  useEffect(() => {
    if (!requestedCreate || loading || eventId) return;
    if (!profile) { navigate('/profile'); return; }
    setCreationType(requestedType === 'tournament' ? 'tournament' : 'match');
    setCreating(true);
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
  }, [requestedCreate, requestedType, loading, profile, eventId, searchParams, setSearchParams, navigate]);

  function updateQuery(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setSearchParams(next, { replace: true });
  }
  function openCreate() {
    setCreationType(type === 'tournament' ? 'tournament' : 'match');
    setCreating(true);
  }
  function changeView(next: 'explore' | 'mine') {
    updateQuery({ view: next === 'mine' ? 'mine' : '' });
    setOnlyOpen(next === 'explore');
  }
  function resetFilters() {
    updateQuery({ country: '', city: '', type: '', create: '' });
    setLevel('all'); setSearch(''); setOnlyOpen(false); setFiltersOpen(false);
  }

  const countries = locationOptions([...events.map(event => event.country), country]);
  const cities = locationOptions([...events.filter(event => !country || locationKey(event.country) === locationKey(country)).map(event => event.city), city]);
  const activeFilterCount = Number(!!country) + Number(!!city) + Number(level !== 'all');
  const locationSummary = city ? [city, country].filter(Boolean).join(', ') : country || 'Todos los países y ciudades';
  const myEvents = useMemo(() => profile ? events.filter(event => event.ownerId === profile.id || Object.hasOwn(event.participants, profile.id)) : [], [events, profile?.id]);
  const filtered = useMemo(() => {
    const now = Date.now();
    return (view === 'mine' ? myEvents : events).filter(event =>
      (!country || locationKey(event.country) === locationKey(country)) &&
      (!city || locationKey(event.city) === locationKey(city)) &&
      (level === 'all' || event.level === level) &&
      (type === 'all' || event.type === type) &&
      (!onlyOpen || (Date.parse(event.startAt) >= now && (view === 'mine' || event.status === 'open'))) &&
      (!search.trim() || [event.title, event.country, event.city, event.venue].join(' ').toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')))
    ).sort((a, b) => {
      const aTime = Date.parse(a.startAt), bTime = Date.parse(b.startAt);
      if (view === 'mine') {
        if ((aTime >= now) !== (bTime >= now)) return aTime >= now ? -1 : 1;
        if (aTime < now) return bTime - aTime;
      }
      return aTime - bTime;
    });
  }, [events, myEvents, view, country, city, level, type, onlyOpen, search]);
  const hasFilters = !!country || !!city || level !== 'all' || type !== 'all' || !!search.trim() || onlyOpen;
  const currentDirectEvent = mode === 'cloud' && directEvent?.id === eventId ? directEvent : null;
  const event = listedEvent || currentDirectEvent?.event;
  const detailLoading = !!eventId && mode === 'cloud' && !listedEvent && (!currentDirectEvent || currentDirectEvent.loading);

  if (loading || detailLoading) return <div className="ce-loading" role="status"><div className="ce-loading-ball" /><h2>{eventId ? 'Cargando encuentro' : 'Cargando encuentros'}</h2><p>Consultando la convocatoria de la comunidad.</p></div>;
  if (eventId && !listedEvent && currentDirectEvent?.error) return <section className="c-panel ce-not-found"><h1>No podemos cargar este encuentro.</h1><p role="alert">{currentDirectEvent.error}</p><div className="ce-empty-actions"><button className="c-button" type="button" onClick={() => setEventRetry(value => value + 1)}>Volver a intentar</button><Link className="c-button secondary" to="/play">Explorar encuentros</Link></div></section>;
  if (eventId) return event ? <EventDetail key={event.id} event={event} /> : <section className="c-panel ce-not-found"><Trophy size={36} /><h1>No encontramos este encuentro.</h1><p>Puede que el enlace no sea correcto o que no esté disponible en este navegador.</p><Link className="c-button" to="/play">Explorar encuentros<ArrowRight size={17} /></Link></section>;

  return <div className="ce-events-page">
    <header className="ce-workspace-header">
      <div><span className="c-eyebrow">PARTIDOS Y TORNEOS</span><h1>Juega</h1><p><MapPin size={15} aria-hidden="true" /><span>{locationSummary}</span></p></div>
      {profile ? <button type="button" className="c-button" onClick={openCreate} aria-label="Organizar un partido o torneo"><Plus size={18} />Crear encuentro</button> : <Link className="c-button" to="/profile" aria-label="Crear perfil para organizar un partido o torneo"><Plus size={18} />Crear encuentro</Link>}
    </header>
    <section className={'ce-filter-bar' + (filtersOpen ? ' ce-filters-open' : '')} aria-label="Buscar y filtrar encuentros">
      <div className="ce-search"><Search size={19} aria-hidden="true" /><input type="search" enterKeyHint="search" aria-label="Buscar por nombre, país, ciudad o campo" placeholder="Buscar encuentro, ciudad o campo" value={search} onChange={event => setSearch(event.target.value)} /></div>
      <button className="ce-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="ce-event-filters" onClick={() => setFiltersOpen(value => !value)}><SlidersHorizontal size={18} aria-hidden="true" />Filtros{activeFilterCount > 0 && <span aria-hidden="true">{activeFilterCount}</span>}</button>
      <div className="ce-filter-fields" id="ce-event-filters">
        <label>País<select aria-label="País" value={country} onChange={event => updateQuery({ country: event.target.value, city: '' })}><option value="">Todos los países</option>{countries.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>Ciudad<select aria-label="Ciudad" value={city} onChange={event => updateQuery({ city: event.target.value })}><option value="">Todas las ciudades</option>{cities.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>Nivel<select aria-label="Nivel" value={level} onChange={event => setLevel(event.target.value)}><option value="all">Todos los niveles</option><option value="amateur">Amateur</option><option value="professional">Profesional</option></select></label>
        {activeFilterCount > 0 && <button className="ce-text-button ce-clear-filters" type="button" onClick={() => { updateQuery({ country: '', city: '' }); setLevel('all'); }}>Limpiar ubicación y nivel</button>}
      </div>
    </section>
    <div className="ce-list-toolbar">
      <div className="ce-view-tabs" role="group" aria-label="Vista de encuentros"><button type="button" aria-pressed={view === 'explore'} onClick={() => changeView('explore')}>Explorar</button><button type="button" aria-pressed={view === 'mine'} onClick={() => changeView('mine')}>Mis encuentros{profile && myEvents.length > 0 && <span aria-hidden="true">{myEvents.length}</span>}</button></div>
      <div className="ce-type-tabs" role="group" aria-label="Tipo de encuentro">{([{ value: 'all', label: 'Todos' }, { value: 'match', label: 'Partidos' }, { value: 'tournament', label: 'Torneos' }] as const).map(item => <button type="button" key={item.value} aria-pressed={type === item.value} onClick={() => updateQuery({ type: item.value === 'all' ? '' : item.value })}>{item.label}</button>)}</div>
    </div>
    <div className="ce-results-row"><h2>{view === 'mine' ? 'Mis encuentros' : onlyOpen ? 'Próximos encuentros' : 'Todos los encuentros'}<span className="ce-heading-count" role="status" aria-label={`${filtered.length} encuentros encontrados`}>{filtered.length}</span></h2><label className="ce-open-toggle"><input type="checkbox" checked={onlyOpen} onChange={event => setOnlyOpen(event.target.checked)} /><span>{view === 'mine' ? 'Solo próximos' : 'Solo próximos y abiertos'}</span></label></div>
    {view === 'mine' && !profile ? <div className="ce-empty-state"><Users size={28} aria-hidden="true" /><h3>Tus encuentros, en un solo lugar.</h3><p>Entra para consultar los partidos y torneos que organizas o donde estás inscrito.</p><Link className="c-button" to="/profile">Entrar a mi cuenta<ArrowRight size={17} /></Link></div> : filtered.length ? <div className="ce-event-grid">{filtered.map(event => <EventCard key={event.id} event={event} />)}</div> : <div className="ce-empty-state"><Flag size={28} aria-hidden="true" /><h3>{view === 'mine' && !myEvents.length ? 'Todavía no tienes encuentros.' : events.length ? 'No hay encuentros con estos filtros.' : 'Todavía no hay encuentros.'}</h3><p>{view === 'mine' && !myEvents.length ? 'Organiza un partido o explora la convocatoria para inscribirte.' : events.length ? 'Prueba otra ubicación o nivel, o muestra todos los estados.' : 'Publica una convocatoria y comparte el enlace con tu grupo.'}</p><div className="ce-empty-actions">{view === 'mine' && !myEvents.length ? <button className="c-button secondary" type="button" onClick={() => changeView('explore')}>Explorar encuentros</button> : events.length && hasFilters ? <button className="c-button secondary" type="button" onClick={resetFilters}>Limpiar filtros</button> : null}{profile ? <button className="c-button" type="button" onClick={openCreate}><Plus size={17} />Crear encuentro</button> : <Link className="c-button" to="/profile">Crear mi perfil<ArrowRight size={17} /></Link>}</div></div>}
    <p className="ce-workspace-note"><ShieldCheck size={15} aria-hidden="true" />Organizar e inscribirse en Cantera es gratis. Los costes del campo se acuerdan con la organización.</p>
    {creating && <CreateEvent key={creationType} initialType={creationType} onClose={() => setCreating(false)} />}
  </div>;
}
