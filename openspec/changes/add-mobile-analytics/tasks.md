## 1. Period model (`packages/dates`, design D2)

- [x] 1.1 Add `packages/dates/src/period.ts`: `AnalyticsPeriodKind`, anchor-based `PeriodCursor`, `currentPeriod`, `shiftPeriod`, `isSamePeriod`, `periodToUtcDayRange` (inclusive UTC-day superset), `transactionsInPeriod` (exact local membership; weeks Monday-start via `weekStartsOn: 1`), `periodRangeLabel` (ru; year appended when the range spans calendar years); export from `src/index.ts`. No `@expense-tracker/api` import (leaf package).
- [x] 1.2 Add `apps/mobile/src/shared/lib/period.test.ts` reusing the per-zone child-process harness of `month-to-utc-day-range.test.ts`: Monday-start week ranges, week spanning Dec 31 → Jan 1, year wraparound, superset property vs `transactionsInPeriod` membership at boundary instants (00:30 local on the first day, 23:30 local on the last), ru label snapshots for week/month/year.
- [x] 1.3 Verify: `pnpm --filter @expense-tracker/dates type-check` and the new mobile test pass.

## 2. Skia dependency (design D3)

- [x] 2.1 `pnpm --filter mobile add @shopify/react-native-skia` pinned per Skia's Expo SDK 57 / RN 0.86 compatibility table; rebuild the iOS dev build (`pnpm ios`) and verify it boots.
- [x] 2.2 Add a `@shopify/react-native-skia` mock to `apps/mobile/jest.setup.js` (no-op Canvas that renders children), following the existing reanimated/expo-blur mock pattern.

## 3. Aggregation slice (`src/features/analytics`, design D4)

- [x] 3.1 Create the slice (barrel `index.ts`, `model/selectors.ts`): `categoryTotals(txs, categories, cursor, kind)` (exact-period trim, `type === kind` so transfers are excluded by construction, integer minor-unit sums, descending), `periodTotal`, `percentLabel` (two fractional digits, ru comma — "66,32%"), `toChartEntries(totals, { top = 5 })` aggregating the remainder into one «Прочие» entry.
- [x] 3.2 Add `src/features/analytics/config/other-entry.ts` with the neutral «Прочие» hex and register the file in the `design-tokens-guard` exemption list (same precedent as `entities/category/config/category-appearance.ts`).
- [x] 3.3 Add `'analytics'` to `FEATURE_SLICES` in the root `.dependency-cruiser.mobile.cjs` so the slice's internal imports pass `pnpm arch:check`.
- [x] 3.4 Unit tests for the selectors: per-category aggregation, transfer exclusion, empty/single/many categories, top-5 + «Прочие» capping and ordering, percent rounding, integer minor-unit sums.

## 4. Donut chart + legend (`src/features/analytics/ui`, design D3/D7)

- [x] 4.1 `donut-chart.tsx`: stroked Skia paths (butt caps) sized by each segment's integer share, small `gapDegrees` between segments (no gap for a single segment → full ring), RN children absolutely positioned as center content; props per design D3.
- [x] 4.2 `chart-legend.tsx`: color-dot rows mirroring exactly the chart entries (same colors, same order).
- [x] 4.3 Component tests (with the Skia mock; assert testIDs/labels, never pixels): center content renders, single-segment and multi-segment inputs map to the right entry lists, legend rows match entries.

## 5. Analytics tab screen (design D5–D8)

- [x] 5.1 Replace the placeholder body of `src/pages/analytics/ui/analytics-screen.tsx`: tab-root pattern (plain display title «Аналитика», no `ScreenHeader`), keep testID `screen-analytics`; two pressable cards (`analytics-card-expenses` / `analytics-card-income`, dynamic `accessibilityLabel` with month total) each rendering a small donut (center = `formatAmount` total) + legend via `toChartEntries`, fed by `useTransactions({ type, ...periodToUtcDayRange(currentPeriod('month')) })` and `useCategories()`; empty month replaces donut + legend with the muted empty message.
- [x] 5.2 Component tests with the mock repositories: month totals and legend render, empty-month empty state, card press opens navigation.

## 6. Detail screen + route (design D5–D8)

- [x] 6.1 Add the thin route `src/app/analytics-detail.tsx` and register `Stack.Screen name="analytics-detail"` in `src/app/_layout.tsx`; read `useLocalSearchParams<{ type }>()` with `'expense'` fallback.
- [x] 6.2 Build `src/pages/analytics-detail/ui/`: `<Screen topInset={false}>` + `ScreenHeader` («Расходы»/«Доходы» by direction) + `ScreenScrollView`; `useState` kind (default `'month'`) + cursor (default `currentPeriod('month')`), kind switch resets cursor, arrows `analytics-period-prev` / `analytics-period-next` step via `shiftPeriod`; total line («всего»), large donut with upper-cased `periodRangeLabel` center, three-way selector `analytics-period-week|month|year` (Button variant-swap pattern, `accessibilityState={{ selected }}`); breakdown list — `analytics-total-row` summary (checkmark, direction total, 100%) + `analytics-category-<id>` rows (color dot, name, `formatAmount`, `percentLabel`), all categories; empty-period state («Нет расходов за этот период» / «Нет доходов за этот период»).
- [x] 6.3 Wire the tab cards: `router.push({ pathname: '/analytics-detail', params: { type } })`.
- [x] 6.4 Component tests: default month period on open, kind switching resets to the current period, arrows update the range label, breakdown rows with amounts + percentages, future/empty period state.

## 7. Maestro E2E (design D9)

- [x] 7.1 Add `apps/mobile/.maestro/flows/12-analytics.yaml`: open the analytics tab → cards visible → open the expenses detail → back affordance → switch Неделя/Месяц/Год → step previous/next period → category rows and totals visible. Confirm `02-tab-navigation.yaml` stays green (placeholder testID retained).

## 8. Verification

- [x] 8.1 `pnpm --filter mobile type-check`, `pnpm --filter mobile lint`, `pnpm --filter mobile format`, `pnpm --filter mobile test` — green except two failures verified pre-existing on HEAD (design-tokens-guard: speed-dial.tsx raw rgba from commit 18c9c56; income-screen.test «Доходы» count) — both fail identically on a stashed clean tree. Also fixed the pre-existing jest.setup.js blur-mock lint errors (destructure-rename, semantics unchanged) and reverted oxfmt-only churn in 4 untouched files.
- [x] 8.2 Root `pnpm arch:check` green (new slice passes FSD rules); `pnpm knip` clean for all analytics files — remaining listed exports (NoteButton, entity type re-exports, CashflowKind) are pre-existing.
- [x] 8.3 `pnpm --filter mobile test:e2e` on the iOS dev build — new flow and all existing flows pass.
- [x] 8.4 Scope hold: no diffs under `backend/`, `docs/api/`, `packages/api/`, `apps/web/`; `packages/dates` changes limited to the period exports; RU strings hardcoded with `TODO(i18n)` markers.
