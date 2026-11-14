// Integration uses real Auth/Firestore HTTP APIs, strictly on demo-* loopback emulators.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createWorker } from '../src/index.mjs';
import { readFirestore } from '../src/auth.mjs';
const enabled=process.env.RUN_PUSH_EMULATOR_TESTS==='true';
test('Auth + Firestore reales → Worker → cola D1: mensaje, invitación privada y aceptación', {skip:!enabled},async()=>{
  const project=process.env.GCLOUD_PROJECT;const firestoreHost=process.env.FIRESTORE_EMULATOR_HOST;const authHost=process.env.FIREBASE_AUTH_EMULATOR_HOST;
  assert.match(project||'',/^demo-[a-z0-9-]+$/);assert.match(firestoreHost||'',/^127\.0\.0\.1:\d+$/);assert.match(authHost||'',/^127\.0\.0\.1:\d+$/);
  const req=createRequire(new URL('../../functions/package.json',import.meta.url));
  const {initializeApp,deleteApp}=req('firebase-admin/app');const {getFirestore,Timestamp}=req('firebase-admin/firestore');const {getAuth}=req('firebase-admin/auth');
  const app=initializeApp({projectId:project},'push-http-integration');const database='ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb';
  const firestore=getFirestore(app,database);const auth=getAuth(app);const actors=['push_http_alice','push_http_bob'];const pair=actors.join(':');const code='23456789ABCDEFGH';const now=Date.now();
  try{
    for(const uid of actors)await auth.createUser({uid,email:`${uid}@example.test`,emailVerified:true,password:'Local-push-emulator-only-2026!'});
    const profile=uid=>({id:uid,name:uid,adultConfirmed:true,acceptedTermsVersion:'2026-10-08',acceptedTermsAt:Timestamp.now(),city:'Madrid',country:'España'});
    const future=now+86400000;const documents={
      'communityConfiguration/runtime':{serviceStatus:'open',mediaUploadsEnabled:false,updatedAt:Timestamp.now()},
      ...Object.fromEntries(actors.map(uid=>[`communityProfiles/${uid}`,profile(uid)])),
      [`communityConnections/${actors[0]}/members/${actors[1]}`]:{ownerId:actors[0],peerId:actors[1],inviteId:code,createdAt:Timestamp.now()},
      [`communityConnections/${actors[1]}/members/${actors[0]}`]:{ownerId:actors[1],peerId:actors[0],inviteId:code,createdAt:Timestamp.now()},
      [`communityConversations/${pair}`]:{id:pair,participantIds:actors,createdAt:Timestamp.now()},
      [`communityConversations/${pair}/messages/abcdefghijklmnopqrst`]:{id:'abcdefghijklmnopqrst',senderId:actors[0],text:'PRIVATE CHAT BODY MUST STAY IN FIREBASE',createdAt:Timestamp.now()},
      'communityEvents/push-http-private':{id:'push-http-private',ownerId:actors[0],ownerName:actors[0],title:'Private test',visibility:'private',type:'match',format:'7',level:'amateur',city:'Madrid',country:'España',timeZone:'Europe/Madrid',venue:'Private venue',startAt:new Date(future).toISOString(),startAtMs:future,capacity:14,entry:'players',description:'Local test',status:'open',tournamentFormat:'league',participants:{},participantIds:[],fixtures:[],createdAt:Timestamp.now(),revision:0,rsvps:{},waitlist:{},waitlistOrder:[]},
      [`communityInvitations/${code}`]:{id:code,kind:'event',ownerId:actors[0],recipientId:actors[1],eventId:'push-http-private',status:'active',createdAt:Timestamp.now(),usedBy:'',usedAt:''},
    };
    await Promise.all(Object.entries(documents).map(([path,value])=>firestore.doc(path).set(value)));
    const tokens={};
    for(const uid of actors){const response=await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-test`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`${uid}@example.test`,password:'Local-push-emulator-only-2026!',returnSecureToken:true})});assert.equal(response.status,200);tokens[uid]=(await response.json()).idToken;}
    const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../migrations/0001_push.sql',import.meta.url),'utf8'));
    const db={prepare(sql){let args=[];const api={bind(...values){args=values;return api;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return{results:sqlite.prepare(sql).all(...args)};},async run(){return{meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}};return api;},async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
    const sent=[];const reads=[];
    const env={DB:db,FIREBASE_PROJECT_ID:project,FIREBASE_DATABASE_ID:database,TERMS_VERSION:'2026-10-08',APP_ORIGIN:'https://lacantera.web.app',ALLOWED_ORIGINS:'https://lacantera.web.app',VAPID_PUBLIC_KEY:'test-public',VAPID_PRIVATE_KEY:'test-private'};
    const worker=createWorker({
      authenticate:async token=>{const response=await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:lookup?key=local-test`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token})});assert.equal(response.status,200);return(await response.json()).users[0].localId;},
      read:(path,token)=>readFirestore(path,token,env,(url,options)=>{const target=new URL(url);assert.equal(target.origin,'https://firestore.googleapis.com');assert.ok(target.pathname.startsWith(`/v1/projects/${project}/databases/${database}/documents/`));reads.push(target);target.protocol='http:';target.host=firestoreHost;return fetch(target,options);}),
      send:async(subscription,payload)=>{sent.push({endpoint:subscription.endpoint,...JSON.parse(payload)});return new Response(null,{status:201});},
    });
    async function call(uid,path,data){const tasks=[];const result=await worker.fetch(new Request(`https://worker.example.test${path}`,{method:'POST',headers:{Origin:env.APP_ORIGIN,Authorization:`Bearer ${tokens[uid]}`,'Content-Type':'application/json'},body:JSON.stringify(data)}),env,{waitUntil:promise=>tasks.push(promise)});await Promise.all(tasks);return result;}
    for(const uid of actors)assert.equal((await call(uid,'/subscriptions',{subscription:{endpoint:`https://fcm.googleapis.com/fcm/send/${uid}`,keys:{p256dh:'B'+'a'.repeat(86),auth:'b'.repeat(22)}},preferences:{messages:true,invitations:true}})).status,200);
    assert.equal((await call(actors[0],'/events',{kind:'message',conversationId:pair,messageId:'abcdefghijklmnopqrst'})).status,202);
    assert.equal(sent.at(-1).recipientId,actors[1]);assert.equal((await call(actors[1],'/events',{kind:'message',conversationId:pair,messageId:'abcdefghijklmnopqrst'})).status,403);
    const count=sent.length;await call(actors[0],'/events',{kind:'message',conversationId:pair,messageId:'abcdefghijklmnopqrst'});assert.equal(sent.length,count);
    assert.equal((await call(actors[0],'/events',{kind:'invitation',code})).status,202);assert.equal(sent.at(-1).kind,'invitation');assert.equal(sent.at(-1).recipientId,actors[1]);
    const base=`http://${firestoreHost}/v1/projects/${project}/databases/${database}/documents`;
    assert.equal((await fetch(`${base}/communityEvents/push-http-private`,{headers:{Authorization:`Bearer ${tokens[actors[1]]}`}})).status,403);
    const field=value=>({stringValue:value});const name=path=>`projects/${project}/databases/${database}/documents/${path}`;
    const admission=await fetch(`${base}:commit`,{method:'POST',headers:{Authorization:`Bearer ${tokens[actors[1]]}`,'Content-Type':'application/json'},body:JSON.stringify({writes:[
      {update:{name:name(`communityInvitations/${code}`),fields:{status:field('used'),usedBy:field(actors[1])}},updateMask:{fieldPaths:['status','usedBy']},updateTransforms:[{fieldPath:'usedAt',setToServerValue:'REQUEST_TIME'}]},
      {update:{name:name(`communityEventAdmissions/push-http-private/members/${actors[1]}`),fields:{eventId:field('push-http-private'),userId:field(actors[1]),inviteId:field(code)}},updateTransforms:[{fieldPath:'createdAt',setToServerValue:'REQUEST_TIME'}]},
      {update:{name:name('communityEvents/push-http-private'),fields:{participants:{mapValue:{fields:{[actors[1]]:field('Synthetic participant')}}},rsvps:{mapValue:{fields:{[actors[1]]:field('yes')}}}}},updateMask:{fieldPaths:[`participants.${actors[1]}`,`rsvps.${actors[1]}`]},updateTransforms:[{fieldPath:'participantIds',appendMissingElements:{values:[field(actors[1])]}}]},
    ]})});assert.equal(admission.status,200,await admission.text());
    assert.equal((await call(actors[1],'/events',{kind:'invitation-accepted',code})).status,202);assert.equal(sent.at(-1).recipientId,actors[0]);
    assert.ok(!JSON.stringify(sent).includes('PRIVATE CHAT BODY'));const messageReads=reads.filter(url=>url.pathname.includes('/messages/'));assert.ok(messageReads.length>0);for(const url of messageReads)assert.deepEqual(url.searchParams.getAll('mask.fieldPaths'),['id','senderId','createdAt']);
    await firestore.doc(`communityConnections/${actors[0]}/members/${actors[1]}`).delete();
    assert.equal((await call(actors[0],'/events',{kind:'message',conversationId:pair,messageId:'abcdefghijklmnopqrst'})).status,403);
  }finally{await deleteApp(app);}
});
