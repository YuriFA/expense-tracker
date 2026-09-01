import { test, expect } from '@playwright/test'

// Backendless flows for balance reconciliation (adjustment transactions):
// the accounts-screen «Reconcile balance» action computes the delta
// client-side and records an adjustment transaction that shifts the account
// balance, shows in the transaction history, and is filterable/editable.
// Same rules as local-screens.spec.ts: no backend, local SQLite/OPFS worker,
// fresh profile per test, seeded through the UI.

test.beforeEach(({ page }) => {
  // The product default locale is RU (web-locales); this suite's copy
  // assertions are English, so pin the stored locale choice to EN.
  page.addInitScript(() => localStorage.setItem('BudgetTracker:locale', 'en'))
})

/** One account named `name` with the given opening balance (major units). */
async function seedAccount(
  page: import('@playwright/test').Page,
  name: string,
  openingBalance: string,
) {
  await page.goto('/accounts')
  await page.getByRole('button', { name: 'Create' }).first().click()
  await page.locator('#name').fill(name)
  await page.getByRole('spinbutton').fill(openingBalance)
  await page.getByRole('button', { name: 'Add account' }).click()
  await expect(page.getByText('Account added')).toBeVisible()
}

/** Opens the account's kebab menu and clicks «Reconcile balance». */
async function openReconcile(page: import('@playwright/test').Page, account: string) {
  await page.goto('/accounts')
  const card = page.getByRole('listitem').filter({ hasText: account })
  await card.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Reconcile balance' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

test('reconciling a lower actual balance records a negative adjustment', async ({ page }) => {
  await seedAccount(page, 'Cash', '120')

  await openReconcile(page, 'Cash')
  const dialog = page.getByRole('dialog')
  // Prefilled with the current balance: zero delta, submit disabled.
  await expect(dialog.getByTestId('reconcile-delta-preview')).toContainText(/accurate/i)
  await expect(dialog.getByTestId('reconcile-submit')).toBeDisabled()

  await dialog.getByRole('spinbutton').fill('115')
  await expect(dialog.getByTestId('reconcile-delta-preview')).toContainText('5')
  await dialog.getByLabel('Note').fill('cash count')
  await dialog.getByTestId('reconcile-submit').click()

  await expect(page.getByText('Balance reconciled')).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Cash' })).toContainText('₽115.00')
})

test('reconciling a higher actual balance records a positive adjustment', async ({ page }) => {
  await seedAccount(page, 'Wallet', '10')

  await openReconcile(page, 'Wallet')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('spinbutton').fill('25')
  await dialog.getByTestId('reconcile-submit').click()

  await expect(page.getByText('Balance reconciled')).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Wallet' })).toContainText('₽25.00')
})

test('the generic add-transaction flow offers no adjustment tab', async ({ page }) => {
  await page.goto('/transactions')

  // Unified flow (web-unified-transaction-entry): the sidebar CTA opens the
  // tabbed creation dialog.
  await page.getByTestId('sidebar-add-operation').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // web-screens spec: the reconcile dialog is the only creation surface for
  // adjustments; the generic flow offers expense/income/transfer only.
  await expect(dialog.getByRole('tab')).toHaveCount(3)
  await expect(dialog.getByRole('tab', { name: 'Adjustment' })).toHaveCount(0)
})

test('adjustment is visible in history, filterable, and editable', async ({ page }) => {
  await seedAccount(page, 'Cash', '50')

  await openReconcile(page, 'Cash')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('spinbutton').fill('48')
  await dialog.getByTestId('reconcile-submit').click()
  await expect(page.getByText('Balance reconciled')).toBeVisible()

  // History: badge + signed amount + note, no category.
  await page.goto('/transactions')
  const row = page.getByRole('listitem').filter({ hasText: 'Adjustment' })
  await expect(row).toBeVisible()
  await expect(row).toContainText('Cash')
  await expect(row).toContainText('-₽2.00')

  // Type filter narrows to the adjustment.
  await page.goto('/transactions?type=adjustment')
  await expect(page.getByRole('listitem')).toHaveCount(1)

  // Editing the delta directly moves the balance.
  await row.getByRole('button', { name: 'Row actions' }).click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()
  const editDialog = page.getByRole('dialog')
  await editDialog.getByRole('spinbutton').fill('-4')
  await editDialog.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Transaction updated')).toBeVisible()

  await page.goto('/accounts')
  await expect(page.getByRole('listitem').filter({ hasText: 'Cash' })).toContainText('₽46.00')
})

test('the edit-account form offers only the name field', async ({ page }) => {
  await seedAccount(page, 'Card', '100')

  await page.goto('/accounts')
  const card = page.getByRole('listitem').filter({ hasText: 'Card' })
  await card.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Edit account' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // Name-only: the old balance-adjustment field is gone from the form.
  await expect(dialog.getByRole('spinbutton')).toHaveCount(0)

  await dialog.locator('#name').fill('Card Pro')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Account updated')).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Card Pro' })).toContainText(
    '₽100.00',
  )
})
