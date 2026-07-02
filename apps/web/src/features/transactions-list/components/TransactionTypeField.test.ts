import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { Form as VeeForm } from 'vee-validate'
import TransactionTypeField from './TransactionTypeField.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

function mountInForm() {
  const Wrapper = defineComponent({
    setup() {
      return () => h(VeeForm, { onSubmit: vi.fn() }, () => h(TransactionTypeField))
    },
  })
  return mountWithProviders(Wrapper, { repositories: {} })
}

describe('TransactionTypeField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mounts inside Form context', () => {
    const wrapper = mountInForm()
    expect(wrapper.find('button#type').exists()).toBe(true)
  })

  it('renders FieldLabel', () => {
    const wrapper = mountInForm()
    expect(wrapper.find('label').exists()).toBe(true)
  })

  it('renders Select component', () => {
    const wrapper = mountInForm()
    expect(wrapper.findComponent({ name: 'Select' }).exists()).toBe(true)
  })
})
