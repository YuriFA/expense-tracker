<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AVAILABLE_CURRENCIES } from '@/shared/config/currencies'
import { capitalizeFirstLetter } from '@/shared/lib/capitalize'
import { useSettingsStore } from '@/app/use-settings-store'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale, availableLocales } = useI18n()
const settings = useSettingsStore()

const formatNumber = (
  locale: string,
  currency: string,
  currencyDisplay?: Intl.NumberFormatOptionsCurrencyDisplay,
) => {
  const symbol = new Intl.NumberFormat(locale, {
    style: 'currency',
    currencyDisplay,
    currency,
  })
    .formatToParts(1)
    .find((x) => x.type === 'currency')?.value

  return symbol ? symbol[0]?.toUpperCase() + symbol.slice(1) : symbol
}

const currencies = computed(() => {
  const displayNames = new Intl.DisplayNames(locale.value, { type: 'currency' })

  return AVAILABLE_CURRENCIES.map((value) => ({
    id: value,
    label: `${capitalizeFirstLetter(displayNames.of(value) ?? '')} ${value} (${formatNumber(locale.value, value)})`,
  }))
})

const locales = computed(() => {
  const displayNames = new Intl.DisplayNames(locale.value, { type: 'language' })

  return availableLocales.map((value) => ({
    id: value,
    label: capitalizeFirstLetter(displayNames.of(value) ?? ''),
  }))
})
</script>

<template>
  <section>
    <h1 class="text-2xl font-semibold">{{ t('pages.settings') }}</h1>

    <label class="flex items-center gap-2 mt-4">
      <p>{{ t('settings.currency') }}:</p>
      <Select v-model="settings.currency" class="w-full">
        <SelectTrigger>
          <SelectValue :placeholder="t('settings.currency')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="item in currencies" :key="item.id" :value="item.id">
            {{ item.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </label>

    <label class="flex items-center gap-2 mt-4">
      <p>{{ t('settings.locale') }}:</p>
      <Select v-model="settings.locale" class="w-full">
        <SelectTrigger>
          <SelectValue :placeholder="t('settings.locale')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="item in locales" :key="item.id" :value="item.id">
            {{ item.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </label>
  </section>
</template>
