import { productionEnvironment } from './release-environment.mjs';
const env = productionEnvironment();
if (env.VITE_FIREBASE_EMULATORS === 'true') {
  console.error('La compilación de producción no permite emuladores Firebase. Usa pnpm dev para pruebas locales.');
  process.exit(1);
}
if (env.VITE_SERVICE_OPEN === 'true') await import('./check-release.mjs');
else console.log('Compilación con apertura pública desactivada. No acredita un lanzamiento.');
