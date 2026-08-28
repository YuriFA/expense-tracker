import type { Settings } from '@/shared/config/settings'

let activeTheme: Settings['theme'] = 'light'
let systemDark: MediaQueryList | null = null
let listening = false

// Resolved lazily: the module can be imported outside a DOM environment
// (unit tests), where window.matchMedia may not exist.
const systemDarkQuery = () => {
  systemDark ??= window.matchMedia('(prefers-color-scheme: dark)')
  return systemDark
}

const sync = () => {
  const dark = activeTheme === 'dark' || (activeTheme === 'system' && systemDarkQuery().matches)
  document.documentElement.classList.toggle('dark', dark)
}

const onSystemChange = () => {
  // The media listener lives for the page lifetime but only acts while the
  // user actually follows the system preference.
  if (activeTheme === 'system') sync()
}

/**
 * Bridges the persisted theme choice onto the DOM: the `.dark` root class
 * drives the Tailwind dark variant (`@custom-variant dark` in style.css) and
 * every `--*-token` dark value. `system` follows the OS preference live.
 * Called once at startup (before mount, so the first paint already matches)
 * and from the settings control - state syncs through this event path, not a
 * watcher (vue-patterns reactivity budget).
 */
export function applyTheme(theme: Settings['theme']) {
  activeTheme = theme
  if (!listening) {
    systemDarkQuery().addEventListener('change', onSystemChange)
    listening = true
  }
  sync()
}
