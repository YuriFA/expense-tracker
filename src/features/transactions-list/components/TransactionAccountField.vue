<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { useAccounts } from '@/entities/account'
import { useI18n } from 'vue-i18n'

defineProps<{
  errors?: string[]
  class?: string
}>()

const modelValue = defineModel<string | undefined>()

const { data } = useAccounts()
const { t } = useI18n()
</script>

<template>
  <Field :class="$props.class" orientation="responsive" :data-invalid="!!$props.errors?.length">
    <FieldLabel for="account-id">{{ t('transactions.filters.accountLabel') }}</FieldLabel>
    <Select v-model="modelValue">
      <SelectTrigger id="account-id" :aria-invalid="!!$props.errors?.length">
        <SelectValue :placeholder="t('transactions.filters.accountPlaceholder')" />
      </SelectTrigger>
      <SelectContent position="item-aligned">
        <SelectItem v-for="item in data" :key="item.id" :value="item.id">
          {{ item.name }}
        </SelectItem>
      </SelectContent>
    </Select>
    <FieldError v-if="$props.errors?.length" :errors="$props.errors" />
  </Field>
</template>
