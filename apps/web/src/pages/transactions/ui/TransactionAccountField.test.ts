import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import TransactionAccountField from './TransactionAccountField.vue'
import type { AccountWithBalance } from '@/entities/account'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const accounts: AccountWithBalance[] = [
  { id: 'a1', name: 'Main', currency: 'USD', openingBalance: 1000, balance: 1000, version: 1 },
  { id: 'a2', name: 'Cash', currency: 'USD', openingBalance: 0, balance: 0, version: 1 },
]

describe('TransactionAccountField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mountField(modelValue: string[] | undefined = undefined) {
    const accountsRepo = createMockAccountRepository()
    accountsRepo.getAll.mockResolvedValue(accounts)
    const emitted: string[][] = []
    const Wrapper = defineComponent({
      setup() {
        const model = ref(modelValue)
        return () =>
          h(TransactionAccountField, {
            modelValue: model.value,
            'onUpdate:modelValue': (value: string[] | undefined) => {
              model.value = value
              emitted.push(value ?? [])
            },
          })
      },
    })
    const wrapper = mountWithProviders(Wrapper, { repositories: { accounts: accountsRepo } })
    return { wrapper, emitted }
  }

  it('renders a filter-checkbox row per account plus «Без счета»', async () => {
    const { wrapper } = mountField()
    await flushPromises()

    const rows = wrapper.findAll('[data-testid="transactions-filter-accounts"] input')
    expect(rows.length).toBe(3)
    expect(wrapper.text()).toContain('Main')
    expect(wrapper.text()).toContain('Cash')
    expect(wrapper.text()).toContain('No account')
  })

  it('toggles the «Без счета» sentinel id into the model', async () => {
    const { wrapper, emitted } = mountField()
    await flushPromises()

    await wrapper.find('[data-testid="transactions-filter-account-none"]').setValue()
    expect(emitted.at(-1)).toEqual(['__no_account__'])
  })

  it('shows the 20px filter variant checkbox', async () => {
    const { wrapper } = mountField(['a1'])
    await flushPromises()

    const box = wrapper.find('[data-testid="transactions-filter-account-a1"]')
    expect(box.attributes('data-variant')).toBe('filter')
    expect((box.element as HTMLInputElement).checked).toBe(true)
    expect(
      (wrapper.find('[data-testid="transactions-filter-account-a2"]').element as HTMLInputElement)
        .checked,
    ).toBe(false)
  })

  it('toggles an id into the model and back out', async () => {
    const { wrapper, emitted } = mountField()
    await flushPromises()

    await wrapper.find('[data-testid="transactions-filter-account-a1"]').setValue()
    expect(emitted.at(-1)).toEqual(['a1'])

    await wrapper.find('[data-testid="transactions-filter-account-a2"]').setValue()
    expect(emitted.at(-1)).toEqual(['a1', 'a2'])

    await wrapper.find('[data-testid="transactions-filter-account-a1"]').setValue(false)
    expect(emitted.at(-1)).toEqual(['a2'])
  })

  it('drops the model to undefined when the last id is removed', async () => {
    const { wrapper, emitted } = mountField(['a1'])
    await flushPromises()

    await wrapper.find('[data-testid="transactions-filter-account-a1"]').setValue(false)
    expect(emitted.at(-1)).toEqual([])
  })
})
