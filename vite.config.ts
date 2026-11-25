import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') {
    const { VITE_SUPABASE_URL } = loadEnv(mode, process.cwd(), 'VITE_');
    if (VITE_SUPABASE_URL !== 'https://fxxrkwitncaraotvkyte.supabase.co') {
      throw new Error('Production builds require the authoritative Pulse of Divinity Supabase project.');
    }
  }

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          main: 'index.html',
          admin: 'admin.html',
        },
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
