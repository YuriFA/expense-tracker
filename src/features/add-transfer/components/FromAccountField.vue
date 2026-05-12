<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldError } from '@/components/ui/field'
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
const toAccountId = useFieldValue<AddTransferFormValues['toAccountId']>('toAccountId')

const filteredAccounts = computed(() =>
  accounts.items.filter((account) => account.id !== toAccountId.value),
)
</script>

<template>
  <VeeField v-slot="{ field, errors }" name="fromAccountId">
    <Field :class="$props.class" orientation="responsive" :data-invalid="!!errors.length">
      <Select :name="field.name" :model-value="field.value" @update:model-value="field.onChange">
        <SelectTrigger id="from-account-id" :aria-invalid="!!errors.length" class="w-full! min-w-0">
          <SelectValue :placeholder="t('addTransfer.fromAccountPlaceholder')" />
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
