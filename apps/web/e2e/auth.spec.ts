import { test, expect } from '@playwright/test'

// These tests drive the full stack against the local backend
// (`docker compose up` -> db + app on :8080) through the Vite dev server's
// same-origin /api proxy. Each run registers a fresh user to avoid collisions.

function uniqueEmail(): string {
  return `e2e+${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}

const PASSWORD = 'strong-password'

test('redirects unauthenticated users from a protected route to login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})

test('register -> authenticated app -> logout', async ({ page }) => {
  const email = uniqueEmail()

  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()

  // Registration starts a session and lands on the verify-email page.
  await expect(page).toHaveURL(/\/verify-email/)

  // The session cookie is set; an authenticated route now loads.
  await page.goto('/')
  await expect(page.getByText('Net worth')).toBeVisible()

  // The nav shows the signed-in email and a sign-out action.
  await expect(page.getByText(email)).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()

  // Logout clears the session and returns to login.
  await expect(page).toHaveURL(/\/login/)

  // After logout, the protected route redirects again.
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})

test('can sign in with an existing account', async ({ page }) => {
  const email = uniqueEmail()

  // Seed: register an account (creates the user + session).
  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/verify-email/)

  // Sign out to exercise the login path.
  await page.goto('/')
  await expect(page.getByText('Net worth')).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login/)

  // Now log back in with the credentials.
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/$|\/(?!login|register|verify-email|reset-password)/)
  await expect(page.getByText('Net worth')).toBeVisible()
  await expect(page.getByText(email)).toBeVisible()
})
