/**
 * Generates the Uniwind theme block in apps/mobile/global.css from the
 * React Native hex tokens (src/tokens/colors.rn.ts).
 *
 * Usage:
 *   node scripts/generate-mobile-theme.mjs          # write apps/mobile/global.css
 *   node scripts/generate-mobile-theme.mjs --check  # exit 1 on drift, no write
 *
 * Everything between the BEGIN/END GENERATED THEME markers is replaced;
 * the rest of global.css (imports, radii, font, custom utilities) is
 * hand-maintained.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createJiti } from 'jiti'

const check = process.argv.includes('--check')

const tokensDir = path.dirname(fileURLToPath(import.meta.url))
const tokensSrc = path.join(tokensDir, '../src/tokens/colors.rn.ts')
const targetPath = path.resolve(tokensDir, '../../../apps/mobile/global.css')

const jiti = createJiti(import.meta.url)
const { colorsRN } = await jiti.import(tokensSrc)

const light = colorsRN.light
const dark = colorsRN.dark

const lightKeys = Object.keys(light)
const darkKeys = Object.keys(dark)
if (lightKeys.join() !== darkKeys.join()) {
  console.error(
    'colors.rn.ts: light and dark must define the exact same token set ' +
      '(Uniwind runtime error otherwise).\n' +
      `  light-only: ${lightKeys.filter((k) => !(k in dark)).join(', ') || '-'}\n` +
      `  dark-only: ${darkKeys.filter((k) => !(k in light)).join(', ') || '-'}`,
  )
  process.exit(1)
}

const cssColorVars = (theme) =>
  Object.entries(theme)
    .map(([token, value]) => `      --color-${token}: ${value.toLowerCase()};`)
    .join('\n')

const generated = `/* BEGIN GENERATED THEME - do not edit by hand.
 * Regenerate with: pnpm --filter @expense-tracker/tokens gen:mobile-theme
 * Source of truth: packages/tokens/src/tokens/colors.rn.ts
 */

@theme {
  --color-white: ${colorsRN.white.toLowerCase()};
  --color-black: ${colorsRN.black.toLowerCase()};
}

/**
 * Semantic colors per theme. Light and dark define the exact same set of
 * variables (mismatched sets are a runtime error). Classes like \`bg-background\`
 * resolve the active theme's value automatically.
 */
@layer theme {
  :root {
    @variant light {
${cssColorVars(light)}
    }

    @variant dark {
${cssColorVars(dark)}
    }
  }
}
/* END GENERATED THEME */`

const current = readFileSync(targetPath, 'utf8')
const begin = '/* BEGIN GENERATED THEME'
const end = '/* END GENERATED THEME */'

const beginIdx = current.indexOf(begin)
const endIdx = current.indexOf(end)
if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
  console.error(`${targetPath}: GENERATED THEME markers missing or out of order.`)
  process.exit(1)
}

const next =
  current.slice(0, beginIdx) + generated + current.slice(endIdx + end.length)

if (next === current) {
  console.log('apps/mobile/global.css is up to date.')
  process.exit(0)
}

if (check) {
  console.error(
    'apps/mobile/global.css is stale. Run: pnpm --filter @expense-tracker/tokens gen:mobile-theme',
  )
  process.exit(1)
}

writeFileSync(targetPath, next)
console.log('apps/mobile/global.css: generated theme block updated.')
