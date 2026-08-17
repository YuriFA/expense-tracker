# Tasks: migrate-mobile-forms-to-rhf-zod

Reference `design.md` (D1–D9) for how, `specs/mobile-forms/spec.md` for the
behavior contract, and `apps/mobile/docs/conventions/forms.md` for the worked
examples. Every step must keep `pnpm type-check`, `pnpm lint`, `pnpm format`,
and `pnpm test` green in `apps/mobile` before it is reported done.

## 1. Login screen (first migration, clears knip tolerance)

- [x] 1.1 Create `apps/mobile/src/pages/login/model/schema.ts`: Zod schema
  with `email` and `password` non-empty (per-field RU messages,
  `TODO(i18n)` convention), `LoginFormValues` via `z.infer`. No email-format
  rule — none exists today (design D5).
- [x] 1.2 Rewrite `login-screen.tsx` around
  `useForm({ resolver: zodResolver(schema), defaultValues })` with direct
  `Controller` props (§1 pattern, no `FormProvider`): per-field
  `FormError`/label tint/`invalid` (new testIDs `login-email-error`,
  `login-password-error`); submit
  control per the uniform pending contract (design D2):
  `loading={formState.isSubmitting}`, `disabled={formState.isSubmitting}`
  (no mutation object), deleting the hand-rolled `isLoading` flag;
  `handleSubmit` calls `login(email.trim(), password)`,
  catches and maps failures via `form.setError('root', …)` with
  `getRepositoryErrorText`, rendered at the existing `login-error-text`
  testID; preserve `router.back()` on success and the cancelled
  ownership-takeover stay-on-screen path; keep all existing testIDs
  (`login-email-input`, `login-password-input`, `login-submit-button`).
- [x] 1.3 Add `login-screen.test.tsx` (mocked `useAuth`): empty submit is
  blocked with both field errors visible; valid input submits trimmed email
  + password; a thrown `RepositoryError` surfaces at `login-error-text` with
  values preserved; the cancelled-takeover `AuthResult` keeps the screen
  mounted; pending state blocks a double submit.
- [x] 1.4 Delete the `react-hook-form`/`zod`/`@hookform/resolvers`
  `ignoreDependencies` entry from root `knip.json` (comment
  `adopt-rhf-zod-forms: remove when the first form imports them`) and verify
  `pnpm knip` passes from the workspace root.

## 2. Register screen

- [x] 2.1 Create `apps/mobile/src/pages/register/model/schema.ts`: email/
  password/confirmPassword non-empty; `password` `min(8)` with today's
  message; object-level `.refine` that `confirmPassword === password`
  surfaced on the confirm field (`'Пароли не совпадают'` wording preserved
  from the current screen).
- [x] 2.2 Rewrite `register-screen.tsx` with the same structure as task 1.2
  (new per-field testIDs `register-email-error`, `register-password-error`,
  `register-confirm-error`; root error keeps `register-error-text`; submit
  calls `register(email.trim(), password)`; `router.back()` on success).
- [x] 2.3 Add `register-screen.test.tsx`: mismatched confirm blocks submit
  with the confirm-field error visible; short password blocks with its
  message; valid input submits; server error surfaces at the root testID
  with values preserved; pending blocks duplicates.

## 3. New account sheet

- [x] 3.1 Create `apps/mobile/src/pages/accounts/model/schema.ts`: `name`
  trimmed non-empty (`'Введите название счёта'`); `currency` enum default
  `'RUB'`; `openingBalance` string refined to
  `parseMajorUnitsToMinor(value) !== null` (`'0'` valid, unparseable fails
  with `'Некорректная сумма'`) — the predicate carried over verbatim from
  today's `parsedBalance === null` guard, no new business rules (design D6);
  `NewAccountFormValues` via `z.infer`.
