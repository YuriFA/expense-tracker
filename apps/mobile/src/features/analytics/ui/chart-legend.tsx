import { View } from 'react-native'
import { Text } from '@/shared/ui/text'
import type { ChartEntry } from '../model/selectors'

export interface ChartLegendProps {
  entries: ChartEntry[]
  /** Row testIDs are `${testIdPrefix}-${entry.id}`. */
  testIdPrefix?: string
}

/** Color-dot rows mirroring exactly what the paired donut shows (same order). */
export function ChartLegend({ entries, testIdPrefix = 'analytics-legend' }: ChartLegendProps) {
  return (
    <View className="gap-2">
      {entries.map((entry) => (
        <View
          key={entry.id}
          className="flex-row items-center gap-2"
          testID={`${testIdPrefix}-${entry.id}`}
        >
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <Text variant="body-sm">{entry.label}</Text>
        </View>
      ))}
    </View>
  )
}
