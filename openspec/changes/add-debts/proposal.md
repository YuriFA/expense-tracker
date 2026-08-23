# Proposal: add-debts

## Why

Debt tracking has no surface anywhere in the product, while the reference
design for the home screen already reserves a «Долги» quick-action tile
(`docs/product/mobile-home.md` keeps three of the four reference tiles and
explicitly excludes debts from the initial scope). Meanwhile the «Цели» tile
is a disabled placeholder pointing at an unbuilt feature (no API, no data),
so one of the three home-screen shortcuts is dead weight. Per the repo rule
that undefined product behavior must be recorded as an explicit product
decision, this change defines debt tracking end to end — domain, API,
sync, and the mobile screen — and puts it behind the freed-up tile.

## What Changes

- **New debt-tracking domain**: a *debtor* (a person the user tracks debts
  with; unique name per user) and *debt operations* — records in one of two
  directions: `receivable` («мне должны») or `payable` («я должен»), each
  with a kind: `debt` (the owed amount grows) or `repayment` («списание»,
  the owed amount shrinks), a positive minor-unit amount, a date, and an
  optional note. Balances are never stored: the per-debtor-per-direction
  balance and the two direction totals are derived by summing operations —
  the same "records + derived totals" philosophy as transactions versus
  account balances. The two directions are independent ledgers: no silent
  netting, and the same person may appear in both.
- **New «Долги» mobile screen** at `/debts`, reached by replacing the
  disabled «Цели» quick action with an enabled «Долги» action: a summary
  with two direction totals («Мне должны» / «Я должен»), two sections of
  debtor rows (name + current balance in that direction; no «Все доходы»
  card, no period switching), zero-balance debtors hidden behind a reveal
  row; tapping a debtor opens a history sheet (remaining amount, day-grouped
  operations, «Новое списание» CTA); the operation form offers a
  Долг ↔ Списание switch, debtor and direction pickers (pre-fixed when
  opened from a debtor's sheet).
- **Removal**: the `/goals` placeholder screen and route are deleted; goals
  stay a deferred product idea without a tile.
- **Backend + contract (OpenAPI-first)**: REST CRUD for debtors and debt
  operations with full parity to the existing resources — per-user
  ownership, unique debtor names, client-generated ids, version conflicts,
  debtor-in-use delete guard, soft tombstones — plus full sync
  participation: `SyncEntity` enum extension, change-log /
  applied-operations CHECK migration, push/pull dispatch, retention.
- **Offline-first preserved**: mobile keeps its local-SQLite source of
  truth — new local tables, outbox/sync-engine integration; every screen
  figure and mutation works offline and converges via sync. Pull-side
  hardening for unknown entity kinds lands in the same change so
  already-installed builds survive pulling debt changes.

Everything is additive; no breaking contract or behavior changes.

## Capabilities

### New Capabilities

- `debts`: debt tracking domain — debtors and debt operations, the two
  independent directions, derived balances, ownership and uniqueness,
  client-generated ids, versioned updates, deletion rules, listing, and
  sync participation.

### Modified Capabilities

- `mobile-local-data`: gains a new requirement "Debts screen data behavior"
  defining what the screen shows, its local-data derivation, offline
  mutations, and reachability via the «Долги» quick action (mirroring the
  existing "Income screen data behavior").
- `sync-protocol`: the "Transactional change-log with tombstones"
  requirement's entity enumeration extends to debtors and debt operations,
  which become first-class synced entities.

## Impact

- **Contract**: `docs/api/openapi.yaml` — new schemas and paths
  (`/api/debtors`, `/api/debt-operations`), `SyncEntity` enum values and
  sync-data oneOf branches → `make gen` (backend) and `pnpm gen:api`
  (`packages/api/src/schema.ts`); CI drift gates must stay green.
- **Backend**: new migration (tables + CHECK-constraint extension on
  `change_log` / `applied_operations`), domain / repository / service /
  transport for both entities, sync dispatch + pull state + retention
  ordering, errormap rows, service fakes, service / repository / e2e tests.
- **packages/api**: regenerated schema plus domain models, repository
  contracts, HTTP mappers, and error-code mappings for the new codes.
- **Mobile**: local tables + drizzle migration, sync plumbing
  (`sync-data`, `sync-engine`, `outbox`, `conflicts`, `sync-meta`), new
  `entities/debt` slice, new `pages/debts` screen + route, quick-action
  swap, goals placeholder removal, `_layout` composition, dependency-cruiser
  slice config, Jest suites, Maestro flow.
- **Docs**: `docs/product/mobile-home.md` (quick actions become
  Счета / Доходы / Долги; debts leaves the "explicitly excluded" list;
  goals noted as deferred).
- **Out of scope**: the web app (the contract change is additive; web picks
  debts up later), any accounts/cashflow integration (debts are a standalone
  ledger — operations do not move money between accounts), budgets/limits,
  mobile i18n wiring (RU strings stay hardcoded with `TODO(i18n)` markers).
