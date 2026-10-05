import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Clock3, Flag, MapPin, Plus, Share2, ShieldCheck, SlidersHorizontal, Trophy, Users, X } from 'lucide-react';
import { useCommunity } from './CommunityContext';
import { standings, zonedDateTimeToIso } from './logic';
import type { EventInput, Fixture, PlayEvent } from './types';
import './events.css';

const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const timeZones = [...new Set([browserTimeZone, 'UTC', ...(typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Africa/Cairo', 'Africa/Johannesburg', 'America/Argentina/Buenos_Aires', 'America/Bogota', 'America/Lima', 'America/Los_Angeles', 'America/Mexico_City', 'America/New_York', 'America/Santiago', 'America/Sao_Paulo', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'Europe/London', 'Europe/Madrid', 'Europe/Paris', 'Pacific/Auckland'])])].sort();
const formatDate = (date: string, timeZone = browserTimeZone) => new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone }).format(new Date(date));
const formatTime = (date: string, timeZone = browserTimeZone) => new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(date));
const levelLabel = (level: PlayEvent['level']) => level === 'professional' ? 'Profesional' : 'Amateur';
const entryLabel = (event: PlayEvent) => event.entry === 'teams' ? 'equipos' : 'jugadores';
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'No hemos podido completar la acción. Vuelve a intentarlo.';
const statusLabel = (event: PlayEvent) => event.status === 'cancelled' ? 'Cancelado' : event.status === 'closed' ? 'Inscripción cerrada' : Object.keys(event.participants).length >= event.capacity ? 'Completo' : 'Inscripción abierta';
const invitationUrl = (id: string) => `${window.location.origin}${window.location.pathname}#/play/${id}`;

function initialDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(18, 0, 0, 0);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function CreateEvent({ onClose }: { onClose: () => void }) {
  const { profile, createEvent } = useCommunity();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventInput['type']>('match');
  const [entry, setEntry] = useState<EventInput['entry']>('players');
  const [format, setFormat] = useState<EventInput['format']>('7');
  const [level, setLevel] = useState<EventInput['level']>(profile?.level || 'amateur');
  const [city, setCity] = useState(profile?.city || '');
  const [country, setCountry] = useState(profile?.country || '');
  const [timeZone, setTimeZone] = useState(browserTimeZone);
  const [venue, setVenue] = useState('');
  const [startAt, setStartAt] = useState(initialDate);
  const [capacity, setCapacity] = useState('14');
  const [tournamentFormat, setTournamentFormat] = useState<EventInput['tournamentFormat']>('league');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const maxCapacity = type === 'tournament' ? 32 : 64;
  const modalRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const savingRef = useRef(saving);
  const closeRef = useRef(onClose);
  savingRef.current = saving;
  closeRef.current = onClose;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingRef.current) closeRef.current();
      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = [...modalRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')];
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handler);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = previous; restoreFocusRef.current?.focus(); };
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

  return <div className="ce-modal-backdrop" onClick={() => { if (!saving) onClose(); }}>
    <section ref={modalRef} className="ce-modal" role="dialog" aria-modal="true" aria-labelledby="ce-create-title" onClick={event => event.stopPropagation()}>
      <div className="ce-modal-heading"><div><span className="c-eyebrow">Del grupo al campo</span><h2 id="ce-create-title">Organiza tu próximo encuentro.</h2></div><button className="ce-icon-button" type="button" aria-label="Cerrar formulario" onClick={onClose} disabled={saving}><X size={22} /></button></div>
      <p className="ce-form-intro">Publicar, invitar y gestionar inscripciones en Cantera es gratis. Acordad directamente cualquier coste del campo.</p>
      <form className="ce-form" onSubmit={submit}>
        <label className="ce-field ce-full">Nombre del encuentro<input autoFocus aria-label="Nombre del encuentro" className="c-input" maxLength={100} placeholder="Por ejemplo: Fútbol del domingo en Madrid" value={title} onChange={event => setTitle(event.target.value)} required minLength={3} /></label>
        <fieldset className="ce-choice-field ce-full"><legend>¿Qué vas a organizar?</legend><div className="ce-type-choices">{(['match', 'tournament'] as const).map(value => <button type="button" key={value} className={`ce-type-choice ${type === value ? 'active' : ''}`} aria-pressed={type === value} onClick={() => { setType(value); setEntry(value === 'tournament' ? 'teams' : 'players'); setCapacity(value === 'tournament' ? '8' : '14'); }}>{value === 'match' ? <Flag size={23} /> : <Trophy size={23} />}<span>{value === 'match' ? 'Partido' : 'Torneo'}<small>{value === 'match' ? 'Un encuentro, mucha comunidad.' : 'Un calendario y una clasificación.'}</small></span>{type === value && <Check size={17} />}</button>)}</div></fieldset>
        <label className="ce-field">País<input aria-label="País" className="c-input" maxLength={100} placeholder="País del encuentro" value={country} onChange={event => setCountry(event.target.value)} required /></label>
        <label className="ce-field">Ciudad<input aria-label="Ciudad" className="c-input" maxLength={80} placeholder="Ciudad del encuentro" value={city} onChange={event => setCity(event.target.value)} required /></label>
        <label className="ce-field">Campo o punto de encuentro<input aria-label="Campo o punto de encuentro" className="c-input" maxLength={160} placeholder="Nombre y dirección del campo" value={venue} onChange={event => setVenue(event.target.value)} required /></label>
        <label className="ce-field">Fecha y hora del encuentro<input aria-label="Fecha y hora del encuentro" className="c-input" type="datetime-local" value={startAt} onChange={event => setStartAt(event.target.value)} required /></label>
        <label className="ce-field ce-full">Zona horaria del campo<select aria-label="Zona horaria del campo" className="c-input" value={timeZone} onChange={event => setTimeZone(event.target.value)}>{timeZones.map(zone => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}</select><small className="ce-optional">La fecha se interpreta en esta zona horaria para que todos lleguen a la misma hora.</small></label>
        <label className="ce-field">Formato<select aria-label="Formato" className="c-input" value={format} onChange={event => setFormat(event.target.value as EventInput['format'])}><option value="5">Fútbol 5</option><option value="7">Fútbol 7</option><option value="11">Fútbol 11</option></select></label>
        <label className="ce-field">Nivel<select aria-label="Nivel" className="c-input" value={level} onChange={event => setLevel(event.target.value as EventInput['level'])}><option value="amateur">Amateur</option><option value="professional">Profesional</option></select></label>
        <label className="ce-field">Inscripción por<select aria-label="Inscripción por" className="c-input" value={entry} onChange={event => { setEntry(event.target.value as EventInput['entry']); setCapacity(event.target.value === 'teams' ? '8' : '14'); }}><option value="players">Jugador individual</option><option value="teams">Equipo o grupo</option></select></label>
        <label className="ce-field">Aforo de {entry === 'teams' ? 'equipos' : 'jugadores'}<input aria-label={`Aforo de ${entry === 'teams' ? 'equipos' : 'jugadores'}`} className="c-input" type="number" min={2} max={maxCapacity} step={1} value={capacity} onChange={event => setCapacity(event.target.value)} required /></label>
        {type === 'tournament' && <label className="ce-field">Sistema del torneo<select aria-label="Sistema del torneo" className="c-input" value={tournamentFormat} onChange={event => setTournamentFormat(event.target.value as EventInput['tournamentFormat'])}><option value="league">Liga: todos contra todos</option><option value="knockout">Eliminatoria directa</option></select></label>}
        {type === 'tournament' && <p className="ce-helper ce-full">En esta beta, los torneos admiten de 2 a 32 participantes. Los partidos admiten hasta 64 inscripciones.</p>}
        <label className="ce-field ce-full">Información para participantes <span className="ce-optional">Opcional</span><textarea aria-label="Información para participantes" className="c-input" rows={3} maxLength={2000} placeholder="Qué llevar, reglas del encuentro, cómo llegar y costes del campo si los hay…" value={description} onChange={event => setDescription(event.target.value)} /></label>
        {error && <p className="c-error ce-full" role="alert">{error}</p>}
        <div className="ce-form-footer ce-full"><span><ShieldCheck size={17} /> Elige el campo, el formato y tu convocatoria.</span><button className="c-button" type="submit" disabled={saving}>{saving ? 'Publicando…' : 'Publicar encuentro'}<ArrowRight size={17} /></button></div>
      </form>
    </section>
  </div>;
}

