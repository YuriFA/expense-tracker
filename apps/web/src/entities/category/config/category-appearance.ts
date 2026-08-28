// Pre-paired category appearance for creation UIs: each emoji of the closed
// icon set carries its own strongly distinct background color (one color per
// icon - the pair travels together, the user only picks the emoji). The
// chosen color is STORED on the category record (API field `color`), and
// charts rely on the palette staying mutually distinct. Web copy of the set;
// the mobile category-appearance config keeps its own until mobile adopts
// the paired model.
//
// Colors are raw hex DATA rendered via inline styles (tinted circle
// backgrounds, chart fills), not Tailwind classes.

export interface CategoryIconOption {
  icon: string
  color: string
}

export const CATEGORY_ICONS: readonly CategoryIconOption[] = [
  { icon: '☕', color: '#92400e' },
  { icon: '🍔', color: '#ea580c' },
  { icon: '🍕', color: '#dc2626' },
  { icon: '🥗', color: '#65a30d' },
  { icon: '🛒', color: '#16a34a' },
  { icon: '🚗', color: '#64748b' },
  { icon: '🚌', color: '#d97706' },
  { icon: '✈️', color: '#0284c7' },
  { icon: '🏠', color: '#0d9488' },
  { icon: '🛠️', color: '#78716c' },
  { icon: '🐾', color: '#0f766e' },
  { icon: '🎁', color: '#db2777' },
  { icon: '🎬', color: '#7c3aed' },
  { icon: '🎮', color: '#4f46e5' },
  { icon: '📚', color: '#2563eb' },
  { icon: '🎓', color: '#9333ea' },
  { icon: '💪', color: '#0891b2' },
  { icon: '❤️', color: '#e11d48' },
  { icon: '💼', color: '#c026d3' },
  { icon: '💰', color: '#a16207' },
]

/** Default picker selection. */
export const DEFAULT_CATEGORY_ICON = CATEGORY_ICONS[0]!

/**
 * Color for a new category: the icon's paired color, or the nearest free
 * palette color (walking outward from the pair) when it is already taken -
 * keeps chart colors mutually distinct for as long as the palette allows.
 */
export function pickCategoryColor(icon: string, existingColors: readonly string[]): string {
  const taken = new Set(existingColors)
  const index = CATEGORY_ICONS.findIndex((option) => option.icon === icon)
  const anchor = index === -1 ? CATEGORY_ICONS[0]! : CATEGORY_ICONS[index]!
  const ordered =
    index === -1 ? CATEGORY_ICONS : [...CATEGORY_ICONS.slice(index), ...CATEGORY_ICONS.slice(0, index)]
  return ordered.find((option) => !taken.has(option.color))?.color ?? anchor.color
}
