## 1. Contract (OpenAPI first)

- [x] 1.1 `docs/api/openapi.yaml`: reword `TransactionCreateRequest.accountId` (optional for income/expense, required for adjustment, forbidden for transfer), `TransactionUpdateRequest.accountId` (set-only: absent/`null` leaves the reference unchanged — clearing travels via the sync full-state replace), `TransactionSyncData` description; Redocly lint
- [x] 1.2 Regenerate: backend `make gen` (`make gen-check` clean) and TS `pnpm gen:api` (schema.ts committed)

## 2. Backend

- [x] 2.1 `internal/service/transaction.go`: `validateRefs` accepts a nil `accountID` for income/expense; `validateCashflowRefs` skips the account read/check when no account is referenced (category checks unchanged)
- [x] 2.2 `internal/service/sync_adapter_transaction.go`: `validateSyncRefs`/`validateSyncCashflowRefs` mirror the relaxation
- [x] 2.3 Backend tests: service create/update with account-less income/expense (incl. set/clear on update, balance unaffected), sync push of account-less cashflow, and rejection of account-less cashflow without a category

## 3. Shared packages

- [x] 3.1 `packages/api`: `CashflowTransaction.accountId: string | null`; `normalizeCashflowTransaction` accepts absent/null account; HTTP create mapper omits `accountId` when null; package tests
- [x] 3.2 `packages/local-data`: cashflow branch of `validateReferences` accepts a null account; `sync/sync-data.ts` `payloadToSyncData` treats cashflow without an account as valid; package tests (offline create, update clear, push payload, pull apply)

## 4. Mobile (minimum compliance)

- [x] 4.1 Compile-level adoption of the widened types (display sites handle null); forms unchanged; mobile type-check + tests green

## 5. Web

- [x] 5.1 `AccountSelect` gains the «Без счета» choice (creation + cashflow edit forms; NOT transfer/adjustment); add/edit cashflow schemas allow it; submit maps the choice to `accountId: null`; last-account memory honors it
- [x] 5.2 `TransactionListItem` shows «Без счета»; transactions screen account filter gains the «Без счета» entry (URL-driven filter + client matcher)
- [x] 5.3 Locales (ru/en) per web-locales conventions; unit tests for schemas, submit mapping, filter matcher
