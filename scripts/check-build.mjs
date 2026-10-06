import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) if (existsSync(file)) dotenv.config({ path: file, override: true, quiet: true });
if (process.env.VITE_SERVICE_OPEN === 'true') await import('./check-release.mjs');
else console.log('Compilación con apertura pública desactivada. No acredita un lanzamiento.');
