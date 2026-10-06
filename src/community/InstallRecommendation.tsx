import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Download, Share, X } from 'lucide-react';
import { installedDisplayModes, installationDevice, isInstalledExperience, nativeInstallation, type InstallationDevice, type NativeInstallPrompt } from './installation';
import './installation.css';

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

export function InstallRecommendation() {
  const [runningAsApp, setRunningAsApp] = useState(appExperience);
  // Closing applies to this page load only: the next browser visit recommends it again.
  const [dismissed, setDismissed] = useState(false);
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
      modes.forEach(mode => {
        if (mode.removeEventListener) mode.removeEventListener('change', changedMode);
        else mode.removeListener(changedMode);
      });
    };
  }, []);

  const dismiss = () => { setGuideOpen(false); setDismissed(true); };
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
      if (mounted.current) { setError('El navegador no pudo abrir la instalación. Puedes añadir Cantera siguiendo estos pasos.'); setGuideOpen(true); }
    } finally { if (mounted.current) setInstalling(false); }
  };

  if (runningAsApp || dismissed) return null;
  return <>
    <aside className="c-install-recommendation" aria-label="Instalar Cantera">
      <div className="c-install-content">
        <img className="c-install-app-icon" src={`${import.meta.env.BASE_URL}cantera-mark.svg`} width="40" height="40" alt="" />
        <div className="c-install-copy"><strong>Instala Cantera</strong><span>Gratis · en tu pantalla de inicio</span></div>
        <button ref={trigger} type="button" className="c-button secondary c-install-action" onClick={() => void install()} disabled={installing} aria-haspopup={installer ? undefined : 'dialog'}><Download size={16} aria-hidden="true" />{installing ? 'Abriendo…' : installer ? 'Instalar' : 'Ver cómo'}</button>
        <button type="button" className="c-install-close" aria-label="Cerrar recomendación de instalación" onClick={dismiss}><X size={18} aria-hidden="true" /></button>
      </div>
    </aside>
    {guideOpen && <InstallationGuide device={device} setDevice={setDevice} close={() => setGuideOpen(false)} dismiss={dismiss} trigger={trigger} error={error} />}
  </>;
}

function InstallationGuide({ device, setDevice, close, dismiss, trigger, error }: { device: InstallationDevice; setDevice(device: InstallationDevice): void; close(): void; dismiss(): void; trigger: React.RefObject<HTMLButtonElement | null>; error: string }) {
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

  return <dialog ref={dialog} className="c-install-dialog" aria-labelledby={title} onCancel={event => { event.preventDefault(); close(); }}>
    <header><div><img src={`${import.meta.env.BASE_URL}cantera-mark.svg`} width="48" height="48" alt="" /><h2 id={title}>Cantera, a un toque</h2></div><button type="button" className="c-install-close" aria-label="Cerrar guía de instalación" onClick={close}><X size={20} aria-hidden="true" /></button></header>
    <p>Añádela a tu pantalla de inicio para abrir tu comunidad de fútbol como una app.</p>
    <div className="c-install-devices" role="group" aria-label="Dispositivo para instalar Cantera">{(Object.keys(deviceNames) as InstallationDevice[]).map(value => <button type="button" key={value} aria-pressed={device === value} onClick={() => setDevice(value)}>{deviceNames[value]}</button>)}</div>
    {error ? <p className="c-error" role="alert">{error}</p> : null}
    {device === 'ios' ? <ol className="c-install-steps">
      <li><strong>Abre Cantera en Safari.</strong><span>Si estás en otra app o navegador, abre esta misma dirección en Safari.</span></li>
      <li><strong>Toca Compartir <Share size={16} aria-hidden="true" />.</strong><span>Según tu versión, está en la barra o dentro del menú de página.</span></li>
      <li><strong>Elige “Añadir a pantalla de inicio”.</strong><span>Si no aparece, revisa “Editar acciones” al final de la lista.</span></li>
      <li><strong>Confirma con “Añadir”.</strong><span>Activa “Abrir como app web” si aparece. Después abre Cantera desde su icono.</span></li>
    </ol> : device === 'android' ? <>
      <ol className="c-install-steps">
        <li><strong>Abre Cantera en Chrome.</strong><span>Si estás dentro de otra app, abre esta misma dirección en el navegador.</span></li>
        <li><strong>Abre el menú de los tres puntos.</strong><span>Busca “Instalar y crear acceso directo” → “Instalar”, o “Añadir a pantalla de inicio”, según tu versión.</span></li>
        <li><strong>Confirma y abre el icono de Cantera.</strong><span>El navegador te indicará los últimos pasos.</span></li>
      </ol>
      <p className="c-install-tip">Si sólo ofrece “Crear acceso directo”, también puedes añadirlo. Ese atajo abrirá Cantera en el navegador.</p>
    </> : <ol className="c-install-steps">
      <li><strong>Abre Cantera en Chrome o Edge.</strong><span>Usa un navegador que admita instalar aplicaciones web.</span></li>
      <li><strong>Busca el icono de instalación.</strong><span>Puede estar en la barra de direcciones o en el menú del navegador, como “Instalar Cantera” o “Instalar esta página como aplicación”.</span></li>
      <li><strong>Confirma la instalación.</strong><span>Cantera aparecerá entre tus aplicaciones. Si la opción no está disponible, puedes seguir usando la web.</span></li>
    </ol>}
    <a className="c-install-help" href={helpUrls[device]} target="_blank" rel="noopener noreferrer">Ayuda del navegador <ArrowUpRight size={15} aria-hidden="true" /></a>
    <footer><span>Instalación gratuita.</span><button type="button" className="c-button" onClick={dismiss}>Entendido</button></footer>
  </dialog>;
}
