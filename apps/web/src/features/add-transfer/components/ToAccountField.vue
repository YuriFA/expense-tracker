<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { useAccountsStore } from '@/stores/use-accounts-store'
import { useFieldValue, Field as VeeField } from 'vee-validate'
import type { AddTransferFormValues } from '../validation/add-transfer-schema'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  class?: string
}>()

const { t } = useI18n()
const accounts = useAccountsStore()
const fromAccountId = useFieldValue<AddTransferFormValues['fromAccountId']>('fromAccountId')

const filteredAccounts = computed(() =>
  accounts.items.filter((account) => account.id !== fromAccountId.value),
)
</script>

<template>
  <VeeField v-slot="{ field, errors }" name="toAccountId">
    <Field :class="$props.class" orientation="responsive" :data-invalid="!!errors.length">
      <FieldLabel for="to-account-id">{{ t('addTransaction.toAccountLabel') }}</FieldLabel>
      <Select :name="field.name" :model-value="field.value" @update:model-value="field.onChange">
        <SelectTrigger id="to-account-id" :aria-invalid="!!errors.length" class="w-full! min-w-0">
          <SelectValue :placeholder="t('addTransaction.toAccountPlaceholder')" />
        </SelectTrigger>
        <SelectContent position="item-aligned">
          <SelectItem v-for="item in filteredAccounts" :key="item.id" :value="item.id">
            {{ item.name }}
          </SelectItem>
        </SelectContent>
      </Select>
      <FieldError v-if="errors.length" :errors="errors" />
    </Field>
  </VeeField>
</template>
