# Architecture Invariants — evidence-backed

Baseline captured 2026-08-20 (branch `chore/expo-sdk-57`, HEAD `c0b18bf`).
Every invariant below is supported by evidence in code, tests, OpenSpec, or
existing documentation, cited per entry. Anything that could not be
established from those sources is marked **UNKNOWN** and excluded from this
list (see the last section) — nothing here is aspirational.

"Automated" means **enforced by CI** (`.github/workflows/ci.yml`: redocly
lint, PR-only `oasdiff breaking`, `make gen-check`, `ts-gen-check`,
golangci-lint (incl. depguard architecture rules) + `go test -race`,
`arch-check` (dependency-cruiser; run locally via `pnpm arch:check`),
Docker build). Checks that exist only as local scripts (type-check,
vitest/jest, knip, Steiger) are **not** automated enforcement.

---

### 1. The OpenAPI spec is the single HTTP contract source; server and TS types are generated from it

- **Statement**: `docs/api/openapi.yaml` is changed first; Go server
  interfaces/types and the TS schema are generated artifacts, never
  hand-edited.
- **Evidence**: `backend/internal/api/oapi-codegen.yaml` (strict-server,
  embedded spec) → `api.gen.go`, which `transport/http.Server` implements
  (`backend/internal/transport/http/handler.go`); `packages/api/scripts/gen-api.mjs`
  → `src/schema.ts` (committed, header "auto-generated"); embedded spec also
  powers runtime request validation (`server.go:53-65`); `backend/Makefile`
  `gen`/`gen-check` (drift gate via `git diff --exit-code`); root `AGENTS.md`
  states the rule; `openspec/specs/sync-protocol` specs are consistent with it.
- **Risk if violated**: contract drift between backend and frontends —
  silent breakage of one client; hand-maintained duplicate types rot.
- **Current enforcement**: Go side — `make gen-check` job in CI + redocly
  lint + `oasdiff breaking` on PRs. TS side — `ts-gen-check` CI job
  (added 2026-08-20): `pnpm --filter @expense-tracker/api gen:api` then
  `git diff --exit-code packages/api/src/schema.ts` — regeneration must
  leave the tree clean, mirroring `make gen-check`.
- **Automated**: yes (both sides).

### 2. Money is int64 minor units (divisor 100) at every persisted/transported boundary

- **Statement**: Money is **integer minor units (divisor 100)** at every
  persistence, transport, sync, and calculation boundary — stored,
  transmitted, and computed as integers, never float/decimal. Form/UI
  state MAY use a platform-appropriate representation (float major units
  on web, digit strings on mobile) provided conversion happens exactly
  once at the mapper seam through a round-based conversion
  (`toMinorUnits` / `parseMajorUnitsToMinor`, both `Math.round`-based) and
  is safe: no loss of integer precision, no chained float arithmetic
  before the single rounding step. Display and arithmetic on money are
  integer-only. (Boundary refined by decision 2026-08-20; the unguarded
  `Number()` casts in mobile conflict-center remain a violation — tracked
  as separate finding B4.)
- **Evidence**: spec `type: integer, format: int64` with "divisor 100" on
  every amount (`docs/api/openapi.yaml`); SQL `BIGINT`
  (`migrations/000001_init.up.sql:50-51,89`); `domain.Transaction.Amount
  int64`; `packages/money` dinero integer math with
  `toMinorUnits = Math.round(x*100)` (`convert.ts`); mobile keeps amounts
  as strings with `parseMajorUnitsToMinor` as the single conversion point
  (`apps/mobile/src/shared/lib/money/parse.ts`, per `apps/mobile/AGENTS.md`).
  Web form state holds float major units transiently — permitted by the
  refined boundary — converted exactly once at the mapper seam
  (`toMinorUnits(data.amount)`): `CashflowForm.vue:53`,
  `TransferForm.vue:64`, `CashflowEditForm.vue:64`,
  `TransferEditForm.vue:81`, `EditAccountForm.vue:48` (loads via
  `toMajorUnits`). The former B4 violation (unguarded `Number()` casts in
  the mobile conflict center) was fixed 2026-08-20 — serialized money now
  parses through a `Number.isSafeInteger`-guarded helper.
- **Risk if violated**: cent-level rounding errors, balance corruption,
  client/server disagreement on amounts.
