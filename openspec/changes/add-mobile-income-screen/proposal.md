# Proposal: add-mobile-income-screen

## Why

The home screen's «Доходы» quick action is disabled and its destination is a
placeholder; `docs/product/mobile-home.md` records the income screen as
"planned but not built". The dashboard answers "where did the money go" for
expenses, but the mirror question — "where did the money come from" — has no
screen on mobile. Per the repo rule that undefined product behavior must be
recorded as an explicit product decision, this change defines and ships the
income screen.

## What Changes

- **New income screen at `/income`** (stack screen, entered via the home
  quick action): mirrors the dashboard's month-scoped composition but for
  income only —
  - a summary card titled «Доходы» showing the income total for the selected
    month with prev/next month navigation and **no balance-mode switching**
    (the dashboard's month-balance/total-balance modes stay dashboard-only);
  - a «Все доходы» card with the latest income and a bottom sheet listing the
    month's incomes grouped by day with per-day totals;
  - a per-category breakdown of the month's incomes; tapping a category opens
    a detail sheet (own month navigator, period total, day-grouped list,
    newest/oldest sort).
- **Income-scoped data**: transactions come from the local repository filtered
  by `type: income` plus a UTC day range covering the selected local month;
  categories are filtered to `type: income`. Month attribution is identical to
  the home screen's (device-local calendar month, consistent across every
  month-scoped figure).
- **Category creation defaults to income** when started from the income
  screen (the type toggle remains available).
- **The «Доходы» quick action on the home screen is enabled** (currently
  disabled with a TODO).
- Internal refactor: the dashboard's summary/expenses/category components are
  promoted from `pages/dashboard` into a shared features slice parameterized
  by cashflow kind (income | expense), because the income screen reuses them
  and pages must not import each other. No user-visible change to the
  dashboard; its testIDs and behavior stay intact.

No backend or OpenAPI changes: the transaction list filters (`type`,
`fromDate`, `toDate`) already exist in the contract and in every repository
implementation (HTTP, SQLite, mock).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `mobile-local-data`: gains a new requirement "Income screen data behavior"
  defining what the income screen shows, its income-only scoping, and its
  month attribution (mirroring the existing "Home screen data behavior").

## Impact

- **Mobile (`apps/mobile`)**: `pages/income` (real screen replacing the
  placeholder), `pages/dashboard` (components promoted out to a features
  slice; quick action enabled; mode-switching wrapper stays local), new
  `features/cashflow-overview` slice, unit tests, new Maestro flow.
- **Docs**: `docs/product/mobile-home.md` (income action no longer a
  placeholder destination).
- **Out of scope**: backend, OpenAPI contract, `packages/*` (all needed
  filters and helpers already exist), the web app, the goals screen, mobile
  i18n wiring (RU strings stay hardcoded with `TODO(i18n)` markers).
