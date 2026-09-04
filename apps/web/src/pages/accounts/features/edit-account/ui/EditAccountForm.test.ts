import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import EditAccountForm from './EditAccountForm.vue'
import type { Account } from '@/entities/account'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const account: Account = {
  version: 1,
  id: 'a1',
  name: 'Card',
  currency: 'RUB',
  openingBalance: 10_000,
}

// The form owns its ResponsiveDialog, so the open surface renders through a
// portal: the DOM lives under document.body and is driven at the DOM level.
describe('EditAccountForm', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  function mountForm() {
    const accounts = createMockAccountRepository()
    accounts.update.mockResolvedValue({ ...account, name: 'Card Pro', version: 2, balance: 10_000 })
    const wrapper = mountWithProviders(EditAccountForm, {
      props: { account, open: true } as never,
      repositories: { accounts },
    })
    return { wrapper, accounts }
  }

  async function setName(value: string) {
    const input = document.querySelector<HTMLInputElement>('#name')!
    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
  }

  async function submit() {
    document
      .querySelector('#edit-account-form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
  }

  it('submits the name and nothing else', async () => {
    const { accounts } = mountForm()
    await flushPromises()

    await setName('Card Pro')
    await submit()
    await vi.waitFor(() => expect(accounts.update).toHaveBeenCalledTimes(1))

    expect(accounts.update).toHaveBeenCalledWith('a1', {
      name: 'Card Pro',
      version: 1,
    })
  })

  it('emits success after the update resolves', async () => {
    const { wrapper } = mountForm()
    await flushPromises()

    await setName('Card Pro')
    await submit()
    await vi.waitFor(async () => {
      await flushPromises()
      expect(wrapper.emitted('success')).toHaveLength(1)
    })
  })
})
