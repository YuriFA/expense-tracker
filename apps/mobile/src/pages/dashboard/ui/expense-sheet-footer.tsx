import { View } from 'react-native'
import { BottomSheetFooter, BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Pressable } from '@/shared/ui/pressable'
import { Icon } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import Animated, { SharedValue } from 'react-native-reanimated'

// inherent the `BottomSheetFooterProps` to be able receive
// `animatedFooterPosition`.
interface ExpenseSheetFooterProps extends BottomSheetFooterProps {
  buttonTranslationY?: SharedValue<number>
  onNewExpensePress?: () => void
  /** @default 'home-new-expense-button' */
  testID?: string
}

export const ExpenseSheetFooter = ({
  animatedFooterPosition,
  buttonTranslationY,
  onNewExpensePress,
  testID = 'home-new-expense-button',
}: ExpenseSheetFooterProps) => {
  const { bottom: bottomSafeArea } = useSafeAreaInsets()

  return (
    <BottomSheetFooter bottomInset={bottomSafeArea} animatedFooterPosition={animatedFooterPosition}>
      <View
        pointerEvents="none"
        className="absolute inset-x-0 -bottom-safe h-32 bg-linear-to-t from-white to-transparent"
      />
      <Animated.View
        className="items-center"
        style={{ transform: [{ translateY: buttonTranslationY || 0 }] }}
      >
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel="Новый расход"
          className="flex-row items-center gap-2 rounded-full bg-primary px-6 py-3 shadow-lg"
          onPress={onNewExpensePress}
        >
          <Icon name="add" size={18} colorClassName="accent-primary-foreground" />
          <Text variant="button" className="text-primary-foreground">
            Новый расход
          </Text>
        </Pressable>
      </Animated.View>
    </BottomSheetFooter>
  )
}
