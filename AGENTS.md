# Project agent memory

This backend (`backend/`) is a spec-first, layered Go API for an expense tracker,
wired to a Vue 3 frontend in `apps/web/`. The authoritative architecture is the
scout report at `/Users/yuri/web/firstmate/data/et-arch-plan/report.md` (context
only - the code is the source of truth).

## Posture

Crewmates implement to completion, not just guide. Make concrete decisions;
explain the why/tradeoff in the PR for the captain's learning. Prefer
production-grade defaults over minimal shortcuts, but avoid speculative
abstraction.

## Architecture (layered, spec-first)

- **OpenAPI is the source of truth.** The contract lives at
  `docs/api/openapi.yaml`. Change the spec FIRST, then `make gen`; never
  hand-maintain request/response structs that duplicate the spec. Lint with
  `npx @redocly/cli lint --config docs/api/redocly.yaml docs/api/openapi.yaml`.
- **Server code is generated** with `oapi-codegen` (Gin + strict-server +
  models, embedded spec). Run `make gen` after spec changes; CI runs
  `make gen-check` to reject un-regenerated/drifted code.
- **Layering is strict: transport -> service -> repository.**
  - `internal/transport/http`: gin handlers (the generated `StrictServerInterface`
    impl). Knows HTTP, gin, httperr/httpctx, cookie. No SQL, no business rules.
  - `internal/service`: business rules + authorization (userID scoping). No HTTP,
    no SQL.
  - `internal/repository`: SQL/Postgres only, no business rules.
- The authenticated `userID` is passed **explicitly** from handler to service;
  never read from a request body. Handlers get it from the auth middleware via
  the request context.

## Data

- **PostgreSQL only** (no SQLite). Driver `pgx/v5` (pgxpool); queries via `sqlc`.
- Migrations via `golang-migrate`, one sequence-numbered up/down pair per change,
  embedded in the binary (`//go:embed`). Never edit a merged migration; add a
  new one. `make migrate-up` / `make migrate-create name=...`.
- **Money is `int64` minor units** everywhere (divisor 100). Never float/decimal.
- **Timestamps are `TIMESTAMPTZ` / `time.Time`, UTC everywhere.** `time.Local =
  time.UTC` in tests.
- IDs are UUID v4 (`github.com/google/uuid`).
- **Multi-user scoping is mandatory:** every resource query includes `user_id`;
  cross-user access returns "not found" (IDOR-safe). FK references inside a
  transaction use distinct errors (`ErrTransactionAccountNotFound` ...) so the
  transport error mapper stays 1:1 (422 in a transaction vs 404 by id).
- Type/currency use `CHECK` constraints (not Postgres ENUM).

## Codegen

- `make gen` regenerates `internal/api/api.gen.go` (oapi-codegen) and
  `internal/repository/db/` (sqlc from `internal/repository/queries/*.sql` +
  `internal/repository/postgres/migrations`). `make gen-check` is the CI drift
  gate. Both generated trees are committed.

## Auth

- **Stateful sessions** (cookie `session_id`). Do NOT introduce JWT.
- Reuse `internal/auth` primitives (bcrypt, `crypto/rand` session tokens,
  SHA-256 token hashing, modulo-bias-free OTP). Never roll your own crypto.
- Fresh session id per login (session-fixation defense); sliding expiration;
  password reset revokes all sessions. The mailer is a stub interface
  (`service.Mailer`) - real email delivery is out of scope.

## Cross-cutting

- Uniform errors via `internal/transport/http/httperr` (machine `code` + human
  `message`); map domain errors to HTTP in ONE place
  (`internal/transport/http/errormap.go`).
- Logging: `log/slog`; use `logger.Error(err)` for error attrs. Request-scoped
  logging goes through the `X-Request-ID` header set by `middleware.RequestID`.
- `fmt.Errorf("%s: %w", op, err)` for wrapping with an operation tag.

## Testing

- **Service-layer tests** use in-memory fakes (`internal/service/fakes`) - fast,
  no DB. This is where business rules are tested.
- **Repository tests** use `testcontainers-go` against real `postgres:17`
  (skipped under `-test.short`). This is where SQL correctness lives.
- **Transport tests** use `httptest` + fakes; **e2e tests** (`internal/e2e`)
  drive the full stack against a Postgres container.
- Assertions with `testify`; table-driven tests; `t.Helper()` in helpers.
- Run: `go test -race ./...` (Docker needed for the repo/e2e packages, or
  `-short` to skip them).

## Lint / build

- Lint: `golangci-lint run` (config: `backend/.golangci.yml`, very strict golden
  config).
- Build: `go build ./...` from `backend/`.
- Docker image is CGO-free (`CGO_ENABLED=0`); `docker compose up` brings up
  `db` (postgres:17) + `app`.

## Frontend (apps/web)

- Feature-Sliced Design (see `apps/web/docs/ARCHITECTURE.md`, including the
  Fractal FSD `pages/*/features/` extension). Steiger must stay green.
- **Spec-first:** the API contract comes from `docs/api/openapi.yaml` via
  codegen, never hand-written fetch/types. `bun run gen:api` (openapi-typescript)
  regenerates `apps/web/src/shared/api/schema.ts` (committed); re-run + commit
  after any spec change. `openapi-fetch` typed client + error middleware live in
  `shared/api/{client,errors}.ts`.
- **Error mapping is code-driven:** every non-2xx response is mapped to a
  `RepositoryError` (see `shared/lib/data/repository.ts`) keyed on the backend's
  `ErrorResponse.code` (e.g. `ACCOUNT_IN_USE` vs `TRANSACTION_VERSION_CONFLICT`
  vs `USER_ALREADY_EXISTS`, all 409), not HTTP status alone.
- **Transactions:** updates are PATCH with required `version` (optimistic
  concurrency); create sends an `Idempotency-Key`; the list is cursor-paginated
  (`{transactions,nextCursor}`).
- **Auth:** stateful session cookie (no JWT). `entities/session` holds the
  typed auth API + Pinia store; the router guard bootstraps the session once and
  guards protected routes; `main.ts` wires a 401 interceptor
  (`setUnauthorizedHandler`).
- **Dev/prod default:** HTTP client with auth. `localStorage` repos are a
  dev-only opt-in (`VITE_REPO_VARIANT=localStorage`). The Vite dev/preview
  server proxies `/api` -> `localhost:8080` (same-origin cookie, no CORS).
- Quality bar: `vue-tsc --noEmit`, `oxlint`, `eslint`, `knip`, `steiger`, and
  the i18n strict lint all green. E2E (`apps/web/e2e`) drives the real backend.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
