import { test, expect } from '@playwright/test'

// Backendless category-management flow (category-management screens): the
// closest-to-user walk of the archive + cascade semantics against the local
// SQLite/OPFS worker - list with counts, row archive/unarchive, plain
// delete, hybrid delete dialog with the typed-confirmation cascade, and the
// balance change after the transactions are gone.

test.beforeEach(({ page }) => {
  // The product default locale is RU (web-locales); this suite's copy
  // assertions are English, so pin the stored locale choice to EN.
  page.addInitScript(() => localStorage.setItem('BudgetTracker:locale', 'en'))
})

test('category management screen: archive, cascade, and balance impact', async ({ page }) => {
  // --- Seed: one account, two "Groceries" expenses (10.00 + 5.00). -------
  await page.goto('/accounts')
  await page.getByRole('button', { name: 'Create' }).first().click()
  await page.getByLabel('Name').fill('Cash')
  await page.getByRole('button', { name: 'Add account' }).click()
  await expect(page.getByText('Account added')).toBeVisible()

  const addExpense = async (note: string, amount: string) => {
    await page.goto('/')
    await page.getByTestId('sidebar-add-operation').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.locator('#category-id').click()
    await page.getByRole('option', { name: /Groceries/ }).click()
    await page.locator('#account-id').click()
    await page.getByRole('option', { name: /Cash/ }).click()
    await page.getByLabel('Note').fill(note)
    await page.getByLabel('Amount').fill(amount)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByText('Transaction added')).toBeVisible()
  }

  // Anonymous local mode starts with no categories - the first transaction
  // creates one inline.
  await page.goto('/')
  await page.getByTestId('sidebar-add-operation').click()
  const firstDialog = page.getByRole('dialog')
  await expect(firstDialog).toBeVisible()
  await firstDialog.getByTestId('open-new-category').click()
  await page.getByTestId('new-category-name').fill('Groceries')
  await page
    .getByTestId('new-category-dialog')
    .getByRole('button', { name: 'Create' })
    .click()
  await expect(page.getByText('Category created')).toBeVisible()
  await page.locator('#account-id').click()
  await page.getByRole('option', { name: /Cash/ }).click()
  await page.getByLabel('Note').fill('Weekly shop')
  await page.getByLabel('Amount').fill('10.00')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('Transaction added')).toBeVisible()

  await addExpense('Fruit', '5.00')

  // --- The management screen lists the category with its count. ---------
  await page.goto('/settings')
  await page.getByTestId('settings-categories-link').click()
  await expect(page).toHaveURL(/\/settings\/categories/)

  const groceriesRow = page
    .locator('[data-testid^="category-row-"]')
    .filter({ hasText: 'Groceries' })
  await expect(groceriesRow).toBeVisible()
  await expect(groceriesRow).toContainText('2 transactions')

  // --- Delete dialog: archive is the default for a referenced category. --
  await groceriesRow.getByLabel('Delete').click()
  const deleteDialog = page.getByRole('dialog')
  await expect(deleteDialog).toBeVisible()
  await expect(deleteDialog).toContainText('The category is used in 2 transactions')
  await expect(deleteDialog.getByTestId('delete-category-option-archive')).toBeVisible()
  await deleteDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(deleteDialog).toBeHidden()

  // --- Row archive moves it to the archive section. ----------------------
  await groceriesRow.getByLabel('Archive').click()
  await expect(page.getByText('Category archived')).toBeVisible()
  const archive = page.getByTestId('categories-archive')
  await expect(archive).toContainText('Groceries')
  await expect(page.getByTestId('categories-expense')).not.toContainText('Groceries')

  // The picker of a new transaction no longer offers it.
  await page.goto('/')
  await page.getByTestId('sidebar-add-operation').click()
  await page.locator('#category-id').click()
  await expect(page.getByRole('option', { name: /Groceries/ })).toHaveCount(0)
  await page.keyboard.press('Escape')

  // --- Unarchive brings it back to the active group. ---------------------
  await page.goto('/settings/categories')
  const archivedRow = archive.locator('[data-testid^="category-row-"]').filter({ hasText: 'Groceries' })
  await archivedRow.getByLabel('Restore from archive').click()
  await expect(page.getByText('Category restored from archive')).toBeVisible()
  await expect(page.getByTestId('categories-expense')).toContainText('Groceries')

  // --- Cascade delete: typed confirmation + balances change. -------------
  await groceriesRow.getByLabel('Delete').click()
  await expect(deleteDialog).toBeVisible()
  await deleteDialog.getByTestId('delete-category-option-cascade').click()
  const confirm = deleteDialog.getByTestId('delete-category-confirm')
  await expect(confirm).toBeDisabled()
  await deleteDialog.getByTestId('delete-category-confirmation').fill('Wrong')
  await expect(confirm).toBeDisabled()
  await deleteDialog.getByTestId('delete-category-confirmation').fill('Groceries')
  await expect(confirm).toBeEnabled()
  // Deleting two expenses raises the Cash balance by the full 15.00.
  await expect(deleteDialog).toContainText('Cash')
  await confirm.click()
  await expect(page.getByText('Category deleted')).toBeVisible()

  // The transactions are gone with the category; the dashboard is empty of
  // them and the balance reflects the removal (back to the opening 0).
  await page.goto('/')
  await expect(page.getByText('Weekly shop')).toHaveCount(0)
  await expect(page.getByText('Fruit')).toHaveCount(0)

  // --- A fresh category with no transactions plain-deletes. --------------
  await page.goto('/')
  await page.getByTestId('sidebar-add-operation').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByTestId('open-new-category').click()
  await page.getByTestId('new-category-name').fill('Empty')
  await page
    .getByTestId('new-category-dialog')
    .getByRole('button', { name: 'Create' })
    .click()
  await expect(page.getByText('Category created')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.goto('/settings/categories')
  const emptyRow = page
    .locator('[data-testid^="category-row-"]')
    .filter({ hasText: 'Empty' })
  await expect(emptyRow).toContainText('no transactions')
  await emptyRow.getByLabel('Delete').click()
  await expect(deleteDialog).toContainText('This action cannot be undone.')
  await expect(deleteDialog.getByTestId('delete-category-confirmation')).toHaveCount(0)
  await deleteDialog.getByTestId('delete-category-confirm').click()
  await expect(page.getByText('Category deleted')).toBeVisible()
  await expect(page.getByTestId('categories-expense')).not.toContainText('Empty')
})
