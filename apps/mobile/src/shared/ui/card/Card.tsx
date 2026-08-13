import { View } from "react-native"
import { Box, type BoxProps } from "../box"

export type CardVariant = "default" | "outlined" | "elevated"

export interface CardProps extends BoxProps {
  variant?: CardVariant
}

const variantStyles: Record<CardVariant, string> = {
  default: "bg-card",
  outlined: "bg-card border border-border",
  elevated: "bg-card shadow-md",
}

/**
 * Card - Container component for related content
 *
 * Use cards to group related information and actions.
 * Commonly used for transactions, accounts, and summary sections.
 *
 * @example
 * <Card variant="outlined">
 *   <Text variant="h3">Balance</Text>
 *   <Text>$1,234.56</Text>
 * </Card>
 */
export function Card(props: CardProps) {
  const { variant = "default", className, ...boxProps } = props

  const variantClassName = variantStyles[variant]

  return (
    <Box
      className={`${variantClassName} rounded-lg p-4 ${className || ""}`.trim()}
      {...boxProps}
    />
  )
}
