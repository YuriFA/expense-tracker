## 1. OpenAPI contract (source of truth first)

- [x] 1.1 Remove the `GET /accounts/balances` path and the `AccountBalancesResponse` / `AccountBalance` schemas from `docs/api/openapi.yaml`; re-check that no app/package code consumes the endpoint; `npx @redocly/cli lint --config docs/api/redocly.yaml docs/api/openapi.yaml`
- [x] 1.2 Regenerate: `make gen` (backend) and `pnpm gen:api` (`packages/api`); verify `make gen-check` and the `ts-gen-check` inputs are clean

## 2. Backend endpoint removal

- [ ] 2.1 Delete the balances-summary code path: transport handler (`transport/http/accounts.go`), service `Balances` + `AccountBalances` struct, repository `GetAccountBalances`, the sqlc query, and `domain.AccountBalance`; drop now-unused imports
- [ ] 2.2 Update backend tests that referenced the endpoint or type (`server_test.go` and friends); `go build ./...`, golangci-lint, and the backend test suite pass

## 3. Shared money package

- [ ] 3.1 Change `DEFAULT_CURRENCY` from `USD` to `RUB` in `packages/money/src/currencies.ts`; update package tests; grep the workspace for other `DEFAULT_CURRENCY` consumers and align their expectations/fixtures

## 4. Web

- [ ] 4.1 Settings store: remove the `currency` field and its storage key from `use-settings-store` / `shared/config/settings.ts`; update store tests (stale localStorage key is ignored, not cleaned)
- [ ] 4.2 Settings page: remove the currency selector, the `currencies` computed, and the `formatNumber` helper; remove the `settings.currency` locale keys (ru + en); update page tests
- [ ] 4.3 Add-account form: drop `currency` from the form model and validation; the submit mapper sends `currency: DEFAULT_CURRENCY`; remove the `addAccount.currency*` locale keys; update form tests
- [ ] 4.4 Debts, plans, and analytics-detail dialogs: replace `settings.currency as CurrencyCode` with `DEFAULT_CURRENCY` imported from `@/shared/lib/money`; no template changes beyond the binding source
- [ ] 4.5 Dashboard net-worth empty state: `format(0, 'USD')` → `format(0, DEFAULT_CURRENCY)`; update affected tests
- [ ] 4.6 Web gates: `type-check`, unit tests, lint - all green; transfer forms keep their same-currency validation untouched

## 5. Mobile

- [x] 5.1 New-account form: remove the currency picker, its form-schema field, and validation; the submit mapper hardcodes RUB; the account-list currency label stays; update form tests
- [x] 5.2 Mobile gates: type-check, unit tests, lint - all green; transfer destination same-currency filter untouched

## 6. Docs and final validation

- [ ] 6.1 Add the multi-currency direction entry to `docs/assumptions.md`: two-amount transfers with a rate snapshot, per-currency totals converted into a display currency, rates sourced externally (source/storage undecided), currency-lessness of debts/plans flagged open
- [ ] 6.2 Sweep `docs/architecture/` (overview, invariants) and area AGENTS files for references to the removed balances endpoint or API `netWorth`; update stale mentions
- [ ] 6.3 Full workspace gates: `pnpm arch:check`, `pnpm knip`, `openspec validate currency-rub-only --strict`
