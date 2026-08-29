import { describe, it, expect } from 'vitest'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'
import PeriodNav from './PeriodNav.vue'

const props = {
  label: 'Август 2026',
  prevLabel: 'Предыдущий месяц',
  nextLabel: 'Следующий месяц',
}

describe('PeriodNav', () => {
  it('renders the period label', () => {
    const wrapper = mountWithProviders(PeriodNav, { props })
    expect(wrapper.find('[data-testid="period-nav-label"]').text()).toBe('Август 2026')
  })

  it('emits prev and next from the chevron steps', async () => {
    const wrapper = mountWithProviders(PeriodNav, { props })
    await wrapper.find('[data-testid="period-nav-prev"]').trigger('click')
    await wrapper.find('[data-testid="period-nav-next"]').trigger('click')
    expect(wrapper.emitted('prev')).toHaveLength(1)
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('disables the forward step when the current period is reached', async () => {
    const wrapper = mountWithProviders(PeriodNav, { props: { ...props, canNext: false } })
    const next = wrapper.find('[data-testid="period-nav-next"]')
    expect(next.attributes('disabled')).toBeDefined()
    await next.trigger('click')
    expect(wrapper.emitted('next')).toBeUndefined()
    // Backward stepping stays available.
    await wrapper.find('[data-testid="period-nav-prev"]').trigger('click')
    expect(wrapper.emitted('prev')).toHaveLength(1)
  })
})
