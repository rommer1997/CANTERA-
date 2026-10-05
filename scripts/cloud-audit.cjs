const fs = require('node:fs');
const auth = require('firebase-tools/lib/auth');
const {requireAuth} = require('firebase-tools/lib/requireAuth');
const rules = require('firebase-tools/lib/gcp/rules');
const storage = require('firebase-tools/lib/gcp/storage');
const firebaseAuth = require('firebase-tools/lib/gcp/auth');
(async () => {
  const project = 'gen-lang-client-0853130215';
  const account = auth.getGlobalDefaultAccount();
  if (!account) throw new Error('Firebase CLI requiere una sesión del propietario.');
  const options = {project}; auth.setActiveAccount(options, account); await requireAuth(options);
  const releases = await rules.listAllReleases(project);
  const selected = releases.filter(r => r.name.includes('ai-studio-647af55f-499b-43f3-9268-9bf5f62701bb') || r.name.includes('firebase.storage'));
  for (const release of selected) {
    const files = await rules.getRulesetContent(release.rulesetName);
    const name = release.name.split('/releases/')[1].replaceAll('/', '_');
    fs.writeFileSync(`.audit/${name}.json`, JSON.stringify({release, files}, null, 2));
    console.log(JSON.stringify({release: release.name, rulesSaved: `.audit/${name}.json`}));
  }
  const domains = await firebaseAuth.getAuthDomains(project);
  console.log(JSON.stringify({authorizedDomains:domains}));
  try { const bucket = await storage.getBucket('gen-lang-client-0853130215.firebasestorage.app'); console.log(JSON.stringify({bucket:bucket.name,location:bucket.location})); }
  catch(err) { console.log(JSON.stringify({storage:err.message})); }
})().catch(err => { console.error(err.message); process.exitCode=1; });
