import { Text as RNText, type TextProps as RNTextProps } from "react-native"

export type TextVariant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "body-sm"
  | "caption"
  | "label"
  | "button"

export interface TextProps extends Omit<RNTextProps, "className"> {
  className?: string
  variant?: TextVariant
}

const variantStyles: Record<TextVariant, string> = {
  display: "text-5xl font-bold text-foreground",
  h1: "text-4xl font-bold text-foreground",
  h2: "text-3xl font-semibold text-foreground",
  h3: "text-2xl font-semibold text-foreground",
  body: "text-base text-foreground",
  "body-sm": "text-sm text-foreground",
  caption: "text-xs text-muted-foreground",
  label: "text-sm font-medium text-foreground",
  button: "text-base font-medium text-foreground",
}

/**
 * Text - Typography component with semantic variants
 *
 * Provides consistent typography across the app.
 * Always use a variant rather than arbitrary styling for text content.
 *
 * @example
 * <Text variant="h1">Welcome</Text>
 * <Text variant="body">Regular paragraph text</Text>
 * <Text variant="caption">Small helper text</Text>
 */
export function Text(props: TextProps) {
  const { className, variant = "body", style, ...textProps } = props

  const variantClassName = variantStyles[variant]

  return (
    <RNText
      className={`${variantClassName} ${className || ""}`.trim()}
      style={style}
      {...textProps}
    />
  )
}
