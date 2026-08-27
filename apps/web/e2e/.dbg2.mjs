import { chromium } from '@playwright/test'
const base = 'http://localhost:5173'
const browser = await chromium.launch()
const mk = async () => {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.addInitScript(() => localStorage.setItem('BudgetTracker:locale', 'en'))
  page.on('console', (m) => { if (['error','warning'].includes(m.type())) console.log('CONSOLE', m.text().slice(0,200)) })
  return { ctx, page }
}
const reg = async (page) => {
  await page.goto(base + '/register')
  await page.getByLabel('Email').fill(`dbg2-${Date.now()}-${Math.random().toString(36).slice(2,6)}@example.com`)
  await page.getByLabel('Password', { exact: true }).fill('strong-password')
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.waitForURL(/verify-email/)
  await page.goto(base + '/')
  await page.getByTestId('sync-status-synced').waitFor({ timeout: 20000 })
}
const addAccount = async (page, name) => {
  await page.goto(base + '/accounts')
  await page.getByRole('button', { name: 'Create' }).first().click()
  await page.getByLabel('Name').fill(name)
  await page.getByRole('button', { name: 'Add account' }).click()
  await expectText(page, 'Account added')
}
import { expect as pw } from '@playwright/test'
async function expectText(page, t) { await pw(page.getByText(t)).toBeVisible({ timeout: 10000 }) }
const o = await mk(), j = await mk()
await reg(o.page); await addAccount(o.page, 'Owner account')
await reg(j.page); await addAccount(j.page, 'Joiner account')
const { code } = await (await o.page.request.post(base + '/api/household/code')).json()
await j.page.goto(base + '/settings')
await j.page.getByTestId('household-join-code-button').click()
await j.page.locator('#household-code').fill(code)
await j.page.getByRole('button', { name: 'Join', exact: true }).click()
await j.page.getByTestId('household-choice-dialog').waitFor({ timeout: 10000 })
await j.page.getByTestId('household-choice-carry').click()
await j.page.waitForTimeout(6000)
console.log('badge:', await j.page.getByTestId('sync-status-badge').textContent().catch(() => 'none'))
const api = await j.page.evaluate(() => fetch('/api/accounts').then(r => r.json()))
console.log('API accounts (joiner session):', api.map(a => a.name))
await j.page.goto(base + '/accounts')
await j.page.waitForTimeout(1500)
console.log('page has Owner account:', await j.page.getByText('Owner account').count())
console.log('page has Joiner account:', await j.page.getByText('Joiner account').count())
await browser.close()
