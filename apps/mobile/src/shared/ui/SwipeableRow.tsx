import { useRef, type ReactNode } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { Text } from './Text'

export interface SwipeAction {
  /** Short label rendered inside the revealed button. */
  label: string
  /** Background fill for the action tile (destructive red, ink, etc.). */
  color: string
  onPress: () => void
  /** A11y label for the revealed button (defaults to `label`). */
  accessibilityLabel?: string
}

interface SwipeableRowProps {
  children: ReactNode
  /** Actions revealed on left-swipe (the natural thumb direction). */
  rightActions: SwipeAction[]
}

/**
 * Swipeable list row (design section 7: "swipe-left for quick actions"). Wraps
 * any row content and reveals the supplied right-side actions on swipe; tapping
 * an action runs it and snaps the row closed. The canonical quick-action
 * surface, reused by the Home recent list now and the Accounts/Transactions
 * lists later.
 *
 * Built on `react-native-gesture-handler`'s `Swipeable`, which is reliable on
 * Expo and already required by the scaffold for touch handling. When no actions
 * are supplied it renders the children untouched.
 */
export function SwipeableRow({ children, rightActions }: SwipeableRowProps) {
  const ref = useRef<Swipeable>(null)

  if (rightActions.length === 0) {
    return <>{children}</>
  }

  return (
    <Swipeable
      ref={ref}
      friction={2}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.actions}>
          {rightActions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel ?? action.label}
              onPress={() => {
                action.onPress()
                ref.current?.close()
              }}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: action.color, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text size="label" weight={600} tone="inverse">
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    >
      {children}
    </Swipeable>
  )
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  action: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderRadius: 12,
  },
})
