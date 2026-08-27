import { test, expect, type Page } from '@playwright/test'

// PWA shell specs (capability `web-pwa`): run against a production build via
// playwright.pwa.config.ts - the service worker only exists in dist, so these
// never run against the dev-server suite. Backendless like the default suite:
// session restore is network-tolerant and lands in anonymous local mode.
// Product default locale is RU (capability `web-locales`), so the flow asserts
// Russian UI copy.

async function waitForActiveServiceWorker(page: Page) {
  await page.waitForFunction(() =>
    navigator.serviceWorker.ready.then((registration) => registration.active !== null),
  )
}

test('cold start offline loads the shell and operates on local data', async ({ page }) => {
  // First (online) visit: the SW installs and precaches the app shell,
  // including the SQLite-WASM binary and the local-db worker chunk. Seed a
  // local account so the offline cold start has data to render from SQLite.
  await page.goto('/accounts')
  await page.getByRole('button', { name: 'Создать' }).first().click()
  await page.getByLabel('Название').fill('Оффлайн счёт')
  await page.getByRole('button', { name: 'Добавить счёт' }).click()
  await expect(page.getByText('Счёт добавлен')).toBeVisible()
  await waitForActiveServiceWorker(page)

  // Cut the network and cold-start: everything must boot from the precache.
  await page.context().setOffline(true)
  await page.reload()

  // Anonymous local mode (no session restore possible offline).
  await expect(page.getByTestId('guest-mode-indicator')).toBeVisible()
  // The seeded account survived in OPFS-backed SQLite and renders from the
  // worker, not from memory or the network.
  await expect(page.getByText('Оффлайн счёт')).toBeVisible()

  // The dashboard renders from the local database (SQLite-WASM via the
  // precached worker + wasm binary).
  await page.goto('/')
  await expect(page.getByText('Капитал')).toBeVisible()
})

test('no API response is served from cache while offline', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('guest-mode-indicator')).toBeVisible()
  await waitForActiveServiceWorker(page)

  await page.context().setOffline(true)

  // A direct API call must fail fast instead of resolving from any HTTP
  // cache: the SW has no runtime caching and /api is on the navigation
  // denylist. Offline behavior comes from local data, never stale server
  // responses.
  const outcome = await page.evaluate(async () => {
    try {
      const response = await fetch('/api/auth/me')
      return `responded:${response.status}`
    } catch {
      return 'network-error'
    }
  })
  expect(outcome).toBe('network-error')

  // The app itself stays in local/anonymous mode after an offline reload.
  await page.reload()
  await expect(page.getByTestId('guest-mode-indicator')).toBeVisible()
})
