import { test, expect } from '@playwright/test'

// Mobile shell (web-screens: mobile navigation shell + mobile top bar account
// access) at a phone viewport: bottom tab bar + FAB speed-dial + slim top bar.
// Boots like local-data.spec.ts - anonymous, local data, no backend.

test.use({ viewport: { width: 390, height: 844 } })

test.beforeEach(({ page }) => {
  // The product default locale is RU (web-locales); this suite's copy
  // assertions are English, so pin the stored locale choice to EN.
  page.addInitScript(() => localStorage.setItem('BudgetTracker:locale', 'en'))
})

test('bottom tabs navigate by route and follow the active section', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('guest-mode-indicator')).toBeVisible()
  await expect(page.getByTestId('tab-home')).toHaveClass(/bg-secondary/)

  await page.getByTestId('tab-analytics').click()
  await expect(page).toHaveURL(/\/analytics/)
  await expect(page.getByTestId('tab-analytics')).toHaveClass(/bg-secondary/)
  await expect(page.getByTestId('tab-home')).not.toHaveClass(/bg-secondary/)

  // Tabs are plain routes: the back button works.
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId('tab-home')).toHaveClass(/bg-secondary/)
})

test('the FAB speed-dial opens a creation dialog without navigating', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('fab-add-operation').click()
  await expect(page.getByTestId('speed-dial-scrim')).toBeVisible()
  await expect(page).toHaveURL(/\/$/)

  await page.getByTestId('speed-dial-expense').click()
  const expenseDialog = page.getByRole('dialog')
  await expect(expenseDialog).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
})

test('a tap on empty page space dismisses the speed-dial', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('fab-add-operation').click()
  await expect(page.getByTestId('speed-dial-scrim')).toBeVisible()

  // The scrim sits under the tab bar/FAB but over the page content: a tap on
  // blank content must hit it and close the dial (the shell container is
  // pointer-events-none, so the scrim re-enables hit testing itself).
  await page.mouse.click(195, 300)
  await expect(page.getByTestId('speed-dial-scrim')).toHaveCount(0)
})

test('guest header offers sign-in; the shell is absent on desktop widths', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('topbar-sign-in')).toBeVisible()
  await expect(page.getByTestId('user-menu-trigger')).toHaveCount(0)
  // Exactly one instance of the guest indicator per viewport (the sync badge
  // is absent in anonymous mode).
  await expect(page.getByTestId('guest-mode-indicator')).toHaveCount(1)

  // The sign-in entry navigates to the login screen (deep-linkable route).
  await page.getByTestId('topbar-sign-in').click()
  await expect(page).toHaveURL(/\/login/)

  // Crossing the 768px boundary swaps the mobile shell for the sidebar; the
  // identity entry moves to the sidebar footer with the same testids.
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await expect(page.getByTestId('fab-add-operation')).toHaveCount(0)
  await expect(page.getByTestId('tab-home')).toHaveCount(0)
  await expect(page.getByTestId('guest-mode-indicator')).toBeVisible()
})

const API_URL = process.env.SYNC_INTEGRATION_API ?? ''
const PASSWORD = 'strong-password'

test('a signed-in user sees the avatar menu and can sign out from it', async ({ page }) => {
  // Env-gated like sync-backend.spec.ts (no file-level disable: the other
  // tests in this file always run).
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(!API_URL, 'requires SYNC_INTEGRATION_API and a running backend')
  await page.addInitScript(() => localStorage.setItem('BudgetTracker:locale', 'en'))

  // Register a throwaway account (the session is active right after the
  // register flow, before/without email verification - see sync-backend).
  await page.goto('/register')
  await page.getByLabel('Email').fill(`e2e+${Date.now()}-menu@example.com`)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/verify-email/)

  await page.goto('/')
  // The avatar menu replaces the guest entries (single-instance indicators).
  await expect(page.getByTestId('user-menu-trigger')).toBeVisible()
  await expect(page.getByTestId('guest-mode-indicator')).toHaveCount(0)

  await page.getByTestId('user-menu-trigger').click()
  await expect(page.getByTestId('user-menu-sign-out')).toBeVisible()
  await page.getByTestId('user-menu-sign-out').click()

  // Logout keeps local data and returns to anonymous mode: guest entries are
  // back, no relocation to the login screen.
  await expect(page.getByTestId('guest-mode-indicator')).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
})
