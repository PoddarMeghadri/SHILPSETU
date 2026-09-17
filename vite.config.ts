import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const rawClerkKey = process.env.VITE_CLERK_PUBLISHABLE_KEY || '';
  const sanitizedClerkKey = rawClerkKey
    .replace(/^VITE_CLERK_PUBLISHABLE_KEY=/, '')
    .replace(/^["']|["']$/g, '')
    .trim() || 'pk_test_ZXRlcm5hbC1maXJlZmx5LTgyODYuY2xlcmsuYWNjb3VudHMuZGV2JA';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(sanitizedClerkKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
