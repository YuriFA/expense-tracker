/**
 * Architecture rules for apps/mobile/src — invariant #15 (FSD layer
 * direction: strictly downward, six layers, no exceptions) and #16
 * (direct apiClient use limited to session API + sync transport).
 *
 * No registered deviations: the A11 set was fully resolved 2026-08-20
 * (sync provider composes in src/app/_layout.tsx with the context in
 * shared/lib/sync/sync-context.tsx; the cashflow sheets delegate
 * new-transaction actions to page-level composition; entity slices export
 * barrels). Do NOT add exclusions without an explicit architectural
 * decision.
 *
 * Run from the repo root: `pnpm arch:check` (see root package.json).
 */

const FEATURE_SLICES = ['analytics', 'cashflow-overview', 'create-transaction', 'sync-conflicts']
const ENTITY_SLICES = ['account', 'category', 'transaction', 'debt', 'session', 'planned-payment']

const crossSliceRules = (layer, slices) =>
  slices.map((slice) => ({
    name: `fsd-${layer}-no-cross-slice-${slice}`,
    comment:
      'invariant #15: cross-slice imports within a layer are forbidden (decided 2026-08-20)',
    severity: 'error',
    from: { path: `^src/${layer}/${slice}/` },
    to: { path: `^src/${layer}/(?!${slice}/)` },
  }))

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'fsd-shared-no-upward',
      comment:
        'invariant #15: shared MUST NOT import from entities/features/widgets/pages/app',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/(entities|features|widgets|pages|app)(/|$)' },
    },
    {
      name: 'fsd-entities-no-upward',
      severity: 'error',
      from: { path: '^src/entities/' },
      to: { path: '^src/(features|widgets|pages|app)(/|$)' },
    },
    {
      name: 'fsd-features-no-upward',
      severity: 'error',
      from: { path: '^src/features/' },
      to: { path: '^src/(widgets|pages|app)(/|$)' },
    },
    {
      name: 'fsd-widgets-no-upward',
      severity: 'error',
      from: { path: '^src/widgets/' },
      to: { path: '^src/(pages|app)(/|$)' },
    },
    {
      name: 'fsd-pages-no-upward',
      severity: 'error',
      from: { path: '^src/pages/' },
      to: { path: '^src/app(/|$)' },
    },
    ...crossSliceRules('features', FEATURE_SLICES),
    ...crossSliceRules('entities', ENTITY_SLICES),
    {
      name: 'no-date-fns',
      comment: 'invariant #14: apps never import date-fns directly (facade rule)',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^date-fns' },
    },
    {
      name: 'api-client-seam',
      comment:
        'invariant #16: direct apiClient use is limited to the session API and the sync transport',
      severity: 'error',
      from: {
        path: '^src/',
        pathNot: [
          '^src/entities/session/api/',
          '^src/shared/lib/sync/',
          '^src/shared/api/',
        ],
      },
      to: { path: '^src/shared/api/(client|index)\\.ts$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // Architecture rules target production code; test files are exempt
    // (test-only upward imports are acknowledged, as with Steiger on web).
    exclude: ['\\.test\\.(ts|tsx)$', '__tests__/'],
    tsConfig: { fileName: 'tsconfig.json' },
  },
}
