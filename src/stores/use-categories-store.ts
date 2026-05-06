import { getDefaultCategories } from '@/entities/category/defaults'
import { defineStore } from 'pinia'
import { computed } from 'vue'

import type { Category } from '@/types/category'
import { useStorage } from '@vueuse/core'
import { APP_NAME } from '@/app/config'
import {
  parseCategoriesStorage,
  serializeCategoriesStorage,
} from '@/entities/category/category.lib'
import { isTransactionLinkedToCategory, parseTransactionsStorage } from '@/entities/transaction'
import { generateId } from '@/shared/lib/generate-id'

const CATEGORIES_STORAGE_KEY = `${APP_NAME}:categories`
const TRANSACTIONS_STORAGE_KEY = `${APP_NAME}:transactions`

export const useCategoriesStore = defineStore('categories', () => {
  const userCategories = useStorage(CATEGORIES_STORAGE_KEY, getDefaultCategories(), localStorage, {
    serializer: {
      read: parseCategoriesStorage,
      write: serializeCategoriesStorage,
    },
  })
  const items = computed(() => [...getDefaultCategories(), ...userCategories.value])

  const incomeCategories = computed(() => items.value.filter((item) => item.type === 'income'))
  const expenseCategories = computed(() => items.value.filter((item) => item.type === 'expense'))

  const findById = (id: string) => items.value.find((item) => item.id === id)

  const addCategory = (payload: Omit<Category, 'id'> & Partial<Pick<Category, 'id'>>) => {
    const category: Category = {
      ...payload,
      id: payload.id ?? generateId(),
    }

    userCategories.value.push(category)

    return category
  }

  const updateCategory = (id: string, payload: Partial<Omit<Category, 'id'>>) => {
    const category = userCategories.value.find((item) => item.id === id)

    if (!category) {
      return false
    }

    Object.assign(category, payload)

    return true
  }

  const removeCategory = (id: string) => {
    const transactions = parseTransactionsStorage(
      localStorage.getItem(TRANSACTIONS_STORAGE_KEY) ?? '[]',
    )

    if (transactions.some((transaction) => isTransactionLinkedToCategory(transaction, id))) {
      return false
    }

    const nextItems = userCategories.value.filter((item) => item.id !== id)

    if (nextItems.length === userCategories.value.length) {
      return false
    }

    userCategories.value = nextItems

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
