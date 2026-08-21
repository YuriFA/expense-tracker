# Expense Tracker - agent memory

pnpm workspace monorepo for a spec-first expense tracker: a layered **Go API**
(`backend/`) wired to a **Vue 3** web app (`apps/web/`) and a **React Native
(Expo)** mobile app (`apps/mobile/`), sharing platform-agnostic TS packages
(`packages/*`). The OpenAPI contract is the single source of truth tying them
together.

Each area has its own rules in its own `AGENTS.md` (`backend/`, `apps/web/`,
`apps/mobile/`) - read the one for the area you touch. Code is the source of truth.

## Cross-cutting invariants (all areas)

- **OpenAPI is the source of truth** at `docs/api/openapi.yaml`. Change the spec
  FIRST, then regenerate everywhere; never hand-maintain duplicate types/structs.
  Lint: `npx @redocly/cli lint --config docs/api/redocly.yaml docs/api/openapi.yaml`.
  - Backend server code: `make gen` (oapi-codegen); CI drift gate `make gen-check`.
  - TS types: `pnpm gen:api` (in `packages/api` or `apps/web`) regenerates
    `packages/api/src/schema.ts` via openapi-typescript; re-run + commit after spec changes.
    CI drift gate: the `ts-gen-check` job (regenerate + `git diff --exit-code`).
- **Money is `int64` minor units** (divisor 100) at every persistence /
  transport / sync / calculation boundary. Never float/decimal where money
  is stored, transmitted, or computed. Form/UI state may use a
  platform-appropriate representation (float majors on web, digit strings
  on mobile), converted exactly once at the mapper seam via round-based
  `toMinorUnits` / `parseMajorUnitsToMinor`; conversion must not lose
  integer precision (no chained float arithmetic before the single
  rounding step).
- **Timestamps are UTC** (`TIMESTAMPTZ` / `time.Time`).
- **IDs are UUID v4** (`github.com/google/uuid`).
- **Auth is a stateful session cookie** (`session_id`). Do NOT introduce JWT.
  Affects backend (sessions), web (`entities/session`), and mobile alike.
- **Errors carry a machine `code` + human `message`.** Backend maps domain errors
  to `ErrorResponse{code,message}` in ONE place; frontends map every non-2xx to a
  `RepositoryError` by `code` (e.g. 409 `ACCOUNT_IN_USE` vs
  `TRANSACTION_VERSION_CONFLICT` vs `USER_ALREADY_EXISTS`), not by HTTP status.

## Shared workspace packages (`packages/*`)

Platform-agnostic TS consumed by the apps — web: `@expense-tracker/{api,money,i18n,tokens}`;
mobile: `@expense-tracker/{api,dates,money,tokens}` (i18n wiring pending) —
resolved to source `.ts` via `exports` (no build step; `moduleResolution: bundler`).
Each TS package has its own `tsconfig.json` + `type-check` and must
type-check cleanly alone (`tokens` is css-only and exempt - its palette is
guarded by the mobile `design-tokens-guard` and `design-tokens-sync` tests).
Each package's source/README is authoritative for its contents; only the cross-cutting
rules and decisions live here.

- **MUST stay free of DOM/Vue/browser-only/RN APIs.** Only the fetch-family
  (`fetch`/`Request`/`Response`/`Headers`) is allowed (works in browser/Node/RN).
- **`api`** (deps: `money`): the contract layer - generated schema,
  `createApiClient({ baseUrl, fetch })` (apps supply the base URL - no `window`),
  error mapping keyed on `code` + `setUnauthorizedHandler`, and the
  `Repository<T,C,U>` DI seam. Apps implement the repository interface; the
  package never imports app code.
- **`money`** (leaf): dinero.js minor-units money. Its balance calculator is
  generic over a minimal account shape (no domain dep).
- **`dates`** (deps: `date-fns`): the shared date layer - locale-shaped labels
  (ru/en via date-fns locale data, no Intl), month-cursor navigation,
  Monday-first month grids, day keys, and `nowIso`/`isoDaysAgo` ISO timestamps.
  Apps never import `date-fns` directly, only this facade. Decided end-state
  (2026-08-20): BOTH apps use this package as the canonical date layer -
  web's app-local `@internationalized/date` adapter is temporary; extend the
  package API when web needs more, don't grow a permanent parallel adapter.
- **`i18n`** (leaf): EN/RU bundles + `MessageSchema`. `mapCategory(s)` take an
  injected `Translator` (vue-i18n `t` on web, react-i18next on mobile) - no app
  coupling. Default product locale is RU (decided 2026-08-20): `dates`
  already defaults to 'ru'; the `i18n` `DEFAULT_LOCALE` en→ru change is
  pending implementation.
- **`tokens`** (css-only): the home of the shared design-token palette - two
  platform copies in `src/` (`index.css` for web via `/css`, `mobile.css` for
  Uniwind via `/mobile`), same sRGB hex values kept in sync by hand; the
  mobile copy is the canonical palette (decided 2026-08-20) - when copies
  disagree, web syncs to mobile. App CSS
  entries stay thin and must not re-declare token values.

App-local concerns stay OUT of packages: web keeps its vue-i18n instance, Vite
base-URL resolution, localStorage repos, Vue DI/composables, and Zod schemas;
mobile keeps its native wiring.

## Monorepo tooling

`pnpm knip` (workspace root) checks every workspace (`apps/*`, `packages/*`)
for unused files, dependencies, and exports. Single config: the root
`knip.json` `workspaces` object (knip 6 takes the workspace list from
`pnpm-workspace.yaml` and does NOT auto-load per-package knip configs - keep
all settings in the root file).

`pnpm arch:check` (workspace root) enforces architecture rules with
dependency-cruiser (root `.dependency-cruiser.*.cjs`; CI `arch-check` job):
package leaf/direction + platform-framework bans (`packages/*`), mobile FSD
layer direction + cross-slice + api-client seam, date-fns facade ban in
both apps. Backend layering is enforced by depguard rules in
`backend/.golangci.yml` (middleware allowlist exception lives in
`issues.exclusions` there).

## Repo layout

```
backend/        Go API (Gin + sqlc + Postgres)
apps/web/       Vue 3 + Vite (Feature-Sliced Design)
apps/mobile/    React Native + Expo (Feature-Sliced Design + Expo Router)
packages/       shared TS: api, dates, money, i18n; shared css: tokens
docs/api/       OpenAPI contract (source of truth)
```

## Maintaining these files

Keep each `AGENTS.md` for knowledge useful to almost every session in its area.
Do not repeat what the codebase already shows - point to the authoritative file
or command. Prefer rewriting/pruning over appending. Preserve this bar for all
agents and keep entries concise.
