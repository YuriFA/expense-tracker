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
// half-grid-column card (see StatCard.vue).
describe('StatCard amount sizing', () => {
  it('keeps the display size for short amounts', () => {
    expect(amountClasses('0 ₽')).toContain('text-2xl')
    expect(amountClasses('45 300 ₽')).toContain('text-2xl')
  })

  it('steps down one size at nine characters (worst exact figure "999 999 ₽")', () => {
    const classes = amountClasses('999 999 ₽')
    expect(classes).toContain('text-xl')
    expect(classes).not.toContain('text-2xl')
  })

  it('steps down two sizes for very long amounts', () => {
    const classes = amountClasses('1 000 100 000 ₽')
    expect(classes).toContain('text-lg')
    expect(classes).not.toContain('text-2xl')
  })
})
