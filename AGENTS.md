# Expense Tracker - agent memory

Bun-workspace monorepo for a spec-first expense tracker: a layered **Go API**
(`backend/`) wired to a **Vue 3** web app (`apps/web/`) and a **React Native
(Expo)** mobile app (`apps/mobile/`), sharing platform-agnostic TS packages
(`packages/*`). The OpenAPI contract is the single source of truth tying them
together.

Each area has its own rules in its own `AGENTS.md` (`backend/`, `apps/web/`,
`apps/mobile/`) - read the one for the area you touch. Code is the source of truth.

## Posture

Implement to completion, not just guide. Make concrete decisions and explain the
why/tradeoff (in the PR, for the captain's learning). Prefer production-grade
defaults over minimal shortcuts; avoid speculative abstraction.

## Cross-cutting invariants (all areas)

- **OpenAPI is the source of truth** at `docs/api/openapi.yaml`. Change the spec
  FIRST, then regenerate everywhere; never hand-maintain duplicate types/structs.
  Lint: `npx @redocly/cli lint --config docs/api/redocly.yaml docs/api/openapi.yaml`.
  - Backend server code: `make gen` (oapi-codegen); CI drift gate `make gen-check`.
  - TS types: `bun run gen:api` (in `packages/api` or `apps/web`) regenerates
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

Platform-agnostic TS consumed by every app as `@expense-tracker/{api,money,i18n}`,
resolved to source `.ts` via `exports` (no build step; `moduleResolution: bundler`).
Each has its own `tsconfig.json` + `type-check` and must type-check cleanly alone.

- **MUST stay free of DOM/Vue/browser-only APIs.** Only the fetch-family
  (`fetch`/`Request`/`Response`/`Headers`) is allowed (works in browser/Node/RN).
- **`@expense-tracker/api`** (deps: `money`): generated schema (`src/schema.ts`),
  `createApiClient({ baseUrl, fetch })` factory (apps supply base URL - no
  `window`), error mapping + `setUnauthorizedHandler`, `Repository<T,C,U>`
  interface + per-entity contracts (the DI seam), HTTP impls, domain models
  (account/category/transaction), and generic helpers (`generateId`, `normalize`,
  `isIsoDateTime`, `CalendarDay`).
- **`@expense-tracker/money`** (leaf): minor-units money (dinero.js),
  locale-aware `formatMoney`, currency list, unit conversion, balance calculator
  (generic over a minimal account shape - no domain dep).
- **`@expense-tracker/i18n`** (leaf): EN/RU bundles, `MessageSchema`, locale
  config, localized default-categories seed. `mapCategory(s)` take an injected
  `Translator` (vue-i18n `t` on web, react-i18next on mobile).

App-local concerns stay OUT of packages: web keeps its vue-i18n instance, Vite
base-URL resolution, localStorage repos, Vue DI/composables, and Zod schemas;
mobile keeps its native wiring.

## Repo layout

```
backend/        Go API (Gin + sqlc + Postgres)
apps/web/       Vue 3 + Vite (Feature-Sliced Design)
apps/mobile/    React Native + Expo (currently a fresh blank project)
packages/       shared TS: api, money, i18n
docs/api/       OpenAPI contract (source of truth)
```

## Maintaining these files

Keep each `AGENTS.md` for knowledge useful to almost every session in its area.
Do not repeat what the codebase already shows - point to the authoritative file
or command. Prefer rewriting/pruning over appending. Preserve this bar for all
agents and keep entries concise.
