import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

// PWA suite (capability `web-pwa`): the service worker only exists in
// production builds, so these specs run against `vite preview` over a fresh
// `vite build` - never the dev server used by the default playwright config
// (which ignores e2e/pwa/ accordingly). Backendless: the preview proxy's /api
// target is unreachable, and the app is network-tolerant (anonymous mode).
export default defineConfig({
  testDir: './e2e/pwa',
  timeout: 60 * 1000,
  expect: {
    timeout: 10_000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    actionTimeout: 0,
    baseURL: 'http://localhost:4179',
    trace: 'on-first-retry',
    headless: !!process.env.CI || process.env.E2E_HEADLESS === '1',
  },
  projects: [
    {
      // Chromium only: the PWA shell behavior is browser-general but OPFS +
      // service workers are already covered elsewhere; WebKit is excluded
      // repo-wide (no OPFS in the bundled build).
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: {
    command: 'pnpm run build && pnpm run preview --port 4179 --strictPort',
    port: 4179,
    reuseExistingServer: !process.env.CI,
  },
})
