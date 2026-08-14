# Expense Tracker — Project Context

> Project context for OpenSpec artifact generation (referenced from
> `openspec/config.yaml`) and for humans onboarding to the repo.
> Per-area rules live in `AGENTS.md` at the repo root and in `backend/`,
> `apps/web/`, `apps/mobile/` — this file is the product/architecture map
> that ties them together. Update it when architecture or status changes.
>
> Last reviewed: 2026-08-14.

## Product

Personal finance tracker: users manage accounts (USD/EUR/RUB), per-user
categories, and income/expense/transfer transactions; the API computes
balances and net worth. One Go API serves two clients — a Vue 3 web app
(production-complete) and a React Native Expo app (UI shell only). The
OpenAPI contract at `docs/api/openapi.yaml` is the single source of truth
binding all sides.

## Repo layout

```
backend/        Go API (Gin + sqlc + Postgres 17, oapi-codegen strict server)
apps/web/       Vue 3 + Vite (Feature-Sliced Design), production-complete
apps/mobile/    React Native + Expo (FSD + Expo Router), UI shell only
packages/       shared TS: api (contract), money, i18n, tokens
docs/api/       OpenAPI contract (source of truth) + Redoc
docs/roadmap/   backend feature backlog with status markers
```

## Status per area (facts, as of 2026-08)

- **backend — complete.** Auth (register/login/logout/me), session
  management (list/revoke-all), email verification (OTP), password reset
  (magic-link token), accounts (+balances/netWorth), categories,
  transactions (cursor pagination, Idempotency-Key, optimistic locking).
  Three test tiers: service unit (fakes), repository (testcontainers
  Postgres), transport + e2e. CI: Redocly lint, oasdiff breaking-change
  gate, `make gen-check` drift gate, golangci-lint + `go test -race`,
  docker build.
- **web — complete.** All pages (dashboard, transactions with URL-synced
  filters, accounts, settings, login/register/verify-email/reset-password).
  HTTP repositories over `@expense-tracker/api` + dev-only localStorage
  variant (`VITE_REPO_VARIANT=localStorage`). i18n EN/RU. ~500 unit tests
  (Vitest) + Playwright e2e. Coverage thresholds are disabled
  (acknowledged debt).
- **mobile — UI/navigation shell only.** Expo Router groups `(auth)`/`(tabs)`,
  custom headless-tab bottom bar, SpeedDial, 14-component UI kit, jest +
  Maestro e2e. 6 of 8 screens are placeholders; dashboard runs on mock
  data; login is a `setTimeout` simulation. No data, auth, i18n, or money
  integration. Consumes only `@expense-tracker/tokens`.
- **packages — stable but thin.** `api` (contract layer, generated
  `schema.ts`, error mapping, `Repository<T,C,U>` seam), `money`
  (dinero.js integer math, Intl-free formatter), `i18n` (EN/RU +
  seed-category localization), `tokens` (CSS oklch + RN hex). No tests
  inside packages (covered via web tests); `tokens` has no tsconfig and is
  never type-checked.
- **CI covers Go only.** No JS/TS jobs: no type-check, no web/mobile
  tests, no `pnpm gen:api` drift gate.

## Domain model

Defined once in `backend/internal/repository/postgres/migrations/000001_init.up.sql`,
mirrored by `internal/domain/*.go`, sqlc models, and OpenAPI schemas:

- **User** — UUID v4, unique email, bcrypt hash, `email_verified_at`.
- **Session** — cookie `session_id`; raw 256-bit hex value IS the primary
  key (unhashed); sliding expiry (extends when < 25% of 24h TTL remains);
  password reset revokes all sessions.
- **Account** — `opening_balance` + `manual_adjustment` (int64 minor
  units), currency limited to USD/EUR/RUB (DB CHECK); `balance` is
  server-computed = opening + adjustment + Σ transaction deltas
  (SQL view `account_contributions`).
