import { withinPushDeadline } from './pushTimeout';
export interface PushBinding { uid: string; enabled: boolean }
const databaseName = 'lacantera-push-device';
export function readPushBinding(): Promise<PushBinding | null> {
  let expired=false;
  return withinPushDeadline(new Promise<PushBinding | null>(resolve => {
    const request=indexedDB.open(databaseName,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('state');
    request.onerror=()=>resolve(null);
    request.onsuccess=()=>{const database=request.result;if(expired){database.close();return;}const tx=database.transaction('state','readonly');const read=tx.objectStore('state').get('binding');read.onsuccess=()=>resolve(read.result||null);read.onerror=()=>resolve(null);tx.oncomplete=()=>database.close();};
  }),5000,'No pudimos leer las preferencias de este dispositivo.',()=>{expired=true;}).catch(()=>null);
}
export function writePushBinding(binding: PushBinding): Promise<void> {
  let expired=false;let transaction:IDBTransaction|undefined;
  return withinPushDeadline(new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onerror = () => reject(new Error('No se pueden guardar las preferencias de este dispositivo.'));
    request.onsuccess = () => {
      const database = request.result;if(expired){database.close();return;} transaction = database.transaction('state', 'readwrite');
      transaction.objectStore('state').put(binding, 'binding');
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = transaction.onabort = () => { database.close(); reject(new Error('No se pueden guardar las preferencias de este dispositivo.')); };
    };
  }),5000,'No pudimos guardar las preferencias de este dispositivo.',()=>{expired=true;try{transaction?.abort();}catch{/* Transaction may have completed. */}});
}
