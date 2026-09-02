import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_ROOT = join(process.cwd(), 'src')
const SOURCE_EXTENSIONS = new Set(['.ts', '.vue'])
const TEST_FILE_RE = /\.test\.ts$/
const LEGACY_PATTERNS = [
  /@\/shared\/ui\/number-field/,
  /\bNumberField(?:Root|Input|Content|Increment|Decrement)?\b/,
]

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry: string) => {
    const path = join(dir, entry)
    const stats = statSync(path)

    if (stats.isDirectory()) {
      return collectSourceFiles(path)
    }

    if (!SOURCE_EXTENSIONS.has(extname(path)) || TEST_FILE_RE.test(path)) {
      return []
    }

    return [path]
  })
}

describe('legacy money input guard', () => {
  it('keeps apps/web money editing on AmountField instead of NumberField variants', () => {
    const violations = collectSourceFiles(SRC_ROOT)
      .map((path) => ({
        path,
        content: readFileSync(path, 'utf8'),
      }))
      .filter(({ content }) => LEGACY_PATTERNS.some((pattern) => pattern.test(content)))
      .map(({ path }) => path.replace(`${SRC_ROOT}/`, ''))

    expect(violations).toEqual([])
  })
})
