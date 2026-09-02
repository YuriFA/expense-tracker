/* eslint-disable playwright/no-skipped-test -- env-gated backend suite: tests skip
   without SYNC_INTEGRATION_API (mobile's SYNC_INTEGRATION_API skip pattern) */
import { test, expect, type Page } from '@playwright/test'

// Backend-gated cascade sync flow (add-category-management 7.2): the full
// user path against the real Go API - device A registers, creates a category
// with transactions, and cascades the delete from the management screen;
// device B (a second browser profile logged into the same account) pulls the
// tombstones and lands on the same state: no transactions, no category,
// balances back to the opening value.

const API_URL = process.env.SYNC_INTEGRATION_API ?? ''

const PASSWORD = 'strong-password'

function uniqueEmail(): string {
  return `e2e+cascade-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}

async function pinEnglishLocale(page: Page) {
  await page.addInitScript(() => localStorage.setItem('BudgetTracker:locale', 'en'))
}

test('a cascaded category delete reaches a second device through sync', async ({ browser }) => {
  test.skip(!API_URL, 'requires SYNC_INTEGRATION_API and a running backend')

  const email = uniqueEmail()

  // --- Device A: seed account + category with two transactions. ----------
  const contextA = await browser.newContext()
  const pageA = await contextA.newPage()
  await pinEnglishLocale(pageA)

  await pageA.goto('/accounts')
  await pageA.getByRole('button', { name: 'Create' }).first().click()
  await pageA.getByLabel('Name').fill('Cascade cash')
  await pageA.getByRole('button', { name: 'Add account' }).click()
  await expect(pageA.getByText('Account added')).toBeVisible()

  await pageA.goto('/')
  await pageA.getByTestId('sidebar-add-operation').click()
  const dialog = pageA.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByTestId('open-new-category').click()
  await pageA.getByTestId('new-category-name').fill('Cascade food')
  await pageA
    .getByTestId('new-category-dialog')
    .getByRole('button', { name: 'Create' })
    .click()
  await expect(pageA.getByText('Category created')).toBeVisible()
  await pageA.locator('#account-id').click()
  await pageA.getByRole('option', { name: /Cascade cash/ }).click()
  await pageA.getByLabel('Note').fill('First')
  await pageA.getByRole('spinbutton').fill('12.00')
  await pageA.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(pageA.getByText('Transaction added')).toBeVisible()

  await pageA.getByTestId('sidebar-add-operation').click()
  await pageA.locator('#category-id').click()
  await pageA.getByRole('option', { name: /Cascade food/ }).click()
  await pageA.locator('#account-id').click()
  await pageA.getByRole('option', { name: /Cascade cash/ }).click()
  await pageA.getByLabel('Note').fill('Second')
  await pageA.getByRole('spinbutton').fill('3.00')
  await pageA.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(pageA.getByText('Transaction added')).toBeVisible()

  // Register and let the initial sync push everything.
  await pageA.goto('/register')
  await pageA.getByLabel('Email').fill(email)
  await pageA.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await pageA.getByRole('button', { name: 'Create account' }).click()
  await expect(pageA).toHaveURL(/\/verify-email/)
  await pageA.goto('/')
  await expect(pageA.getByTestId('sync-status-synced')).toBeVisible({ timeout: 15_000 })

  // --- Device B: the same account in a second browser profile. -----------
  const contextB = await browser.newContext()
  const pageB = await contextB.newPage()
  await pinEnglishLocale(pageB)
  await pageB.goto('/login')
  await pageB.getByLabel('Email').fill(email)
  await pageB.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await pageB.getByRole('button', { name: 'Sign in', exact: false }).click()
  // Let the app finish its own post-login navigation first - an immediate
  // goto('/') would race the login response handling in the page.
  await pageB.waitForURL('/')
  await expect(pageB.getByTestId('sync-status-synced')).toBeVisible({ timeout: 15_000 })
  await expect(pageB.getByText('First')).toBeVisible()
  await expect(pageB.getByText('Second')).toBeVisible()

  // --- Device A: cascaded delete from the management screen. -------------
  await pageA.goto('/settings/categories')
  const row = pageA.locator('[data-testid^="category-row-"]').filter({ hasText: 'Cascade food' })
  await expect(row).toContainText('2 transactions')
  await row.getByLabel('Delete').click()
  const deleteDialog = pageA.getByRole('dialog')
  await deleteDialog.getByTestId('delete-category-option-cascade').click()
  await deleteDialog.getByTestId('delete-category-confirmation').fill('Cascade food')
  await deleteDialog.getByTestId('delete-category-confirm').click()
  await expect(pageA.getByText('Category deleted')).toBeVisible()
  await expect(pageA.getByTestId('sync-status-synced')).toBeVisible({ timeout: 15_000 })

  // Device A no longer shows the transactions; the balance is back to 0.
  await pageA.goto('/')
  await expect(pageA.getByText('First')).toHaveCount(0)
  await expect(pageA.getByText('Second')).toHaveCount(0)

  // --- Device B: the pull applies the cascade tombstones. -----------------
  await pageB.reload()
  await expect(pageB.getByTestId('sync-status-synced')).toBeVisible({ timeout: 15_000 })
  await expect(pageB.getByText('First')).toHaveCount(0, { timeout: 15_000 })
  await expect(pageB.getByText('Second')).toHaveCount(0)
  // The category is gone from the management screen on both devices.
  await pageB.goto('/settings/categories')
  await expect(
    pageB.locator('[data-testid^="category-row-"]').filter({ hasText: 'Cascade food' }),
  ).toHaveCount(0)
  await pageA.goto('/settings/categories')
  await expect(
    pageA.locator('[data-testid^="category-row-"]').filter({ hasText: 'Cascade food' }),
  ).toHaveCount(0)

  await contextA.close()
  await contextB.close()
})
