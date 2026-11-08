import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { pushServiceWorkerSource } from '../scripts/push-service-worker.ts';
function shell(binding:{uid:string;enabled:boolean}|null) {
  const listeners:Record<string,Function>={};const notifications:any[]=[];const navigations:string[]=[];
  const self={location:new URL('https://lacantera.web.app/sw.js'),addEventListener:(name:string,fn:Function)=>{listeners[name]=fn;},registration:{showNotification:async(title:string,options:any)=>{notifications.push({title,...options});}},clients:{matchAll:async()=>[],openWindow:async(url:string)=>{navigations.push(url);}}};
  const indexedDB={open:()=>{const request:any={};queueMicrotask(()=>{const database={close(){},transaction(){const transaction:any={objectStore:()=>({get(){const read:any={result:binding};queueMicrotask(()=>{read.onsuccess?.();transaction.oncomplete?.();});return read;}})};return transaction;}};request.result=database;request.onsuccess?.();});return request;}};
  runInNewContext(pushServiceWorkerSource(),{self,indexedDB,URL,Promise});
  const dispatch=async(name:string,data:any)=>{let task:Promise<any>|undefined;listeners[name]({...data,waitUntil:(value:Promise<any>)=>{task=value;}});await task;};
  return{notifications,navigations,dispatch};
}
test('push muestra un aviso genérico sin el texto del chat y abre solo rutas internas autorizadas',async()=>{
  const api=shell({uid:'bob',enabled:true});
  await api.dispatch('push',{data:{json:()=>({kind:'message',recipientId:'bob',route:'/#/messages/alice%3Abob',tag:'a'.repeat(64),text:'PRIVATE MESSAGE'})}});
  assert.equal(api.notifications[0].body,'Tienes un mensaje nuevo.');assert.ok(!JSON.stringify(api.notifications).includes('PRIVATE MESSAGE'));
  await api.dispatch('notificationclick',{notification:{close(){},data:api.notifications[0].data}});
  assert.deepEqual(api.navigations,['https://lacantera.web.app/#/messages/alice%3Abob']);
});
test('cambio de cuenta y rutas externas nunca abren una conversación ni una invitación ajena',async()=>{
  for(const binding of [null,{uid:'alice',enabled:true},{uid:'bob',enabled:false}]){
    const api=shell(binding);await api.dispatch('push',{data:{json:()=>({kind:'invitation',recipientId:'bob',route:'/#/invite/23456789ABCDEFGH'})}});
    assert.equal(api.notifications[0].body,'Abre LaCantera para consultar tus avisos.');
    await api.dispatch('notificationclick',{notification:{close(){},data:api.notifications[0].data}});
    assert.deepEqual(api.navigations,['https://lacantera.web.app/#/profile']);
  }
  const api=shell({uid:'bob',enabled:true});
  await api.dispatch('notificationclick',{notification:{close(){},data:{recipientId:'bob',route:'https://evil.test'}}});
  assert.deepEqual(api.navigations,['https://lacantera.web.app/#/activity']);
});
