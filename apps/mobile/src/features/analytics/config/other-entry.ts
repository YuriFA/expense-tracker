// The aggregated «Прочие» donut/legend entry needs one concrete fill color
// for the Skia canvas. Like the category palette in
// entities/category/config/category-appearance.ts, it stores a token hex
// VALUE as data (painted directly, not via a Uniwind class), which is why
// this file is on the design-tokens-guard exemption list. Mirrors
// --color-muted-foreground (light variant).
export const OTHER_ENTRY_COLOR = '#6e6b7c'

/** Stable pseudo-id for the aggregated remainder entry. */
export const OTHER_ENTRY_ID = 'other'

// TODO(i18n): replace with the shared bundle once react-i18next is wired.
export const OTHER_ENTRY_LABEL = 'Прочие'
