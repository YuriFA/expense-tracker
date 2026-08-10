import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useTokens } from './theme'
import { Text } from './Text'
import { Button } from './Button'

interface ErrorStateProps {
  /** Override the default localized heading. */
  heading?: string
  /** Re-run the failed query/mutation. */
  onRetry?: () => void
}

/**
 * Error state (design section 9): a destructive-tinted heading + a retry
 * button. Rendered in place of the failed content (no colored chrome, severity
 * conveyed by the destructive tone of the heading only).
 */
export function ErrorState({ heading, onRetry }: ErrorStateProps) {
  const tokens = useTokens()
  const { t } = useTranslation()

  return (
    <View style={[styles.container, { backgroundColor: tokens.background }]}>
      <Text size="title" weight={600} tone="destructive" style={{ textAlign: 'center' }}>
        {heading ?? t('common.errorState.title')}
      </Text>
      {onRetry ? (
        <Button variant="outline" onPress={onRetry} style={{ marginTop: 4 }}>
          {t('common.errorState.retry')}
        </Button>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
})
