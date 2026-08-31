import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import QuickActionsCard from './QuickActionsCard.vue'
import {
  createMockAccountRepository,
  createMockCategoryRepository,
  createMockTransactionRepository,
} from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const mounted: ReturnType<typeof mountWithProviders>[] = []

describe('QuickActionsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(async () => {
    for (const wrapper of mounted.splice(0)) {
      wrapper.unmount()
    }
    await flushPromises()
    document.body.innerHTML = ''
  })

  function mountCard() {
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue([])
    const categoriesRepo = createMockCategoryRepository()
    categoriesRepo.getAll.mockResolvedValue([])
    const wrapper = mountWithProviders(QuickActionsCard, {
      repositories: {
        accounts: accountsRepo,
        categories: categoriesRepo,
        transactions: createMockTransactionRepository(),
      },
    })
    mounted.push(wrapper)
    return { wrapper }
  }

  it('renders the mobile-home entry set: expense, transfer, income', () => {
    const { wrapper } = mountCard()

    expect(wrapper.find('[data-testid="quick-action-expense"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="quick-action-transfer"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="quick-action-income"]').exists()).toBe(true)
  })

  it('opens the expense dialog with the cashflow form', async () => {
    const { wrapper } = mountCard()

    await wrapper.find('[data-testid="quick-action-expense"]').trigger('click')
    await flushPromises()

    // The expense dialog opened (teleported to body) with a form inside.
    const dialogs = [...document.querySelectorAll('[role="dialog"]')]
    expect(dialogs.length).toBeGreaterThan(0)
    expect(dialogs.some((dialog) => dialog.querySelector('form'))).toBe(true)
  })

  it('opens the income dialog with the cashflow form', async () => {
    const { wrapper } = mountCard()

    await wrapper.find('[data-testid="quick-action-income"]').trigger('click')
    await flushPromises()

    // The income dialog opened (teleported to body) with a form inside.
    const dialogs = [...document.querySelectorAll('[role="dialog"]')]
    expect(dialogs.length).toBeGreaterThan(0)
    expect(dialogs.some((dialog) => dialog.querySelector('form'))).toBe(true)
  })
})
