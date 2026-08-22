# Proposal: add-mobile-analytics

## Why

The mobile app's «Аналитика» tab is a shipped placeholder
(`ScreenPlaceholder`, "появится позже"): the product promises spending
insight but delivers none. Users can only see per-category totals for the
current month on the Home/Income screens; there is no way to view expense or
income distribution over a chosen week/month/year. Everything analytics needs
is already on-device — the offline-first SQLite store holds every transaction
with `type`, `categoryId`, and `occurredAt`, and the repository seam already
supports type + inclusive-date-range filtering — so the feature needs no
backend or OpenAPI change.

## What Changes

- **Analytics tab overview.** Replace the placeholder screen with two
  pressable summary cards — «Расходы» and «Доходы» — each showing a donut
  chart by category, a color-matched legend of top categories, and the
  direction total in the donut center.
- **Product decision: the tab cards show the current device-local month.**
  The tab has no period selector of its own; tapping a card opens that
  direction's detail screen.
- **One parametrized detail screen (expenses | income).** A new stack screen
  with a back header («Расходы»/«Доходы»), a week/month/year selector
  (default: month, current period), previous/next period arrows with a
  human-readable range label, a larger donut with the period range in its
  center, the direction total, and the full per-category breakdown (amount +
  percentage). One reusable screen driven by the direction parameter, not two
  parallel implementations.
- **Product decision: future periods are navigable.** Neither arrow is ever
  disabled; a future (or empty) period shows the empty state. This diverges
  deliberately from the Home screen's "no future months" rule, which stays
  unchanged for Home.
- **Product decision: period attribution is device-local calendar time;
  weeks start on Monday.** A transaction belongs to a period iff its
  occurred-at instant falls within that period in the device's local
  timezone, consistently across every period-scoped figure — the same rule
  the home screen already pins for months, extended to weeks and years.
- **New period model in `@expense-tracker/dates`.** A week/month/year cursor
  plus current/shift/range/label helpers, following the established
  superset-pre-filter + exact-local-trim pattern (`monthToUtcDayRange` +
  `transactionsInMonth`).
- **Client-side aggregation only.** A new `features/analytics` slice computes
  per-category totals in integer minor units from the existing filtered
  transactions query. Transfers are excluded (a transfer is neither income
  nor expense); no API, contract, or schema change.
- **Product decision: single-currency v1 totals.** Amounts are summed as-is
  in minor units with no conversion, per the existing Home-screen decision
  (`docs/product/mobile-home.md`), and displayed through the existing
  RUB/ru formatter.
- **Presentation caps: top-5 + «Прочие».** Donuts and card legends show at
  most five category segments plus an aggregated «Прочие» segment; the detail
  list shows every category with amounts and percentages. The «Все
  расходы»/«Все доходы» row is a non-interactive summary row (total, 100%),
  not a category filter.
- **New dependency: `@shopify/react-native-skia`.** The app's first
  chart-rendering dependency: a small purpose-built local `DonutChart`
  component, not a charting framework. Recorded here as the explicit adoption
  decision per the mobile AGENTS.md rule on major libraries.

## Capabilities

### New Capabilities

- `analytics`: mobile analytics screens — the tab overview cards and the
  period-scoped (week/month/year) expense/income breakdown by category,
  including period attribution, navigation, empty states, and presentation
  caps.

### Modified Capabilities

(none)

## Impact

- **Mobile (`apps/mobile`)**: replace the placeholder `pages/analytics` tab
  screen (keeping its `screen-analytics` testID); new stack route
  `src/app/analytics-detail.tsx` with `Stack.Screen` registration; new slice
  `src/features/analytics` (aggregation selectors, `DonutChart`, legend),
  added to `FEATURE_SLICES` in `.dependency-cruiser.mobile.cjs`; a Skia jest
  mock in `jest.setup.js`; new Maestro flow `12-analytics.yaml`. RU strings
  hardcoded with `TODO(i18n)` per the pending i18n wiring.
- **Shared package (`packages/dates`)**: new platform-agnostic period model
  and label helpers (no `@expense-tracker/api` import).
- **Dependencies**: add `@shopify/react-native-skia` (native module — iOS dev
  build rebuild required; not Expo Go).
- **Out of scope**: backend, OpenAPI contract, the web app, other chart types
  (line/bar), budgets/limits/insights, export (PDF/CSV), chart
  gestures/interactions, drill-down into transaction lists, category
  filtering or mutation from analytics, multi-currency conversion, i18n
  wiring, and the reference tab's third card «Расходы за год» behind a PRO
  badge — Pro/subscription functionality stays excluded from the product per
  the `docs/product/mobile-home.md` precedent (the reference tab bar's «Ещё»
  tab is likewise not adopted).
