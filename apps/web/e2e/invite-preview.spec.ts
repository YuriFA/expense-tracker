import { test, expect, type Page } from '@playwright/test'

// Backendless invitation-preview flows (household-join design D6). This is
// the suite's FIRST use of request interception: every other spec runs
// against a fresh anonymous profile and the local worker only, but the
// invite page's states are driven by the invitation preview response, which
// needs a server. `page.route` stands in for one - each test fulfills
// `**/api/invitations/**` with a canned status/body, and nothing else talks
// to a backend (the session restore 401s into the anonymous shell as usual).
// Assertions stay on rendered copy, not the mocks.

test.beforeEach(({ page }) => {
  // The product default locale is RU (web-locales); this suite's copy
  // assertions are English, so pin the stored locale choice to EN.
  page.addInitScript(() => localStorage.setItem('BudgetTracker:locale', 'en'))
})

/** Fulfills the invitation preview call with a canned error response. */
function mockInvitationPreview(
  page: Page,
  status: number,
  body: { code: string; message: string },
): void {
  // NEW PATTERN (see the file comment): request interception instead of a
  // real backend - the only backendless way to drive API-driven states.
  void page.route('**/api/invitations/**', (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    }),
  )
}

test('anonymous visitor sees the login CTA carrying the invite redirect', async ({ page }) => {
  mockInvitationPreview(page, 401, { code: 'UNAUTHORIZED', message: 'missing session cookie' })

  await page.goto('/invite/11111111-1111-1111-1111-111111111111')

  const cta = page.getByTestId('invite-page-anonymous')
  await expect(cta).toBeVisible()
  await expect(cta).toContainText('Sign in to accept the invitation')

  // The CTA routes through login/register with the way back to the invite.
  await expect(page.getByTestId('invite-page-login-link')).toHaveAttribute(
    'href',
    '/login?redirect=/invite/11111111-1111-1111-1111-111111111111',
  )
  await expect(page.getByTestId('invite-page-register-link')).toHaveAttribute(
    'href',
    '/register?redirect=/invite/11111111-1111-1111-1111-111111111111',
  )

  // The register CTA carries the redirect into its route.
  await page.getByTestId('invite-page-register-link').click()
  await expect(page).toHaveURL(/\/register\?redirect=\/invite\//)
})

test('wrong-account 403 shows the mismatch card', async ({ page }) => {
  mockInvitationPreview(page, 403, {
    code: 'HOUSEHOLD_INVITATION_EMAIL_MISMATCH',
    message: 'this invitation was sent to a different email address',
  })

  await page.goto('/invite/11111111-1111-1111-1111-111111111111')

  const mismatch = page.getByTestId('invite-page-mismatch')
  await expect(mismatch).toBeVisible()
  await expect(mismatch).toContainText('sent to a different address')
  await expect(page.getByTestId('invite-page-preview')).toHaveCount(0)
})

test('expired invitation shows the dead card with the way home', async ({ page }) => {
  mockInvitationPreview(page, 400, {
    code: 'HOUSEHOLD_INVITATION_EXPIRED',
    message: 'invitation expired',
  })

  await page.goto('/invite/11111111-1111-1111-1111-111111111111')

  const dead = page.getByTestId('invite-page-dead')
  await expect(dead).toBeVisible()
  await expect(dead).toContainText('This invitation has expired')
  await expect(dead.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/')
})
