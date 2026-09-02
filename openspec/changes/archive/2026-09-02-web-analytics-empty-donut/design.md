## Context

The web `AnalyticsOverviewCard` currently branches on `total > 0`: with
data it renders `DonutChart` + `ChartLegend`; without data it renders a
`<p>` with the empty-state message. The shared `DonutChart` already has
the empty presentation built in (a single neutral `stroke-muted-foreground`
ring when no entries chart) - the detail screen relies on it. So the
change is removing the branch in the card, not adding chart machinery.

## Goals / Non-Goals

**Goals:**

- One layout path in `AnalyticsOverviewCard`: donut always renders; only
  the legend slot switches (`ChartLegend` when there are entries, the
  empty-state message when there are none).
- Empty cards keep the same height/structure as cards with data (donut is
  the size anchor), so the two-card grid stays visually stable.

**Non-Goals:**

- No change to `DonutChart` itself - the neutral ring already exists.
- No mobile change (`analytics-screen.tsx` keeps its text-only empty
  state; recorded in `docs/technical-debt.md`).
- No change to the detail screen, dashboard `CategoryBreakdownCard`, or
  `CategoryCashflowDialog` empty states.
- No i18n key changes - `analytics.emptyExpense` / `emptyIncome` stay in
  use, now rendered next to the chart instead of instead of it.

## Decisions

- **Legend slot swap, not a separate empty layout.** The non-empty layout
  is `flex items-center gap-6` with donut left, legend right. The empty
  state reuses it: donut left, muted message `<p>` right. Alternative
  rejected: centering the message under the donut - that reflows when the
  first transaction appears and duplicates the "card content jumped"
  problem this change removes.
- **Center content unchanged in the empty state.** The donut slot content
  (amount caption + total) renders with the zero total, so no conditional
  markup inside the chart. The message outside the chart carries the "no
  data" semantics.
- **Empty donut aria-label = the empty-state message** (same string as
  the visible `<p>`), so what sighted users see and what screen readers
  announce match. The card link's own aria-label keeps the existing
  `title, month, total` format (total is `0 ₽`).
- **Spec rewritten without platform qualifiers** (user decision): the
  tab-card clauses describe the new chart-based empty state; the mobile
  divergence is tracked in `docs/technical-debt.md` plus a TODO at the
  mobile `emptyText` site instead of platform-scoped spec wording.

## Risks / Trade-offs

- [Mobile spec drift goes silent after archive] → `docs/technical-debt.md`
  entry + TODO comment at the mobile `emptyText` definition point to the
  spec as the target state.
- [Empty cards grow taller than the old text-only cards] → accepted; it
  is the point of the change (stable structure, honest zero).
- [Screen-reader noise: chart image + visible message with the same text]
  → bounded (one element), and consistent visible/announced text beats a
  generic label.

## Migration Plan

Single web deploy; no data or API migration. Rollback is reverting the
component commit.
