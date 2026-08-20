# Design: add-mobile-income-screen

## Context

The dashboard's month-scoped composition (summary card, all-expenses card,
category section, plus their bottom sheets and selectors) lives entirely in
`pages/dashboard`. The income screen needs the same composition for income.
See proposal.md for motivation; the delta spec pins the product behavior.

Relevant constraints from the codebase:

- FSD (apps/mobile/AGENTS.md): pages must not import each other; reusable UI
  is promoted to `features/` only on genuine reuse — which the income screen
  now establishes.
- The filtered-query pattern (archived `mobile-dashboard-filtered-queries`
  change): screens fetch month-bounded supersets via
  `monthToUtcDayRange(cursor)`; exact local-month trimming stays in the
  selectors. The category expenses sheet already demonstrates query-level
  type filtering (`{ type: 'expense', categoryId, ...range }`).
- `TransactionQuery` (`packages/api`) already supports `type`, and the
  OpenAPI contract already carries `type`/`fromDate`/`toDate` on the
  transaction list — verified, nothing to regenerate.
- `useCategories(type?)` already filters categories client-side by type.

## Goals / Non-Goals

**Goals:**

- Income screen reusing the dashboard's composition with income-scoped data
  and fixed «Доходы» summary (no balance modes).
- Dashboard behavior, testIDs, and e2e flows unchanged after the refactor.

**Non-Goals:**

- No backend, OpenAPI, or `packages/*` changes.
- No dashboard UI redesign, no i18n wiring (RU strings with `TODO(i18n)`).
- No goals screen, no transactions-screen refiltering.

## Decisions

### D1: Promote shared components to `features/cashflow-overview`

Move the kind-agnostic part of `pages/dashboard` (summary card, all-X card,
expenses list sheet, category section + category sheets + category form,
selectors, and their tests) into a new `features/cashflow-overview` slice.
`mode-sheet` and the mode-switching wrapper stay in `pages/dashboard` —
balance modes are dashboard-only product behavior.

Alternatives: importing `pages/dashboard` from `pages/income` (violates the
FSD layer rule), duplicating the files (≈10 files of drift), or pushing them
to `entities` (too low-level: composite UI with sheets and forms;
`features/create-transaction` is the established precedent for sheet-based
features).

### D2: Parameterize by `kind: 'income' | 'expense'`

One variant per component; `kind` drives RU labels («Все доходы»,
«Доходов нет», «Список доходов», «получено» vs «потрачено», «Новый доход»
footer), selector type argument, the footer's `NewTransactionSheet` kind, and
testID prefixes. Labels live in a single per-kind record co-located with the
component to prevent grammar drift. Alternatives: parallel income-only
copies of every component (duplication), or generic label-bag props on every
component (pushes wording decisions to call sites for no reuse gain).

Visual parity: the «Все доходы» card keeps the dashboard card treatment
(`bg-success/10`); no new tokens.

### D3: Summary card is presentational

The shared `SummaryCard` takes `{ title, amountText, cursor, onPrevPeriod,
onNextPeriod, onTitlePress?, testIDPrefix }`; the chevron/title press
affordance renders only when `onTitlePress` is provided. The dashboard keeps
a thin wrapper owning the `SummaryMode` state and `ModeSheet` and computing
title/amount; the income screen passes a fixed «Доходы» title and the month
income total. Alternative: a kind-aware card with embedded modes — rejected
because it drags dashboard-only behavior into the shared feature and needs
`accounts` on a screen that has no use for them.

### D4: Selectors take the type as an argument

`expensesInMonth`/`totalExpenses`/`expenseDayGroups`/`latestExpense`/
`categoryBreakdown` generalize to
`cashflowInMonth`/`totalCashflow`/`cashflowDayGroups`/`latestCashflow`/
`categoryBreakdown` with an explicit `'income' | 'expense'` argument;
`monthlyBalance` and `totalBalance` move to `pages/dashboard/model` (only
the mode wrapper uses them). Selector tests move with them and keep their
expense cases by passing `'expense'`. Alternatives: income twin functions
(duplication of the day-grouping logic), predicate-parameterized helpers
(over-abstraction for exactly two kinds).

### D5: Income screen data wiring

`useTransactions({ type: 'income', ...monthToUtcDayRange(cursor) })` +
`useCategories('income')`; no `useAccounts()` (no balance modes). Selectors
still trim the UTC superset to the exact local month, so month-boundary
semantics match the home screen requirement. This mirrors the category
expenses sheet rather than the dashboard's untyped fetch, extending the
filtered-query direction deliberately.

### D6: testID policy — zero churn for expense, `income-*` for income

The existing ids (`home-summary-mode`, `home-all-expenses`,
`home-expenses-sheet`, `category-expenses-*`, `home-new-category`, …) stay
byte-identical for the expense kind so Maestro flows and unit tests pass
unedited. The income kind renders `income-*`, `category-incomes-*`, and
`income-new-category` ids via a per-kind prefix map inside the feature.
`CategoryForm`'s create-mode testID prefix becomes a prop (default unchanged).

### D7: Category form defaults per screen

`newCategoryDefaultValues.type` stays `'expense'`; `CategoryForm` gains
`defaultType?: CategoryType` threaded through `NewCategorySheet`, and the
income screen passes `'income'`. The type toggle remains, so the home screen
flow is untouched.

## Risks / Trade-offs

- [Large move breaks dashboard e2e] → Move files wholesale with renames
  limited to kind-generalization; keep expense testIDs/labels; run the full
  gate suite (`type-check`, `lint`, `test`, `test:e2e`) immediately after the
  move, before building the income screen.
- [Kind-conditional RU wording drifts between variants] → Single per-kind
  label record per component; income wording reviewed against the spec's
  income-only framing.
- [Knip flags orphaned barrels/re-exports after the move] → Run
  `pnpm knip` from the workspace root and delete dead files
  (e.g. dashboard `model/format.ts` if nothing imports it anymore).
- [Sheets mounted from a second host screen] → No new mechanism: the same
  `BottomSheetProvider` already hosts `features/create-transaction` sheets
  from multiple screens; testIDs are per-kind so Maestro selectors don't
  collide.

## Migration Plan

Single change, no data or schema migrations, no API contract edits. Order:
(1) promote + generalize the feature slice and re-point the dashboard —
suite green with zero dashboard behavior change; (2) build the income screen
and enable the quick action; (3) tests, Maestro flow, docs. Rollback is a
plain revert.
