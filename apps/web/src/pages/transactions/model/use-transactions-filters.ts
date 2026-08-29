import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  parseTransactionsQuery,
  serializeTransactionsQuery,
  type TransactionsFilters,
} from '../lib/transactions-query'

/** Clears ONE id out of a multi-select filter, dropping the filter when empty. */
function removeIdFromList(list: string[] | undefined, id: string): string[] | undefined {
  const next = list?.filter((item) => item !== id)
  return next?.length ? next : undefined
}

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

  /** Toggles one id inside a multi-select account/category filter. */
  const toggleIdFilter = async (
    key: 'accountIds' | 'categoryIds',
    id: string,
    included: boolean,
  ) => {
    const current = filters.value[key]
    const next = included
      ? [...(current ?? []), id]
      : removeIdFromList(current, id)

    await setFilters(key === 'accountIds' ? { accountIds: next } : { categoryIds: next })
  }

  const removeFilter = async (key: 'type' | 'accountIds' | 'categoryIds') => {
    await setFilters(
      key === 'type'
        ? { type: undefined }
        : key === 'accountIds'
          ? { accountIds: undefined }
          : { categoryIds: undefined },
    )
  }

  const resetFilters = async () => {
    await setFilters({
      type: undefined,
      accountIds: undefined,
      categoryIds: undefined,
    })
  }

  return {
    filters,
    toggleIdFilter,
    removeFilter,
    setFilters,
    resetFilters,
  }
}
