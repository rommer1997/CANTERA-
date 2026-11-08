import { buildPushPayload } from '@block65/webcrypto-web-push';
import { verifyToken, readFirestore, requireActive } from './auth.mjs';
import { PushError, digest, eventInput, normalizeSubscription, preferences, verifiedEvent } from './protocol.mjs';

const DAY=86400_000;
const RETENTION=30*DAY;
function json(data,status=200,origin='') {
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{})}});
}
async function body(request) {
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw new PushError('invalid-body',415);
  const reader=request.body?.getReader(); if(!reader)throw new PushError('invalid-body');
  const chunks=[];let total=0;
  while(true){const next=await reader.read();if(next.done)break;total+=next.value.length;if(total>8192){await reader.cancel();throw new PushError('body-too-large',413);}chunks.push(next.value);}
  const result=new Uint8Array(total);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder().decode(result));}catch{throw new PushError('invalid-body');}
}
async function rate(db,id,max,windowMs,now) {
  const bucket=`${id}:${Math.floor(now/windowMs)}`;
  const row=await db.prepare('INSERT INTO rate_limits(id,count,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(bucket,now+windowMs*2).first();
  if(row.count>max)throw new PushError('rate-limited',429);
}
export async function enqueue(db,event,now) {
  await rate(db,`recipient:${event.recipientId}`,20,60_000,now);
  const column=event.category==='messages'?'messages':'invitations';
  const devices=await db.prepare(`SELECT id FROM subscriptions WHERE uid=? AND ${column}=1 AND updated_at>? ORDER BY updated_at DESC LIMIT 5`).bind(event.recipientId,now-RETENTION).all();
  if(!devices.results.length)return 0;
  const payload=JSON.stringify({kind:event.kind,recipientId:event.recipientId,route:event.route,tag:await digest(event.id)});
  const statements=devices.results.map(device=>db.prepare('INSERT OR IGNORE INTO deliveries(id,subscription_id,actor_uid,recipient_uid,category,payload,next_at,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(`${event.id}:${device.id}`,device.id,event.actorId,event.recipientId,event.category,payload,now,now+3600_000,now));
  const results=await db.batch(statements);
  return results.reduce((n,result)=>n+(result.meta?.changes||0),0);
}
export async function drain(db,env,{now=Date.now(),send}={}) {
  if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY)return;
  // Small batches keep encryption and D1 work within Workers Free CPU/subrequest limits.
  const rows=await db.prepare("SELECT * FROM deliveries WHERE ((state='pending' AND next_at<=?) OR (state='sending' AND lease_until<?)) AND expires_at>? ORDER BY created_at LIMIT 3").bind(now,now,now).all();
  for(const row of rows.results){
    const claim=await db.prepare("UPDATE deliveries SET state='sending',attempts=attempts+1,lease_until=? WHERE id=? AND ((state='pending' AND next_at<=?) OR (state='sending' AND lease_until<?))")
      .bind(now+120_000,row.id,now,now).run();
    if(!claim.meta?.changes)continue;
    const device=await db.prepare('SELECT * FROM subscriptions WHERE id=? AND uid=? AND updated_at>?').bind(row.subscription_id,row.recipient_uid,now-RETENTION).first();
    if(!device||!device[row.category]){await db.prepare('DELETE FROM deliveries WHERE id=?').bind(row.id).run();continue;}
    try{
      const subscription=normalizeSubscription(JSON.parse(device.subscription_json));
      const response=send?await send(subscription,row.payload):await fetch(subscription.endpoint,{
        ...await buildPushPayload({data:row.payload,options:{ttl:Math.max(1,Math.ceil((row.expires_at-now)/1000))}},subscription,
          {subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY}),
        redirect:'error',signal:AbortSignal.timeout(8000),
      });
      if(response.ok){await db.prepare("UPDATE deliveries SET state='sent',payload='',lease_until=0 WHERE id=?").bind(row.id).run();}
      else if(response.status===404||response.status===410){await db.prepare('DELETE FROM subscriptions WHERE id=?').bind(device.id).run();}
      else if(response.status===429||response.status>=500){throw new Error('retry');}
      else{await db.prepare("UPDATE deliveries SET state='failed',payload='',lease_until=0 WHERE id=?").bind(row.id).run();}
    }catch{
      const attempts=row.attempts+1;
      await db.prepare("UPDATE deliveries SET state=?,payload=CASE WHEN ? THEN '' ELSE payload END,next_at=?,lease_until=0 WHERE id=?")
        .bind(attempts>=5?'failed':'pending',attempts>=5?1:0,now+Math.min(30*60_000,30_000*2**attempts),row.id).run();
    }
  }
}
export function createWorker(dependencies={}) {
  const authenticate=dependencies.authenticate||verifyToken;
  const load=dependencies.read||readFirestore;
  return {
    async fetch(request,env,ctx){
      const origin=request.headers.get('Origin')||'';
      const allowed=(env.ALLOWED_ORIGINS||'').split(',').includes(origin)&&!!origin;
      const url=new URL(request.url);
      if(!allowed)return json({error:'origin-not-allowed'},403);
      if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,Vary:'Origin','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Max-Age':'600'}});
      let stage='configuration';
      try{
        if(url.pathname==='/config'&&request.method==='GET')return json({ready:!!(env.DB&&env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY),publicKey:env.VAPID_PUBLIC_KEY||''},200,origin);
        if(!env.DB||!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY)throw new PushError('not-configured',503);
        const token=request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1];
        stage='authentication';
        const uid=await authenticate(token,env.FIREBASE_PROJECT_ID);
        const read=path=>load(path,token,env);
        const db=env.DB;const now=Date.now();
        if(url.pathname==='/subscriptions'&&request.method==='DELETE'){
          const data=await body(request);
          if(data.all===true)await db.prepare('DELETE FROM subscriptions WHERE uid=?').bind(uid).run();
          else{if(typeof data.id!=='string'||!/^[a-f0-9]{64}$/.test(data.id))throw new PushError('invalid-subscription');await db.prepare('DELETE FROM subscriptions WHERE id=? AND uid=?').bind(data.id,uid).run();}
          return json({disabled:true},200,origin);
        }
        if(url.pathname==='/subscriptions'&&request.method==='GET'){
          const id=url.searchParams.get('id');if(!/^[a-f0-9]{64}$/.test(id||''))throw new PushError('invalid-subscription');
          const row=await db.prepare('SELECT messages,invitations,updated_at FROM subscriptions WHERE id=? AND uid=?').bind(id,uid).first();
          return json(row?{enabled:true,messages:!!row.messages,invitations:!!row.invitations,updatedAt:row.updated_at}:{enabled:false},200,origin);
        }
        stage='active-account';
        await requireActive(uid,read,env.TERMS_VERSION);
        stage='operation';
        if(url.pathname==='/subscriptions/renew'&&request.method==='POST'){
          await rate(db,`register:${uid}`,20,60_000,now);
          const data=await body(request);
          if(typeof data.id!=='string'||!/^[a-f0-9]{64}$/.test(data.id))throw new PushError('invalid-subscription');
          // Renew only an existing, unexpired device; never restore preferences
          // or recreate a subscription withdrawn by another request.
          const result=await db.prepare('UPDATE subscriptions SET updated_at=? WHERE id=? AND uid=? AND updated_at>?').bind(now,data.id,uid,now-RETENTION).run();
          if(!result.meta?.changes)throw new PushError('not-found',404);
          return json({renewed:true},200,origin);
        }
        if(url.pathname==='/subscriptions'&&request.method==='POST'){
          await rate(db,`register:${uid}`,20,60_000,now);
          const data=await body(request);const subscription=normalizeSubscription(data.subscription);const prefs=preferences(data.preferences);
          const id=await digest(subscription.endpoint);const previous=await db.prepare('SELECT uid FROM subscriptions WHERE id=?').bind(id).first();
          if(previous&&previous.uid!==uid)throw new PushError('device-in-use',409);
          if(!previous&&(await db.prepare('SELECT count(*) AS n FROM subscriptions WHERE uid=?').bind(uid).first()).n>=5)throw new PushError('too-many-devices',409);
          const saved=await db.prepare('INSERT INTO subscriptions(id,uid,subscription_json,messages,invitations,updated_at) SELECT ?,?,?,?,?,? WHERE (SELECT count(*) FROM subscriptions WHERE uid=?)<5 OR EXISTS(SELECT 1 FROM subscriptions WHERE id=? AND uid=?) ON CONFLICT(id) DO UPDATE SET subscription_json=excluded.subscription_json,messages=excluded.messages,invitations=excluded.invitations,updated_at=excluded.updated_at WHERE subscriptions.uid=excluded.uid')
            .bind(id,uid,JSON.stringify(subscription),prefs.messages?1:0,prefs.invitations?1:0,now,uid,id,uid).run();
          if(!saved.meta?.changes)throw new PushError('device-in-use',409);
          return json({enabled:true,id,...prefs},200,origin);
        }
        if(url.pathname==='/events'&&request.method==='POST'){
          await rate(db,`events:${uid}`,60,60_000,now);
          const input=eventInput(await body(request));const event=await verifiedEvent(input,uid,read,now);
          const count=await enqueue(db,event,now);
          ctx.waitUntil(drain(db,env,{send:dependencies.send}));
          return json({accepted:true,queued:count},202,origin);
        }
        throw new PushError('not-found',404);
      }catch(error){
        const status=error instanceof PushError?error.status:503;
        if(status>=500)console.warn('push-api-unavailable',JSON.stringify({stage,code:error instanceof PushError?error.code:'internal'}));
        return json({error:error instanceof PushError?error.code:'temporarily-unavailable'},status,origin);
      }
    },
    async scheduled(_event,env,ctx){
      const now=Date.now();
      ctx.waitUntil((async()=>{
        await env.DB.batch([
          env.DB.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(now),
          env.DB.prepare('DELETE FROM deliveries WHERE expires_at<? OR created_at<?').bind(now,now-DAY),
          env.DB.prepare('DELETE FROM subscriptions WHERE updated_at<?').bind(now-RETENTION),
        ]);
        await drain(env.DB,env);
      })());
    },
  };
}
export default createWorker();
