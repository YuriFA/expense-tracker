import { Screen, Text, Card, Stack, Button, TransactionRow, type Transaction } from "@/shared"

// Mock data for demonstration
const mockTransactions: Transaction[] = [
  {
    id: "1",
    amount: -4550,
    description: "Grocery shopping",
    category: "Food",
    date: "2024-01-15",
    type: "expense",
  },
  {
    id: "2",
    amount: 500000,
    description: "Salary",
    category: "Income",
    date: "2024-01-14",
    type: "income",
  },
  {
    id: "3",
    amount: -1250,
    description: "Coffee",
    category: "Food",
    date: "2024-01-14",
    type: "expense",
  },
]

export function DashboardScreen() {
  const totalBalance = mockTransactions.reduce(
    (sum, t) => sum + t.amount,
    0
  )
  const formattedBalance = `$${(totalBalance / 100).toFixed(2)}`

  return (
    <Screen>
      <Stack gap="md" className="p-4">
        {/* Header */}
        <Text variant="h1">Dashboard</Text>

        {/* Balance Card */}
        <Card variant="elevated">
          <Stack gap="sm">
            <Text variant="body-sm" className="text-muted-foreground">
              Total Balance
            </Text>
            <Text variant="display" className="text-primary">
              {formattedBalance}
            </Text>
          </Stack>
        </Card>

        {/* Quick Actions */}
        <Card>
          <Stack gap="sm">
            <Text variant="h3">Quick Actions</Text>
            <Stack gap="sm">
              <Button variant="primary" text="Add Expense" />
              <Button variant="outline" text="Add Income" />
            </Stack>
          </Stack>
        </Card>

        {/* Recent Transactions */}
        <Stack gap="sm">
          <Text variant="h3">Recent Transactions</Text>
          <Stack gap="sm">
            {mockTransactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
              />
            ))}
          </Stack>
        </Stack>

        {/* View All Button */}
        <Button variant="secondary" text="View All Transactions" />
      </Stack>
    </Screen>
  )
}
