# Backend (`backend/`) - agent memory

Spec-first, layered Go API. Project-wide invariants (money/UTC/UUID/session
auth/error model) live in the root `AGENTS.md`; the evidence-backed list is
`docs/architecture/invariants.md` (backend entries: #5-#8, #17-#18). Observed
architecture with file-level evidence: `docs/architecture/overview.md` §Backend.
Auth/CSRF posture: `docs/adr/0001-auth-csrf-threat-model.md`. Code is the
source of truth.

## Layering (transport -> service -> repository; middleware exception)

- `internal/transport/http` - gin handlers (the generated `StrictServerInterface`
  impl). Knows HTTP/gin/httperr/httpctx/cookie. No SQL, no business rules.
- `internal/service` - business rules + authorization (userID scoping). No HTTP, no SQL.
- `internal/repository` - SQL/Postgres only. The repository MUST NOT decide
  business policy; it MAY implement the persistence/integrity mechanics
  required to execute a business operation atomically and classify
  persistence-level outcomes (e.g. `UPDATE ... WHERE version = X`; mapping 0
  affected rows to NotFound vs VersionConflict). Placement heuristic: if a rule
  can be expressed and tested without a database, it should not live in the
  repository. Known deviations (registered, migration deferred - new code
  follows the rule): `RegisterUser` category seeding and `VerifyEmailCode`
  attempt accounting are business policy inside repository transactions
  (invariant #18).
- Middleware exception: middleware implementing a cross-cutting infrastructure
  concern that needs no service business logic may depend directly on
  repository interfaces. Allowed (explicit): `SessionRepository` +
  `UserRepository` + `HouseholdRepository` (auth middleware: session -> user ->
  single v1 membership), `IdempotencyRepository` (idempotency middleware). Any
  NEW middleware -> repository dependency requires a separate architectural
  decision (invariant #17).
- The authenticated `householdID` (scoping) and `userID` (authorship) are
  passed **explicitly** handler -> service, from the auth middleware via the
  request context; never read from a request body.

## Data (PostgreSQL only, no SQLite)

- Driver `pgx/v5` (pgxpool); queries via `sqlc`.
- Migrations via `golang-migrate`, one numbered up/down pair per change, embedded
  in the binary (`//go:embed`). **Never edit a merged migration** - add a new one.
  `make migrate-up` / `make migrate-create name=...`.
- **Household scoping is mandatory (ADR-0002):** every shared-resource query
  includes `household_id`; access from outside the household returns
  "not found" (IDOR-safe). Household-scoped resources: accounts, categories,
  transactions, debtors, debt operations, planned payments, sync change_log /
  applied operations. `user_id` columns on entity rows are authorship stamps
  (the acting member, set server-side, never scoped by). Sanctioned exceptions
  (no household_id filter):
  (a) `users` lookups keyed by unique identity - email for login (pre-auth),
  id for the auth middleware (the PK is the identity; see the `queries/users.sql`
  header); (b) capability-keyed auth rows where possessing the secret IS the
  authorization: `sessions` by token id (expiry-checked),
  `password_reset_tokens` by token hash (single-use; `ResetPassword` derives
  user_id from the consumed token and scopes the rest of the tx); (c) time-based
  cleanup of expired rows (expired sessions, expired idempotency keys); (d)
  per-requester rows that predate the household model and stay user-scoped:
  `idempotency_keys` (a replayed cached response is per-requester by
  definition).
  FK refs inside a transaction use distinct errors
  (`ErrTransactionAccountNotFound` ...) so the transport error mapper stays 1:1
  (422 in a transaction vs 404 by id).
- Deletes are tombstones (`deleted_at`); only the retention job hard-deletes,
  and `change_log` is never pruned (invariant #8).
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
- CSRF: the server-side Origin check on state-changing browser requests is
  decided (ADR-0001) but NOT yet implemented - do not treat the current
  SameSite/JSON/CORS layers as the final posture.

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
  Includes depguard architecture rules: layering + sqlc confinement; the
  middleware allowlist exception (see Layering above) lives in
  `issues.exclusions` - do not add files there without a decision.
- Build: `go build ./...` from `backend/`. Docker image is CGO-free
  (`CGO_ENABLED=0`); `docker compose up` brings up `db` (postgres:17) + `app`.
