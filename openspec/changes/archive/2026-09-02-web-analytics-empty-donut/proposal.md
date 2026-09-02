## Why

On the Analytics page, a month without movement in a direction collapses
the overview card to a bare text line («Нет расходов за этот период»).
The card loses its chart silhouette, changes height, and reads as
"missing content" instead of "zero for the period". Rendering the empty
chart keeps the page structure stable and shows the honest zero.

## What Changes

- The web Analytics overview cards (expenses / income) always render the
  donut chart; a period with no movement renders it as the single neutral
  grey ring (the empty state the shared `DonutChart` already supports,
  same as the detail screen).
- The donut center keeps the regular content in the empty state: the
  amount caption and the zero total («0 ₽»).
- The color-matched legend is not rendered when empty; the empty-state
  message («Нет расходов за этот период» / «Нет доходов за этот период»)
  is shown in the legend's place, next to the donut.
- The empty donut's accessible label is the empty-state message.
- Web only. The mobile tab cards keep their current text-only empty
  state; the divergence is recorded in `docs/technical-debt.md`.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `analytics`: the tab-card empty-state presentation requirement changes -
  an empty period renders the neutral-ring donut with the message in
  place of the legend, instead of replacing the chart with the message.

## Impact

- `apps/web/src/pages/analytics/ui/AnalyticsOverviewCard.vue` - drop the
  text-only branch, always render donut + (legend | message).
- `apps/web/src/pages/analytics/ui/AnalyticsPage.test.ts` - empty-month
  expectations flip (donut present, legend absent, message present).
- `openspec/specs/analytics/spec.md` - three clauses rewritten (scenario
  «Month without data», the tab-cards SHALL in «Donut presentation»,
  scenario «No chart without data (tab cards)»).
- `docs/technical-debt.md` + a TODO in
  `apps/mobile/src/pages/analytics/ui/analytics-screen.tsx` - mobile
  divergence record.
- No API, package, or data changes; i18n keys `analytics.emptyExpense` /
  `analytics.emptyIncome` stay in use.
