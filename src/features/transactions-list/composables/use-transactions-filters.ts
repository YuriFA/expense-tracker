import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  parseTransactionsQuery,
  serializeTransactionsQuery,
  type TransactionsFilters,
} from '../lib/transactions-query'

export function useTransactionsFilters() {
  const route = useRoute()
  const router = useRouter()

  const filters = computed(() => parseTransactionsQuery(route.query))

  const setFilters = async (patch: Partial<TransactionsFilters>) => {
    const nextFilters: TransactionsFilters = {
      ...filters.value,
      ...patch,
    }

    await router.replace({
      query: serializeTransactionsQuery(nextFilters),
    })
  }

  const removeFilter = async (key: 'type' | 'accountId' | 'categoryId') => {
    await setFilters({
      [key]: undefined,
    })
  }

  const resetFilters = async () => {
    await setFilters({
      type: undefined,
      accountId: undefined,
      categoryId: undefined,
    })
  }

  return {
    filters,
    removeFilter,
    setFilters,
    resetFilters,
  }
}
