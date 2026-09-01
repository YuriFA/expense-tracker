import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'
import { DESKTOP_PRESENTATION_KEY } from '@/shared/lib/presentation'
import { ResponsiveDialog } from '.'

afterEach(() => {
  document.body.innerHTML = ''
})

function mountDialog(desktop: boolean) {
  const Host = defineComponent({
    setup() {
      const open = ref(true)
      return () =>
        h(
          ResponsiveDialog,
          {
            open: open.value,
            'onUpdate:open': (value: boolean) => (open.value = value),
            'data-testid': 'responsive-dialog',
          },
          {
            title: () => 'Overlay title',
            default: () => h('div', { 'data-testid': 'responsive-dialog-body' }, 'Overlay body'),
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

describe('ResponsiveDialog', () => {
  it('renders the desktop dialog presentation when pinned to desktop', async () => {
    mountDialog(true)
    await flushPromises()

    expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="drawer-content"]')).toBeNull()
    expect(document.querySelector('[data-testid="responsive-dialog-body"]')?.textContent).toBe('Overlay body')
  })

  it('renders the mobile drawer presentation when pinned to mobile', async () => {
    mountDialog(false)
    await flushPromises()

    expect(document.querySelector('[data-slot="drawer-content"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull()
    expect(document.querySelector('[data-testid="responsive-dialog-body"]')?.textContent).toBe('Overlay body')
  })
})
