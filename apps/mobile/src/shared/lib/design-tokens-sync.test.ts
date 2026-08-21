// Guard: the two tokens copies share one palette - the mobile copy is
// canonical (decided 2026-08-20). Parses both CSS files and fails when a
// shared token drifts between platforms or a canonical token is missing on
// the web side. Platform-specific extras (mobile plain neutrals, web
// sidebar/chart mappings) are explicitly exempt.

import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const TOKENS_DIR = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  'packages',
  'tokens',
  'src',
)

/** Mobile-only plain neutrals with no web counterpart. */
const MOBILE_ONLY = new Set(['white', 'black'])

/**
 * Extracts the body of the first block whose opener is immediately
 * followed by `{` — matching `opener {` avoids header comments that merely
 * mention the opener (e.g. ".dark class selectors" in the file headers).
 * `opener` is a regex source (escape dots).
 */
function extractBlock(source: string, opener: string): string {
  const match = source.match(new RegExp(`${opener}\\s*\\{`))
  if (match?.index === undefined) throw new Error(`block not found: ${opener}`)
  const openBrace = match.index + match[0].length - 1
  const end = source.indexOf('}', openBrace)
  return source.slice(openBrace + 1, end)
}

function parseVars(block: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const match of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    const value = match[2].trim()
    if (value.includes('var(')) continue
    vars[match[1]] = value
  }
  return vars
}

function webThemes() {
  const css = readFileSync(path.join(TOKENS_DIR, 'index.css'), 'utf8')
  return {
    light: parseVars(extractBlock(css, ':root')),
    dark: parseVars(extractBlock(css, '\\.dark')),
  }
}

function mobileThemes() {
  const css = readFileSync(path.join(TOKENS_DIR, 'mobile.css'), 'utf8')
  return {
    light: parseVars(extractBlock(css, '@variant light')),
    dark: parseVars(extractBlock(css, '@variant dark')),
  }
}

describe('design tokens sync guard (mobile copy is canonical)', () => {
  const web = webThemes()
  const mobile = mobileThemes()

  it('parses a non-trivial number of tokens from both copies', () => {
    expect(Object.keys(mobile.light).length).toBeGreaterThan(20)
    expect(Object.keys(mobile.dark).length).toBeGreaterThan(20)
    expect(Object.keys(web.light).length).toBeGreaterThan(20)
  })

  it.each(['light', 'dark'] as const)(
    '%s theme: every mobile token matches the web copy',
    (theme) => {
      const mismatches: string[] = []
      for (const [name, value] of Object.entries(mobile[theme])) {
        if (MOBILE_ONLY.has(name)) continue
        const webName = name.startsWith('color-') ? name.slice('color-'.length) : name
        const webValue = web[theme][webName]
        if (webValue === undefined) {
          mismatches.push(`${theme} ${name}: missing on web as --${webName}`)
        } else if (webValue !== value) {
          mismatches.push(`${theme} ${name}: mobile ${value} != web ${webValue}`)
        }
      }
      expect(mismatches).toEqual([])
    },
  )

  it('radius sm/md literals match between copies', () => {
    const webCss = readFileSync(path.join(TOKENS_DIR, 'index.css'), 'utf8')
    const mobileCss = readFileSync(path.join(TOKENS_DIR, 'mobile.css'), 'utf8')
    for (const token of ['--radius-sm', '--radius-md']) {
      const webValue = webCss.match(new RegExp(`${token}:\\s*([^;]+);`))?.[1]?.trim()
      const mobileValue = mobileCss.match(new RegExp(`${token}:\\s*([^;]+);`))?.[1]?.trim()
      expect(webValue).toBeDefined()
      expect(webValue).toBe(mobileValue)
    }
  })
})
