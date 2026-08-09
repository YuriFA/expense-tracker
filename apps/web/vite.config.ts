import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

const API_TARGET = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Same-origin proxy for `/api/*`: the browser talks to the dev/preview server
  // origin, which forwards to the backend. This keeps the session cookie
  // same-origin (no SameSite/Secure friction) and sidesteps CORS preflight
  // entirely, so PATCH / custom headers (Idempotency-Key) work without extra
  // backend CORS configuration.
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
})
