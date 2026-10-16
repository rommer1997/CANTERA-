import { loadEnv } from 'vite';

// pnpm build runs Vite's production build. Use the same file precedence,
// interpolation and process-variable precedence without rewriting VITE_* flags.
export function productionEnvironment(directory = process.cwd()) {
  return loadEnv('production', directory, 'VITE_');
}
