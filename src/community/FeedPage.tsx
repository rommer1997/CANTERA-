import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Award, CalendarDays, Camera, Check, CircleUserRound, Ban, EyeOff, Film, Flag, Heart, LoaderCircle, MapPin, MessageCircle, MoreHorizontal, Plus, Search, Share2, ShieldCheck, Trash2, Upload, UsersRound, X } from 'lucide-react';
import { friendlyError, useCommunity, usePublicProfile } from './CommunityContext';
import { legalReady } from './legal';
import { isPublicEvent } from './eventPrivacy';
import type { CommunityPost, PostComment, PostInput, PostKind } from './types';
import './feed.css';

type FeedFilter = 'all' | PostKind;
type FeedSource = 'community' | 'following';
type ComposerRequest = { sequence: number; kind?: PostKind };
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

function AuthorName({ authorId, fallback }: { authorId: string; fallback: string }) {
  const example = authorId === 'example-community';
  const author = usePublicProfile(example ? '' : authorId);
  const name = author?.name || fallback;
  return <span className="cf-author-name">{example ? <strong>{name}</strong> : <Link to={`/people/${encodeURIComponent(authorId)}`}><strong>{name}</strong></Link>}{author?.verification === 'verified' && <ShieldCheck size={15} className="cf-verified" role="img" aria-label="Identidad verificada" />}</span>;
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

function Modal({ title, children, onClose, returnFocusRef }: { title: string; children: React.ReactNode; onClose: () => void; returnFocusRef: React.RefObject<HTMLButtonElement | null> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = React.useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
      requestAnimationFrame(() => {
        // Let the card removal commit before selecting a surviving focus target.
        if (document.querySelector('dialog[open]')) return;
        const target = returnFocusRef.current?.isConnected ? returnFocusRef.current : document.getElementById('cf-feed-fallback') || document.getElementById('cf-feed-heading');
        target?.focus({ preventScroll: true });
      });
    };
  }, [returnFocusRef]);
  return <dialog ref={ref} className="cf-dialog" aria-labelledby={headingId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="cf-dialog-head"><h2 id={headingId}>{title}</h2><button type="button" className="cf-icon-button" onClick={onClose} aria-label="Cerrar diálogo"><X size={19} /></button></div>
    {children}
  </dialog>;
}

