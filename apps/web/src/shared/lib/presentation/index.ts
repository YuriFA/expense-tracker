import { useMediaQuery } from '@vueuse/core'
import type { InjectionKey, Ref } from 'vue'
import { inject } from 'vue'

export const DESKTOP_PRESENTATION_KEY: InjectionKey<Readonly<Ref<boolean>>> =
  Symbol('desktopPresentation')

// 768px is the sidebar <-> bottom-tabs boundary (web-screens); AppShell is the
// single provider, so the fallback only runs in tests without a provider.
export const DESKTOP_MEDIA_QUERY = '(min-width: 768px)'

export const useDesktopPresentation = () =>
  inject(DESKTOP_PRESENTATION_KEY, null) ?? useMediaQuery(DESKTOP_MEDIA_QUERY)
