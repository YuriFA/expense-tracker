import { useMediaQuery } from '@vueuse/core'
import type { InjectionKey, Ref } from 'vue'
import { inject } from 'vue'

export const DESKTOP_PRESENTATION_KEY: InjectionKey<Readonly<Ref<boolean>>> =
  Symbol('desktopPresentation')

export const useDesktopPresentation = () =>
  inject(DESKTOP_PRESENTATION_KEY, useMediaQuery('(min-width: 768px)'))
