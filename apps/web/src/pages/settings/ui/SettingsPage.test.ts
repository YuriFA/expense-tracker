import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Household } from '@expense-tracker/api'
import type { User } from '@/entities/session'
import SettingsPage from './SettingsPage.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

// The session entity is mocked down to what the page reads: the auth state
// gating the auth-only cards and the sessions listing.
const authState: {
  status: 'restoring' | 'anonymous' | 'authenticated'
  user: User | null
  isAuthenticated: boolean
} = {
  status: 'anonymous',
  user: null,
  isAuthenticated: false,
}
vi.mock('@/entities/session', () => ({
  useAuthStore: () => authState,
  sessionApi: {
    listSessions: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    deleteAllSessions: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  },
}))

// The household read is mocked at the package seam (`use-household.ts`
// imports the HTTP helper through the package, not the entity barrel - and
// deep entity paths would sidestep the public API); the label fallback stays
// real so the display-name derivation is exercised.
vi.mock('@expense-tracker/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@expense-tracker/api')>()),
  fetchHousehold: vi.fn<() => Promise<Household>>(),
}))

const { fetchHousehold } = await import('@expense-tracker/api')

const user: User = {
  id: 'u2',
  email: 'user@example.com',
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const household: Household = {
  id: 'h1',
  createdAt: '2024-01-01T00:00:00Z',
  name: null,
  members: [
    {
      userId: 'u1',
      email: 'wife@example.com',
      displayName: null,
      role: 'owner',
      joinedAt: '2024-01-01T00:00:00Z',
    },
    {
      userId: 'u2',
      email: 'user@example.com',
      displayName: null,
      role: 'member',
      joinedAt: '2024-06-01T00:00:00Z',
    },
  ],
}

function mountPage(): ReturnType<typeof mountWithProviders> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: SettingsPage },
      { path: '/reset-password', name: 'reset-password', component: { template: '<div/>' } },
      { path: '/verify-email', name: 'verify-email', component: { template: '<div/>' } },
    ],
  })
  return mountWithProviders(SettingsPage, { router })
}

describe('SettingsPage', () => {
  beforeEach(() => {
    authState.status = 'anonymous'
    authState.user = null
    authState.isAuthenticated = false
    vi.mocked(fetchHousehold).mockReset()
  })

  it('renders page title', () => {
    const wrapper = mountPage()
    const heading = wrapper.find('h1')
    expect(heading.exists()).toBe(true)
    expect(heading.text()).toBeTruthy()
  })

  it('renders currency select with options', () => {
    const wrapper = mountPage()
    const selects = wrapper.findAllComponents({ name: 'Select' })
    expect(selects.length).toBeGreaterThanOrEqual(2)
  })

  it('shows the household card with the owner-prefix fallback label and members count', async () => {
    authState.status = 'authenticated'
    authState.user = user
    authState.isAuthenticated = true
    vi.mocked(fetchHousehold).mockResolvedValue(household)

    const wrapper = mountPage()
    await flushPromises()
    await flushPromises()

    const card = wrapper.find('[data-testid="settings-household-card"]')
    expect(card.exists()).toBe(true)
    expect(wrapper.find('[data-testid="settings-household-name"]').text()).toContain('wife')
    expect(wrapper.find('[data-testid="settings-household-name"]').text()).toContain('2 members')
    expect(wrapper.find('[data-testid="household-join-code-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="household-leave-button"]').exists()).toBe(true)
  })

  it('shows the household display name when the household has one', async () => {
    authState.status = 'authenticated'
    authState.user = user
    authState.isAuthenticated = true
    vi.mocked(fetchHousehold).mockResolvedValue({ ...household, name: 'Семья' })

    const wrapper = mountPage()
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[data-testid="settings-household-name"]').text()).toContain('Семья')
  })

  it('hides the household card for anonymous visitors', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('[data-testid="settings-household-card"]').exists()).toBe(false)
    expect(fetchHousehold).not.toHaveBeenCalled()
  })
})
