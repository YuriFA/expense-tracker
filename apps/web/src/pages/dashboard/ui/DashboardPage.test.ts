import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import {
  currentPeriod,
  monthLabel,
  periodToUtcDayRange,
  shiftPeriod,
} from '@expense-tracker/dates'
import DashboardPage from './DashboardPage.vue'
import {
  createMockAccountRepository,
  createMockCategoryRepository,
  createMockDebtorRepository,
  createMockDebtOperationRepository,
  createMockTransactionRepository,
} from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const currentRange = () => periodToUtcDayRange(currentPeriod('month'))
const previousRange = () => periodToUtcDayRange(shiftPeriod(currentPeriod('month'), -1))
const previousCaption = () => {
  const cursor = shiftPeriod(currentPeriod('month'), -1)
  // Component tests run under the 'en' locale (see src/__tests__/setup.ts).
  return `${monthLabel(cursor.start.getFullYear(), cursor.start.getMonth(), 'en')} ${cursor.start.getFullYear()}`
}

const mountPage = () => {
  const transactionsRepo = createMockTransactionRepository()
  transactionsRepo.query.mockResolvedValue([])
  const wrapper = mountWithProviders(DashboardPage, {
    repositories: {
      transactions: transactionsRepo,
      accounts: createMockAccountRepository(),
      categories: createMockCategoryRepository(),
      debtors: createMockDebtorRepository(),
      debtOperations: createMockDebtOperationRepository(),
    },
  })
  return { wrapper, transactionsRepo }
}

const breakdownText = (wrapper: ReturnType<typeof mountPage>['wrapper']) =>
  wrapper.find('[data-testid="dashboard-category-breakdown"]').text()

describe('DashboardPage month navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts on the current month with the forward step disabled', async () => {
    const { wrapper, transactionsRepo } = mountPage()
    await flushPromises()
    const expected = currentRange()
    expect(transactionsRepo.query).toHaveBeenCalledWith(
      expect.objectContaining({ fromDate: expected.fromDate, toDate: expected.toDate }),
    )
    expect(wrapper.find('[data-testid="period-nav-next"]').attributes('disabled')).toBeDefined()
  })

  it('re-scopes month-bound queries when stepping to the previous month', async () => {
    const { wrapper, transactionsRepo } = mountPage()
    await flushPromises()
    vi.clearAllMocks()
    transactionsRepo.query.mockResolvedValue([])

    await wrapper.find('[data-testid="period-nav-prev"]').trigger('click')
    await flushPromises()

    const expected = previousRange()
    expect(transactionsRepo.query).toHaveBeenCalledWith(
      expect.objectContaining({ fromDate: expected.fromDate, toDate: expected.toDate }),
    )
    expect(wrapper.find('[data-testid="period-nav-label"]').text()).toBe(previousCaption())
    // Forward stepping unlocks once the cursor left the current month.
    expect(
      wrapper.find('[data-testid="period-nav-next"]').attributes('disabled'),
    ).toBeUndefined()
  })

  it('re-scopes the category breakdown with the month', async () => {
    const transactionsRepo = createMockTransactionRepository()
    // The mock returns the same current-month expense for every query; only
    // the attribution cursor decides whether the breakdown shows it.
    const currentMonthExpense = {
      id: 't1',
      type: 'expense',
      amount: 4250,
      description: '',
      occurredAt: new Date().toISOString(),
      accountId: 'a1',
      categoryId: 'cfood',
    } as never
    transactionsRepo.query.mockResolvedValue([currentMonthExpense])
    const categoriesRepo = createMockCategoryRepository()
    categoriesRepo.getAll.mockResolvedValue([
      {
        version: 1,
        id: 'cfood',
        name: 'Food',
        type: 'expense',
        icon: '🍔',
        color: '#FF0000',
        slug: 'food',
      },
    ])
    const wrapper = mountWithProviders(DashboardPage, {
      repositories: {
        transactions: transactionsRepo,
        accounts: createMockAccountRepository(),
        categories: categoriesRepo,
        debtors: createMockDebtorRepository(),
        debtOperations: createMockDebtOperationRepository(),
      },
    })
    await flushPromises()

    expect(breakdownText(wrapper)).toContain('Food')

    vi.clearAllMocks()
    transactionsRepo.query.mockResolvedValue([currentMonthExpense])
    await wrapper.find('[data-testid="period-nav-prev"]').trigger('click')
    await flushPromises()

    expect(breakdownText(wrapper)).not.toContain('Food')

    await wrapper.find('[data-testid="period-nav-next"]').trigger('click')
    await flushPromises()

    expect(breakdownText(wrapper)).toContain('Food')
  })
})