- **Category** — per-user, `UNIQUE(user_id, name)`, type income|expense,
  icon + color; 24 categories seeded on registration (Go `domain/seeds.go`
  ↔ TS `DEFAULT_CATEGORIES` — manually kept in sync).
- **Transaction** — type income|expense|transfer (immutable on update);
  cashflow carries `accountId`+`categoryId`, transfer carries
  `fromAccountId`+`toAccountId`; int64 `amount`; `version` for optimistic
  locking (409 `TRANSACTION_VERSION_CONFLICT`); keyset pagination
  (`occurredAt DESC, id DESC`); `Idempotency-Key` header on create.
- **IdempotencyKey** — per-user+key, replays captured response, 24h TTL.
- **EmailVerificationCode** — 6-digit OTP, 10 min TTL, 5 attempts,
  60s resend throttle.
- **PasswordResetToken** — SHA-256 hashed, single-use, revokes sessions.

No soft deletes anywhere; deleting an account/category referenced by
transactions fails with 409 `ACCOUNT_IN_USE`/`CATEGORY_IN_USE`.

## Architecture & dependencies

```
docs/api/openapi.yaml ── source of truth, change FIRST
   ├─→ backend        make gen (oapi-codegen → api.gen.go); CI drift gate
   └─→ packages/api   pnpm gen:api (openapi-typescript → schema.ts); NO CI gate

packages:  money (leaf) ← api ←─ web (uses all 4 packages)
           i18n  (leaf) ←────────┘
           tokens (leaf) ←──────── web + mobile (tokens only)

web   ── /api proxy, cookie session_id ──→ backend
mobile ── no integration yet ──→ backend
```

- **backend**: strict `transport → service → repository` layering with
  compile-time interface checks; request validation driven by the OpenAPI
  spec itself (kin-openapi middleware); all domain sentinel errors mapped
  to `ErrorResponse{code,message}` in one place (`errormap.go`); in-memory
  per-IP failure rate limiter on login and verify-email; mailer is a
  logging stub.
- **web**: FSD (app/pages/features/entities/shared, fractal pages),
  repositories injected via provide/inject, Pinia Colada query cache,
  401 → global unauthorized handler → redirect to login.
- **mobile**: FSD skeleton (entities/ and features/ empty); routes are
  thin re-exports of page screens.
- **Auth is deliberately NOT behind the Repository seam** — web calls
  `apiClient.POST('/api/auth/…')` directly in `entities/session`.

## Hard invariants (enforced in code today)

1. **OpenAPI first.** Change `docs/api/openapi.yaml`, then regenerate
   (`make gen` in backend, `pnpm gen:api` in packages/api or apps/web).
   Never hand-edit generated files (`api.gen.go`, `internal/repository/db`,
   `schema.ts`).
2. **Money is int64 minor units** (divisor 100), end-to-end. Never
   float/decimal in storage or arithmetic.
3. **Timestamps UTC** (TIMESTAMPTZ / ISO 8601); **IDs UUID v4**.
4. **Auth is a stateful session cookie** (`session_id`, HttpOnly,
   SameSite=Lax). No JWT.
5. **Errors are `{code, message}`**; 26 machine codes (e.g.
   `ACCOUNT_IN_USE` vs `TRANSACTION_VERSION_CONFLICT` vs
   `USER_ALREADY_EXISTS`); frontends map by `code`, never by HTTP status.
6. **Shared packages stay platform-agnostic** — only fetch-family APIs;
   no DOM/Vue/RN imports in `packages/*`.

## Facts vs assumptions

### Established in code (treat as decided)

