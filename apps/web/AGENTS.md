# Web (`apps/web/`) - agent memory

Vue 3 + Vite web frontend (online-first today; the offline-direction decision
is invariant #16 in `docs/architecture/invariants.md`). Project-wide invariants
and the canonical documentation map live in the root `AGENTS.md`.

## Feature-Sliced Design

FSD layers with the Fractal FSD `pages/*/features/` extension; authoritative
layout, segment conventions, and placement decision trees:
`apps/web/docs/ARCHITECTURE.md`. Steiger (`pnpm exec steiger`, config
`steiger.config.ts`) must stay green.

## Spec-first (contract from `docs/api/openapi.yaml`)

- Never hand-write fetch/types. `pnpm gen:api` regenerates
  `packages/api/src/schema.ts`; re-run + commit after spec changes. The client
  factory, error mapping, repository interfaces, and HTTP implementations all
  live in `@expense-tracker/api`; web only adds Vite base-URL resolution
  (`shared/api/client.ts`). Old import paths (`@/shared/api`, `@/shared/lib/data`,
  entity `model/*`) stay stable via thin re-export barrels.
- Error mapping is code-driven: every non-2xx -> `RepositoryError` keyed on
  `ErrorResponse.code`, not HTTP status.

## Domain conventions

- **Transactions:** PATCH update with required `version` (optimistic concurrency);
  create sends an `Idempotency-Key`; list is cursor-paginated
  (`{transactions,nextCursor}`).
- **Auth:** `entities/session` holds the typed auth API + Pinia store; the
  router guard bootstraps the session once and guards protected routes;
  `main.ts` wires a 401 interceptor (`setUnauthorizedHandler`). Session APIs
  call the apiClient directly — the one sanctioned exception to the
  repository seam (invariant #11).
- **Repos:** HTTP client with auth is the dev/prod default. `localStorage` repos
  are a dev-only opt-in (`VITE_REPO_VARIANT=localStorage`). The Vite dev/preview
  server proxies `/api` -> `localhost:8080` (same-origin cookie, no CORS).

## Quality bar

`pnpm type-check`, `pnpm lint` (oxlint + eslint), `pnpm i18n:lint` (strict i18n),
and `pnpm test:unit` all green. `knip` runs repo-wide from the workspace root
(`pnpm knip`, config in the root `knip.json`). E2E (`apps/web/e2e`,
`pnpm test:e2e`) drives the real backend.
