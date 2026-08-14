import { Pressable, View } from 'react-native'
import { Card, Icon, Row, Stack, Text } from '@/shared/ui'
import type { LatestExpenseView } from './AllExpensesCard.types'

export interface AllExpensesCardProps {
  latest: LatestExpenseView | null
  onOpen: () => void
}

/**
 * "Все расходы" card: previews the most recent expense of the selected
 * period and opens the period's expense list (bottom sheet) on tap.
 */
export function AllExpensesCard(props: AllExpensesCardProps) {
  const { latest, onOpen } = props

  return (
    <Card variant="default">
      <Stack gap="sm">
        <Text variant="body-sm" className="text-muted-foreground">
          Все расходы
        </Text>

        {latest ? (
          <Pressable
            testID="home-all-expenses"
            accessibilityRole="button"
            accessibilityLabel={`Все расходы, последний ${latest.categoryName}`}
            className="active:opacity-70"
            onPress={onOpen}
          >
            <Row align="center" gap="md">
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: latest.categoryColor }}
              >
                <Icon name={latest.categoryIcon} size={20} color="#FFFFFF" />
              </View>
              <Stack gap="xs" className="flex-1">
                <Text variant="caption" className="text-muted-foreground">
                  Последний · {latest.dayLabel}
                </Text>
                <Text variant="body" className="font-semibold">
                  {latest.amountText} · {latest.categoryName}
                </Text>
              </Stack>
              <Icon name="chevron-forward" size={18} color="#737373" />
            </Row>
          </Pressable>
        ) : (
          <Stack gap="xs">
            <Text variant="body" className="text-muted-foreground">
              В этом месяце расходов нет
            </Text>
            <Text variant="caption" className="text-muted-foreground">
              Нажмите «+», чтобы добавить расход
            </Text>
          </Stack>
        )}
      </Stack>
    </Card>
  )
}
