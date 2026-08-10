// Platform-agnostic i18n assets: message bundles, locale config, and the
// localized default-categories seed. No framework or domain dependency - apps
// pass their own translator function (see map-categories).

export { messages, type MessageSchema } from './schema'
export { DEFAULT_LOCALE, type AppLocale } from './locale'
export { DEFAULT_CATEGORIES, type SeedCategory } from './default-categories'
export {
  localizeCategoryName,
  mapCategory,
  mapCategories,
  type Translator,
  type LocalizableCategory,
} from './map-categories'
