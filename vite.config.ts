import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') {
    const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = loadEnv(mode, process.cwd(), 'VITE_');
    if (VITE_SUPABASE_URL !== 'https://fxxrkwitncaraotvkyte.supabase.co') {
      throw new Error('Production builds require the authoritative Pulse of Divinity Supabase project.');
    }
    // The app uses the project's legacy anon JWT. This checks its configuration
    // claims at build time. Supabase verifies the signature at runtime.
    const segments = VITE_SUPABASE_ANON_KEY?.split('.') ?? [];
    let claims: { ref?: string; role?: string } | null = null;
    if (segments.length === 3 && segments.every(Boolean)) {
      try {
        claims = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'));
      } catch {
        // The same error below covers missing and malformed configuration.
      }
    }
    if (claims?.ref !== new URL(VITE_SUPABASE_URL).hostname.split('.')[0] || claims.role !== 'anon') {
      throw new Error('Production builds require the authoritative project anon key.');
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
