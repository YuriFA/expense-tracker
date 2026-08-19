import { ActivityIndicator } from 'react-native'
import { Icon } from '@/shared/ui/icon'
import { Pressable } from '@/shared/ui/pressable'
import { cn } from '@/shared/lib/utils'

/** Circular checkmark confirm button from the reference design. */
export function TransactionSubmitButton({
  className,
  disabled,
  loading,
  onPress,
}: {
  className?: string
  disabled: boolean
  loading: boolean
  onPress: () => void
}) {
  const isBlocked = disabled || loading

  return (
    <Pressable
      testID="new-transaction-submit"
      accessibilityRole="button"
      accessibilityLabel="Сохранить транзакцию"
      accessibilityState={{ disabled: isBlocked }}
      disabled={isBlocked}
      className={cn(
        'size-12 items-center justify-center rounded-full bg-primary',
        isBlocked && 'opacity-40',
        className,
      )}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator colorClassName="accent-primary-foreground" />
      ) : (
        <Icon name="checkmark" size={28} colorClassName="accent-primary-foreground" />
      )}
    </Pressable>
  )
}
