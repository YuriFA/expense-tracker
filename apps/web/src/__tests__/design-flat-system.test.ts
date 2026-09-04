import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, '..')

const GRADIENT_PATTERNS = [
  /bg-gradient-to-[a-z-]+/g,
  /bg-linear-to-[a-z-]+/g,
  /(?:linear|radial|conic)-gradient\(/g,
]

const SANCTIONED_GRADIENTS: Partial<Record<string, RegExp[]>> = {
  'shared/ui/skeleton/Skeleton.vue': [
    /linear-gradient\(90deg, var\(--border\) 25%, var\(--background\) 50%, var\(--border\) 75%\)/g,
  ],
  'widgets/mobile-shell/ui/SpeedDialFab.vue': [
    /bg-gradient-to-t/g,
    /linear-gradient\(to_top,black_0%,rgba\(0,0,0,0\.6\)_35%,transparent_70%\)/g,
  ],
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else if (/\.(vue|ts|css)$/.test(entry.name)) yield path
  }
}

describe('flat-system guardrails stay enforced', () => {
  it('keeps gradients out of app sources except the sanctioned utility cases', () => {
    const violations: string[] = []
    for (const path of walk(srcDir)) {
      const slug = relative(srcDir, path)
      if (/\.(test|spec)\.[jt]sx?$/.test(slug)) continue
      let source = readFileSync(path, 'utf8')
      for (const pattern of SANCTIONED_GRADIENTS[slug] ?? []) {
        source = source.replace(pattern, '')
      }
      for (const pattern of GRADIENT_PATTERNS) {
        for (const match of source.matchAll(pattern)) {
          violations.push(`${slug}: ${match[0]}`)
        }
      }
    }
    expect(violations).toEqual([])
  })
})
