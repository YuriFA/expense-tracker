import { View } from 'react-native'
import { BottomSheetFooter, BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Pressable } from '@/shared/ui/pressable'
import { Icon } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import Animated, { SharedValue } from 'react-native-reanimated'

// Inherent the `BottomSheetFooterProps` to be able to receive
// `animatedFooterPosition`.
interface SheetFooterProps extends BottomSheetFooterProps {
  buttonTranslationY?: SharedValue<number>
  onPress?: () => void
  /** «Новый расход» / «Новый доход» — also the accessibility label. */
  label: string
  testID: string
}

export const SheetFooter = ({
  animatedFooterPosition,
  buttonTranslationY,
  onPress,
  label,
  testID,
}: SheetFooterProps) => {
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
          accessibilityLabel={label}
          className="flex-row items-center gap-2 rounded-full bg-primary px-6 py-3 shadow-lg"
          onPress={onPress}
        >
          <Icon name="add" size={18} colorClassName="accent-primary-foreground" />
          <Text variant="button" className="text-primary-foreground">
            {label}
          </Text>
        </Pressable>
      </Animated.View>
    </BottomSheetFooter>
  )
}
