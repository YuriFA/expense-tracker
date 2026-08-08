import i18n from '@/shared/i18n'
import { useQueryCache } from '@pinia/colada'
import { watch } from 'vue'

export const setupI18nLocaleWatcher = () => {
  const queryCache = useQueryCache()

  watch(i18n.global.locale, () => {
    queryCache.invalidateQueries({ key: ['categories'] })
  })
}
