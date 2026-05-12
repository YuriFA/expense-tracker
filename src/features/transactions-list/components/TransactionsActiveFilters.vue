<script setup lang="ts">
import { getTransactionsOptions } from '@/entities/transaction/constants'
import { useAccountsStore } from '@/stores/use-accounts-store'
import { useCategoriesStore } from '@/stores/use-categories-store'
import { useTransactionsFilters } from '../composables/use-transactions-filters'
import { computed } from 'vue'
import { Chip } from '@/components/ui/chip'
import { useI18n } from 'vue-i18n'

const { typeQuery, accountIdQuery, categoryIdQuery } = useTransactionsFilters()
const accounts = useAccountsStore()
const categories = useCategoriesStore()
const transactionOptions = getTransactionsOptions()
const { t } = useI18n()

const activeFilters = computed(() => {
  const filters: Array<{
    key: 'type' | 'accountId' | 'categoryId'
    label: string
    onRemove: () => void
  }> = []

  const typeValue = transactionOptions.find((item) => item.value === typeQuery.value)

  if (typeValue) {
    filters.push({
      key: 'type',
      label: `${t('transactions.filters.activeType')}: ${typeValue.label}`,
      onRemove: () => {
        typeQuery.value = null
      },
    })
  }

  const account = accountIdQuery.value ? accounts.findById(accountIdQuery.value) : undefined

  if (account) {
    filters.push({
      key: 'accountId',
      label: `${t('transactions.filters.activeAccount')}: ${account.name}`,
      onRemove: () => {
        accountIdQuery.value = null
      },
    })
  }

  const category = categoryIdQuery.value ? categories.findById(categoryIdQuery.value) : undefined

  if (category) {
    filters.push({
      key: 'categoryId',
      label: `${t('transactions.filters.activeCategory')}: ${category.icon} ${category.name}`,
      onRemove: () => {
        categoryIdQuery.value = null
      },
    })
  }

  return filters
})
</script>

<template>
  <div v-if="activeFilters.length" class="flex flex-wrap gap-2">
    <Chip
      v-for="filter in activeFilters"
      :key="filter.key"
      variant="outline"
      :on-remove="filter.onRemove"
    >
      {{ filter.label }}
    </Chip>
  </div>
</template>
