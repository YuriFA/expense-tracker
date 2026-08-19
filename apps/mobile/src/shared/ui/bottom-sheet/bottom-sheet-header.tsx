import { View } from 'react-native'
import { Text } from '../text'
import { cn } from '@/shared/lib/utils'

interface BottomSheetHeaderProps {
  title: string
  /** Optional muted line under the title, e.g. a period + total summary. */
  subtitle?: string
  /**
   * Optional action flanking the title (e.g. close / edit buttons). When
   * either is set the title renders centered between fixed-width slots.
   */
  left?: React.ReactNode
  right?: React.ReactNode
  className?: string
}

export function BottomSheetHeader({
  title,
  subtitle,
  left,
  right,
  className,
}: BottomSheetHeaderProps) {
  const hasActions = left !== undefined || right !== undefined

  return (
    <View className={cn('px-4 py-2', className)}>
      {hasActions ? (
        <View className="flex-row items-center gap-2">
          <View className="w-10 items-start justify-center">{left}</View>
          <Text variant="h3" className="flex-1 text-center" numberOfLines={1}>
            {title}
          </Text>
          <View className="w-10 items-end justify-center">{right}</View>
        </View>
      ) : (
        <Text variant="h3">{title}</Text>
      )}
      {subtitle ? (
        <Text variant="caption" className="text-muted-foreground">
          {subtitle}
        </Text>
      ) : null}
    </View>
  )
}
