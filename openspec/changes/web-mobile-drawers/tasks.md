# Tasks: web-mobile-drawers

## 1. Shared primitives

- [x] 1.1 Create `apps/web/src/shared/ui/drawer/` on reka-ui Drawer parts (no
      new dependency): Drawer, DrawerContent, DrawerHeader, DrawerFooter,
      DrawerTitle, DrawerDescription, DrawerClose + folder `index.ts` barrel,
      styled like `sheet/` (drag handle, bottom edge, inner scroll with a
      dvh-bounded max height, `env(safe-area-inset-bottom)`, tw-animate-css
      classes)
- [x] 1.2 Create `apps/web/src/shared/ui/responsive-dialog/`:
      `v-model:open` + title/description/default/footer slots; below 768px
      (`useMediaQuery('(min-width: 768px)')`) renders the drawer
      presentation, at 768px+ the existing `dialog/`; no new `watch()`; must
      let tests pin the presentation (matchMedia stub or injectable override)
- [x] 1.3 Add a responsive variant to `shared/ui/select/`: desktop keeps the
      reka Select presentation, mobile renders a trigger + stacked drawer
      list; API-compatible with the current `Select.vue`
- [x] 1.4 Rewire `apps/web/src/entities/account/ui/AccountSelect.vue` and
      `apps/web/src/entities/category/ui/CategorySelect.vue` to the
      responsive variant (their consumers unchanged)
- [x] 1.5 Create `apps/web/src/shared/ui/date-field/`: desktop Popover+
      Calendar (today's inline pattern), mobile quick-date chips + calendar
      drawer; rewire `features/transaction/add/ui/CashflowForm.vue`,
      `features/transaction/add/ui/TransferForm.vue`,
      `pages/transactions/ui/FilterCustomDate.vue` (`PlanFormDialog`'s native
      date input stays)

## 2. Pilot — add transaction (gate before rollout)

- [x] 2.1 Migrate `features/transaction/add/ui/AddTransactionDialogHost.vue`
      to `responsive-dialog`
- [x] 2.2 Migrate `features/transaction/add/ui/NewCategoryDialog.vue` and
      verify dialog-in-drawer stacking
- [x] 2.3 Pilot checklist at 390×844 (browser + PWA standalone): stacked
      picker drawers (account, category, date) open/close cleanly; the whole
      open stack stays exposed to the accessibility tree; keyboard and scroll
      behave inside `dvh`-bounded drawers; safe-area padding correct;
      swipe-down dismisses; desktop behavior unchanged — fix primitives
      before starting §3

## 3. Rollout — remaining overlay surfaces → responsive-dialog

- [x] 3.1 `features/transaction/edit/ui/EditTransactionDialog.vue` (migrate
      as-is; the shared-open defect in `TransactionsItemsList.vue` stays
      registered debt)
- [x] 3.2 Accounts:
      `pages/accounts/features/add-account/ui/AddAccountDialog.vue`,
      `pages/accounts/features/edit-account/ui/EditAccountDialog.vue`,
      `pages/accounts/features/reconcile-account/ui/ReconcileAccountDialog.vue`
- [x] 3.3 Debts: `pages/debts/ui/DebtorFormDialog.vue`,
      `pages/debts/ui/DebtorHistoryDialog.vue`,
      `pages/debts/ui/NewDebtorDebtDialog.vue`,
      `pages/debts/ui/OperationFormDialog.vue` (inner delete AlertDialogs
      stay centered)
- [x] 3.4 Plans: `pages/plans/ui/PlanFormDialog.vue`,
      `pages/plans/ui/ConfirmPlanDialog.vue`,
      `pages/plans/ui/PlansListDialog.vue`
- [x] 3.5 Settings/household:
      `pages/settings/features/household-code/ui/HouseholdCodeDialog.vue`,
      `pages/settings/features/household-invitations/ui/HouseholdInvitationsDialog.vue`,
      `pages/settings/features/invite-member/ui/InviteMemberDialog.vue`,
      `pages/settings/features/join-household/ui/JoinHouseholdDialog.vue`,
      `pages/settings/features/rename-household/ui/RenameHouseholdDialog.vue`
- [x] 3.6 `features/household-join/ui/HouseholdChoiceDialog.vue`,
      `features/sync-conflicts/ui/ConflictCenter.vue`,
      `pages/analytics-detail/ui/CategoryCashflowDialog.vue`
- [x] 3.7 `widgets/mobile-shell/ui/SpeedDialFab.vue` per-kind add dialogs
- [x] 3.8 Exempt surfaces stay untouched: the 6 AlertDialogs
      (OwnershipGateDialog, DeleteTransactionDialog, DeleteAccountDialog,
      DissolveHouseholdDialog, LeaveHouseholdButton, RemoveMemberDialog),
      `widgets/command-palette/ui/CommandPalette.vue`, and the
      Popover+RangeCalendar in `pages/transactions/ui/TransactionsDateFilter.vue`

## 4. Filters

- [x] 4.1 `pages/transactions/ui/TransactionsFiltersSheet.vue`: below 768px a
      bottom drawer (drop the `sm:max-w-[400px]` right-panel sizing on
      mobile), keep the right-side Sheet at 768px+

## 5. Tests

- [x] 5.1 Unit tests for `drawer/`, `responsive-dialog/`, the responsive
      select variant, and `date-field/` (Vitest + mount-with-providers;
      Teleport-aware mounting for drawers)
- [x] 5.2 Update existing dialog test files affected by the import swap;
      desktop-presentation assertions keep passing
- [x] 5.3 e2e: update backendless + PWA specs that assert dialog presentation
      at phone widths; add drawer/stack coverage per the spec scenarios
      (form → drawer on phone, centered dialog on desktop, confirms stay
      centered, picker stacks, stack a11y)

## 6. Docs & conventions

- [x] 6.1 `apps/web/docs/conventions/vue-patterns.md` §4: overlay conventions
      (container owns presentation/lifecycle, form owns state;
      responsive-dialog usage; the exemption list)
- [x] 6.2 `apps/web/docs/ARCHITECTURE.md`: shared/ui list + the
      viewport-aware overlay decision
- [x] 6.3 Update code comments citing the superseded D1
      (`pages/debts/ui/DebtorHistoryDialog.vue:29`,
      `pages/analytics-detail/ui/CategoryCashflowDialog.vue:31`)
- [x] 6.4 i18n keys for any new a11y labels (`packages/i18n` ru/en) +
      `pnpm i18n:lint`

## 7. Gates & finalize

- [x] 7.1 Checks: web type-check, oxlint+eslint, `pnpm test:unit`,
      `pnpm exec steiger src` (in apps/web); `pnpm knip`, `pnpm arch:check`
      (workspace root); backendless + PWA e2e suites
- [ ] 7.2 openspec sync-specs (delta → `openspec/specs/web-screens/spec.md`),
      then archive the change
