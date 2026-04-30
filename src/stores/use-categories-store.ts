import { CATEGORIES } from '@/constants/categories'
import { defineStore } from 'pinia'
import { computed } from 'vue'

import type { Category } from '@/types/category'
import { useStorage } from '@vueuse/core'
import { APP_NAME } from '@/constants/config'
import { parseCategoriesStorage, serializeCategoriesStorage } from '@/utils/categories'
import { isTransactionLinkedToCategory, parseTransactionsStorage } from '@/utils/transactions'

const CATEGORIES_STORAGE_KEY = `${APP_NAME}:categories`
const TRANSACTIONS_STORAGE_KEY = `${APP_NAME}:transactions`

export const useCategoriesStore = defineStore('categories', () => {
  const items = useStorage(CATEGORIES_STORAGE_KEY, CATEGORIES, localStorage, {
    serializer: {
      read: parseCategoriesStorage,
      write: serializeCategoriesStorage,
    },
  })

  const incomeCategories = computed(() => items.value.filter((item) => item.type === 'income'))
  const expenseCategories = computed(() => items.value.filter((item) => item.type === 'expense'))

  const findById = (id: string) => items.value.find((item) => item.id === id)

  const addCategory = (payload: Omit<Category, 'id'> & Partial<Pick<Category, 'id'>>) => {
    const category: Category = {
      ...payload,
      id:
        payload.id ??
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }

    items.value.push(category)

    return category
  }

  const updateCategory = (id: string, payload: Partial<Omit<Category, 'id'>>) => {
    const category = findById(id)

    if (!category) {
      return false
    }

    Object.assign(category, payload)

    return true
  }

  const removeCategory = (id: string) => {
    const transactions = parseTransactionsStorage(localStorage.getItem(TRANSACTIONS_STORAGE_KEY) ?? '[]')

    if (transactions.some((transaction) => isTransactionLinkedToCategory(transaction, id))) {
      return false
    }

    const nextItems = items.value.filter((item) => item.id !== id)

    if (nextItems.length === items.value.length) {
      return false
    }

    items.value = nextItems

    return true
  }

  return {
    items,
    incomeCategories,
    expenseCategories,
    findById,
    addCategory,
    updateCategory,
    removeCategory,
  }
})
