import { productionEnvironment } from './release-environment.mjs';
const env = productionEnvironment();
if (env.VITE_FIREBASE_EMULATORS === 'true') {
  console.error('La compilación de producción no permite emuladores Firebase. Usa pnpm dev para pruebas locales.');
  process.exit(1);
}
if (env.VITE_ENABLE_PILOT === 'true') {
  const requirements = {
    'Piloto privado sin apertura pública': env.VITE_SERVICE_OPEN === 'false',
    'Modo de prueba desactivado en el piloto': env.VITE_ENABLE_DEMO === 'false',
    'Carga multimedia desactivada en el piloto': env.VITE_ENABLE_MEDIA_UPLOADS === 'false',
    'Responsable y país configurados': Boolean(env.VITE_OPERATOR_NAME?.trim() && env.VITE_OPERATOR_COUNTRY?.trim()),
    'Contacto del piloto configurado': /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.VITE_CONTACT_EMAIL || ''),
    'Versión Node 24 o superior': Number(process.versions.node.split('.')[0]) >= 24,
  };
  for (const [name, ready] of Object.entries(requirements)) console.log(`${ready ? 'OK' : 'PENDIENTE'} · ${name}`);
  if (Object.values(requirements).some(value => !value)) process.exitCode = 1;
  else console.log('Compilación para piloto privado. Sólo admite cuentas autorizadas por la configuración y las reglas del servidor; no acredita una apertura pública.');
} else if (env.VITE_SERVICE_OPEN === 'true') await import('./check-release.mjs');
else console.log('Compilación con apertura pública desactivada. No acredita un lanzamiento.');
