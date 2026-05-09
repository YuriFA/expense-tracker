<script setup lang="ts">
import { CURRENCY_SYMBOLS } from '@/shared/config/currencies'
import { moneyMaskitoOptions } from '@/shared/lib/maskito'
import { useSettingsStore } from '@/stores/use-settings-store'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Field as VeeField } from 'vee-validate'
import { Field, FieldError } from '@/components/ui/field'
import { ButtonGroup } from '@/components/ui/button-group'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

defineProps<{
  class?: string
}>()

const { t } = useI18n()
const settings = useSettingsStore()

const currencySymbol = computed(
  () => CURRENCY_SYMBOLS[settings.currency as keyof typeof CURRENCY_SYMBOLS] ?? settings.currency,
)
</script>

<template>
  <VeeField v-slot="{ field, errors }" name="amount">
    <Field :class="$props.class" :data-invalid="!!errors.length">
      <ButtonGroup>
        <Input
          id="amount"
          v-bind="field"
          v-maskito="moneyMaskitoOptions"
          :placeholder="t('addTransaction.amountPlaceholder')"
          :aria-invalid="!!errors.length"
          class="min-w-0"
        />
        <Button
          variant="outline"
          disabled
          size="icon"
          :aria-label="t('addTransaction.currentCurrency')"
          :aria-invalid="!!errors.length"
          class="shrink-0"
        >
          {{ currencySymbol }}
        </Button>
      </ButtonGroup>
      <FieldError v-if="errors.length" :errors="errors" />
    </Field>
  </VeeField>
</template>
