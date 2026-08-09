import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Backend (Fastify) runs on :3000 with no CORS headers configured, so
    // proxy API paths through the dev server and keep requests same-origin.
    proxy: {
      '/todo': 'http://localhost:3000',
    },
  },
})
