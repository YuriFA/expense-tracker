// Regenerates the typed OpenAPI client schema from the canonical backend contract.
//
// Source of truth: ../../docs/api/openapi.yaml (backend, do NOT hand-edit the output).
// Output: src/shared/api/schema.ts (committed; regenerated via `bun run gen:api`).
//
// Run this after the backend spec changes, then commit the result alongside the
// spec change. CI does not yet gate frontend drift, so keep this in sync manually.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// `here` = apps/web/scripts. The package lives at apps/web; the canonical spec at
// the repo root. The openapi-typescript binary resolves through the workspace.
const here = dirname(fileURLToPath(import.meta.url))
const pkgDir = resolve(here, '..')            // apps/web
const root = resolve(pkgDir, '..', '..')       // repo root
const spec = resolve(root, 'docs', 'api', 'openapi.yaml')
const output = resolve(pkgDir, 'src', 'shared', 'api', 'schema.ts')

const bin = resolve(pkgDir, 'node_modules', '.bin', 'openapi-typescript')

console.log(`[gen:api] ${spec} -> ${output}`)
execFileSync(bin, [spec, '-o', output], { stdio: 'inherit', cwd: pkgDir })
console.log('[gen:api] done')
