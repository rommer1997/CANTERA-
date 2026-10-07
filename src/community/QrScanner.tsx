import { useEffect, useId, useRef, useState } from 'react';
import { Camera, ImagePlus, ScanLine, Square, X } from 'lucide-react';
import { decodeInvitationQrImage, parseInvitationQr } from './invitationQr';
import './qr-scanner.css';

type ScannerStatus = 'idle' | 'starting' | 'camera' | 'image' | 'paused';
const maximumFileBytes = 10 * 1024 * 1024;
const pageHidden = () => document.visibilityState === 'hidden';

function cameraError(error: unknown): string {
 const name = (error as { name?: string })?.name;
 if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'No se ha permitido usar la cámara. Puedes habilitarla en los ajustes del navegador o elegir una imagen del QR.';
 if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'No se ha encontrado una cámara. Puedes elegir una imagen del QR.';
 if (name === 'NotReadableError' || name === 'TrackStartError') return 'La cámara no está disponible. Cierra otras apps que la estén usando y vuelve a intentarlo, o elige una imagen.';
 if (name === 'SecurityError') return 'El navegador ha bloqueado la cámara. Puedes elegir una imagen del QR.';
 return 'No se ha podido iniciar la cámara. Vuelve a intentarlo o elige una imagen del QR.';
}

