# Proposal: adjustment-transactions

## Why

The account-edit form's «Корректировка баланса» field edits a stored
correction value with replace semantics: entering 2000 once adds 2000,
reopening the form and entering 100 silently removes the 2000 and adds 100.
Users cannot form a correct mental model of this, balance changes leave no
audit trail (who/when/how much - critical once household sharing lands), and
the field duplicates a job transactions already do.

## What Changes

- Add a fourth transaction type `adjustment`: a signed amount referencing
  exactly one account (no category, no transfer pair) that contributes its
  signed amount to that account's balance. Editable and deletable like other
  transaction types; type immutable after creation, as for all types.
- Add a «Сверить баланс» (reconcile) action on the web accounts screen: the
  user enters the target actual balance (prefilled with the computed
  balance), sees a live delta preview, and the client creates an `adjustment`
  transaction with the computed delta via the regular transaction-create
  endpoint. Zero delta creates nothing. Optional note becomes the
  transaction `description`.
- **BREAKING** Remove the account `manualAdjustment` field entirely: from
  the API (`Account`, `AccountUpdateRequest`), the database column, sync
  full-state payloads, the sync conflict center, and client models. No data
  migration (no meaningful production data carries a nonzero adjustment).
- Account balance formula becomes `openingBalance + Σ transaction
  contributions` (adjustment contributes its signed amount).
- Account updates accept only `name` (edit-account form shrinks to
  name-only). `openingBalance` and `currency` stay immutable after creation.
- Adjustment transactions are excluded from all money-flow aggregates
  (dashboard income/expense, cashflow overviews, category analytics, plans),
  like transfers; they appear only in balances and the transaction history.
- The adjustment type is filterable in the web transactions type filter and
  renders in history with a badge, signed amount, and no category.
- Creation surface: only via the reconcile action. The generic
  add-transaction flow gains no fourth tab (it would require entering a raw
  delta). Editing an existing adjustment transaction edits its raw delta
  directly.
- Mobile: render adjustment transactions in history, exclude them from
  cashflow aggregates, drop `manualAdjustment` from local-data schema and
  conflict center. The mobile reconcile UI is deferred until mobile gains
  account editing.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `transactions`: new `adjustment` type - reference shape (exactly one
  account, no category, no transfer pair), signed amount allowed, balance
  contribution semantics.
- `accounts`: server-computed balance formula drops the manual-adjustment
  term; limited mutability narrows to name-only updates; the Manual
  adjustment requirement is removed.
- `analytics`: adjustment transactions are excluded from direction totals
  and category figures, as transfers already are.
- `web-screens`: new requirement for the account balance reconciliation
  action on the accounts screen (dialog, target-balance input, delta
  preview, zero-delta no-op).

## Impact

- **OpenAPI** (`docs/api/openapi.yaml`): `Transaction.type` enum + schema
  descriptions, `TransactionCreateRequest.amount` signed for `adjustment`,
  `TransactionUpdateRequest` likewise, `Account`/`AccountUpdateRequest` lose
  `manualAdjustment`. Regenerate backend (`make gen`) and TS
  (`pnpm gen:api`).
- **Backend** (`backend/`): domain transaction/account models, validation
  (reference-pair rules, signed amount rule), balance recompute query drops
  the manual term, sqlc queries + migration dropping the column, sync
  full-state, e2e tests.
- **Web** (`apps/web/`): edit-account form shrinks to name; new reconcile
  dialog + menu action (accounts page); transaction list item, type filter,
  edit form for adjustment; analytics/cashflow selectors exclude the type;
  sync conflict center loses the adjustment field.
- **Mobile / packages** (`apps/mobile/`, `packages/`): local-data schema
  column drop + account repository, cashflow selectors, conflict center,
  adjustment rendering in transaction lists; no reconcile UI.
- No new endpoints; no sync-protocol requirement changes (full-state payload
  shape is not spec'd at requirement level).
