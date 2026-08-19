import { Fragment, useRef } from 'react'
import { View } from 'react-native'
import Animated from 'react-native-reanimated'
import { NewTransactionSheet } from '@/features/create-transaction'
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
import type { ExpenseDayGroup } from '../model/selectors'
import { ExpenseSheetFooter } from './expense-sheet-footer'
import { useSheetFooterScroll } from './use-sheet-footer-scroll'

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
  /** Period + total summary under the title: "1 авг. - 31 авг., 30 325 ₽". */
  subtitle: string
  groups: ExpenseDayGroup[]
  emptyText: string
}

/** Scroll-driven footer visibility shared by the expense sheets. */
const AnimatedBottomSheetScrollView = Animated.createAnimatedComponent(BottomSheetScrollView)

export function ExpensesSheet({ title, subtitle, groups, emptyText, ref }: ExpensesSheetProps) {
  const newExpenseSheetRef = useRef<BottomSheetRef>(null)
  const { scrollHandler, buttonTranslationY } = useSheetFooterScroll()

  const handleNewExpense = () => {
    newExpenseSheetRef.current?.present()
  }

  return (
    <>
      <BottomSheet
        ref={ref}
        snapPoints={['90%']}
        stackBehavior="push"
        testID="home-expenses-sheet"
        footerComponent={(props) => (
          <ExpenseSheetFooter
            {...props}
            buttonTranslationY={buttonTranslationY}
            onNewExpensePress={handleNewExpense}
          />
        )}
      >
        {groups.length === 0 ? (
          <BottomSheetView testID="home-expenses-sheet">
            <BottomSheetHeader title={title} subtitle={subtitle} />
            <BottomSheetBody>
              <Text variant="body" className="text-muted-foreground">
                {emptyText}
              </Text>
            </BottomSheetBody>
          </BottomSheetView>
        ) : (
          <>
            <BottomSheetHeader title={title} subtitle={subtitle} />
            <AnimatedBottomSheetScrollView testID="home-expenses-sheet" onScroll={scrollHandler}>
              <BottomSheetBody className="gap-6 pt-4 pb-32">
                {groups.map((group) => (
                  <View key={group.key} className="gap-3" testID={`home-expense-day-${group.key}`}>
                    <View className="flex-row items-center justify-between">
                      <Text variant="button" className="font-medium text-foreground">
                        {group.title}
                      </Text>
                      <Text variant="button" className="text-muted-foreground">
                        {group.totalText}
                      </Text>
                    </View>

                    {group.rows.map((row, index) => (
                      <Fragment key={row.id}>
                        {index > 0 ? <View className="h-px bg-border/10" /> : null}
                        <View
                          className="flex-row items-center gap-4"
                          testID={`home-expense-row-${row.id}`}
                        >
                          <View
                            className={cn(
                              'h-10 w-10 items-center justify-center rounded-full',
                              row.categoryColor ? undefined : 'bg-muted',
                            )}
                            style={
                              row.categoryColor ? { backgroundColor: row.categoryColor } : undefined
                            }
                          >
                            <Icon name={row.categoryIcon} size={20} colorClassName="accent-white" />
                          </View>
                          <Text variant="body" className="flex-1 text-foreground">
                            {row.categoryName}
                          </Text>
                          <Text variant="button">{row.amountText}</Text>
                        </View>
                      </Fragment>
                    ))}
                  </View>
                ))}
              </BottomSheetBody>
            </AnimatedBottomSheetScrollView>
          </>
        )}
      </BottomSheet>

      <NewTransactionSheet
        ref={newExpenseSheetRef}
        kind="expense"
        testID="home-new-expense-sheet"
      />
    </>
  )
}
