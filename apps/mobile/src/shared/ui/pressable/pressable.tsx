import { cn } from '@/shared/lib/utils'
import { Pressable as RNPressable, type PressableProps as RNPressableProps } from 'react-native'

export interface PressableProps extends RNPressableProps {
  className?: string
}

export function Pressable({ className, children, ...pressableProps }: PressableProps) {
  return (
    <RNPressable
      className={cn('active:opacity-70 disabled:opacity-50', className)}
      {...pressableProps}
    >
      {children}
    </RNPressable>
  )
}
