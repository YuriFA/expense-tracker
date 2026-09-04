// Display-only mapping for categories created before the unified emoji
// icon set: early mobile versions stored Ionicons glyph names as the
// category icon, which would render blank under the emoji renderer. The
// map is applied wherever a STORED icon is rendered; it never writes back
// (stored values stay untouched). Unknown strings pass through unchanged -
// emoji from the web renders directly, anything else degrades to text
// exactly like the web app does today.

const LEGACY_IONICONS_TO_EMOJI: Readonly<Record<string, string>> = {
  pricetag: '🏷️',
  cart: '🛒',
  cafe: '☕',
  restaurant: '🍽️',
  'fast-food': '🍔',
  car: '🚗',
  bus: '🚌',
  airplane: '✈️',
  home: '🏠',
  fitness: '💪',
  heart: '❤️',
  paw: '🐾',
  'game-controller': '🎮',
  gift: '🎁',
  school: '🎓',
  book: '📚',
  cash: '💰',
  card: '💳',
  wallet: '👛',
  film: '🎬',
}

/** Emoji to display for a stored category icon string. */
export function legacyCategoryIcon(icon: string): string {
  return LEGACY_IONICONS_TO_EMOJI[icon] ?? icon
}