- **Current enforcement**: type systems partially (Go `int64`, TS `number`
  is float-typed so TS gives no protection); backend integration tests
  assert balances; no check bans float money paths.
- **Automated**: no (only incidental type coverage; the TS side has none).

### 3. Auth is a stateful, DB-backed session cookie (`session_id`); there is no JWT

- **Statement**: Authentication is a server-side session referenced by an
  HttpOnly cookie; tokens are opaque 256-bit random values; no JWTs exist
  anywhere in the stack. Decided posture (2026-08-20,
  `docs/adr/0001-auth-csrf-threat-model.md`): the same cookie session
  serves both web and mobile; the primary CSRF control is a server-side
  Origin check on state-changing browser requests (Origin present → must
  match the allowlist; absent → native/non-browser passes), with
  SameSite=Lax + JSON-only + CORS allowlist as defense-in-depth; native
  clients carry no extra CSRF protection. Transport: production HTTPS-only
  with `Secure` cookies; dev allows plain HTTP on localhost.
- **Evidence**: `sessions` table (`migrations/000001_init.up.sql:33-39`);
  token generation `backend/internal/auth/session_token.go` (crypto/rand,
  256-bit); cookie builder (`transport/http/cookie/cookie.go`, HttpOnly);
  auth middleware (`middleware/auth.go`); spec security scheme
  `sessionCookie: apiKey in cookie` with explicit "stateful, not JWT"
  description; root `AGENTS.md` forbids JWT; TS client defaults
  `credentials: 'include'` (`packages/api/src/api-client.ts:31`); no JWT
  library or token in Go deps or spec.
- **Risk if violated**: Stateless tokens would break the documented
  revoke-on-reset, sliding-expiry, and session-listing semantics that
  tests and both frontends rely on.
- **Current enforcement**: none beyond code structure; e2e tests cover
  login/logout/session behavior but don't (and can't) assert absence of JWT.
  The Origin-check middleware is decided (ADR-0001) but **not yet
  implemented** — until then the CSRF layer rests on SameSite/JSON/CORS
  only.
- **Automated**: no.

### 4. Every non-2xx response carries a machine `code` + human `message`; backend maps domain errors in one place; frontends map by `code`, not by HTTP status

- **Statement**: Domain errors are sentinel errors mapped to
  `ErrorResponse{code,message}` exclusively in `writeDomainError`; the TS
  client classifies errors primarily by the body `code` (e.g. 409
  `ACCOUNT_IN_USE` vs `TRANSACTION_VERSION_CONFLICT` are different classes).
- **Evidence**: `backend/internal/transport/http/errormap.go:29-53`
  (single `HandlerErrorFunc`, sentinel table 64-196); codes defined once in
  `httperr/httperr.go:12-43` and mirrored in spec examples;
  `packages/api/src/api-errors.ts` `mapApiError` keyed on `body.code` with
  status fallbacks; root `AGENTS.md` states the rule. Nuance: middleware
  writes some responses directly (auth/validation/idempotency/rate-limit)
  but shares the same shape via `httperr.Write`.
- **Risk if violated**: Frontends would branch on statuses and lose the
  ability to distinguish conflicts; error UX and conflict handling
  (sync, version conflicts) degrade or break.
- **Current enforcement**: code review; transport/service tests exercise
  some mappings; the spec examples document codes.
- **Automated**: no.

### 5. Per-user ownership: every resource query is scoped by `user_id`, and the userID originates only from the auth context

- **Statement**: No account/category/transaction/idempotency/sync query
  reads or writes without a `user_id` filter; handlers never trust a
  client-supplied user identity.
- **Evidence**: `backend/internal/repository/queries/{accounts,categories,
  transactions,idempotency,sync,retention}.sql` all filter `user_id`;
  handlers source the user via `currentUser(ctx)` from the auth middleware
  (`transport/http/handler.go:62-64`); userID-from-context rule is stated in
  `backend/AGENTS.md`; IDOR integration tests assert cross-user access
  returns not-found (`postgres/accounts_test.go:72`,
  `transactions_test.go:149`, `sync_test.go:16`).
- **Risk if violated**: Cross-account data leaks (IDOR) — the most severe
  failure mode of this system.
- **Current enforcement**: integration tests run in CI (`go test -race`).
- **Automated**: yes (backend; a new unscoped query would only be caught if
  a test happens to cover it — the rule itself is not mechanically checked).

