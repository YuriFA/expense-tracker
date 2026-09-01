# Web Vue conventions

Canonical conventions for `apps/web` (Vue 3): the query idiom for async
state, the reactivity budget, forms, and list/dialog composition. FSD
placement and layering live in `apps/web/docs/ARCHITECTURE.md`; this document
covers the patterns inside components.

These are reference patterns extracted from the code as it exists — every
example cites its file. Adapt them; don't copy-paste.

---

## 1. Async state: the query idiom

Server/repository data goes through entity composables (Pinia Colada
`useQuery`/`useMutation`) — never hand-rolled loading refs.

- Canonical: `pages/dashboard/ui/RecentTransactions.vue` — three queries,
  `isLoading`/`error` as OR-aggregating computeds over their refs, one
  combined `refetch`.
- Registered deviation: `pages/settings/ui/SettingsPage.vue` keeps
  `sessions`/`sessionsLoading`/`revoking` refs plus `onMounted` and manual
  try/finally around a direct `sessionApi` call. The direct call is the
  sanctioned session-API exception (invariant #11); the manual loading-state
  shape is NOT a pattern to copy — new async state gets a query/mutation
  composable in the entity's `model/` segment.

The seam is fixed and must not be short-circuited: component →
`entities/<x>/model/use-*.ts` composable → `use<X>Repository()` (inject) →
repository implementation bound to the `apiClient`. No component imports a
repository, the `apiClient`, or `@expense-tracker/api` directly.

### Cache invalidation

Mutations invalidate every affected key in `onSettled`: transaction creates
invalidate `['transactions']` AND `['accounts']` — balances change
(`entities/transaction/model/use-transactions.ts`). A locale change
invalidates `['categories']` because category labels are locale-mapped
(`app/setup-i18n-locale-watcher.ts`). Optimistic updates go through
`shared/lib/use-optimistic-mutation.ts` (snapshot → patch → rollback on
error → invalidate on settle) — never ad-hoc `setQueryData` in components.

## 2. Reactivity budget

The entire app has exactly two production `watch()` calls, and both bridge
external systems: settings store → i18n global locale (`main.ts`), i18n
locale → category-cache invalidation (`setup-i18n-locale-watcher.ts`). That
is the budget to keep — a new `watch`/`watchEffect` must be justifying
itself against those two.

- Derived values are `computed` — never a `ref` kept in sync by a watch or
  an event: `entities/transaction/ui/TransactionListItem.vue` derives
  category/account/currency from props;
  `features/transaction/add/ui/CashflowForm.vue` derives `accountCurrency`
  from the watched account field + accounts data.
- Draft/commit UI state syncs through event handlers, not watchers:
  `pages/transactions/ui/TransactionsDateFilter.vue` copies the URL filters
  into the popover's draft in `handleOpenChange` and commits back on Apply —
  the draft is a `shallowRef`, everything derived from it is `computed`.
- The URL is the source of truth for list filters:
  `pages/transactions/model/use-transactions-filters.ts` parses
  `route.query` into a `computed` and mutates via `router.replace`.
- Watch out for `.value` snapshots breaking reactivity: passing
  `locale.value` into a non-reactive option freezes the result on the
  startup locale — see `useDateFormat(..., { locales: locale.value })` in
  `TransactionListItem.vue` (a registered trade-off, not a pattern to
  replicate).

## 3. Forms (vee-validate + Zod)

- Stack: `useForm({ validationSchema: toTypedSchema(createXSchema()) })`
  with a schema FACTORY in the feature's `model/` segment so messages
  re-resolve `t()` at form mount
  (`features/transaction/add/model/cashflow-schema.ts`); form value types
  infer from the schema.
- Money: majors (number) inside the form; `toMinorUnits` exactly once in the
  submit handler; `toMajorUnits` when loading edit values (invariant #2).
- Cross-field rules belong in the schema (`.refine`/`superRefine`), not in
  the submit handler. Registered deviation:
  `features/transaction/edit/ui/TransferEditForm.vue` checks
  transfer-accounts currency equality in the submit handler via
  `setFieldError` (it needs the accounts list); if you can express the rule
  in the schema, do.
- Failure: toast via `notification.mutationError` (code-keyed, never HTTP
  status); success: `emit('success')` to the parent; entered values are kept
  on error.
- Known trade-off: schema factories snapshot `t()` at creation — validation
  messages switch locale only on remount. Accepted; don't "fix" silently.

## 4. Lists and overlays

One overlay instance OUTSIDE the loop plus an "active item" ref:

- Canonical: `pages/dashboard/ui/RecentTransactions.vue` —
  `activeTransaction`/`pendingDeleteId` refs; row actions call
  `openEdit(item)`/`openDelete(item)`; the two dialogs render once after the
  list.
- Registered defect (technical-debt.md):
  `pages/transactions/ui/TransactionsItemsList.vue` renders
  `EditTransactionDialog` + `DeleteTransactionDialog` inside the per-row
  `#actions` slot, all bound to one shared `editOpen`/`deleteOpen` — every
  row instantiates its own pair and one toggle targets all of them. New list
  screens follow the RecentTransactions shape.
- Overlay container owns presentation and lifecycle; the inner form/list owns
  only its own state and submission. Use one `open` ref in the container,
  close on success there, and keep reusable form logic out of
  `responsive-dialog` / `drawer` specifics.
- Modal create/edit/detail/history surfaces use `shared/ui/responsive-dialog`:
  below 768px it renders the shared `drawer/`, at 768px+ the shared `dialog/`.
  Put title/description/actions in the container slots; account/category rows
  use the responsive select variant and day picking goes through
  `shared/ui/date-field`.
- Exemptions stay explicit at the call site: destructive confirms stay on
  `alert-dialog`, the command palette stays a centered `dialog`, and the
  transactions filters stay `drawer` below 768px plus right-side `sheet` at
  768px+. The plans form keeps its native `<input type="date">`, and the
  transactions range calendar stays the existing popover inside the filters
  drawer.

## 5. i18n and dates in components

- `useI18n()` only — `$t`/`$d`/`$n` in templates are eslint-banned; no raw
  text; `pnpm i18n:lint` runs the strict key checks.
- Dates: import only from `@/shared/lib/date` (invariant #14). The
  `@internationalized/date` adapter is app-local and isolated behind
  `BusinessDateAdapter`/`CalendarDay` so the planned migration onto
  `@expense-tracker/dates` touches one file; its types (`DateValue`) may
  appear only at the calendar bridge (`TransactionsDateFilter.vue`).
