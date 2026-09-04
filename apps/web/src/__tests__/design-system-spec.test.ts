import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..', '..', '..')
const spec = readFileSync(join(repoRoot, '.superdesign', 'design-system.md'), 'utf8')
const tokensCss = readFileSync(join(repoRoot, 'packages', 'tokens', 'src', 'index.css'), 'utf8')

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
    const name = match[1]
    const value = match[2]
    if (!name || !value) continue
    const normalizedValue = value.trim()
    if (normalizedValue.includes('var(')) continue
    vars[name] = normalizedValue
  }
  return vars
}

const themes = {
  light: parseVars(extractBlock(tokensCss, ':root')),
  dark: parseVars(extractBlock(tokensCss, '\\.dark')),
}

const SPEC_ECHOED_TOKENS = {
  light: [
    'background',
    'card',
    'foreground',
    'muted-foreground',
    'border',
    'primary',
    'accent',
    'accent-foreground',
    'secondary',
    'secondary-hover',
    'success',
    'warning',
    'destructive',
  ],
  dark: [
    'background',
    'card',
    'foreground',
    'muted-foreground',
    'border',
    'primary',
    'accent',
    'accent-foreground',
    'secondary',
    'secondary-hover',
    'success',
    'warning',
    'destructive',
  ],
  brand: [
    'brand-aliceblue',
    'brand-indigo',
    'brand-violet',
    'brand-lilac',
    'brand-orange',
    'brand-green',
    'brand-leaf',
  ],
} as const

describe('superdesign spec stays aligned with shipped tokens', () => {
  it('documents every canonical light-theme palette value', () => {
    const missing = SPEC_ECHOED_TOKENS.light.flatMap((name) => {
      const value = themes.light[name]
      if (!value) throw new Error(`missing token: ${name}`)
      return spec.includes(`\`${value}\``) ? [] : [`light --${name}: ${value}`]
    })
    expect(missing).toEqual([])
  })

  it('documents every canonical dark-theme palette value', () => {
    const missing = SPEC_ECHOED_TOKENS.dark.flatMap((name) => {
      const value = themes.dark[name]
      if (!value) throw new Error(`missing token: ${name}`)
      return spec.includes(`\`${value}\``) ? [] : [`dark --${name}: ${value}`]
    })
    expect(missing).toEqual([])
  })

  it('documents the vivid data palette values', () => {
    const missing = SPEC_ECHOED_TOKENS.brand.flatMap((name) => {
      const value = themes.light[name]
      if (!value) throw new Error(`missing token: ${name}`)
      return spec.includes(`\`${value}\``) ? [] : [`brand --${name}: ${value}`]
    })
    expect(missing).toEqual([])
  })
})