### 6. Optimistic concurrency: updates CAS on a `version` column; conflicts surface as 409 `*_VERSION_CONFLICT`

- **Statement**: `version` is an optimistic-concurrency token for mutable
  user-owned entities — exactly transactions, accounts, categories (users,
  sessions, auth tokens, idempotency keys, change_log carry no version; it
  is not a universal entity version). Updates CAS via
  `UPDATE ... WHERE version = @version`; zero-row outcomes are classified
  as NotFound (tombstoned) vs VersionConflict; clients (including mobile's
  local repository and the sync protocol) treat version as mandatory on
  update. Conflicts surface as REST 409 `*_VERSION_CONFLICT` on
  single-entity endpoints, while sync push reports them per-item inside
  HTTP 200 (`SYNC_VERSION_CONFLICT`) — separate batch-protocol semantics
  by design (clarified 2026-08-20).
- **Evidence**: `migrations/000001:94` + `000002:14-20`;
  `queries/transactions.sql:24-39`, `accounts.sql:23-41`, `categories.sql:18-29`;
  classification `postgres/transactions.go:146-152`, `accounts.go:130-136`;
  status mapping `errormap.go:96-110`; spec requires `version` on all three
  PATCH bodies; TS `VERSION_CONFLICT_CODES` → `VersionConflictError`
  (`api-errors.ts`); mobile mirrors CAS locally
  (`entities/transaction/api/local-repository.ts:318`).
- **Risk if violated**: Lost updates — the sync protocol's conflict
  semantics and multi-device editing depend on versions.
- **Current enforcement**: backend integration tests (optimistic
  concurrency suite) + mobile jest tests of local CAS — local only for the
  latter.
- **Automated**: backend yes (CI); mobile no.

### 7. Every mutation appends to `change_log` atomically with the entity write, under a per-user advisory lock

- **Statement**: Entity writes and their change-log append happen in one
  DB transaction guarded by `pg_advisory_xact_lock(hashtext(user_id))`, so
  `change_log.seq` per user equals commit order — the ordering the sync
  pull protocol relies on. A `change_log` entry is **mandatory** for every
  mutation of a synced entity — REST create/update/remove, sync push
  create/replace/tombstone, and registration seeding: a mutation must
  never commit without its log row (clarified 2026-08-20; verified at
  every write site).
- **Evidence**: `postgres/tx.go:16-36` (`withinLockedTx`) + `tx.go:40-55`
  (`appendChangeLog` on the same tx); every sync write appends on the same
  tx — section contract at `sync.go:220` ("writes (each appends change_log
  on the same tx)") and per-method calls through `sync.go:534`; seeding
  logs each row (`users.go:47-70`); rationale documented in
  `migrations/000002_sync.up.sql:6-11`; sync push/pull tests in
  `internal/e2e/sync_test.go` and `openspec/specs/sync-protocol` describe
  the seq-based pull.
- **Risk if violated**: Gaps/reordered `change_log.seq` would make sync
  pull miss or misorder changes; offline clients silently diverge.
- **Current enforcement**: all REST mutations and sync push go through
  `withinLockedTx` (structure); e2e sync tests cover the happy paths.
- **Automated**: yes (backend tests in CI); but nothing forces a *new*
  mutation to use the helper — that part is convention.

### 8. Deletes are tombstones (`deleted_at`), never hard deletes outside the retention job

- **Statement**: Remove = set `deleted_at`; all read paths filter tombstones;
  a tombstone MUST be preserved for the full retention window (default 90
  days, `RETENTION_TOMBSTONE_WINDOW`) — only the retention job may
  hard-delete it, and the `change_log` is never pruned: pulls serve
  tombstones from the log alone, so a device offline through the whole
  window still converges (clarified 2026-08-20). The sync protocol
  resolves delete-vs-edit as delete-wins.
- **Evidence**: `queries/retention.sql` holds the only
  `DELETE FROM transactions|categories|accounts` in the query layer, gated
  by `deleted_at IS NOT NULL AND deleted_at < $1`; sole caller is
  `jobs/retention/retention.go` (FK-safe order, package doc at :1-8
  explains the never-pruned log and the bounded correctness loss for
  devices offline longer than the window); window default 90d
  (`internal/config/config.go:23`); delete-wins documented in
  `openspec/specs/sync-protocol` and implemented in mobile conflict
  handling.
