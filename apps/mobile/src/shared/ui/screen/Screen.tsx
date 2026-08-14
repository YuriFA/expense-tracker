import { type ViewProps } from 'react-native'
import { Box } from '../box'

export interface ScreenProps extends Omit<ViewProps, 'children'> {
  className?: string
  children: React.ReactNode
  backgroundColor?: string
}

export function Screen(props: ScreenProps) {
  const { className, children, ...viewProps } = props

  return (
    <Box className={`flex-1 p-safe bg-background ${className || ''}`} {...viewProps}>
      {children}
    </Box>
  )
}
