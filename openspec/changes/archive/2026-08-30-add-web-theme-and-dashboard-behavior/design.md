## Context

The behavior being specified already ships in `apps/web` (commits c8cb2823..HEAD, the
direction-D restyle). The theme bridge lives in `app/theme.ts` +
`app/setup-theme-watcher.ts` (app-level watcher, `.dark` root class, localStorage via the
settings store); the dashboard month navigator is `pages/dashboard/ui/PeriodNav.vue` driven
by a `PeriodCursor` ref in `DashboardPage.vue`, with month-scoped queries rekeyed through
`useTransactions`; the creation forms capture `nowIsoString()` at open and let a day-level
calendar replace the date part while preserving the open-time clock suffix. See
proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Capture the shipped theme, dashboard, and occurrence-date behavior in specs so the
  specs match the product.
- Align the one inconsistency found while capturing: the dashboard category breakdown
  card must follow the period cursor like the other month-scoped figures.

**Non-Goals:**

- No behavioral changes beyond the breakdown card fix; no API, backend, mobile, or
  shared-package changes.
- Not spec-ing the multi-select transaction filters, the analytics percent rounding, or
  the category icon/color pairing (reviewed separately, judged UI-level for now).

## Decisions

- **New capability `web-theme` instead of extending `web-screens` or creating a broad
  `web-settings` capability.** Theme is a persisted, browser-local appearance concern
  that parallels `web-locales` (which owns the locale setting the same way); `web-screens`
  stays about screens and navigation. A broader `web-settings` capability was considered
  and rejected: only theme and locale are settings today and locale is already owned.
  The comment in `app/setup-theme-watcher.ts` mentions a `web-settings` capability that
  never existed — fix the comment to `web-theme` during apply.
- **Dashboard requirements live in `web-screens` as ADDED requirements** and reference
  the `analytics` (period attribution) and `app-currency` (ruble formatting)
  capabilities rather than duplicating their rules.
- **Forward step bounded at the current month is captured as intended behavior**, a
  deliberate divergence from the analytics detail screens (where future periods are
  reachable): the dashboard is a current-state-plus-recent-history overview, and an empty
  future month adds nothing there.
- **Breakdown card fix: the page owns the cursor.** `CategoryBreakdownCard` receives the
  selected period cursor from `DashboardPage` (the same page-owns-the-period pattern as
  `RecentTransactionsCard`'s `range` prop; the cursor is passed because the analytics
  selectors attribute by cursor) instead of computing `currentPeriod('month')` internally.
  A reactive cursor inside the card was rejected — the page already owns the cursor and
  the query rekeying, and a second independent cursor would re-introduce the drift.

## Risks / Trade-offs

- [Retroactive specs drift from code if behavior changes later] → the dashboard
  behaviors are covered by unit tests (`DashboardPage.test.ts`, `PeriodNav.test.ts`) and
  e2e (`dashboard-month-switcher.spec.ts`); keep them aligned when touching the
  dashboard.
- [Breakdown fix changes a shipped visual behavior] → it is scoped to the card's data
  scoping only (composition and styling unchanged), and the change was explicitly
  approved as part of this proposal.

## Migration Plan

None — no data, schema, or API changes. Rollback of the code fix is a single-component
revert.
