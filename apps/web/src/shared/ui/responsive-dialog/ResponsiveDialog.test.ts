import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'
import { DESKTOP_PRESENTATION_KEY } from '@/shared/lib/presentation'
import { ResponsiveDialog } from '.'

afterEach(() => {
  document.body.innerHTML = ''
})

function mountDialog(desktop: boolean, extraProps: Record<string, unknown> = {}) {
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
            ...extraProps,
          },
          {
            title: () => 'Overlay title',
            default: () => h('div', { 'data-testid': 'responsive-dialog-body' }, 'Overlay body'),
            footer: () => h('span', { 'data-testid': 'responsive-dialog-footer' }, 'Overlay footer'),
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

const content = () => document.querySelector('[data-slot="dialog-content"]')
const drawerContent = () => document.querySelector('[data-slot="drawer-content"]')
const surface = () => content() ?? drawerContent()
const header = () => surface()?.querySelector('header')
const footerBand = () =>
  document.querySelector('[data-testid="responsive-dialog-footer"]')?.parentElement

describe('ResponsiveDialog', () => {
  it('renders the desktop dialog presentation when pinned to desktop', async () => {
    mountDialog(true)
    await flushPromises()

    expect(content()).not.toBeNull()
    expect(drawerContent()).toBeNull()
    expect(document.querySelector('[data-testid="responsive-dialog-body"]')?.textContent).toBe('Overlay body')
  })

  it('renders the mobile drawer presentation when pinned to mobile', async () => {
    mountDialog(false)
    await flushPromises()

    expect(drawerContent()).not.toBeNull()
    expect(content()).toBeNull()
    expect(document.querySelector('[data-testid="responsive-dialog-body"]')?.textContent).toBe('Overlay body')
  })

  it('borders the header and the footer band by default (settings design language)', async () => {
    mountDialog(true)
    await flushPromises()

    expect(header()?.className).toContain('border-b')
    expect(footerBand()?.className).toContain('border-t')
  })

  it('keeps the mobile drawer footer bordered by default', async () => {
    mountDialog(false)
    await flushPromises()

    expect(header()?.className).toContain('border-b')
    expect(footerBand()?.className).toContain('border-t')
  })

  it('drops the hairlines on opt-out (plain header, unbordered footer)', async () => {
    mountDialog(true, { headerVariant: 'plain', borderedFooter: false })
    await flushPromises()

    expect(header()?.className).not.toContain('border-b')
    expect(footerBand()?.className).not.toContain('border-t')
  })
})
