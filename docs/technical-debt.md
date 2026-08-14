# Technical Debt & Gotchas

Known, current problems (audited 2026-08). Not a backlog — concrete
work items belong in `docs/roadmap/` or an issue tracker; future work
that is merely undecided lives in `docs/assumptions.md`. Remove entries
when fixed.

## Workspace / CI

- **No JS/TS CI at all.** CI covers Go only: no type-check, no web or
  mobile tests, no `pnpm gen:api` drift gate — the TypeScript side of
  "OpenAPI first" is unenforced.
- **Web coverage thresholds are disabled** (acknowledged debt; ~500
  unit tests exist but the bar is not enforced).

## Packages

- **Token duplication.** Colors are hand-maintained in
  `packages/tokens/src/tokens/colors.ts` (oklch), `colors.rn.ts` (hex),
  `packages/tokens/src/index.css`, `apps/mobile/global.css`, and
  `apps/web/src/style.css` (which also overrides the package and adds
  web-only `--chart-*`/`--sidebar-*`). Adding a color = 4-5 manual
  edits. "Tokens are the single source of truth" is aspirational until
  this collapses.
- **Seed categories are synced by hand**: Go `domain/seeds.go` ↔ TS
  `DEFAULT_CATEGORIES` ↔ `SEED_KEY_BY_SLUG` ↔ locale JSON keys. `slug`
  exists only on the TS side (the backend never returns it).
- `packages/tokens` has no tsconfig/type-check; `api`/`money`/`i18n`
  have no READMEs.

## Backend

- `ErrIdempotencyKeyNotFound` maps to HTTP 404 with machine code
  `INTERNAL_ERROR` — an inconsistent status/code pair.
- `internal/util` is dead code.

## Web

- `pages/accounts` edit-account feature has no public API barrel (FSD
  violation).
- `TransactionsItemsList.vue` binds one shared `editOpen`/`deleteOpen`
  ref across all rows — opening one dialog opens all of them.
- No catch-all 404 route.
- Sentry integration is a TODO in `log-error.ts`.

## Mobile

- **Money math is float** (`amount / 100`, `.toFixed(2)`) with hardcoded
  `$`/`en-US` — violates the int64-minor-units invariant until
  `@expense-tracker/money` is adopted.

## Stale documentation

- Root `README.md` — SQLite era, claims "mobile planned".
- `docs/PLAN.md` — lists the OpenAPI spec as a TODO though it is done.
- `backend/.sqlfluff` — `dialect = sqlite` (the project is Postgres).
- `apps/web/.i18nrc.json` — points at a nonexistent path.
