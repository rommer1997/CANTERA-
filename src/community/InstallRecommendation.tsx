import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Download, X } from 'lucide-react';
import { dismissInstallation, installationDismissed, installationVisit, shouldRecommendInstallation, installedDisplayModes, installationDevice, isInstalledExperience, nativeInstallation, type InstallationDevice, type NativeInstallPrompt } from './installation';
import './installation.css';
import { InstallationTutorial } from './InstallationTutorial';

function appExperience() {
  return isInstalledExperience({
    displayModes: installedDisplayModes.filter(mode => window.matchMedia(`(display-mode: ${mode})`).matches),
    iosStandalone: (navigator as Navigator & { standalone?: boolean }).standalone,
    referrer: document.referrer,
  });
}

const deviceNames: Record<InstallationDevice, string> = { ios: 'iPhone / iPad', android: 'Android', desktop: 'Ordenador' };
const helpUrls: Record<InstallationDevice, string> = {
  ios: 'https://support.apple.com/es-es/guide/iphone/iphea86e5236/ios',
  android: 'https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=es',
  desktop: 'https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DDesktop&hl=es',
};

export function InstallRecommendation({ registered = false, suppressed = false }: { registered?: boolean; suppressed?: boolean } = {}) {
  const [runningAsApp, setRunningAsApp] = useState(appExperience);
  const [dismissed, setDismissed] = useState(() => {
    try { return installationDismissed(window.localStorage); } catch { return false; }
  });
  const [returning] = useState(() => {
    try { return installationVisit(window.localStorage, window.sessionStorage); } catch { return false; }
  });
  const [justRegistered, setJustRegistered] = useState(false);
  const [installer, setInstaller] = useState<ReturnType<typeof nativeInstallation> | null>(null);
  const [installing, setInstalling] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [error, setError] = useState('');
  const [device, setDevice] = useState<InstallationDevice>(() => installationDevice(navigator));
  const trigger = useRef<HTMLButtonElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const modes = installedDisplayModes.map(mode => window.matchMedia(`(display-mode: ${mode})`));
    const changedMode = () => setRunningAsApp(appExperience());
    const prompt = (event: Event) => {
      const candidate = event as NativeInstallPrompt;
      if (typeof candidate.prompt !== 'function') return;
      event.preventDefault();
      setInstaller(nativeInstallation(candidate));
    };
    const installed = () => { setRunningAsApp(true); setInstaller(null); setGuideOpen(false); };
    const openGuide = () => { setGuideOpen(true); };
    const completed = () => setJustRegistered(true);
    window.addEventListener('cantera-registration-completed', completed);
    window.addEventListener('cantera-open-install-guide', openGuide);
    window.addEventListener('beforeinstallprompt', prompt);
    window.addEventListener('appinstalled', installed);
    modes.forEach(mode => {
      if (mode.addEventListener) mode.addEventListener('change', changedMode);
      else mode.addListener(changedMode);
    });
    return () => {
      mounted.current = false;
      window.removeEventListener('beforeinstallprompt', prompt);
      window.removeEventListener('appinstalled', installed);
      window.removeEventListener('cantera-registration-completed', completed);
      window.removeEventListener('cantera-open-install-guide', openGuide);
      modes.forEach(mode => {
        if (mode.removeEventListener) mode.removeEventListener('change', changedMode);
        else mode.removeListener(changedMode);
      });
    };
  }, []);

  const dismiss = () => {
    setGuideOpen(false); setDismissed(true);
    try { dismissInstallation(window.localStorage); } catch { /* Storage may be blocked. */ }
  };
  const install = async () => {
    if (!installer) { setGuideOpen(true); return; }
    const request = installer;
    setInstaller(null);
    setError('');
    setInstalling(true);
    try {
      await request.request();
      if (mounted.current) dismiss();
    } catch {
      if (mounted.current) { setError('El navegador no pudo abrir la instalación. Puedes añadir LaCantera siguiendo estos pasos.'); setGuideOpen(true); }
    } finally { if (mounted.current) setInstalling(false); }
  };

  if (runningAsApp) return null;
  return <>
    {!suppressed && !dismissed && shouldRecommendInstallation(registered, returning, justRegistered) && <aside className="c-install-recommendation" aria-label="Instalar LaCantera">
      <div className="c-install-content">
        <img className="c-install-app-icon" src={`${import.meta.env.BASE_URL}cantera-mark.svg`} width="40" height="40" alt="" />
        <div className="c-install-copy"><strong>Instala LaCantera</strong><span>Gratis · en tu pantalla de inicio</span></div>
        <button ref={trigger} type="button" className="c-button secondary c-install-action" onClick={() => setGuideOpen(true)} aria-haspopup="dialog"><Download size={16} aria-hidden="true" />Cómo instalar</button>
        <button type="button" className="c-install-close" aria-label="Cerrar recomendación de instalación" onClick={dismiss}><X size={18} aria-hidden="true" /></button>
      </div>
    </aside>}
    {guideOpen && <InstallationGuide device={device} setDevice={setDevice} close={() => setGuideOpen(false)} dismiss={dismiss} trigger={trigger} error={error} nativeAction={installer || installing ? () => void install() : undefined} installing={installing} />}
  </>;
}

