import { test, expect } from '@playwright/test'

// Dashboard month navigation (variant A): the header period switcher steps
// the dashboard cursor, and every month-bound card re-scopes while the
// snapshot cards (accounts, debts) stay period-independent. Backendless:
// data lives in the local SQLite/OPFS worker, isolated per test profile.
test.beforeEach(({ page }) => {
  // The product default locale is RU (web-locales); this suite's copy
  // assertions are English, so pin the stored locale choice to EN.
  page.addInitScript(() => localStorage.setItem('BudgetTracker:locale', 'en'))
})

test('month switcher re-scopes month-bound cards and gates the forward step', async ({ page }) => {
  // Seed the current month with an expense: account -> inline category ->
  // expense dated today (the same journey as local-data.spec.ts).
  await page.goto('/accounts')
  await page.getByRole('button', { name: 'Create' }).first().click()
  await page.getByLabel('Name').fill('Cash')
  await page.getByRole('button', { name: 'Add account' }).click()
  await expect(page.getByText('Account added')).toBeVisible()

  await page.goto('/')
  await page.getByTestId('sidebar-add-operation').click()
  const expenseDialog = page.getByRole('dialog')
  await expect(expenseDialog).toBeVisible()
  await expenseDialog.getByTestId('open-new-category').click()
  await page.getByTestId('new-category-name').fill('Groceries')
  await page
    .getByTestId('new-category-dialog')
    .getByRole('button', { name: 'Create' })
    .click()
  await expect(page.getByText('Category created')).toBeVisible()

  await page.locator('#account-id').click()
  await page.getByRole('option', { name: /Cash/ }).click()
  await page.getByLabel('Note').fill('Monthly shop')
  await page.getByLabel('Amount').fill('42.50')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('Transaction added')).toBeVisible()

  const label = page.getByTestId('period-nav-label')
  const prev = page.getByTestId('period-nav-prev')
  const next = page.getByTestId('period-nav-next')
  const breakdown = page.getByTestId('dashboard-category-breakdown')

  // Starts on the current month: the expense shows and the forward step is
  // disabled (there is no month after "now").
  await expect(next).toBeDisabled()
  await expect(page.getByText('Monthly shop')).toBeVisible()
  await expect(breakdown.getByText('Groceries')).toBeVisible()

  // Step to the previous month: the expense (dated this month) leaves the
  // month-bound list and the forward step unlocks.
  const currentCaption = await label.textContent()
  await prev.click()
  await expect(label).not.toHaveText(currentCaption!)
  await expect(next).toBeEnabled()
  await expect(page.getByText('Monthly shop')).toBeHidden()
  await expect(page.getByText('No transactions found')).toBeVisible()
  await expect(breakdown.getByText('Groceries')).toBeHidden()

  // Back to the current month: the expense reappears, forward locks again.
  await next.click()
  await expect(page.getByText('Monthly shop')).toBeVisible()
  await expect(breakdown.getByText('Groceries')).toBeVisible()
  await expect(next).toBeDisabled()
})
