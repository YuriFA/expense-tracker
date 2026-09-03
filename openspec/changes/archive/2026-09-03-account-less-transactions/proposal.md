# Account-less transactions («Без счета»)

## Why

The family budget history (and some ongoing flows) was tracked without an
account dimension: a spreadsheet of per-day category totals with no account
column. That history is still valuable for spending analytics, but today
every income/expense transaction must reference exactly one account at every
validation layer (REST create/update, sync push, local mirror, app forms), so
there is no honest way to record it. A fake catch-all account was considered
and rejected: it would produce a meaningless balance drifting negative,
pollute account lists and filters, and need hiding from the total-balance
tile.

## What Changes

- Income and expense transactions MAY omit the account reference
  («Без счета»). The category reference remains required; the amount rule
  (positive minor units) is unchanged.
- An account-less cashflow transaction contributes to NO account balance but
  SHALL appear in transaction listings and in income/expense period and
  category analytics. Its displayed currency falls back to the app default.
- Updates may set or clear the account reference on income/expense (type
  immutability unchanged). Transfers still require two distinct real
  accounts; adjustments still require exactly one account (they exist to
  correct a specific account's balance).
- Sync: push validation accepts account-less cashflow; pull delivers such
  rows to every device of the household.
- Web UI: the account selector of the expense/income creation forms and the
  cashflow edit form offers a «Без счета» option; the transactions screen
  account filter gains a «Без счета» pseudo-account; transaction rows render
  «Без счета» instead of an empty account name.
- Mobile: shared layers comply (domain normalizer, local-data validation and
  sync accept account-less cashflow; pulled rows render in history and
  analytics, excluded from balances), but mobile forms keep requiring an
  account for now — mobile form UI is a follow-up change.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `transactions`: income/expense reference shape — `accountId` optional,
  account-less balance/analytics semantics, update may set or clear it.
- `sync-protocol`: account-less cashflow push/pull is valid and travels to
  every device.
- `web-screens`: «Без счета» option in creation/edit forms; row display and
  account filter on the transactions screen.
- `web-local-data`: local create/update accept account-less cashflow; the
  queued push operation carries the absent account; pulled rows persist.
- `mobile-local-data`: local mirror accepts account-less cashflow; balances
  exclude them, history and analytics include them.

## Impact

- **OpenAPI first** (`docs/api/openapi.yaml`, then regenerate): wording of
  `TransactionCreateRequest.accountId` / `TransactionUpdateRequest.accountId`
  / `TransactionSyncData` (optional for income/expense, still required for
  adjustment, forbidden for transfer). `Transaction` and
  `TransactionSyncData.accountId` are already nullable — no structural
  schema change. Backend `make gen` + TS `pnpm gen:api`.
- **Backend**: `internal/service/transaction.go` (`validateRefs`,
  `validateCashflowRefs` skip the account checks when no account is
  referenced), `internal/service/sync_adapter_transaction.go`
  (`validateSyncRefs`, `validateSyncCashflowRefs` likewise); service tests.
- **packages/api**: `CashflowTransaction.accountId` becomes
  `string | null`; normalizer accepts an absent/null account; HTTP create
  mapper omits the field when absent.
- **packages/local-data**: cashflow branch of `validateReferences` accepts a
  null account; `sync/sync-data.ts` treats cashflow without an account as a
  valid push payload (it is currently recorded as a local error and never
  pushed).
- **apps/web**: add/edit schemas, `AccountSelect`, transaction row, account
  filter, locales (ru/en).
- **apps/mobile**: compile-level adoption only (types widen).
- **No DB migrations**: the Postgres and local SQLite `account_id` columns
  are already nullable; the `account_contributions` view already drops
  NULL-account rows from balances.
