// The speed-dial create-transaction sheet: presentation-only container
// (ref, snap points, dismiss-on-success). The redesigned near-fullscreen
// layout - account row(s), the amount display, quick categories, the action
// row, and the custom keypad pinned to the bottom - lives in
// `new-transaction-form.tsx` (conventions forms.md §2/§3). There is no title
// header by design: the account row and the amount open the sheet visually,
// matching the reference. The kind still comes from the speed dial action.

import { BottomSheetView } from '@gorhom/bottom-sheet'
import { BottomSheet, BottomSheetRef } from '@/shared/ui/bottom-sheet'
import type { TransactionFlowKind } from '../model/schema'
import { NewTransactionForm } from './new-transaction-form'

export type { TransactionFlowKind }

export interface NewTransactionSheetProps {
  ref: React.Ref<BottomSheetRef>
  kind: TransactionFlowKind
}

export function NewTransactionSheet({ ref, kind }: NewTransactionSheetProps) {
  const handleSuccess = () => {
    // TODO(sheet-dismiss): see the matching TODO in
    // pages/accounts/ui/new-account-sheet.tsx - imperative dismiss after
    // a successful create needs investigation (Expo Go e2e).
    if (ref && typeof ref !== 'function') ref.current?.dismiss()
  }

  return (
    <BottomSheet
      ref={ref}
      testID="new-transaction-sheet"
      snapPoints={['90%']}
      backgroundStyle={{ borderRadius: 24 }}
    >
      <BottomSheetView style={{ flex: 1 }} testID="new-transaction-sheet">
        <NewTransactionForm kind={kind} onSuccess={handleSuccess} />
      </BottomSheetView>
    </BottomSheet>
  )
}
