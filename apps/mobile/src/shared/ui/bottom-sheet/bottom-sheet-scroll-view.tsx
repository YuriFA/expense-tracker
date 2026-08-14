import { BottomSheetScrollView as GorhomBottomSheetScrollView } from '@gorhom/bottom-sheet'

export type BottomSheetScrollViewProps = React.ComponentProps<typeof GorhomBottomSheetScrollView>

export function BottomSheetScrollView(props: BottomSheetScrollViewProps) {
  return <GorhomBottomSheetScrollView {...props} />
}
