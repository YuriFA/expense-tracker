// Debt-operation bottom-sheet container: presentation only (ref, snap
// points). The form and its lifecycle - including its own header with the
// edit variant's delete affordance - live in `operation-form.tsx`
// (conventions forms.md §3).

import { useEffect } from 'react'
import type { DebtDirection, DebtOperation, DebtOperationKind } from '@expense-tracker/api'
import { BottomSheet, BottomSheetView, type BottomSheetRef } from '@/shared/ui/bottom-sheet'
import { OperationForm } from './operation-form'

export interface OperationSheetProps {
  ref: React.Ref<BottomSheetRef>
  /** The operation being edited; undefined = create mode. */
  operation?: DebtOperation
  /** Fixed context when opened from a debtor's history sheet. */
  fixed?: { debtorId: string; direction: DebtDirection }
  /** Initial kind for create mode (e.g. repayment from «Новое списание»). */
  defaultKind?: DebtOperationKind
}

export function OperationSheet({ ref, operation, fixed, defaultKind }: OperationSheetProps) {
  // The edit variant mounts WITH its subject (a parent-side present() would
  // race the conditional mount and be lost); the create variant is presented
  // imperatively by the page.
  useEffect(() => {
    if (operation && ref && typeof ref !== 'function') ref.current?.present()
  }, [operation, ref])

  const sheetTestId = operation ? 'debts-edit-operation-sheet' : 'debts-new-operation-sheet'
  const handleSuccess = () => {
    // TODO(sheet-dismiss): see the matching TODO in
    // features/cashflow-overview/ui/edit-category-sheet.tsx.
    if (ref && typeof ref !== 'function') ref.current?.dismiss()
  }

  return (
    <BottomSheet ref={ref} testID={sheetTestId} snapPoints={['80%']} stackBehavior="push">
      {/* The visible element carrying the sheet testID (accounts-sheet
          pattern): the modal container is zero-bounds to Maestro. */}
      <BottomSheetView testID={sheetTestId} className="flex-1">
        <OperationForm
          operation={operation}
          fixed={fixed}
          defaultKind={defaultKind}
          onSuccess={handleSuccess}
        />
      </BottomSheetView>
    </BottomSheet>
  )
}
