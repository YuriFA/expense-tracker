# Proposal: web-dashboard-stat-card-navigation

## Why

The dashboard summary stat cards (accounts balance, period income, period expenses, net debts) are static displays. The natural next step after reading a figure is to drill into it, but the user must instead find the right screen in the sidebar. Making each card a link turns the overview into the navigation hub it already resembles (the other dashboard cards already offer «view all» header links).

## What Changes

- Each dashboard stat card becomes a single navigational link wrapping the whole card:
  - **Accounts balance** → `/accounts` (no query params; snapshot figure).
  - **Period income** → `/transactions?type=income&from=<month-start>&to=<month-end>`.
  - **Period expenses** → `/transactions?type=expense&from=<month-start>&to=<month-end>`.
  - **Net debts** → `/debts` (no query params; snapshot figure).
- The income/expense links carry the dashboard's currently selected month as `from`/`to` calendar days (local month bounds, the format the transactions screen already parses), so the opened list matches the figure on the card — including for past months.
- The whole card is the link target (hover ring + focus-visible affordance); the cards' presentational component (`StatCard.vue`) stays router-agnostic — links are composed in `DashboardPage.vue`.
- Existing «view all» links on the neighboring dashboard cards (accounts, debts, recent transactions) remain unchanged.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `web-screens`: the Dashboard overview requirement is extended — the stat cards SHALL be navigation links with the targets above, and month-scoped cards SHALL carry the selected month into the transactions filter.

## Impact

- `apps/web/src/pages/dashboard/ui/DashboardPage.vue` — wrap stat cards in `RouterLink` (v-for), compute per-card targets.
- `apps/web/src/pages/dashboard/ui/StatCard.vue` — unchanged (stays presentational).
- `apps/web/src/pages/dashboard/ui/DashboardPage.test.ts` — assert link hrefs (routes + type/from/to query).
- No API, backend, package, or mobile changes. The transactions screen already parses `type`/`from`/`to` from the URL query (`transactions-query.ts`), so no transactions-screen code changes are required.
