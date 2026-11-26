import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const path = (relative) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, path('../..'), 'VITE_');
  const project = 'https://fxxrkwitncaraotvkyte.supabase.co';
  if (env.VITE_SUPABASE_URL !== project) throw new Error('Invalid notification backend');
  const key = env.VITE_SUPABASE_ANON_KEY ?? '';
  let claims;
  try { claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')); } catch {}
  if (claims?.ref !== new URL(project).hostname.split('.')[0] || claims.role !== 'anon') {
    throw new Error('Invalid notification project anon key');
  }
  return {
    root: path('.'),
    publicDir: false,
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(project),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(key),
      'import.meta.env.VITE_VAPID_PUBLIC_KEY': JSON.stringify(env.VITE_VAPID_PUBLIC_KEY ?? ''),
    },
    build: {
      outDir: path('./baseline/dist'),
      emptyOutDir: false,
      rollupOptions: {input: path('./notifications.html')},
    },
  };
});
