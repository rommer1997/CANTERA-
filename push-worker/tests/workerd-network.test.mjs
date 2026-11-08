import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

test('workerd lee Firestore sin redirect:error y rechaza redirecciones sin reenviar el token',async()=>{
  const source=new URL('../src/',import.meta.url);let redirect=false;const calls=[];
  const runtime=new Miniflare(convertV4MiniflareOptions({
    compatibilityDate:'2026-11-08',
    modules:[
      {type:'ESModule',path:fileURLToPath(new URL('network-test.mjs',source)),contents:`
        import {readFirestore} from './auth.mjs';
        export default {async fetch(){
          try{return Response.json(await readFirestore('communityProfiles/alice','local-test-token',{
            FIREBASE_PROJECT_ID:'demo-workerd',FIREBASE_DATABASE_ID:'test-database'
          }));}catch(error){return Response.json({error:error.code||error.name},{status:error.status||500});}
        }};`},
      ...['auth.mjs','protocol.mjs'].map(name=>({type:'ESModule',path:fileURLToPath(new URL(name,source)),contents:readFileSync(new URL(name,source),'utf8')})),
    ],
    outboundService:request=>{
      const url=new URL(request.url);calls.push(url.origin);
      assert.equal(url.origin,'https://firestore.googleapis.com');
      assert.equal(request.headers.get('Authorization'),'Bearer local-test-token');
      return redirect?new Response(null,{status:302,headers:{Location:'https://redirect.example.test/private'}})
        :Response.json({fields:{adultConfirmed:{booleanValue:true}}});
    },
  }));
  try{
    const success=await runtime.dispatchFetch('https://local-test.invalid/');
    assert.equal(success.status,200);assert.deepEqual(await success.json(),{adultConfirmed:true});
    redirect=true;
    const refused=await runtime.dispatchFetch('https://local-test.invalid/');
    assert.equal(refused.status,503);assert.deepEqual(await refused.json(),{error:'temporarily-unavailable'});
    assert.deepEqual(calls,['https://firestore.googleapis.com','https://firestore.googleapis.com']);
  }finally{await runtime.dispose();}
});
