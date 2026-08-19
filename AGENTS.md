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
- **Money is `int64` minor units** (divisor 100), everywhere. Never float/decimal.
- **Timestamps are UTC** (`TIMESTAMPTZ` / `time.Time`); `time.Local = time.UTC` in tests.
- **IDs are UUID v4** (`github.com/google/uuid`).
- **Auth is a stateful session cookie** (`session_id`). Do NOT introduce JWT.
  Affects backend (sessions), web (`entities/session`), and mobile alike.
- **Errors carry a machine `code` + human `message`.** Backend maps domain errors
  to `ErrorResponse{code,message}` in ONE place; frontends map every non-2xx to a
  `RepositoryError` by `code` (e.g. 409 `ACCOUNT_IN_USE` vs
  `TRANSACTION_VERSION_CONFLICT` vs `USER_ALREADY_EXISTS`), not by HTTP status.

## Shared workspace packages (`packages/*`)

Platform-agnostic TS consumed by every app as `@expense-tracker/{api,dates,money,i18n}`,
resolved to source `.ts` via `exports` (no build step; `moduleResolution: bundler`).
Each has its own `tsconfig.json` + `type-check` and must type-check cleanly alone.
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
  Apps never import `date-fns` directly, only this facade; web's richer
  `@internationalized/date` adapter stays app-local for now.
- **`i18n`** (leaf): EN/RU bundles + `MessageSchema`. `mapCategory(s)` take an
  injected `Translator` (vue-i18n `t` on web, react-i18next on mobile) - no app
  coupling.
- **`tokens`** (css-only): the home of the shared design-token palette - two
  platform copies in `src/` (`index.css` for web via `/css`, `mobile.css` for
  Uniwind via `/mobile`), same sRGB hex values kept in sync by hand. App CSS
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
