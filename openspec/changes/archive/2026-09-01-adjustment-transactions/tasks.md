## 1. OpenAPI contract first

- [x] 1.1 `docs/api/openapi.yaml`: add `adjustment` to `Transaction.type` and `TransactionCreateRequest.type` enums; update schema descriptions (4th type: exactly one `accountId`, no `categoryId`/`fromAccountId`/`toAccountId`, nonzero signed amount); relax `amount` minimum for the adjustment type only (document the per-type rule; keep positive-only for income/expense/transfer)
- [x] 1.2 Remove `manualAdjustment` from `Account`, `AccountUpdateRequest` (which becomes name + version only), and the `Обновить счёт` operation summary/description
- [x] 1.3 Regenerate: `make gen` (backend `api.gen.go`) and `pnpm gen:api` (`packages/api/src/schema.ts`); redocly lint clean (`npx @redocly/cli lint --config docs/api/redocly.yaml docs/api/openapi.yaml`)

## 2. Backend

- [x] 2.1 Migration `000007_adjustment_transactions` (up: recreate `account_contributions` view with the `adjustment` arm contributing `amount` on `account_id`, drop `accounts.manual_adjustment`; down: restore view without the arm, recreate the column with default 0)
- [x] 2.2 `repository/queries/accounts.sql`: drop `manual_adjustment` from INSERT/SELECT/UPDATE and the sync upsert; balance expressions become `opening_balance + COALESCE(Σ signed)`; re-run sqlc codegen and fix `repository/db/*`, `repository/db/models.go`
- [x] 2.3 Domain (`domain/account.go`, `domain/transaction.go`): remove `ManualAdjustment` from `Account`/`UpdateAccountParams`/`AccountFullState`; add the `adjustment` type; update the balance-formula comment
- [x] 2.4 Service validation (`service/transaction.go`, `service/account.go`): adjustment reference shape (account required, category/transfer refs forbidden, amount nonzero signed; positive-only enforced for the other three types); `UpdateAccount` accepts name only; error mapping unchanged (`code` + `message`)
- [x] 2.5 Transport (`transport/http/convert.go`, `accounts.go`): drop manualAdjustment fields from request/response mapping
- [x] 2.6 Sync path: account full-state payload without `manualAdjustment` (`repository/postgres/sync.go`); adjustment transactions flow as ordinary transaction upserts/tombstones (verify no type enum switch drops them)
- [x] 2.7 Tests: unit (service validation per shape/sign, account update name-only), repository (balance recompute with adjustment rows), e2e (create/edit/delete adjustment affects balance; adjustment in listing + type filter; account update rejects stale/no-op requests); remove all manualAdjustment test fixtures

## 3. Web

- [x] 3.1 `pages/accounts`: shrink `EditAccountForm` to the name field (drop the balance-adjustment input and `edit-account-schema` adjustment bits); fix the misnamed `openingBalance` field remnant
- [x] 3.2 Reconcile feature `pages/accounts/features/reconcile-account`: dialog per list/dialog convention (target balance input in account currency prefilled with computed balance, live delta preview line «+N будет добавлено» / «-N будет убрано», zero-delta «Баланс актуален» + disabled submit, optional note → `description`); computes delta client-side and calls the regular create-transaction mutation; trigger item «Сверить баланс» in `AccountCard` dropdown
- [x] 3.3 History + filters: `TransactionListItem` renders adjustment (badge «Корректировка», signed amount, no category); `TransactionTypeField` gains the fourth option; unfiltered listings include adjustment by default
- [x] 3.4 Adjustment edit form (`features/transaction/edit`): dedicated small form - signed amount, description, occurredAt, account; delete path already generic
- [x] 3.5 Aggregates: exclude `adjustment` from dashboard income/expense, analytics (overview + detail + category dialogs), plans figures - wherever income/expense/transfer are enumerated
- [x] 3.6 Sync conflict center: drop the manualAdjustment row from account conflict display (`features/sync-conflicts`)
- [x] 3.7 i18n (`packages/i18n` ru + en): reconcile dialog keys, badge/filter label «Корректировка», edit-form labels; remove obsolete `editAccount.openingBalanceLabel`; `pnpm i18n:lint` green

## 4. Mobile / shared packages

- [x] 4.1 `packages/local-data`: drop `manual_adjustment` column from `schema.ts` + local migration; update account repository mappers and sync full-state (`sync-data.ts`, `rebase`)
- [x] 4.2 `apps/mobile`: render adjustment rows in transaction lists (badge, signed amount, no category); exclude adjustment from cashflow/analytics selectors (`features/cashflow-overview/model/selectors.ts`, dashboard selectors); conflict center drops manualAdjustment; NO reconcile UI in this change
  - Mobile test baseline equals clean HEAD: the 3 red suites (analytics-screen, analytics-detail-screen, category-cashflow-sheet; 7 tests) are the documented date-fixture debt (`docs/technical-debt.md` → Mobile), red before this change. Edit-sheet adjustment branch keeps a signed amount round-trip; typing a leading "-" is not reachable on the decimal-pad keyboard (paste/hardware only) - full signed-amount UX lands with the deferred mobile reconcile work.
- [x] 4.3 `apps/web`/`packages` sweep for the removed `manualAdjustment` field on `Account` type (tests, mocks, fixtures) - type-check catches the rest

## 5. Verification & consistency

- [x] 5.1 Backend: `make gen-check`, `go vet/lint` (golangci), full `go test ./...` incl. e2e
- [x] 5.2 Workspace: `pnpm type-check`, `pnpm arch:check`, `pnpm knip`, `pnpm i18n:lint` all green
- [x] 5.3 Web E2E pass: reconcile flow (positive/negative/zero delta), adjustment visible in history + filterable + editable, edit-account form name-only, analytics figures unchanged by adjustment transactions
- [x] 5.4 Visual spot-check of the reconcile dialog (light/dark, mobile viewport) and history rows per the pixel standard
