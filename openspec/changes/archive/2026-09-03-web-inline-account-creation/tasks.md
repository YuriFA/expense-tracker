## 1. Entity foundation

- [x] 1.1 Move `createAddAccountSchema` (and `AddAccountFormValues`) from
      `apps/web/src/pages/accounts/features/add-account/model/add-account-schema.ts`
      to `apps/web/src/entities/account/model/` and export it from the
      `entities/account` public API; delete the page-local schema file and
      switch `AddAccountForm.vue` to the entity import (behavior unchanged;
      `AddAccountForm.test.ts` must pass as-is)
- [x] 1.2 Create `NewAccountDialog.vue` in `apps/web/src/entities/account/ui/`
      per design D3/D4: vee-validate + lifted schema, name Input, opening
      balance `NumberField` (default 0), submit via `useCreateAccount` +
      `toMinorUnits` + fixed `DEFAULT_CURRENCY`, `notification.success`
      (`addAccount.success`) / `notification.mutationError`
      (`feature: 'account'`, `action: 'create'`), emits
      `created: [Account]`, closes on success only; export from the slice
      public API
- [x] 1.3 Add i18n keys next to the existing `addTransaction.*` /
      `addAccount.*` groups (dialog title, new-account button aria-label;
      reuse `fields.name`, `fields.openingBalance`, `actions.create`) in all
      locales; run the locales test/gate
- [x] 1.4 Unit-test `NewAccountDialog` (open → invalid submit blocked →
      valid submit emits `created` and closes; mutation error keeps the
      dialog open), colocated in `entities/account/ui`

## 2. Creation forms

- [x] 2.1 Wire the "+" button and dialog into `CashflowForm.vue` next to
      `AccountSelect` (same row pattern as the category "+"); on `created`,
      `setValue('accountId', ...)` via the existing VeeField
- [x] 2.2 Wire per-selector "+" + dialog instances into `TransferForm.vue`
      for from and to; each `created` sets only its own triggering field
- [x] 2.3 Extend `CashflowForm.test.ts` / `TransferForm.test.ts`: the "+"
      affordance exists, inline creation auto-selects the new account in
      the triggering selector, previously entered values survive, transfer
      from ≠ to validation unaffected

## 3. Edit forms

- [x] 3.1 Wire the "+" + dialog into `CashflowEditForm.vue`,
      `TransferEditForm.vue` (both selectors), and `AdjustmentEditForm.vue`
      with the same auto-select contract
- [x] 3.2 Cover the edit wiring in the existing edit-form tests (one
      representative scenario per form)

## 4. Verification

- [x] 4.1 Full web quality gates: `pnpm lint`, `pnpm type-check` (or
      workspace equivalents), `pnpm test`, `pnpm knip`, `pnpm arch:check`
      (FSD legality of the new entity exports and feature imports)
- [x] 4.2 Manual E2E pass in the browser: fresh state with zero accounts →
      create transaction flow → "+" → create account (check toast,
      auto-select, amount currency follows the new account, entered values
      preserved) → submit; repeat for transfer (both selectors) and an edit
      form; confirm the /accounts page form still works identically after
      the schema lift
