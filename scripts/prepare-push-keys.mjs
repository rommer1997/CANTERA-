// Generates this app's VAPID signing keys locally, without printing private data.
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const directory=new URL('../.audit/push-secrets/',import.meta.url);
mkdirSync(directory,{recursive:true,mode:0o700});
if(lstatSync(directory).isSymbolicLink())throw new Error('El directorio de claves no puede ser un enlace.');
const path=new URL('vapid.json',directory);
if(existsSync(path)){
  const info=lstatSync(path);if(!info.isFile()||info.isSymbolicLink()||(info.mode&0o077))throw new Error('Revisa los permisos del archivo privado de claves.');
  const existing=JSON.parse(readFileSync(path,'utf8'));
  if(!existing.VAPID_PRIVATE_KEY||!existing.VAPID_PUBLIC_KEY)throw new Error('Archivo de claves incompleto. No se regenera automáticamente.');
  console.log('Se conservan las claves VAPID existentes.');
}else{
  const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});const jwk=privateKey.export({format:'jwk'});
  const publicKey=Buffer.concat([Buffer.from([4]),Buffer.from(jwk.x,'base64url'),Buffer.from(jwk.y,'base64url')]).toString('base64url');
  writeFileSync(path,JSON.stringify({VAPID_PUBLIC_KEY:publicKey,VAPID_PRIVATE_KEY:jwk.d}),{mode:0o600,flag:'wx'});
  console.log('Claves VAPID preparadas en el archivo privado .audit/push-secrets/vapid.json. No se han subido a ningún servicio.');
}
