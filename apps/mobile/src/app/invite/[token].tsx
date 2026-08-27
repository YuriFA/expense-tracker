import { useLocalSearchParams } from 'expo-router'
import { InviteScreen } from '@/pages/invite'

// Deep-link route for emailed invitation accept links: /invite/<token>.
// A missing/blank token falls through to the screen's error card (the
// preview call rejects with the backend's not-found verdict) - the screen
// stays robust to stale or hand-typed links, like analytics-detail.
export default function InviteRoute() {
  const { token } = useLocalSearchParams<{ token: string }>()
  return <InviteScreen token={token ?? ''} />
}
