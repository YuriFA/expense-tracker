import { DRAWER_SAFE_AREA_BOTTOM } from '@/shared/ui/drawer'

// Full-bleed footer band for forms that render their footer inside the
// dialog body (the submit state lives in the form component, so the buttons
// cannot move to the ResponsiveDialog #footer slot). Mirrors the shell's
// borderedFooter breakout — the hairline spans the overlay edge-to-edge —
// with the drawer's safe-area padding on mobile.
export const DIALOG_FORM_FOOTER_CLASS = `-mx-6 -mb-6 mt-2 border-t border-border px-6 pt-4 ${DRAWER_SAFE_AREA_BOTTOM} sm:pb-5`
