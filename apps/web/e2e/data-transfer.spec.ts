import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Backendless data-transfer walk (web-data-transfer): the CSV import wizard
// end to end — preview with per-row outcomes, category auto-creation,
// commit through the local mirror, idempotent re-import (skips, not
// duplicates), the imported rows in the history, and the filtered export
// downloading a spreadsheet-friendly file.

test.beforeEach(({ page }) => {
  // The product default locale is RU (web-locales); this suite's copy
  // assertions are English, so pin the stored locale choice to EN.
  page.addInitScript(() => localStorage.setItem('BudgetTracker:locale', 'en'))
})

const TEMPLATE_CSV = [
  'дата;тип;категория;сумма;примечание;счёт',
  '01.09.2026;расход;Транспорт;100,50;;',
  '02.09.2026;доход;Зарплата;70000;;Cash',
  '03.09.2026;бартер;Еда;10;;',
].join('\n')

const csvFile = { name: 'import.csv', mimeType: 'text/csv', buffer: Buffer.from(TEMPLATE_CSV) }

async function importFile(
  page: import('@playwright/test').Page,
  file: { name: string; mimeType: string; buffer: Buffer } = csvFile,
) {
  await page.goto('/settings/data')
  await page.getByTestId('open-import-dialog').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByTestId('import-file-input').setInputFiles(file)
  return dialog
}

test('import wizard: preview, commit, idempotent re-import, export', async ({ page }) => {
  test.setTimeout(90_000)

  // --- Seed: the account the file references by name. --------------------
  await page.goto('/accounts')
  await page.getByRole('button', { name: 'Create' }).first().click()
  await page.getByLabel('Name').fill('Cash')
  await page.getByRole('button', { name: 'Add account' }).click()
  await expect(page.getByText('Account added')).toBeVisible()

  // --- Preview: per-row outcomes + categories to create. -----------------
  const dialog = await importFile(page)
  await expect(dialog.getByText('Ready to import: 2')).toBeVisible()
  await expect(dialog.getByText('With errors: 1')).toBeVisible()
  await expect(dialog.getByText('Categories to be created:')).toBeVisible()
  await expect(dialog.getByTestId('import-row-2')).toBeVisible()
  await expect(dialog.getByTestId('import-row-4')).toContainText('доход')

  // Visual regression guard: the preview must fit the dialog (the table
  // scrolls inside its own box instead of blowing the dialog layout).
  const dialogBox = await dialog.boundingBox()
  const scrollBox = await dialog
    .getByTestId('import-table-scroll')
    .boundingBox()
  expect(dialogBox).not.toBeNull()
  expect(scrollBox).not.toBeNull()
  expect(scrollBox!.x).toBeGreaterThanOrEqual(dialogBox!.x)
  expect(scrollBox!.x + scrollBox!.width).toBeLessThanOrEqual(
    dialogBox!.x + dialogBox!.width + 1,
  )
  // Let the 200ms open animation finish so the card is fully opaque.
  await dialog.evaluate((el) =>
    Promise.allSettled(
      el.getAnimations({ subtree: true }).map((animation) => animation.finished),
    ),
  )
  await page.screenshot({ path: 'test-results/import-preview.png' })

  // --- Commit: categories first, then rows; result counts. ---------------
  await dialog.getByTestId('import-commit').click()
  await expect(dialog.getByText('Created: 2')).toBeVisible()
  await dialog.getByRole('button', { name: 'Done' }).click()

  // --- The rows landed in the history. -----------------------------------
  await page.goto('/transactions')
  await expect(page.getByText('Транспорт').first()).toBeVisible()
  // The suite pins EN; the account-less label is localized.
  await expect(page.getByText('No account').first()).toBeVisible()

  // --- Re-import the same file: skipped, not duplicated. -----------------
  const reImport = await importFile(page)
  await reImport.getByTestId('import-commit').click()
  await expect(reImport.getByText('Skipped (already imported): 2')).toBeVisible()
  await reImport.getByRole('button', { name: 'Done' }).click()

  // --- Export from the transactions screen: CSV with the imported data. --
  await page.goto('/transactions')
  await expect(page.getByTestId('export-transactions')).toBeEnabled()
  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('export-transactions').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^transactions_\d{4}-\d{2}-\d{2}\.csv$/)
  const exported = readFileSync(await download.path(), 'utf8')
  expect(exported).toContain('дата;тип;категория;счёт;сумма;примечание')
  expect(exported).toContain('Транспорт')
  // Export labels are intentionally RU (the template contract), not localized.
  expect(exported).toContain('Без счета')
})

test.describe('import preview on a phone viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the table scrolls inside the drawer', async ({ page }) => {
    test.setTimeout(60_000)

    // No account seeding on the phone run: the fixture uses only
    // account-less rows so the preview is identical without /accounts.
    const dialog = await importFile(page, {
      name: 'import.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(TEMPLATE_CSV.replace(';;Cash', ';;')),
    })
    await expect(dialog.getByText('Ready to import: 2')).toBeVisible()

  // The scroll box stays inside the drawer even though the table itself is
  // wider (horizontal scroll); the header row and the note column keep
  // their real width instead of collapsing.
  const drawerBox = await dialog.boundingBox()
  const scrollBox = await dialog.getByTestId('import-table-scroll').boundingBox()
  expect(drawerBox).not.toBeNull()
  expect(scrollBox).not.toBeNull()
  expect(scrollBox!.x).toBeGreaterThanOrEqual(drawerBox!.x)
  expect(scrollBox!.x + scrollBox!.width).toBeLessThanOrEqual(drawerBox!.x + drawerBox!.width + 1)

  // Scroll the table to its right edge: the note column header must be
  // there with an opaque background over the scrolled content. The suite
  // pins EN; the uppercase look comes from CSS, the DOM text is "Note".
  await dialog.getByTestId('import-table-scroll').evaluate((el) => {
    el.scrollLeft = el.scrollWidth
  })
  await expect(dialog.getByText('Note', { exact: true })).toBeVisible()
  await dialog.evaluate((el) =>
    Promise.allSettled(
      el.getAnimations({ subtree: true }).map((animation) => animation.finished),
    ),
  )
  await page.screenshot({ path: 'test-results/import-preview-mobile.png' })
  })
})
