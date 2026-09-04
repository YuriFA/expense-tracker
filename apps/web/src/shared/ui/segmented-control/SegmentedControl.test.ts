import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'
import { SegmentedControl, type SegmentedControlOption } from '.'

afterEach(() => {
  document.body.innerHTML = ''
})

const options: SegmentedControlOption<'a' | 'b'>[] = [
  { value: 'a', label: 'Option A', testid: 'seg-a' },
  { value: 'b', label: 'Option B', testid: 'seg-b' },
]

function mountControl(initial: 'a' | 'b' = 'a') {
  const value = ref<'a' | 'b'>(initial)
  const Host = defineComponent({
    setup() {
      return () =>
        h(SegmentedControl, {
          modelValue: value.value,
          options,
          'aria-label': 'Choice',
          'data-testid': 'seg',
          'onUpdate:modelValue': (next: string) => {
            value.value = next as 'a' | 'b'
          },
        })
    },
  })
  const wrapper = mountWithProviders(Host, { repositories: {} })

  const byTestId = (testid: string): HTMLElement => {
    const el = wrapper.element.querySelector(`[data-testid="${testid}"]`)
    if (!(el instanceof HTMLElement)) throw new Error(`missing ${testid}`)
    return el
  }
  return { wrapper, value, byTestId }
}

describe('SegmentedControl', () => {
  it('renders a labeled group of aria-pressed items with the active one on', () => {
    const { wrapper, byTestId } = mountControl('a')

    // role=group + attrs land on the track root (ToggleGroupRoot).
    expect(wrapper.element.getAttribute('role')).toBe('group')
    expect(wrapper.element.getAttribute('aria-label')).toBe('Choice')
    expect(byTestId('seg-a').getAttribute('aria-pressed')).toBe('true')
    expect(byTestId('seg-b').getAttribute('aria-pressed')).toBe('false')
  })

  it('emits the picked value on click', async () => {
    const { value, byTestId } = mountControl('a')

    byTestId('seg-b').click()
    await flushMicrotasks()

    expect(value.value).toBe('b')
    expect(byTestId('seg-b').getAttribute('aria-pressed')).toBe('true')
  })

  it('keeps the selection when the active segment is re-clicked', async () => {
    const { value, byTestId } = mountControl('a')

    byTestId('seg-a').click()
    await flushMicrotasks()

    // A single-select field always holds a value: the de-select that
    // ToggleGroup single would perform is suppressed.
    expect(value.value).toBe('a')
    expect(byTestId('seg-a').getAttribute('aria-pressed')).toBe('true')
  })
})

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
