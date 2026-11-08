export function pushServiceWorkerSource(): string {
  return String.raw`
function pushBinding(){return new Promise(resolve=>{
 let settled=false;let db;
 const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);try{db?.close()}catch{}resolve(value)};
 // A background wake must display a notification even if Safari cannot open
 // IndexedDB. Never let this optional privacy lookup consume the push lifetime.
 const timer=setTimeout(()=>finish(null),750);
 try{
  const request=indexedDB.open('lacantera-push-device',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('state');
  request.onblocked=request.onerror=()=>finish(null);
  request.onsuccess=()=>{
   db=request.result;if(settled){db.close();return}
   try{
    const tx=db.transaction('state','readonly');const get=tx.objectStore('state').get('binding');
    get.onsuccess=()=>finish(get.result||null);get.onerror=tx.onerror=tx.onabort=()=>finish(null);
    tx.oncomplete=()=>db.close();
   }catch{finish(null)}
  };
 }catch{finish(null)}
});}
function pushRoute(route){
 return typeof route==='string'&&(/^\/#\/messages\/[A-Za-z0-9_%-]+$/.test(route)||/^\/#\/invite\/[2-9A-HJ-NP-Z]{16}$/.test(route)||route==='/#/connect?tab=invitations')?route:'/#/activity';
}
self.addEventListener('push',event=>event.waitUntil((async()=>{
 let data;try{data=event.data?.json()}catch{}
 const valid=data&&['message','invitation','invitation-accepted'].includes(data.kind)&&typeof data.recipientId==='string';
 const binding=valid?await pushBinding():null;
 // An in-flight push after logout must never expose a conversation or invite.
 const mine=valid&&binding?.enabled&&binding.uid===data.recipientId;
 const bodies={message:'Tienes un mensaje nuevo.',invitation:'Te han invitado a un encuentro privado.','invitation-accepted':'Han aceptado tu invitación.'};
 const route=mine?pushRoute(data.route):'/#/profile';
 await self.registration.showNotification('LaCantera',{body:mine?bodies[data.kind]:'Abre LaCantera para consultar tus avisos.',icon:new URL('icon-192.png',self.location).href,
 tag:valid&&typeof data.tag==='string'&&/^[a-f0-9]{64}$/.test(data.tag)?data.tag:undefined,
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
