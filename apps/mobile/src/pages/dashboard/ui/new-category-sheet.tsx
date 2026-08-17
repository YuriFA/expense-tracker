// Create-category bottom-sheet container: presentation only (ref, snap
// points, header). The form and its lifecycle live in
// `new-category-form.tsx` (conventions forms.md §3). Unlike the account and
// transaction sheets, this one intentionally stays open after a successful
// create - the dashboard flow continues right in the sheet.

import { BottomSheetView } from '@gorhom/bottom-sheet'
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetHeader,
  BottomSheetRef,
} from '@/shared/ui/bottom-sheet'
import { NewCategoryForm } from './new-category-form'

export interface NewCategorySheetProps {
  ref: React.Ref<BottomSheetRef>
}

export function NewCategorySheet({ ref }: NewCategorySheetProps) {
  return (
    <BottomSheet ref={ref} testID="home-new-category-sheet" snapPoints={['75%']}>
      <BottomSheetView testID="home-new-category-sheet">
        <BottomSheetHeader title="Новая категория" />
        <BottomSheetBody>
          <NewCategoryForm />
        </BottomSheetBody>
      </BottomSheetView>
    </BottomSheet>
  )
}
