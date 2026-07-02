<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { useAccounts } from '@/entities/account/use-accounts'
import { useI18n } from 'vue-i18n'
import { Field as VeeField } from 'vee-validate'

defineProps<{
  class?: string
}>()

const { data } = useAccounts()
const { t } = useI18n()
</script>

<template>
  <VeeField v-slot="{ field, errors }" name="accountId">
    <Field :class="$props.class" orientation="responsive" :data-invalid="!!errors.length">
      <FieldLabel for="account-id">{{ t('transactions.filters.accountLabel') }}</FieldLabel>
      <Select :name="field.name" :model-value="field.value" @update:model-value="field.onChange">
        <SelectTrigger id="account-id" :aria-invalid="!!errors.length">
          <SelectValue :placeholder="t('transactions.filters.accountPlaceholder')" />
        </SelectTrigger>
        <SelectContent position="item-aligned">
          <SelectItem v-for="item in data" :key="item.id" :value="item.id">
            {{ item.name }}
          </SelectItem>
        </SelectContent>
      </Select>
      <FieldError v-if="errors.length" :errors="errors" />
    </Field>
  </VeeField>
</template>
