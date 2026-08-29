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
})
