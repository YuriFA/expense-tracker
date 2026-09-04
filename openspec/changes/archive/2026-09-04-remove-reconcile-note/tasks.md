## 1. Web reconcile form

- [x] 1.1 Remove the `note` field from `reconcile-account-schema.ts` (zod
      schema + `ReconcileAccountFormValues` narrows to `{ targetBalance }`)
- [x] 1.2 Remove the note `VeeField` block from `ReconcileAccountForm.vue`
      and send `description: ''` in the created adjustment
- [x] 1.3 Update `ReconcileAccountForm.test.ts`: drop the `#reconcile-note`
      interaction, assert `description: ''` on the created adjustment

## 2. i18n

- [x] 2.1 Remove `reconcileAccount.{noteLabel,notePlaceholder,noteTooLong}`
      from `packages/i18n/src/locales/ru.json` and `en.json` (leave the
      debts/plans `notePlaceholder` keys untouched)
- [x] 2.2 Grep the repo for the removed keys and `reconcile-note` to confirm
      no consumer remains

## 3. E2E and verification

- [x] 3.1 Update `apps/web/e2e/reconcile.spec.ts`: drop the
      `getByLabel('Note').fill(...)`, assert the adjustment row in history,
      fix the stale "badge + signed amount + note" comment
- [x] 3.2 Run web unit tests, `pnpm type-check` (web + i18n), lint, knip,
      and the reconcile e2e suite; all green