function Composer({ onPublished, openRequest }: { onPublished: (id: string) => void; openRequest: ComposerRequest }) {
  const { profile, events, createPost, mode, mediaUploadsEnabled, runtimeConfig } = useCommunity();
  const [expanded, setExpanded] = useState(false);
  const [kind, setKind] = useState<PostKind>('achievement');
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
  const formRef = useRef<HTMLFormElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const consumedRequest = useRef(0);
  const focusPending = useRef(false);
  const fileSequence = useRef(0);
  const inputId = React.useId();
  const isLocked = busy || validating;
  const publishingUnavailable = mode === 'cloud' && runtimeConfig.serviceStatus !== 'open';

  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => { fileSequence.current += 1; }, []);
  useEffect(() => {
    if (!profile || !openRequest.sequence || openRequest.sequence === consumedRequest.current) return;
    consumedRequest.current = openRequest.sequence;
    if (openRequest.kind) {
      fileSequence.current += 1;
      setKind(openRequest.kind !== 'achievement' && !mediaUploadsEnabled ? 'achievement' : openRequest.kind);
      setFile(undefined); setError(''); setValidating(false);
      if (inputRef.current) inputRef.current.value = '';
    }
    focusPending.current = true;
    setExpanded(true);
  }, [openRequest, profile?.id, mediaUploadsEnabled]);
  useEffect(() => {
    if (!expanded || !focusPending.current) return;
    const frame = requestAnimationFrame(() => {
      const form = formRef.current;
      if (!form) return;
      focusPending.current = false;
      form.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
      form.querySelector<HTMLInputElement | HTMLTextAreaElement>('input:not([type="file"]), textarea')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [expanded, openRequest.sequence, kind]);
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

  function openComposer(next?: PostKind) {
    if (next) changeKind(next);
    focusPending.current = true;
    setExpanded(true);
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

  if (!profile) return <div className="cf-composer cf-join-composer"><CircleUserRound size={22} aria-hidden="true" /><Link to="/profile">Accede para publicar <ArrowUpRight size={17} /></Link></div>;

  return <section className="cf-composer" aria-label="Crear una publicación">
    <div className="cf-composer-top"><Link className="cf-avatar" to="/profile" aria-label="Ir a tu perfil">{initials(profile.name)}</Link><button ref={triggerRef} type="button" className="cf-compose-trigger" onClick={() => openComposer()} aria-haspopup="dialog" aria-expanded={expanded} disabled={isLocked}><span className="cf-compose-label">Compartir una publicación…</span><Plus size={17} /></button></div>
    {expanded && <Modal title="Nueva publicación" returnFocusRef={triggerRef} onClose={() => { if (!isLocked) setExpanded(false); }}>
    <form ref={formRef} className="cf-compose-form" onSubmit={publish} >
      <div className="cf-kind-picker" aria-label="Tipo de publicación">{(['reel', 'photo', 'achievement'] as PostKind[]).map(type => <button key={type} type="button" aria-pressed={kind === type} className={kind === type ? 'is-active' : ''} disabled={isLocked || type !== 'achievement' && !mediaUploadsEnabled} onClick={() => changeKind(type)}>{kindLabels[type]}</button>)}</div>
      {!mediaUploadsEnabled && <p className="cf-media-notice">Fotos y reels pendientes de patrocinio. Los logros escritos están disponibles.</p>}
      {kind === 'achievement' && <label className="cf-field">Título del logro<input className="c-input" value={title} onChange={event => setTitle(event.target.value)} maxLength={100} placeholder="Mi primer gol con el equipo" required disabled={busy} /></label>}
      <label className="cf-field">{kind === 'achievement' ? 'Publicación' : 'Descripción'}<textarea className="c-input cf-textarea" value={text} onChange={event => setText(event.target.value)} maxLength={2000} rows={3} placeholder="Escribe tu publicación…" required disabled={busy} /></label>
      {kind !== 'achievement' && <div className="cf-upload-area">
        <label htmlFor={inputId} className={`cf-upload-label ${isLocked ? 'is-disabled' : ''}`}><Upload size={22} /><strong>{validating ? 'Comprobando archivo…' : file ? 'Cambiar archivo' : kind === 'reel' ? 'Elige tu reel' : 'Elige tu foto'}</strong><span>{kind === 'reel' ? 'MP4 o WebM · hasta 90 s · máximo 50 MB' : 'JPG, PNG o WebP · máximo 10 MB'}</span></label>
        <input ref={inputRef} id={inputId} className="cf-file-input" type="file" accept={kind === 'reel' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'} onChange={event => { void chooseFile(event.target.files?.[0]); }} disabled={isLocked} />
        {preview && <div className="cf-upload-preview">{kind === 'reel' ? <video src={preview} muted controls playsInline preload="metadata" /> : <img src={preview} alt="Vista previa de la foto que vas a publicar" />}<div><span>{file?.name}</span><button type="button" className="cf-icon-button" aria-label="Quitar archivo" disabled={isLocked} onClick={() => { setFile(undefined); if (inputRef.current) inputRef.current.value = ''; }}><X size={17} /></button></div></div>}
      </div>}
      <label className="cf-field">Partido o torneo relacionado <span className="cf-optional">(opcional)</span><select className="c-input" value={eventId} onChange={event => setEventId(event.target.value)} disabled={busy}><option value="">Sin evento relacionado</option>{events.filter(event => isPublicEvent(event) && event.status !== 'cancelled').map(event => <option key={event.id} value={event.id}>{event.title} · {event.city}</option>)}</select><small>Las publicaciones son públicas; sólo puedes vincular encuentros públicos.</small></label>
      {publishingUnavailable && <p className="c-error" role="status">El servicio aún no admite nuevas publicaciones. Puedes volver cuando se abra.</p>}
      <div className="cf-compose-footer"><p>{mode === 'demo' ? 'Prueba local · sólo en este navegador.' : 'Publicación pública.'}</p><button className="c-button" type="submit" disabled={isLocked || publishingUnavailable}>{busy ? <><LoaderCircle size={16} className="cf-spin" /> Publicando…</> : validating ? 'Comprobando…' : <>Publicar <ArrowUpRight size={16} /></>}</button></div>
      {busy && file && <div className="cf-progress"><label htmlFor={`${inputId}-progress`}>{progress < 100 ? `Subiendo archivo · ${Math.round(progress)} %` : 'Guardando publicación…'}</label><progress id={`${inputId}-progress`} value={progress} max={100} /></div>}
      {error && <p className="c-error" role="alert">{error}</p>}
    </form></Modal>}
  </section>;
}

function CommentRow({ postId, item }: { postId: string; item: PostComment }) {
  const { profile, isAdmin, deleteComment, reportComment, toggleBlock, blockedIds, mode } = useCommunity();
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState<'delete' | 'report' | 'block' | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const optionsRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const own = profile?.id === item.authorId;
  useEffect(() => {
    if (!menu) return;
    const outside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenu(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenu(false); optionsRef.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [menu]);
  async function act() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (dialog === 'delete') await deleteComment(postId, item.id);
      else if (dialog === 'report') { await reportComment(postId, item.id, reason.trim()); setNotice(mode === 'demo' ? 'Denuncia guardada en esta prueba local.' : 'Denuncia enviada para revisión.'); }
      else if (dialog === 'block') await toggleBlock(item.authorId);
      setDialog(null); setReason('');
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  return <li className="cf-comment-row"><span className="cf-avatar cf-avatar--small">{initials(item.authorName)}</span><div className="cf-comment-body"><AuthorName authorId={item.authorId} fallback={item.authorName} /><p>{item.text}</p><time dateTime={item.createdAt}>{readableDate(item.createdAt)}</time>{notice && <p role="status">{notice}</p>}</div>{profile && <div className="cf-post-menu" ref={menuRef}><button ref={optionsRef} type="button" className="cf-icon-button" aria-label={`Opciones del comentario de ${item.authorName}`} aria-expanded={menu} onClick={() => setMenu(!menu)}><MoreHorizontal size={18} /></button>{menu && <div className="cf-menu-options">{own || isAdmin ? <button type="button" onClick={() => { setMenu(false); setError(''); setDialog('delete'); }}><Trash2 size={17} />Eliminar comentario</button> : <><button type="button" onClick={() => { setMenu(false); setError(''); setDialog('report'); }}><Flag size={17} />Denunciar comentario</button><button type="button" onClick={() => { setMenu(false); setError(''); setDialog('block'); }}><Ban size={17} />{blockedIds.includes(item.authorId) ? 'Desbloquear cuenta' : 'Bloquear cuenta'}</button></>}</div>}</div>}
    {dialog && <Modal title={dialog === 'delete' ? 'Eliminar comentario' : dialog === 'block' ? 'Bloquear cuenta' : 'Denunciar comentario'} returnFocusRef={optionsRef} onClose={() => { if (!busy) setDialog(null); }}><form onSubmit={event => { event.preventDefault(); void act(); }}><p>{dialog === 'delete' ? own ? 'Tu comentario dejará de aparecer. Puedes retirarlo aunque no hayas aceptado una nueva versión de los términos.' : 'El comentario dejará de aparecer.' : dialog === 'block' ? 'Oculta su contenido, retira vuestra conexión e impide nuevos mensajes. Desbloquear no reconecta: deberéis aceptar otra invitación válida. Puedes gestionar el bloqueo en Personas y equipos.' : 'Indica el motivo para que el administrador lo revise.'}</p>{dialog === 'report' && <label className="cf-field">Motivo<textarea className="c-input cf-textarea" value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={1000} required disabled={busy} /></label>}{error && <p className="c-error" role="alert">{error}</p>}<div className="cf-dialog-actions"><button type="button" className="c-button secondary" disabled={busy} onClick={() => setDialog(null)}>Cancelar</button><button className="c-button" disabled={busy || dialog === 'report' && reason.trim().length < 5}>{busy ? 'Guardando…' : dialog === 'delete' ? 'Eliminar' : dialog === 'block' ? 'Bloquear' : 'Enviar denuncia'}</button></div></form></Modal>}
  </li>;
}

function FeedCard({ post, selected, onHidden }: { post: CommunityPost; selected: boolean; onHidden?: () => void }) {
  const { profile, events, likes, comments, toggleLike, addComment, deletePost, reportPost, hidePost, mode, followingIds, toggleFollow, watchPostInteractions, postInteractionStates, loadMoreComments, blockedIds, toggleBlock } = useCommunity();
  const example = post.authorId === 'example-community';
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [dialog, setDialog] = useState<'delete' | 'report' | 'block' | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'like' | 'comment' | 'delete' | 'report' | 'follow' | 'block' | 'more' | null>(null);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [mediaError, setMediaError] = useState(false);
  const [nearby, setNearby] = useState(selected);
  const author = usePublicProfile(!example && (nearby || selected) ? post.authorId : '');
  const authorName = author?.name || post.authorName;
  const interaction = postInteractionStates[post.id];
  const countsReady = !!interaction && !interaction.loading && !interaction.error;
  const cardComments = (comments[post.id] ?? []).filter(item => !blockedIds.includes(item.authorId));
  const liked = !!profile && (likes[post.id] ?? []).includes(profile.id);
  const event = events.find(event => event.id === post.eventId && isPublicEvent(event));
  const isOwnPost = profile?.id === post.authorId;
  const following = followingIds.includes(post.authorId);
  const commentInputId = React.useId();
  const cardRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const card = cardRef.current;
    if (nearby || !card) return;
    if (!('IntersectionObserver' in window)) { setNearby(true); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setNearby(true); observer.disconnect(); } }, { rootMargin: '200px' });
    observer.observe(card); return () => observer.disconnect();
  }, [nearby]);
  useEffect(() => { if (nearby || selected) return watchPostInteractions(post.id); }, [post.id, nearby, selected, watchPostInteractions]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) video.pause(); }, { threshold: .1 });
    observer.observe(video); return () => observer.disconnect();
  }, [post.mediaUrl]);
  useEffect(() => {
    if (!showMenu) return;
    const outside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setShowMenu(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setShowMenu(false); optionsButtonRef.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [showMenu]);
  async function action(kind: 'like' | 'comment' | 'follow' | 'more', work: () => Promise<void>) {
    if (busy) return;
    setBusy(kind); setError(''); try { await work(); } catch (err) { setError(errorMessage(err)); } finally { setBusy(null); }
  }
  async function share() {
    const url = new URL(window.location.href); url.hash = `/feed?post=${encodeURIComponent(post.id)}`;
    setShareMessage(''); setShareUrl('');
    try { await navigator.clipboard.writeText(url.href); setShareMessage(mode === 'demo' ? 'Enlace local copiado. Sólo existe en este navegador de prueba.' : 'Enlace copiado.'); }
    catch { setShareUrl(url.href); setShareMessage(mode === 'demo' ? 'El enlace sólo funciona en este navegador de prueba.' : 'Copia el enlace para compartir.'); }
  }
  async function confirmDialog(event: React.FormEvent) {
    event.preventDefault(); if (busy || !dialog) return;
    setBusy(dialog); setDialogError('');
    try {
      if (dialog === 'delete') await deletePost(post.id);
      else if (dialog === 'block') await toggleBlock(post.authorId);
      else { await reportPost(post.id, reason.trim()); setReportMessage(mode === 'demo' ? 'Denuncia guardada en esta prueba local. No se envió a un administrador.' : 'Denuncia enviada para revisión.'); }
      setDialog(null); setReason('');
    } catch (err) { setDialogError(errorMessage(err)); } finally { setBusy(null); }
  }
  function openDialog(next: 'delete' | 'report' | 'block') { setShowMenu(false); setDialogError(''); setDialog(next); }
  return <article ref={cardRef} id={`cf-post-${post.id}`} className={`c-panel cf-post cf-post--${post.kind} ${selected ? 'cf-post--selected' : ''}`} tabIndex={selected ? -1 : undefined} aria-label={`Publicación de ${authorName}`}>
    <header className="cf-post-head">{example ? <span className="cf-avatar">{initials(authorName)}</span> : <Link className="cf-avatar" to={`/people/${encodeURIComponent(post.authorId)}`} aria-label={`Ver perfil de ${authorName}`}>{initials(authorName)}</Link>}<div className="cf-author"><span className="cf-author-name">{example ? <strong>{authorName}</strong> : <Link to={`/people/${encodeURIComponent(post.authorId)}`}><strong>{authorName}</strong></Link>}{author?.verification === 'verified' && <ShieldCheck size={16} className="cf-verified" role="img" aria-label="Identidad verificada" />}</span><span className="cf-post-meta"><time dateTime={post.createdAt}>{readableDate(post.createdAt)}</time> · {kindLabels[post.kind]}</span></div>{profile && author && !isOwnPost && <button className={`cf-follow-button ${following ? 'is-following' : ''}`} type="button" aria-pressed={following} aria-label={`${following ? 'Dejar de seguir a' : 'Seguir a'} ${authorName}`} disabled={!!busy} onClick={() => { void action('follow', () => toggleFollow(post.authorId)); }}>{following ? <Check size={15} /> : <Plus size={15} />}<span>{following ? 'Siguiendo' : 'Seguir'}</span></button>}<div className="cf-post-menu" ref={menuRef}><button ref={optionsButtonRef} type="button" className="cf-icon-button" aria-label={`Opciones de la publicación de ${authorName}`} aria-expanded={showMenu} onClick={() => setShowMenu(!showMenu)}><MoreHorizontal size={21} /></button>{showMenu && <div className="cf-menu-options"><button type="button" onClick={() => { hidePost(post.id); setShowMenu(false); onHidden?.(); }}><EyeOff size={17} />Ocultar publicación</button>{isOwnPost ? <button type="button" onClick={() => openDialog('delete')}><Trash2 size={17} />Eliminar publicación</button> : profile && !example ? <><button type="button" onClick={() => openDialog('report')}><Flag size={17} />Denunciar publicación</button><button type="button" onClick={() => openDialog('block')}><Ban size={17} />Bloquear cuenta</button></> : !profile ? <Link to="/profile"><Flag size={17} />Acceder para denunciar</Link> : null}</div>}</div></header>
    {post.kind === 'achievement' && <div className="cf-achievement"><span className="cf-achievement-label"><Award size={16} />Logro</span><h2>{post.title}</h2><p className="cf-post-text">{post.text}</p></div>}
    {post.kind !== 'achievement' && post.mediaUrl && <div className="cf-media">{mediaError ? <div className="cf-media-failure"><Film size={26} /><p>No pudimos cargar el archivo.</p><button type="button" className="c-button secondary" onClick={() => setMediaError(false)}>Reintentar</button></div> : post.kind === 'reel' ? <video ref={videoRef} src={post.mediaUrl} muted controls playsInline loop preload="metadata" onError={() => setMediaError(true)} onPlay={event => { document.querySelectorAll<HTMLVideoElement>('.cf-media video').forEach(video => { if (video !== event.currentTarget) video.pause(); }); }} aria-label={`Reel de ${authorName}`} /> : <img src={post.mediaUrl} alt={post.text || `Foto de ${authorName}`} loading="lazy" onError={() => setMediaError(true)} />}</div>}
    {post.kind !== 'achievement' && !post.mediaUrl && <p className="cf-inline-note">Archivo no disponible.</p>}
    {post.kind !== 'achievement' && <p className="cf-post-text cf-caption">{post.text}</p>}
    {post.eventId && <Link className="cf-event-link" to={`/play/${encodeURIComponent(post.eventId)}`}><CalendarDays size={17} /><span>{event?.title || 'Ver partido o torneo relacionado'}</span><ArrowUpRight size={16} /></Link>}
    <div className="cf-post-actions">{profile ? <button type="button" aria-pressed={liked} className={liked ? 'cf-is-liked' : ''} disabled={!!busy || !countsReady} onClick={() => { void action('like', () => toggleLike(post.id)); }} aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}><Heart size={22} fill={liked ? 'currentColor' : 'none'} /><span>{countsReady ? interaction.likesCount : 'Me gusta'}</span></button> : <Link to="/profile"><Heart size={22} /><span>{countsReady ? interaction.likesCount : 'Me gusta'}</span></Link>}<button type="button" aria-expanded={showComments} onClick={() => setShowComments(!showComments)}><MessageCircle size={22} /><span>{countsReady ? interaction.commentsCount : 'Comentarios'}</span></button><button type="button" className="cf-share-action" onClick={() => { void share(); }} aria-label="Compartir publicación"><Share2 size={21} /><span>Compartir</span></button></div>
    {interaction?.error && <p className="c-error" role="alert">No se pudieron cargar las interacciones: {interaction.error}</p>}
    {shareMessage && <div className="cf-inline-note" role="status">{shareMessage}{shareUrl && <input className="c-input" value={shareUrl} readOnly aria-label="Enlace de la publicación" onFocus={event => event.target.select()} />}</div>}{reportMessage && <p className="cf-inline-note" role="status">{reportMessage}</p>}{error && <p className="c-error" role="alert">{error}</p>}
    {showComments && <section className="cf-comments" aria-label="Comentarios">{cardComments.length < (comments[post.id] || []).length && <p className="cf-no-comments">Contenido de cuentas bloqueadas oculto.</p>}<ul className="cf-comment-list">{cardComments.map(item => <CommentRow key={item.id} postId={post.id} item={item} />)}</ul>{interaction?.loading && <p role="status">Cargando comentarios…</p>}{!profile && <p className="cf-no-comments">Accede para leer y escribir comentarios.</p>}{profile && countsReady && !cardComments.length && <p className="cf-no-comments">{interaction.commentsCount ? 'Los comentarios visibles de esta página no están disponibles.' : 'Todavía no hay comentarios.'}</p>}{interaction?.hasMoreComments && <button type="button" className="c-button secondary" disabled={!!busy || interaction.loading} onClick={() => { void action('more', () => loadMoreComments(post.id)); }}>Comentarios anteriores</button>}{profile ? <form className="cf-comment-form" onSubmit={event => { event.preventDefault(); if (comment.trim()) void action('comment', async () => { await addComment(post.id, comment.trim()); setComment(''); }); }}><label htmlFor={commentInputId} className="cf-sr-only">Escribir comentario</label><input id={commentInputId} className="c-input" value={comment} onChange={event => setComment(event.target.value)} maxLength={1000} placeholder="Escribe un comentario…" disabled={!!busy} required /><button type="submit" className="cf-comment-submit" disabled={!comment.trim() || !!busy} aria-label="Publicar comentario"><ArrowUpRight size={22} /></button></form> : <Link className="cf-login-link" to="/profile">Acceder para comentar <ArrowRight size={17} /></Link>}</section>}
    {dialog && <Modal title={dialog === 'delete' ? 'Eliminar publicación' : dialog === 'block' ? 'Bloquear cuenta' : 'Denunciar publicación'} returnFocusRef={optionsButtonRef} onClose={() => { if (!busy) setDialog(null); }}><form onSubmit={confirmDialog}><p>{dialog === 'delete' ? 'La publicación dejará de aparecer. Esta acción no se puede deshacer.' : dialog === 'block' ? 'Oculta su contenido, retira vuestra conexión e impide nuevos mensajes. Desbloquear no reconecta: deberéis aceptar otra invitación válida. Puedes gestionar el bloqueo en Personas y equipos.' : 'Explica el motivo para que el administrador lo revise.'}</p>{dialog === 'report' && <label className="cf-field">Motivo<textarea className="c-input cf-textarea" value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={1000} rows={4} required disabled={!!busy} /></label>}{dialogError && <p className="c-error" role="alert">{dialogError}</p>}<div className="cf-dialog-actions"><button type="button" className="c-button secondary" disabled={!!busy} onClick={() => setDialog(null)}>Cancelar</button><button className="c-button" disabled={!!busy || dialog === 'report' && reason.trim().length < 5}>{busy ? 'Guardando…' : dialog === 'delete' ? 'Eliminar' : dialog === 'block' ? 'Bloquear' : 'Enviar denuncia'}</button></div></form></Modal>}
  </article>;
}

