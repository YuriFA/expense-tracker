/* eslint-disable playwright/no-skipped-test -- env-gated backend suite: tests skip
   without SYNC_INTEGRATION_API (mobile's SYNC_INTEGRATION_API skip pattern) */
import { test, expect } from '@playwright/test'

// Backend-gated sync flows against the real Go API (`docker compose up` ->
// db + app on :8080) through the Vite dev server's same-origin /api proxy.
//
// Mirror of mobile's SYNC_INTEGRATION_API skip pattern: without the env var
// the suite skips (CI/dev default); run explicitly with a live backend:
//   SYNC_INTEGRATION_API=http://localhost:8080 pnpm -C apps/web test:e2e

const API_URL = process.env.SYNC_INTEGRATION_API ?? ''

function uniqueEmail(): string {
  return `e2e+${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}

const PASSWORD = 'strong-password'

test('register binds anonymous local data and pushes it to the server', async ({ page }) => {
  test.skip(!API_URL, 'requires SYNC_INTEGRATION_API and a running backend')
  const email = uniqueEmail()

  // Anonymous local data first: an account (accounts page) and a category.
  await page.goto('/accounts')
  await page.getByRole('button', { name: 'Create' }).first().click()
  await page.getByLabel('Name').fill('Migration account')
  await page.getByRole('button', { name: 'Add account' }).click()
  await expect(page.getByText('Account added')).toBeVisible()

  // Register: the ownership gate binds the unowned data, the initial sync
  // pushes all local records as creates and pulls the server records.
  await page.goto('/')
  await page.getByTestId('open-new-category').click()
  await page.getByTestId('new-category-name').fill('Migration category')
  await page
    .getByTestId('new-category-dialog')
    .getByRole('button', { name: 'Create' })
    .click()
  await expect(page.getByText('Category created')).toBeVisible()
  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/verify-email/)

  await page.goto('/')
  await expect(page.getByTestId('sync-status-badge')).toBeVisible()
  await expect(page.getByTestId('sync-status-synced')).toBeVisible({ timeout: 15_000 })

  // The local records really reached the server: the API (same session
  // cookie) lists the pushed account and category.
  const accounts = await page.request.get('/api/accounts')
  const accountBody = (await accounts.json()) as Array<{ name: string }>
  expect(accountBody.map((item) => item.name)).toContain('Migration account')

  // The pushed category is server-side too (web registrations do not opt
  // into backend category seeding, so the union is exactly what was pushed).
  const categories = await page.request.get('/api/categories')
  const categoryBody = (await categories.json()) as Array<{ name: string }>
  expect(categoryBody.map((item) => item.name)).toContain('Migration category')
})

test('logout keeps local data and returns to anonymous mode', async ({ page }) => {
  test.skip(!API_URL, 'requires SYNC_INTEGRATION_API and a running backend')
  const email = uniqueEmail()
  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/verify-email/)

  await page.goto('/accounts')
  await page.getByRole('button', { name: 'Create' }).first().click()
  await page.getByLabel('Name').fill('Keep me')
  await page.getByRole('button', { name: 'Add account' }).click()
  await expect(page.getByText('Account added')).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByTestId('guest-mode-indicator')).toBeVisible()
  await expect(page.getByTestId('sync-status-badge')).toHaveCount(0)

  // Local data is intact and usable in anonymous mode.
  await page.goto('/accounts')
  await expect(page.getByText('Keep me')).toBeVisible()
})

test('an expired session pauses sync and logging in resumes it', async ({ page }) => {
  test.skip(!API_URL, 'requires SYNC_INTEGRATION_API and a running backend')
  const email = uniqueEmail()
  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/verify-email/)
  await page.goto('/')
  await expect(page.getByTestId('sync-status-synced')).toBeVisible({ timeout: 15_000 })

  // Drop the session cookie (the server-side session goes stale from the
  // client's perspective): the next mutation's push hits a 401 and the
  // engine pauses itself.
  await page.context().clearCookies()
  // SPA navigation (no reload): a reload would re-run the network-tolerant
  // session restore and land in anonymous mode instead of paused.
  await page.getByRole('link', { name: 'Accounts' }).click()
  await page.getByRole('button', { name: 'Create' }).first().click()
  await page.getByLabel('Name').fill('Pending account')
  await page.getByRole('button', { name: 'Add account' }).click()
  await expect(page.getByText('Account added')).toBeVisible()
  await expect(page.getByTestId('sync-status-paused')).toBeVisible({ timeout: 15_000 })

  // Signing back in resumes the engine; the queued operation drains.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByTestId('guest-mode-indicator')).toBeVisible()

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/$|\/(?!login|register|verify-email|reset-password)/)

  await expect(page.getByTestId('sync-status-synced')).toBeVisible({ timeout: 15_000 })
  const accounts = await page.request.get('/api/accounts')
  const body = (await accounts.json()) as Array<{ name: string }>
  expect(body.map((item) => item.name)).toContain('Pending account')
})
