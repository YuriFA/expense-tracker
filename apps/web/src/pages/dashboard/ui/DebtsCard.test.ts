import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import DebtsCard from './DebtsCard.vue'
import type { DebtOperation } from '@expense-tracker/api'
import { createMockDebtOperationRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

function operation(overrides: Partial<DebtOperation>): DebtOperation {
  return {
    id: 'op',
    debtorId: 'd1',
    direction: 'receivable',
    kind: 'debt',
    amount: 1000,
    occurredAt: '2026-08-01T12:00:00Z',
    note: '',
    version: 1,
    ...overrides,
  } as DebtOperation
}

describe('DebtsCard', () => {
  it('renders both non-zero direction totals', async () => {
    const repo = createMockDebtOperationRepository()
    repo.query.mockResolvedValue([
      operation({ id: 'op1', direction: 'receivable', kind: 'debt', amount: 700_000 }),
      operation({ id: 'op2', direction: 'payable', kind: 'debt', amount: 200_000 }),
    ])
    const wrapper = mountWithProviders(DebtsCard, {
      repositories: { debtOperations: repo },
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="debts-card-receivable"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="debts-card-payable"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('₽7,000.00')
    expect(wrapper.text()).toContain('₽2,000.00')
  })

  it('subtracts repayments inside a direction', async () => {
    const repo = createMockDebtOperationRepository()
    repo.query.mockResolvedValue([
      operation({ id: 'op1', direction: 'receivable', kind: 'debt', amount: 700_000 }),
      operation({ id: 'op2', direction: 'receivable', kind: 'repayment', amount: 500_000 }),
    ])
    const wrapper = mountWithProviders(DebtsCard, {
      repositories: { debtOperations: repo },
    })
    await flushPromises()
    expect(wrapper.find('[data-testid="debts-card-receivable"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('₽2,000.00')
    // Zero directions stay hidden instead of rendering a 0 row.
    expect(wrapper.find('[data-testid="debts-card-payable"]').exists()).toBe(false)
  })

  it('renders the empty state when there are no operations', async () => {
    const repo = createMockDebtOperationRepository()
    repo.query.mockResolvedValue([])
    const wrapper = mountWithProviders(DebtsCard, {
      repositories: { debtOperations: repo },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('No debts')
    expect(wrapper.find('[data-testid="debts-card-receivable"]').exists()).toBe(false)
  })
})
