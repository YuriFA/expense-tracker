// The speed-dial create-transaction sheet: presentation-only container
// (ref, snap points, header, dismiss-on-success). The form - union schema,
// field components, submission - lives in `new-transaction-form.tsx`
// (conventions forms.md §2/§3).

import { BottomSheetView } from '@gorhom/bottom-sheet'
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetHeader,
  BottomSheetRef,
} from '@/shared/ui/bottom-sheet'
import type { TransactionFlowKind } from '../model/schema'
import { NewTransactionForm } from './new-transaction-form'

export type { TransactionFlowKind }

export interface NewTransactionSheetProps {
  ref: React.Ref<BottomSheetRef>
  kind: TransactionFlowKind
}

const KIND_TITLES: Record<TransactionFlowKind, string> = {
  expense: 'Новый расход',
  income: 'Новый доход',
  transfer: 'Новый перевод',
}

export function NewTransactionSheet({ ref, kind }: NewTransactionSheetProps) {
  const handleSuccess = () => {
    // TODO(sheet-dismiss): see the matching TODO in
    // pages/accounts/ui/new-account-sheet.tsx - imperative dismiss after
    // a successful create needs investigation (Expo Go e2e).
    if (ref && typeof ref !== 'function') ref.current?.dismiss()
  }

  return (
    <BottomSheet ref={ref} testID="new-transaction-sheet" snapPoints={['65%']}>
      <BottomSheetView testID="new-transaction-sheet">
        <BottomSheetHeader title={KIND_TITLES[kind]} />
        <BottomSheetBody>
          <NewTransactionForm kind={kind} onSuccess={handleSuccess} />
        </BottomSheetBody>
      </BottomSheetView>
    </BottomSheet>
  )
}
