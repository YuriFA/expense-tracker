import { createApp, watch } from 'vue'
import { createPinia, storeToRefs } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { PiniaColadaRetry } from '@pinia/colada-plugin-retry'

import App from './App.vue'
import i18n from './shared/i18n'
import router from './app/router'
import { provideRepositories } from './app/repositories'
import { setUnauthorizedHandler } from './shared/api'
import { useAuthStore } from './entities/session'
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

// 401 interceptor: when an authenticated request loses its session mid-flight,
// clear local auth state and redirect to login. Unauthenticated calls (login/
// register/me before sign-in) handle UnauthorizedError themselves and the
// auth store is empty then, so this is a no-op for them.
setUnauthorizedHandler(() => {
  const auth = useAuthStore()
  if (auth.isAuthenticated) {
    auth.clearSession()
    void router.push({
      name: 'login',
      query: { redirect: router.currentRoute.value.fullPath },
    })
  }
})

watch(
  locale,
  (value) => {
    i18n.global.locale.value = value
  },
  { immediate: true },
)

setupI18nLocaleWatcher()
app.mount('#app')