- [x] 3.2 Split `new-account-sheet.tsx` into presentation container +
  `new-account-form.tsx` owning its `useForm` (design D4): text fields use
  `BottomSheetInput`; currency button row and name/balance fields become
  `Controller`s with per-field errors (`accounts-create-name-error`,
  `accounts-create-opening-balance-error` — the balance field gains the
  error affordance it lacks today); named `toAccountPayload(values)` mapper
  does the minor-units conversion; submit control per the uniform pending
  contract (design D2): `loading={formState.isSubmitting ||
  mutation.isPending}`, `disabled={mutation.isPending}`; server errors via
  `setError('root')` at
  the existing `accounts-create-error` testID; on success
  `form.reset(defaultValues)` then `onSuccess()` (container dismisses,
  keeping the `TODO(sheet-dismiss)` note); keep all existing testIDs.
- [x] 3.3 Add `new-account-form.test.tsx` (reuse the provider harness):
  empty name / unparseable balance block submit with visible field errors;
  `'100,50'` submits `openingBalance: 10050` minor units; server error
  surfaces at the root testID with values preserved; success resets fields;
  pending blocks duplicates. Keep `accounts-screen.test.tsx` green (update
  assertions only where the observable behavior legitimately changed).

## 4. New category sheet

- [x] 4.1 Create `apps/mobile/src/pages/dashboard/model/schema.ts`: `name`
  trimmed non-empty; `type`/`icon`/`color` with today's defaults and no
  error paths; `NewCategoryFormValues` via `z.infer`.
- [x] 4.2 Split `new-category-sheet.tsx` into container +
  `new-category-form.tsx`: type toggle, icon picker, and color picker become
  `Controller`s; name field gets per-field error
  (`home-new-category-name-error`); submit control per the uniform pending
  contract (design D2, as in task 3.2); server errors via `setError('root')` at
  the existing `home-new-category-error` testID; reset + `onSuccess` as in
  task 3.2; keep all existing testIDs
  (`home-new-category-type-*`, `home-new-category-icon-*`,
  `home-new-category-color-*`, `home-new-category-submit`).
- [x] 4.3 Add `new-category-form.test.tsx`: empty name blocks submit with
  the error visible; valid input submits name/type/icon/color; server error
  surfaces at the root testID; success resets; pending blocks duplicates.
  Keep `dashboard-screen.test.tsx` green.

## 5. New transaction form (flagship)

- [x] 5.1 Create `apps/mobile/src/features/create-transaction/model/schema.ts`:
  `z.discriminatedUnion('kind', …)` — `expense`/`income` variants with
  `amount` + `accountId` + `categoryId`, `transfer` with `amount` +
  `fromAccountId` + `toAccountId`; `amount` refined to a parseable value of
  at least 1 minor unit (`'Введите сумму'` / `'Некорректная сумма'`) —
  exactly today's `parsedAmount !== null && parsedAmount >= 1` guard
  carried over verbatim, no new business rules (design D6);
  per-mode selection messages (`'Выберите счёт'` etc.); mode-specific field
  messages preserved from current UX intent; `CreateTransactionFormValues`
  via `z.infer`; one `defaultValues` constant per `kind`.
- [x] 5.2 Create field components in
  `features/create-transaction/ui/` — `AmountField`,
  `AccountField`/`FromAccountField`/`ToAccountField`, `CategoryField` —
  consuming `useFormContext<CreateTransactionFormValues>` (conventions §2):
  `BottomSheetInput` for amount, existing `OptionRow`/`OptionChip` rendering
  for selectors, per-field `FormError`s with
  `new-transaction-<field>-error` testIDs; transfer destination filtering
  (same currency, distinct from source) stays in the option-list derivation
  unchanged; keep the existing selector testIDs
  (`new-transaction-account-<id>` etc.).
- [x] 5.3 Create `new-transaction-form.tsx` with
  `FormProvider` + `useForm`: `defaultValues` memoized on `kind`, re-init
  via `useEffect(() => form.reset(defaultValues), [defaultValues, form])`;
  `handleSubmit` narrows on `values.kind` (no `as string`/`!` assertions),
  builds the payload through the named `toTransactionPayload(values)` mapper
  (minor-units conversion, `occurredAt` as today), calls `mutateAsync`;
  on failure `setError('root')` rendered at the existing
  `new-transaction-error` testID; submit control per the uniform pending
  contract (design D2): `loading={formState.isSubmitting ||
  mutation.isPending}`, `disabled={mutation.isPending}`; on success a
  **full** `form.reset(defaultValues)` then `onSuccess()`.
