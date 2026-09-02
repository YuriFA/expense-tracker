import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Design-system hard rule (canvas «Сложные компоненты» section 11): every
// page under the app shell renders its header through the shared
// PageHeader (title 32px bold tracking-tight, optional muted subtitle,
// round outline back control on child pages, right-side actions slot).
// The shell page set is derived from the router itself (public pages are
// out of scope), so a new shell page fails here until it adopts
// PageHeader - the rule cannot silently drift back to hand-rolled
// headers.

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, '..')

interface ShellPage {
  route: string
  slug: string
  exportName: string
}

const COMPONENT_IMPORT =
  /component: \(\) => import\('@\/pages\/([a-z-]+)'\)\.then\(\(m\) => m\.(\w+)\)/

function shellPages(): ShellPage[] {
  // Route records are flat `{ path, name, component, meta? }` blocks; the
  // lazy slice from `path:` to the record's first `},` always covers the
  // component import and a meta line when one exists.
  const source = readFileSync(join(srcDir, 'app', 'router', 'index.ts'), 'utf8')
  const pages: ShellPage[] = []
  for (const record of source.matchAll(/path: '([^']+)',[\s\S]*?\},/g)) {
    const importMatch = record[0].match(COMPONENT_IMPORT)
    if (!importMatch) continue
    if (/public: true/.test(record[0])) continue
    pages.push({
      route: record[1]!,
      slug: importMatch[1]!,
      exportName: importMatch[2]!,
    })
  }
  return pages
}

function resolvePageFile(slug: string, exportName: string, depth = 0): string {
  if (depth > 3) throw new Error(`barrel too deep: ${slug} -> ${exportName}`)
  const source = readFileSync(join(srcDir, 'pages', slug, 'index.ts'), 'utf8')
  const line = source
    .split('\n')
    .find(
      (candidate) =>
        candidate.includes(`as ${exportName} }`) || candidate.includes(`{ ${exportName} }`),
    )
  if (!line) {
    throw new Error(`export ${exportName} not found in pages/${slug}/index.ts`)
  }
  const from = line.match(/from '(\.[^']+)'/)
  if (!from?.[1]) throw new Error(`no relative source for ${exportName} in pages/${slug}`)
  if (from[1].endsWith('.vue')) return join(srcDir, 'pages', slug, from[1].slice(2))
  // Re-exported through a nested barrel (e.g. settings/features/categories).
  const nestedSlug = `${slug}/${from[1].slice(2)}`
  return resolvePageFile(nestedSlug, exportName, depth + 1)
}

// A routed page may be a thin route wrapper (e.g. AnalyticsDetailPage
// mounts the keyed AnalyticsDetailView that owns the header), so the
// check follows local relative .vue imports transitively.
function usesPageHeader(file: string, seen = new Set<string>()): boolean {
  if (seen.has(file)) return false
  seen.add(file)
  const source = readFileSync(file, 'utf8')
  if (/<PageHeader\b/.test(source)) return true
  return [...source.matchAll(/from '(\.\/.+\.vue)'/g)].some((local) =>
    usesPageHeader(join(dirname(file), local[1]!), seen),
  )
}

// The nine shell routes that exist today; keeps the parse honest - a router
// format change must fail loudly here, not vacuously below.
const EXPECTED_ROUTES = [
  '/',
  '/transactions',
  '/analytics',
  '/analytics/:direction',
  '/debts',
  '/plans',
  '/accounts',
  '/settings',
  '/settings/categories',
]

describe('shell pages use the shared PageHeader', () => {
  it('derives the shell page set from the router', () => {
    const pages = shellPages()
    const missing = EXPECTED_ROUTES.filter(
      (route) => !pages.some((page) => page.route === route),
    )
    expect(missing).toEqual([])
  })

  it('renders every shell page header through PageHeader', () => {
    const pages = shellPages()
    expect(pages.length).toBeGreaterThan(0)
    const violations: string[] = []
    for (const page of pages) {
      const file = resolvePageFile(page.slug, page.exportName)
      if (!usesPageHeader(file)) {
        violations.push(`${file} (route ${page.route})`)
      }
    }
    expect(violations).toEqual([])
  })
})
