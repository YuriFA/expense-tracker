# Technical Debt & Gotchas

Known, accepted-but-unresolved debts (audited 2026-08-20). Not a backlog —
concrete work items belong in an issue tracker or an OpenSpec change;
future work that is merely undecided lives in `docs/assumptions.md`. Fixed
or stale entries are removed, not archived.

## Workspace / CI

- **JS/TS CI is minimal.** Only two JS jobs run: the `ts-gen-check`
  contract drift gate and the `arch-check` dependency-cruiser gate (both
  added 2026-08-20); everything else is local-only: no type-check, no web
  or mobile tests, no knip.
- **Web coverage thresholds are disabled** (acknowledged debt; ~500 unit
  tests exist but the bar is not enforced).

## Packages

- **Seed categories are hand-synced** across Go `domain/seeds.go`, TS
  `DEFAULT_CATEGORIES`, `SEED_KEY_BY_SLUG`, and the locale JSON keys;
  `slug` exists only on the TS side (the backend never returns it).
- `packages/tokens` has no tsconfig/type-check; `api`/`money`/`i18n` have
  no READMEs.

## Web

- `pages/accounts` edit-account feature has no public API barrel (FSD
  violation).
- `TransactionsItemsList.vue` binds one shared `editOpen`/`deleteOpen`
  ref across all rows — opening one dialog opens all of them.
- No catch-all 404 route.
- Sentry integration is a TODO in `log-error.ts`.

## Mobile

- **Accessibility tree collapse after a successful create+sync cycle —
  RESOLVED 2026-08-25** (`fix-accessibility-tree-collapse`; root cause,
  evidence, and fix in that change's design.md "Root Cause Report"). Two
  combined factors: a server-confirmed create arms the app, and dismissing
  a `BottomSheetModal` rendered inside another sheet's portal content
  (the sheet-in-sheet pickers) then kills ALL RN accessibility exposure and
  the visual sheet stack until restart — JS/@gorhom stay consistent, the
  failure is in the Fabric AX bookkeeping on RN 0.86/iOS 26 (symptom-class
  matches upstream: react-native#57282, Maestro#3367/#3056, all closed
  without fixes). Fix: `useSheetContentPickers`/`SheetContentPortal`
  (`shared/ui/sheet-content-portal`) re-parents every sheet-in-sheet picker
  to the owning form-sheet component (the experimentally safe placement);
  plus `key={editingPlan.id}` in plans-screen (a masked latent bug: the
  edit form never re-presented after a first edit) and flow 17 phase D/E
  staging completions (list sheet reopened before row asserts) that the
  collapse had made unreachable. Regression evidence (2026-08-25): the
  armed minimal-repro probe and flows 16/17/09/15 pass post-fix; full
  `pnpm test:e2e` 17/17 × 3 consecutive runs; mobile type-check/lint/
  format/test, root `arch:check` + `knip`, backend `go test` + `make
  gen-check` all green.
- **Paste-based e2e sign-in degrades on freshly provisioned iOS 18.6
  simulators** (found 2026-08-25): the long-press → Paste delivery into
  secureTextEntry drops characters (17/18 observed) on a fresh 18.6 sim;
  the tuned 26.5 sim is unaffected. Blocks cross-iOS-version a11y
  investigations (see the change's D4-F limitation). Infra-hardening
  candidate for `run-maestro-ios.sh` / flow 09's sign-in.
- **Transport-level sync push failures are invisible per-op.** When
  `POST /api/sync/push` fails at the HTTP level (offline gate, network,
  request-level `VALIDATION_FAILED` during contract skew), the engine
  leaves every queued op with `attempts` climbing, `sent_at` set, and
  `last_error` NULL — per-op `last_error` is only written from per-item
  results, so whole-batch failures have no outbox-visible diagnostic.
  Retry semantics are correct (backoff + idempotent opId replay); only
  observability is missing (found 2026-08-25: 23 ops retried ~16× over
  19 h with no recorded reason).

## Stale configuration

- `backend/.sqlfluff` — `dialect = sqlite` (the project is Postgres).
- `apps/web/.i18nrc.json` — points at a nonexistent path (bundles live in
  `packages/i18n/src/locales/`).
