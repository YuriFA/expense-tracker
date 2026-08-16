import { View } from 'react-native'
import { Icon, type IconName } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import { cn } from '@/shared/lib/utils'
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetHeader,
  BottomSheetRef,
  BottomSheetScrollView,
  BottomSheetView,
} from '@/shared/ui/bottom-sheet'

export interface ExpenseRowView {
  id: string
  description: string
  categoryName: string
  categoryIcon: IconName
  /** Data color (hex from the category record); falls back to `bg-muted`. */
  categoryColor: string | undefined
  dayLabel: string
  amountText: string
}

export interface ExpensesSheetProps {
  ref: React.Ref<BottomSheetRef>
  title: string
  rows: ExpenseRowView[]
  emptyText: string
}

export function ExpensesSheet({ title, rows, emptyText, ref }: ExpensesSheetProps) {
  return (
    <BottomSheet ref={ref} snapPoints={['90%']} testID="home-expenses-sheet">
      <BottomSheetHeader title={title} />

      {rows.length === 0 ? (
        <BottomSheetView testID="home-expenses-sheet">
          <BottomSheetBody>
            <Text variant="body" className="text-muted-foreground">
              {emptyText}
            </Text>
          </BottomSheetBody>
        </BottomSheetView>
      ) : (
        <BottomSheetScrollView testID="home-expenses-sheet">
          <BottomSheetBody className="gap-4">
            {rows.map((row) => (
              <View
                key={row.id}
                className="flex-row items-center gap-4"
                testID={`home-expense-row-${row.id}`}
              >
                <View
                  className={cn(
                    'h-10 w-10 items-center justify-center rounded-full',
                    row.categoryColor ? undefined : 'bg-muted',
                  )}
                  style={row.categoryColor ? { backgroundColor: row.categoryColor } : undefined}
                >
                  <Icon name={row.categoryIcon} size={20} colorClassName="accent-white" />
                </View>
                <View className="flex-1 gap-1">
                  <Text variant="body" className="text-foreground">
                    {row.description}
                  </Text>
                  <Text variant="caption" className="text-muted-foreground">
                    {row.categoryName} · {row.dayLabel}
                  </Text>
                </View>
                <Text variant="body" className="font-semibold text-foreground">
                  {row.amountText}
                </Text>
              </View>
            ))}
          </BottomSheetBody>
        </BottomSheetScrollView>
      )}
    </BottomSheet>
  )
}
