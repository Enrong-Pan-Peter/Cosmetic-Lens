import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  // Astro exposes PUBLIC_-prefixed vars on import.meta.env; mirror that.
  envPrefix: ['PUBLIC_'],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx,js,jsx,mjs}'],
    // Dummy env so modules that construct Supabase clients at import time
    // (src/lib/supabase.ts) load cleanly. Tests never hit the network.
    env: {
      PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      OPENAI_API_KEY: 'test-openai-key',
    },
  },
});
