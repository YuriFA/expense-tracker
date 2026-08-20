## 1. Promote shared components to `features/cashflow-overview`

- [x] 1.1 Create `apps/mobile/src/features/cashflow-overview/` with barrel; move `pages/dashboard/model/selectors.ts` + `selectors.test.ts` there, generalizing `cashflowInMonth`/`totalCashflow`/`cashflowDayGroups`/`latestCashflow`/`categoryBreakdown` to take an explicit `'income' | 'expense'` argument (design D4); keep `monthlyBalance`/`totalBalance` in `pages/dashboard/model`
- [x] 1.2 Move and generalize the summary card into a presentational `SummaryCard` (`title`, `amountText`, `cursor`, `onPrevPeriod`, `onNextPeriod`, optional `onTitlePress`, `testIDPrefix`); keep `mode-sheet` + a dashboard-owned wrapper owning `SummaryMode` state in `pages/dashboard` (design D3)
- [x] 1.3 Move and kind-parameterize the all-X card, its types file, the day-grouped list sheet, the sheet footer (label prop), and `use-sheet-footer-scroll`; kind drives RU labels, `NewTransactionSheet` kind, and testID prefixes — expense ids byte-identical to today (design D2, D6)
- [x] 1.4 Move and kind-parameterize the category section, `category-row`, and the category detail sheet (query `type: kind`, «получено»/«потрачено», «Все доходы», footer CTA kind, `category-incomes-*` ids for income)
- [x] 1.5 Move `category-form`, `new-category-sheet`, `edit-category-sheet` + their tests; add `defaultType?: CategoryType` threaded through `NewCategorySheet` → `CategoryForm` (default stays `'expense'`; design D7)
- [x] 1.6 Re-point `pages/dashboard` at the feature (screen + tests), delete dead files (e.g. `model/format.ts` if orphaned), run `pnpm knip` from the workspace root; dashboard testIDs and behavior unchanged

## 2. Income screen

- [x] 2.1 Replace the placeholder in `pages/income/ui/income-screen.tsx`: month cursor state, `useCategories('income')`, `useTransactions({ type: 'income', ...monthToUtcDayRange(cursor) })` (no accounts query); render the three components with fixed «Доходы» title and month income total (design D5)
- [x] 2.2 Remove `disabled` + TODO from the «Доходы» quick action chip in `pages/dashboard/ui/quick-actions-row.tsx`
- [x] 2.3 Add a navigation header with a back button (`income-back`, `router.back()`) to the income screen — it is a stack destination without the tab bar

## 3. Tests and e2e

- [x] 3.1 Unit coverage for income kind: selector cases with `'income'` (excludes expenses/transfers, month boundary), per-kind labels, `defaultType: 'income'` create flow
- [x] 3.2 `pages/income/ui/income-screen.test.tsx`: «Доходы» title, month total rendering, prev/next month navigation, no mode-switch affordance
- [x] 3.3 Maestro flow `apps/mobile/.maestro/flows/11-income.yaml`: home → «Доходы» chip → summary/category asserts, month navigation, «Все доходы» sheet; `pnpm test:e2e` green (incl. existing dashboard flows unedited)

## 4. Docs and validation

- [x] 4.1 Update `docs/product/mobile-home.md`: income action no longer a placeholder destination
- [x] 4.2 Full gates in `apps/mobile`: `pnpm type-check && pnpm lint && pnpm format && pnpm test && pnpm test:e2e`; optionally `pnpm exec expo export --platform ios`
- [x] 4.3 `openspec validate add-mobile-income-screen` passes
