import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { currentDay } from '@/shared/lib/date'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'
import { DESKTOP_PRESENTATION_KEY } from '@/shared/lib/presentation'
import { DateField } from '.'

afterEach(() => {
  document.body.innerHTML = ''
})

function mountDateField(desktop: boolean) {
  const emitted: string[] = []
  const Host = defineComponent({
    setup() {
      const value = ref<string | undefined>()
      return () =>
        h(DateField, {
          inputId: 'date-field',
          modelValue: value.value,
          placeholder: 'Pick a date',
          'onUpdate:modelValue': (nextValue: string) => {
            emitted.push(nextValue)
            value.value = nextValue
          },
        })
    },
  })

  const wrapper = mountWithProviders(Host, {
    repositories: {},
    global: {
      provide: {
        [DESKTOP_PRESENTATION_KEY]: ref(desktop),
      },
    },
  })

  return { wrapper, emitted }
}

describe('DateField', () => {
  it('renders the desktop popover trigger when pinned to desktop', async () => {
    const { wrapper } = mountDateField(true)
    await flushPromises()

    expect(wrapper.findComponent({ name: 'Popover' }).exists()).toBe(true)
  })

  it('offers mobile quick-date chips and emits the chosen date', async () => {
    const { wrapper, emitted } = mountDateField(false)
    await flushPromises()

    await wrapper.find('#date-field').trigger('click')
    await flushPromises()

    const quickOptions = document.querySelectorAll<HTMLButtonElement>(
      '[data-slot="drawer-content"] [data-slot="button"]',
    )
    quickOptions[1]?.click()
    await flushPromises()

    expect(emitted.at(-1)).toBe(currentDay())
  })
})
