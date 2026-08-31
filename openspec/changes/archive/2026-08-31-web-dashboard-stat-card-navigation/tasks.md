## 1. Dashboard stat card links

- [x] 1.1 In `DashboardPage.vue`, extend the `stats` computed with a per-card target: `/accounts` for balance, `{ path: '/transactions', query: { type: 'income', from, to } }` for income, same with `type: 'expense'` for expenses, `/debts` for debts — `from`/`to` are the selected month's first/last calendar day (`YYYY-MM-DD`), serialized per `serializeTransactionsQuery` conventions
- [x] 1.2 Wrap each `StatCard` in the `v-for` with a `RouterLink :to="stat.to"`, full-string Tailwind classes for block display, hover ring, focus-visible ring/outline and cursor pointer, per design.md
- [x] 1.3 Confirm `StatCard.vue` needs no changes (props and markup untouched)

## 2. Tests

- [x] 2.1 Update `DashboardPage.test.ts`: each rendered stat card is a link with the expected `href` (routes; income/expense include `type`, `from`, `to` of the current month; balance/debts have no date query)
- [x] 2.2 Add a case: after stepping the dashboard to a past month, the income/expense link `from`/`to` reflect the newly selected month

## 3. Verification

- [x] 3.1 `pnpm --filter web type-check && pnpm --filter web test` (or the workspace equivalents) pass
- [x] 3.2 Manual check in the running app: all four cards navigate correctly; from a past month the transactions list opens filtered to that month; hover/focus affordances render in light and dark themes
