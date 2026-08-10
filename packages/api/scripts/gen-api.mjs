// Regenerates the typed OpenAPI client schema from the canonical backend contract.
//
// Source of truth: <repo>/docs/api/openapi.yaml (backend, do NOT hand-edit the output).
// Output: ./src/schema.ts (committed; regenerated via `bun run gen:api`).
//
// Run this after the backend spec changes, then commit the result alongside the
// spec change. The web app delegates its `gen:api` script to this package.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// `here` = packages/api/scripts. The package lives at packages/api; the
// canonical spec at the repo root. The openapi-typescript binary resolves
// through the workspace.
const here = dirname(fileURLToPath(import.meta.url))
const pkgDir = resolve(here, '..') // packages/api
const root = resolve(pkgDir, '..', '..') // repo root
const spec = resolve(root, 'docs', 'api', 'openapi.yaml')
const output = resolve(pkgDir, 'src', 'schema.ts')

const bin = resolve(pkgDir, 'node_modules', '.bin', 'openapi-typescript')

console.log(`[gen:api] ${spec} -> ${output}`)
execFileSync(bin, [spec, '-o', output], { stdio: 'inherit', cwd: pkgDir })
console.log('[gen:api] done')
