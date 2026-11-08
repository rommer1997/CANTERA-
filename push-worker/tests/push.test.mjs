import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHmac, hkdfSync } from 'node:crypto';
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { createWorker, drain, enqueue } from '../src/index.mjs';
import { verifyToken } from '../src/auth.mjs';
import { digest, normalizeSubscription, PushError, verifiedEvent } from '../src/protocol.mjs';

function database(){
  const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../migrations/0001_push.sql',import.meta.url),'utf8'));
  return {sqlite,prepare(sql){let args=[];const statement=()=>sqlite.prepare(sql);const api={bind(...values){args=values;return api;},async first(){return statement().get(...args)||null;},async all(){return {results:statement().all(...args)};},async run(){const result=statement().run(...args);return {meta:{changes:Number(result.changes)}};}};return api;},async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
}
const subscription=(suffix='one')=>({endpoint:`https://fcm.googleapis.com/fcm/send/${suffix}`,expirationTime:null,keys:{p256dh:'B'+'a'.repeat(86),auth:'b'.repeat(22)}});
async function device(db,uid='bob',suffix='one',prefs={messages:true,invitations:true}){
  const value=subscription(suffix);const id=await digest(value.endpoint);
  await db.prepare('INSERT INTO subscriptions(id,uid,subscription_json,messages,invitations,updated_at) VALUES (?,?,?,?,?,?)').bind(id,uid,JSON.stringify(value),+prefs.messages,+prefs.invitations,Date.now()).run();return id;
}
const event=(id='message:a:b:abcdefghijklmnopqrst')=>({id,actorId:'alice',recipientId:'bob',category:'messages',kind:'message',route:'/#/messages/alice%3Abob'});

test('rechaza endpoints SSRF, sufijos falsos, claves malformadas y credenciales en URL',()=>{
  assert.equal(normalizeSubscription(subscription()).endpoint,subscription().endpoint);
  for(const endpoint of ['http://fcm.googleapis.com/fcm/send/x','https://127.0.0.1/x','https://fcm.googleapis.com.evil.test/x','https://user:pass@fcm.googleapis.com/x','https://fcm.googleapis.com:8443/x','https://push.apple.com.evil.test/x'])assert.throws(()=>normalizeSubscription({...subscription(),endpoint}),PushError);
  assert.throws(()=>normalizeSubscription({...subscription(),keys:{p256dh:'bad',auth:'bad'}}),PushError);
});
test('un aviso deriva del registro auténtico y no permite suplantación, replay antiguo o códigos sin destinatario',async()=>{
  const input={kind:'message',conversationId:'alice:bob',messageId:'abcdefghijklmnopqrst'};
  const message={id:input.messageId,senderId:'alice',createdAt:new Date().toISOString(),text:'PRIVATE TEXT'};
  assert.equal((await verifiedEvent(input,'alice',async()=>message)).recipientId,'bob');
  await assert.rejects(verifiedEvent(input,'bob',async()=>message));
  await assert.rejects(verifiedEvent(input,'carol',async()=>message));
  await assert.rejects(verifiedEvent(input,'alice',async()=>({...message,createdAt:'2000-01-01T00:00:00Z'})));
  await assert.rejects(verifiedEvent({kind:'invitation',code:'23456789ABCDEFGH'},'alice',async()=>({id:'23456789ABCDEFGH',ownerId:'alice',kind:'event',status:'active',createdAt:new Date().toISOString()})));
  const invite={id:'23456789ABCDEFGH',ownerId:'alice',recipientId:'bob',kind:'event',eventId:'private-event',status:'active',createdAt:new Date().toISOString()};
  const privateEvent={ownerId:'alice',visibility:'private',status:'open',startAtMs:Date.now()+3600_000};
  const read=async path=>path.startsWith('communityInvitations')?invite:path.startsWith('communityEvents')?privateEvent:null;
  assert.equal((await verifiedEvent({kind:'invitation',code:invite.id},'alice',read)).recipientId,'bob');
  await assert.rejects(verifiedEvent({kind:'invitation',code:invite.id},'alice',async path=>{if(path.startsWith('communityConversations'))throw new PushError('unavailable',403);return read(path);}));
});
test('cola idempotente por evento y dispositivo, sin texto privado, respeta preferencias y confirmación',async()=>{
  const db=database();await device(db);await device(db,'bob','disabled',{messages:false,invitations:true});
  assert.equal(await enqueue(db,event(),Date.now()),1);assert.equal(await enqueue(db,event(),Date.now()),0);
  const rows=await db.prepare('SELECT * FROM deliveries').all();assert.equal(rows.results.length,1);assert.ok(!rows.results[0].payload.includes('PRIVATE TEXT'));
  let calls=0;await drain(db,{VAPID_PUBLIC_KEY:'public',VAPID_PRIVATE_KEY:'private'},{send:async()=>{calls++;return new Response(null,{status:201});}});
  assert.equal(calls,1);assert.equal((await db.prepare('SELECT state,payload FROM deliveries').first()).state,'sent');
  assert.equal((await db.prepare('SELECT payload FROM deliveries').first()).payload,'');
  await drain(db,{VAPID_PUBLIC_KEY:'public',VAPID_PRIVATE_KEY:'private'},{send:async()=>{throw Error('duplicate');}});
});
test('429/503 reintentan con backoff; 410 retira la suscripción; desactivar impide el envío pendiente',async()=>{
  const db=database();const id=await device(db);const now=Date.now();await enqueue(db,event(),now);
  await drain(db,{VAPID_PUBLIC_KEY:'p',VAPID_PRIVATE_KEY:'s'},{now,send:async()=>new Response(null,{status:503})});
  const row=await db.prepare('SELECT * FROM deliveries').first();assert.equal(row.state,'pending');assert.equal(row.attempts,1);assert.ok(row.next_at>now);
  await drain(db,{VAPID_PUBLIC_KEY:'p',VAPID_PRIVATE_KEY:'s'},{now:row.next_at+1,send:async()=>new Response(null,{status:410})});
  assert.equal((await db.prepare('SELECT count(*) AS n FROM subscriptions').first()).n,0);
  await device(db);await enqueue(db,event('next'),Date.now());await db.prepare('UPDATE subscriptions SET messages=0 WHERE id=?').bind(id).run();
  await drain(db,{VAPID_PUBLIC_KEY:'p',VAPID_PRIVATE_KEY:'s'},{send:async()=>{throw Error('must not send');}});
  assert.equal((await db.prepare('SELECT count(*) AS n FROM deliveries').first()).n,0);
});
test('API limita orígenes, autorización, propiedad del dispositivo y emisión sin registro',async()=>{
  const db=database();const env={DB:db,APP_ORIGIN:'https://lacantera.web.app',ALLOWED_ORIGINS:'https://lacantera.web.app',FIREBASE_PROJECT_ID:'demo-test',TERMS_VERSION:'t',VAPID_PUBLIC_KEY:'public',VAPID_PRIVATE_KEY:'secret'};
  const worker=createWorker({authenticate:async token=>{if(!['alice','bob'].includes(token))throw new PushError('unauthorized',401);return token;},read:async path=>path==='communityConfiguration/runtime'?{serviceStatus:'open'}:path.startsWith('communityProfiles/')?{adultConfirmed:true,acceptedTermsVersion:'t',acceptedTermsAt:'yes',city:'Madrid',country:'España'}:null});
  const call=(path,uid='alice',data,origin=env.APP_ORIGIN,method=data?'POST':'GET')=>worker.fetch(new Request(`https://push.test${path}`,{method,headers:{Origin:origin,Authorization:`Bearer ${uid}`,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})}),env,{waitUntil:()=>{}});
  assert.equal((await call('/config','alice',undefined,'https://evil.test')).status,403);
  assert.equal((await call('/subscriptions?id=abc','bad')).status,401);
  const created=await call('/subscriptions','alice',{subscription:subscription(),preferences:{messages:true,invitations:true}});assert.equal(created.status,200);
  assert.equal((await call('/subscriptions','bob',{subscription:subscription(),preferences:{messages:true,invitations:true}})).status,409);
  const id=await digest(subscription().endpoint);assert.equal((await (await call(`/subscriptions?id=${id}`,'bob')).json()).enabled,false);
  assert.equal((await call('/subscriptions/renew','bob',{id})).status,404);
  assert.equal((await call('/subscriptions/renew','alice',{id})).status,200);
  assert.equal((await db.prepare('SELECT messages,invitations FROM subscriptions WHERE id=?').bind(id).first()).messages,1);
  await call('/subscriptions','bob',{id},env.APP_ORIGIN,'DELETE');assert.equal((await db.prepare('SELECT count(*) AS n FROM subscriptions').first()).n,1);
  assert.equal((await call('/events','alice',{kind:'message',conversationId:'alice:bob',messageId:'abcdefghijklmnopqrst'})).status,403);
  await call('/subscriptions','alice',{all:true},env.APP_ORIGIN,'DELETE');assert.equal((await db.prepare('SELECT count(*) AS n FROM subscriptions').first()).n,0);
});
test('Firebase JWT exige firma RSA, emisor, audiencia, correo verificado y caducidad',async()=>{
  const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
  const key={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test'};const epoch=Math.floor(Date.now()/1000);
  const claims={sub:'alice',aud:'demo-test',iss:'https://securetoken.google.com/demo-test',iat:epoch,auth_time:epoch,exp:epoch+3600,email_verified:true};
  const encoded=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  async function token(overrides={}){const value=`${encoded({alg:'RS256',kid:'test'})}.${encoded({...claims,...overrides})}`;return `${value}.${Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(value))).toString('base64url')}`;}
  assert.equal(await verifyToken(await token(),'demo-test',{keySet:[key]}),'alice');
  for(const overrides of [{aud:'other'},{iss:'https://evil.test'},{exp:epoch-1},{iat:epoch+600},{email_verified:false},{sub:'../../alice'}])await assert.rejects(verifyToken(await token(overrides),'demo-test',{keySet:[key]}));
  await assert.rejects(verifyToken((await token()).slice(0,-8)+'AAAAAAAA','demo-test',{keySet:[key]}));
});

test('el payload Web Push se descifra en el receptor con RFC 8291 y lleva VAPID para el origen correcto',async()=>{
  const receiver=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const receiverPublic=new Uint8Array(await crypto.subtle.exportKey('raw',receiver.publicKey));const auth=crypto.getRandomValues(new Uint8Array(16));
  const vapid=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const vapidJwk=await crypto.subtle.exportKey('jwk',vapid.privateKey);const vapidRaw=await crypto.subtle.exportKey('raw',vapid.publicKey);
  const subscription={endpoint:'https://web.push.apple.com/test',expirationTime:null,keys:{p256dh:Buffer.from(receiverPublic).toString('base64url'),auth:Buffer.from(auth).toString('base64url')}};
  const data=JSON.stringify({kind:'message',recipientId:'bob',route:'/#/messages/alice%3Abob'});
  const payload=await buildPushPayload({data,options:{ttl:60}},subscription,{subject:'mailto:owner@example.test',publicKey:Buffer.from(vapidRaw).toString('base64url'),privateKey:vapidJwk.d});
  assert.equal(payload.headers['content-encoding'],'aes128gcm');assert.equal(payload.body.byteLength,4096);
  const bytes=new Uint8Array(payload.body);const salt=bytes.slice(0,16);const length=bytes[20];const serverPublic=bytes.slice(21,21+length);
  const key=await crypto.subtle.importKey('raw',serverPublic,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const shared=await crypto.subtle.deriveBits({name:'ECDH',public:key},receiver.privateKey,256);
  const info=Buffer.concat([Buffer.from('WebPush: info\0'),Buffer.from(receiverPublic),Buffer.from(serverPublic)]);
  const prk=createHmac('sha256',auth).update(Buffer.from(shared)).digest();
  const ikm=createHmac('sha256',prk).update(Buffer.concat([info,Buffer.from([1])])).digest();
  const cek=hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16);
  const nonce=hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12);
  const aes=await crypto.subtle.importKey('raw',cek,{name:'AES-GCM'},false,['decrypt']);
  const plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce},aes,bytes.slice(21+length)));
  let end=plain.length-1;while(plain[end]===0)end--;assert.equal(plain[end],2);assert.equal(new TextDecoder().decode(plain.slice(0,end)),data);
  const jwt=payload.headers.authorization.match(/t=([^, ]+)/)[1];const claims=JSON.parse(Buffer.from(jwt.split('.')[1],'base64url').toString());
  assert.equal(claims.aud,'https://web.push.apple.com');assert.equal(claims.sub,'mailto:owner@example.test');
});
