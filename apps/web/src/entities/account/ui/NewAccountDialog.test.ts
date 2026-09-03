import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import NewAccountDialog from './NewAccountDialog.vue'
import type { AccountWithBalance } from '../model/types'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'
import { notification } from '@/shared/services/notification'

vi.mock('@/shared/services/notification', () => ({
  notification: {
    mutationError: vi.fn<() => void>(),
    success: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
  },
}))

const createdAccount: AccountWithBalance = {
  id: 'a-new',
  name: 'Карта',
  currency: 'RUB',
  openingBalance: 0,
  balance: 0,
  version: 1,
}

// Dialog content teleports to document.body, so assertions and
// interactions go through the document (the OperationFormDialog idiom).
const inDialog = (selector: string) => document.querySelector(selector)

function fillName(value: string) {
  const input = inDialog('input[id="new-account-name"]') as HTMLInputElement
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function submitForm() {
  ;(inDialog('button[type="submit"][form="new-account-form"]') as HTMLElement).click()
}

const mounted: ReturnType<typeof mountWithProviders>[] = []

describe('NewAccountDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(async () => {
    // Unmount first: wiping document.body under live teleports breaks patching.
    for (const wrapper of mounted.splice(0)) {
      wrapper.unmount()
    }
    await flushPromises()
    document.body.innerHTML = ''
  })

  function mountDialog() {
    const accounts = createMockAccountRepository()
    accounts.create.mockResolvedValue(createdAccount)
    const wrapper = mountWithProviders(NewAccountDialog, {
      props: { open: true },
      repositories: { accounts },
    })
    mounted.push(wrapper)
    return { wrapper, accounts }
  }

  it('blocks submit and shows the name error when the name is empty', async () => {
    const { accounts } = mountDialog()
    await flushPromises()

    submitForm()
    await vi.waitFor(() =>
      expect(inDialog('[data-testid="new-account-name"]')?.getAttribute('aria-invalid')).toBe(
        'true',
      ),
    )
    expect(accounts.create).not.toHaveBeenCalled()
  })

  it('creates the account, emits created, and closes', async () => {
    const { wrapper, accounts } = mountDialog()
    await flushPromises()

    fillName('Карта')
    submitForm()
    await vi.waitFor(() => expect(accounts.create).toHaveBeenCalledTimes(1))

    // RUB is the app's fixed creation currency; the opening balance left at
    // its default converts to 0 minor units.
    expect(accounts.create).toHaveBeenCalledWith({
      name: 'Карта',
      currency: 'RUB',
      openingBalance: 0,
    })
    expect(notification.success).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('created')).toEqual([[createdAccount]])
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('keeps the dialog open and emits nothing when creation fails', async () => {
    const { wrapper, accounts } = mountDialog()
    accounts.create.mockRejectedValue(new Error('boom'))
    await flushPromises()

    fillName('Карта')
    submitForm()
    await vi.waitFor(() => expect(accounts.create).toHaveBeenCalledTimes(1))

    expect(notification.mutationError).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('created')).toBeUndefined()
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })
})
