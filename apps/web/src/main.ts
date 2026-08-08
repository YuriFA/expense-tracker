import { createApp, watch } from 'vue'
import { createPinia, storeToRefs } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { PiniaColadaRetry } from '@pinia/colada-plugin-retry'

import App from './App.vue'
import i18n from './shared/i18n'
import router from './app/router'
import { provideRepositories } from './app/repositories'
import './style.css'
import { useSettingsStore } from './shared/store/use-settings-store'
import { setupI18nLocaleWatcher } from './app/setup-i18n-locale-watcher'

const app = createApp(App)
const pinia = createPinia()
const settingsStore = useSettingsStore(pinia)
const { locale } = storeToRefs(settingsStore)

app.use(i18n)
app.use(pinia)
app.use(PiniaColada, {
  queryOptions: {
    gcTime: 300_000, // 5 minutes, the default
    staleTime: 30_000, // SWR: don't refetch on remount within 30s
  },
  plugins: [
    PiniaColadaRetry({
      retry: 2,
      delay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
    }),
  ],
})
app.use(router)
provideRepositories(app)

watch(
  locale,
  (value) => {
    i18n.global.locale.value = value
  },
  { immediate: true },
)

setupI18nLocaleWatcher()
app.mount('#app')
