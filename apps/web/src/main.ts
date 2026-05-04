import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import i18n from './app/i18n'
import router from './app/router'
import './style.css'
import { maskito } from '@maskito/vue'
import { useSettingsStore } from './stores/use-settings-store'
import type { Settings } from './types/settings'

const app = createApp(App).directive('maskito', maskito)
const pinia = createPinia()

app.use(i18n)
app.use(pinia)
app.use(router)

const settingsStore = useSettingsStore(pinia)

watch(
  () => settingsStore.locale,
  (locale) => {
    i18n.global.locale.value = locale as Settings['locale']
  },
  { immediate: true },
)

app.mount('#app')