- **Risk if violated**: Hard deletes break change-log/tombstone-based sync
  — other devices would never learn about the deletion.
- **Current enforcement**: repository tests cover tombstone behavior; sync
  tests cover delete propagation.
- **Automated**: yes (backend, via CI test run); convention for new queries.

### 9. Timestamps are UTC instants end-to-end

- **Statement**: DB columns are `TIMESTAMPTZ ... DEFAULT now()`; Go code
  produces `time.Now().UTC()`; the wire format is RFC3339/ISO.
- **Evidence**: every table in `migrations/000001/000002`;
  `middleware/auth.go:64`, `service/auth.go:55`; `packages/api/src/lib/datetime.ts`;
  `packages/dates` `nowIso`. Note: root `AGENTS.md` additionally claims
  "`time.Local = time.UTC` in tests" — **no backend test sets `time.Local`**
  (tests use `time.Equal`/RFC3339 instead); the observable rule is
  UTC-instants, the stated mechanism is not implemented.
- **Risk if violated**: Timezone-shifted transactions; month boundaries
  (mobile queries by UTC day range via `monthToUtcDayRange`) would mis-bucket.
- **Current enforcement**: convention; DB column types reject naive
  timestamps.
- **Automated**: no.

### 10. IDs are UUID v4, server-generated by default, client-suppliable for offline-first creates

- **Statement**: PKs are UUIDs with `gen_random_uuid()` defaults; create
  paths accept client-supplied UUIDs (offline-first) but the format is
  validated.
- **Evidence**: `migrations/000001:16` (pgcrypto); `postgres/tx.go:58-63`
  (`newEntityID` honors client ids); spec schemas define `id` as
  `format: uuid`; embedded-spec validation rejects malformed ids.
- **Risk if violated**: Offline-created entities colliding or being
  rejected on sync push; broken idempotency of repeated pushes.
- **Current enforcement**: spec validation at the engine level.
- **Automated**: partially (format yes; the supply-on-create policy is
  convention).

### 11. The repository seam: app data access goes through `Repository` interfaces from `@expense-tracker/api`; the package never imports app code

- **Statement**: UI/stores depend on repository interfaces; concrete
  implementations (HTTP, web localStorage, mobile SQLite) are injected at
  the app root; `packages/api` contains no imports from `apps/*` and no
  app concerns; the only sanctioned direct `apiClient` uses are the session
  APIs (both apps) and mobile's sync transport.
- **Evidence**: `packages/api/src/repository.ts` (`Repository<T,C,U>`) and
  `repositories/*.ts` extensions; web DI `app/repositories.ts`
  (provide/inject, `VITE_REPO_VARIANT`); mobile DI via React context
  providers in `src/app/_layout.tsx`; grep confirms no `apps/` imports in
  packages; session-exception documented in `apps/web/AGENTS.md` and
  observable in both apps' `entities/session/api/`; sync transport seam in
  `apps/mobile/src/shared/lib/sync/` (engine depends on an injected
  transport, not the client).
- **Risk if violated**: Untestable data layers; app/server coupling;
  mobile's local-source-of-truth strategy becomes impossible.
- **Current enforcement**: structure + tests (repositories tested behind
  the interface in both apps); knip catches unused exports when run.
- **Automated**: no (knip and type-checks are local-only).

### 12. Shared packages are platform-agnostic: only the fetch-family of browser/RN APIs

- **Statement**: `packages/*/src` contains no DOM, Vue, React, or
  react-native API usage; only `fetch`/`Request`/`Response`/`Headers`.
- **Evidence**: grep across `packages/*/src` for `window.`, `document.`,
  `navigator.`, `react-native`, `localStorage` returns zero non-comment
  hits; `formatMoney` is hand-rolled specifically to avoid Intl/Hermes
  issues (`packages/money/src/format.ts`); root `AGENTS.md` states the rule.
- **Risk if violated**: A package import would crash on RN or browsers;
  apps can no longer share the code.
- **Current enforcement**: dependency-cruiser `pkg-no-platform-frameworks`
  rule (`pnpm arch:check`, CI `arch-check` job) bans RN/Vue/React imports
  in `packages/*/src`.
