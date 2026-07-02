import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      setupFiles: ['./src/__tests__/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        include: ['src/**/*.{ts,vue}'],
        exclude: [
          'src/shared/ui/**',
          'src/main.ts',
          'src/App.vue',
          'src/**/*.d.ts',
          'src/__tests__/**',
          'src/**/types.ts',
          'src/**/index.ts',
        ],
        // Thresholds intentionally disabled while Phase 4 (components/pages) is in progress.
        // Phase 1-3 (pure logic, repositories, composables) target 100%.
        // Re-enable once Vue component coverage is brought up.
        // thresholds: {
        //   statements: 100,
        //   branches: 100,
        //   functions: 100,
        //   lines: 100,
        // },
      },
    },
  }),
)
