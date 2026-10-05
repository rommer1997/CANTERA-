import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Award, CalendarDays, Camera, Check, EyeOff, Film, Flag, Heart, LoaderCircle, MapPin, MessageCircle, MoreHorizontal, Plus, Share2, Trash2, Upload, X } from 'lucide-react';
import { friendlyError, useCommunity } from './CommunityContext';
import type { CommunityPost, PostInput, PostKind } from './types';
import './feed.css';

type FeedFilter = 'all' | PostKind;
const kindLabels: Record<PostKind, string> = { reel: 'Reel', photo: 'Foto', achievement: 'Logro' };
const filters: { id: FeedFilter; label: string; icon?: typeof Film }[] = [
  { id: 'all', label: 'Todo' }, { id: 'reel', label: 'Reels', icon: Film },
  { id: 'photo', label: 'Fotos', icon: Camera }, { id: 'achievement', label: 'Logros', icon: Award },
];

function errorMessage(error: unknown) {
  return friendlyError(error);
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'C';
}

function readableDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

async function validateMedia(file: File, kind: PostKind) {
  const isVideo = kind === 'reel';
  const allowed = isVideo ? ['video/mp4', 'video/webm'] : ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) throw new Error(isVideo ? 'Elige un vídeo MP4 o WebM.' : 'Elige una imagen JPG, PNG o WebP.');
  if (file.size > (isVideo ? 50 : 10) * 1024 * 1024) throw new Error(isVideo ? 'El vídeo debe pesar como máximo 50 MB.' : 'La foto debe pesar como máximo 10 MB.');
  if (file.size === 0) throw new Error('El archivo está vacío. Elige otro.');
  if (!isVideo) return;
  await new Promise<void>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let timeout: ReturnType<typeof setTimeout>;
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      error ? reject(error) : resolve();
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      video.onloadedmetadata = null;
      video.onerror = null;
      if (!Number.isFinite(video.duration) || video.duration <= 0) finish(new Error('No pudimos leer la duración del vídeo. Prueba con otro MP4 o WebM.'));
      else if (video.duration > 90) finish(new Error('Los reels pueden durar hasta 90 segundos. Recorta tu vídeo antes de subirlo.'));
      else finish();
    };
    video.onerror = () => {
      video.onloadedmetadata = null;
      video.onerror = null;
      finish(new Error('No pudimos abrir ese vídeo. Prueba con otro MP4 o WebM.'));
    };
    timeout = setTimeout(() => {
      video.onloadedmetadata = null;
      video.onerror = null;
      finish(new Error('El vídeo tardó demasiado en abrirse. Vuelve a elegir el archivo.'));
    }, 15000);
    video.src = url;
  });
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = React.useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);
  return <dialog ref={ref} className="cf-dialog" aria-labelledby={headingId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="cf-dialog-head"><h2 id={headingId}>{title}</h2><button type="button" className="cf-icon-button" onClick={onClose} aria-label="Cerrar diálogo"><X size={19} /></button></div>
    {children}
  </dialog>;
}