- **Automated**: yes (since 2026-08-20).

### 13. Package dependency direction: `api → money` is the only cross-package edge; money/dates/i18n/tokens remain leaves

- **Statement**: No workspace package imports another except
  `packages/api` → `packages/money` (for `CurrencyCode` narrowing); no
  cycles; leaves import nothing workspace-internal.
- **Evidence**: grep of `@expense-tracker/*` imports in `packages/*/src`:
  only `api/src/domain/account.ts:1` and `api/src/domain/transaction.ts:1`;
  `balance-calculator.ts` comments document deliberate genericity to avoid
  a domain cycle.
- **Risk if violated**: Cycles/import tangles make packages unbuildable
  alone and leak platform concerns across the seam.
- **Current enforcement**: dependency-cruiser `pkg-leaf-purity` and
  `api-only-money` rules (`pnpm arch:check`, CI `arch-check` job); each
  package also type-checks standalone.
- **Automated**: yes (since 2026-08-20).

### 14. Apps never import `date-fns` directly; all date logic goes through a facade

- **Statement**: `date-fns` appears only inside `packages/dates`; apps use
  either that package (mobile) or web's app-local `@internationalized/date`
  facade.
- **Evidence**: zero `from 'date-fns'` hits in `apps/web/src` and
  `apps/mobile`; mobile has 21 non-test `@expense-tracker/dates` imports;
  web's app-local adapter is sanctioned as **temporary** — decided
  end-state (2026-08-20): both apps on `@expense-tracker/dates`
  (root `AGENTS.md`).
- **Risk if violated**: Duplicated locale/week-start logic diverging
  between platforms; unsanctioned direct deps defeat the facade's purpose.
- **Current enforcement**: dependency-cruiser `no-date-fns` rules for both
  apps (`pnpm arch:check`, CI `arch-check` job); plus in-package
  confinement (`pkg-no-date-fns-outside-dates`).
- **Automated**: yes (since 2026-08-20).

### 15. FSD layer direction: imports point strictly downward (both apps)

