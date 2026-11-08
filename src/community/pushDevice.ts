export interface PushBinding { uid: string; enabled: boolean }
const databaseName = 'lacantera-push-device';
export function readPushBinding(): Promise<PushBinding | null> {
  return new Promise(resolve => {
    const request=indexedDB.open(databaseName,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('state');
    request.onerror=()=>resolve(null);
    request.onsuccess=()=>{const database=request.result;const tx=database.transaction('state','readonly');const read=tx.objectStore('state').get('binding');read.onsuccess=()=>resolve(read.result||null);read.onerror=()=>resolve(null);tx.oncomplete=()=>database.close();};
  });
}
export function writePushBinding(binding: PushBinding): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onerror = () => reject(new Error('No se pueden guardar las preferencias de este dispositivo.'));
    request.onsuccess = () => {
      const database = request.result; const transaction = database.transaction('state', 'readwrite');
      transaction.objectStore('state').put(binding, 'binding');
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => { database.close(); reject(new Error('No se pueden guardar las preferencias de este dispositivo.')); };
    };
  });
}
