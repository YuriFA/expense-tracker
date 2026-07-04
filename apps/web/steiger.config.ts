import { defineConfig } from 'steiger'
import fsd from '@feature-sliced/steiger-plugin'

export default defineConfig([
  ...fsd.configs.recommended,

  // Fractal FSD: pages могут содержать вложенный features/ слой.
  // Внутри nested features canonical segment names (ui/, model/, lib/) — это
  // intended pattern, не нарушение. Отключаем правило только для этих путей.
  {
    name: 'app/fractal-fsd-no-reserved',
    files: ['./src/pages/**/features/**'],
    rules: {
      'fsd/no-reserved-folder-names': 'off',
    },
  },
  {
    // Custom rule: отключаем проверку public-api для файлов в shared, т.к. там
    // своя структура и не всегда есть index.ts на верхнем уровне
    files: ['./src/shared/**'],
    rules: {
      'fsd/public-api': 'off',
    },
  },
  {
    // Сегменты shared с flat-файловой структурой (services, store, config) —
    // несколько .ts файлов лежат напрямую в сегменте без index.ts на верхнем
    // уровне. У steiger исключение для такого паттерна работает только
    // в shared/ui и shared/lib, поэтому добавляем исключение
    files: [
      './src/shared/services/**',
      './src/shared/store/**',
      './src/shared/config/**',
    ],
    rules: {
      'fsd/no-public-api-sidestep': 'off',
    },
  },
])
