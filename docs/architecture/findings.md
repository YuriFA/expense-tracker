# Architecture Findings — classification & revision status

**Revision 2 (2026-08-20, post-decision review).** Revision 1 was the
original baseline classification (FIX / DECIDE / DOCUMENT / ACCEPT /
REMOVE). This revision records the outcome of the interactive architecture
review: every DECIDE item was decided, ADR-0001 was written for the
auth/CSRF threat model, all DOCUMENT items were fixed, and automated
enforcement was added for layering/package/FSD rules (backend depguard in
CI + root `pnpm arch:check` in CI). Original finding IDs are preserved.

## Status summary

| Class (rev.2) | Count | Findings |
|---|---|---|
| FIX (pending) | 0 | none — all closed |
| FIX (pending, follow-up) | 0 | the A8 follow-up (tokens sync + guard) is closed — see resolved table |
| ACCEPT | 2 | A2 (registered deviations, migration deferred by decision), A14 (narrowed: `ts-gen-check` + `arch-check` carved out of the CI gap) |
| DOCUMENT (resolved) | 10 | A7, A10, A12, B5, C2, C3, C4, C5, C6, C7 — all fixed 2026-08-20 |
| REMOVE | 2 | A15, C1 |
| DECIDE | 0 | all resolved: A1, A8, B1, B2, D4 |

**ADR policy outcome:** exactly one ADR was warranted — **ADR-0001**
(`docs/adr/0001-auth-csrf-threat-model.md`, finding B1). The remaining
decisions are recorded canonically elsewhere *by explicit choice*: A1 →
`backend/AGENTS.md` + invariant #17; A2 → `backend/AGENTS.md` + invariant
#18; A8 → root `AGENTS.md` (mobile palette canonical); B2 →
`docs/assumptions.md` (single-replica); D4 → root `AGENTS.md` +
assumptions (RU default). Rationale: single-layer boundary rules and
deployment assumptions, not cross-cutting architecture changes.

## Resolved findings

