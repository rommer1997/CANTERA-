import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';
// Cache the compiled application shell only. Firebase, media, profiles and responses
// are deliberately outside the service worker's fetch policy.
export function canteraShell(): Plugin {
 return { name: 'cantera-shell', apply: 'build', generateBundle(_options, bundle) {
  const paths = ['index.html', 'cantera-mark.svg', 'cantera-maskable.svg', 'manifest.webmanifest', ...Object.keys(bundle).filter(path => path.startsWith('assets/'))];
  const digest = createHash('sha256');
  for (const [name, output] of Object.entries(bundle).sort(([a], [b]) => a.localeCompare(b))) digest.update(name).update(output.type === 'chunk' ? output.code : output.source);
  for (const file of ['cantera-mark.svg', 'cantera-maskable.svg', 'manifest.webmanifest']) digest.update(readFileSync(`public/${file}`));
  const version = digest.digest('hex').slice(0, 16);
  const code = `const CACHE='cantera-shell-${version}';const FILES=${JSON.stringify(paths)};const ROOT=new URL('./',self.location.href);const ABS=new Set(FILES.map(file=>new URL(file,ROOT).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(file=>new URL(file,ROOT).href)))));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('cantera-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const req=event.request;const url=new URL(req.url);if(req.method!=='GET'||url.origin!==ROOT.origin)return;const shell=req.mode==='navigate'&&(url.pathname===ROOT.pathname||url.pathname===ROOT.pathname+'index.html');const target=shell?new URL('index.html',ROOT).href:req.url;if(!shell&&!ABS.has(target))return;event.respondWith(caches.open(CACHE).then(cache=>cache.match(target)).then(hit=>hit||fetch(req)))});`;
  this.emitFile({ type: 'asset', fileName: 'sw.js', source: code });
 }};
}