function EventCard({ event }: { event: PlayEvent }) {
  const count = Object.keys(event.participants).length;
  const percentage = Math.min(100, (count / event.capacity) * 100);
  const date = new Date(event.startAt);
  const day = new Intl.DateTimeFormat('es', { day: 'numeric', timeZone: event.timeZone }).format(date);
  const month = new Intl.DateTimeFormat('es', { month: 'short', timeZone: event.timeZone }).format(date).replace('.', '');
  return <Link className={`ce-event-card ${event.status === 'cancelled' ? 'ce-cancelled' : ''}`} to={`/play/${event.id}`}>
    <div className={`ce-card-cover ${event.type === 'tournament' ? 'ce-tournament-cover' : ''}`}><div className="ce-pitch-mark" aria-hidden="true"><div /><span /></div><span className="ce-card-category">{event.type === 'tournament' ? <Trophy size={15} /> : <Flag size={15} />}{event.type === 'tournament' ? 'Torneo' : 'Partido'} · Fútbol {event.format}</span><div className="ce-card-date"><strong>{day}</strong><span>{month}</span></div><span className={`ce-status ${event.status !== 'open' || count >= event.capacity ? 'ce-status-muted' : ''}`}>{statusLabel(event)}</span></div>
    <div className="ce-card-body"><div className="ce-card-meta"><span>{levelLabel(event.level)}</span>{event.type === 'tournament' && <span>{event.tournamentFormat === 'league' ? 'Liga' : 'Eliminatoria'}</span>}</div><h3>{event.title}</h3><p><MapPin size={16} /><span>{event.city}, {event.country} · {event.venue}</span></p><p><Clock3 size={16} /><span>{formatDate(event.startAt, event.timeZone)} · {formatTime(event.startAt, event.timeZone)}</span></p><div className="ce-card-occupancy"><div><span>{count} / {event.capacity} {entryLabel(event)}</span><strong>{Math.max(0, event.capacity - count)} plazas</strong></div><div className="ce-progress-track"><span style={{ width: `${percentage}%` }} /></div></div><div className="ce-card-footer"><span>Por {event.ownerName}</span><span>Ver encuentro<ArrowUpRightIcon /></span></div></div>
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
    <Link to="/play" className="ce-back-link"><ArrowLeft size={17} />Todos los encuentros</Link>
    <section className="ce-detail-hero"><div className="ce-detail-pitch" aria-hidden="true"><div className="ce-detail-midline" /><div className="ce-detail-circle" /><div className="ce-detail-box ce-box-left" /><div className="ce-detail-box ce-box-right" /></div><div className="ce-detail-hero-content"><div className="ce-detail-tags"><span>{event.type === 'tournament' ? <Trophy size={15} /> : <Flag size={15} />}{event.type === 'tournament' ? 'Torneo' : 'Partido'}</span><span>Fútbol {event.format}</span><span>{levelLabel(event.level)}</span></div><h1>{event.title}</h1><p>Organizado por <strong>{event.ownerName}</strong></p><div className="ce-detail-location"><span><MapPin size={18} />{event.city}, {event.country}</span><span><CalendarDays size={18} />{formatDate(event.startAt, event.timeZone)} · {formatTime(event.startAt, event.timeZone)}</span></div></div><span className="ce-detail-status">{statusLabel(event)}</span></section>
    {mode === 'demo' && <p className="ce-demo-note">Este encuentro se guarda sólo en este navegador de prueba. Las invitaciones y las inscripciones de otras personas estarán disponibles cuando el servicio esté publicado.</p>}
    {error && <div className="c-error" role="alert">{error}</div>}{message && <div className="ce-success" role="status"><Check size={18} />{message}</div>}
    <div className="ce-detail-grid"><div className="ce-detail-main">
      <section className="c-panel ce-about"><span className="c-eyebrow">El plan</span><h2>Nos encontramos en el campo.</h2><div className="ce-info-grid"><div><MapPin size={20} /><span>Lugar<strong>{event.venue}</strong><small>{event.city}, {event.country}</small></span></div><div><Users size={20} /><span>Inscripción<strong>{event.entry === 'teams' ? 'Equipos y grupos' : 'Jugadores individuales'}</strong><small>Hasta {event.capacity} {entryLabel(event)}</small></span></div><div><Clock3 size={20} /><span>Hora de inicio<strong>{formatTime(event.startAt, event.timeZone)}</strong><small>{formatDate(event.startAt, event.timeZone)} · {event.timeZone}</small></span></div>{event.type === 'tournament' && <div><Trophy size={20} /><span>Sistema<strong>{event.tournamentFormat === 'league' ? 'Liga' : 'Eliminatoria directa'}</strong><small>{event.tournamentFormat === 'league' ? 'Todos contra todos' : 'Avanza el ganador de cada cruce'}</small></span></div>}</div>{event.description && <p className="ce-description">{event.description}</p>}<div className="ce-free-note"><ShieldCheck size={18} /><span><strong>Organización gratuita en Cantera.</strong> Los posibles costes del campo, desplazamiento o material se acuerdan con la organización.</span></div></section>
      <section className="c-panel ce-participants"><div className="ce-section-heading"><div><span className="c-eyebrow">La convocatoria</span><h2>{event.entry === 'teams' ? 'Equipos inscritos' : 'Quién se apunta'}</h2></div><span className="ce-count">{entries.length} / {event.capacity}</span></div>{entries.length ? <ul className="ce-participant-list">{entries.map(([id, name], index) => <li key={id}><span className="ce-avatar">{name.trim().slice(0, 2).toUpperCase()}</span><span><strong>{name}</strong><small>{id === profile?.id ? 'Tu inscripción' : id.startsWith('guest_') || id.startsWith('guest-') ? 'Invitado por la organización' : `Inscripción ${String(index + 1).padStart(2, '0')}`}</small></span>{id === profile?.id && <span className="ce-you">Tú</span>}</li>)}</ul> : <div className="ce-inline-empty"><Users size={26} /><p>La primera plaza puede ser tuya.<span>Invita a tu grupo y completad la convocatoria.</span></p></div>}{isOwner && event.status === 'open' && !full && !event.fixtures.length && <form className="ce-guest-form" onSubmit={guest}><label htmlFor="ce-guest">Añadir {event.entry === 'teams' ? 'equipo' : 'jugador'} invitado</label><div><input id="ce-guest" aria-label={`Añadir ${event.entry === 'teams' ? 'equipo' : 'jugador'} invitado`} className="c-input" placeholder={event.entry === 'teams' ? 'Nombre del equipo' : 'Nombre del invitado'} value={guestName} maxLength={80} required minLength={2} onChange={change => setGuestName(change.target.value)} /><button type="submit" className="c-button secondary" disabled={!!busy}>{busy === 'guest' ? 'Añadiendo…' : 'Añadir'}<Plus size={16} /></button></div><small>Para personas o equipos que aún no tienen un perfil en Cantera.</small></form>}</section>
      {event.type === 'tournament' && <section className="c-panel ce-competition"><div className="ce-section-heading"><div><span className="c-eyebrow">La competición</span><h2>Calendario y resultados</h2></div><Trophy size={25} /></div>{!event.fixtures.length ? <div className="ce-inline-empty"><CalendarDays size={28} /><p>El calendario empieza con la convocatoria.<span>{isOwner ? 'Con 2–32 inscripciones puedes generar los cruces. La convocatoria se cerrará para mantener el calendario.' : 'La organización publicará los cruces cuando esté lista la convocatoria.'}</span></p></div> : <div className="ce-rounds">{rounds.map(round => <div key={round} className="ce-round"><h3>{event.tournamentFormat === 'league' ? 'Jornada' : 'Ronda'} {round}</h3>{event.fixtures.filter(fixture => fixture.round === round).map(fixture => <MatchResult key={fixture.id} event={event} fixture={fixture} isOwner={isOwner} />)}</div>)}</div>}{winner && <div className="ce-winner"><Trophy size={24} /><span>Campeón<strong>{winner}</strong></span></div>}{isOwner && event.status !== 'cancelled' && !event.fixtures.length && <button className="c-button secondary ce-generate-button" disabled={!!busy || entries.length < 2 || entries.length > 32} onClick={() => action('fixtures', () => generateFixtures(event.id), 'Calendario actualizado. Las inscripciones están cerradas.')}>{busy === 'fixtures' ? 'Generando…' : 'Generar calendario'}<ChevronRight size={17} /></button>}{entries.length > 32 && !event.fixtures.length && <p className="ce-helper">El calendario automático admite hasta 32 participantes en esta beta.</p>}{event.tournamentFormat === 'knockout' && event.fixtures.length > 0 && isOwner && <p className="ce-helper">La siguiente ronda se crea al guardar todos los resultados de la ronda actual. Los pases libres avanzan automáticamente. En eliminatoria no se permiten empates.</p>}</section>}
      {event.type === 'tournament' && event.tournamentFormat === 'league' && event.fixtures.length > 0 && <section className="c-panel ce-standings"><span className="c-eyebrow">Cada gol cuenta</span><h2>Clasificación</h2><div className="ce-table-scroll"><table><caption className="ce-sr-only">Clasificación de {event.title}</caption><thead><tr><th scope="col">Pos.</th><th scope="col">{event.entry === 'teams' ? 'Equipo' : 'Jugador'}</th><th scope="col"><abbr title="Partidos jugados">PJ</abbr></th><th scope="col"><abbr title="Partidos ganados">G</abbr></th><th scope="col"><abbr title="Partidos empatados">E</abbr></th><th scope="col"><abbr title="Partidos perdidos">P</abbr></th><th scope="col"><abbr title="Diferencia de goles">DG</abbr></th><th scope="col">Pts</th></tr></thead><tbody>{table.map((standing, index) => <tr key={standing.id}><td>{index + 1}</td><th scope="row">{standing.name}</th><td>{standing.played}</td><td>{standing.won}</td><td>{standing.drawn}</td><td>{standing.lost}</td><td>{standing.goalsFor - standing.goalsAgainst}</td><td><strong>{standing.points}</strong></td></tr>)}</tbody></table></div><p className="ce-helper">Victoria: 3 puntos · Empate: 1 · Derrota: 0. Resultados registrados por la organización.</p></section>}
    </div><aside className="ce-detail-aside"><section className="c-panel ce-join-panel"><span className="c-eyebrow">Tu próximo partido</span><h2>{event.status === 'cancelled' ? 'Encuentro cancelado.' : hasJoined ? 'Estás en la lista.' : inPast ? 'Un encuentro para recordar.' : full ? 'Convocatoria completa.' : 'El campo te espera.'}</h2><p>{event.status === 'cancelled' ? 'Las inscripciones han quedado sin efecto.' : hasJoined ? `Tu plaza para ${event.participants[profile!.id]} está confirmada.` : `${Math.max(0, event.capacity - entries.length)} plazas disponibles de ${event.capacity} ${entryLabel(event)}.`}</p><div className="ce-progress-track ce-detail-progress"><span style={{ width: `${Math.min(100, entries.length / event.capacity * 100)}%` }} /></div>{hasJoined ? <div className="ce-joined"><div><Check size={18} />{event.status === 'cancelled' ? 'Encuentro cancelado' : 'Inscripción confirmada'}</div>{event.status !== 'cancelled' && !event.fixtures.length && !inPast && <button className="ce-text-button" disabled={!!busy} onClick={() => action('leave', () => leaveEvent(event.id), 'Has dejado tu plaza disponible.')}>{busy === 'leave' ? 'Cancelando…' : 'Cancelar mi inscripción'}</button>}</div> : event.status === 'open' && !full && !inPast ? profile ? <form onSubmit={join} className="ce-join-form"><label htmlFor="ce-join-name">{event.entry === 'teams' ? 'Nombre de tu equipo o grupo' : 'Nombre en la convocatoria'}</label><input aria-label={event.entry === 'teams' ? 'Nombre de tu equipo o grupo' : 'Nombre en la convocatoria'} className="c-input" id="ce-join-name" value={joinName} maxLength={80} minLength={2} required onChange={change => setJoinName(change.target.value)} /><button className="c-button" disabled={!!busy} type="submit">{busy === 'join' ? 'Confirmando…' : event.entry === 'teams' ? 'Inscribir mi equipo' : 'Apuntarme'}<ArrowRight size={18} /></button></form> : <Link className="c-button" to="/profile">Crea tu perfil para apuntarte<ArrowRight size={17} /></Link> : <p className="ce-registration-state">{event.status === 'cancelled' ? 'La organización ha cancelado este encuentro.' : inPast ? 'La fecha de este encuentro ya ha pasado.' : full ? 'No quedan plazas disponibles.' : 'La organización ha cerrado las inscripciones.'}</p>}<div className="ce-join-bottom"><ShieldCheck size={15} />Inscripción gratuita en Cantera</div></section><section className="c-panel ce-share-panel"><h3>El fútbol se comparte.</h3><p>Envía este encuentro a tu equipo o guárdalo en tu agenda.</p><button className="c-button secondary" type="button" onClick={copyInvite}><Share2 size={17} />Copiar invitación</button><button className="ce-calendar-button" type="button" onClick={() => downloadCalendar(event)}><ArrowDownToLine size={17} />Añadir a mi calendario</button><small>El calendario reserva 90 minutos orientativos.</small></section>{isOwner && <section className="c-panel ce-manage-panel"><span className="c-eyebrow">Organización</span><h3>Gestiona la convocatoria</h3>{<button className="c-button secondary" disabled={!!busy || (event.status !== 'open' && (event.fixtures.length > 0 || inPast))} onClick={() => action('status', () => setEventStatus(event.id, event.status === 'open' ? 'closed' : 'open'), event.status === 'open' ? 'Inscripciones cerradas.' : 'Inscripciones abiertas.')}>{busy === 'status' ? 'Actualizando…' : event.status === 'open' ? 'Cerrar inscripciones' : event.status === 'cancelled' ? 'Reactivar encuentro' : 'Reabrir inscripciones'}</button>}{event.fixtures.length > 0 && <p className="ce-helper">El calendario fija los participantes del torneo.</p>}{event.status !== 'cancelled' && !cancelConfirm && <button className="ce-text-button ce-danger" disabled={!!busy} onClick={() => setCancelConfirm(true)}>Cancelar encuentro</button>}{cancelConfirm && event.status !== 'cancelled' && <div className="ce-cancel-confirm"><p>El encuentro dejará de aceptar inscripciones y se marcará como cancelado.</p><button className="ce-danger-button" disabled={!!busy} onClick={() => action('cancel', () => setEventStatus(event.id, 'cancelled'), 'Encuentro cancelado.')}>{busy === 'cancel' ? 'Cancelando…' : 'Confirmar cancelación'}</button><button className="ce-text-button" disabled={!!busy} onClick={() => setCancelConfirm(false)}>Mantener encuentro</button></div>}{event.status === 'cancelled' && <p className="ce-helper">Este encuentro está cancelado. Puedes reactivarlo si su fecha es futura y no tiene un calendario generado.</p>}</section>}</aside></div>
  </div>;
}

