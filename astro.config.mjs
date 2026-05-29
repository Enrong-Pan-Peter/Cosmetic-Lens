import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// Normalise PUBLIC_SITE_URL down to just its origin so the sitemap, canonical URLs,
// and OG tags all agree even if the env var includes a /en/ path or trailing slash.
const rawSiteUrl = process.env.PUBLIC_SITE_URL || 'https://cosmetic-lens.vercel.app';
let siteOrigin;
try {
  siteOrigin = new URL(rawSiteUrl).origin;
} catch {
  siteOrigin = 'https://cosmetic-lens.vercel.app';
}

export default defineConfig({
  site: siteOrigin,
  integrations: [
    react(),
    tailwind(),
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', zh: 'zh-CN' },
      },
      filter: (page) => !page.includes('/api/'),
    }),
  ],
  output: 'server',
  adapter: vercel(),
  vite: {
    ssr: {
      noExternal: ['react-markdown', 'remark-gfm', '@phosphor-icons/react']
    }
  }
});
