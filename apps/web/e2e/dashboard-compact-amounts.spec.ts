import { test, expect } from '@playwright/test'

// Dashboard stat tiles at phone width: amounts are unbreakable tokens, so a
// large figure must render compacted (whole units, abbreviated at one
// million) and stay inside its half-grid-column card instead of painting
// over the neighbour tile (mobile-overflow regression).

test.use({
  viewport: { width: 390, height: 844 },
  // Locale stays at the product default (ru) so the assertion reads the
  // shipped compact suffix ("1 млн ₽").
})

test.beforeEach(({ page }) => {
  // Same backendless rules as local-screens.spec.ts: fresh profile, seeded
  // through the UI against the local SQLite/OPFS worker.
  page.addInitScript(() => localStorage.setItem('BudgetTracker:locale', 'ru'))
})

test('dashboard compiles a million-scale debt into a tile-fitting figure', async ({ page }) => {
  // Seed: one receivable of 1 000 100,00 ₽ (the reported overflow case).
  await page.goto('/debts')
  await page.getByTestId('debts-section-add-receivable').click()
  await page.locator('#debts-new-debt-name').fill('Анна')
  await page.getByLabel('Amount').fill('1000100')
  await page.getByTestId('debts-new-debt-submit').click()
  await expect(page.locator('[data-testid^="debts-debtor-"]').first()).toContainText('Анна')

  await page.goto('/')
  const debtsLink = page
    .getByTestId('dashboard-stats')
    .locator('a')
    .filter({ has: page.getByText('Долги') })
  const amount = debtsLink.getByTestId('stat-card-amount')

  // Compacted to whole millions - no kopecks, no six-digit body.
  await expect(amount).toHaveText('1\u00A0млн\u00A0₽')

  // The token fits its card: no paint overflow past the tile's right edge.
  const amountBox = await amount.boundingBox()
  const cardBox = await debtsLink.boundingBox()
  expect(amountBox).not.toBeNull()
  expect(cardBox).not.toBeNull()
  expect(amountBox!.x + amountBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width + 1)

  await page.screenshot({ path: 'test-results/dashboard-compact-mobile.png', fullPage: false })
})
