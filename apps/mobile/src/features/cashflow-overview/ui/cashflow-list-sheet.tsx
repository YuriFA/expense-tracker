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
import type { CashflowDayGroup, CashflowKind } from '../model/selectors'
import { CASHFLOW_KIND_VIEWS } from './kind'
import { SheetFooter } from './sheet-footer'
import { useSheetFooterScroll } from './use-sheet-footer-scroll'

export interface CashflowRowView {
  id: string
  description: string
  categoryName: string
  categoryIcon: IconName
  /** Data color (hex from the category record); falls back to `bg-muted`. */
  categoryColor: string | undefined
  dayLabel: string
  amountText: string
}

export interface CashflowListSheetProps {
  ref: React.Ref<BottomSheetRef>
  kind: CashflowKind
  /** Period + total summary under the title: "1 авг. - 31 авг., 30 325 ₽". */
  subtitle: string
  groups: CashflowDayGroup[]
}

/** Scroll-driven footer visibility shared by the cashflow sheets. */
const AnimatedBottomSheetScrollView = Animated.createAnimatedComponent(BottomSheetScrollView)

export function CashflowListSheet({ kind, subtitle, groups, ref }: CashflowListSheetProps) {
  const { copy, ids } = CASHFLOW_KIND_VIEWS[kind]
  const newTransactionSheetRef = useRef<BottomSheetRef>(null)
  const { scrollHandler, buttonTranslationY } = useSheetFooterScroll()

  const handleNewTransaction = () => {
    newTransactionSheetRef.current?.present()
  }

  return (
    <>
      <BottomSheet
        ref={ref}
        snapPoints={['90%']}
        stackBehavior="push"
        testID={ids.listSheet}
        footerComponent={(props) => (
          <SheetFooter
            {...props}
            buttonTranslationY={buttonTranslationY}
            onPress={handleNewTransaction}
            label={copy.newTransaction}
            testID={ids.newTransactionButton}
          />
        )}
      >
        {groups.length === 0 ? (
          <BottomSheetView testID={ids.listSheet}>
            <BottomSheetHeader title={copy.listTitle} subtitle={subtitle} />
            <BottomSheetBody>
              <Text variant="body" className="text-muted-foreground">
                {copy.monthEmpty}
              </Text>
            </BottomSheetBody>
          </BottomSheetView>
        ) : (
          <>
            <BottomSheetHeader title={copy.listTitle} subtitle={subtitle} />
            <AnimatedBottomSheetScrollView testID={ids.listSheet} onScroll={scrollHandler}>
              <BottomSheetBody className="gap-6 pt-4 pb-32">
                {groups.map((group) => (
                  <View key={group.key} className="gap-3" testID={`${ids.listDay}-${group.key}`}>
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
                          testID={`${ids.listRow}-${row.id}`}
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
        ref={newTransactionSheetRef}
        kind={kind}
        testID={ids.newTransactionSheet}
      />
    </>
  )
}
