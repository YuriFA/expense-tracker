import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import RegisterPage from './RegisterPage.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

// The auth store is mocked down to the register call the page makes (the
// ownership-gate outcome is irrelevant here - only the navigation matters).
type RegisterResult = { ok: boolean; blockedByOwner?: boolean }
const registerMock = vi.fn<(email: string, password: string) => Promise<RegisterResult>>()
vi.mock('@/entities/session', () => ({
  useAuthStore: () => ({ register: registerMock }),
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

async function mountPage(path: '/register' | `/register?redirect=${string}`): Promise<{
  wrapper: ReturnType<typeof mountWithProviders>
  currentPath: () => string
}> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/register', component: RegisterPage },
      { path: '/login', name: 'login', component: { template: '<div/>' } },
      { path: '/verify-email', name: 'verify-email', component: { template: '<div/>' } },
      { path: '/invite/:token', component: { template: '<div/>' } },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mountWithProviders(RegisterPage, { router })
  return { wrapper, currentPath: () => router.currentRoute.value.fullPath }
}

async function submit(wrapper: ReturnType<typeof mountWithProviders>): Promise<void> {
  await wrapper.find('#email').setValue('user@example.com')
  await wrapper.find('#password').setValue('password123')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('RegisterPage redirect', () => {
  beforeEach(() => {
    registerMock.mockReset().mockResolvedValue({ ok: true })
  })

  it('forwards the redirect query to the verify-email step', async () => {
    const { wrapper, currentPath } = await mountPage('/register?redirect=/invite/tok-1')

    await submit(wrapper)

    expect(currentPath()).toBe('/verify-email?redirect=/invite/tok-1')
  })

  it('goes to verify-email without a query when no redirect was carried', async () => {
    const { wrapper, currentPath } = await mountPage('/register')

    await submit(wrapper)

    expect(currentPath()).toBe('/verify-email')
  })
})
