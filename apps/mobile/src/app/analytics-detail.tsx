import { useLocalSearchParams } from 'expo-router'
import { AnalyticsDetailScreen } from '@/pages/analytics-detail'

// Route params: /analytics-detail?type=expense|income. Anything else
// (including a missing param) falls back to expenses - the screen stays
// robust to stale or hand-typed deep links.
export default function AnalyticsDetailRoute() {
  const { type } = useLocalSearchParams<{ type?: string }>()
  return <AnalyticsDetailScreen direction={type === 'income' ? 'income' : 'expense'} />
}
