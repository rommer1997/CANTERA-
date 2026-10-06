import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Reuse the normal build and its release checks. Vite environment variables
// supplied to the process take precedence over .env files.
const result = spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['run', 'build'], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  env: { ...process.env, VITE_HOSTING_PROVIDER: 'firebase' },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (result.error) console.error('No se pudo iniciar la compilación de Firebase Hosting. Comprueba pnpm y Node.');
process.exitCode = result.status ?? 1;
