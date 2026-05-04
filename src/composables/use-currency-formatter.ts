import { useSettingsStore } from '@/stores/use-settings-store'
import { computed } from 'vue'

export function useCurrencyFormatter() {
  const store = useSettingsStore()

  const formatter = computed(() => {
    return new Intl.NumberFormat(store.locale, {
      style: 'currency',
      currency: store.currency,
      currencyDisplay: 'narrowSymbol',
    })
  })

  const format = (value: number) => {
    return formatter.value.format(value)
  }

  return { format }
}
