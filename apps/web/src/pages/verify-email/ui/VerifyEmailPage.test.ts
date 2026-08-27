import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { User } from '@/entities/session'
import VerifyEmailPage from './VerifyEmailPage.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

// The auth store + session API are mocked down to what verification needs.
const refreshUserMock = vi.fn<() => Promise<void>>()
vi.mock('@/entities/session', () => ({
  useAuthStore: () => ({ user: userRef, refreshUser: refreshUserMock }),
  sessionApi: {
    verifyEmail: vi.fn<(code: string) => Promise<void>>(),
    resendVerification: vi.fn<() => Promise<void>>(),
  },
}))

vi.mock('@/shared/services/notification', () => ({
  notification: {
    mutationError: vi.fn<() => void>(),
    success: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
  },
}))

const { sessionApi } = await import('@/entities/session')

const baseUser: User = {
  id: 'u1',
  email: 'user@example.com',
  emailVerified: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

// Read by the mocked auth store; flipped by refreshUser like the real one.
let userRef: User = baseUser

async function mountPage(path: string): Promise<{
  wrapper: ReturnType<typeof mountWithProviders>
  currentPath: () => string
}> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/verify-email', name: 'verify-email', component: VerifyEmailPage },
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/login', name: 'login', component: { template: '<div/>' } },
      { path: '/invite/:token', component: { template: '<div/>' } },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mountWithProviders(VerifyEmailPage, { router })
  return { wrapper, currentPath: () => router.currentRoute.value.fullPath }
}

async function submitCode(
  wrapper: ReturnType<typeof mountWithProviders>,
  code = '123456',
): Promise<void> {
  await wrapper.find('#code').setValue(code)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('VerifyEmailPage redirect', () => {
  beforeEach(() => {
    userRef = baseUser
    refreshUserMock.mockReset().mockResolvedValue(undefined)
    vi.mocked(sessionApi.verifyEmail).mockReset().mockResolvedValue(undefined)
  })

  it('honors a carried redirect after successful verification', async () => {
    const { wrapper, currentPath } = await mountPage('/verify-email?redirect=/invite/tok-1')

    await submitCode(wrapper)

    expect(currentPath()).toBe('/invite/tok-1')
  })

  it('falls back to home without a redirect', async () => {
    const { wrapper, currentPath } = await mountPage('/verify-email')

    await submitCode(wrapper)

    expect(currentPath()).toBe('/')
  })
})
