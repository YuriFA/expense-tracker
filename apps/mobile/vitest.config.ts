// CommonJS form on purpose: this package has no `"type": "module"` (RN/Metro is
// CommonJS), so an ESM `import`/`export default` config would warn under Vitest.
// The app tsconfig excludes this file (it uses Node APIs), and Vitest loads it
// directly, so no app type-check is affected.
const { defineConfig } = require('vitest/config')
const path = require('node:path')

/**
 * Minimal Vitest config for the mobile app.
 *
 * Scope is deliberately narrow: there is no React Native / Jest transform
 * wired up here, so only PURE TypeScript modules (no `react-native` imports)
 * are testable today - i.e. the date utilities under `src/shared/lib`. The
 * carousel component itself (Reanimated + RNGH + gesture UI) is exercised by
 * the Maestro E2E flows instead, per the project test posture (README "Testing"
 * + the maestro skill). The `node` environment keeps these pure-logic tests
 * fast and Hermes/ICU-independent, matching the app's Intl-free stance.
 */
module.exports = defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    root: path.join(__dirname),
  },
})