Everything in "Status per area" and "Hard invariants" above, plus:
Postgres 17 (no SQLite — README's SQLite claims are stale), Gin, sqlc,
oapi-codegen strict server, session-cookie auth with sliding expiry,
bcrypt, anti-enumeration on login/password-reset, cursor pagination,
optimistic locking on transactions only, idempotent POST /transactions,
dev localStorage repositories on web, EN/RU i18n on web.

### Assumptions / not yet decided (do NOT treat as resolved)

- **Mobile auth is undesigned.** How RN fetch stores cookies, and the fact
  that SameSite=Lax + CORS allowlist (the backend's CSRF story) don't
  apply to a native client — needs a spec change before mobile touches
  the API.
- **Mobile is expected to adopt `@expense-tracker/{api,money,i18n}`**
  (claimed in AGENTS.md) — none are wired up yet.
- **"Tokens are the single source of truth"** — aspirational; values are
  duplicated (see debt below).
- **SHA-256 session-token hashing** (claimed in backend/AGENTS.md) — only
  password-reset tokens are hashed; sessions are stored raw.
- **Email delivery** — mailer is a logging stub; no provider chosen.
- **Rate limiting on register** — explicitly TODO in the spec.
- **OAuth (Google/Apple/VK)** — planned (`docs/PLAN.md`); mobile login
  shows social buttons with no handlers.
- **Roadmap tail** — observability, deployment/ops, background jobs,
  performance, architecture experiments are `READY`/`PARTIAL`/`THINKING`
  in `docs/roadmap/`, not built.

## Known debt & gotchas

- **CI gap**: no JS/TS pipeline at all (type-check, tests, `gen:api`
  drift) — the TS side of "OpenAPI first" is unenforced.
- **Token duplication**: colors hand-maintained in
  `packages/tokens/src/tokens/colors.ts` (oklch), `colors.rn.ts` (hex),
  `packages/tokens/src/index.css`, `apps/mobile/global.css`, and
  `apps/web/src/style.css` (which also *overrides* the package and adds
  web-only `--chart-*`/`--sidebar-*`). Adding a color = 4-5 manual edits.
- **Seed categories synced by hand**: Go seeds ↔ TS `DEFAULT_CATEGORIES`
  ↔ `SEED_KEY_BY_SLUG` ↔ locale JSON keys. `slug` exists only on the TS
  side (backend never returns it).
- **Mobile money math is float** (`amount / 100`, `.toFixed(2)`) with
  hardcoded `$`/`en-US` — violates invariant 2 until `@expense-tracker/money`
  is adopted.
- **Stale docs**: root README (SQLite era, "mobile planned"),
  `docs/PLAN.md` (lists the OpenAPI spec as a TODO though it's done),
  `backend/.sqlfluff` (`dialect = sqlite`), `apps/web/.i18nrc.json`
  (points at a nonexistent path).
- **packages/tokens** has no tsconfig/type-check; api/money/i18n have no
  READMEs.
- **Backend**: `ErrIdempotencyKeyNotFound` → HTTP 404 with machine code
  `INTERNAL_ERROR` (inconsistent pair); `internal/util` is dead code.
- **Web**: `pages/accounts` edit-account feature has no public API barrel
  (FSD violation); `TransactionsItemsList.vue` binds one shared
  `editOpen`/`deleteOpen` ref across all rows (opening one dialog opens
  all); no catch-all 404 route; Sentry TODO in `log-error.ts`.

## Key commands

```bash
# Contract (source of truth)
npx @redocly/cli lint --config docs/api/redocly.yaml docs/api/openapi.yaml

# Backend (cd backend)
make gen          # oapi-codegen + sqlc regenerate
make gen-check    # regenerate + git diff --exit-code (drift gate)
make test         # go test -race ./...

# TS types (cd packages/api or apps/web)
pnpm gen:api      # openapi-typescript → packages/api/src/schema.ts

# Web (cd apps/web): pnpm dev / pnpm build / pnpm test / pnpm test:e2e
# Mobile (cd apps/mobile): pnpm start / pnpm test / pnpm test:e2e (Maestro)
```

## Related docs

- `AGENTS.md` (root) — cross-cutting invariants and package rules
- `backend/AGENTS.md`, `apps/web/AGENTS.md`, `apps/mobile/AGENTS.md` —
  per-area rules (authoritative for their area)
- `docs/API.md` — API policy companion (rate limits, idempotency TTL,
  404-vs-422 nuances) that intentionally does not restate the spec
- `docs/roadmap/` — backend feature backlog with status markers
