## 1. Dashboard: category breakdown follows the period

- [x] 1.1 Replace `CategoryBreakdownCard`'s internal current-month cursor with the period range passed from `DashboardPage` (mirror `RecentTransactionsCard`'s `range` prop), so its query and selectors rekey on the selected month
- [x] 1.2 Extend `DashboardPage.test.ts`: switching the month rescopes the category breakdown together with the income/expense stats and recent transactions, while the accounts and debts snapshot figures stay unchanged
- [x] 1.3 Extend `e2e/dashboard-month-switcher.spec.ts` to assert the category breakdown re-scopes when stepping months (the seeded category row appears/disappears with the month)

## 2. Theme behavior tests (`web-theme` capability)

- [x] 2.1 Unit-test `app/theme.ts`: light/dark toggle the root `.dark` class; `system` resolves from `matchMedia` and reacts to preference changes live; explicit light/dark ignore the OS preference
- [x] 2.2 Unit-test `app/setup-theme-watcher.ts`: the persisted theme applies immediately (before first paint) and re-applies on every settings change
- [x] 2.3 Fix the stale capability name in the `app/setup-theme-watcher.ts` comment (`web-settings` → `web-theme`)

## 3. Occurrence date at creation (`web-screens` capability)

- [x] 3.1 Add form-level tests for `CashflowForm` and `TransferForm`: the date defaults to the form-open moment; picking a different day replaces the date part and preserves the open-time clock suffix

## 4. Validation

- [x] 4.1 `openspec validate add-web-theme-and-dashboard-behavior --strict` passes
- [x] 4.2 Web unit tests pass (`apps/web` vitest suite) and the `dashboard-month-switcher` e2e is green
