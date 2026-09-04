import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Design-system rule (canvas «Сложные компоненты» section 4): single-select
// segmented controls are the shared `SegmentedControl` (Tabs look: muted
// track, active segment raised on the surface color). Hand-rolled segments
// (Button + aria-pressed toggles, custom `bg-* p-1` tracks) drift from the
// canonical look - exactly how the pre-component category/analytics/debts
// variants diverged - so new occurrences fail here.

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, '..')

const SEGMENTED_CONTROL_DIR = 'shared/ui/segmented-control'

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else if (/\.(vue|ts)$/.test(entry.name)) yield path
  }
}

describe('segmented control stays on the shared component', () => {
  it('keeps aria-pressed button toggles out of app sources', () => {
    const violations: string[] = []
    for (const path of walk(srcDir)) {
      const slug = relative(srcDir, path).replaceAll('\\', '/')
      if (slug.startsWith(SEGMENTED_CONTROL_DIR)) continue
      if (/\.(test|spec)\.[jt]sx?$/.test(slug)) continue
      const source = readFileSync(path, 'utf8')
      if (/aria-pressed/.test(source)) {
        violations.push(slug)
      }
    }
    expect(violations).toEqual([])
  })
})