function InstallationGuide({ device, setDevice, close, dismiss, trigger, error, nativeAction, installing }: { nativeAction?: () => void; installing?: boolean; device: InstallationDevice; setDevice(device: InstallationDevice): void; close(): void; dismiss(): void; trigger: React.RefObject<HTMLButtonElement | null>; error: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => {
      if (element?.open) element.close();
      requestAnimationFrame(() => {
        if (document.querySelector('dialog[open]')) return;
        const target = trigger.current?.isConnected ? trigger.current : document.querySelector<HTMLElement>('.c-brand');
        target?.focus({ preventScroll: true });
      });
    };
  }, [trigger]);

  const help = <a className="c-install-help" href={helpUrls[device]} target="_blank" rel="noopener noreferrer">{device === 'ios' ? 'Ayuda de Safari' : 'Ayuda del navegador'} <ArrowUpRight size={15} aria-hidden="true" /></a>;
  return <dialog ref={dialog} className={`c-install-dialog${device === 'ios' ? ' c-install-dialog-visual' : ''}`} aria-labelledby={title} onCancel={event => { event.preventDefault(); close(); }}>
    <header><div><img src={`${import.meta.env.BASE_URL}cantera-mark.svg`} width="48" height="48" alt="" /><h2 id={title}>Instala LaCantera</h2></div><button type="button" className="c-install-close" aria-label="Cerrar guía de instalación" onClick={close}><X size={20} aria-hidden="true" /></button></header>
    <p>Añade LaCantera a tu pantalla de inicio.</p>
    <div className="c-install-devices" role="group" aria-label="Dispositivo para instalar LaCantera">{(Object.keys(deviceNames) as InstallationDevice[]).map(value => <button type="button" key={value} aria-pressed={device === value} onClick={() => setDevice(value)}>{deviceNames[value]}</button>)}</div>
    {error ? <p className="c-error" role="alert">{error}</p> : null}
    {device === 'ios' ? <InstallationTutorial /> : device === 'android' ? <>
      <ol className="c-install-steps">
        <li><strong>Abre LaCantera en Chrome.</strong><span>Si estás dentro de otra app, abre esta misma dirección en el navegador.</span></li>
        <li><strong>Abre el menú de los tres puntos.</strong><span>Busca “Instalar y crear acceso directo” → “Instalar”, o “Añadir a pantalla de inicio”, según tu versión.</span></li>
        <li><strong>Confirma y abre el icono de LaCantera.</strong><span>El navegador te indicará los últimos pasos.</span></li>
      </ol>
      <p className="c-install-tip">Si solo ofrece “Crear acceso directo”, también puedes añadirlo. Ese atajo abrirá LaCantera en el navegador.</p>
    </> : <ol className="c-install-steps">
      <li><strong>Abre LaCantera en Chrome o Edge.</strong><span>Usa un navegador que admita instalar aplicaciones web.</span></li>
      <li><strong>Busca el icono de instalación.</strong><span>Puede estar en la barra de direcciones o en el menú del navegador, como “Instalar LaCantera” o “Instalar esta página como aplicación”.</span></li>
      <li><strong>Confirma la instalación.</strong><span>LaCantera aparecerá entre tus aplicaciones. Si la opción no está disponible, puedes seguir usando la web.</span></li>
    </ol>}
    {device !== 'ios' && help}
    <footer>{device === 'ios' ? help : <span>Instalación gratuita.</span>}<button type="button" className="c-button" disabled={installing} onClick={nativeAction || dismiss}>{installing ? 'Abriendo…' : nativeAction ? 'Instalar ahora' : 'Entendido'}</button></footer>
  </dialog>;
}
