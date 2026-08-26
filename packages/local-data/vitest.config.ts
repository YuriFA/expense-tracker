import { defineConfig } from 'vitest/config'

// The package's tests are node-only: real SQLite via `node:sqlite`
// (src/testing), no React Native, no browser APIs.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
