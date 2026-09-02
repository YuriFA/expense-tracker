import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import AmountField from './AmountField.vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

function mountField(props: Record<string, unknown> = {}) {
  const Wrapper = defineComponent({
    setup() {
      const value = ref<number | undefined>(props.modelValue as number | undefined)

      return () =>
        h('div', [
          h(AmountField, {
            ...props,
            modelValue: value.value,
            'onUpdate:modelValue': (next: number | undefined) => {
              value.value = next
            },
          }),
          h('output', { 'data-testid': 'model' }, value.value === undefined ? 'undefined' : String(value.value)),
        ])
    },
  })

  return mountWithProviders(Wrapper, { repositories: {} })
}

describe('AmountField', () => {
  it('renders a text input with the default placeholder', () => {
    const wrapper = mountField({ id: 'test-amount' })
    const input = wrapper.get('input#test-amount')

    expect(input.attributes('inputmode')).toBe('decimal')
    expect(input.attributes('placeholder')).toBe('0.00')
    expect(wrapper.text()).toContain('₽')
  })

  it('renders the blurred amount without an extra suffix duplicate', () => {
    const wrapper = mountField({ id: 'test-amount', modelValue: 42 })
    const input = wrapper.get('input#test-amount')

    expect((input.element as HTMLInputElement).value).toBe('₽42.00')
    expect(wrapper.findAll('span').some((node) => node.text() === '₽')).toBe(false)
  })

  it('switches to a raw editable draft on focus', async () => {
    const wrapper = mountField({ id: 'test-amount', modelValue: 42.5 })
    const input = wrapper.get('input#test-amount')

    await input.trigger('focus')

    expect((input.element as HTMLInputElement).value).toBe('42.5')
    expect(wrapper.findAll('span').some((node) => node.text() === '₽')).toBe(true)
  })

  it('updates the numeric model for valid drafts and keeps it for partial ones', async () => {
    const wrapper = mountField({ id: 'test-amount', modelValue: 12 })
    const input = wrapper.get('input#test-amount')

    await input.trigger('focus')
    await input.setValue('1234.5')
    expect(wrapper.get('[data-testid="model"]').text()).toBe('1234.5')

    ;(input.element as HTMLInputElement).value = '1234.'
    await input.trigger('input')
    expect(wrapper.get('[data-testid="model"]').text()).toBe('1234.5')
    expect((input.element as HTMLInputElement).value).toBe('1234.')
  })

  it('restores the last valid value on blur after a partial draft', async () => {
    const wrapper = mountField({ id: 'test-amount', modelValue: 12.34 })
    const input = wrapper.get('input#test-amount')

    await input.trigger('focus')
    ;(input.element as HTMLInputElement).value = '12.'
    await input.trigger('input')
    await input.trigger('blur')

    expect(wrapper.get('[data-testid="model"]').text()).toBe('12.34')
    expect((input.element as HTMLInputElement).value).toBe('₽12.34')
  })

  it('clears the model when the user empties the field', async () => {
    const wrapper = mountField({ id: 'test-amount', modelValue: 12.34, class: 'custom-class' })
    const input = wrapper.get('input#test-amount')

    await input.trigger('focus')
    await input.setValue('')
    await input.trigger('blur')

    expect(wrapper.get('[data-testid="model"]').text()).toBe('undefined')
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(wrapper.html()).toContain('custom-class')
  })
})
