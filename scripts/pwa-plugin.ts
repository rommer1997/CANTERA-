import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

// Only compiled shell files enter these caches. Account data, Firebase traffic
// and user media are outside both the current and historical fetch policies.
export function shellServiceWorkerSource(paths: readonly string[], version: string): string {
 return String.raw`const VERSION=${JSON.stringify(version)};
const CACHE='cantera-shell-'+VERSION;
const FILES=${JSON.stringify(paths)};
const ROOT=new URL('./',self.location.href);
const ABS=new Set(FILES.map(file=>new URL(file,ROOT).href));
const META=new URL('.cantera-shell-manifest',ROOT).href;
const SHELL_CACHE=/^cantera-shell-[0-9a-f]{16}$/;
const HASHED_ASSET=/^assets\/[^/]+-[A-Za-z0-9_-]{8}\.[A-Za-z0-9]+$/;
const clientVersions=new Map();
async function windowClients(){
 return (await self.clients.matchAll({type:'window',includeUncontrolled:true})).filter(client=>{
  try{const url=new URL(client.url);return url.origin===ROOT.origin&&url.pathname.startsWith(ROOT.pathname)}catch{return false}
 });
}
async function cacheManifest(cache){
 const response=await cache.match(META);
 if(!response)return null;
 try{return await response.json()}catch{return null}
}
async function pruneCaches(){
 const clients=await windowClients();
 const live=new Set(clients.map(client=>client.id));
 for(const id of clientVersions.keys())if(!live.has(id))clientVersions.delete(id);
 // A legacy tab cannot report its version. Preserve its compiled files until
 // it closes; the next shell request removes caches no live tab still needs.
 if(clients.some(client=>!clientVersions.has(client.id)))return;
 const keep=new Set([CACHE,...clients.map(client=>'cantera-shell-'+clientVersions.get(client.id))]);
 const manifest=await cacheManifest(await caches.open(CACHE));
 if(!manifest||!Array.isArray(manifest.predecessors))return;
 // Only predecessors may be pruned. A newer waiting worker has already
 // installed its own cache, which this active worker must never delete.
 const predecessors=new Set(manifest.predecessors.filter(name=>typeof name==='string'&&SHELL_CACHE.test(name)));
 const names=await caches.keys();
 await Promise.all(names.filter(name=>predecessors.has(name)&&!keep.has(name)).map(name=>caches.delete(name)));
}
async function maintainCaches(){
 const clients=await windowClients();
 for(const client of clients)if(!clientVersions.has(client.id))client.postMessage({type:'SHELL_VERSION_REQUEST',version:VERSION});
 await pruneCaches();
}
async function historicalAsset(target){
 const names=(await caches.keys()).filter(name=>SHELL_CACHE.test(name)&&name!==CACHE);
 for(const name of names){
  const cache=await caches.open(name);
  const response=await cache.match(META);
  if(response){
   let manifest;try{manifest=await response.json()}catch{continue}
   const files=Array.isArray(manifest)?manifest:manifest?.files;
   if(!Array.isArray(files)||!files.some(file=>typeof file==='string'&&HASHED_ASSET.test(file)&&new URL(file,ROOT).href===target))continue;
  }else{
   // Earlier Cantera workers only precached build files and had no manifest.
   // Accept an exact existing key in those narrowly named shell caches.
   const keys=await cache.keys();
   if(!keys.some(key=>key.url===target))continue;
  }
  const hit=await cache.match(target);
  if(hit)return hit;
 }
 return null;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const names=(await caches.keys()).filter(name=>SHELL_CACHE.test(name)&&name!==CACHE);
 const cache=await caches.open(CACHE);
 const previous=await cacheManifest(cache);
 const predecessors=Array.isArray(previous?.predecessors)?previous.predecessors:names;
 await cache.addAll(FILES.map(file=>new URL(file,ROOT).href));
 await cache.put(META,new Response(JSON.stringify({version:VERSION,files:FILES,predecessors}),{headers:{'Content-Type':'application/json'}}));
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE'){self.skipWaiting();return}
 if(event.data?.type==='CLIENT_SHELL_VERSION'&&event.source?.id&&typeof event.data.version==='string'&&/^[0-9a-f]{16}$/.test(event.data.version)){
  clientVersions.set(event.source.id,event.data.version);
  event.waitUntil(pruneCaches());
 }
});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim().then(maintainCaches)));
self.addEventListener('fetch',event=>{
 const req=event.request;
 const url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
 const shell=req.mode==='navigate'&&(url.pathname===ROOT.pathname||url.pathname===ROOT.pathname+'index.html');
 const target=shell?new URL('index.html',ROOT).href:req.url;
 const relative=url.pathname.slice(ROOT.pathname.length);
 const historical=!url.search&&HASHED_ASSET.test(relative);
 if(!shell&&!ABS.has(target)&&!historical)return;
 event.waitUntil(maintainCaches());
 event.respondWith((async()=>{
  const hit=ABS.has(target)?await (await caches.open(CACHE)).match(target):null;
  return hit||(historical?await historicalAsset(target):null)||fetch(req);
 })());
});`;
}

export function canteraShell(): Plugin {
 return { name: 'cantera-shell', apply: 'build', generateBundle: { order: 'post', handler(_options, bundle) {
  const staticFiles = ['cantera-mark.svg', 'cantera-maskable.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'icon-touch-180.png', 'manifest.webmanifest'];
  const paths = ['index.html', ...staticFiles, ...Object.keys(bundle).filter(path => path.startsWith('assets/'))];
  const digest = createHash('sha256');
  for (const [name, output] of Object.entries(bundle).sort(([a], [b]) => a.localeCompare(b))) digest.update(name).update(output.type === 'chunk' ? output.code : output.source);
  for (const file of staticFiles) digest.update(file).update(readFileSync(`public/${file}`));
  const version = digest.digest('hex').slice(0, 16);
  const index = bundle['index.html'];
  if (!index || index.type !== 'asset') throw new Error('No se ha generado la página de inicio de la PWA.');
  const html = typeof index.source === 'string' ? index.source : Buffer.from(index.source).toString('utf8');
  index.source = html.replace('</head>', `<meta name="cantera-shell-version" content="${version}"></head>`);
  this.emitFile({ type: 'asset', fileName: 'sw.js', source: shellServiceWorkerSource(paths, version) });
 } } };
}
