import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { Bell, BellOff, CheckCircle2 } from 'lucide-react';
import { auth } from '../firebase';
import { useCommunity } from './CommunityContext';
import { installedDisplayModes, installationDevice, isInstalledExperience } from './installation';
import { readPushBinding, writePushBinding } from './pushDevice';
import { clearOtherPushOutboxes, disablePushDevice, discardPendingPush, flushPendingPush, publicKeyBytes, pushConfigured, pushRegistration, pushRequest, renewPushDevice, subscriptionId, type PushConfiguration, type PushPreferences } from './pushApi';
import './push.css';

export function PushSession() {
  useEffect(() => {
    let revision=0;
    const stop=onAuthStateChanged(auth,user=>{
      const uid=user?.uid||'';
      const version=++revision;
      const current=()=>version===revision&&(auth.currentUser?.uid||'')===uid;
      clearOtherPushOutboxes(uid);
      if('indexedDB' in window&&'serviceWorker' in navigator)void (async()=>{
        const binding=await readPushBinding();
        if(!current())return;
        if(binding?.uid&&binding.uid!==uid){
          discardPendingPush(binding.uid);
          await writePushBinding({uid:'',enabled:false});
          const registration=await navigator.serviceWorker.getRegistration(new URL(import.meta.env.BASE_URL,window.location.href).href);
          const subscription=await registration?.pushManager.getSubscription();
          const latest=await readPushBinding();
          if(current()&&!latest?.enabled){await subscription?.unsubscribe();(await registration?.getNotifications())?.forEach(item=>item.close());}
        }
        if(auth.currentUser?.uid===uid&&uid){void flushPendingPush();void renewPushDevice(uid);}
      })().catch(()=>undefined);
    });
    const refresh=()=>{if(document.visibilityState==='visible'){void flushPendingPush();const uid=auth.currentUser?.uid;if(uid)void renewPushDevice(uid);}};
    window.addEventListener('online',refresh);document.addEventListener('visibilitychange',refresh);
    const timer=window.setInterval(()=>void flushPendingPush(),30000);
    return()=>{revision++;stop();window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh);window.clearInterval(timer);};
  },[]);
  return null;
}
function needsInstallation() {
  return installationDevice(navigator)==='ios'&&!isInstalledExperience({displayModes:installedDisplayModes.filter(mode=>matchMedia(`(display-mode: ${mode})`).matches),iosStandalone:(navigator as Navigator&{standalone?:boolean}).standalone});
}
function supported() { return isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window&&'indexedDB' in window; }
export function PushSettings() {
  const {profile,mode}=useCommunity();
  if(!profile||mode!=='cloud')return null;
  return <DeviceSettings key={profile.id} uid={profile.id}/>;
}
function DeviceSettings({uid}:{uid:string}) {
  const [configuration,setConfiguration]=useState<PushConfiguration|null>(null);
  const [prefs,setPrefs]=useState<PushPreferences>({messages:true,invitations:true});
  const [enabled,setEnabled]=useState(false);const [loading,setLoading]=useState(pushConfigured&&supported()&&!needsInstallation());
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);
  const [pendingDisable,setPendingDisable]=useState(false);
  const current=useRef(true);useEffect(()=>{current.current=true;return()=>{current.current=false;};},[]);
  const ready=()=>current.current&&auth.currentUser?.uid===uid;
  useEffect(()=>{
    let active=true;const controller=new AbortController();
    const current=()=>active&&auth.currentUser?.uid===uid;
    if(!pushConfigured||!supported()||needsInstallation())return()=>{active=false;};
    setLoading(true);setError('');
    void (async()=>{
      const config=await pushRequest<PushConfiguration>('/config',{public:true,signal:controller.signal});
      if(!current())return;setConfiguration(config);
      if(!config.ready)return;
      const registration=await navigator.serviceWorker.getRegistration(new URL(import.meta.env.BASE_URL,window.location.href).href);
      const subscription=await registration?.pushManager.getSubscription();
      if(!subscription||Notification.permission!=='granted'){if(current())setEnabled(false);return;}
      const [state,binding]=await Promise.all([
        pushRequest<PushPreferences&{enabled:boolean}>(`/subscriptions?id=${await subscriptionId(subscription)}`,{uid,signal:controller.signal}),readPushBinding(),
      ]);
      if(!current())return;
      setEnabled(state.enabled&&!!binding?.enabled&&binding.uid===uid);
      if(state.enabled)setPrefs({messages:state.messages,invitations:state.invitations});
    })().catch(()=>{if(current())setError('No pudimos comprobar las notificaciones. Revisa tu conexión y vuelve a intentarlo.');}).finally(()=>{if(current())setLoading(false);});
    return()=>{active=false;controller.abort();};
  },[uid,attempt]);
  async function save(next:PushPreferences) {
    if(busy)return;setBusy(true);setError('');
    try{
      const registration=await pushRegistration();const subscription=await registration.pushManager.getSubscription();
      if(!subscription)throw new Error('Activa de nuevo las notificaciones en este dispositivo.');
      await pushRequest('/subscriptions',{method:'POST',data:{subscription:subscription.toJSON(),preferences:next},uid});
      if(ready())setPrefs(next);
    }catch(failure){if(ready())setError(failure instanceof Error?failure.message:'No se pudieron guardar las preferencias.');}
    finally{if(ready())setBusy(false);}
  }
  async function enable() {
    if(busy||!configuration?.ready)return;
    // Start permission from the click, before any asynchronous network work.
    setBusy(true);setError('');
    try{
      const permission=Notification.requestPermission();
      if(await permission!=='granted')throw new Error('No has permitido las notificaciones. Puedes cambiarlo en los ajustes del navegador o del iPhone.');
      const registration=await pushRegistration();
      const subscription=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:publicKeyBytes(configuration.publicKey)});
      if(!ready()){await subscription.unsubscribe();return;}
      await writePushBinding({uid,enabled:true});
      await pushRequest('/subscriptions',{method:'POST',data:{subscription:subscription.toJSON(),preferences:prefs},uid});
      if(ready())setEnabled(true);
    }catch(failure){if(ready()){await writePushBinding({uid:'',enabled:false}).catch(()=>undefined);setError(failure instanceof Error?failure.message:'No se pudieron activar las notificaciones.');}}
    finally{if(ready())setBusy(false);}
  }
  async function disable() {
    if(busy)return;setBusy(true);setError('');
    try{await disablePushDevice();if(ready()){setEnabled(false);setPendingDisable(false);}}
    catch{if(ready()){setEnabled(false);setPendingDisable(true);setError('No pudimos confirmar la desactivación completa. Vuelve a intentarlo con conexión.');}}
    finally{if(ready())setBusy(false);}
  }
  const install=needsInstallation();const compatible=supported();
  return <section className="cpush-settings" aria-labelledby="cpush-title">
    <header><Bell size={23} aria-hidden="true"/><div><h2 id="cpush-title">Notificaciones del móvil</h2><p>Mensajes e invitaciones, también cuando cierras LaCantera.</p></div></header>
    {install?<div><p>Instala LaCantera y ábrela desde su icono para activar los avisos en iPhone.</p><button className="c-button secondary" onClick={()=>window.dispatchEvent(new Event('cantera-open-install-guide'))}>Ver cómo instalar</button></div>
      :!compatible?<p>Este navegador no permite notificaciones web. Puedes consultar tus avisos dentro de LaCantera.</p>
      :!pushConfigured||configuration&&!configuration.ready?<p>Las notificaciones del móvil están en preparación. Tus mensajes e invitaciones siguen disponibles dentro de LaCantera.</p>
      :loading?<p role="status">Comprobando este dispositivo…</p>
      :<><p className="cpush-state" role="status">{enabled?<><CheckCircle2 size={18}/>Activadas en este dispositivo</>:<><BellOff size={18}/>Desactivadas en este dispositivo</>}</p>
        {enabled?<><label><input type="checkbox" checked={prefs.messages} disabled={busy} onChange={event=>void save({...prefs,messages:event.target.checked})}/>Mensajes nuevos</label><label><input type="checkbox" checked={prefs.invitations} disabled={busy} onChange={event=>void save({...prefs,invitations:event.target.checked})}/>Invitaciones y aceptaciones</label><button className="c-button secondary" disabled={busy} onClick={()=>void disable()}>{busy?'Guardando…':'Desactivar en este dispositivo'}</button></>
          :<button className="c-button" disabled={busy||!configuration?.ready||Notification.permission==='denied'} onClick={()=>void enable()}>{busy?'Activando…':'Activar notificaciones'}</button>}
        {!enabled&&Notification.permission==='denied'?<p>El permiso está bloqueado. Cámbialo en los ajustes de notificaciones de tu navegador o del iPhone.</p>:null}
        <p className="c-small">Avisos opcionales. La pantalla bloqueada no muestra el texto de tus mensajes. Puedes desactivarlos cuando quieras. <Link to="/legal/privacy">Consultar privacidad</Link>.</p>
      </>}
    {error?<div role="alert"><p className="c-error">{error}</p><button className="c-button secondary" disabled={busy} onClick={()=>pendingDisable?void disable():setAttempt(value=>value+1)}>{pendingDisable?'Reintentar desactivación':'Volver a comprobar'}</button></div>:null}
  </section>;
}
