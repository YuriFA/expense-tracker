import { BottomSheetFlatList as GorhomBottomSheetFlatList } from '@gorhom/bottom-sheet'

export type BottomSheetFlatListProps = React.ComponentProps<typeof GorhomBottomSheetFlatList>

export function BottomSheetFlatList(props: BottomSheetFlatListProps) {
  return <GorhomBottomSheetFlatList {...props} />
}
