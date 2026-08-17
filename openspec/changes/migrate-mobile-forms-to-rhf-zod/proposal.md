# Proposal: migrate-mobile-forms-to-rhf-zod

## Why

The `adopt-rhf-zod-forms` change adopted React Hook Form + Zod as the mobile
form standard — dependencies installed, conventions documented, spec written —
but deliberately migrated nothing. All five existing forms
(`login-screen`, `register-screen`, `new-account-sheet`, `new-category-sheet`,
`new-transaction-sheet`) still hand-roll their state: one `useState` per field,
a single aggregate error string doing double duty for validation and server
errors, ad-hoc `canSubmit` derivations, manual resets, and (in the transaction
sheet) non-null assertions the adopted design explicitly forbids. The three
adopted packages still sit in knip's `ignoreDependencies` with no importer.
The mobile-forms spec grandfathers these forms only "until their migrating
change" — this is that change.

## What Changes

- **Migrate all five forms to `useForm` + `zodResolver`**, following
  `apps/mobile/docs/conventions/forms.md` as the worked-example reference:
  - `login-screen` and `register-screen`: page-local Zod schemas; per-field
    validation messages replace the single aggregate string; server errors via
    `form.setError('root', …)` keyed by `RepositoryError.code`.
  - `new-account-sheet` and `new-category-sheet`: split into Bottom Sheet
    container + independent form component (per the sheet container/form rule);
    the opening-balance field gains the field-level error affordance it lacks
    today; named values→payload mapper for the money conversion.
  - `new-transaction-sheet`: the flagship — `z.discriminatedUnion('kind', …)`
    replacing flattened optional state, `FormProvider` composite with field
    components, named `toTransactionPayload` mapper, no non-null assertions,
    and a deliberate full reset on success (today's partial reset leaves stale
    selections).
- **Validation becomes submit-driven and per-field**: invalid fields show
  their Zod message as an accessibility alert through the existing
  `FormError`; the submit control is blocked by pending state rather than
  disabled-until-valid (the current `canSubmit`-disabled pattern), under one
  uniform pending contract — `formState.isSubmitting` everywhere, plus
  `mutation.isPending` where a mutation backs the form. Validation rules
  themselves are carried over verbatim — non-empty email/password, min
  length 8, password match, and the money fields' existing parse predicates
  unchanged (`openingBalance`: parseable, `'0'` valid; `amount`: parseable
  and ≥ 1 minor unit). No new business rules.
- **Money stays string in form values**: the schema checks parseability via
  `parseMajorUnitsToMinor`; conversion to int64 minor units happens in the
  named mapper at the submission boundary.
- **Behavior tests for every migrated form** (login/register get their first
  tests ever): invalid blocks submission, valid submits expected values,
  errors visible, server errors surface, pending prevents duplicates, reset
  where the flow requires it. Existing tests that assert the old
  disabled-until-valid / aggregate-error behavior are updated to the new
  observable behavior.
- **Housekeeping**: remove the knip `ignoreDependencies` entry for the three
  packages; reconcile `docs/conventions/forms.md` against the first real
  implementations; extend `jest.config.js` `transformIgnorePatterns` only if
  the new imports hit ESM transform issues.
- **Stable contract**: every existing testID the Maestro flows rely on keeps
  working; existing aggregate `*-error` testIDs are reassigned to the
  form-level (root/server) error, with new per-field error testIDs added.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `mobile-forms`: the grandfather clause ends. The "Declarative form state for
  non-trivial forms" requirement currently scopes the standard to new forms
  and forms "when the change that next touches them migrates them"; after this
  change every non-trivial form in `apps/mobile` — including the five legacy
  forms — is on the standard stack, with no un-migrated forms remaining.

## Impact

- **apps/mobile/src**: the five form files are restructured (page forms
  in place; the three sheets split into container + form + `model/schema.ts`);
  new co-located `.test.tsx` files; existing
  `new-transaction-sheet.test.tsx`, `accounts-screen.test.tsx`, and
  `dashboard-screen.test.tsx` assertions updated where behavior legitimately
  changed.
- **Root `knip.json`**: delete the temporary `ignoreDependencies` entry for
  `react-hook-form`, `zod`, `@hookform/resolvers`.
- **apps/mobile/jest.config.js**: possible `transformIgnorePatterns` additions
  for the new imports.
- **apps/mobile/docs/conventions/forms.md**: reconciled against real migrated
  code (drift risk flagged by the adopting change).
- **Not affected**: no dependency changes (already installed), no
  `apps/web`, `packages/*`, backend, or OpenAPI changes. Maestro flows keep
  passing on unchanged selectors.
