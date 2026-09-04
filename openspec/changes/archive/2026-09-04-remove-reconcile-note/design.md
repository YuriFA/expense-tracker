## Context

The reconcile form lives at
`apps/web/src/pages/accounts/features/reconcile-account/` (form, zod schema,
unit tests) with an e2e suite at `apps/web/e2e/reconcile.spec.ts`. The note
currently maps 1:1 onto the adjustment transaction's `description`, and an
empty description is already a fully supported state: `TransactionListItem`
omits the description paragraph and the adjustment row renders badge +
account + date. Post-hoc editing exists (`AdjustmentEditForm` in
`features/transaction/edit`) for anyone who wants a description later.

The transaction `description` field itself is part of the OpenAPI contract
and the generic add/edit flows - it is NOT reconcile-specific and stays
untouched.

## Goals / Non-Goals

**Goals:**

- Reconcile dialog contains exactly one input: the actual balance.
- Adjustment created by reconciliation carries `description: ''`.
- Dead code and i18n keys removed in the same change (no leftovers for knip
  or the i18n schema to trip over).

**Non-Goals:**

- No change to the transaction `description` field, its edit surface, or any
  other form that has a note (debts, plans).
- No auto-generated description text on reconcile-created adjustments.
- No mobile work (no reconcile feature exists there).

## Decisions

- **Send `''`, not an omitted/undefined description** - matches today's
  empty-note behavior exactly and keeps the create payload shape stable.
  Alternative (omitting the field) changes the request payload for no benefit.
- **Pure deletion, no deprecation period** - the field is client-only UI
  state; nothing persists it beyond the description it produced. Existing
  adjustments with descriptions are unaffected and stay editable.
- **Remove the zod `note` field rather than keep a hidden optional field** -
  keeps `ReconcileAccountFormValues` honest (`{ targetBalance }`) and lets
  the type system enforce that no note plumbing remains.
- **Product-level rule, recorded in the proposal** - future reconcile
  surfaces ship without a note. Alternative (web-only tweak, decide again
  for mobile later) invites re-adding the field from muscle memory.

## Risks / Trade-offs

- [A user who relied on typing the note during reconcile now needs two steps
  (reconcile, then edit)] → Accepted: single-user feedback says the field is
  unwanted; the edit path keeps the capability.
- [i18n key removal breaks `MessageSchema` typing if a consumer survives] →
  Mitigated by compile-time `MessageSchema` coverage plus a repo-wide grep
  for the removed keys before finishing.
