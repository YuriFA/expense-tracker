// Debt-operation bottom-sheet container: presentation only (ref, snap
// points, dismissal on success). The form and its lifecycle - including its
// own header with the edit variant's delete affordance - live in
// `operation-form.tsx` (conventions forms.md §3). Create is always
// fixed-context (a contact's history sheet, design D9).

import { useEffect } from 'react'
import type { DebtDirection, DebtOperation } from '@expense-tracker/api'
import { BottomSheet, BottomSheetView, type BottomSheetRef } from '@/shared/ui/bottom-sheet'
import { useSheetContentPickers } from '@/shared/ui/sheet-content-portal'
import { OperationForm } from './operation-form'

/** Mirrors the form's edit/create union; the sheet owns dismissal itself. */
export type OperationSheetProps =
  | { ref: React.Ref<BottomSheetRef>; operation: DebtOperation }
  | {
      ref: React.Ref<BottomSheetRef>
      operation?: undefined
      fixed: { debtorId: string; direction: DebtDirection }
    }

export function OperationSheet({ ref, ...formProps }: OperationSheetProps) {
  // The edit variant mounts WITH its subject (a parent-side present() would
  // race the conditional mount and be lost); the create variant is presented
  // imperatively by the page.
  const { operation } = formProps
  useEffect(() => {
    if (operation && ref && typeof ref !== 'function') ref.current?.present()
  }, [operation, ref])

  const sheetTestId = operation ? 'debts-edit-operation-sheet' : 'debts-new-operation-sheet'
  const handleSuccess = () => {
    // TODO(sheet-dismiss): see the matching TODO in
    // features/cashflow-overview/ui/edit-category-sheet.tsx.
    if (ref && typeof ref !== 'function') ref.current?.dismiss()
  }

  // The date picker declared inside the form re-renders beside this sheet
  // element (outside its portal content) — see useSheetContentPickers.
  const pickers = useSheetContentPickers()

  return (
    <>
      {pickers.nodes}
      <BottomSheet ref={ref} testID={sheetTestId} snapPoints={['80%']} stackBehavior="push">
        {/* The visible element carrying the sheet testID (accounts-sheet
            pattern): the modal container is zero-bounds to Maestro. */}
        <BottomSheetView testID={sheetTestId} className="flex-1">
          <pickers.Provider>
            <OperationForm {...formProps} onSuccess={handleSuccess} />
          </pickers.Provider>
        </BottomSheetView>
      </BottomSheet>
    </>
  )
}
