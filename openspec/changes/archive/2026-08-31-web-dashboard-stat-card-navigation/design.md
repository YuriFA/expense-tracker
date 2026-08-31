# Design: web-dashboard-stat-card-navigation

## Context

The dashboard (`apps/web/src/pages/dashboard/`) renders four `StatCard.vue` instances from a `stats` computed in `DashboardPage.vue`. `StatCard` is purely presentational (props: label, amount, icon, tone) and is used only here. The transactions screen already deep-links via URL query: `parseTransactionsQuery`/`serializeTransactionsQuery` (`apps/web/src/pages/transactions/lib/transactions-query.ts`) read/write `type`, `from`, `to` as calendar days, and `AccountsCard` already links `/transactions?accountId=…`. Neighboring dashboard cards use explicit «view all» header `RouterLink`s. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Stat cards become single whole-card links with visible affordance (hover ring, focus-visible, cursor pointer).
- The opened screen shows the data behind the clicked figure, including the selected month for income/expenses.

**Non-Goals:**

- No changes to the analytics screens, the transactions screen's filter logic, the mobile app, or the existing «view all» links.
- No new query-parameter formats beyond what `transactions-query.ts` already parses.

## Decisions

- **Targets are the transactions list, not the analytics detail screens** (user decision). The transactions list is the actual drill-down (entries behind the sum), its URL filter already exists, and the analytics detail screen resets its period cursor on mount, which would show a different figure than the card.
- **Period carried as local calendar-day `from`/`to`** of the selected month (`YYYY-MM-DD`, first..last day), serialized the way `serializeTransactionsQuery` writes them. The transactions screen's date filter works in calendar days, so the list scope matches what the user reads as «июль» there. Alternative rejected: reusing the dashboard's `periodToUtcDayRange` — it is a query-range superset in UTC days, not the transactions screen's filter semantics. (Attribution of transactions to periods remains governed by the `analytics` capability, as already specced.)
- **Composition over component change**: `RouterLink` wraps `<StatCard>` inside the existing `v-for` in `DashboardPage.vue`; `StatCard` stays router-agnostic (FSD: a page-local presentational component should not know about routing). Alternative rejected: adding a `to` prop to `StatCard`.
- **Per-card target lives in the `stats` computed** next to label/amount/icon/tone (a `to` route-location object per stat), keeping one source of truth for card content.
- **Affordance styling** (design-level, not spec): Tailwind classes on the `RouterLink` — `block rounded-lg transition hover:ring-* focus-visible:ring-* focus-visible:outline-none cursor-pointer`, full class strings per the repo's Tailwind extraction convention.

## Risks / Trade-offs

- [UTC-day attribution vs calendar-day filter edge cases] → Pre-existing tension between analytics attribution and any calendar filter; the spec already pins figures to the `analytics` capability. The list scope matches the transactions screen's own month filter.
- [4 extra tab stops at the top of the page] → Acceptable: they are meaningful, labeled links; keyboard order matches visual order.
- [Double affordance with the cards below] → Accepted by decision: discoverability at the top outweighs duplication.

## Migration Plan

Pure frontend change; deploy with the regular web release. Rollback: revert the commit.

## Open Questions

None.