- [x] 5.4 Slim `new-transaction-sheet.tsx` down to the presentation
  container (ref, snap points, header, dismiss-on-success with the
  `TODO(sheet-dismiss)` note) rendering `<NewTransactionForm kind={kind}
  onSuccess={handleSuccess} />`; the sheet keeps its file name, props, and
  testIDs so routes and SpeedDial wiring are untouched.
- [x] 5.5 Rewrite/extend `new-transaction-sheet.test.tsx`: amount `'0'`
  submit is blocked with the field error visible (replaces the old
  disabled-button assertion); expense `'250,00'` submits `amount: 25000`
  with the expected payload shape; transfer lists only same-currency
  distinct destinations (kept); transfer with a missing account blocks with
  its field error; switching `kind` re-initializes the form; a successful
  submit fully resets (selections do not survive); server error surfaces at
  the root testID with values preserved; pending blocks duplicates.

## 6. Docs and housekeeping

- [x] 6.1 Reconcile `apps/mobile/docs/conventions/forms.md` with the real
  migrated code (design D9): snippet prop names, the D3 testID conventions,
  and any friction between §1–§5 and the actual forms — fix the doc or the
  code where the code revealed a gap, keeping the doc canonical. Also unify
  the §1–§3 pending snippets onto the design D2 contract (§2/§3 currently
  omit `disabled`).
- [x] 6.2 Only if Jest hits ESM transform failures on the new imports:
  allowlist the affected packages in `apps/mobile/jest.config.js`
  `transformIgnorePatterns` (pre-approved by the adopting change's task
  1.4). Skip if tests run clean.
- [x] 6.3 Record for the archive step: after this change archives, update
  the `openspec/specs/mobile-forms/spec.md` Purpose to drop the "forms not
  yet migrated are out of scope" sentence (the delta carries the
  requirement change; Purpose is edited in the main spec directly).

## 7. E2E / Maestro

- [x] 7.1 Review the existing flows that exercise migrated forms
  (`05-add-account.yaml`, `06-add-category.yaml`, `07-add-expense.yaml`,
  `09-sync-signin.yaml`) against the migrated behavior: selectors unchanged,
  valid-data fills still submit under pending-only disabling. Update flow
  steps only where the observable behavior legitimately changed — never
  weaken assertions or the `TODO(sheet-dismiss)` workaround.
- [x] 7.2 Extend `07-add-expense.yaml` to cover submit-driven validation
  (design D2): tap the submit control while the amount is empty, assert the
  `new-transaction-amount-error` field error is visible, then fill valid
  data and complete the existing flow.
- [x] 7.3 Extend `05-add-account.yaml` the same way for the error
  affordance the opening-balance field gains: submit with an unparseable
  balance, assert `accounts-create-opening-balance-error` is visible, then
  complete the valid path.

## 8. Verification (full gates)

- [x] 8.1 In `apps/mobile`: `pnpm type-check`, `pnpm lint`, `pnpm format`
  all pass.
- [x] 8.2 In `apps/mobile`: `pnpm test` passes with the new and rewritten
  form tests.
- [x] 8.3 From the workspace root: `pnpm knip` passes with no tolerance
  entry for the three form packages.
- [x] 8.4 In `apps/mobile`: `pnpm test:e2e` passes strictly via the script
  (never bare `maestro test`) with the updated flows from group 7; the
  `TODO(sheet-dismiss)` workaround in flows is not weakened.
- [x] 8.5 In `apps/mobile`: `pnpm exec expo export --platform ios`
  succeeds.
- [x] 8.6 Final sweep: no hand-rolled form state remains — none of the five
  forms (or their split form components) uses per-field/error `useState`
  for form state; no non-null assertions on mode-specific transaction
  values; all Maestro-pinned testIDs unchanged.
