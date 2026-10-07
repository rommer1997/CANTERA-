import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { InstallRecommendation } from './InstallRecommendation';

export function AppAvailability() {
 const [offline, setOffline] = useState(!navigator.onLine);
 const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
 const [reloadAvailable, setReloadAvailable] = useState(false);
 const activationRequested = useRef(false);
 useEffect(() => {
  let active = true;
  const network = () => setOffline(!navigator.onLine);
  window.addEventListener('online', network); window.addEventListener('offline', network);
  const stops: Array<() => void> = [];
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
   const version = document.querySelector<HTMLMetaElement>('meta[name="cantera-shell-version"]')?.content || '';
   let hadController = Boolean(navigator.serviceWorker.controller);
   let currentRegistration: ServiceWorkerRegistration | null = null;
   const reportVersion = (worker = navigator.serviceWorker.controller) => {
    if (worker && /^[0-9a-f]{16}$/.test(version)) worker.postMessage({ type: 'CLIENT_SHELL_VERSION', version });
   };
   const message = (event: MessageEvent) => {
    if (!active || event.data?.type !== 'SHELL_VERSION_REQUEST') return;
    const worker = event.source && 'postMessage' in event.source ? event.source as ServiceWorker : navigator.serviceWorker.controller;
    reportVersion(worker);
    if (typeof event.data.version === 'string' && /^[0-9a-f]{16}$/.test(event.data.version) && version && version !== event.data.version) {
     setRegistration(null); setReloadAvailable(true);
    }
   };
   const controllerChanged = () => {
    if (!active) return;
    reportVersion();
    if (activationRequested.current) { location.reload(); return; }
    if (hadController) { setRegistration(null); setReloadAvailable(true); }
    hadController = true;
   };
   const checkUpdate = () => { if (active) void currentRegistration?.update().catch(() => {}); };
   navigator.serviceWorker.addEventListener('message', message);
   navigator.serviceWorker.addEventListener('controllerchange', controllerChanged);
   window.addEventListener('focus', checkUpdate);
   stops.push(() => navigator.serviceWorker.removeEventListener('message', message), () => navigator.serviceWorker.removeEventListener('controllerchange', controllerChanged), () => window.removeEventListener('focus', checkUpdate));
   void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' }).then(reg => {
    if (!active) return;
    currentRegistration = reg;
    const waiting = () => { if (active && reg.waiting && navigator.serviceWorker.controller) setRegistration(reg); };
    const found = () => {
     const worker = reg.installing;
     if (!worker) return;
     worker.addEventListener('statechange', waiting);
     stops.push(() => worker.removeEventListener('statechange', waiting));
    };
    waiting(); found(); reportVersion();
    reg.addEventListener('updatefound', found);
    stops.push(() => reg.removeEventListener('updatefound', found));
   }).catch(() => { /* Normal browsing remains available without installation. */ });
  }
  return () => { active = false; window.removeEventListener('online', network); window.removeEventListener('offline', network); stops.forEach(stop => stop()); };
 }, []);
 function updateApp() {
  if (reloadAvailable || !registration?.waiting) { location.reload(); return; }
  activationRequested.current = true;
  registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
 }
 return <>{offline ? <div className="c-service-status" role="status"><WifiOff size={17} /> Sin conexión. Los cambios en la comunidad requieren volver a conectarte.</div> : null}{registration || reloadAvailable ? <div className="c-service-status" role="status">Hay una nueva versión de LaCantera. <button className="c-button secondary" onClick={updateApp}><RefreshCw size={16} />{reloadAvailable ? 'Recargar app' : 'Actualizar app'}</button></div> : null}<InstallRecommendation /></>;
}
