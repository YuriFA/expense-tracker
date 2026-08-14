import { View } from "react-native"
import { Card, Text, Badge, type CardProps } from "@/shared/ui"

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
  currencySymbol?: string
  showCategory?: boolean
  onPress?: () => void
}

// TODO: move to entities/transaction/ui once the entity slice exists.
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

  const formattedAmount = Math.abs(amount / 100).toFixed(2)
  const amountSign = type === "expense" ? "-" : "+"
  const amountText = `${amountSign}${currencySymbol}${formattedAmount}`

  const badgeVariant = type === "expense" ? "destructive" : "success"

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
