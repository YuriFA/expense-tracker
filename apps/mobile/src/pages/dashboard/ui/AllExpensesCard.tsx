import { Pressable } from 'react-native'
import { Card, Icon, Row, Stack, Text } from '@/shared/ui'
import type { LatestExpenseView } from './AllExpensesCard.types'

interface AllExpensesCardProps {
  latest: LatestExpenseView | null
  onOpen: () => void
}

export function AllExpensesCard({ latest, onOpen }: AllExpensesCardProps) {
  return (
    <Card variant="default" className="bg-emerald-100">
      <Stack className="gap-2">
        <Text variant="h4">Все расходы</Text>

        {latest ? (
          <Pressable
            testID="home-all-expenses"
            accessibilityRole="button"
            accessibilityLabel={`Все расходы, последний ${latest.categoryName}`}
            className="active:opacity-70"
            onPress={onOpen}
          >
            <Row align="center" className="gap-4">
              <Stack className="flex-1 gap-2">
                <Text variant="body" className="text-muted-foreground">
                  Последний {latest.dayLabel.toLowerCase()}
                  {'\n'}
                  {latest.amountText}, {latest.categoryName}
                </Text>
              </Stack>
              <Icon name="chevron-forward" size={18} color="#737373" />
            </Row>
          </Pressable>
        ) : (
          <Stack className="gap-2">
            <Text variant="body" className="text-muted-foreground">
              Расходов нет
            </Text>
          </Stack>
        )}
      </Stack>
    </Card>
  )
}
