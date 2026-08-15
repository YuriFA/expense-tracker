# Web (`apps/web/`) - agent memory

Vue 3 + Vite web frontend. The OpenAPI contract and project-wide invariants live
in the root `AGENTS.md`.

## Feature-Sliced Design

FSD layers with the Fractal FSD `pages/*/features/` extension; authoritative
layout in `apps/web/docs/ARCHITECTURE.md`. Steiger must stay green.

## Spec-first (contract from `docs/api/openapi.yaml`)

- Never hand-write fetch/types. `pnpm gen:api` regenerates
  `packages/api/src/schema.ts` via `@expense-tracker/api`; re-run + commit after
  spec changes. The contract, client factory, error mapping, repository
  interfaces, and HTTP impls all live in the package; web only adds Vite base-URL
  resolution (`shared/api/client.ts`). Old import paths (`@/shared/api`,
  `@/shared/lib/data`, entity `model/*`) stay stable via thin re-export barrels.
- Error mapping is code-driven: every non-2xx -> `RepositoryError` (in
  `@expense-tracker/api`) keyed on `ErrorResponse.code`, not HTTP status.

## Domain conventions

- **Transactions:** PATCH update with required `version` (optimistic concurrency);
  create sends an `Idempotency-Key`; list is cursor-paginated
  (`{transactions,nextCursor}`).
- **Auth:** stateful session cookie (no JWT). `entities/session` holds the typed
  auth API + Pinia store; the router guard bootstraps the session once and guards
  protected routes; `main.ts` wires a 401 interceptor (`setUnauthorizedHandler`).
- **Repos:** HTTP client with auth is the dev/prod default. `localStorage` repos
  are a dev-only opt-in (`VITE_REPO_VARIANT=localStorage`). The Vite dev/preview
  server proxies `/api` -> `localhost:8080` (same-origin cookie, no CORS).

## Quality bar

`vue-tsc --noEmit` (script `type-check`), `oxlint`, `eslint`, `steiger`,
and the i18n strict lint all green. `knip` runs repo-wide from the workspace
root (`pnpm knip`, config in the root `knip.json`). E2E (`apps/web/e2e`,
Playwright `test:e2e`) drives the real backend.
