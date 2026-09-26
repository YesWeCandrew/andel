import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { flexGapFallback } from './postcss/flexGapFallback.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Ships an ES5 + polyfilled bundle behind <script nomodule> for
    // browsers that predate ES module support (e.g. Safari <10.1 / iOS 9,
    // as found on older iPads) — the modern bundle still loads everywhere else.
    legacy({
      targets: ['defaults', 'iOS >= 9', 'Safari >= 9'],
    }),
  ],
  css: {
    postcss: {
      // Margin fallbacks for flex `gap`, which Safari <14.1 ignores.
      plugins: [flexGapFallback()],
    },
  },
  server: {
    // Backend (Fastify) runs on :3000 with no CORS headers configured, so
    // proxy API paths through the dev server and keep requests same-origin.
    // /uploads serves recipe photos (see backend/src/lib/uploads.ts).
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
})
