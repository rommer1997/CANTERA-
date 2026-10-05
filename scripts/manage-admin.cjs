// Run only from an owner-authorized Firebase CLI session. No client-side role switch.
const auth = require('firebase-tools/lib/auth');
const {requireAuth} = require('firebase-tools/lib/requireAuth');
const firebaseAuth = require('firebase-tools/lib/gcp/auth');
(async () => {
 const args=process.argv.slice(2);const index=args.indexOf('--email');const email=index>=0?args[index+1]:'';
 if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Uso: node scripts/manage-admin.cjs --email CORREO [--apply]');
 const project='gen-lang-client-0853130215';const options={project};const account=auth.getGlobalDefaultAccount();
 if (!account) throw new Error('Accede primero al Firebase CLI con una cuenta propietaria autorizada.');
 auth.setActiveAccount(options,account);await requireAuth(options);
 const user=await firebaseAuth.findUser(project,email);
 console.log(JSON.stringify({project,email,uid:user.uid,action:args.includes('--apply')?'grant-admin':'review-only'}));
 if (!args.includes('--apply')) {console.log('Revisa la identidad. --apply otorga administración permanente de Cantera a esta cuenta.');return;}
 await firebaseAuth.setCustomClaim(project,user.uid,{admin:true},{merge:true});
 console.log('Claim admin aplicado. Cierra sesión y vuelve a entrar para renovar el token.');
})().catch(err=>{console.error(err.message);process.exitCode=1;});
