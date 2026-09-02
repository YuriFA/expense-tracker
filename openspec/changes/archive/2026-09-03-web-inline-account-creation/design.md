# Design: Web inline account creation from the transaction form

## Context

The category forms already solved the analogous trap with an inline dialog:
`NewCategoryDialog` (in `features/transaction/add/ui`) opens over the
transaction dialog, creates the entity through an `entities/category`
mutation, and auto-selects the result. This change replicates that contract
for accounts, but the affordance is needed in two features
(`features/transaction/add` and `features/transaction/edit` - five forms
total), and FSD forbids cross-feature imports, so the dialog cannot live in
either feature the way the category dialog lives in one.

Existing building blocks:

- `entities/account` already hosts `AccountSelect` and `useCreateAccount`
  (reactive query invalidation included - a created account appears in every
  mounted `useAccounts` consumer without reload).
- The full creation form (`AddAccountForm` + `createAddAccountSchema`) lives
  in `pages/accounts/features/add-account` - page-local, unreachable from
  features.
- Money invariant #2: form state holds majors; `toMinorUnits` converts
  exactly once at the submit seam.

## Goals / Non-Goals

**Goals:**

- One shared inline account-creation dialog usable by both transaction
  features, with validation rules identical to the /accounts creation form.
- Zero behavioral drift between the two account-creation surfaces.

**Non-Goals:**

- Unifying the /accounts `AddAccountDialog` onto the shared dialog (only the
  validation schema is shared; the page dialog keeps its layout and wiring).
- Mobile parity, seeding, empty-state CTAs, auto-open, palette actions (see
  proposal non-goals).

## Decisions

### D1: The dialog lives in `entities/account/ui`

`NewAccountDialog.vue` in `entities/account/ui`, exported from the slice
public API next to `AccountSelect`. Rationale: exactly two consumers
(add + edit transaction features), which satisfies the repo's promotion rule
("2+ consumers" → global layer); the dialog sits next to the selector it
augments.

Alternatives considered:

- Duplicate a simplified dialog in each feature (the category precedent,
  ×2). Rejected: duplicates validation + money conversion in two places,
  and the category precedent had a single consumer, not two.
- One dialog in `features/transaction/add` imported by edit. Rejected:
  cross-feature import, FSD violation.

### D2: The validation schema is lifted, not copied

`createAddAccountSchema` moves from
`pages/accounts/features/add-account/model/` to `entities/account/model/`
(exported via the public API); the page form imports it from there and the
page-local file is deleted. Single source of truth for account validation
rules; the /accounts form's behavior is unchanged (import swap only, its
tests stay valid). Alternative - keeping a copy next to the dialog - was
rejected as a guaranteed source of future drift.

### D3: The inline form mirrors `AddAccountForm` mechanics

vee-validate + `toTypedSchema(createAddAccountSchema())`, `NumberField` for
the opening balance, `toMinorUnits` once at submit, fixed
`DEFAULT_CURRENCY` submit. The dialog is presentation-plus-form only: it
emits `created` with the created `Account` and owns nothing else. Host forms
render it next to their selector and set the triggering field value on
`created` - the same event contract as `NewCategoryDialog`'s
`created: [category]`. Auto-selection goes through the existing VeeField
`setValue`, so revalidation and the amount-field currency recomputation
(existing `accountCurrency` computed) happen by construction.

Alternative - a bare-refs form like `NewCategoryDialog` (no zod, manual
`disabled`) - rejected: it would re-implement non-negative-balance
validation differently from the /accounts form.

### D4: Visual and behavioral parity with the category affordance

Same outline icon button (`size-9`, `PlusIcon`, aria-label/title from i18n)
placed in the same flex row pattern as the category "+". On success:
`notification.success` with the existing `addAccount.success` key; on
failure `notification.mutationError` with `feature: 'account'`,
`action: 'create'`, dialog stays closable and retryable. The button is
always visible regardless of the accounts count; no auto-open when the list
is empty (surprise modals lose the user's context - decided against).

### D5: Transfer/edit specifics

In the transfer forms each selector (from and to) gets its own "+" and its
own dialog instance; the created account flows only into the triggering
selector's field, so the existing `excludeId` filtering and the from ≠ to
validation are untouched. In edit forms the same wiring hangs off the
accountId / fromAccountId / toAccountId VeeFields; the version-conflict
semantics of edit submission are unaffected (dialog only sets a field
value).

## Risks / Trade-offs

- [Nested-dialog focus/scroll interplay (base-ui dialogs stacked two deep)]
  → Already proven by `NewCategoryDialog` over the transaction dialog; the
  account dialog uses the same Dialog primitives and stacking, and form
  tests cover the open → create → auto-select path.
- [Schema move ripples into the accounts page] → Import swap only; guarded
  by the existing `AddAccountForm.test.ts`.
- [Dialog duplication between entities (`NewAccountDialog`) and the page
  (`AddAccountDialog`)] → Accepted consciously (non-goal to unify); the
  shared schema keeps the rules from drifting while each surface keeps its
  own presentation.

## Migration Plan

Web-only UI change; no API, schema, or data migration. Ship and roll back
as a normal frontend deploy.
