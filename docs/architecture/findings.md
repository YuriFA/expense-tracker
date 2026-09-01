# Architecture Findings — classification & revision status

**Revision 3 (2026-09-01, full-repo audit).** Spec-to-code sweep of all 21
capability specs, gate runs (HEAD `d21bebd`, with web/mobile suites re-run
in a HEAD worktree), and invariant re-verification. Evidence report:
`docs/architecture/audit-2026-09.md`. New IDs continue the sequence. The
stale "ADR-0001 Origin-check not yet implemented" entry below is resolved
(implemented 2026-08-30, `backend-hardening`); invariants #3/#5/#15/#17 and
ADR-0002's status header were refreshed by the same audit (B6).

**Revision 2 (2026-08-20, post-decision review).** Revision 1 was the
original baseline classification (FIX / DECIDE / DOCUMENT / ACCEPT /
REMOVE). This revision records the outcome of the interactive architecture
review: every DECIDE item was decided, ADR-0001 was written for the
auth/CSRF threat model, all DOCUMENT items were fixed, and automated
enforcement was added for layering/package/FSD rules (backend depguard in
CI + root `pnpm arch:check` in CI). Original finding IDs are preserved.

## Status summary

| Class | Count | Findings |
|---|---|---|
| FIX (pending, rev.3) | 5 | A16 (debts listing scoping bug), A17 (CI `arch-check` red since introduction — Node 20 vs dependency-cruiser 18), A18 (mobile date-dependent test fixtures), A19 (web FSD: cross-slice import + Steiger not in CI), A20 (PWA manifest colors not token-derived) |
| DOCUMENT (pending, rev.3) | 2 | B7 (OpenAPI `Idempotency-Key` self-contradiction), B8 (planned-payments spec wording still user-scoped) |
| DECIDE (open, rev.3) | 2 | B9 (mobile runtime version surface - spec gap), B10 (plans overdue flag: UTC-day comparison vs local calendar-day semantics) |
| DOCUMENT (resolved, rev.3) | 1 | B6 (stale docs: ADR-0001:66, overview CSRF/rate-limit + test counts, ADR-0002 status header, invariants #3/#15/#17, findings deviation list) — fixed by the audit itself |
| FIX (pending, rev.2) | 0 | none — all closed |
| ACCEPT | 2 | A2 (registered deviations, migration deferred by decision), A14 (narrowed: `ts-gen-check` + `arch-check` carved out of the CI gap — note A17: the `arch-check` half was never operational in CI) |
| DOCUMENT (resolved, rev.2) | 10 | A7, A10, A12, B5, C2, C3, C4, C5, C6, C7 — all fixed 2026-08-20 |
| REMOVE | 2 | A15, C1 |
| DECIDE (resolved, rev.2) | 0 | all resolved: A1, A8, B1, B2, D4 |

## Open findings detail (rev.3)

| ID | Class | Priority | Finding |
|---|---|---|---|
| A16 | FIX | P1 | `GET /api/debtors` / `GET /api/debt-operations` pass `user.ID` into the `householdID` parameter (`transport/http/debtors.go:17`, `debt_operations.go:17`); empty listings for every registration since the household change (distinct ids, `postgres/users.go:28-29`; only 000005-backfill rows coincide). e2e gap: list assertions are `NotContains`-only. One-line fix per handler + a positive e2e assertion. Blast radius limited — both local-first apps list from the local DB — but the contract endpoint is broken and household members generally get wrong results |
| A17 | FIX | P1 | CI red on every run since 2026-08-21 (last green 2026-08-19 `fe30c7d`): the `arch-check` job (added 2026-08-20) has never passed — dependency-cruiser 18 rejects Node 20 (`ci.yml` pins `node-version: "20"` in 3 places; local Node 24 is fine). The "Automated: yes" claims for #12–#16 were not operational in CI. Fix: bump to 22. Also: 14 local commits unpushed |
| A18 | FIX | P2 | 3 mobile Jest suites / 7 tests fail at HEAD since the 2026-09-01 month boundary: `category-cashflow-sheet.test.tsx` (`dayThisMonth` clamping collapses days 2/4/6 onto the 1st), `analytics-screen`/`analytics-detail-screen` (hardcoded `2026-08-*` fixtures vs `currentPeriod('month')` default). Not in CI → unnoticed. Fix: month-independent fixtures (injected clock) |
| A19 | FIX | P2 | Web FSD (Steiger, local-only): `widgets/mobile-shell/ui/MobileTopBar.vue:6` imports `@/widgets/sync-status` (cross-slice, forbidden); `shared/lib` 17 modules > 15 threshold. Fix the import, group shared/lib, and add Steiger (or port the two rules to the depcruiser web config) to CI |
| A20 | FIX | P3 | `apps/web/public/site.webmanifest:9-10`: `theme_color #6366f1` is the categorical data-palette indigo (tokens file: brand-* is "not the UI accent"), `background_color #ffffff` matches no Warm Paper token (light background `#f6f2ec`, primary `#0f766e`). Also stale comment `packages/tokens/src/index.css:92` ("dark theme unwired at runtime") |
| B7 | DOCUMENT | P3 | `openapi.yaml` self-contradiction on `Idempotency-Key`: operation description says "если заголовок присутствует" (conditional), the parameter is `required: true` (`openapi.yaml:2072-2078`), and the middleware 400s on absence (`IDEMPOTENCY_KEY_MISSING`). Align the description with the enforced reality |
| B8 | DOCUMENT | P3 | planned-payments spec wording predates household scoping ("belongs to exactly one user… another user's … not exist"); code and its four sibling specs are household-scoped. Reword via a spec delta |
| B9 | DECIDE | P3 | app-version spec gap: mobile exposes no runtime version surface (only `package.json` `0.0.0`), so version-drift detection cannot cover the mobile client. Decide: add one or record the exclusion |
| B10 | DECIDE | P3 | Plans overdue flag compares `nextDue` against the UTC day (`utcTodayKey`, both apps - `apps/web/src/pages/plans/model/selectors.ts:23`, `apps/mobile/src/pages/plans/model/selectors.ts:24`; rationale comment: parity with the server auto-confirm day boundary, design D2), while the spec's overdue semantics are user-calendar phrased ("due once its scheduled calendar day has arrived", `planned-payments/spec.md`) and both plan forms default `nextDue` to the LOCAL today (`calendarDayKey(new Date())`). Net effect in UTC+ zones between local midnight and UTC midnight a just-created due-today plan shows no overdue badge and its confirm pill stays outline - contradicts the spec's create-today expectations and flaked `local-screens.spec.ts` "plans" at 00:xx MSK (test now pins yesterday explicitly). Decide: local-day UI flag (server job stays UTC) vs UTC everywhere incl. form default |

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

Rev.3 open items: **A16–A20** (see the detail table above). Rev.2 items are
all closed. The remaining older open work items are implementations of
already-made decisions: the web migration onto `@expense-tracker/dates`,
the mobile i18n wiring, and the `i18n` en→ru default flip — tracked in
`docs/assumptions.md`. (The ADR-0001 Origin-check middleware and the web
local-first migration from the rev.2 list have since landed.)

## Registered deviations & accepted debts (do not "fix" without a decision)

- A2 deviations: `RegisterUser` seeding, `VerifyEmailCode` attempt
  accounting (business policy inside repository transactions) — revisit
  as new tasks exercise the boundary; UoW would need its own ADR.
- A14 remainder: no type-check / app tests / knip in CI (see A17/A18/A19
  for what that let slip).
- Sliding-expiry policy lives in auth middleware without dedicated unit
  tests (accepted with the invariant #17 decision).
