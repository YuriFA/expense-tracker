import { View } from "react-native"
import { Text } from "../text"

export type BadgeVariant = "default" | "primary" | "secondary" | "success" | "warning" | "destructive"
export type BadgeSize = "sm" | "md"

export interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  className?: string
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: "bg-muted", text: "text-foreground" },
  primary: { bg: "bg-primary", text: "text-primary-foreground" },
  secondary: { bg: "bg-secondary", text: "text-secondary-foreground" },
  success: { bg: "bg-success", text: "text-success-foreground" },
  warning: { bg: "bg-warning", text: "text-warning-foreground" },
  destructive: { bg: "bg-destructive", text: "text-destructive-foreground" },
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 rounded-md",
  md: "px-2.5 py-1 rounded-md",
}

const textSizeStyles: Record<BadgeSize, string> = {
  sm: "text-xs",
  md: "text-sm",
}

/**
 * Badge - Small status or category indicator
 *
 * Use for status indicators, categories, or tags.
 * Generic component - don't use for domain-specific badges.
 *
 * @example
 * <Badge variant="success">Completed</Badge>
 * <Badge variant="warning">Pending</Badge>
 */
export function Badge(props: BadgeProps) {
  const { children, variant = "default", size = "md", className } = props

  const { bg: bgClassName, text: textClassName } = variantStyles[variant]
  const sizeClassName = sizeStyles[size]
  const textSizeClassName = textSizeStyles[size]

  return (
    <View
      className={`${bgClassName} ${sizeClassName} self-start ${className || ""}`.trim()}
    >
      <Text variant="body-sm" className={textClassName}>
        {children}
      </Text>
    </View>
  )
}
