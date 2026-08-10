import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Screen, Text } from '@shared/ui'

/**
 * Home screen placeholder.
 *
 * Per the mobile design (section 3) the Home screen IS the input screen - the
 * amount field is the hero, autofocus on open, numeric keypad instantly, serial
 * entry after save. Building that input experience is the next task; this shell
 * renders a clear placeholder so navigation + providers boot verifiably.
 */
export function HomeScreen() {
  const { t } = useTranslation()
  return (
    <Screen centered>
      <View style={styles.container}>
        <Text size="display" weight={700}>
          {t('nav.dashboard')}
        </Text>
        <Text size="body" tone="muted" style={{ textAlign: 'center', marginTop: 8 }}>
          Input screen - coming next
        </Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
})
