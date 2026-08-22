/**
 * Internal dimensions for the collapsible screen header.
 *
 * Component-specific layout numbers (like SpeedDial's FAB size), NOT design
 * tokens - the token system covers colors / radius / typography, not "header
 * bar height". Colors are still consumed as Uniwind classes resolving tokens.
 */

/** Content-row height of the compact bar, below the top safe-area inset (iOS uses 44pt). */
export const COMPACT_BAR_HEIGHT = 44

/**
 * Room the large title occupies between the compact bar and the content:
 * the display title (42px) plus bottom breathing space. Scrolling this far
 * also fully collapses the large title into the compact bar - the collapse
 * distance equals the zone height because the title travels 1:1 with the
 * scroll.
 */
export const LARGE_TITLE_ZONE = 64

/**
 * Fractions of the [0..1] collapse progress at which each layer animates.
 * The large title fades through most of the range while moving 1:1 with the
 * scroll; the compact title and the bar's frosted background arrive late, so
 * the two title nodes read as one continuous title rather than a cross-fade
 * of two.
 */
export const LARGE_TITLE_FADE_RANGE: [number, number] = [0, 0.9]
export const COMPACT_TITLE_RANGE: [number, number] = [0.5, 1]
export const BAR_BACKGROUND_RANGE: [number, number] = [0.4, 1]

/**
 * Frost intensity (0-100) of the collapsed bar's expo-blur layer -
 * deliberately subtle, so content under the bar reads as softened, not gone.
 */
export const BAR_BLUR_INTENSITY = 10

/** Upward settle (px) of the compact title while fading in. */
export const COMPACT_TITLE_TRANSLATE = 4
