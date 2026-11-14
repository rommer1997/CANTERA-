import test from 'node:test';
import assert from 'node:assert/strict';
import { withinPushDeadline, PushTimeoutError } from '../src/community/pushTimeout.ts';

test('una promesa nativa colgada termina con error y cancela sin depender de AbortSignal.timeout',async()=>{
  const controller=new AbortController();
  const never=new Promise<never>(()=>{});
  await assert.rejects(withinPushDeadline(never,10,'No responde el dispositivo',()=>controller.abort()),error=>error instanceof PushTimeoutError&&error.message==='No responde el dispositivo');
  assert.equal(controller.signal.aborted,true);
});
test('resolver tarde tras vencer el límite no sustituye el error; respuestas y errores inmediatos se conservan',async()=>{
  let finish!:(value:string)=>void;const late=new Promise<string>(resolve=>{finish=resolve;});
  const bounded=withinPushDeadline(late,10,'Tiempo agotado');await assert.rejects(bounded,PushTimeoutError);finish('demasiado tarde');await assert.rejects(bounded,PushTimeoutError);
  let cancelled=false;assert.equal(await withinPushDeadline(Promise.resolve('listo'),100,'timeout',()=>{cancelled=true;}),'listo');assert.equal(cancelled,false);
  const original=new Error('permiso denegado');await assert.rejects(withinPushDeadline(Promise.reject(original),100,'timeout'),error=>error===original);
});
