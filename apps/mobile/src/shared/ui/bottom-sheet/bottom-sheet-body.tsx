import { cn } from '@/shared/lib/utils'
import { PropsWithChildren } from 'react'
import { View } from 'react-native'

interface BottomSheetBodyProps extends PropsWithChildren {
  className?: string
}

export function BottomSheetBody({ className, children }: BottomSheetBodyProps) {
  return <View className={cn('flex-1 px-4', className)}>{children}</View>
}
