# Proposal: add-planned-payments

## Why

Recurring payments — subscriptions, loan installments, salary — are the
backbone of personal cashflow, but the product has no surface for them:
every recurring expense must be re-entered by hand as a transaction, and
the user cannot see what is due soon or how much the planned items cost
per month. The mobile app's «Планы» tab has been a placeholder since tab
navigation landed. Per the repo rule that undefined product behavior must
be recorded as an explicit product decision, this change defines planned
payments end to end — domain, API, sync, automatic execution, and the
mobile screen with reminders.

## What Changes

- **New planned-payment domain**: a *planned payment* is a recurring rule
  of type `expense` or `income` with a positive minor-unit amount, an
  optional name (not unique — two «Netflix» plans are legal), a required
  account and a type-matched category (the same fields a confirmed payment
  will carry), a day-granularity `next_due` date (past dates allowed — a
  plan can start already overdue), a regularity (daily / weekly / monthly
  / yearly, anchored to the next-due date and clamped to shorter months),
  a confirmation mode (`manual` or `auto`), a reminder setting
  (`off` / `day_before` / `on_day`), and an optional note.
- **Plans generate real transactions**: confirming a planned payment
  creates a transaction with the plan's type, account, and category, an
  editable amount and date, and the plan's name as the transaction note
  (empty note for unnamed plans), then advances `next_due` by one period.
  A missed period is never skipped: each confirmation covers exactly one
  occurrence, so an overdue plan stays overdue until caught up — per
  occurrence, because missed charges are real money.
- **Auto confirmation runs on the server**: a new backend job scans due
  `auto` plans and, inside one per-user transaction, creates the
  transaction, advances the plan, and appends the change-log rows; devices
  receive both entities through the existing pull. Manual confirmation is
  a client-side composite (create transaction + advance plan) with no
  dedicated server endpoint.
- **New «Планы» mobile screen** replacing the placeholder: two cards —
  «Расходы» (Подписки, платежи по кредитам и прочее) and «Доходы»
  (Зарплата, премии и прочее) — each showing the plan count and a
  normalized monthly total (month as-is, year ÷12, week ×52/12,
  day ×365/12). Tapping a card opens a sheet with the flat list sorted by
  next-due (overdue plans on top with a badge; row title = name or
  category), a bottom «Добавить расход/доход» button, and a row tap
opening the edit sheet (same form plus delete). The add/edit form
follows the reference row layout (the edit-transaction field-rows
idiom): a decimal-pad amount input with the account-currency chip,
one-line rows — label left, value right — for the account, category,
date, regularity, confirmation mode, and reminder, each opening its
picker/option sheet, plus a note input row and safe-area bottom
padding; manual confirmation opens a lightweight confirm sheet with an
editable amount and date and the account/category fixed from the plan,
sharing the same row layout.
- **Reminders via local notifications**: new `expo-notifications`
  dependency; each device schedules its own reminders at 10:00 local time
  (day before / on the due day) for plans with reminders enabled, in both
  confirmation modes («сегодня спишется X» for auto, «подтверди X» for
  manual); denied notification permission degrades silently — the setting
  is stored regardless.
- **Backend + contract (OpenAPI-first)**: REST CRUD for planned payments
  with full parity to the existing resources — per-user ownership,
  client-generated ids, version conflicts, account/category in-use delete
  guards, soft tombstones — plus full sync participation: `SyncEntity`
  enum extension, change-log / applied-operations CHECK migration,
  push/pull dispatch, retention.
- **Offline-first preserved**: mobile keeps its local-SQLite source of
  truth — a new local table, outbox/sync-engine integration; the screen,
  mutations, and confirmation work offline and converge via sync.

Everything is additive; no breaking contract or behavior changes.

## Capabilities

### New Capabilities

- `planned-payments`: the planned-payment domain — entity shape and
  validation, recurrence and overdue semantics, transaction generation on
  manual and automatic confirmation, reminders, ownership, client
  -generated ids, versioned updates, deletion rules, listing, and sync
  participation.

### Modified Capabilities

- `mobile-local-data`: gains a new requirement "Plans screen data
  behavior" defining what the screen and its sheets show, the local-data
  derivation (counts, normalized monthly totals, overdue detection),
  offline mutations including manual confirmation, and reachability via
  the existing «Планы» tab (mirroring the existing "Income screen data
  behavior").
- `sync-protocol`: the "Transactional change-log with tombstones"
  requirement's entity enumeration extends to planned payments, which
  become a first-class synced entity.
- `accounts`: the "Deletion guard" requirement extends to planned
  payments — deleting an account referenced by any live planned payment
  is rejected with an account-in-use error (otherwise automatic
  confirmation would create transactions against a deleted account).
- `categories`: the "Deletion guard" requirement extends the same way —
  deleting a category referenced by any live planned payment is rejected
  with a category-in-use error.

## Impact

- **Contract**: `docs/api/openapi.yaml` — new schemas and paths
  (`/api/planned-payments`), `SyncEntity` enum value and sync-data oneOf
  branch → `make gen` (backend) and `pnpm gen:api`
  (`packages/api/src/schema.ts`); CI drift gates must stay green.
- **Backend**: new migration (table + CHECK-constraint extension on
  `change_log` / `applied_operations`), domain / repository / service /
  transport for the entity, sync dispatch + pull state + retention
  ordering, a new recurring auto-confirmation job under `internal/jobs`
  (modeled on the existing retention job), errormap rows, service fakes,
  service / repository / e2e tests.
- **packages/api**: regenerated schema plus domain models, repository
  contracts, HTTP mappers, and error-code mappings for the new codes.
- **Mobile**: local table + drizzle migration, sync plumbing
  (`sync-data`, `sync-engine`, `outbox`), new `entities/planned-payment`
  slice, real `pages/plans` screen replacing the placeholder, new
  `expo-notifications` dependency with permission prompts (iOS /
  Android 13+ `POST_NOTIFICATIONS`) and app config updates,
  dependency-cruiser slice config, Jest suites, Maestro flow.
- **Out of scope**: the web app (the contract change is additive; web
  picks plans up later), the home screen quick actions and analytics
  (plans live only in their tab), plan pause/archival and end dates,
  configurable reminder times, mobile i18n wiring (RU strings stay
  hardcoded with `TODO(i18n)` markers).
