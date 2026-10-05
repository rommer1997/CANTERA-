import { readFileSync, existsSync } from 'node:fs';
import dotenv from 'dotenv';
for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) if (existsSync(file)) dotenv.config({ path: file, override: true, quiet: true });
const requirements = {
  'Nombre del responsable': Boolean(process.env.VITE_OPERATOR_NAME),
  'Correo público de contacto': /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.VITE_CONTACT_EMAIL || ''),
  'País del responsable': Boolean(process.env.VITE_OPERATOR_COUNTRY),
  'Modo de prueba desactivado': process.env.VITE_ENABLE_DEMO !== 'true',
  'Fotos y reels en nube financiados y habilitados': process.env.VITE_ENABLE_MEDIA_UPLOADS === 'true',
  'Versión Node 24 o superior': Number(process.versions.node.split('.')[0]) >= 24,
};
for (const [name, ready] of Object.entries(requirements)) console.log(`${ready ? 'OK' : 'PENDIENTE'} · ${name}`);
console.log('Comprobar además en nube: reglas desplegadas, dominio Auth, bucket/financiación, cuenta admin, backup, tratamiento de datos y prueba con dos cuentas.');
if (Object.values(requirements).some(value => !value)) process.exitCode = 1;
