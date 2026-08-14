import { View } from 'react-native'
import { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet'
import { BottomSheet, Icon, Row, Stack, Text } from '@/shared/ui'

export interface ExpenseRowView {
  id: string
  description: string
  categoryName: string
  categoryIcon: string
  categoryColor: string
  dayLabel: string
  amountText: string
}

export interface ExpensesSheetProps {
  visible: boolean
  /** Sheet title: "Все расходы" or the category name. */
  title: string
  rows: ExpenseRowView[]
  emptyText: string
  onClose: () => void
}

/**
 * Read-only expense list for the selected period (optionally per
 * category). The list is the sheet's direct scrollable content so the
 * sheet sizes and scrolls it correctly (gorhom requirement).
 */
export function ExpensesSheet(props: ExpensesSheetProps) {
  const { visible, title, rows, emptyText, onClose } = props

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="home-expenses-sheet">
      {rows.length === 0 ? (
        <BottomSheetView testID="home-expenses-sheet">
          <Stack className="px-4 pb-8 pt-2">
            <Text variant="h3" className="mb-4">
              {title}
            </Text>
            <Text variant="body-sm" className="text-muted-foreground">
              {emptyText}
            </Text>
          </Stack>
        </BottomSheetView>
      ) : (
        <BottomSheetScrollView testID="home-expenses-sheet">
          <Stack gap="md" className="px-4 pb-8 pt-2">
            <Text variant="h3" className="mb-2">
              {title}
            </Text>
            {rows.map((row) => (
              <Row key={row.id} align="center" gap="md" testID={`home-expense-row-${row.id}`}>
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: row.categoryColor }}
                >
                  <Icon name={row.categoryIcon} size={20} color="#FFFFFF" />
                </View>
                <Stack gap="xs" className="flex-1">
                  <Text variant="body" className="text-foreground">
                    {row.description}
                  </Text>
                  <Text variant="caption" className="text-muted-foreground">
                    {row.categoryName} · {row.dayLabel}
                  </Text>
                </Stack>
                <Text variant="body" className="font-semibold text-foreground">
                  {row.amountText}
                </Text>
              </Row>
            ))}
          </Stack>
        </BottomSheetScrollView>
      )}
    </BottomSheet>
  )
}
