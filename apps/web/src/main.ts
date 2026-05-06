import { createApp, watch } from 'vue'
import { createPinia, storeToRefs } from 'pinia'

import App from './App.vue'
import i18n from './app/i18n'
import router from './app/router'
import './style.css'
import { maskito } from '@maskito/vue'
import { useSettingsStore } from './stores/use-settings-store'

const app = createApp(App).directive('maskito', maskito)
const pinia = createPinia()
const settingsStore = useSettingsStore(pinia)
const { locale } = storeToRefs(settingsStore)

i18n.global.locale.value = locale.value

app.use(i18n)
app.use(pinia)
app.use(router)

watch(locale, (value) => {
  i18n.global.locale.value = value
})

app.mount('#app')
