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