| ID | Was | Now | Resolution (2026-08-20) |
|---|---|---|---|
| A1 | DECIDE | resolved | Middleware→repository allowlist (Session/User/Idempotency); new edges = separate decision. `backend/AGENTS.md`, invariant #17, depguard-enforced in CI |
| A3 | FIX | **fixed 2026-08-20** | `/docs` now serves the embedded spec: Redoc shell as a const (`transport/http/docs.go`) + `/docs/openapi.json` from `api.GetSpecJSON()`; routes registered before the spec validator (which 404s non-contract paths — the old StaticFile routes never worked from any cwd). Proven by `TestDocsRoutesServeEmbeddedSpec` (runs in the package dir where the old impl 404'd); full transport suite + `go test -short ./...` + golangci-lint green |
| A4 | FIX | **fixed 2026-08-20** (decision: bring contract to reality — drop, not populate) | Deleted `internal/util/` + `internal/testutil/` (verified zero importers); removed unused sqlc `SetEmailVerified` + `emit_interface` from `sqlc.yaml` (stale `querier.go` deleted — sqlc never deletes files it stops generating); removed `ValidationErrorResponse`/`FieldError` from `openapi.yaml` (strict 400 component → `ErrorResponse`, oneOf variants dropped) + dead `httperr.WriteValidation` helpers; regenerated both sides (`make gen`, `pnpm gen:api`). Verified: redocly valid, build + all unit tests + lint green, regeneration idempotent; `gen-check` red only against the uncommitted session tree (commits as part of this change set) |
| A5 | FIX | **fixed 2026-08-20** | Reachability analysis: `ErrIdempotencyKeyNotFound` never reaches `writeDomainError` — both call sites are consumed inside the idempotency middleware (409 fallback / log-and-ignore), and sibling sentinels (`ErrIdempotencyKeyInUse`/`Mismatch`) aren't in the map either. The unreachable 404+`INTERNAL_ERROR` entry was removed; a hypothetical future leak now hits the documented logged-500 fallback. Build + unit tests + lint green; no test asserted the old mapping |
| A6 | FIX | **fixed 2026-08-20** (per ADR-0001 consequence: explicit origins only) | Removed the `env-default:"*"` from `AllowedOrigins` (now must be set via yaml/env — both configs already do); added a fail-fast engine guard rejecting `*`/empty origins while credentials are enabled (`server.go`); test fixtures (transport + e2e) moved off the wildcard. Proven by `TestNewEngineRejectsWildcardCorsOrigin` (panics on `*` and `""`); build + unit tests + lint green |
| A9 | FIX | **fixed 2026-08-20** (decision: scope the rule to TS packages) | `packages/i18n` tsconfig gained `noUncheckedIndexedAccess` — type-checks clean, zero fallout. `packages/tokens` is css-only and now explicitly exempt from the tsconfig+type-check rule (root `AGENTS.md` amended; its guards are the mobile `design-tokens-guard` and `design-tokens-sync` tests). |
| A11 | FIX | **fixed 2026-08-20** (decisions: composition root + page-level composition) | (1) sync provider composes in `src/app/_layout.tsx`; context/hook split into `shared/lib/sync/sync-context.tsx` (lower layers import downward); apiClient binding via `shared/lib/sync/transport.ts` — the #16 allowlist untouched. (2) cashflow sheets delegate new-transaction actions via `onNewTransaction` props; `pages/dashboard` + `pages/income` render the `NewTransactionSheet` instances with the original Maestro testIDs. (3) entity barrels added; all deep imports swept. Dependency-cruiser `fsd-*` rules now run with ZERO exclusions (strict run: 0 violations); mobile type-check + 36 jest suites green |
| A13 | FIX | **fixed 2026-08-20** | The three mock repositories moved from production `model/` segments to `shared/lib/testing/mock-{account,category,transaction}-repository.ts` (they depend only on `@expense-tracker/api`; consumers were already test-only — 12 files, verified 0 production imports). Import sweep incl. three relative-path hook tests. Type-check + 36 jest suites + arch:check green |
| B3 | FIX | **fixed 2026-08-20** | Added `auth.invalidCredentials` to both i18n bundles (en schema source; ru parity) and replaced the three error-text usages in `LoginPage.vue` (client-validation form error, UnauthorizedError form error + toast). The heading key `auth.signIn` remains only as the page `<h1>` and the unexpected-error notification title — legitimate uses. Web `vue-tsc --build` green; the key is type-checked via `MessageSchema` |
| B4 | FIX | **fixed 2026-08-20** | `conflict-center.tsx` now parses all serialized money through a `toMinorUnits` helper (`Number.isSafeInteger` guard, garbage → 0): `openingBalance`, `amount`, and `manualAdjustment` (which had an inline guard before — unified). Invariant #2's known-violation note removed. Mobile type-check + 36 jest suites green |
| A8-follow-up | FIX | **fixed 2026-08-20** (decisions: mobile radius 2/4px canonical; cross-add popover+aliceblue) | Web copy synced to the canonical mobile palette: light background `#fbfbfb`, light border `#e4dded`, radius sm/md as literal 2/4px, `--brand-aliceblue` added (both themes); mobile gained `--color-popover(-foreground)` (both themes). New guard `apps/mobile/src/shared/lib/design-tokens-sync.test.ts` compares every shared token per theme + radius literals — proven by negative test (deliberately corrupted border → "mobile #e4dded != web #ff0000", restored → green). Mobile suite 37/38 (opt-in integration suite skipped), 267 tests green |
| A2 | FIX | ACCEPT | Rule refined (policy vs persistence mechanics + no-DB-testability heuristic); `RegisterUser` seeding and `VerifyEmailCode` attempts are registered deviations, migration deferred (no UoW). `backend/AGENTS.md`, invariant #18 |
| A7 | DOCUMENT | resolved | Stale `time.Local` mechanism claim removed from root `AGENTS.md` |
| A8 | DECIDE | resolved | Mobile palette canonical; web copy syncs (pending: technical-debt FIX + guard test) |
| A10 | DOCUMENT | resolved | Package-consumption framing corrected in root `AGENTS.md` |
| A12 | DOCUMENT | resolved | Mobile AGENTS header fixed (`{api,dates,money,tokens}`, i18n pending) |
| B1 | DECIDE | resolved | **ADR-0001**: one cookie session for both clients; Origin check decided (implementation pending); prod HTTPS-only |
| B2 | DECIDE | resolved | Single-replica deployment assumption; in-memory limiter sufficient. `docs/assumptions.md` |
| B5 | DOCUMENT | resolved | Money rule refined to boundary formulation. Root `AGENTS.md`, invariant #2 |
| C1 | REMOVE | stands | Old overview replaced by the baseline |
| C2 | DOCUMENT | resolved | technical-debt.md rewritten: only live debts |
| C3 | DOCUMENT | resolved | tokens `index.css` header fixed (points to `src/mobile.css`, mobile canonical) |
| C4 | DOCUMENT | resolved | README minimal rewrite |
| C5 | DOCUMENT | resolved | PLAN.md marked deprecated |
| C6 | DOCUMENT | resolved | openspec/config.yaml context updated (status, packages, refined money invariant) |
| C7 | DOCUMENT | resolved | Obvious stale comments fixed (`database.ts`); conventions-doc duplication still deferred |
| D1–D3 | UNKNOWN | resolved | Duplicates of B1/A1/A8 — closed with them |
| D4 | UNKNOWN | resolved | RU product default locale; `i18n` en→ru pending implementation |
| A14 | ACCEPT | ACCEPT (narrowed) | Still no type-check/app-tests/knip in CI, but `ts-gen-check` (contract drift) and `arch-check` (architecture rules) now run in CI |
| A15 | REMOVE | stands | `listPage` is spec-mandated (`openspec/specs/transactions` "Cursor-paginated listing"); UI adoption pending is not a defect |

## Pending findings (FIX — none fixed silently; each awaits its own change)

None — every FIX finding (A3–A6, A9, A11, A13, B3, B4, A8-follow-up) is
closed. The remaining open work items are implementations of already-made
decisions: the ADR-0001 Origin-check middleware, the web migration onto
`@expense-tracker/dates`, the web offline-first migration (invariant #16),
the mobile i18n wiring, and the `i18n` en→ru default flip — see
`docs/assumptions.md`.

## Registered deviations & accepted debts (do not "fix" without a decision)

- A2 deviations: `RegisterUser` seeding, `VerifyEmailCode` attempt
  accounting (business policy inside repository transactions) — revisit
  as new tasks exercise the boundary; UoW would need its own ADR.
- ADR-0001 Origin-check middleware: decided, **not yet implemented**.
- A14 remainder: no type-check / app tests / knip in CI.
- Sliding-expiry policy lives in auth middleware without dedicated unit
  tests (accepted with the invariant #17 decision).
