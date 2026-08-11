import { ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BottomSheet, ListRow, Text, useTokens } from '@shared/ui'
import { haptics } from '@shared/lib/haptics'
import { currencySymbol } from '@shared/lib/format'
import type { AccountWithBalance } from '@expense-tracker/api'

interface AccountPickerSheetProps {
  visible: boolean
  onClose: () => void
  /** Title shown at the top of the sheet. */
  title: string
  accounts: AccountWithBalance[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/**
 * A native-feeling account picker (the Home "account button" target and the
 * transfer From/To target). Renders accounts as tappable rows - name + narrow
 * currency symbol, with an ink check on the selected row - inside the shared
 * {@link BottomSheet}. A light haptic fires on selection; picking a row closes
 * the sheet.
 */
export function AccountPickerSheet({
  visible,
  onClose,
  title,
  accounts,
  selectedId,
  onSelect,
}: AccountPickerSheetProps) {
  const tokens = useTokens()

  const handleSelect = (id: string) => {
    if (id !== selectedId) {
      haptics.impact('light')
      onSelect(id)
    }
    onClose()
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} heightRatio={0.6}>
      <ScrollView contentContainerStyle={{ gap: 4, paddingVertical: 4 }} keyboardShouldPersistTaps="handled">
        {accounts.map((account, index) => {
          const selected = account.id === selectedId
          return (
            <ListRow
              key={account.id}
              onPress={() => handleSelect(account.id)}
              divider={index < accounts.length - 1}
              leading={
                <Text size="label" weight={600} tone="muted">
                  {currencySymbol(account.currency)}
                </Text>
              }
              trailing={
                selected ? <Ionicons name="checkmark" size={18} color={tokens.ink} /> : null
              }
            >
              <Text size="body" weight={selected ? 600 : 500} numberOfLines={1}>
                {account.name}
              </Text>
            </ListRow>
          )
        })}
      </ScrollView>
    </BottomSheet>
  )
}
