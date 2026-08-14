import { useEffect, useRef } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import Animated from 'react-native-reanimated'
import { BottomSheetModal, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet'

export interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  /** Used only to derive the scrim testID (`${testID}-scrim`). */
  testID?: string
  /**
   * Content, rendered as the direct child of the sheet modal. Use
   * `BottomSheetView` for static content or `BottomSheetScrollView` for
   * scrollable lists - the sheet sizes itself dynamically to either.
   */
  children: React.ReactNode
}

/**
 * Declarative wrapper over @gorhom/bottom-sheet's imperative
 * BottomSheetModal: `visible` presents/dismisses; swipe-to-close, snap
 * points and keyboard handling come from the library. Requires
 * BottomSheetModalProvider somewhere above (mounted in the root layout).
 */
export function BottomSheet(props: BottomSheetProps) {
  const { visible, onClose, testID = 'bottom-sheet', children } = props
  const ref = useRef<BottomSheetModal>(null)

  useEffect(() => {
    if (visible) ref.current?.present()
    else ref.current?.close()
  }, [visible])

  const renderBackdrop = (backdropProps: BottomSheetBackdropProps) => (
    <Animated.View style={[StyleSheet.absoluteFill, backdropProps.style, scrimStyles.fill]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel="Закрыть"
        accessibilityRole="button"
        testID={`${testID}-scrim`}
      />
    </Animated.View>
  )

  return (
    <BottomSheetModal
      ref={ref}
      backdropComponent={renderBackdrop}
      enableDynamicSizing
      onDismiss={onClose}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      {children}
    </BottomSheetModal>
  )
}

const scrimStyles = StyleSheet.create({
  fill: { backgroundColor: 'rgba(0, 0, 0, 0.2)' },
})
