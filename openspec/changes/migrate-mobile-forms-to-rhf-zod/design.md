# Design: migrate-mobile-forms-to-rhf-zod

## Context

See `proposal.md` for motivation. Facts that shape the design:

- The stack, conventions, and spec already exist: `react-hook-form@^7` +
  `zod@^4` + `@hookform/resolvers@^5` are installed; canonical worked
  examples live in `apps/mobile/docs/conventions/forms.md` (§1 page form,
  §2 FormProvider + discriminated union, §3 sheet split + reset lifecycle,
  §4 values→payload mapper, §5 server errors); `openspec/specs/mobile-forms`
  prescribes the target behavior. This change applies them — it must not
  re-derive patterns.
- Exactly five hand-rolled forms exist (repo-wide sweep): `login-screen`,
  `register-screen`, `new-account-sheet`, `new-category-sheet`,
  `new-transaction-sheet`. All already render through the shared
  `FormField`/`FormLabel`/`FormError` primitives, and `Input` is controlled
  with an `invalid` prop — the presentation layer is migration-ready.
- Non-form UI state (month cursors, mode sheets, delete-error banners,
  placeholder screens) is out of scope per the spec's "simple controls stay
  local" scenario.
- Knip still tolerates the three packages
  (`ignoreDependencies` in root `knip.json`) until the first import lands.
- Maestro flows (`05-add-account`, `06-add-category`, `07-add-expense`,
  `09-sync-signin`) pin the existing testIDs and fill only valid data.

## Goals / Non-Goals

**Goals:**

- Bring all five forms into compliance with `mobile-forms` using the
  documented conventions verbatim, preserving each form's validation rules,
  submitted payloads, and user-facing testIDs.
- Give every migrated form the behavioral test coverage the spec requires
  (the two auth screens get their first tests).
- Clear the adoption debt: knip tolerance removed, conventions doc
  reconciled against real code.

**Non-Goals:**

- No new validation rules (no email-format check, no password-strength
  policy) — rules are migrated as-is; tightening them is a separate product
  decision.
- No new shared UI primitives, no changes to `Input`, `BottomSheetInput`,
  `Button`, or the form primitives — they already fit the `Controller`
  binding.
- No changes to non-form UI state, repository hooks, sync, navigation, or
  the auth model (`useAuth` keeps its `AuthResult`/throw contract).
- No `apps/web`, `packages/*`, backend, or OpenAPI changes.

## Decisions

### D1. Migration order and per-form target shape

Migrate smallest-first so each step validates the pattern before the
flagship: login → register → new-account → new-category → new-transaction.

- **Page forms** (login, register): stay in their screen file, rewritten
  around `useForm` + direct `Controller` props (§1 pattern — two/three
  fields, no `FormProvider`). Schemas in `pages/login/model/schema.ts` and
  `pages/register/model/schema.ts`.
- **Sheet forms** (account, category, transaction): split into container +
  form per D4. New files: `pages/accounts/ui/new-account-form.tsx` +
  `pages/accounts/model/schema.ts`, `pages/dashboard/ui/new-category-form.tsx`
  + `pages/dashboard/model/schema.ts`,
  `features/create-transaction/ui/new-transaction-form.tsx` +
  `features/create-transaction/model/schema.ts` (+ field components per D7).
  The existing sheet files keep their names, exports, props, and testIDs —
  callers (routes, dashboard, SpeedDial wiring) are untouched.

### D2. Validation is submit-driven; one uniform pending contract

The current `canSubmit`-disabled buttons are replaced by RHF's default
on-submit validation: tapping submit with invalid values invokes no handler
and shows each failing field's message (spec scenario "Invalid input blocks
submit and shows the field error"). Submit-driven errors beat
disabled-until-valid because a dead button hides the reason, and per-field
messages cannot appear before a submit attempt under that model. `disabled`
is reserved for pending state, which is what the duplicate-submission
requirement needs.

**Uniform pending contract** — one rule for all five forms, stated here
once and referenced by every task:

- Every submit handler awaits all of its async work (`mutateAsync`,
  `login`, `register`), so `formState.isSubmitting` spans the entire
  submission and is the base in-flight signal everywhere.
- Mutation-backed forms (the three sheets):
  `loading={formState.isSubmitting || mutation.isPending}` and
  `disabled={mutation.isPending}` (conventions §1 verbatim).
- Forms without a mutation object (login, register):
  `loading={formState.isSubmitting}` and `disabled={formState.isSubmitting}`
  — the same contract with the handler's own lifetime standing in for the
  mutation signal.
- No form keeps a separate pending `useState` — today's `isLoading` flags
  are deleted with the migration.
- Keeping `mutation.isPending` in `loading` alongside `isSubmitting` is
  deliberate defense: the control stays blocked even if a later refactor
  moves the mutate call out of the awaited path. The conventions doc is
  internally inconsistent here (§1 has `disabled`; §2/§3 omit it) and is
  reconciled to this contract in task 6.1.