export function QrScanner({ onCode, onClose }: { onCode(code: string): void; onClose(): void }) {
 const dialog = useRef<HTMLDialogElement>(null);
 const video = useRef<HTMLVideoElement>(null);
 const canvas = useRef<HTMLCanvasElement | null>(null);
 const stream = useRef<MediaStream | null>(null);
 const frame = useRef<number | null>(null);
 const cancelImage = useRef<(() => void) | null>(null);
 const removeTrackListeners = useRef<(() => void) | null>(null);
 const generation = useRef(0);
 const mounted = useRef(false);
 const closing = useRef(false);
 const callbacks = useRef({ onCode, onClose });
 callbacks.current = { onCode, onClose };
 const [status, setStatus] = useState<ScannerStatus>('idle');
 const [error, setError] = useState('');
 const titleId = useId();
 const descriptionId = useId();

 function stopResources(): number {
  generation.current++;
  if (frame.current !== null) window.cancelAnimationFrame(frame.current);
  frame.current = null;
  removeTrackListeners.current?.(); removeTrackListeners.current = null;
  stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
  if (video.current) { video.current.pause(); video.current.srcObject = null; }
  cancelImage.current?.(); cancelImage.current = null;
  return generation.current;
 }
 function current(token: number): boolean {
  return mounted.current && !closing.current && generation.current === token;
 }
 function close() {
  if (!mounted.current || closing.current) return;
  closing.current = true;
  stopResources();
  dialog.current?.close();
  callbacks.current.onClose();
 }
 function found(code: string, token: number) {
  if (!current(token)) return;
  closing.current = true;
  stopResources();
  dialog.current?.close();
  callbacks.current.onClose();
  callbacks.current.onCode(code);
 }
 function readImage(source: CanvasImageSource, width: number, height: number, maximumEdge: number): { code: string | null; hasQr: boolean } {
  if (!width || !height) return { code: null, hasQr: false };
  const scale = Math.min(1, maximumEdge / Math.max(width, height));
  const element = canvas.current ||= document.createElement('canvas');
  element.width = Math.max(1, Math.round(width * scale)); element.height = Math.max(1, Math.round(height * scale));
  const context = element.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas no disponible');
  context.drawImage(source, 0, 0, element.width, element.height);
  const pixels = context.getImageData(0, 0, element.width, element.height);
  const payload = decodeInvitationQrImage(pixels.data, pixels.width, pixels.height);
  return { code: payload ? parseInvitationQr(payload, window.location.origin) : null, hasQr: Boolean(payload) };
 }

 useEffect(() => {
  mounted.current = true; closing.current = false;
  const previousFocus = document.activeElement as HTMLElement | null;
  const element = dialog.current;
  element?.showModal();
  const pause = () => {
   stopResources();
   if (mounted.current && !closing.current) setStatus('paused');
  };
  const visibility = () => { if (pageHidden()) pause(); };
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', pause);
  window.addEventListener('popstate', close);
  window.addEventListener('hashchange', close);
  return () => {
   mounted.current = false;
   stopResources(); canvas.current = null;
   document.removeEventListener('visibilitychange', visibility);
   window.removeEventListener('pagehide', pause);
   window.removeEventListener('popstate', close);
   window.removeEventListener('hashchange', close);
   element?.close();
   if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  };
 }, []);

 async function startCamera() {
  if (!mounted.current || closing.current) return;
  const token = stopResources();
  setError('');
  if (pageHidden()) { setStatus('paused'); return; }
  if (!navigator.mediaDevices?.getUserMedia) { setStatus('idle'); setError('Este navegador no permite usar la cámara. Puedes elegir una imagen del QR.'); return; }
  setStatus('starting');
  let acquired: MediaStream | null = null;
  try {
   acquired = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
   if (!current(token) || pageHidden()) { acquired.getTracks().forEach(track => track.stop()); return; }
   const element = video.current;
   if (!element) { acquired.getTracks().forEach(track => track.stop()); throw new Error('Video no disponible'); }
   stream.current = acquired; element.srcObject = acquired;
   const ended = () => { if (current(token)) { stopResources(); setStatus('idle'); setError('La cámara se ha desconectado. Puedes iniciarla de nuevo o elegir una imagen del QR.'); } };
   const tracks = acquired.getVideoTracks();
   tracks.forEach(track => track.addEventListener('ended', ended));
   removeTrackListeners.current = () => tracks.forEach(track => track.removeEventListener('ended', ended));
   await element.play();
   if (!current(token) || pageHidden()) { acquired.getTracks().forEach(track => track.stop()); return; }
   setStatus('camera');
   let lastScan = -Infinity;
   let invalidNotified = false;
   const scan = (time: number) => {
    if (!current(token)) return;
    if (pageHidden()) { stopResources(); setStatus('paused'); return; }
    if (time - lastScan >= 250 && element.readyState >= 2 && element.videoWidth && element.videoHeight) {
     lastScan = time;
     try {
      const result = readImage(element, element.videoWidth, element.videoHeight, 640);
      if (result.code) { found(result.code, token); return; }
      if (result.hasQr && !invalidNotified) { invalidNotified = true; setError('Este QR no es una invitación de LaCantera. Prueba con el QR de un código de conexión o de un encuentro privado.'); }
     } catch {
      stopResources(); setStatus('idle'); setError('No se ha podido leer la cámara. Puedes iniciarla de nuevo o elegir una imagen del QR.'); return;
     }
    }
    frame.current = window.requestAnimationFrame(scan);
   };
   frame.current = window.requestAnimationFrame(scan);
  } catch (failure) {
   acquired?.getTracks().forEach(track => track.stop());
   if (current(token)) { stopResources(); setStatus('idle'); setError(cameraError(failure)); }
  }
 }

 async function chooseImage(file: File | undefined) {
  if (!file || !mounted.current || closing.current) return;
  const token = stopResources();
  setError(''); setStatus('idle');
  if (!file.type.startsWith('image/')) { setError('Elige una imagen que contenga el QR de la invitación.'); return; }
  if (!file.size || file.size > maximumFileBytes) { setError('La imagen debe ocupar como máximo 10 MB.'); return; }
  setStatus('image');
  let url: string | null = null;
  let image: HTMLImageElement | null = null;
  let release = () => {};
  try {
   url = URL.createObjectURL(file);
   image = new Image();
   const loadingImage = image;
   const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
    let finished = false;
    release = () => {
     if (finished) return;
     finished = true; loadingImage.onload = null; loadingImage.onerror = null;
     if (url) { URL.revokeObjectURL(url); url = null; }
     loadingImage.src = '';
     reject(new Error('Lectura cancelada'));
    };
    cancelImage.current = release;
    loadingImage.onload = () => { if (!finished) { finished = true; loadingImage.onload = null; loadingImage.onerror = null; resolve(loadingImage); } };
    loadingImage.onerror = () => { if (!finished) { finished = true; loadingImage.onload = null; loadingImage.onerror = null; reject(new Error('Imagen no disponible')); } };
    loadingImage.src = url!;
   });
   await loaded;
   if (!current(token) || pageHidden()) return;
   const result = readImage(image, image.naturalWidth, image.naturalHeight, 960);
   if (result.code) { found(result.code, token); return; }
   setStatus('idle');
   setError(result.hasQr ? 'Este QR no es una invitación de LaCantera. Elige la imagen de un código de conexión o de un encuentro privado.' : 'No se ha encontrado un QR legible. Prueba con una imagen más nítida o usa la cámara.');
  } catch {
   if (current(token)) { setStatus('idle'); setError('No se ha podido leer esta imagen. Elige otra imagen del QR.'); }
  } finally {
   release(); if (url) URL.revokeObjectURL(url);
   if (cancelImage.current === release) cancelImage.current = null;
   if (image) { image.onload = null; image.onerror = null; image.src = ''; }
  }
 }

 const cameraActive = status === 'camera' || status === 'starting';
 const statusText = status === 'starting' ? 'Solicitando acceso a la cámara…' : status === 'camera' ? 'Sitúa el QR dentro del recuadro.' : status === 'image' ? 'Leyendo la imagen en tu dispositivo…' : status === 'paused' ? 'El lector está en pausa. Puedes iniciar la cámara o elegir una imagen.' : 'Elige cómo leer el QR de tu invitación.';
 return <dialog ref={dialog} className="cqr-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close(); } }}>
  <header className="cqr-head"><div><p className="c-eyebrow">CONECTA CON TU GENTE</p><h2 id={titleId}>Escanear QR</h2></div><button type="button" className="cqr-close" aria-label="Cerrar lector QR" autoFocus onClick={close}><X size={21} /></button></header>
  <p id={descriptionId} className="cqr-description">Lee el QR de una invitación para conectar o entrar en un encuentro privado. Después podrás revisarla y decidir si la aceptas.</p>
  <div className={`cqr-preview ${status === 'camera' ? 'active' : ''}`} aria-busy={status === 'starting' || status === 'image'}>
   <video ref={video} muted playsInline aria-label="Vista de la cámara para leer el QR" className="cqr-video" />
   {status !== 'camera' ? <div className="cqr-placeholder"><ScanLine size={46} aria-hidden="true" /><span>{status === 'image' ? 'Leyendo imagen…' : status === 'starting' ? 'Iniciando cámara…' : 'Tu invitación empieza con un QR'}</span></div> : <div className="cqr-guide" aria-hidden="true" />}
  </div>
  <p className="cqr-status" role="status" aria-live="polite">{statusText}</p>
  <div className="cqr-actions">
   <button type="button" className="c-button cqr-camera-button" onClick={() => { if (cameraActive) { stopResources(); setStatus('idle'); setError(''); } else void startCamera(); }}>{cameraActive ? <Square size={17} /> : <Camera size={18} />}{status === 'starting' ? 'Cancelar cámara' : status === 'camera' ? 'Detener cámara' : 'Iniciar cámara'}</button>
   <label className="c-button secondary cqr-image-button"><ImagePlus size={18} /><span>Elegir imagen</span><input type="file" accept="image/*" aria-label="Elegir imagen del QR" onClick={() => { stopResources(); setStatus('idle'); setError(''); }} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void chooseImage(file); }} /></label>
  </div>
  {error ? <p className="cqr-error" role="alert">{error}</p> : null}
  <p className="cqr-privacy">La cámara y las imágenes se leen en tu dispositivo. No se guardan ni se suben a LaCantera.</p>
 </dialog>;
}

export default QrScanner;
