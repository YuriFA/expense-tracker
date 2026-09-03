import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Design-canvas hard rule («Tokens are canonical»): raw sRGB hex lives only
// in the tokens package and the sanctioned value tables below; app code
// consumes tokens through Tailwind classes/CSS vars. Together with the
// page-header rule this is the mechanical slice of the canvas - it keeps
// the checkable part from drifting, not the whole contract.

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, '..')

// Sanctioned hex is data, not styling: web-only theme extras kept sRGB for
// diffing against apps/mobile/global.css (style.css header explains why),
// and TS mirrors of palette values where CSS vars are unavailable (category
// appearance stored on records, canvas/SVG fill constants). Test fixtures
// that assert concrete colors are out of scope too.
const SANCTIONED = new Set([
  'style.css',
  'entities/category/config/category-appearance.ts',
  'entities/analytics/model/other-entry.ts',
])

const RAW_HEX = /#[0-9a-fA-F]{3,8}\b/g

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else if (/\.(vue|ts|css)$/.test(entry.name)) yield path
  }
}

describe('raw hex stays out of app sources (canvas tokens rule)', () => {
  it('allows hex only in sanctioned value tables, never in components', () => {
    const violations: string[] = []
    for (const path of walk(srcDir)) {
      const slug = relative(srcDir, path)
      if (SANCTIONED.has(slug)) continue
      if (/\.(test|spec)\.[jt]sx?$/.test(slug)) continue
      for (const match of readFileSync(path, 'utf8').matchAll(RAW_HEX)) {
        violations.push(`${slug}: ${match[0]}`)
      }
    }
    expect(violations).toEqual([])
  })
})
