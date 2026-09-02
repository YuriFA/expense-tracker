<script setup lang="ts">
import { getTransactionTypeOptions } from '@/entities/transaction'
import { useAccounts } from '@/entities/account'
import { useTransactionsFilters } from '../model/use-transactions-filters'
import { computed } from 'vue'
import { Chip } from '@/shared/ui/chip'
import { useI18n } from 'vue-i18n'
import { useCategoriesIncludingArchived } from '@/entities/category'

const { filters, removeFilter, toggleIdFilter } = useTransactionsFilters()
const { data: accounts } = useAccounts()
// Including archived: this is a join over existing records -
// archived categories stay visible in history/analytics/filters.
const { data: categories } = useCategoriesIncludingArchived()
const transactionOptions = getTransactionTypeOptions()
const { t } = useI18n()

const activeFilters = computed(() => {
  const items: Array<{
    key: string
    label: string
    onRemove: () => void
  }> = []

  const typeValue = transactionOptions.find((item) => item.value === filters.value.type)

  if (typeValue) {
    items.push({
      key: 'type',
      label: `${t('transactions.filters.activeType')}: ${typeValue.label}`,
      onRemove: () => {
        void removeFilter('type')
      },
    })
  }

  // One chip per selected id; removing a chip drops just that id and the
  // filter chip group with it when the selection empties.
  for (const accountId of filters.value.accountIds ?? []) {
    const account = accounts.value?.find((item) => item.id === accountId)
    items.push({
      key: `accountIds:${accountId}`,
      label: `${t('transactions.filters.activeAccount')}: ${account?.name ?? accountId}`,
      onRemove: () => {
        void toggleIdFilter('accountIds', accountId, false)
      },
    })
  }

  for (const categoryId of filters.value.categoryIds ?? []) {
    const category = categories.value?.find((item) => item.id === categoryId)
    items.push({
      key: `categoryIds:${categoryId}`,
      label: `${t('transactions.filters.activeCategory')}: ${category?.icon ?? ''} ${category?.name ?? categoryId}`.trimEnd(),
      onRemove: () => {
        void toggleIdFilter('categoryIds', categoryId, false)
      },
    })
  }

  return items
})
</script>

<template>
  <div v-if="activeFilters.length" class="flex flex-wrap gap-2">
    <Chip
      v-for="filter in activeFilters"
      :key="filter.key"
      variant="outline"
      @remove="filter.onRemove"
    >
      {{ filter.label }}
    </Chip>
  </div>
</template>
