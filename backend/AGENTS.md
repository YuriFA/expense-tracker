# Backend (`backend/`) - agent memory

Spec-first, layered Go API. The OpenAPI contract at `docs/api/openapi.yaml` is
the source of truth and the project-wide invariants (money/UTC/UUID/session-auth/
error model) live in the root `AGENTS.md`. Code is the source of truth.

## Layering (strict: transport -> service -> repository)

- `internal/transport/http` - gin handlers (the generated `StrictServerInterface`
  impl). Knows HTTP/gin/httperr/httpctx/cookie. No SQL, no business rules.
- `internal/service` - business rules + authorization (userID scoping). No HTTP, no SQL.
- `internal/repository` - SQL/Postgres only. No business rules.
- The authenticated `userID` is passed **explicitly** handler -> service; never
  read from a request body. Handlers get it from auth middleware via the request context.

## Data (PostgreSQL only, no SQLite)

- Driver `pgx/v5` (pgxpool); queries via `sqlc`.
- Migrations via `golang-migrate`, one numbered up/down pair per change, embedded
  in the binary (`//go:embed`). **Never edit a merged migration** - add a new one.
  `make migrate-up` / `make migrate-create name=...`.
- **Multi-user scoping is mandatory:** every resource query includes `user_id`;
  cross-user access returns "not found" (IDOR-safe). FK refs inside a transaction
  use distinct errors (`ErrTransactionAccountNotFound` ...) so the transport
  error mapper stays 1:1 (422 in a transaction vs 404 by id).
- Type/currency use `CHECK` constraints, not Postgres ENUM.
- Money/IDs/timestamps follow the project-wide invariants (root `AGENTS.md`).

## Codegen

`make gen` regenerates `internal/api/api.gen.go` (oapi-codegen) and
`internal/repository/db/` (sqlc from `internal/repository/queries/*.sql` +
migrations). `make gen-check` is the CI drift gate. Both generated trees are committed.

## Auth (stateful sessions, no JWT)

- Reuse `internal/auth` primitives (bcrypt, `crypto/rand` session tokens,
  SHA-256 hashing for password-reset tokens, modulo-bias-free OTP). Never
  roll your own crypto.
- Fresh session id per login (session-fixation defense); sliding expiration;
  password reset revokes all sessions. The mailer is a stub interface
  (`service.Mailer`) - real email delivery is out of scope.
- `session.secure` has NO env-default on purpose (config.go): cleanenv applies
  env-defaults to zero-value fields, which silently flips an explicit
  `secure: false` (plain-HTTP local dev; RN/iOS won't send Secure cookies
  over http) back to true. Every yaml sets it explicitly.

## Cross-cutting

- Uniform errors via `internal/transport/http/httperr` (machine `code` + human
  `message`); map domain errors to HTTP in ONE place
  (`internal/transport/http/errormap.go`).
- Logging: `log/slog`; use `logger.Error(err)` for error attrs. Request-scoped
  logging goes through the `X-Request-ID` header (`middleware.RequestID`).
- Wrap errors: `fmt.Errorf("%s: %w", op, err)` with an operation tag.

## Testing

- **Service tests:** in-memory fakes (`internal/service/fakes`) - fast, no DB;
  business rules are tested here.
- **Repository tests:** `testcontainers-go` against real `postgres:17` (skipped
  under `-test.short`); SQL correctness lives here.
- **Transport tests:** `httptest` + fakes. **E2E** (`internal/e2e`): full stack
  against a Postgres container.
- `testify`, table-driven, `t.Helper()` in helpers. Run `go test -race ./...`
  (Docker needed for repo/e2e packages, or `-short` to skip them).

## Lint / build

- Lint: `golangci-lint run` (config `backend/.golangci.yml`, strict golden config).
- Build: `go build ./...` from `backend/`. Docker image is CGO-free
  (`CGO_ENABLED=0`); `docker compose up` brings up `db` (postgres:17) + `app`.
