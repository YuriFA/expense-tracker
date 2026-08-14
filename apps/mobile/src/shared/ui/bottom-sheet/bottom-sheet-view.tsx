import { BottomSheetView as GorhomBottomSheetView } from '@gorhom/bottom-sheet'

export type BottomSheetViewProps = React.ComponentProps<typeof GorhomBottomSheetView>

export function BottomSheetView(props: BottomSheetViewProps) {
  return <GorhomBottomSheetView {...props} />
}
