import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'
import { Drawer, DrawerContent } from '.'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Drawer', () => {
  it('renders the drawer content and handle when open', async () => {
    const Host = defineComponent({
      setup() {
        const open = ref(true)
        return () =>
          h(
            Drawer,
            { open: open.value, 'onUpdate:open': (value: boolean) => (open.value = value) },
            () =>
              h(DrawerContent, { class: 'custom-drawer' }, () =>
                h('div', { 'data-testid': 'drawer-body' }, 'Body'),
              ),
          )
      },
    })

    mountWithProviders(Host, { repositories: {} })
    await flushPromises()

    const content = document.querySelector<HTMLElement>('[data-slot="drawer-content"]')
    expect(content).not.toBeNull()
    expect(content?.className).toContain('custom-drawer')
    expect(document.querySelector('[data-slot="drawer-handle"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="drawer-body"]')?.textContent).toBe('Body')
  })
})
