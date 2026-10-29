import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { TERMS_VERSION } from '../src/community/policy.ts';
import * as privacy from '../src/community/eventPrivacy.ts';
import * as covers from '../src/community/eventCovers.ts';

const now = Date.parse('2026-10-29T12:00:00Z');
const profile = { id:'alice', name:'Alice', city:'Madrid', country:'España', adultConfirmed:true, acceptedTermsVersion:TERMS_VERSION, acceptedTermsAt:'2026-10-13T12:00:00Z' };
function home(extra: Record<string, unknown> = {}) {
  const api = { profile, loading:false, ownEventsLoading:false, eventsLoading:false, postsLoading:false, error:'', ownEvents:[], events:[], posts:[], hiddenPostIds:[], blockedIds:[], ...extra };
  const jsx = (type: unknown, props: unknown) => ({ type, props });
  const modules: Record<string, unknown> = {
    'react/jsx-runtime':{ jsx, jsxs:jsx }, 'react-router-dom':{ Link:'Link' }, 'lucide-react':{},
    './CommunityContext':{ useCommunity:()=>api, TERMS_VERSION }, './eventPrivacy':privacy, './eventCovers':covers, './useClock':{ useClock:()=>now },
  };
  const source = readFileSync(new URL('../src/community/clubhouse-home.tsx', import.meta.url),'utf8');
  const compiled = ts.transpileModule(source,{ compilerOptions:{ target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.ReactJSX } }).outputText;
  const exports: any = {};
  new Function('exports','require',compiled)(exports,(name:string)=>modules[name]);
  const nodes = (node:any):any[] => {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (typeof node.type === 'function') return nodes(node.type(node.props));
    return [node,...nodes(node.props?.children)];
  };
  const text = (node:any):string => {
    if (node == null || typeof node === 'boolean') return '';
    if (Array.isArray(node)) return node.map(text).join('');
    if (typeof node === 'object') return typeof node.type === 'function' ? text(node.type(node.props)) : text(node.props?.children);
    return String(node);
  };
  const tree = exports.ClubhouseHome();
  return { text:text(tree), nodes:nodes(tree) };
}

test('inicio en carga no presenta registro ni agenda vacía antes de resolver la cuenta',()=>{
  const loading = home({ profile:null, loading:true });
  assert.match(loading.text,/Preparando tu espacio/);
  assert.doesNotMatch(loading.text,/Únete gratis|Tu agenda está libre/);
  assert.match(home({ profile:null }).text,/La vida/);
});

test('inicio no muestra encuentros privados ajenos ni publicaciones ocultas o bloqueadas',()=>{
  const event = { id:'private', ownerId:'bob', visibility:'private', title:'SECRETO AJENO', startAt:'2026-10-30T18:00:00Z', status:'open', timeZone:'Europe/Madrid' };
  const view = home({ ownEvents:[event], events:[event], hiddenPostIds:['hidden'], blockedIds:['bob'], posts:[{ id:'blocked',authorId:'bob',text:'SECRETO BLOQUEADO' },{ id:'hidden',authorId:'alice',text:'SECRETO OCULTO' }] });
  assert.doesNotMatch(view.text,/SECRETO/);
  assert.match(view.text,/El próximo plan lo haces tú/);
});

test('inicio conserva la cita privada propia y usa el enlace real del encuentro',()=>{
  const event = { id:'own-event',ownerId:'alice',visibility:'private',title:'Cita propia',startAt:'2026-10-30T18:00:00Z',status:'open',timeZone:'Europe/Madrid',city:'Madrid',country:'España',format:'7' };
  const view = home({ ownEvents:[event] });
  assert.match(view.text,/Cita propia/);
  assert.ok(view.nodes.some(node=>node.type==='Link' && node.props.to==='/play/own-event'));
});

test('cuenta incompleta y error tienen recuperación sin fingir agenda vacía o consentimiento',()=>{
  const incomplete = home({ profile:{ ...profile, adultConfirmed:false, acceptedTermsVersion:'' } });
  assert.match(incomplete.text,/Completar mi cuenta/);
  assert.ok(incomplete.nodes.some(node=>node.type==='Link' && node.props.to==='/profile'));
  const failed = home({ error:'offline' });
  assert.match(failed.text,/No hemos podido actualizar los encuentros/);
  assert.doesNotMatch(failed.text,/Tu agenda está libre/);
});
