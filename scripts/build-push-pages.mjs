import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root=fileURLToPath(new URL('..',import.meta.url));
const bundle=join(root,'.audit/push-pages-bundle');
const output=join(root,'.audit/push-pages');
const result=spawnSync(process.platform==='win32'?'pnpm.cmd':'pnpm',[
  '--dir','push-worker','--ignore-workspace','exec','wrangler','deploy','src/pages.mjs',
  '--dry-run','--outdir',bundle,
],{cwd:root,stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'},shell:process.platform==='win32'});
if(result.status!==0)process.exit(result.status||1);
mkdirSync(output,{recursive:true});
copyFileSync(join(bundle,'pages.js'),join(output,'_worker.js'));
writeFileSync(join(output,'_routes.json'),JSON.stringify({version:1,include:['/*'],exclude:[]})+'\n');
writeFileSync(join(output,'index.html'),'<!doctype html><meta charset="utf-8"><title>LaCantera · Avisos</title><p>Servicio de notificaciones de LaCantera.</p>');
console.log('API de Pages preparada; no se ha publicado ni cambiado ningún permiso.');
