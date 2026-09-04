import { defineConfig } from 'vitest/config'

// The package's tests are node-only: pure TypeScript, no browser APIs.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
