import { useState } from 'react'
import { View } from 'react-native'
import type { DebtDirection } from '@expense-tracker/api'
import { Text } from '@/shared/ui/text'
import { Pressable } from '@/shared/ui/pressable'
import { DEBT_DIRECTION_VIEWS } from '../model/kind'
import type { DebtorSectionView } from '../model/selectors'
import { DebtorRow } from './debtor-row'

/**
 * One direction's debtor list: uppercase section header, balance-descending
 * rows, and the settled (zero-balance) debtors hidden behind a reveal row
 * that carries the count.
 */
export function DebtorSection({
  direction,
  section,
  onDebtorPress,
}: {
  direction: DebtDirection
  section: DebtorSectionView
  onDebtorPress: (debtorId: string, direction: DebtDirection) => void
}) {
  const view = DEBT_DIRECTION_VIEWS[direction]
  const [settledRevealed, setSettledRevealed] = useState(false)

  const rows = settledRevealed ? [...section.visible, ...section.settled] : section.visible

  return (
    <View className="gap-1" testID={`debts-section-${direction}`}>
      <Text variant="caption" className="uppercase tracking-wide text-muted-foreground">
        {view.sectionTitle}
      </Text>

      {rows.length === 0 ? (
        <Text variant="body-sm" className="py-2 text-muted-foreground">
          {view.sectionEmpty}
        </Text>
      ) : (
        rows.map((row) => (
          <DebtorRow
            key={row.debtor.id}
            view={row}
            onPress={() => onDebtorPress(row.debtor.id, direction)}
          />
        ))
      )}

      {section.settled.length > 0 && (
        <Pressable
          testID={`debts-settled-reveal-${direction}`}
          accessibilityRole="button"
          className="py-2 active:opacity-70"
          onPress={() => setSettledRevealed((revealed) => !revealed)}
        >
          <Text variant="body-sm" className="text-muted-foreground">
            {settledRevealed
              ? // TODO(i18n): RU wording until mobile i18n wiring lands.
                'Скрыть рассчитавшихся'
              : `Показать рассчитавшихся (${section.settled.length})`}
          </Text>
        </Pressable>
      )}
    </View>
  )
}