export default function FeedPage() {
  const { profile, posts, events, loading, hiddenPostIds, mode, runtimeConfig, mediaUploadsEnabled, followingIds, watchPost, linkedPostStates, blockedIds, postsLoading, postsHasMore, loadMorePosts } = useCommunity();
  const communityUnavailable = mode === 'cloud' && (runtimeConfig.serviceStatus !== 'open' || import.meta.env.VITE_SERVICE_OPEN !== 'true' || !legalReady);
  const communityPaused = runtimeConfig.serviceStatus === 'paused';
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [source, setSource] = useState<FeedSource>('community');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [pagingError, setPagingError] = useState('');
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [composerRequest, setComposerRequest] = useState<ComposerRequest>({ sequence: 0 });
  const [publishedMessage, setPublishedMessage] = useState('');
  const handledCreate = useRef<string | null>(null);
  const requestedKind = params.get('create');
  const selectedId = params.get('post');
  const [postRetry, setPostRetry] = useState(0);
  const validSelectedId = !!selectedId && selectedId.length <= 128 && !['__proto__', 'constructor', 'prototype', '.', '..'].includes(selectedId) && !/[\/\\\u0000-\u001f\u007f]/.test(selectedId);
  const selectedState = selectedId ? validSelectedId ? linkedPostStates[selectedId] || 'loading' : 'missing' : null;
  const scrolledId = useRef<string | null>(null);
  const searchId = React.useId();
  const searchKey = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es').trim();
  const query = searchKey(search);
  const visiblePosts = posts.filter(post =>
    (!hiddenPostIds.includes(post.id) || post.id === selectedId) &&
    !blockedIds.includes(post.authorId) &&
    (filter === 'all' || post.kind === filter) &&
    (filter !== 'reel' || !!post.mediaUrl) &&
    (source === 'community' || !!profile && followingIds.includes(post.authorId)) &&
    (!query || searchKey([post.title, post.text, post.authorName].join(' ')).includes(query))
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const selectedPostVisible = visiblePosts.some(post => post.id === selectedId);
  const nextEvents = events.filter(event => isPublicEvent(event) && event.status !== 'cancelled' && new Date(event.startAt).getTime() > Date.now()
    && (event.status === 'open' || profile && (event.ownerId === profile.id || Object.hasOwn(event.participants, profile.id))))
    .sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, 3);

  useEffect(() => {
    if (communityUnavailable || !selectedId || !validSelectedId) return;
    return watchPost(selectedId);
  }, [communityUnavailable, selectedId, validSelectedId, watchPost, postRetry]);
  useEffect(() => {
    if (communityUnavailable) { setComposerRequest({ sequence: 0 }); setPublishedMessage(''); setPagingError(''); }
  }, [communityUnavailable]);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);
  useEffect(() => {
    if (loading || !requestedKind || !['achievement', 'photo', 'reel'].includes(requestedKind)) return;
    const requestKey = `${location.key}:${requestedKind}`;
    if (handledCreate.current === requestKey) return;
    handledCreate.current = requestKey;
    const next = new URLSearchParams(params);
    next.delete('create');
    setParams(next, { replace: true });
    if (profile && !communityUnavailable) {
      const kind = requestedKind !== 'achievement' && !mediaUploadsEnabled ? 'achievement' : requestedKind as PostKind;
      setComposerRequest(previous => ({ sequence: previous.sequence + 1, kind }));
    }
  }, [requestedKind, location.key, loading, profile?.id, communityUnavailable, mediaUploadsEnabled, params, setParams]);
  useEffect(() => { setFilter('all'); setSource('community'); setSearch(''); scrolledId.current = null; }, [selectedId]);
  useEffect(() => {
    if (communityUnavailable || !selectedId || loading || selectedState !== 'ready' || scrolledId.current === selectedId) return;
    const timer = requestAnimationFrame(() => {
      const card = document.getElementById(`cf-post-${selectedId}`);
      if (card) { card.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); card.focus({ preventScroll: true }); scrolledId.current = selectedId; }
    });
    return () => cancelAnimationFrame(timer);
  }, [communityUnavailable, selectedId, selectedState, loading, selectedPostVisible, filter, source]);

  function onPublished(id: string) {
    setFilter('all'); setSource('community'); setSearch('');
    setPublishedMessage(mode === 'demo' ? 'Publicación guardada en este navegador de prueba.' : 'Publicación compartida.');
    setParams({ post: id });
  }
  function resetFilters() { setFilter('all'); setSearch(''); }
  function closeLinkedPost() { const next = new URLSearchParams(params); next.delete('post'); setParams(next, { replace: true }); }
  async function morePosts() { setPagingError(''); try { await loadMorePosts(); } catch (err) { setPagingError(errorMessage(err)); } }

  return <div className="cf-page">
    <header className="cf-page-head"><div><h1 id="cf-feed-heading" tabIndex={-1}>Comunidad</h1><p>Lo que pasa dentro y fuera del campo.</p></div>{profile && !communityUnavailable ? <button type="button" className="c-button cf-publish-action" onClick={() => setComposerRequest(previous => ({ sequence: previous.sequence + 1 }))}><Plus size={17} />Publicar</button> : <Link className="c-button cf-publish-action" to="/profile">{profile ? 'Mi perfil' : 'Acceder'} <ArrowUpRight size={16} /></Link>}</header>
    <div className="cf-layout">
      <aside className="cf-profile-rail" aria-label="Tu cuenta y comunidad">
        <section className="c-panel cf-profile-card">{profile ? <><Link className="cf-avatar cf-profile-avatar" to={`/people/${encodeURIComponent(profile.id)}`} aria-label="Ver tu perfil público">{initials(profile.name)}</Link><Link className="cf-rail-name" to={`/people/${encodeURIComponent(profile.id)}`}>{profile.name}{profile.verification === 'verified' && <ShieldCheck size={16} className="cf-verified" role="img" aria-label="Identidad verificada" />}</Link>{profile.team && <p>{profile.team}</p>}{(profile.city || profile.country) && <span className="cf-rail-location"><MapPin size={13} />{[profile.city, profile.country].filter(Boolean).join(', ')}</span>}{profile.bio && <p className="cf-rail-bio">{profile.bio}</p>}<Link className="cf-rail-edit" to="/profile">Editar mi perfil <ArrowUpRight size={14} /></Link></> : <><span className="cf-avatar cf-profile-avatar"><CircleUserRound size={28} /></span><h2>Tu cuenta</h2><p>Publica y conecta con personas y equipos.</p><Link className="c-button" to="/profile">Acceder</Link></>}</section>
        <nav className="cf-rail-nav" aria-label="Explorar la comunidad"><button type="button" className={source === 'community' ? 'is-active' : ''} aria-pressed={source === 'community'} onClick={() => setSource('community')}><MessageCircle size={18} />Comunidad</button><button type="button" className={source === 'following' ? 'is-active' : ''} aria-pressed={source === 'following'} onClick={() => setSource('following')}><Heart size={18} />Siguiendo</button><Link to="/people"><UsersRound size={18} />Personas y equipos</Link><Link to="/play"><CalendarDays size={18} />Partidos y torneos</Link><Link to="/profile"><CircleUserRound size={18} />Mi perfil</Link></nav>
        <p className="cf-rail-note">{mode === 'demo' ? 'Prueba local. Los cambios sólo existen en este navegador.' : 'Contenido público. Comparte con permiso de quienes aparecen.'}</p>
      </aside>
      <div className="cf-main">
        {communityUnavailable ? <section className="c-panel cf-empty-feed cf-service-state" aria-labelledby="cf-service-state-title" role="status"><ShieldCheck size={26} aria-hidden="true" /><h2 id="cf-service-state-title">{communityPaused ? 'Comunidad en pausa' : 'La comunidad está en preparación'}</h2><p>{communityPaused ? 'La consulta y las nuevas publicaciones están temporalmente pausadas.' : 'La apertura del servicio está pendiente. Las publicaciones estarán disponibles cuando se habilite la comunidad.'}</p><p>Tu perfil y las opciones de privacidad siguen accesibles.</p><div className="cf-service-links"><Link className="c-button secondary" to="/profile">{profile ? 'Ir a mi perfil' : 'Perfil y cuenta'}<ArrowRight size={17} /></Link><Link to="/legal/privacy">Privacidad y tus derechos</Link></div></section> : <>
        <Composer onPublished={onPublished} openRequest={composerRequest} />
        <div className="cf-feed-controls">
          <div className="cf-source-tabs" role="group" aria-label="Elegir comunidad o cuentas seguidas"><button id="cf-feed-fallback" type="button" className={source === 'community' ? 'is-active' : ''} aria-pressed={source === 'community'} onClick={() => setSource('community')}>Comunidad</button><button type="button" className={source === 'following' ? 'is-active' : ''} aria-pressed={source === 'following'} onClick={() => setSource('following')}>Siguiendo</button><button type="button" className="cf-search-toggle" aria-label={searchOpen ? 'Cerrar búsqueda de publicaciones' : 'Buscar publicaciones'} aria-expanded={searchOpen} aria-controls={`${searchId}-wrap`} onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearch(''); }}><Search size={20} /></button><Link to="/people" className="cf-people-link" aria-label="Buscar personas y equipos"><UsersRound size={20} /></Link></div>
          <div id={`${searchId}-wrap`} className={`cf-feed-search ${searchOpen ? 'is-open' : ''}`}><Search size={18} aria-hidden="true" /><label htmlFor={searchId} className="cf-sr-only">Buscar en las publicaciones cargadas</label><input ref={searchRef} id={searchId} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar publicaciones" aria-describedby={`${searchId}-scope`} enterKeyHint="search" />{search && <button type="button" className="cf-icon-button" onClick={() => setSearch('')} aria-label="Borrar búsqueda"><X size={16} /></button>}</div>
          <div className="cf-filter-row"><div className="cf-filters" role="group" aria-label="Filtrar publicaciones">{filters.map(item => { const Icon = item.icon; return <button type="button" key={item.id} className={filter === item.id ? 'is-active' : ''} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{Icon && <Icon size={15} />}{item.label}</button>; })}</div></div>
          <p id={`${searchId}-scope`} className={`cf-search-scope ${query ? 'cf-search-scope--active' : ''}`}>{query ? `${visiblePosts.length} resultados en las publicaciones cargadas.` : 'Publicaciones recientes · búsqueda sobre contenido cargado.'}</p>
        </div>
        {publishedMessage && <p className="cf-published-note" role="status"><Check size={16} />{publishedMessage}<button type="button" className="cf-icon-button" onClick={() => setPublishedMessage('')} aria-label="Cerrar aviso"><X size={15} /></button></p>}
        {selectedState === 'loading' && <p className="cf-linked-status" role="status"><LoaderCircle size={16} className="cf-spin" />Abriendo publicación…</p>}
        {selectedState === 'missing' && <div className="c-panel cf-linked-status cf-linked-status--message" role="status"><strong>Publicación no disponible</strong><p>{mode === 'demo' ? 'No existe en este navegador de prueba o se ha eliminado.' : 'El enlace no es válido o la publicación ya no está disponible.'}</p><button type="button" className="c-button secondary" onClick={closeLinkedPost}>Volver al feed</button></div>}
        {selectedState === 'error' && <div className="c-panel cf-linked-status cf-linked-status--message"><p role="alert">No se pudo cargar esta publicación. Vuelve a intentarlo.</p><div><button type="button" className="c-button" onClick={() => { scrolledId.current = null; setPostRetry(previous => previous + 1); }}>Reintentar</button><button type="button" className="c-button secondary" onClick={closeLinkedPost}>Volver al feed</button></div></div>}
        {selectedState === 'ready' && selectedId && hiddenPostIds.includes(selectedId) && <p className="cf-linked-status" role="status">La ocultaste del feed. Este enlace directo la muestra.</p>}
        {selectedState === 'ready' && selectedId && posts.some(post => post.id === selectedId && blockedIds.includes(post.authorId)) && <p className="cf-linked-status" role="status">Has bloqueado a la cuenta autora. Puedes desbloquearla en <Link to="/people">Personas y equipos</Link>.</p>}
        {postsLoading && !posts.length ? <div className="c-panel cf-loading" role="status"><LoaderCircle size={22} className="cf-spin" /><p>Cargando publicaciones…</p></div> : source === 'following' && !profile ? <div className="c-panel cf-empty-feed"><UsersRound size={26} /><h2>Las cuentas que sigues, aquí</h2><p>Accede para seguir a personas y equipos y ver sus publicaciones.</p><Link className="c-button" to="/profile">Acceder <ArrowUpRight size={16} /></Link></div> : source === 'following' && followingIds.length === 0 ? <div className="c-panel cf-empty-feed"><UsersRound size={26} /><h2>Todavía no sigues a nadie</h2><p>Encuentra personas y equipos para ver aquí lo que comparten.</p><Link className="c-button" to="/people">Buscar cuentas <ArrowRight size={16} /></Link></div> : visiblePosts.length === 0 ? <div className="c-panel cf-empty-feed"><MessageCircle size={26} /><h2>{query ? 'Sin resultados en esta vista' : source === 'following' ? 'Sin publicaciones recientes' : filter === 'all' ? 'Sin publicaciones todavía' : `Sin ${filter === 'reel' ? 'reels' : filter === 'photo' ? 'fotos' : 'logros'} visibles`}</h2><p>{query ? 'Prueba otra búsqueda o cambia los filtros. La búsqueda consulta el contenido cargado.' : filter === 'reel' ? mediaUploadsEnabled ? 'No hay vídeos disponibles en esta vista. Puedes cargar más publicaciones.' : 'No hay reels disponibles en esta vista. Las nuevas cargas requieren patrocinio.' : source === 'following' ? 'Las cuentas que sigues no tienen publicaciones en el contenido cargado.' : hiddenPostIds.length ? 'Cambia los filtros o comparte una publicación.' : 'Comparte un logro para empezar la conversación.'}</p>{query || filter !== 'all' ? <button type="button" className="c-button secondary" onClick={resetFilters}>Quitar filtros</button> : source === 'following' ? <Link className="c-button secondary" to="/people">Explorar cuentas</Link> : profile ? <button type="button" className="c-button" onClick={() => setComposerRequest(previous => ({ sequence: previous.sequence + 1, kind: 'achievement' }))}><Plus size={17} />Publicar un logro</button> : <Link className="c-button" to="/profile">Acceder para publicar</Link>}</div> : <div className={`cf-stream ${filter === 'reel' ? 'cf-stream--reels' : ''}`} aria-label={filter === 'reel' ? 'Reels de la comunidad, desplázate para ver el siguiente' : 'Publicaciones de la comunidad'} tabIndex={filter === 'reel' ? 0 : undefined}>{visiblePosts.map(post => <FeedCard key={post.id} post={post} selected={post.id === selectedId} onHidden={post.id === selectedId ? closeLinkedPost : undefined} />)}</div>}
        <div className="cf-feed-pagination">{pagingError && <p className="c-error" role="alert">{pagingError}</p>}{postsLoading && <p role="status">Cargando publicaciones…</p>}{postsHasMore && <button type="button" className="c-button secondary" disabled={postsLoading} onClick={() => { void morePosts(); }}>Cargar más publicaciones</button>}{!postsHasMore && posts.length > 0 && <p>Fin de las publicaciones disponibles.</p>}</div>
        </>}
      </div>
      <aside className="cf-sidebar" aria-label="Encuentros de la comunidad">
        <section className="c-panel cf-upcoming"><div className="cf-sidebar-heading"><h2>Próximos encuentros</h2><Link to="/play" aria-label="Ver partidos y torneos"><ArrowUpRight size={18} /></Link></div>{communityUnavailable ? <div className="cf-sidebar-empty"><CalendarDays size={22} aria-hidden="true" /><p>{communityPaused ? 'La consulta de encuentros está temporalmente pausada.' : 'La consulta de encuentros estará disponible cuando se abra el servicio.'}</p></div> : nextEvents.length ? nextEvents.map(event => <Link key={event.id} to={`/play/${encodeURIComponent(event.id)}`} className="cf-upcoming-event"><span className="cf-event-date">{new Intl.DateTimeFormat('es-ES', { day: 'numeric', timeZone: event.timeZone }).format(new Date(event.startAt))}<small>{new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: event.timeZone }).format(new Date(event.startAt))}</small></span><div><strong>{event.title}</strong><span><MapPin size={12} />{event.city}</span><small>{event.type === 'tournament' ? 'Torneo' : 'Partido'} · Fútbol {event.format}</small></div></Link>) : <div className="cf-sidebar-empty"><CalendarDays size={22} /><p>Sin encuentros próximos.</p><Link to="/play">Explorar encuentros <ArrowRight size={14} /></Link></div>}</section>
        <Link className="c-panel cf-directory-link" to="/people"><UsersRound size={22} /><span><strong>Personas y equipos</strong><small>Explora perfiles de la comunidad</small></span><ArrowUpRight size={16} /></Link>
      </aside>
    </div>
  </div>;
}
