import { View } from 'react-native'
import { Text } from '../text'
import { cn } from '@/shared/lib/utils'

interface BottomSheetHeaderProps {
  title: string
  /** Optional muted line under the title, e.g. a period + total summary. */
  subtitle?: string
  className?: string
}

export function BottomSheetHeader({ title, subtitle, className }: BottomSheetHeaderProps) {
  return (
    <View className={cn('gap-1 px-4 py-2', className)}>
      <Text variant="h3">{title}</Text>
      {subtitle ? (
        <Text variant="caption" className="text-muted-foreground">
          {subtitle}
        </Text>
      ) : null}
    </View>
  )
}
