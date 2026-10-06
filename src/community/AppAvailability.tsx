import React, { useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { InstallRecommendation } from './InstallRecommendation';
export function AppAvailability() {
 const [offline, setOffline] = useState(!navigator.onLine); const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
 useEffect(() => { const network = () => setOffline(!navigator.onLine); window.addEventListener('online', network); window.addEventListener('offline', network);
  let active = true;
  if (import.meta.env.PROD && 'serviceWorker' in navigator) { void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(reg => { if (!active) return; const waiting = () => { if (active && reg.waiting && navigator.serviceWorker.controller) setRegistration(reg); }; waiting(); reg.addEventListener('updatefound', () => { const worker = reg.installing; worker?.addEventListener('statechange', waiting); }); }).catch(() => { /* Installation is optional; normal browsing remains available. */ }); }
  return () => { active = false; window.removeEventListener('online', network); window.removeEventListener('offline', network); };
 }, []);
 return <>{offline ? <div className="c-service-status" role="status"><WifiOff size={17} /> Sin conexión. Los cambios en la comunidad requieren volver a conectarte.</div> : null}{registration ? <div className="c-service-status" role="status">Hay una nueva versión de Cantera. <button className="c-button secondary" onClick={() => { navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true }); registration.waiting?.postMessage({ type: 'ACTIVATE_UPDATE' }); }}><RefreshCw size={16} />Actualizar app</button></div> : null}<InstallRecommendation /></>;
}
