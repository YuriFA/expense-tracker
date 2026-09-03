<script setup lang="ts">
import { Checkbox } from '@/shared/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Skeleton } from '@/shared/ui/skeleton'
import { NO_ACCOUNT_ID, useAccounts } from '@/entities/account'
import { useI18n } from 'vue-i18n'

defineProps<{
  errors?: string[]
  class?: string
}>()

const modelValue = defineModel<string[] | undefined>()

const { data, error, isPending } = useAccounts()
const { t } = useI18n()

/** Toggles one account id inside the committed-on-apply form value. */
const toggle = (accountId: string, included: boolean) => {
  const current = modelValue.value ?? []
  const next = included ? [...current, accountId] : current.filter((id) => id !== accountId)
  modelValue.value = next.length > 0 ? next : undefined
}
</script>

<template>
  <!-- Drawer specimen: multi-select account rows, label left / 20px
       filter-checkbox right. -->
  <Field :class="$props.class" orientation="responsive" :data-invalid="!!$props.errors?.length">
    <FieldLabel class="text-xs font-bold uppercase tracking-wider" for="account-id">
      {{ t('transactions.filters.accountLabel') }}
    </FieldLabel>
    <div class="flex flex-col gap-3" data-testid="transactions-filter-accounts">
      <template v-if="isPending">
        <Skeleton v-for="n in 2" :key="n" class="h-5 w-32" />
      </template>
      <div v-else-if="error" class="text-sm text-muted-foreground">
        {{ t('common.errorState.title') }}
      </div>
      <template v-else>
        <label class="flex cursor-pointer items-center justify-between gap-3">
          <span class="truncate text-sm">{{ t('accounts.noAccount') }}</span>
          <Checkbox
            variant="filter"
            :model-value="modelValue?.includes(NO_ACCOUNT_ID) ?? false"
            :aria-label="t('accounts.noAccount')"
            data-testid="transactions-filter-account-none"
            @update:model-value="(checked) => toggle(NO_ACCOUNT_ID, !!checked)"
          />
        </label>
        <label
          v-for="item in data"
          :key="item.id"
          class="flex cursor-pointer items-center justify-between gap-3"
        >
          <span class="truncate text-sm">{{ item.name }}</span>
          <Checkbox
            variant="filter"
            :model-value="modelValue?.includes(item.id) ?? false"
            :aria-label="item.name"
            :data-testid="`transactions-filter-account-${item.id}`"
            @update:model-value="(checked) => toggle(item.id, !!checked)"
          />
        </label>
      </template>
    </div>
    <FieldError v-if="$props.errors?.length" :errors="$props.errors" />
  </Field>
</template>
