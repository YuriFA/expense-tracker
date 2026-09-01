import { test, expect } from '@playwright/test'

// Desktop accelerators (web-unified-transaction-entry): the ⌘K / Ctrl+K
// command palette and the «N» hotkey open the single creation flow with the
// matching tab preselected. The palette is mounted on desktop viewports only
// (default Playwright viewport 1280x720 is above the 768px shell boundary).
test.beforeEach(({ page }) => {
  // The product default locale is RU (web-locales); this suite's copy
  // assertions are English, so pin the stored locale choice to EN.
  page.addInitScript(() => localStorage.setItem('BudgetTracker:locale', 'en'))
})

async function openPalette(page: import('@playwright/test').Page) {
  // The hotkey listener mounts with the app shell: wait for a shell marker
  // before pressing, or a press during hydration is silently dropped
  // (flaky under load).
  await expect(page.getByRole('button', { name: 'Add operation' })).toBeVisible()
  await page.keyboard.press('ControlOrMeta+K')
  await expect(page.getByTestId('command-palette')).toBeVisible()
}

test('palette add actions open the unified flow with the right tab preselected', async ({
  page,
}) => {
  await page.goto('/')

  await openPalette(page)
  await page.getByTestId('palette-action-expense').click()
  await expect(page.getByTestId('command-palette')).toBeHidden()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('tab', { name: 'Expense' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // Income action: the unified flow opens directly on the income tab.
  await openPalette(page)
  await page.getByTestId('palette-action-income').click()
  await expect(page.getByTestId('command-palette')).toBeHidden()
  await expect(page.getByRole('dialog').getByRole('tab', { name: 'Income' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.keyboard.press('Escape')

  // New category opens the existing category creation dialog.
  await openPalette(page)
  await page.getByTestId('palette-action-category').click()
  await expect(page.getByTestId('new-category-dialog')).toBeVisible()
})

test('palette search filters actions and ⌘K toggles it closed', async ({ page }) => {
  await page.goto('/')

  await openPalette(page)
  await page.getByTestId('palette-search').fill('income')
  await expect(page.getByTestId('palette-action-income')).toBeVisible()
  await expect(page.getByTestId('palette-action-expense')).toHaveCount(0)

  await page.keyboard.press('ControlOrMeta+K')
  await expect(page.getByTestId('command-palette')).toBeHidden()
})

test('hotkey N opens the unified flow and stays idle while typing', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Add operation' })).toBeVisible()

  await page.keyboard.press('n')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('tab', { name: 'Expense' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // Typing «n» inside the palette search filters instead of opening the flow.
  await openPalette(page)
  await page.keyboard.press('n')
  await expect(page.getByTestId('palette-search')).toHaveValue('n')
  // Only the palette itself is a dialog - the creation flow did not open.
  await expect(page.getByRole('dialog')).toHaveCount(1)
})
