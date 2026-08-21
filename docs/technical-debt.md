# Technical Debt & Gotchas

Known, accepted-but-unresolved debts (audited 2026-08-20). Not a backlog —
concrete work items belong in `docs/roadmap/` or an issue tracker; future
work that is merely undecided lives in `docs/assumptions.md`. Fixed or
stale entries are removed, not archived.

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

## Stale configuration

- `backend/.sqlfluff` — `dialect = sqlite` (the project is Postgres).
- `apps/web/.i18nrc.json` — points at a nonexistent path (bundles live in
  `packages/i18n/src/locales/`).
