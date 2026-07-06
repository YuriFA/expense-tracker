<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Skeleton } from '@/shared/ui/skeleton'
import { useAccounts } from '@/entities/account'
import { useI18n } from 'vue-i18n'

defineProps<{
  errors?: string[]
  class?: string
}>()

const modelValue = defineModel<string | undefined>()

const { data, error, isLoading } = useAccounts()
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
        <template v-if="isLoading">
          <div v-for="n in 3" :key="n" class="px-8 py-2">
            <Skeleton class="h-4 w-full" />
          </div>
        </template>
        <div v-else-if="error" class="px-8 py-2 text-sm text-muted-foreground">
          {{ t('common.errorState.title') }}
        </div>
        <SelectItem v-for="item in data" v-else :key="item.id" :value="item.id">
          {{ item.name }}
        </SelectItem>
      </SelectContent>
    </Select>
    <FieldError v-if="$props.errors?.length" :errors="$props.errors" />
  </Field>
</template>
