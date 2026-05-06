import { useSettingsStore } from '@/stores/use-settings-store'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export function useCurrencyFormatter() {
  const { locale } = useI18n()
  const settings = useSettingsStore()

  const formatter = computed(() => {
    return new Intl.NumberFormat(locale.value, {
      style: 'currency',
      currency: settings.currency,
      currencyDisplay: 'narrowSymbol',
    })
  })

  const format = (value: number) => {
    return formatter.value.format(value)
  }

  return { format }
}