function Composer({ onPublished }: { onPublished: (id: string) => void }) {
  const { profile, events, createPost, mode, mediaUploadsEnabled } = useCommunity();
  const [expanded, setExpanded] = useState(false);
  const [kind, setKind] = useState<PostKind>(mediaUploadsEnabled ? 'photo' : 'achievement');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [validating, setValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileSequence = useRef(0);
  const inputId = React.useId();
  const isLocked = busy || validating;

  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => { fileSequence.current += 1; }, []);
  useEffect(() => {
    if (!mediaUploadsEnabled && kind !== 'achievement') {
      fileSequence.current += 1;
      setKind('achievement'); setFile(undefined); setError(''); setValidating(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [mediaUploadsEnabled, kind]);

  function changeKind(next: PostKind) {
    fileSequence.current += 1;
    setKind(next); setFile(undefined); setError(''); setValidating(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function chooseFile(chosen?: File) {
    if (!chosen) return;
    const sequence = ++fileSequence.current;
    setValidating(true); setError(''); setFile(undefined);
    try {
      await validateMedia(chosen, kind);
      if (sequence === fileSequence.current) setFile(chosen);
    } catch (error) {
      if (sequence === fileSequence.current) {
        setError(errorMessage(error));
        if (inputRef.current) inputRef.current.value = '';
      }
    } finally {
      if (sequence === fileSequence.current) setValidating(false);
    }
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!profile || isLocked) return;
    if (!text.trim()) { setError('Añade una descripción a tu publicación.'); return; }
    if (kind !== 'achievement' && !file) { setError('Añade un archivo para publicar.'); return; }
    if (kind === 'achievement' && !title.trim()) { setError('Dale un título a tu logro.'); return; }
    setBusy(true); setError(''); setProgress(0);
    const input: PostInput = { kind, text: text.trim(), title: kind === 'achievement' ? title.trim() : '', eventId, ...(file ? { file } : {}) };
    try {
      const id = await createPost(input, value => setProgress(Math.max(0, Math.min(100, value))));
      setText(''); setTitle(''); setEventId(''); setFile(undefined); setExpanded(false);
      if (inputRef.current) inputRef.current.value = '';
      onPublished(id);
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }

  if (!profile) return <div className="c-panel cf-composer cf-join-composer">
    <span className="cf-avatar">C</span><div><strong>Tu fútbol tiene una historia.</strong><p>Crea tu perfil para compartirla con la comunidad.</p>{!mediaUploadsEnabled && <p className="c-small">Fotos y reels pendientes del patrocinio del almacenamiento. Los logros escritos forman parte del núcleo gratuito.</p>}</div><Link className="c-button" to="/profile">Crear perfil <ArrowUpRight size={16} /></Link>
  </div>;

  return <section className="c-panel cf-composer" aria-label="Crear una publicación">
    <div className="cf-composer-top"><span className="cf-avatar">{initials(profile.name)}</span><button type="button" className="cf-compose-trigger" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} disabled={busy}>¿Qué pasó hoy en la cancha, {profile.name.split(' ')[0]}?</button><button type="button" className="cf-icon-button cf-expand-button" onClick={() => setExpanded(!expanded)} disabled={busy} aria-label={expanded ? 'Cerrar creador de publicaciones' : 'Crear publicación'}>{expanded ? <X size={20} /> : <Plus size={20} />}</button></div>
    {!expanded && <div className="cf-quick-types">{(['reel', 'photo', 'achievement'] as PostKind[]).map(type => { const Icon = type === 'reel' ? Film : type === 'photo' ? Camera : Award; return <button type="button" key={type} disabled={type !== 'achievement' && !mediaUploadsEnabled} onClick={() => { changeKind(type); setExpanded(true); }}><Icon size={17} /> {type === 'reel' ? 'Subir reel' : type === 'photo' ? 'Compartir foto' : 'Contar un logro'}</button>; })}</div>}
    {!mediaUploadsEnabled && <p className="c-small">Las fotos y los reels se habilitarán con el patrocinio del almacenamiento. Por ahora puedes compartir tus logros por escrito.</p>}
    {expanded && <form className="cf-compose-form" onSubmit={publish}>
      <div className="cf-kind-picker" aria-label="Tipo de publicación">{(['reel', 'photo', 'achievement'] as PostKind[]).map(type => <button key={type} type="button" aria-pressed={kind === type} className={kind === type ? 'is-active' : ''} disabled={isLocked || type !== 'achievement' && !mediaUploadsEnabled} onClick={() => changeKind(type)}>{kindLabels[type]}</button>)}</div>
      {kind === 'achievement' && <label className="cf-field">Título del logro<input className="c-input" value={title} onChange={event => setTitle(event.target.value)} maxLength={100} placeholder="Mi primer gol con el equipo" required disabled={busy} /></label>}
      <label className="cf-field">{kind === 'achievement' ? 'Cuenta la historia' : 'Descripción'}<textarea className="c-input cf-textarea" value={text} onChange={event => setText(event.target.value)} maxLength={2000} rows={3} placeholder={kind === 'achievement' ? 'El esfuerzo, el equipo, lo que significa para ti…' : 'Ese gol, esa jugada, ese momento con tu equipo…'} required disabled={busy} /></label>
      {kind !== 'achievement' && <div className="cf-upload-area">
        <label htmlFor={inputId} className={`cf-upload-label ${isLocked ? 'is-disabled' : ''}`}><Upload size={22} /><strong>{validating ? 'Comprobando archivo…' : file ? 'Cambiar archivo' : kind === 'reel' ? 'Elige tu reel' : 'Elige tu foto'}</strong><span>{kind === 'reel' ? 'MP4 o WebM · hasta 90 s · máximo 50 MB' : 'JPG, PNG o WebP · máximo 10 MB'}</span></label>
        <input ref={inputRef} id={inputId} className="cf-file-input" type="file" accept={kind === 'reel' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'} onChange={event => { void chooseFile(event.target.files?.[0]); }} disabled={isLocked} />
        {preview && <div className="cf-upload-preview">{kind === 'reel' ? <video src={preview} muted controls playsInline preload="metadata" /> : <img src={preview} alt="Vista previa de la foto que vas a publicar" />}<div><span>{file?.name}</span><button type="button" className="cf-icon-button" aria-label="Quitar archivo" disabled={isLocked} onClick={() => { setFile(undefined); if (inputRef.current) inputRef.current.value = ''; }}><X size={17} /></button></div></div>}
      </div>}
      <label className="cf-field">Partido o torneo relacionado <span className="cf-optional">(opcional)</span><select className="c-input" value={eventId} onChange={event => setEventId(event.target.value)} disabled={busy}><option value="">Sin evento relacionado</option>{events.filter(event => event.status !== 'cancelled').map(event => <option key={event.id} value={event.id}>{event.title} · {event.city}</option>)}</select></label>
      <div className="cf-compose-footer"><p>{mode === 'demo' ? 'Publicación guardada en este navegador, en modo demo.' : 'Visible para la comunidad de Cantera.'}</p><button className="c-button" type="submit" disabled={isLocked}>{busy ? <><LoaderCircle size={16} className="cf-spin" /> Publicando…</> : validating ? 'Comprobando…' : <>Publicar <ArrowUpRight size={16} /></>}</button></div>
      {busy && file && <div className="cf-progress"><label htmlFor={`${inputId}-progress`}>{progress < 100 ? `Subiendo archivo · ${Math.round(progress)} %` : 'Guardando publicación…'}</label><progress id={`${inputId}-progress`} value={progress} max={100} /></div>}
      {error && <p className="c-error" role="alert">{error}</p>}
    </form>}
  </section>;
}

function FeedCard({ post, selected }: { post: CommunityPost; selected: boolean }) {
  const { profile, events, likes, comments, toggleLike, addComment, deletePost, reportPost, hidePost, mode } = useCommunity();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [dialog, setDialog] = useState<'delete' | 'report' | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'like' | 'comment' | 'delete' | 'report' | null>(null);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [mediaError, setMediaError] = useState(false);
  const cardComments = comments[post.id] ?? [];
  const cardLikes = likes[post.id] ?? [];
  const liked = !!profile && cardLikes.includes(profile.id);
  const event = events.find(event => event.id === post.eventId);
  const isOwnPost = profile?.id === post.authorId;
  const commentInputId = React.useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) video.pause(); }, { threshold: 0.1 });
    observer.observe(video);
    return () => observer.disconnect();
  }, [post.mediaUrl]);
  useEffect(() => {
    if (!showMenu) return;
    function closeOnOutside(event: PointerEvent) { if (!menuRef.current?.contains(event.target as Node)) setShowMenu(false); }
    function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') setShowMenu(false); }
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOnOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [showMenu]);

  async function like() {
    if (!profile || busy) return;
    setBusy('like'); setError('');
    try { await toggleLike(post.id); } catch (error) { setError(errorMessage(error)); } finally { setBusy(null); }
  }
  async function submitComment(event: React.FormEvent) {
    event.preventDefault();
    if (!profile || !comment.trim() || busy) return;
    setBusy('comment'); setError('');
    try { await addComment(post.id, comment.trim()); setComment(''); } catch (error) { setError(errorMessage(error)); } finally { setBusy(null); }
  }
  async function share() {
    const url = new URL(window.location.href);
    url.hash = `/feed?post=${encodeURIComponent(post.id)}`;
    setShareMessage(''); setShareUrl('');
    try { await navigator.clipboard.writeText(url.href); setShareMessage(mode === 'demo' ? 'Enlace local copiado. Esta publicación solo existe en este navegador de prueba.' : 'Enlace copiado. Compártelo con tu equipo.'); }
    catch { setShareUrl(url.href); setShareMessage(mode === 'demo' ? 'Este enlace solo abre la publicación en este navegador de prueba.' : 'Copia este enlace para compartir la publicación.'); }
  }
  async function confirmDelete() {
    if (busy || !isOwnPost) return;
    setBusy('delete'); setDialogError('');
    try { await deletePost(post.id); setDialog(null); } catch (error) { setDialogError(errorMessage(error)); } finally { setBusy(null); }
  }
  async function submitReport(event: React.FormEvent) {
    event.preventDefault();
    if (!profile || busy || !reason.trim()) return;
    setBusy('report'); setDialogError('');
    try { await reportPost(post.id, reason.trim()); setDialog(null); setReason(''); setReportMessage('Denuncia enviada para revisión. También puedes ocultar esta publicación.'); }
    catch (error) { setDialogError(errorMessage(error)); } finally { setBusy(null); }
  }

  return <article id={`cf-post-${post.id}`} className={`c-panel cf-post cf-post--${post.kind} ${selected ? 'cf-post--selected' : ''}`} tabIndex={selected ? -1 : undefined} aria-label={`Publicación de ${post.authorName}`}>
    <header className="cf-post-head"><span className="cf-avatar">{initials(post.authorName)}</span><div className="cf-author"><strong>{post.authorName}</strong><span><time dateTime={post.createdAt}>{readableDate(post.createdAt)}</time><span aria-hidden="true"> · </span>{kindLabels[post.kind]}</span></div><div className="cf-post-menu" ref={menuRef}><button type="button" className="cf-icon-button" aria-label={`Opciones de la publicación de ${post.authorName}`} aria-expanded={showMenu} onClick={() => setShowMenu(!showMenu)}><MoreHorizontal size={21} /></button>{showMenu && <div className="cf-menu-options"><button type="button" onClick={() => { hidePost(post.id); setShowMenu(false); }}><EyeOff size={16} /> Ocultar publicación</button>{isOwnPost ? <button type="button" className="cf-delete-option" onClick={() => { setDialog('delete'); setDialogError(''); setShowMenu(false); }}><Trash2 size={16} /> Eliminar publicación</button> : profile ? <button type="button" onClick={() => { setDialog('report'); setDialogError(''); setShowMenu(false); }}><Flag size={16} /> Denunciar contenido</button> : <Link to="/profile"><Flag size={16} /> Acceder para denunciar</Link>}</div>}</div></header>
    {post.kind === 'achievement' && <div className="cf-achievement"><span className="cf-achievement-label"><Award size={17} /> Un paso más</span><h2>{post.title}</h2>{post.text && <p className="cf-post-text">{post.text}</p>}<span className="cf-achievement-mark" aria-hidden="true"><Award size={108} strokeWidth={1} /></span></div>}
    {post.kind !== 'achievement' && post.mediaUrl && <div className="cf-media">{mediaError ? <div className="cf-media-failure"><Film size={26} /><p>No pudimos cargar este {post.kind === 'reel' ? 'vídeo' : 'archivo'}.</p><button type="button" className="c-button secondary" onClick={() => setMediaError(false)}>Volver a intentar</button></div> : post.kind === 'reel' ? <video ref={videoRef} src={post.mediaUrl} muted controls playsInline loop preload="metadata" onError={() => setMediaError(true)} onPlay={event => { document.querySelectorAll<HTMLVideoElement>('.cf-media video').forEach(video => { if (video !== event.currentTarget) video.pause(); }); }} aria-label={`Reel de ${post.authorName}`} /> : <img src={post.mediaUrl} alt={post.text || `Foto compartida por ${post.authorName}`} loading="lazy" onError={() => setMediaError(true)} />}</div>}
    {post.kind !== 'achievement' && !post.mediaUrl && <p className="cf-inline-note">El archivo de esta publicación ya no está disponible en este navegador.</p>}
    {post.kind !== 'achievement' && post.text && <p className="cf-post-text cf-caption">{post.text}</p>}
    {post.eventId && <Link className="cf-event-link" to={`/play/${encodeURIComponent(post.eventId)}`}><CalendarDays size={15} /><span>{event?.title || 'Ver partido o torneo relacionado'}</span><ArrowUpRight size={15} /></Link>}
    <div className="cf-post-actions">{profile ? <button type="button" className={liked ? 'cf-is-liked' : ''} aria-pressed={liked} onClick={() => { void like(); }} disabled={busy === 'like'} aria-label={`${liked ? 'Quitar me gusta' : 'Me gusta'} · ${cardLikes.length}`}><Heart size={20} fill={liked ? 'currentColor' : 'none'} /><span>{cardLikes.length > 0 ? cardLikes.length : 'Me gusta'}</span></button> : <Link to="/profile"><Heart size={20} /><span>{cardLikes.length || 'Me gusta'}</span></Link>}<button type="button" aria-expanded={showComments} onClick={() => setShowComments(!showComments)}><MessageCircle size={20} /><span>{cardComments.length > 0 ? `${cardComments.length} ${cardComments.length === 1 ? 'comentario' : 'comentarios'}` : 'Comentar'}</span></button><button type="button" className="cf-share-action" onClick={() => { void share(); }} aria-label="Compartir publicación"><Share2 size={19} /><span>Compartir</span></button></div>
    {shareMessage && <div className="cf-inline-note" role="status"><Check size={15} /><span>{shareMessage}</span>{shareUrl && <input className="c-input cf-share-url" value={shareUrl} readOnly aria-label="Enlace a esta publicación" onFocus={event => event.target.select()} />}</div>}
    {reportMessage && <p className="cf-inline-note" role="status">{reportMessage}</p>}
    {error && <p className="c-error cf-card-error" role="alert">{error}</p>}
    {showComments && <section className="cf-comments" aria-label="Comentarios de la publicación">{cardComments.length === 0 ? <p className="cf-no-comments">Empieza la conversación. El equipo también juega aquí.</p> : <ul className="cf-comment-list">{cardComments.map(item => <li key={item.id}><span className="cf-avatar cf-avatar--small">{initials(item.authorName)}</span><div><strong>{item.authorName}</strong><p>{item.text}</p><time dateTime={item.createdAt}>{readableDate(item.createdAt)}</time></div></li>)}</ul>}{profile ? <form className="cf-comment-form" onSubmit={submitComment}><label htmlFor={commentInputId} className="cf-sr-only">Escribir un comentario</label><input id={commentInputId} className="c-input" value={comment} onChange={event => setComment(event.target.value)} maxLength={500} placeholder="Anima, pregunta, comparte…" disabled={busy === 'comment'} required /><button type="submit" className="cf-comment-submit" disabled={!comment.trim() || !!busy} aria-label="Publicar comentario">{busy === 'comment' ? <LoaderCircle className="cf-spin" size={19} /> : <ArrowUpRight size={19} />}</button></form> : <Link className="cf-login-link" to="/profile">Crea tu perfil para comentar <ArrowRight size={15} /></Link>}</section>}
    {dialog === 'delete' && <Modal title="¿Eliminar esta publicación?" onClose={() => { if (busy !== 'delete') setDialog(null); }}><p>La publicación dejará de aparecer en el feed. Esta acción no se puede deshacer.</p>{dialogError && <p className="c-error" role="alert">{dialogError}</p>}<div className="cf-dialog-actions"><button type="button" className="c-button secondary" onClick={() => setDialog(null)} disabled={busy === 'delete'}>Conservar</button><button type="button" className="c-button cf-danger-button" onClick={() => { void confirmDelete(); }} disabled={busy === 'delete'}>{busy === 'delete' ? 'Eliminando…' : 'Eliminar publicación'}</button></div></Modal>}
    {dialog === 'report' && <Modal title="Denunciar publicación" onClose={() => { if (busy !== 'report') setDialog(null); }}><form onSubmit={submitReport}><p>Cuéntanos qué ocurre para que podamos revisarlo.</p><label className="cf-field">Motivo de la denuncia<textarea className="c-input cf-textarea" value={reason} onChange={event => setReason(event.target.value)} placeholder="Acoso, contenido inapropiado, suplantación…" maxLength={1000} minLength={5} required rows={4} disabled={busy === 'report'} /></label>{dialogError && <p className="c-error" role="alert">{dialogError}</p>}<div className="cf-dialog-actions"><button type="button" className="c-button secondary" onClick={() => setDialog(null)} disabled={busy === 'report'}>Cancelar</button><button type="submit" className="c-button" disabled={busy === 'report' || reason.trim().length < 5}>{busy === 'report' ? 'Enviando…' : 'Enviar denuncia'}</button></div></form></Modal>}
  </article>;
}

export default function FeedPage() {
  const { profile, posts, events, loading, hiddenPostIds, mode } = useCommunity();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [params, setParams] = useSearchParams();
  const [publishedMessage, setPublishedMessage] = useState('');
  const selectedId = params.get('post');
  const scrolledId = useRef<string | null>(null);
  // Published stories are public; profile is required for writing and interacting.
  const cloudGuest = false;
  const visiblePosts = cloudGuest ? [] : posts.filter(post => !hiddenPostIds.includes(post.id) && (filter === 'all' || post.kind === filter)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const selectedPostVisible = visiblePosts.some(post => post.id === selectedId);
  const nextEvents = events.filter(event => event.status === 'open' && new Date(event.startAt).getTime() > Date.now()).sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, 3);

  useEffect(() => { setFilter('all'); scrolledId.current = null; }, [selectedId]);
  useEffect(() => {
    if (!selectedId || loading || scrolledId.current === selectedId) return;
    const timer = requestAnimationFrame(() => {
      const card = document.getElementById(`cf-post-${selectedId}`);
      if (card) { card.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); card.focus({ preventScroll: true }); scrolledId.current = selectedId; }
    });
    return () => cancelAnimationFrame(timer);
  }, [selectedId, loading, selectedPostVisible, filter]);

  function onPublished(id: string) {
    setFilter('all'); setPublishedMessage(mode === 'demo' ? 'Publicación guardada en este navegador de prueba.' : 'Tu publicación ya está en la comunidad.');
    setParams({ post: id });
  }

  return <div className="cf-page">
    <header className="cf-page-head"><div><p className="c-eyebrow">LA COMUNIDAD · CANTERA</p><h1>El juego sigue<br /><span>fuera de la cancha.</span></h1><p className="cf-page-intro">Jugadas que inspiran. Equipos que conectan. Historias que merecen verse.</p></div><div className="cf-head-stat"><span className="cf-stat-line" /><p>Tu fútbol.<br /><strong>Tu comunidad.</strong></p></div></header>
    <div className="cf-layout"><main className="cf-main"><Composer onPublished={onPublished} />
      <div className="cf-filter-row"><div className="cf-filters" aria-label="Filtrar publicaciones">{filters.map(item => { const Icon = item.icon; return <button type="button" key={item.id} className={filter === item.id ? 'is-active' : ''} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{Icon && <Icon size={16} />}{item.label}</button>; })}</div><span className="cf-latest-label">Lo más reciente</span></div>
      {publishedMessage && <p className="cf-published-note" role="status"><Check size={16} />{publishedMessage}<button type="button" className="cf-icon-button" onClick={() => setPublishedMessage('')} aria-label="Cerrar aviso"><X size={15} /></button></p>}
      {loading ? <div className="c-panel cf-loading" role="status"><LoaderCircle size={22} className="cf-spin" /><p>Cargando historias de la comunidad…</p></div> : cloudGuest ? <div className="c-panel cf-empty-feed"><span className="cf-empty-icon"><Heart size={30} strokeWidth={1.5} /></span><p className="c-eyebrow">NOS VEMOS EN LA CANCHA</p><h2>Una comunidad que juega contigo.</h2><p>Accede para ver las publicaciones, compartir tus jugadas y celebrar los logros de tu equipo.</p><Link className="c-button" to="/profile">Acceder a la comunidad <ArrowUpRight size={16} /></Link></div> : visiblePosts.length === 0 ? <div className="c-panel cf-empty-feed"><span className="cf-empty-icon">{filter === 'reel' ? <Film size={30} strokeWidth={1.5} /> : filter === 'photo' ? <Camera size={30} strokeWidth={1.5} /> : <Award size={30} strokeWidth={1.5} />}</span><p className="c-eyebrow">TODAS LAS HISTORIAS EMPIEZAN AQUÍ</p><h2>{filter === 'all' ? 'Estrena la cancha.' : `El próximo ${kindLabels[filter].toLowerCase()} puede ser el tuyo.`}</h2><p>{hiddenPostIds.length ? 'No hay publicaciones visibles en esta sección. Comparte un momento o explora otra categoría.' : 'Comparte una jugada, una foto con tu equipo o ese logro que te hizo seguir entrenando.'}</p>{filter !== 'all' && <button type="button" className="c-button secondary" onClick={() => setFilter('all')}>Ver toda la comunidad <ArrowRight size={16} /></button>}</div> : <div className={`cf-stream ${filter === 'reel' ? 'cf-stream--reels' : ''}`} aria-label={filter === 'reel' ? 'Reels de la comunidad, desplázate para ver el siguiente' : 'Publicaciones de la comunidad'} tabIndex={filter === 'reel' ? 0 : undefined}>{visiblePosts.map(post => <FeedCard key={post.id} post={post} selected={post.id === selectedId} />)}</div>}
      {selectedId && !loading && !cloudGuest && !posts.some(post => post.id === selectedId) && <p className="cf-inline-note" role="status">La publicación de este enlace ya no está disponible o no tienes acceso a ella.</p>}
    </main><aside className="cf-sidebar"><section className="cf-play-invitation"><span className="cf-invitation-number" aria-hidden="true">90′</span><p className="c-eyebrow">MENOS SCROLL. MÁS FÚTBOL.</p><h2>La próxima historia<br />empieza jugando.</h2><p>Organiza un partido o encuentra un torneo cerca de ti. Jugar y organizar en Cantera es gratis.</p><Link to="/play" className="cf-invitation-link">Encuentra tu próximo partido <ArrowUpRight size={18} /></Link></section>
      <section className="c-panel cf-upcoming"><div className="cf-sidebar-heading"><h2>En la cancha</h2><Link to="/play" aria-label="Ver todos los partidos y torneos"><ArrowUpRight size={18} /></Link></div>{nextEvents.length ? nextEvents.map(event => <Link key={event.id} to={`/play/${encodeURIComponent(event.id)}`} className="cf-upcoming-event"><span className="cf-event-date">{new Date(event.startAt).getDate()}<small>{new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(event.startAt))}</small></span><div><strong>{event.title}</strong><span><MapPin size={12} />{event.city}</span><small>{event.type === 'tournament' ? 'Torneo' : 'Partido'} · Fútbol {event.format}</small></div><ArrowUpRight size={15} /></Link>) : <div className="cf-sidebar-empty"><CalendarDays size={22} strokeWidth={1.5} /><p>Todavía no hay próximos eventos.</p><Link to="/play">Organiza el primero <ArrowRight size={14} /></Link></div>}</section>
      <div className="cf-community-note"><p className="c-eyebrow">JUGAMOS EN EL MISMO EQUIPO</p><p>Comparte contenido propio, respeta a los demás y pide permiso antes de publicar a otras personas.</p><span>El talento se ve. El respeto también.</span></div>
    </aside></div>
  </div>;
}
