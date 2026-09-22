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
  const defaultSupabaseUrl = '';
  const defaultSupabaseAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXRqZXpuZmhjYmRud3ptZWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTI2MjIsImV4cCI6MjEwNTIyODYyMn0.c-bgiXJFfvBq4Q38ZNPgiO6-zn6uKZBZ70OrxsG7Wwc';

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    defaultSupabaseUrl;
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(sanitizedClerkKey),
      // Vercel projects created from the original template may still use the
      // unprefixed names. Resolve them at build time without exposing secrets
      // other than the public Supabase anon key.
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
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
