## 1. Web overview card

- [x] 1.1 `AnalyticsOverviewCard.vue`: remove the `total > 0` branch - always render the donut row (`DonutChart` + center caption/total); render `ChartLegend` when entries exist, the muted empty-state message in the legend's place otherwise; empty donut `aria-label` = the empty-state message
- [x] 1.2 Update `AnalyticsPage.test.ts` empty-month test: donut present, empty-state message present, `chart-legend` absent, card still links to the detail screen; keep data-state tests green

## 2. Verification

- [x] 2.1 Run web unit tests + type-check + lint for touched files
- [x] 2.2 Browser check on `/analytics`: empty month renders neutral-ring donut with «0 ₽» center + message in the legend's place; card heights match the data card; theme (light/dark) sanity

## 3. Drift record

- [x] 3.1 Add mobile-divergence entry to `docs/technical-debt.md` + TODO at `emptyText` in `apps/mobile/src/pages/analytics/ui/analytics-screen.tsx`

## 4. Spec lifecycle

- [x] 4.1 `openspec validate web-analytics-empty-donut`, sync delta specs, archive the change
