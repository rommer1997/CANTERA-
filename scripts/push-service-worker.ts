export function pushServiceWorkerSource(): string {
  return String.raw`
function pushBinding(){return new Promise(resolve=>{
 const request=indexedDB.open('lacantera-push-device',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('state');
 request.onerror=()=>resolve(null);
 request.onsuccess=()=>{const db=request.result;const tx=db.transaction('state','readonly');const get=tx.objectStore('state').get('binding');get.onsuccess=()=>resolve(get.result||null);get.onerror=()=>resolve(null);tx.oncomplete=()=>db.close();};
});}
function pushRoute(route){
 return typeof route==='string'&&(/^\/#\/messages\/[A-Za-z0-9_%-]+$/.test(route)||/^\/#\/invite\/[2-9A-HJ-NP-Z]{16}$/.test(route)||route==='/#/connect?tab=invitations')?route:'/#/activity';
}
self.addEventListener('push',event=>event.waitUntil((async()=>{
 let data;try{data=event.data?.json()}catch{return}
 if(!data||!['message','invitation','invitation-accepted'].includes(data.kind)||typeof data.recipientId!=='string')return;
 const binding=await pushBinding();
 // An in-flight push after logout must never expose a conversation or invite.
 const mine=binding?.enabled&&binding.uid===data.recipientId;
 const bodies={message:'Tienes un mensaje nuevo.',invitation:'Te han invitado a un encuentro privado.','invitation-accepted':'Han aceptado tu invitación.'};
 const route=mine?pushRoute(data.route):'/#/profile';
 await self.registration.showNotification('LaCantera',{body:mine?bodies[data.kind]:'Abre LaCantera para consultar tus avisos.',icon:new URL('icon-192.png',self.location).href,
 tag:typeof data.tag==='string'&&/^[a-f0-9]{64}$/.test(data.tag)?data.tag:undefined,
 data:{route,recipientId:mine?data.recipientId:''}});
})()));
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil((async()=>{
  const binding=await pushBinding();const data=event.notification.data||{};
  const route=binding?.enabled&&binding.uid===data.recipientId?pushRoute(data.route):'/#/profile';
  const target=new URL(route,self.location.origin);
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const current=clients.find(client=>{const url=new URL(client.url);return url.origin===target.origin&&['/','/index.html'].includes(url.pathname)});
  if(current){await current.navigate(target.href);await current.focus();}else await self.clients.openWindow(target.href);
 })());
});`;
}
