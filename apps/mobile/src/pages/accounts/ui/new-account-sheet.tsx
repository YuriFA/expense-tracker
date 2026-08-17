// Create-account bottom-sheet container: presentation only (ref, snap
// points, header, dismissal). The form and its lifecycle live in
// `new-account-form.tsx` (conventions forms.md §3).

import { BottomSheetView } from '@gorhom/bottom-sheet'
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetHeader,
  BottomSheetRef,
} from '@/shared/ui/bottom-sheet'
import { NewAccountForm } from './new-account-form'

export interface NewAccountSheetProps {
  ref: React.Ref<BottomSheetRef>
}

export function NewAccountSheet({ ref }: NewAccountSheetProps) {
  const handleSuccess = () => {
    // TODO(sheet-dismiss): the imperative dismiss after a successful
    // create was observed NOT closing the sheet in the Expo Go e2e run
    // (reset clearly ran). Investigate the @gorhom BottomSheetModal
    // dismiss timing (likely keyboard-dismiss interplay); e2e flows
    // close via backdrop tap meanwhile.
    if (ref && typeof ref !== 'function') ref.current?.dismiss()
  }

  return (
    <BottomSheet ref={ref} testID="accounts-new-sheet" snapPoints={['75%']}>
      <BottomSheetView testID="accounts-new-sheet">
        <BottomSheetHeader title="Новый счёт" />
        <BottomSheetBody>
          <NewAccountForm onSuccess={handleSuccess} />
        </BottomSheetBody>
      </BottomSheetView>
    </BottomSheet>
  )
}
