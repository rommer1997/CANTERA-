import { auth } from '../firebase';
import { readPushBinding, writePushBinding } from './pushDevice';

export interface PushPreferences { messages: boolean; invitations: boolean }
export type PushEvent = { kind: 'message'; conversationId: string; messageId: string } | { kind: 'invitation' | 'invitation-accepted'; code: string };
export interface PushConfiguration { ready: boolean; publicKey: string }
const endpoint = (() => {
  try {
    const value = new URL(import.meta.env.VITE_PUSH_API_URL || '');
    if (value.username || value.password || value.search || value.hash || value.pathname !== '/') return '';
    if (value.protocol !== 'https:' && !(import.meta.env.DEV && value.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(value.hostname))) return '';
    return value.origin;
  } catch { return ''; }
})();
export const pushConfigured = Boolean(endpoint);
export class PushRequestError extends Error { constructor(message:string,readonly status:number){super(message);} }
const messages: Record<string, string> = {
  'unauthorized': 'Entra de nuevo para activar las notificaciones.',
  'unavailable': 'Completa tu cuenta y comprueba que la comunidad está disponible.',
  'rate-limited': 'Hay demasiados intentos. Espera un minuto y vuelve a probar.',
  'too-many-devices': 'Ya tienes cinco dispositivos. Desactiva las notificaciones en uno de ellos.',
  'device-in-use': 'Este dispositivo está asociado a otra cuenta. Desactiva las notificaciones con esa cuenta primero.',
};
export async function pushRequest<T>(path: string, options: { method?: string; data?: unknown; uid?: string; signal?: AbortSignal; public?: boolean } = {}): Promise<T> {
  if (!endpoint) throw new Error('Las notificaciones todavía no están configuradas.');
  const user = auth.currentUser;
  if (!options.public && (!user || user.uid !== options.uid)) throw new Error(messages.unauthorized);
  const headers: Record<string, string> = {};
  if (!options.public) headers.Authorization = `Bearer ${await user!.getIdToken()}`;
  if (options.data !== undefined) headers['Content-Type'] = 'application/json';
  if (!options.public && auth.currentUser?.uid !== options.uid) throw new Error(messages.unauthorized);
  const response = await fetch(`${endpoint}${path}`, { method: options.method || 'GET', headers,
    ...(options.data !== undefined ? { body: JSON.stringify(options.data) } : {}),
    signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
    credentials: 'omit', cache: 'no-store', keepalive: options.method === 'POST',
  });
  if (!options.public && auth.currentUser?.uid !== options.uid) throw new Error(messages.unauthorized);
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new PushRequestError(messages[value?.error] || 'No pudimos conectar las notificaciones. Inténtalo de nuevo.',response.status);
  return value as T;
}
export async function subscriptionId(subscription: PushSubscription): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(subscription.endpoint)))].map(value => value.toString(16).padStart(2, '0')).join('');
}
export function publicKeyBytes(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
}
export async function pushRegistration(): Promise<ServiceWorkerRegistration> {
  const url = new URL(`${import.meta.env.BASE_URL}sw.js`, window.location.href);
  const registration = await navigator.serviceWorker.register(url, { scope: new URL('./', url).pathname, updateViaCache: 'none' });
  if (registration.active) return registration;
  return Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('La instalación de la app está tardando. Actualiza e inténtalo de nuevo.')), 10000))]);
}
export async function disablePushDevice() {
  const uid = auth.currentUser?.uid;
  if (!('serviceWorker' in navigator)) return;
  // Remove the local binding first, including when the backend is unreachable.
  await writePushBinding({ uid: '', enabled: false }).catch(() => undefined);
  const registration = await navigator.serviceWorker.getRegistration(new URL(import.meta.env.BASE_URL, window.location.href).href);
  const subscription = await registration?.pushManager.getSubscription();
  const id = subscription ? await subscriptionId(subscription) : null;
  if (subscription) await subscription.unsubscribe();
  const notifications = await registration?.getNotifications(); notifications?.forEach(notification => notification.close());
  if (uid && id && pushConfigured) await pushRequest('/subscriptions', { method: 'DELETE', data: { id }, uid });
}

const renewalChecks=new Map<string,number>();
export async function renewPushDevice(uid:string) {
  if(!pushConfigured||auth.currentUser?.uid!==uid||!navigator.onLine||!('Notification' in window)||Notification.permission!=='granted')return;
  const now=Date.now();if(now-(renewalChecks.get(uid)||0)<86400_000)return;
  renewalChecks.set(uid,now);
  try{
    const binding=await readPushBinding();if(!binding?.enabled||binding.uid!==uid)return;
    const registration=await navigator.serviceWorker.getRegistration(new URL(import.meta.env.BASE_URL,window.location.href).href);
    const subscription=await registration?.pushManager.getSubscription();if(!subscription||auth.currentUser?.uid!==uid)return;
    await pushRequest('/subscriptions/renew',{method:'POST',data:{id:await subscriptionId(subscription)},uid});
  }catch{renewalChecks.delete(uid);}
}

// Only source references are retained, never message text or Firebase tokens.
// The server independently checks the record, sender, current access and age.
let flushing = false;
const queueKey = (uid: string) => `lacantera-push-outbox:${uid}`;
interface PendingEvent { key: string; event: PushEvent; at: number }
function pending(uid: string): PendingEvent[] {
  try {
    const values = JSON.parse(localStorage.getItem(queueKey(uid)) || '[]');
    return Array.isArray(values) ? values.filter(value => value && typeof value.key === 'string' && value.event && typeof value.at === 'number' && value.at <= Date.now() && Date.now() - value.at < 10 * 60_000).slice(-50) : [];
  } catch { return []; }
}
function savePending(uid: string, values: PendingEvent[]) { try { if (values.length) localStorage.setItem(queueKey(uid), JSON.stringify(values)); else localStorage.removeItem(queueKey(uid)); } catch { /* Original message/invitation remains saved in Firestore. */ } }
export function discardPendingPush(uid: string) { savePending(uid, []); }
export function clearOtherPushOutboxes(uid:string) {
  try{Object.keys(localStorage).filter(key=>key.startsWith('lacantera-push-outbox:')&&key!==queueKey(uid)).forEach(key=>localStorage.removeItem(key));}catch{/* Storage may be unavailable in private browsing. */}
}
export function notifyPush(event: PushEvent): void {
  const uid = auth.currentUser?.uid; if (!uid || !pushConfigured) return;
  const key = JSON.stringify(event); const rows = pending(uid);
  if (!rows.some(row => row.key === key)) savePending(uid, [...rows, { key, event, at: Date.now() }].slice(-50));
  void flushPendingPush();
}
export async function flushPendingPush() {
  if (flushing || !pushConfigured || !navigator.onLine) return;
  const uid = auth.currentUser?.uid; if (!uid) return;
  flushing = true;
  try {
    for (const row of pending(uid)) {
      if (auth.currentUser?.uid !== uid) break;
      try { await pushRequest('/events', { method: 'POST', data: row.event, uid }); savePending(uid, pending(uid).filter(value => value.key !== row.key)); }
      catch (failure) { if(failure instanceof PushRequestError&&[400,403,404,409].includes(failure.status)){savePending(uid,pending(uid).filter(value=>value.key!==row.key));continue;}break; }
    }
  } finally { flushing = false; }
}
