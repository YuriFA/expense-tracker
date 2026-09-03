<script setup lang="ts">
import {
  ResponsiveSelect,
  ResponsiveSelectContent,
  ResponsiveSelectItem,
  ResponsiveSelectTrigger,
  ResponsiveSelectValue,
} from '@/shared/ui/select'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { useAccounts } from '../model/use-accounts'
import { isNoAccount, NO_ACCOUNT_ID } from '../model/no-account'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  label: string
  placeholder: string
  inputId: string
  errors?: string[]
  excludeId?: string
  class?: string
  /** Offer the «Без счета» choice (cashflow forms only; transfers and
   * adjustments always require a real account). Absent = not offered. */
  allowNone?: boolean
}>()

const modelValue = defineModel<string | undefined>()

const { t } = useI18n()
const { data } = useAccounts()

const filteredAccounts = computed(() =>
  props.excludeId ? data.value?.filter((account) => account.id !== props.excludeId) : data.value,
)
// The trigger slot must resolve the selected label itself: reka's option
// registry is ephemeral (options unregister on unmount, so it is empty once
// the picker closes), which is exactly when the trigger still has to show
// the value. Same constraint as CategorySelect.
const selectedAccount = computed(() =>
  filteredAccounts.value?.find((account) => account.id === modelValue.value),
)
const selectedLabel = computed(() => {
  if (selectedAccount.value) return selectedAccount.value.name
  if (props.allowNone && isNoAccount(modelValue.value)) return t('accounts.noAccount')
  return props.placeholder
})
</script>

<template>
  <Field :class="props.class" orientation="responsive" :data-invalid="!!props.errors?.length">
    <FieldLabel :for="props.inputId">{{ props.label }}</FieldLabel>
    <ResponsiveSelect v-model="modelValue">
      <ResponsiveSelectTrigger
        :id="props.inputId"
        :aria-invalid="!!props.errors?.length"
        class="w-full! min-w-0"
      >
        <ResponsiveSelectValue :placeholder="props.placeholder">
          {{ selectedLabel }}
        </ResponsiveSelectValue>
      </ResponsiveSelectTrigger>
      <ResponsiveSelectContent :title="props.label">
        <ResponsiveSelectItem v-if="props.allowNone" :value="NO_ACCOUNT_ID">
          {{ t('accounts.noAccount') }}
        </ResponsiveSelectItem>
        <ResponsiveSelectItem v-for="item in filteredAccounts" :key="item.id" :value="item.id">
          {{ item.name }}
        </ResponsiveSelectItem>
      </ResponsiveSelectContent>
    </ResponsiveSelect>
    <FieldError v-if="props.errors?.length" :errors="props.errors" />
  </Field>
</template>
