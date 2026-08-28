import type { Settings } from '@/shared/config/settings'

/**
 * Bridges the persisted theme choice onto the DOM: the `.dark` root class
 * drives the Tailwind dark variant (`@custom-variant dark` in style.css) and
 * every `--*-token` dark value. Called once at startup (before mount, so the
 * first paint already matches) and from the settings control - state syncs
 * through this event path, not a watcher (vue-patterns reactivity budget).
 */
export function applyTheme(theme: Settings['theme']) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}
