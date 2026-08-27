import { test, expect } from '@playwright/test'

// Backendless local-first flows: NO backend is required - the app boots into
// anonymous mode (network-tolerant session restore), and every read/write
// runs against the local SQLite/OPFS worker. Each Playwright context gets a
// fresh browser profile, so storage is isolated per test.

test('opens a data screen directly without a session (no login redirect)', async ({ page }) => {
  await page.goto('/transactions')
  await expect(page.getByTestId('guest-mode-indicator')).toBeVisible()
  await expect(page).toHaveURL(/\/transactions/)
})

test('anonymous local CRUD: account -> category -> transaction', async ({ page }) => {
  // An account first (transactions reference one): the accounts page hosts
  // the create dialog.
  await page.goto('/accounts')
  await page.getByRole('button', { name: 'Create' }).first().click()
  await page.getByLabel('Name').fill('Cash')
  await page.getByRole('button', { name: 'Add account' }).click()
  await expect(page.getByText('Account added')).toBeVisible()

  // The dashboard's expense form with an inline new category (anonymous
  // local mode starts with no categories).
  await page.goto('/')
  await page.getByTestId('open-new-category').click()
  await page.getByTestId('new-category-name').fill('Groceries')
  await page
    .getByTestId('new-category-dialog')
    .getByRole('button', { name: 'Create' })
    .click()
  await expect(page.getByText('Category created')).toBeVisible()

  // Pick the account created earlier (the form starts with no selection).
  await page.locator('#account-id').click()
  await page.getByRole('option', { name: /Cash/ }).click()

  await page.getByLabel('Note').fill('Weekly shop')
  await page.getByRole('spinbutton').fill('42.50')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('Transaction added')).toBeVisible()

  // The dashboard reflects local data: the transaction shows up.
  await expect(page.getByText('Weekly shop')).toBeVisible()
})

test('local data survives a reload without any network access', async ({ page }) => {
  await page.goto('/accounts')
  await page.getByRole('button', { name: 'Create' }).first().click()
  await page.getByLabel('Name').fill('Salary account')
  await page.getByRole('button', { name: 'Add account' }).click()
  await expect(page.getByText('Salary account')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Salary account')).toBeVisible()
})

test('mutations work while the network is offline', async ({ page }) => {
  // Boot fully first (the worker fetches the sqlite3 wasm binary), then cut
  // the network: mutations must succeed on the local database alone
  // (offline-first core of the change).
  await page.goto('/accounts')
  await expect(page.getByTestId('guest-mode-indicator')).toBeVisible()
  await page.context().setOffline(true)

  await page.getByRole('button', { name: 'Create' }).first().click()
  await page.getByLabel('Name').fill('Offline account')
  await page.getByRole('button', { name: 'Add account' }).click()
  await expect(page.getByText('Offline account')).toBeVisible()
})

test('a second tab is blocked by the single-tab lock', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('guest-mode-indicator')).toBeVisible()

  const second = await page.context().newPage()
  await second.goto('/')
  await expect(second.getByTestId('local-db-busy')).toBeVisible()
  await expect(second.getByRole('button', { name: 'Reload page' })).toBeVisible()

  // The holding tab keeps working untouched.
  await expect(page.getByText('Net worth')).toBeVisible()
  await second.close()
})