export default function EventsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get('type');
  const { events, loading, profile } = useCommunity();
  const [creating, setCreating] = useState(false);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [level, setLevel] = useState('all');
  const [type, setType] = useState(requestedType === 'match' || requestedType === 'tournament' ? requestedType : 'all');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [search, setSearch] = useState('');
  useEffect(() => { setType(requestedType === 'match' || requestedType === 'tournament' ? requestedType : 'all'); }, [requestedType]);
  const countries = [...new Set(events.map(event => event.country))].filter(Boolean).sort((a, b) => a.localeCompare(b));
  const cities = [...new Set(events.filter(event => !country || event.country === country).map(event => event.city))].sort((a, b) => a.localeCompare(b));
  const filtered = useMemo(() => events.filter(event => (!country || event.country === country) && (!city || event.city === city) && (level === 'all' || event.level === level) && (type === 'all' || event.type === type) && (!onlyOpen || (event.status === 'open' && new Date(event.startAt).getTime() >= Date.now())) && (!search || `${event.title} ${event.country} ${event.city} ${event.venue}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')))).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()), [events, country, city, level, type, onlyOpen, search]);
  const upcomingCount = events.filter(event => event.status === 'open' && new Date(event.startAt).getTime() >= Date.now()).length;
  const event = eventId ? events.find(item => item.id === eventId) : undefined;

  if (loading) return <div className="ce-loading" role="status"><div className="ce-loading-ball" /><h2>Preparando el campo…</h2><p>Cargando los encuentros de la comunidad.</p></div>;
  if (eventId) return event ? <EventDetail key={event.id} event={event} /> : <section className="c-panel ce-not-found"><Trophy size={40} /><h1>No encontramos este encuentro.</h1><p>Puede que el enlace no sea correcto o que no esté disponible en este navegador.</p><Link className="c-button" to="/play">Explorar encuentros<ArrowRight size={17} /></Link></section>;

  return <div className="ce-events-page"><section className="ce-page-hero"><div className="ce-page-hero-copy"><span className="c-eyebrow">Juega. Conecta. Repite.</span><h1>El próximo partido<br /><em>empieza contigo.</em></h1><p>Encuentra tu grupo, organiza un partido o crea un torneo. Desde la pachanga del barrio hasta el siguiente gran cruce.</p><div className="ce-hero-actions">{profile ? <button className="c-button" onClick={() => setCreating(true)}><Plus size={18} />Organizar encuentro</button> : <Link className="c-button" to="/profile"><Plus size={18} />Crea tu perfil y organiza</Link>}<span><ShieldCheck size={16} />Organizar en Cantera es gratis</span></div></div><div className="ce-hero-art" aria-hidden="true"><div className="ce-art-pitch"><span className="ce-art-circle" /><span className="ce-art-line" /><span className="ce-art-box" /><i className="ce-art-player ce-player-1" /><i className="ce-art-player ce-player-2" /><i className="ce-art-player ce-player-3" /><i className="ce-art-player ce-player-4" /><i className="ce-art-player ce-player-5" /><div className="ce-art-ball">⚽</div></div><div className="ce-art-note"><div><Check size={14} /></div><span>La convocatoria está abierta.<strong>Solo faltas tú.</strong></span></div><span className="ce-art-caption">MENOS CHAT. MÁS FÚTBOL.</span></div></section><div className="ce-discover-heading"><div><span className="c-eyebrow">La comunidad sale a jugar</span><h2>Encuentros cerca de ti<span className="ce-heading-count">{upcomingCount}</span></h2></div><span className="ce-discover-hint">Para todos los niveles. Para todos los equipos.</span></div><section className="ce-filter-bar" aria-label="Filtrar encuentros"><div className="ce-search"><SlidersHorizontal size={18} /><input aria-label="Buscar por nombre, país, ciudad o campo" placeholder="Busca un encuentro, ciudad o campo" value={search} onChange={event => setSearch(event.target.value)} /></div><label><span className="ce-sr-only">País</span><select aria-label="País" value={country} onChange={event => { setCountry(event.target.value); setCity(''); }}><option value="">Todos los países</option>{countries.map(value => <option key={value} value={value}>{value}</option>)}</select></label><label><span className="ce-sr-only">Ciudad</span><select aria-label="Ciudad" value={city} onChange={event => setCity(event.target.value)}><option value="">Todas las ciudades</option>{cities.map(value => <option key={value} value={value}>{value}</option>)}</select></label><label><span className="ce-sr-only">Nivel</span><select aria-label="Nivel" value={level} onChange={event => setLevel(event.target.value)}><option value="all">Todos los niveles</option><option value="amateur">Amateur</option><option value="professional">Profesional</option></select></label><label><span className="ce-sr-only">Tipo de encuentro</span><select aria-label="Tipo de encuentro" value={type} onChange={event => setType(event.target.value)}><option value="all">Partidos y torneos</option><option value="match">Partidos</option><option value="tournament">Torneos</option></select></label></section><div className="ce-results-row"><p>{filtered.length} {filtered.length === 1 ? 'encuentro' : 'encuentros'}</p><label className="ce-open-toggle"><input type="checkbox" checked={onlyOpen} onChange={event => setOnlyOpen(event.target.checked)} /><span>Solo próximos y abiertos</span></label></div>{filtered.length ? <div className="ce-event-grid">{filtered.map(event => <EventCard key={event.id} event={event} />)}</div> : <div className="ce-empty-state"><div className="ce-empty-icon"><Flag size={30} /></div><h3>{events.length ? 'Aún no hay encuentros con estos filtros.' : 'El primer encuentro empieza aquí.'}</h3><p>{events.length ? 'Prueba otro país, ciudad o nivel. También puedes reunir a tu grupo y organizar el próximo.' : 'Reúne a tu grupo, elige un campo y abre la convocatoria. Crear el encuentro solo lleva un minuto.'}</p>{events.length ? <button className="c-button secondary" onClick={() => { setCountry(''); setCity(''); setLevel('all'); setType('all'); setSearch(''); setOnlyOpen(false); }}>Ver todos los encuentros</button> : profile ? <button className="c-button" onClick={() => setCreating(true)}><Plus size={17} />Organizar el primero</button> : <Link className="c-button" to="/profile">Crear mi perfil<ArrowRight size={17} /></Link>}</div>}<section className="ce-bottom-banner"><div><span className="c-eyebrow">De una idea al pitido inicial</span><h3>Tu grupo. Tu campo. Tus reglas.</h3><p>Comparte un enlace, completa la convocatoria y deja que el fútbol haga el resto.</p></div>{profile ? <button className="c-button secondary" onClick={() => setCreating(true)}>Crear un encuentro<ArrowRight size={17} /></button> : <Link className="c-button secondary" to="/profile">Empezar<ArrowRight size={17} /></Link>}</section>{creating && <CreateEvent onClose={() => setCreating(false)} />}</div>;
}
