import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import AmountField from './AmountField.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

function mountField(props: Record<string, unknown> = {}) {
  const Wrapper = defineComponent({
    setup() {
      return () => h(AmountField, props)
    },
  })
  return mountWithProviders(Wrapper, { repositories: {} })
}

describe('AmountField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders input', () => {
    const wrapper = mountField()
    expect(wrapper.find('input#amount').exists()).toBe(true)
  })

  it('renders NumberField component', () => {
    const wrapper = mountField()
    expect(wrapper.findComponent({ name: 'NumberField' }).exists()).toBe(true)
  })

  it('accepts class prop', () => {
    const wrapper = mountField({ class: 'custom-class' })
    expect(wrapper.html()).toContain('custom-class')
  })

  it('reflects modelValue in NumberField', () => {
    const wrapper = mountField({ modelValue: 42 })
    expect(wrapper.findComponent({ name: 'NumberField' }).props('modelValue')).toBe(42)
  })

  it('marks input invalid when errors provided', () => {
    const wrapper = mountField({ errors: ['error'] })
    expect(wrapper.find('input#amount').attributes('aria-invalid')).toBe('true')
  })
})
