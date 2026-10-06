import { readFileSync, existsSync } from 'node:fs';
import { productionEnvironment } from './release-environment.mjs';
const env = productionEnvironment();
let approval = null;
if (existsSync('docs/release-approved.json')) { try { approval = JSON.parse(readFileSync('docs/release-approved.json', 'utf8')); } catch {} }
const config = JSON.parse(readFileSync('firebase-applet-config.json', 'utf8'));
const requirements = {
  'Nombre legal del responsable': Boolean(env.VITE_OPERATOR_NAME?.trim()),
  'Correo público de contacto': /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.VITE_CONTACT_EMAIL || ''),
  'País del responsable': Boolean(env.VITE_OPERATOR_COUNTRY?.trim()),
  'Apertura pública expresamente configurada': env.VITE_SERVICE_OPEN === 'true',
  'Modo de prueba desactivado': env.VITE_ENABLE_DEMO !== 'true',
  'Carga multimedia permanece cerrada hasta financiación': env.VITE_ENABLE_MEDIA_UPLOADS !== 'true',
  'Versión Node 24 o superior': Number(process.versions.node.split('.')[0]) >= 24,
  'Acta de revisión de nube del proyecto y base correctos': Boolean(approval?.approvedBy && approval?.approvedAt && Date.parse(approval.approvedAt) <= Date.now() && Date.now() - Date.parse(approval.approvedAt) < 7 * 86400000 && approval.projectId === (env.VITE_FIREBASE_PROJECT_ID || config.projectId) && approval.databaseId === (env.VITE_FIREBASE_DATABASE_ID || config.firestoreDatabaseId)),
  'Reglas e índices aplicados y migración comprobada': approval?.checks?.rulesAndIndexes === true && approval?.checks?.migration === true,
  'Prueba real entre dos cuentas y administración comprobadas': approval?.checks?.twoAccounts === true && approval?.checks?.admin === true,
  'Dominios, recuperación de datos y atención comprobados': approval?.checks?.authDomain === true && approval?.checks?.backupRestore === true && approval?.checks?.support === true,
  'Documentación y derechos revisados por el responsable': approval?.checks?.legalAndPrivacy === true && approval?.checks?.accountRights === true,
};
for (const [name, ready] of Object.entries(requirements)) console.log(`${ready ? 'OK' : 'PENDIENTE'} · ${name}`);
console.log('Esta comprobación valida el acta; no ejecuta despliegues ni sustituye las pruebas reales registradas en ella.');
if (Object.values(requirements).some(value => !value)) process.exitCode = 1;
