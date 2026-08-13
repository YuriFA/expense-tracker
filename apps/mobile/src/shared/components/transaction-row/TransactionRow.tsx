import { View } from "react-native"
import { Card, Text, Badge, Icon, type CardProps } from "@/shared/ui"

export interface Transaction {
  id: string
  amount: number
  description: string
  category?: string
  date: string
  type: "income" | "expense"
}

export interface TransactionRowProps extends Omit<CardProps, "children"> {
  transaction: Transaction
  /**
   * Format amount as currency
   * @default "$"
   */
  currencySymbol?: string
  /**
   * Show category badge
   * @default true
   */
  showCategory?: boolean
  /**
   * Press handler
   */
  onPress?: () => void
}

/**
 * TransactionRow - Display a transaction in a list
 *
 * Domain-specific component for displaying transaction items.
 * Shows amount, description, category, date, and type.
 *
 * TODO: Move to entities/transaction/ui when the entity slice is created.
 *
 * @example
 * <TransactionRow
 *   transaction={{
 *     id: "1",
 *     amount: 4550,
 *     description: "Grocery shopping",
 *     category: "Food",
 *     date: "2024-01-15",
 *     type: "expense"
 *   }}
 *   onPress={handlePress}
 * />
 */
export function TransactionRow(props: TransactionRowProps) {
  const {
    transaction,
    currencySymbol = "$",
    showCategory = true,
    onPress,
    className,
    ...cardProps
  } = props

  const { amount, description, category, date, type } = transaction

  // Format amount (convert cents to major units)
  const formattedAmount = Math.abs(amount / 100).toFixed(2)
  const amountSign = type === "expense" ? "-" : "+"
  const amountText = `${amountSign}${currencySymbol}${formattedAmount}`

  // Determine badge variant based on type
  const badgeVariant = type === "expense" ? "destructive" : "success"

  // Format date (simple format for now)
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })

  return (
    <Card
      className={`${onPress ? "active:opacity-70" : ""} ${className || ""}`.trim()}
      {...cardProps}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 gap-1">
          <Text variant="body" className="font-medium">
            {description}
          </Text>

          <View className="flex-row items-center gap-2">
            {showCategory && category && (
              <Badge variant="default" size="sm">
                {category}
              </Badge>
            )}
            <Text variant="caption" className="text-muted-foreground">
              {formattedDate}
            </Text>
          </View>
        </View>

        <View className="items-end gap-1">
          <Text
            variant="body"
            className={`font-semibold ${
              type === "expense" ? "text-destructive" : "text-success"
            }`}
          >
            {amountText}
          </Text>

          <Badge variant={badgeVariant} size="sm">
            {type}
          </Badge>
        </View>
      </View>
    </Card>
  )
}
