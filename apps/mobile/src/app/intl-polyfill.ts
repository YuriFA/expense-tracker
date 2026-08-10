/**
 * Intl polyfills for Hermes - React Native's JS engine on this app.
 *
 * Hermes ships without full ICU/`Intl`, so at runtime these throw on device:
 *   - `Intl.NumberFormat` lacks `formatToParts` and `currencyDisplay:
 *     'narrowSymbol'` (used by `formatMoney`, `currencySymbol`, AmountField's
 *     VoiceOver currency name).
 *   - `Intl.DateTimeFormat` (used by `formatDate` and the Home header date).
 *   - `Intl.DisplayNames` (used by the Settings currency picker).
 *
 * This module installs the `@formatjs` ponyfills for all three Intl APIs plus
 * the `en` and `ru` locale data - the only locales the app supports. The shared
 * `@expense-tracker/money` package is left untouched (web keeps using native
 * Intl); the polyfill just makes its existing Intl usage work on Hermes.
 *
 * `polyfill-force` is used unconditionally rather than the `shouldPolyfill`
 * guard: the app is Hermes-only and the native Intl is known-incomplete, so a
 * deterministic install guarantees the money/date/settings paths render instead
 * of relying on feature-detection heuristics.
 *
 * IMPORTANT: this module MUST be imported before any `Intl` usage. It is the
 * very first import in the Expo Router root layout (`app/_layout.tsx`). ES
 * module imports are hoisted and execute in source order, so the install runs
 * during `_layout` module evaluation - before any component renders. Every
 * `Intl` call site in the app is inside a render/function body, never at module
 * top level, so the polyfill is always in place by the time they run.
 *
 * Within this file, the `polyfill-force` imports must precede their
 * `locale-data` imports: the locale-data files call `__addLocaleData` on the
 * (just-installed) polyfill constructor.
 */
import '@formatjs/intl-numberformat/polyfill-force.js'
import '@formatjs/intl-datetimeformat/polyfill-force.js'
import '@formatjs/intl-displaynames/polyfill-force.js'

import '@formatjs/intl-numberformat/locale-data/en.js'
import '@formatjs/intl-numberformat/locale-data/ru.js'
import '@formatjs/intl-datetimeformat/locale-data/en.js'
import '@formatjs/intl-datetimeformat/locale-data/ru.js'
import '@formatjs/intl-displaynames/locale-data/en.js'
import '@formatjs/intl-displaynames/locale-data/ru.js'
