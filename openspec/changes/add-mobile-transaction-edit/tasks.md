## 1. Enablers

- [x] 1.1 Move `AccountPickerSheet`, `CategoryPickerSheet`, `DatePickerSheet`, `AccountSelectorRow` from `features/create-transaction/ui` to `shared/ui` slices (pure move + import updates); `pnpm arch:check` and mobile tests stay green
- [x] 1.2 Add `minorToInputValue` (minor units → keypad-style major string) and a reusable integer-grouping helper in `shared/lib/money` with unit tests

## 2. Edit slice

- [x] 2.1 `features/edit-transaction/model/schema.ts`: `editTransactionSchema` (discriminated union on immutable `type`; amount string, description, occurredAt; account+category for expense/income; from/to for transfer) and `editTransactionDefaultValues(transaction)` with tests
- [x] 2.2 `ui/edit-transaction-form.tsx`: header (type title, close left, delete right), amount `BottomSheetInput` with live grouping + currency chip, account row(s) with picker stacking (transfer candidate rule), category row (expense/income), date row, note, Save button; values→payload mapper sends all editable fields + record `version`; reset-on-record lifecycle; root-error slot via `getRepositoryErrorText`; delete via native `Alert` confirmation + `useDeleteTransaction`
- [x] 2.3 `ui/edit-transaction-sheet.tsx`: thin `BottomSheet` container (ref, `transactionId` null-render, push stacking, keyboard extend), `edit-transaction-*` testIDs; export through the slice barrel
- [x] 2.4 Component tests for the form: prefill by type, save payload + version, conflict error keeps values, delete confirm/cancel via mocked `Alert`, transfer field set

## 3. Row wiring

- [x] 3.1 `CashflowListSheet` + `AllCashflowCard`: `onEditTransaction(id)` prop; rows become `Pressable` with accessibility labels; row-press test
- [x] 3.2 `CategoryCashflowSheet` (+ `CategorySection` threading): same prop and row treatment; row-press test
- [x] 3.3 Mount `EditTransactionSheet` and wire `onEditTransaction` in Dashboard, Income, and Analytics detail pages

## 4. Verification

- [x] 4.1 Maestro flow for the new user flow (open list → tap row → edit amount → save; delete with confirm/cancel)
- [x] 4.2 Full mobile quality gate: `pnpm type-check`, `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm test:e2e`; workspace `pnpm arch:check` and `pnpm knip`
