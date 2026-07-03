import { createApp, watch } from 'vue'
import { createPinia, storeToRefs } from 'pinia'
import { PiniaColada } from '@pinia/colada'

import App from './App.vue'
import i18n from './app/i18n'
import router from './app/router'
import { provideRepositories } from './app/repositories'
import './style.css'
import { maskito } from '@maskito/vue'
import { useSettingsStore } from './shared/stores/use-settings-store'

const app = createApp(App).directive('maskito', maskito)
const pinia = createPinia()
const settingsStore = useSettingsStore(pinia)
const { locale } = storeToRefs(settingsStore)

i18n.global.locale.value = locale.value

app.use(i18n)
app.use(pinia)
app.use(PiniaColada, {
  queryOptions: {
    gcTime: 300_000, // 5 minutes, the default
  },
})
app.use(router)
provideRepositories(app)

watch(locale, (value) => {
  i18n.global.locale.value = value
})

app.mount('#app')
