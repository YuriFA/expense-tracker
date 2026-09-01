import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, markRaw } from 'vue'
import StatCard from './StatCard.vue'

const IconStub = markRaw(defineComponent({ name: 'IconStub', render: () => null }))

const amountClasses = (amount: string) =>
  mount(StatCard, {
    props: { label: 'Accounts', amount, icon: IconStub },
  })
    .find('[data-testid="stat-card-amount"]')
    .classes()

// Amounts are unbreakable tokens; the size steps keep them inside the
// half-grid-column card (see StatCard.vue). Sizes are responsive: the compact
// mobile scale below md, the display scale from md up.
describe('StatCard amount sizing', () => {
  it('keeps the display size for short amounts', () => {
    expect(amountClasses('0 ₽')).toContain('text-lg')
    expect(amountClasses('0 ₽')).toContain('md:text-2xl')
    expect(amountClasses('45 300 ₽')).toContain('md:text-2xl')
  })

  it('steps down one size at nine characters (worst exact figure "999 999 ₽")', () => {
    const classes = amountClasses('999 999 ₽')
    expect(classes).toContain('md:text-xl')
    expect(classes).not.toContain('md:text-2xl')
  })

  it('steps down two sizes for very long amounts', () => {
    const classes = amountClasses('1 000 100 000 ₽')
    expect(classes).toContain('text-base')
    expect(classes).toContain('md:text-lg')
    expect(classes).not.toContain('md:text-2xl')
  })
})