- **Statement**: In both apps the FSD layer order is
  `app → pages → widgets → features → entities → shared` (web currently
  has no widgets slice; mobile's is canonical, decided 2026-08-20).
  `shared` MUST NOT import from entities, features, widgets, pages, or
  app; cross-layer upward imports are forbidden in general; dependencies
  point only downward. Cross-slice imports within a layer are forbidden.
  Barrel exports (`index.ts`) are required per slice. The rule is
  formulated to be mechanically enforceable — no exceptions.
- **Evidence**: web — enforced by `apps/web/steiger.config.ts`
  (`@feature-sliced/steiger-plugin`, fractal-FSD overrides) in `lint`;
  grep found no violations. Mobile — rule decided 2026-08-20 and recorded
  in `apps/mobile/AGENTS.md`; all A11 deviations fixed 2026-08-20 (sync
  provider composes in `src/app/_layout.tsx`, context in
  `shared/lib/sync/sync-context.tsx`; cashflow sheets delegate to
  page-level composition; entity barrels added) — the dependency-cruiser
  `fsd-*` rules run with zero exclusions.
- **Risk if violated**: entangled layers make slices non-reusable and the
  DI seams meaningless; an upward import from `shared` poisons the
  foundation layer for every consumer.
- **Current enforcement**: web — Steiger in local lint (not CI). Mobile —
  dependency-cruiser `fsd-*` rules (`pnpm arch:check`, CI `arch-check`
  job): layer direction, cross-slice, with the three registered A11
  deviations excluded until their decided fix lands
  (`.dependency-cruiser.mobile.cjs`).
- **Automated**: mobile yes (CI); web local lint only.

### 16. Client local data boundary: local repositories are the source of truth for offline-first clients

- **Statement**: For offline-first clients, the local
  database/repositories are the source of truth for application data.
  TanStack Query is a UI/server-state cache over local repositories, not
  the persistence layer. Backend access for application data occurs
  through the synchronization boundary; direct API access is limited to
  explicitly defined control-plane operations such as
  authentication/session management. Scope (clarified 2026-08-20):
  **mobile implements this boundary today; web is online-first today and
  not yet required to comply** — its future offline-first migration will
  implement this existing architectural decision, not introduce a new
  one. (No ADR: the decision is already carried by the existing specs and
  this invariant; a web offline-first migration may add an OpenSpec change
  if current web specs don't cover it.)
- **Evidence**: mobile — providers in `src/app/_layout.tsx` always mount
  local repositories; `shared/lib/query/query-client.ts` states "UI cache
  ... NOT the offline store"; row+outbox single-transaction writes in
  `entities/*/api/local-repository.ts`; engine + transport seam in
  `shared/lib/sync/sync-engine.ts` / `createApiTransport`; ownership gate
  `sync_meta.owner_user_id` in `use-auth.tsx:74-113`;
  `openspec/specs/mobile-local-data` and `sync-protocol` codify it. Web
  today: HTTP repositories + @pinia/colada SWR (online-first) — exempt
  until its migration.
- **Risk if violated**: direct API calls from offline-first client UI
  would bypass the outbox, creating changes that never sync;
  cache-as-store confusion reintroduces online-only behavior.
- **Current enforcement**: structure + jest suites over the engine and
  repositories (local); dependency-cruiser `api-client-seam` rule bans
  direct `shared/api` imports outside session/sync
  (`pnpm arch:check`, CI).
- **Automated**: partially — import seam yes (CI); behavior no.

### 17. Backend layering: handlers go through services; middleware is an explicitly allowlisted exception

- **Statement**: HTTP handlers call services only; services call
  repositories. Gin middleware implementing a cross-cutting infrastructure
  concern that needs no service business logic may depend directly on
  repository interfaces, limited to an explicit allowlist:
  `SessionRepository` + `UserRepository` (auth), `IdempotencyRepository`
  (idempotency). Any new middleware → repository dependency is a separate
  architectural decision.
- **Evidence**: decided 2026-08-20; rule recorded in `backend/AGENTS.md`
  (Layering section); implemented at `middleware/auth.go:23-28`,
  `middleware/idempotency.go:48`, wiring at `server.go:30-32`; all handlers
  dispatch through `service.*` (`transport/http/handler.go`).
- **Risk if violated**: business rules migrate into transport code that the
  testing pyramid covers only indirectly (the accepted sliding-expiry
  trade-off above); new cross-cutting code bypasses service-layer
  guarantees (ownership checks, advisory-lock atomicity).
- **Current enforcement**: depguard architecture rules in
  `backend/.golangci.yml` (CI `lint-test` job): transport cannot import
  repository outside the allowlisted middleware files, service/repository
  cannot import HTTP, sqlc confined to `repository/postgres`. Verified
  2026-08-20: strict run flags exactly the three allowlisted files.
- **Automated**: yes (since 2026-08-20).

### 18. Repository implements persistence mechanics, not business policy

- **Statement**: the repository MUST NOT decide business policy; it MAY
  implement the persistence/integrity mechanics required to execute a
  business operation atomically and classify persistence-level outcomes.
  Placement heuristic: if a rule can be expressed and tested without a
  database, it does not belong in the repository.
- **Evidence**: decided 2026-08-20; rule recorded in `backend/AGENTS.md`
  (Layering). Compliant today: CAS `WHERE version = X` and `classify*Write`
  outcome mapping (`postgres/transactions.go:143-152`,
  `postgres/accounts.go:130-136`). Registered deviations (migration
  deferred by decision; no UoW seam introduced): `RegisterUser` seeding
  (`postgres/users.go:47-70`), `VerifyEmailCode` attempt accounting
  (`postgres/email_verification.go:114-126`).
- **Risk if violated**: business/security policy (e.g. attempt caps)
  becomes testable only against a real database, escaping the service-test
  tier of the testing pyramid; policy changes require SQL changes.
- **Current enforcement**: manual review (the policy-vs-mechanics split is
  a placement rule, not mechanically decidable); the two deviations are
  covered by integration tests only. The sqlc-confinement half is
  depguard-enforced (see #17).
- **Automated**: no.

---

## UNKNOWN — rules or rationales that no source establishes

Per the baseline policy, these are neither invariants nor violations. All
four baseline UNKNOWNs were resolved by decisions on 2026-08-20:
middleware→repository edges → invariant #17; repository business rules →
invariant #18; CSRF/auth posture → ADR-0001; tokens drift → mobile palette
canonical (root `AGENTS.md`); locale defaults → RU product default
(implementation pending). No open UNKNOWNs remain.
