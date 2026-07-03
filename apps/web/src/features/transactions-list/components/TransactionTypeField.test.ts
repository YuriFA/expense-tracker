import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import TransactionTypeField from './TransactionTypeField.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

function mountField(props: Record<string, unknown> = {}) {
  const Wrapper = defineComponent({
    setup() {
      return () => h(TransactionTypeField, props)
    },
  })
  return mountWithProviders(Wrapper, { repositories: {} })
}

describe('TransactionTypeField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders select trigger', () => {
    const wrapper = mountField()
    expect(wrapper.find('button#type').exists()).toBe(true)
  })

  it('renders FieldLabel', () => {
    const wrapper = mountField()
    expect(wrapper.find('label').exists()).toBe(true)
  })

  it('renders Select component', () => {
    const wrapper = mountField()
    expect(wrapper.findComponent({ name: 'Select' }).exists()).toBe(true)
  })
})
