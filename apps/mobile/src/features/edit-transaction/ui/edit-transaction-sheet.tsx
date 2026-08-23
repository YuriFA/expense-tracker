// Edit-transaction bottom-sheet container: presentation only (ref, snap
// points, keyboard behavior, dismiss-on-success). The form, its header
// actions, and lifecycle live in `edit-transaction-form.tsx` (conventions
// forms.md §3).
//
// Unlike EditCategorySheet this sheet stays mounted while `transactionId` is
// unset: hosts present it imperatively right after setting the id, so the
// sheet ref must already exist when `present()` fires (the global
// NewTransactionSheet mounts the same way). The form renders nothing without
// an id.

import { BottomSheet, BottomSheetRef, BottomSheetView } from '@/shared/ui/bottom-sheet'
import { EditTransactionForm } from './edit-transaction-form'

export interface EditTransactionSheetProps {
  ref: React.Ref<BottomSheetRef>
  /** The transaction being edited; the form renders nothing while unset. */
  transactionId: string | undefined
}

export function EditTransactionSheet({ ref, transactionId }: EditTransactionSheetProps) {
  const handleSuccess = () => {
    // TODO(sheet-dismiss): see the matching TODO in
    // pages/accounts/ui/new-account-sheet.tsx - imperative dismiss after
    // a successful create needs investigation (Expo Go e2e).
    if (ref && typeof ref !== 'function') ref.current?.dismiss()
  }
  const handleClose = () => {
    if (ref && typeof ref !== 'function') ref.current?.dismiss()
  }

  return (
    <BottomSheet
      ref={ref}
      testID="edit-transaction-sheet"
      snapPoints={['75%']}
      stackBehavior="push"
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      enableBlurKeyboardOnGesture
    >
      <BottomSheetView testID="edit-transaction-sheet">
        <EditTransactionForm
          key={transactionId ?? 'none'}
          transactionId={transactionId}
          onSuccess={handleSuccess}
          onClose={handleClose}
        />
      </BottomSheetView>
    </BottomSheet>
  )
}
