import { productionEnvironment } from './release-environment.mjs';
const env = productionEnvironment();
if (env.VITE_SERVICE_OPEN === 'true') await import('./check-release.mjs');
else console.log('Compilación con apertura pública desactivada. No acredita un lanzamiento.');
