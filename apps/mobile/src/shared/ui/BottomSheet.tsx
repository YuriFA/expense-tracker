import { useEffect, useRef, useState } from 'react'
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  Animated,
  AccessibilityInfo,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { type PropsWithChildren } from 'react'
import { useTokens } from './theme'
import { Text } from './Text'

interface BottomSheetProps extends PropsWithChildren {
  visible: boolean
  onClose: () => void
  title?: string
  /** Panel max height fraction of the viewport (0..1). */
  heightRatio?: number
  contentStyle?: ViewStyle
}

/**
 * Bottom sheet - the canonical surface for secondary actions (filters, edit
 * forms, account/category create). Built on RN's `Modal` so it is self-contained
 * (no extra provider/gesture setup) and works everywhere. A future task can
 * upgrade to `@gorhom/bottom-sheet` for drag-to-dismiss + snap points without
 * changing call sites: the props (`visible`/`onClose`/children) stay the same.
 *
 * Respects the bottom safe-area inset and sits above the keyboard.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  heightRatio = 0.6,
  contentStyle,
  children,
}: BottomSheetProps) {
  const tokens = useTokens()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const slide = useRef(new Animated.Value(0)).current
  const [reduceMotion, setReduceMotion] = useState(false)

  // Respect Reduce Motion (design section 11): present/dismiss instantly
  // instead of sliding.
  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    return () => sub.remove()
  }, [])

  // Slide the panel up on present; snap back on dismiss. Reduce Motion users
  // see an instant transition.
  useEffect(() => {
    if (reduceMotion) {
      slide.setValue(visible ? 1 : 0)
      return
    }
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start()
  }, [visible, slide, reduceMotion])

  const panelHeight = Math.max(220, height * heightRatio)

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} accessibilityLabel="Close" onPress={onClose} />
        <Animated.View
          accessibilityRole="alert"
          style={[
            styles.panel,
            {
              backgroundColor: tokens.surface,
              borderTopColor: tokens.border,
              height: panelHeight,
              paddingBottom: insets.bottom + 8,
              transform: [
                {
                  translateY: slide.interpolate({
                    inputRange: [0, 1],
                    outputRange: [panelHeight, 0],
                  }),
                },
              ],
            },
            contentStyle,
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: tokens.mutedForeground }]} />
          {title ? (
            <Text size="title" weight={600} style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
              {title}
            </Text>
          ) : null}
          <View style={{ flex: 1, paddingHorizontal: 20 }}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
})
