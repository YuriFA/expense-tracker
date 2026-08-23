## Context

The mobile data path for edits already exists end-to-end:
`entities/transaction/model/use-transactions.ts` provides `useTransaction`,
`useUpdateTransaction`, `useDeleteTransaction` (tested, currently consumed by
no UI); the local SQLite repository implements `update` (version CAS,
type-immutable patch, row+outbox atomic write) and `remove` (tombstone +
`delete` outbox op); the sync engine already pushes both op kinds. The gap is
purely UI. Constraints that shape the design: FSD invariant #15 (no
cross-slice imports within a layer, enforced by `pnpm arch:check`), the
mobile-forms conventions (RHF+Zod, sheet/form split, `BottomSheetInput` inside
sheets), and the money invariant (string majors in form state, minor-units
conversion only at the mapper seam).

## Goals / Non-Goals

**Goals:**

- Reuse the existing mutation hooks, repository semantics, and picker sheets —
  no new data-layer or sync code.
- Follow the `EditCategorySheet`/`CategoryForm` precedent for a record-prefilled
  edit sheet (CAS `version` sent on save).

**Non-Goals:**

- Reference elements with no domain backing: recurrence, photo attachments,
  transfer exchange-rate conversion.
- Wiring the unrouted `TransactionsScreen` into navigation (rows there stay
  non-tappable; can be added when the screen gets a route).
- Any backend/API/OpenAPI change.

## Decisions

### D1: New `features/edit-transaction` slice, composed by pages via callback props

The sheet list rows live in the `cashflow-overview` feature; the edit sheet is
a different feature slice, and cross-slice imports are forbidden. Following the
established `onNewTransaction` pattern, `CashflowListSheet` and
`CategoryCashflowSheet` gain an `onEditTransaction(id)` callback prop (threaded
through `AllCashflowCard` and `CategorySection`), and the hosting pages
(Dashboard, Income, Analytics detail) own the `editingId` state and mount the
sheet. Alternative rejected: mounting the sheet inside the cashflow feature
(would require the forbidden cross-slice import).

### D2: Picker sheets and the account selector row move to `shared/ui`

`AccountPickerSheet`, `CategoryPickerSheet`, `DatePickerSheet`, and
`AccountSelectorRow` are prop-driven presentation components (no entity hooks,
no form context), but they live in `features/create-transaction`. Both the
create and edit slices need them, so they move to `shared/ui/*` slices (pure
move + import updates; `shared` importing shared packages/types stays legal).
Alternative rejected: duplicating the pickers in the edit slice (drift risk);
inverting via page-level composition (pages would mount four pickers each —
wiring explosion).

### D3: Amount is a plain `BottomSheetInput` with live grouping

The edit form deliberately diverges from the create form's keypad: the amount
is a text input (`keyboardType="decimal-pad"`, `BottomSheetInput` per the
sheet-keyboard rule). Digit grouping reuses the string-only grouping logic from
`shared/lib/money/display.ts` (extracted as a reusable helper) — grouping
regroups the integer part on every keystroke, so mid-string edits move the
cursor to the end; accepted trade-off matching the reference (amounts are
usually fully retyped). Input filtering (digits, one separator, ≤2 fraction
digits) happens in the field before `setValue`, mirroring how the keypad wrote
canonical strings.

### D4: Prefill via detail query, amount round-trip helpers in `shared/lib/money`

The sheet renders only when a `transactionId` is set (the `EditCategorySheet`
null-render pattern) and loads the record with the existing `useTransaction`
detail query; the form resets with `editTransactionDefaultValues(record)` when
the record arrives (sheets stay mounted in @gorhom, so explicit reset is
mandatory). A new `minorToInputValue(minor)` helper (string-only inverse of
`parseMajorUnitsToMinor`: `3134331 → "31343,31"`, `20000 → "200"`) keeps the
minor↔major conversions at the two mapper seams.

### D5: Delete confirmation via native `Alert`

`Alert.alert` with a destructive confirm button is the platform-standard
confirmation; the mobile app has no in-house confirm pattern and introducing
one is not justified by a single action. The delete mutation lives in the form
component next to the save mutation so both share the root-error slot and the
dismiss-on-success path.

### D6: Save sends all editable fields + `version`

`UpdateTransactionPayload` is a partial patch, but the edit form submits every
editable field plus the record's `version`. This keeps the payload independent
of dirty tracking (RHF dirty diffing across a union schema is fiddly) and is
idempotent for unchanged fields; the repository applies it atomically either
way. Type is never in the payload (immutable server-side).

## Risks / Trade-offs

- [Three stacked sheets (list → edit → picker) on low-end devices] → @gorhom
  `stackBehavior="push"` already stacks list → edit-category → pickers today;
  verify on simulator in the Maestro flow.
- [Cursor jumps to end when editing the middle of a grouped amount] → accepted
  (D3), consistent with the reference app behavior.
- [Stale `version` if the record changes while the sheet is open] → version
  conflict surfaces as the mapped root error ("Изменено другим действием…"),
  per the transactions spec CAS semantics; no silent overwrite.
- [`Alert.alert` in Jest tests] → mock `react-native` `Alert` in form tests
  (external boundary, sanctioned by the testing rules).

## Migration Plan

Purely additive mobile UI + a move-only refactor of the picker components
(create flow re-imports from `shared/ui`; behavior unchanged, covered by the
existing create-form tests). Rollback = revert the commit; no data or API
migration involved.
