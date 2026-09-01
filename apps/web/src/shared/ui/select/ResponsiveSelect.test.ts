import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'
import { DESKTOP_PRESENTATION_KEY } from '@/shared/lib/presentation'
import {
  ResponsiveSelect,
  ResponsiveSelectContent,
  ResponsiveSelectItem,
  ResponsiveSelectTrigger,
  ResponsiveSelectValue,
} from '.'

afterEach(() => {
  document.body.innerHTML = ''
})

function mountSelect(desktop: boolean, initialValue = 'a1') {
  const Host = defineComponent({
    setup() {
      const value = ref(initialValue)
      return () =>
        h(
          ResponsiveSelect,
          {
            modelValue: value.value,
            'onUpdate:modelValue': (nextValue) => {
              value.value = nextValue as string
            },
          },
          {
            default: () => [
              h(
                ResponsiveSelectTrigger,
                { id: 'account-select', class: 'w-full' },
                {
                  default: () =>
                    h(
                      ResponsiveSelectValue,
                      { placeholder: 'Pick account' },
                      {
                        default: () => (value.value === 'a2' ? 'Savings' : 'Main'),
                      },
                    ),
                },
              ),
              h(
                ResponsiveSelectContent,
                { title: 'Account' },
                {
                  default: () => [
                    h(ResponsiveSelectItem, { value: 'a1' }, { default: () => 'Main' }),
                    h(ResponsiveSelectItem, { value: 'a2' }, { default: () => 'Savings' }),
                  ],
                },
              ),
            ],
          },
        )
    },
  })

  return mountWithProviders(Host, {
    repositories: {},
    global: {
      provide: {
        [DESKTOP_PRESENTATION_KEY]: ref(desktop),
      },
    },
  })
}

describe('ResponsiveSelect', () => {
  it('keeps the desktop select presentation when pinned to desktop', async () => {
    const wrapper = mountSelect(true)
    await flushPromises()

    expect(wrapper.findComponent({ name: 'SelectTrigger' }).exists()).toBe(true)
  })

  it('renders the selected value in the mobile trigger and updates through the drawer list', async () => {
    const wrapper = mountSelect(false)
    await flushPromises()

    const trigger = wrapper.find('#account-select')
    expect(trigger.text()).toContain('Main')

    await trigger.trigger('click')
    await flushPromises()

    const savings = [...document.querySelectorAll<HTMLButtonElement>('[data-slot="select-item"]')].find(
      (button) => button.textContent?.includes('Savings'),
    )
    savings?.click()
    await flushPromises()

    expect(wrapper.find('#account-select').text()).toContain('Savings')
  })
})
