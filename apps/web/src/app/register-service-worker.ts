import { registerSW } from 'virtual:pwa-register'
import { toast } from 'vue-sonner'
import i18n from '@/shared/i18n'

/**
 * Registers the app-shell service worker and wires the prompted update flow
 * (capability `web-pwa`): when a new build deploys, the running app shows a
 * toast offering a reload. The old version keeps serving until the user
 * accepts (or the next cold start) - never an automatic reload that would
 * destroy unsaved state mid-work.
 */
export function registerServiceWorker(): void {
  const updateServiceWorker = registerSW({
    onNeedRefresh() {
      toast.info(i18n.global.t('common.updateAvailable'), {
        duration: Infinity,
        action: {
          label: i18n.global.t('common.updateNow'),
          onClick: () => updateServiceWorker(true),
        },
      })
    },
    onOfflineReady() {
      // The shell is precached for offline use; nothing user-facing to do.
    },
  })
}
