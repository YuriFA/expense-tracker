import { View } from 'react-native'
import { Text } from '../text'
import { cn } from '@/shared/lib/utils'

interface BottomSheetHeaderProps {
  title: string
  className?: string
}

export function BottomSheetHeader({ title, className }: BottomSheetHeaderProps) {
  return (
    <View className={cn('px-4 py-3', className)}>
      <Text variant="h3">{title}</Text>
    </View>
  )
}
