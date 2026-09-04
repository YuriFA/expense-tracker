import { DRAWER_SAFE_AREA_BOTTOM } from '@/shared/ui/drawer'

// Full-bleed footer band for forms that render their footer inside the
// dialog body (the submit state lives in the form component, so the buttons
// cannot move to the ResponsiveDialog #footer slot). Mirrors the shell's
// borderedFooter breakout — the hairline spans the overlay edge-to-edge —
// with the drawer's safe-area padding on mobile. The body is the dialog's
// only scroll region, so the band sticks to its bottom edge to stay visible
// (bg-card keeps the scrolled body content from bleeding through).
export const DIALOG_FORM_FOOTER_CLASS = `sticky bottom-0 z-10 -mx-6 -mb-6 mt-6 border-t border-border bg-card px-6 pt-4 ${DRAWER_SAFE_AREA_BOTTOM} sm:pb-5`
