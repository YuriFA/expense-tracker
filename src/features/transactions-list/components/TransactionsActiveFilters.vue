<script setup lang="ts">
import { getTransactionsOptions } from '@/entities/transaction'
import { useAccount } from '@/entities/account'
import { useTransactionsFilters } from '../composables/use-transactions-filters'
import { computed } from 'vue'
import { Chip } from '@/shared/ui/chip'
import { useI18n } from 'vue-i18n'
import { useCategory } from '@/entities/category'

const { filters, removeFilter } = useTransactionsFilters()
const { data: account } = useAccount(() => filters.value.accountId)
const { data: category } = useCategory(() => filters.value.categoryId)
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

  if (account.value) {
    items.push({
      key: 'accountId',
      label: `${t('transactions.filters.activeAccount')}: ${account.value.name}`,
      onRemove: () => {
        void removeFilter('accountId')
      },
    })
  }

  if (category.value) {
    items.push({
      key: 'categoryId',
      label: `${t('transactions.filters.activeCategory')}: ${category.value.icon} ${category.value.name}`,
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
