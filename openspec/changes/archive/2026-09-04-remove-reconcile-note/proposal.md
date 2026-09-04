## Why

A real user reported the «Заметка» (note) field in the web «Сверить баланс»
dialog as unnecessary. The note is only a convenience at creation time: an
adjustment's description can be added or changed afterwards via the existing
edit-transaction flow (`AdjustmentEditForm`), and an adjustment row without a
description already renders meaningfully (badge + account + date). The field is
noise for everyone who does not want it.

This is a product-level decision, not a web-only tweak: reconciliation carries
no user note, so any future reconcile surface (e.g. mobile) must also ship
without one.

## What Changes

- Remove the optional note field from the web reconcile dialog
  («Сверить баланс»): form UI, zod schema (`note`), and the
  `ReconcileAccountFormValues` type (narrows to `{ targetBalance }`).
- The adjustment transaction created by reconciliation always carries an empty
  description (`''`) - exactly today's behavior for an empty note. Users who
  want a description add it post-hoc by editing the adjustment.
- Remove the now-dead i18n keys
  `reconcileAccount.{noteLabel,notePlaceholder,noteTooLong}` from `ru` and `en`.
- No API change: `description` remains an optional transaction field in the
  OpenAPI contract and the backend; nothing else consumes the reconcile note.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `web-screens`: the «Account balance reconciliation» requirement drops the
  optional note field and the "note as the transaction description" clause;
  scenarios no longer reference a note.

## Impact

- `apps/web/src/pages/accounts/features/reconcile-account/` - form, schema,
  unit tests.
- `apps/web/e2e/reconcile.spec.ts` - drop the note fill step and stale comment.
- `packages/i18n/src/locales/{ru,en}.json` - key removal only.
- Backend, OpenAPI spec, mobile app: untouched.
