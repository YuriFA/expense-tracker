import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import {
  calendarDayKey,
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

const statLinks = (wrapper: ReturnType<typeof mountPage>['wrapper']) =>
  wrapper
    .find('[data-testid="dashboard-stats"]')
    .findAll('a')
    .map((a) => a.attributes('href') ?? '')

// Mirrors the deep-link bounds: local calendar-day first/last day of the month.
const monthQueryBounds = (cursor: ReturnType<typeof currentPeriod>) => {
  const end = new Date(cursor.start.getFullYear(), cursor.start.getMonth() + 1, 0)
  return { from: calendarDayKey(cursor.start), to: calendarDayKey(end) }
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
        archivedAt: null,
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

describe('DashboardPage stat card links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('links each stat card to its screen, carrying the selected month for income/expenses', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    const hrefs = statLinks(wrapper)
    const bounds = monthQueryBounds(currentPeriod('month'))

    expect(hrefs.some((h) => h === '/accounts')).toBe(true)
    expect(hrefs.some((h) => h === '/debts')).toBe(true)
    for (const type of ['income', 'expense']) {
      expect(
        hrefs.some(
          (h) =>
            h.startsWith(`/transactions?`) &&
            h.includes(`type=${type}`) &&
            h.includes(`from=${bounds.from}`) &&
            h.includes(`to=${bounds.to}`),
        ),
      ).toBe(true)
    }
    // Snapshot cards carry no date filter.
    expect(hrefs.filter((h) => h.includes('from=')).length).toBe(2)
  })

  it('re-scopes the income/expense link bounds when stepping to the previous month', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    await wrapper.find('[data-testid="period-nav-prev"]').trigger('click')
    await flushPromises()

    const hrefs = statLinks(wrapper)
    const bounds = monthQueryBounds(shiftPeriod(currentPeriod('month'), -1))

    expect(
      hrefs.some((h) => h.includes('type=income') && h.includes(`from=${bounds.from}`) && h.includes(`to=${bounds.to}`)),
    ).toBe(true)
    expect(
      hrefs.some((h) => h.includes('type=expense') && h.includes(`from=${bounds.from}`) && h.includes(`to=${bounds.to}`)),
    ).toBe(true)
  })

  it('renders dashboard-scale figures compacted so they fit the tile', async () => {
    // The screenshot overflow case: a debt of 1 000 100,00 must abbreviate,
    // not paint over the neighbouring card at half mobile width.
    const debtOperationsRepo = createMockDebtOperationRepository()
    debtOperationsRepo.query.mockResolvedValue([
      {
        id: 'op1',
        debtorId: 'd1',
        direction: 'receivable',
        kind: 'debt',
        amount: 100_010_000,
        note: '',
        occurredAt: new Date().toISOString(),
        version: 1,
      },
    ])
    const wrapper = mountWithProviders(DashboardPage, {
      repositories: {
        transactions: createMockTransactionRepository(),
        accounts: createMockAccountRepository(),
        categories: createMockCategoryRepository(),
        debtors: createMockDebtorRepository(),
        debtOperations: debtOperationsRepo,
      },
    })
    await flushPromises()

    // Component tests run under 'en' (see src/__tests__/setup.ts), so the
    // compact million suffix is the latin "M".
    const debtsLink = wrapper
      .find('[data-testid="dashboard-stats"]')
      .findAll('a')
      .find((a) => (a.attributes('href') ?? '').startsWith('/debts'))
    expect(debtsLink?.text()).toContain('1M')
  })
})
