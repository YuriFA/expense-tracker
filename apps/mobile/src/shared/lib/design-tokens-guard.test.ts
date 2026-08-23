import { describe, expect, it } from '@jest/globals'
import { readdirSync, readFileSync, type Dirent } from 'node:fs'
import path from 'node:path'

/**
 * Design-token guard: app source must not contain raw color literals.
 *
 * Every color comes from a token - a Uniwind class (`bg-primary`), an
 * `accent-*` class on a `{prop}ClassName` prop, or an inline style color
 * from DATA (a category's predefined/API color). The token VALUES
 * themselves live in packages/tokens (via apps/mobile/global.css), outside
 * this scan.
 */
const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g

// The predefined category palette stores brand-token hex VALUES as data -
// rendered via inline `style={{ backgroundColor }}`, exactly like
// API-provided colors will be - so it is the one sanctioned place where raw
// hex appears in src/.
const RAW_COLOR_EXEMPT_FILES = [
  'src/entities/category/config/category-appearance.ts',
  // The analytics «Прочие» aggregate entry stores the same kind of token-hex
  // DATA for the Skia canvas paint (see that file for the rationale).
  'src/features/analytics/config/other-entry.ts',
]

const SRC_ROOT = path.resolve(__dirname, '../../..')

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry: Dirent) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(full)
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [full] : []
  })
}

describe('design tokens guard', () => {
  it('src/** has no raw hex/rgb/hsl color literals (tests excluded)', () => {
    const offenders = collectSourceFiles(SRC_ROOT)
      .filter((file) => !RAW_COLOR_EXEMPT_FILES.includes(path.relative(SRC_ROOT, file)))
      .map((file) => {
        const hits = readFileSync(file, 'utf8').match(RAW_COLOR)
        return hits ? `${path.relative(SRC_ROOT, file)}: ${hits.join(', ')}` : null
      })
      .filter((line): line is string => line !== null)

    expect(offenders).toEqual([])
  })
})
