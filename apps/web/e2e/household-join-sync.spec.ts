/* eslint-disable playwright/no-skipped-test -- env-gated backend suite: tests skip
   without SYNC_INTEGRATION_API (same pattern as sync-backend.spec.ts) */
import { test, expect, type Page } from '@playwright/test'

// Household-join sync integration (OpenSpec change `household-join`, design
// D3/D4/D6/D7) against the real Go API through the dev-server /api proxy.
// Requires a live backend:
//   SYNC_INTEGRATION_API=http://localhost:8080 pnpm -C apps/web test:e2e -- e2e/household-join-sync.spec.ts
//
// Covers the spec scenarios that only exist with two households on the wire:
// join + carry (union, no duplicates by id), join + clean, the stale
// second-device rebase (last_household mismatch -> choice -> union), and the
// authorship round-trip (pull changes carry the author's user id).

const API_URL = process.env.SYNC_INTEGRATION_API ?? ''
const PASSWORD = 'strong-password'

async function pinEnglishLocale(page: Page) {
  await page.addInitScript(() => localStorage.setItem('BudgetTracker:locale', 'en'))
}

function uniqueEmail(): string {
  return `hh-join+${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}

/** Registers through the UI, waits for the first sync to complete. */
async function registerAndSync(page: Page, email: string): Promise<void> {
  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/verify-email/)
  await page.goto('/')
  await expect(page.getByTestId('sync-status-badge')).toBeVisible()
  await expect(page.getByTestId('sync-status-synced')).toBeVisible({ timeout: 20_000 })
}

/** Creates one account through the accounts UI and waits for it to sync. */
async function createAccountAndWaitSync(page: Page, name: string): Promise<void> {
  await page.goto('/accounts')
  await page.getByRole('button', { name: 'Create' }).first().click()
  await page.getByLabel('Name').fill(name)
  await page.getByRole('button', { name: 'Add account' }).click()
  await expect(page.getByText('Account added')).toBeVisible()
  await expect(page.getByTestId('sync-status-synced')).toBeVisible({ timeout: 20_000 })
}

/** The session's account ids as seen by the API (id-level union assertions). */
async function apiAccounts(page: Page): Promise<{ id: string; name: string }[]> {
  const response = await page.request.get('/api/accounts')
  expect(response.ok()).toBeTruthy()
  return (await response.json()) as { id: string; name: string }[]
}

async function currentUserId(page: Page): Promise<string> {
  const response = await page.request.get('/api/auth/me')
  expect(response.ok()).toBeTruthy()
  return ((await response.json()) as { id: string }).id
}

/** Joins the household of `code` through the settings UI with the given choice. */
async function joinByCodeWithChoice(
  page: Page,
  code: string,
  choice: 'household-choice-carry' | 'household-choice-clean',
): Promise<void> {
  await page.goto('/settings')
  await page.getByTestId('household-join-code-button').click()
  await page.locator('#household-code').fill(code)
  await page.getByRole('button', { name: 'Join', exact: true }).click()
  await expect(page.getByTestId('household-choice-dialog')).toBeVisible({ timeout: 10_000 })
  await page.getByTestId(choice).click()
  // The dialog closing IS the "choice applied" signal (it stays up on
  // failure); the badge alone can still show a stale pre-join synced state.
  await expect(page.getByTestId('household-choice-dialog')).toBeHidden({ timeout: 30_000 })
  await expect(page.getByTestId('sync-status-synced')).toBeVisible({ timeout: 20_000 })
}

test('join with carry unions both households without duplicates by id', async ({ browser }) => {
  test.skip(!API_URL, 'requires SYNC_INTEGRATION_API and a running backend')

  const owner = await browser.newContext()
  const ownerPage = await owner.newPage()
  await pinEnglishLocale(ownerPage)
  const ownerEmail = uniqueEmail()
  await registerAndSync(ownerPage, ownerEmail)
  await createAccountAndWaitSync(ownerPage, 'Owner account')

  const joiner = await browser.newContext()
  const joinerPage = await joiner.newPage()
  await pinEnglishLocale(joinerPage)
  await registerAndSync(joinerPage, uniqueEmail())
  await createAccountAndWaitSync(joinerPage, 'Joiner account')

  // Owner issues the join code over the API (owner-side management UI is the
  // household-ux change; the API is the contract).
  const codeResponse = await ownerPage.request.post('/api/household/code')
  expect(codeResponse.ok()).toBeTruthy()
  const { code } = (await codeResponse.json()) as { code: string }

  await joinByCodeWithChoice(joinerPage, code, 'household-choice-carry')

  // The joiner's device now shows BOTH households' records, once each.
  await joinerPage.goto('/accounts')
  await expect(joinerPage.getByText('Owner account')).toBeVisible()
  await expect(joinerPage.getByText('Joiner account')).toBeVisible()
  expect(await joinerPage.getByText('Owner account').count()).toBe(1)
  expect(await joinerPage.getByText('Joiner account').count()).toBe(1)

  // No duplicates by id, and the joiner's record really crossed over.
  const joinerAccounts = await apiAccounts(joinerPage)
  const ids = joinerAccounts.map((a) => a.id)
  expect(new Set(ids).size).toBe(ids.length)
  expect(joinerAccounts.map((a) => a.name).sort()).toEqual(['Joiner account', 'Owner account'])
  const ownerAccounts = await apiAccounts(ownerPage)
  expect(ownerAccounts.map((a) => a.name)).toContain('Joiner account')

  // Authorship round-trip: each pulled change carries its author's user id.
  const ownerId = await currentUserId(ownerPage)
  const joinerId = await currentUserId(joinerPage)
  expect(ownerId).not.toBe(joinerId)
  const pull = await joinerPage.request.get('/api/sync/pull?cursor=0&limit=500')
  expect(pull.ok()).toBeTruthy()
  const body = (await pull.json()) as {
    changes: { id: string; userId: string | null }[]
  }
  const authors = new Map(body.changes.map((c) => [c.id, c.userId]))
  const joinerAccount = joinerAccounts.find((a) => a.name === 'Joiner account')
  const ownerAccount = ownerAccounts.find((a) => a.name === 'Owner account')
  expect(authors.get(joinerAccount!.id)).toBe(joinerId)
  expect(authors.get(ownerAccount!.id)).toBe(ownerId)

  await owner.close()
  await joiner.close()
})

test('join with clean drops this device data and pulls the household', async ({ browser }) => {
  test.skip(!API_URL, 'requires SYNC_INTEGRATION_API and a running backend')

  const owner = await browser.newContext()
  const ownerPage = await owner.newPage()
  await pinEnglishLocale(ownerPage)
  await registerAndSync(ownerPage, uniqueEmail())
  await createAccountAndWaitSync(ownerPage, 'Shared account')

  const joiner = await browser.newContext()
  const joinerPage = await joiner.newPage()
  await pinEnglishLocale(joinerPage)
  await registerAndSync(joinerPage, uniqueEmail())
  await createAccountAndWaitSync(joinerPage, 'Doomed account')

  const codeResponse = await ownerPage.request.post('/api/household/code')
  const { code } = (await codeResponse.json()) as { code: string }

  await joinByCodeWithChoice(joinerPage, code, 'household-choice-clean')

  // The device pulled the household's data and only that.
  await joinerPage.goto('/accounts')
  await expect(joinerPage.getByText('Shared account')).toBeVisible()
  await expect(joinerPage.getByText('Doomed account')).toHaveCount(0)

  // The clean choice never pushed the old local record anywhere.
  const joinerAccounts = await apiAccounts(joinerPage)
  expect(joinerAccounts.map((a) => a.name)).toEqual(['Shared account'])
  const ownerAccounts = await apiAccounts(ownerPage)
  expect(ownerAccounts.map((a) => a.name)).not.toContain('Doomed account')

  await owner.close()
  await joiner.close()
})

test('a stale second device rebases onto the new household (last_household mismatch)', async ({ browser }) => {
  test.skip(!API_URL, 'requires SYNC_INTEGRATION_API and a running backend')

  const owner = await browser.newContext()
  const ownerPage = await owner.newPage()
  await pinEnglishLocale(ownerPage)
  const ownerEmail = uniqueEmail()
  await registerAndSync(ownerPage, ownerEmail)
  await createAccountAndWaitSync(ownerPage, 'Shared account')
  const codeResponse = await ownerPage.request.post('/api/household/code')
  const { code } = (await codeResponse.json()) as { code: string }

  // One user, two devices (two contexts). Both sync their own records into
  // the personal household first.
  const email = uniqueEmail()
  const deviceOne = await browser.newContext()
  const deviceOnePage = await deviceOne.newPage()
  await pinEnglishLocale(deviceOnePage)
  await registerAndSync(deviceOnePage, email)
  await createAccountAndWaitSync(deviceOnePage, 'Device one account')

  const deviceTwo = await browser.newContext()
  const deviceTwoPage = await deviceTwo.newPage()
  await pinEnglishLocale(deviceTwoPage)
  await deviceTwoPage.goto('/accounts')
  await deviceTwoPage.getByRole('button', { name: 'Create' }).first().click()
  await deviceTwoPage.getByLabel('Name').fill('Device two account')
  await deviceTwoPage.getByRole('button', { name: 'Add account' }).click()
  await expect(deviceTwoPage.getByText('Account added')).toBeVisible()
  // Logging the same user in binds the anonymous local data (ownership gate).
  await deviceTwoPage.goto('/login')
  await deviceTwoPage.getByLabel('Email').fill(email)
  await deviceTwoPage.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await deviceTwoPage.getByRole('button', { name: 'Sign in' }).click()
  await expect(deviceTwoPage.getByTestId('sync-status-badge')).toBeVisible()
  await expect(deviceTwoPage.getByTestId('sync-status-synced')).toBeVisible({ timeout: 20_000 })

  // Device one joins the shared household (carry). The personal household is
  // orphaned; device two still tracks it.
  await joinByCodeWithChoice(deviceOnePage, code, 'household-choice-carry')

  // Device two reopens: the startup household gate sees the mismatch and
  // offers the choice; carrying unions device two's records into the new
  // household through the rebase.
  await deviceTwoPage.goto('/')
  await expect(deviceTwoPage.getByTestId('household-choice-dialog')).toBeVisible({ timeout: 20_000 })
  await deviceTwoPage.getByTestId('household-choice-carry').click()
  await expect(deviceTwoPage.getByTestId('household-choice-dialog')).toBeHidden({ timeout: 30_000 })
  await expect(deviceTwoPage.getByTestId('sync-status-synced')).toBeVisible({ timeout: 20_000 })

  await deviceTwoPage.goto('/accounts')
  await expect(deviceTwoPage.getByText('Device one account')).toBeVisible()
  await expect(deviceTwoPage.getByText('Device two account')).toBeVisible()
  await expect(deviceTwoPage.getByText('Shared account')).toBeVisible()
  expect(await deviceTwoPage.getByText('Device two account').count()).toBe(1)

  // The household (owner's view) ended up with everything exactly once.
  const ownerAccounts = await apiAccounts(ownerPage)
  const names = ownerAccounts.map((a) => a.name).sort()
  expect(names).toEqual(['Device one account', 'Device two account', 'Shared account'])

  // No repeat prompt after the rebase: the marker now tracks the household.
  await deviceTwoPage.goto('/settings')
  await expect(deviceTwoPage.getByTestId('household-choice-dialog')).toHaveCount(0)

  await owner.close()
  await deviceOne.close()
  await deviceTwo.close()
})
