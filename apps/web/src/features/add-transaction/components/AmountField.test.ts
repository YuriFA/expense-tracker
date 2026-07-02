import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { Form as VeeForm } from 'vee-validate'
import AmountField from './AmountField.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

function mountInForm() {
  const Wrapper = defineComponent({
    setup() {
      return () => h(VeeForm, { onSubmit: vi.fn<() => void>() }, () => h(AmountField))
    },
  })
  return mountWithProviders(Wrapper, { repositories: {} })
}

describe('AmountField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mounts inside Form context', () => {
    const wrapper = mountInForm()
    expect(wrapper.find('input#amount').exists()).toBe(true)
  })

  it('renders NumberField component', () => {
    const wrapper = mountInForm()
    expect(wrapper.findComponent({ name: 'NumberField' }).exists()).toBe(true)
  })

  it('accepts class prop', () => {
    const Wrapper = defineComponent({
      setup() {
        return () =>
          h(VeeForm, { onSubmit: vi.fn<() => void>() }, () => h(AmountField, { class: 'custom-class' }))
      },
    })
    const wrapper = mountWithProviders(Wrapper, { repositories: {} })
    expect(wrapper.html()).toContain('custom-class')
  })
})
