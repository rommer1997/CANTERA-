import { PushError, uidValid, decodeFields } from './protocol.mjs';

const JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let keys = null; let loadedAt = 0; let loading = null;
function decode(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new PushError('unauthorized',401);
  try { return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),char=>char.charCodeAt(0)); }
  catch { throw new PushError('unauthorized',401); }
}
async function googleKeys(fetcher,force=false) {
  if (!force && keys && Date.now()-loadedAt < 3600_000) return keys;
  if (!loading) loading = (async()=>{
    const response = await fetcher(JWKS,{signal:AbortSignal.timeout(6000)});
    if (!response.ok) throw new PushError('temporarily-unavailable',503);
    const payload = await response.json();
    if (!Array.isArray(payload.keys)) throw new PushError('temporarily-unavailable',503);
    keys = payload.keys; loadedAt = Date.now(); return keys;
  })().finally(()=>{loading=null;});
  return loading;
}
export async function verifyToken(token, projectId, { fetcher = fetch, now = Date.now(), keySet } = {}) {
  if (typeof token !== 'string' || token.length > 8192) throw new PushError('unauthorized',401);
  const parts=token.split('.'); if(parts.length!==3)throw new PushError('unauthorized',401);
  let header, claims;
  try { header=JSON.parse(new TextDecoder().decode(decode(parts[0]))); claims=JSON.parse(new TextDecoder().decode(decode(parts[1]))); }
  catch { throw new PushError('unauthorized',401); }
  const epoch=Math.floor(now/1000);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>128
    ||claims.aud!==projectId||claims.iss!==`https://securetoken.google.com/${projectId}`||!uidValid(claims.sub)
    ||claims.email_verified!==true||!Number.isInteger(claims.exp)||claims.exp<=epoch
    ||!Number.isInteger(claims.iat)||claims.iat>epoch+60||claims.iat>claims.exp
    ||!Number.isInteger(claims.auth_time)||claims.auth_time>epoch+60)throw new PushError('unauthorized',401);
  const validKey=key=>key.kid===header.kid&&key.kty==='RSA'&&(!key.alg||key.alg==='RS256');
  let jwk=(keySet || await googleKeys(fetcher)).find(validKey);
  if(!jwk&&!keySet&&Date.now()-loadedAt>60000)jwk=(await googleKeys(fetcher,true)).find(validKey);
  if(!jwk)throw new PushError('unauthorized',401);
  try {
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(`${parts[0]}.${parts[1]}`)))throw Error();
  } catch { throw new PushError('unauthorized',401); }
  return claims.sub;
}
export async function readFirestore(path, token, env, fetcher = fetch) {
  const project=env.FIREBASE_PROJECT_ID; const database=env.FIREBASE_DATABASE_ID;
  if(!/^[a-z0-9-]+$/.test(project)||typeof database!=='string'||!database.length||/[/?#]/.test(database))throw new PushError('not-configured',503);
  const base=`https://firestore.googleapis.com/v1/projects/${project}/databases/${encodeURIComponent(database)}/documents/`;
  const target=new URL(base+path.split('/').map(encodeURIComponent).join('/'));
  const fields=path.includes('/messages/')?['id','senderId','createdAt']
    :path.startsWith('communityProfiles/')?['id','adultConfirmed','acceptedTermsVersion','acceptedTermsAt','city','country']
      :path==='communityConfiguration/runtime'?['serviceStatus','pilotUserIds']
        :path.startsWith('communityAccountModeration/')?['status']
          :path.startsWith('communityInvitations/')?['id','ownerId','recipientId','kind','eventId','status','createdAt','usedBy','usedAt']
            :path.startsWith('communityEvents/')?['ownerId','visibility','status','startAtMs']:['id','participantIds','createdAt'];
  fields.forEach(field=>target.searchParams.append('mask.fieldPaths',field));
  const response=await fetcher(target,{
    headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(6000),redirect:'error',
  });
  if(response.status===404)return null;
  if(response.status===403||response.status===401)throw new PushError('unavailable',403);
  if(!response.ok)throw new PushError('temporarily-unavailable',503);
  return decodeFields((await response.json()).fields);
}
export async function requireActive(uid, read, termsVersion) {
  const [profile,runtime,moderation]=await Promise.all([
    read(`communityProfiles/${uid}`),read('communityConfiguration/runtime'),read(`communityAccountModeration/${uid}`),
  ]);
  if(!profile?.adultConfirmed||profile.acceptedTermsVersion!==termsVersion||!profile.acceptedTermsAt
    ||!profile.city?.trim()||!profile.country?.trim()||moderation?.status==='suspended'
    ||!(runtime?.serviceStatus==='open'||runtime?.serviceStatus==='pilot'&&runtime.pilotUserIds?.includes(uid)))throw new PushError('unavailable',403);
}
