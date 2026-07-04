import { mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { createPinia, type Pinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import i18n from '@/shared/i18n'
import { ACCOUNT_REPOSITORY_KEY, type AccountRepository } from '@/entities/account'
import { CATEGORY_REPOSITORY_KEY, type CategoryRepository } from '@/entities/category'
import {
  TRANSACTION_REPOSITORY_KEY,
  type TransactionRepository,
} from '@/entities/transaction'
import {
  createMockAccountRepository,
  createMockCategoryRepository,
  createMockTransactionRepository,
} from './mock-repositories'

export interface MountWithProvidersOptions {
  pinia?: Pinia
  router?: Router
  repositories?: {
    accounts?: AccountRepository
    categories?: CategoryRepository
    transactions?: TransactionRepository
  }
  props?: Record<string, unknown>
  attrs?: Record<string, unknown>
  slots?: Record<string, unknown>
  global?: Record<string, unknown>
}

export function mountWithProviders<T>(
  component: T,
  options: MountWithProvidersOptions = {},
): VueWrapper {
  const { pinia, router, repositories, props, attrs, slots } = options

  const provide: Record<symbol, unknown> = {}
  if (options.repositories !== undefined) {
    provide[ACCOUNT_REPOSITORY_KEY as unknown as symbol] =
      repositories?.accounts ?? createMockAccountRepository()
    provide[CATEGORY_REPOSITORY_KEY as unknown as symbol] =
      repositories?.categories ?? createMockCategoryRepository()
    provide[TRANSACTION_REPOSITORY_KEY as unknown as symbol] =
      repositories?.transactions ?? createMockTransactionRepository()
  }

  const memoryRouter =
    router ??
    createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div/>' } }],
    })

  return mount(component as never, {
    props: props as never,
    attrs: attrs as never,
    slots: slots as never,
    global: {
      plugins: [i18n, pinia ?? createPinia(), memoryRouter, PiniaColada],
      provide: provide as never,
    },
  }) as VueWrapper
}
