import { type ViewProps } from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { Box } from "../box"

export interface ScreenProps extends Omit<ViewProps, "children"> {
  className?: string
  children: React.ReactNode
  safeArea?: boolean
  backgroundColor?: string
}

export function Screen(props: ScreenProps) {
  const {
    className,
    children,
    safeArea = true,
    backgroundColor = "bg-background",
    ...viewProps
  } = props

  const insets = useSafeAreaInsets()

  const content = (
    <Box className={`flex-1 ${backgroundColor} ${className || ""}`} {...viewProps}>
      {children}
    </Box>
  )

  if (safeArea) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
      >
        {content}
      </SafeAreaView>
    )
  }

  return content
}
