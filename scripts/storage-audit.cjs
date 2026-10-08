const auth = require('firebase-tools/lib/auth');
const {resolve} = require('node:path');
const {requireAuth} = require('firebase-tools/lib/requireAuth');
const storage = require('firebase-tools/lib/gcp/storage');
const {Client} = require('firebase-tools/lib/apiv2');
(async () => {
 const project = 'gen-lang-client-0853130215'; const options={project};
 const account = auth.getProjectDefaultAccount(resolve(__dirname, '..'));
 if (!account) throw new Error('Firebase CLI requiere una sesión autorizada para este proyecto.');
 auth.setActiveAccount(options,account); await requireAuth(options);
 try { const buckets=await storage.listBuckets(project); console.log(JSON.stringify({buckets:buckets.map(b=>({name:b.name,location:b.location}))})); }
 catch(err) { console.log(JSON.stringify({storage:err.message,detail:err.original?.message})); }
 const billing=new Client({urlPrefix:'https://cloudbilling.googleapis.com',apiVersion:'v1'});
 try {const r=await billing.get(`/projects/${project}/billingInfo`);console.log(JSON.stringify({billingEnabled:r.body.billingEnabled}));}
 catch(err){console.log(JSON.stringify({billing:err.message}));}
})().catch(err=>{console.error(err.message);process.exitCode=1;});
