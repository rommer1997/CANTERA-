import type { CommunityPost, CommunityProfile, ContentReport, PlayEvent, PostComment, VerificationRequest } from './types';

export interface DemoData {
  version: 1;
  profile: CommunityProfile | null;
  events: PlayEvent[];
  posts: CommunityPost[];
  likes: Record<string, string[]>;
  comments: Record<string, PostComment[]>;
  verifications: VerificationRequest[];
  reports: ContentReport[];
}
const key = 'cantera-community-v1';
const now = new Date().toISOString();
export function readDemo(): DemoData {
  const raw = localStorage.getItem(key);
  if (raw) {
    try { const parsed = JSON.parse(raw); if (parsed.version === 1 && Array.isArray(parsed.events) && Array.isArray(parsed.posts)) return parsed; } catch { /* recover an invalid local demo */ }
  }
  return { version: 1, profile: null, events: [], posts: [
    { id: 'demo-welcome', authorId: 'example-community', authorName: 'Comunidad Cantera · ejemplo', kind: 'achievement', title: 'El fútbol empieza con un encuentro',
      text: 'Este es un contenido de ejemplo. Crea tu primer partido, reúne a tu equipo y comparte lo que habéis conseguido. Tus cambios en el modo de prueba se guardan en este navegador.', mediaUrl: '', mediaPath: '', createdAt: now, eventId: '' }
  ], likes: {}, comments: {}, verifications: [], reports: [] };
}
export function writeDemo(data: DemoData) {
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new Event('cantera-demo-updated'));
}
function mediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('cantera-media-v1', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('assets');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error('El navegador no permite guardar archivos.'));
  });
}
export async function saveLocalMedia(id: string, file: File): Promise<void> {
  const db = await mediaDb();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('assets', 'readwrite'); tx.objectStore('assets').put(file, id);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(new Error('No hay espacio para guardar este archivo.'));
    tx.onabort = () => reject(new Error('No se pudo guardar el archivo.'));
  }); } finally { db.close(); }
}
export async function getLocalMedia(id: string): Promise<Blob | null> {
  const db = await mediaDb();
  try { return await new Promise<Blob | null>((resolve, reject) => {
    const req = db.transaction('assets').objectStore('assets').get(id);
    req.onsuccess = () => resolve(req.result || null); req.onerror = () => reject(new Error('No se pudo leer el archivo.'));
  }); } finally { db.close(); }
}
export async function deleteLocalMedia(id: string): Promise<void> {
  const db = await mediaDb();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('assets', 'readwrite'); tx.objectStore('assets').delete(id);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(new Error('No se pudo borrar el archivo.'));
  }); } finally { db.close(); }
}
