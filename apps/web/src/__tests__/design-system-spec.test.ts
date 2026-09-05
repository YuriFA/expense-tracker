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

describe('PWA chrome colors are token-derived', () => {
  // A20: the manifest / meta chrome colors must follow the app's visual
  // style (Warm Paper shell), not the categorical data palette or raw white.
  const webRoot = join(repoRoot, 'apps', 'web')
  const manifest = JSON.parse(
    readFileSync(join(webRoot, 'public', 'site.webmanifest'), 'utf8'),
  ) as { theme_color: string; background_color: string }
  const indexHtml = readFileSync(join(webRoot, 'index.html'), 'utf8')

  it('manifest theme/background match the light --background token', () => {
    expect(manifest.theme_color).toBe(themes.light['background'])
    expect(manifest.background_color).toBe(themes.light['background'])
  })

  it('index.html theme-color metas follow the color scheme', () => {
    // Formatting-robust: parse the meta tags, then compare attribute values.
    const metas = [...indexHtml.matchAll(/<meta\b[^>]*name="theme-color"[^>]*>/g)].map((m) => m[0])
    const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1]
    expect(metas).toHaveLength(2)
    const [light, dark] = metas
    expect(attr(light!, 'media')).toBe('(prefers-color-scheme: light)')
    expect(attr(light!, 'content')).toBe(themes.light['background'])
    expect(attr(dark!, 'media')).toBe('(prefers-color-scheme: dark)')
    expect(attr(dark!, 'content')).toBe(themes.dark['background'])
  })
})
