<script setup lang="ts">
import { getTransactionsOptions } from '@/entities/transaction/constants'
import { useAccountsStore } from '@/stores/use-accounts-store'
import { useCategoriesStore } from '@/stores/use-categories-store'
import { useTransactionsFilters } from '../composables/use-transactions-filters'
import { computed } from 'vue'
import { Chip } from '@/components/ui/chip'
import { useI18n } from 'vue-i18n'

const { filters, removeFilter } = useTransactionsFilters()
const accounts = useAccountsStore()
const categories = useCategoriesStore()
const transactionOptions = getTransactionsOptions()
const { t } = useI18n()

const activeFilters = computed(() => {
  const items: Array<{
    key: 'type' | 'accountId' | 'categoryId'
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

  const account = filters.value.accountId ? accounts.findById(filters.value.accountId) : undefined

  if (account) {
    items.push({
      key: 'accountId',
      label: `${t('transactions.filters.activeAccount')}: ${account.name}`,
      onRemove: () => {
        void removeFilter('accountId')
      },
    })
  }

  const category = filters.value.categoryId
    ? categories.findById(filters.value.categoryId)
    : undefined

  if (category) {
    items.push({
      key: 'categoryId',
      label: `${t('transactions.filters.activeCategory')}: ${category.icon} ${category.name}`,
      onRemove: () => {
        void removeFilter('categoryId')
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
