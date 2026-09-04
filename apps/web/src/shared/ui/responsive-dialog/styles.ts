import { DRAWER_SAFE_AREA_BOTTOM } from '@/shared/ui/drawer'

// Full-bleed footer band for forms that render their footer inside the
// dialog body (the submit state lives in the form component, so the buttons
// cannot move to the ResponsiveDialog #footer slot: tabbed or dispatching
// containers embed these forms). The band escapes the body's horizontal
// padding and cancels the body wrapper's bottom padding (-mb-6): because
// the wrapper - not the scroll container - owns that padding, the sticky
// band settles flush against the scrollport bottom (bg-card keeps the
// scrolled body content from bleeding through; the drawer's safe-area
// padding applies on mobile).
export const DIALOG_FORM_FOOTER_CLASS = `sticky bottom-0 z-10 -mx-6 -mb-6 mt-6 border-t border-border bg-card px-6 pt-4 ${DRAWER_SAFE_AREA_BOTTOM} sm:pb-5`
