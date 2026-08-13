// Regenerates the typed OpenAPI client schema from the canonical backend contract.
//
// Source of truth: <repo>/docs/api/openapi.yaml (backend, do NOT hand-edit the output).
// Output: ./src/schema.ts (committed; regenerated via `pnpm run gen:api`).
//
// Run this after the backend spec changes, then commit the result alongside the
// spec change. The web app delegates its `gen:api` script to this package.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

// `here` = packages/api/scripts. The package lives at packages/api; the
// canonical spec at the repo root.
const here = dirname(fileURLToPath(import.meta.url))
const pkgDir = resolve(here, '..') // packages/api
const root = resolve(pkgDir, '..', '..') // repo root
const spec = resolve(root, 'docs', 'api', 'openapi.yaml')
const output = resolve(pkgDir, 'src', 'schema.ts')

// Resolve the `openapi-typescript` CLI through Node module resolution scoped to
// this package, so it works whether the dependency is hoisted to the workspace
// root or nested under packages/api/node_modules (pnpm hoisted vs isolated,
// npm, etc.). Running it via `process.execPath` (node) avoids depending on any
// particular .bin symlink layout.
const require = createRequire(resolve(pkgDir, 'package.json'))
const otsManifestPath = require.resolve('openapi-typescript/package.json')
const otsDir = dirname(otsManifestPath)
const { bin: binField } = JSON.parse(readFileSync(otsManifestPath, 'utf8'))
const binEntry = typeof binField === 'string' ? binField : binField['openapi-typescript']
const bin = resolve(otsDir, binEntry)

console.log(`[gen:api] ${spec} -> ${output}`)
execFileSync(process.execPath, [bin, spec, '-o', output], { stdio: 'inherit', cwd: pkgDir })
console.log('[gen:api] done')