Alternative rejected: `mode: 'onChange'` + `disabled={!formState.isValid}` to
preserve today's disabled-until-valid UX — diverges from the endorsed
conventions and the spec's scenario, and still shows no first-error message
without extra wiring. The observable change is deliberate: existing tests
that assert a disabled submit on invalid input (new-transaction amount `'0'`)
are rewritten to assert the blocked submit + visible field error, which is
stronger, not weaker, coverage.

### D3. Error surfacing and testID mapping

- **Field errors**: `FormError` inside the field's `FormField`, driven by
  `fieldState.error?.message`; label tinted `text-destructive`, input
  `invalid={Boolean(fieldState.error)}`. New per-field testIDs follow
  `<existing-prefix>-<field>-error` (e.g. `login-email-error`,
  `new-transaction-amount-error`).
- **Form-level (server) errors**: `form.setError('root', …)` with
  `getRepositoryErrorText(error)` (code-keyed), rendered near the submit
  control reusing the existing aggregate testIDs (`login-error-text`,
  `register-error-text`, `accounts-create-error`, `home-new-category-error`,
  `new-transaction-error`). Today those IDs double as name-field validation
  slots in the sheets; after migration they mean exclusively the form-level
  error, and the name fields get their own error IDs. No Maestro flow asserts
  these IDs, and the affected unit tests assert success paths — verified in
  tasks before reassigning.
- Values are never reset on failure (retry keeps input).

### D4. Sheet container/form split and lifecycle

Each sheet becomes presentation-only (ref, snap points, header,
dismiss-on-success with the standing `TODO(sheet-dismiss)` workaround kept
as-is) and renders an independent form component that owns its `useForm`.
The form receives `onSuccess` (and `kind` for the transaction form); it never
touches sheet refs. Text inputs inside sheets use `BottomSheetInput`
(keyboard registration + accessibility — Maestro depends on it).

Reset follows conventions §3, one mechanism per flow:

- After a successful submit: explicit `form.reset(defaultValues)` inside the
  handler, then `onSuccess()`.
- Transaction mode change: the form re-initializes via
  `useEffect(() => form.reset(defaultValues), [defaultValues, form])` with
  `defaultValues` memoized on `kind`. (A `key={kind}` remount is the
  documented alternative; effect chosen because the sheet stays mounted and
  the same form instance already handles the success reset. Never both.)
- The transaction form's success reset becomes **full** (today's partial
  reset deliberately leaves account/category selections; the spec's
  "Successful submit resets the form" scenario requires returning to
  defaults, and a fresh open starting clean matches the other sheets).

### D5. Schemas: rules preserved, nothing invented

Each schema encodes exactly the rules the hand-rolled guard had — the
PRODUCT/AI rule forbids inventing product behavior mid-migration:

- **login**: `email` non-empty, `password` non-empty (per-field RU messages
  replace today's single `'Введите email и пароль'`). No email-format rule —
  none exists today.
- **register**: email/password/confirm non-empty; `password`
  `min(8)` (today's `MIN_PASSWORD_LENGTH`); `confirmPassword` matches via a
  `.refine` on the object with the message `'Пароли не совпадают'` surfaced on
  the confirm field.
- **new-account**: `name` trimmed non-empty (`'Введите название счёта'`);
  `currency` literal enum defaulting to `'RUB'` (no error path — always set);
  `openingBalance` string validated by today's predicate carried over
  verbatim (`parseMajorUnitsToMinor(value) !== null`, so `'0'` stays valid,
  unparseable text fails — see D6) — this field gains the error
  affordance it lacks today.
- **new-category**: `name` trimmed non-empty; `type`/`icon`/`color` have
  defaults and no error path.
- **new-transaction**: per D7.

Types come from `z.infer`; RU messages stay hardcoded with the existing
`TODO(i18n)` convention.

### D6. Money: string values, parseability in schema, named mappers

Amount/balance stay strings in form values. Schemas restate each field's
existing parse predicate via `parseMajorUnitsToMinor`; the conversion to
int64 minor units happens in
named mappers at the submission boundary — `toAccountPayload` (account
sheet) and `toTransactionPayload` (transaction form), replacing today's
inline conversions and inline payload construction. The `?? 0` fallback
pattern is the conventions §4 idiom for satisfying the parser's
`number | null` return after the schema guarantees parseability.

The money fields get **no new business rules** — each refine carries the
screen's existing predicate over verbatim: `openingBalance` uses exactly
today's `parsedBalance !== null` guard (any parseable value, `'0'`
included), `amount` uses exactly today's
`parsedAmount !== null && parsedAmount >= 1` guard. The set of accepted
values is identical before and after; only the affordance changes (a
disabled submit becomes a visible field error, whose message text is new
because the field had no error display before). Tightening either rule
(e.g. requiring a positive opening balance) is a separate product decision
and out of scope. Transfer
destination filtering (same currency, distinct from source) stays a
UI-level option-list derivation exactly as today — the schema cannot see
account currencies and must not duplicate the rule.

### D7. The transaction form: discriminated union, FormProvider, field components

`features/create-transaction/model/schema.ts` defines
`z.discriminatedUnion('kind', …)` per the adopted D11: `expense`/`income`
variants carry `amount` + `accountId` + `categoryId`; `transfer` carries
`amount` + `fromAccountId` + `toAccountId`. No flattened optionals, and the
handler narrows on `values.kind` — the `as string` non-null assertions and
the `canSubmit` cross-field logic are deleted, their invariants absorbed by
the schema. The form uses `FormProvider` with field components
(`AmountField`, `AccountField`, `CategoryField`, `FromAccountField`,
`ToAccountField` — mode-specific ones rendered conditionally per variant)
consuming `useFormContext<CreateTransactionFormValues>`, per conventions §2.
`OptionChip`/`OptionRow` remain the visual building blocks the account/
category `Controller`s render. The submit handler builds the payload via
`toTransactionPayload` (adding `occurredAt` as today) and calls
`mutateAsync`. `defaultValues` is one complete variant for the current
`kind`, re-initialized on mode change (D4).

### D8. Tests: rewrite what changed, add what's missing

Every migrated form gets a co-located `.test.tsx` asserting observable
behavior only: invalid input blocks submission (submit tapped, handler not
called, field error visible), valid input submits the expected payload
(including `'100,50'`-style major→minor conversion), server errors surface
via the root error with values preserved, pending prevents duplicates, mode
conditional fields render correctly (transaction), and reset behavior
(sheets). The existing `new-transaction-sheet.test.tsx` provider harness is
reused; its amount-`'0'`-disabled assertion becomes a blocked-submit +
visible-error assertion; the same-currency transfer-filter test is kept.
`accounts-screen.test.tsx` and `dashboard-screen.test.tsx` success-path
tests should pass unchanged (valid data, submit enabled under pending-only
disabling) — if an assertion breaks it must be updated to the new observable
behavior, not deleted. Auth screens get their first tests (mocked
`useAuth`), including the cancelled-ownership-takeover path that stays on
screen.

Maestro: the existing flows over migrated forms (`05-add-account`,
`06-add-category`, `07-add-expense`, `09-sync-signin`) keep passing
unchanged — they fill valid data, so pending-only disabling doesn't affect
them, and no selector changes. The one new user-facing behavior (per-field
validation errors on a tapped submit) is new UI behavior, so the two flows
it most affects gain a submit-empty assertion step (`07` amount,
`05` opening balance) rather than a whole new flow.

### D9. Housekeeping

- Remove the knip `ignoreDependencies` entry for the three packages once the
  first form imports them (task lives with the login migration so the window
  is one commit at most).
- Extend `jest.config.js` `transformIgnorePatterns` only if the new imports
  hit ESM transform failures (allowed explicitly by the adopting change's
  task 1.4).
- Reconcile `docs/conventions/forms.md` against the real migrated forms
  (drift risk the adopting change flagged): snippet prop names, testID
  conventions from D3, any friction between §1–§5 and the real code, and
  the §1–§3 pending snippets unified onto the D2 contract (§2/§3 currently
  omit `disabled`).
- The main spec's Purpose sentence "Forms not yet migrated are out of scope
  until their migrating change" becomes stale once this change archives;
  archiving updates it in `openspec/specs/mobile-forms/spec.md` (deltas carry
  requirement changes only).

## Risks / Trade-offs

- [Tests asserting disabled-until-valid break] → Rewritten as blocked-submit
  + visible-error assertions (D2/D8); coverage gets stronger, and the spec
  already prescribes the new behavior.
- [Maestro flows depend on submit enable/disable timing] → Flows fill valid
  data and submit; pending-only disabling keeps them green — verified with
  the full `pnpm test:e2e` gate before done.
- [Observable UX change: transaction sheet fully resets after success] →
  Deliberate (spec's reset scenario); recorded here and in the proposal.
- [RHF + Zod 4 + `discriminatedUnion` typing friction in `defaultValues`] →
  Smoke-checked during the first migration; escape hatch is an explicit
  `CreateTransactionFormValues`-typed `defaultValues` constant shared by
  `useForm` and `reset`.
- [Jest ESM transform failures for the new imports] → Allowlist in
  `transformIgnorePatterns` (D9), the pre-approved remedy.
- [Sheets keep mounted state, so missed resets linger across opens] →
  Explicit resets per D4, covered by reset tests per D8.

## Migration Plan

Each step lands independently green (`pnpm type-check`, `lint`, `format`,
`test` in `apps/mobile`; e2e at the end and before reporting done):

1. Login screen + schema + first tests; remove the knip tolerance entry in
   the same commit.
2. Register screen + schema + tests.
3. New-account sheet split + schema + mapper + tests.
4. New-category sheet split + schema + tests.
5. New-transaction form (discriminated union, FormProvider, field
   components, mapper, full reset) + rewritten/added tests.
6. Docs reconciliation (forms.md), main-spec Purpose note for archive, full
   gates: `pnpm test`, `pnpm knip`, `pnpm test:e2e`,
   `pnpm exec expo export --platform ios`.

Rollback: per-step `git revert`; no data or contract changes exist, so
rollback is purely code.

## Open Questions

None — the adopting change already resolved the stack and pattern decisions;
remaining choices above follow directly from the endorsed conventions.
