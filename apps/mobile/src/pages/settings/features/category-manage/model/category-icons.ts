/**
 * Curated emoji palette for custom-category create/edit.
 *
 * Color is stored on the category (mirroring the bundled seed shape) but is NOT
 * used anywhere in chrome - categories differ by icon + name, which keeps them
 * color-blind safe (design section 6/11). The color is still populated so a
 * future chart surface has an accent to read, and so a custom category matches
 * the seed's shape exactly.
 *
 * The palette is intentionally small and flat: the seed covers the common
 * cases; this gives quick picks for anything else without a full emoji picker
 * (out of scope for the MVP).
 */
export interface CategoryIcon {
  icon: string
  color: string
}

export const CATEGORY_ICONS: ReadonlyArray<CategoryIcon> = [
  { icon: '💸', color: '#FF6347' },
  { icon: '🍔', color: '#FF8C00' },
  { icon: '☕', color: '#A0522D' },
  { icon: '🛒', color: '#1E90FF' },
  { icon: '🏠', color: '#20B2AA' },
  { icon: '💡', color: '#00CED1' },
  { icon: '🎬', color: '#FFD700' },
  { icon: '🎮', color: '#8A2BE2' },
  { icon: '✈️', color: '#4682B4' },
  { icon: '🚕', color: '#FFD700' },
  { icon: '⛽', color: '#556B2F' },
  { icon: '🏥', color: '#FF69B4' },
  { icon: '💪', color: '#FF4500' },
  { icon: '🎓', color: '#6A5ACD' },
  { icon: '🐾', color: '#D2691E' },
  { icon: '🎁', color: '#FF1493' },
  { icon: '💼', color: '#32CD32' },
  { icon: '📈', color: '#2E8B57' },
  { icon: '🏦', color: '#4682B4' },
  { icon: '💡', color: '#FFA500' },
  { icon: '📱', color: '#696969' },
  { icon: '👕', color: '#DB7093' },
  { icon: '🌱', color: '#3CB371' },
  { icon: '🔧', color: '#708090' },
]

/** Fallback when no icon is selected (defensive; the form always preselects). */
export const DEFAULT_CATEGORY_ICON = CATEGORY_ICONS[0]!
