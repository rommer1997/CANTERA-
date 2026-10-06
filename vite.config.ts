import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {canteraShell} from './scripts/pwa-plugin';

export default defineConfig(({mode}) => {
  return {
    plugins: [react(), tailwindcss(), canteraShell()],
    base: './',
    build: { rollupOptions: { output: { manualChunks: { 'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'], 'react': ['react', 'react-dom', 'react-router-dom'] } } } },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      // Non-frontend work must not discard a form being tested in the browser.
      watch: { ignored: ['**/.audit/**', '**/.github/**', '**/functions/**', '**/docs/**', '**/scripts/**', '**/tests/**', '**/tmp/**', '**/output/**', '**/PLAN_CANTERA.md', '**/WHITEPAPER.md', '**/README.md', '**/firestore.rules', '**/storage.rules', '**/firebase.json', '**/public/whitepaper.md', '**/public/Cantera-Whitepaper.pdf'] },
    },
  };
});
