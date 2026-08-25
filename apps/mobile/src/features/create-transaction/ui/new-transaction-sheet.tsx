// The speed-dial create-transaction sheet: presentation-only container
// (ref, snap points, dismiss-on-success). The redesigned near-fullscreen
// layout - account row(s), the amount display, quick categories, the action
// row, and the custom keypad pinned to the bottom - lives in
// `new-transaction-form.tsx` (conventions forms.md §2/§3). There is no title
// header by design: the account row and the amount open the sheet visually,
// matching the reference. The kind still comes from the speed dial action.

import { BottomSheet, BottomSheetRef, BottomSheetView } from '@/shared/ui/bottom-sheet'
import { SheetContentPortal, useSheetContentPickers } from '@/shared/ui/sheet-content-portal'
import type { TransactionFlowKind } from '../model/schema'
import { NewTransactionForm } from './new-transaction-form'

export type { TransactionFlowKind }

export interface NewTransactionSheetProps {
  ref: React.Ref<BottomSheetRef>
  kind: TransactionFlowKind
  /** Preselected category id for expense/income flows (e.g. a category sheet). */
  defaultCategoryId?: string
  /**
   * Override for mounted-twice cases (the global speed-dial instance plus a
   * local one inside a dashboard sheet): keep testIDs unique per instance.
   * @default 'new-transaction-sheet'
   */
  testID?: string
}

export function NewTransactionSheet({
  ref,
  kind,
  defaultCategoryId,
  testID = 'new-transaction-sheet',
}: NewTransactionSheetProps) {
  const handleSuccess = () => {
    // TODO(sheet-dismiss): see the matching TODO in
    // pages/accounts/ui/new-account-sheet.tsx - imperative dismiss after
    // a successful create needs investigation (Expo Go e2e).
    if (ref && typeof ref !== 'function') ref.current?.dismiss()
  }

  // Pickers declared inside the form re-render beside this sheet element
  // (outside its portal content) — see useSheetContentPickers.
  const pickers = useSheetContentPickers()

  return (
    <>
      {pickers.nodes}
      <BottomSheet
        ref={ref}
        testID={testID}
        snapPoints={['65%', '73.5%']}
        stackBehavior="push"
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        enableDynamicSizing
        enableBlurKeyboardOnGesture
      >
        <BottomSheetView testID={testID}>
          <pickers.Provider>
            <NewTransactionForm
              kind={kind}
              defaultCategoryId={defaultCategoryId}
              onSuccess={handleSuccess}
            />
          </pickers.Provider>
        </BottomSheetView>
      </BottomSheet>
    </>
  )
}
