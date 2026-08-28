---
version: "superdesign-alpha"
name: "Ledger Lavender"
description: "Light, card-driven finance UI on a soft gray-lilac field, with a single violet brand accent rationed to primary actions and tinted summary tiles."
colors:
  background: "#F4F5F7"
  surface: "#FFFFFF"
  surface-tint-lavender: "#EDE9FD"
  surface-tint-mint: "#E8FDF3"
  text-primary: "#1A1A2E"
  text-secondary: "#9090A8"
  accent: "#6C5CE7"
  danger: "#C0392B"
  success: "#1D9E6F"
  border: "#000000"
typography:
  display-lg:
    fontFamily: "Inter"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "1.5"
  body-md:
    fontFamily: "Inter"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "1.5"
  label-md:
    fontFamily: "Inter"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "1.5"
  body-sm:
    fontFamily: "Inter"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "1.5"
spacing:
  base: "4px"
  gap: "16px"
  section-padding: "24px"
rounded:
  control: "4px"
  input: "5px"
  card: "16px"
  card-lg: "13px"
  pill: "9999px"
components:
  button-primary-lg:
    background: "#6C5CE7"
    text-color: "#FFFFFF"
    radius: "16px"
    height: "41px"
    padding: "10px 12px"
    hover: "opacity 0.9"
  button-primary-md:
    background: "#6C5CE7"
    text-color: "#FFFFFF"
    radius: "16px"
    height: "40px"
    padding: "10px 0px"
    hover: "opacity 0.9"
  button-primary-sm:
    background: "#6C5CE7"
    text-color: "#FFFFFF"
    radius: "16px"
    height: "30px"
    padding: "6px 12px"
    hover: "opacity 0.9"
  button-ghost:
    background: "transparent"
    text-color: "#000000"
    radius: "4px"
    height: "40px"
    padding: "8px"
  card-summary-stat:
    background: "#FFFFFF"
    radius: "16px"
    padding: "20px"
    shadow: "rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px"
  card-panel-tinted:
    background: "#EDE9FD"
    radius: "16px"
    padding: "20px"
  card-list-row:
    background: "transparent"
    radius: "0px"
    padding: "12px 0px"
---
# Ledger Lavender
Source: https://pogo-gains-30778792.figma.site/

## Overview
This is a light, data-dense productivity aesthetic in the lineage of flat design refined with soft elevation — closer to a modern fintech dashboard than any marketing surface. The system runs on a near-white/gray field (`#F4F5F7`) broken into flat white cards with barely-there shadows, one violet brand hue (`#6C5CE7`) rationed to primary buttons and small pastel-tinted tiles, and a semantic red/green pair doing all the emotional work (loss vs. gain). Typography is Inter throughout — no serif or mono accent exists in this system; hierarchy comes entirely from weight and size steps, not typeface variety.

## Composition
The page is a fixed-sidebar app shell: a narrow dark-icon nav rail on the left, unbounded content area on the right. Top-to-bottom on the content column: a compact page header (title + date-range stepper), a 4-up row of flat stat cards, a two-tile band mixing one lavender-tinted promo card with one mint-tinted summary card, a category-breakdown list card with inline progress bars, then a two-column split — a recent-activity list on the left and a persistent "Accounts + Quick Add" utility panel on the right. Density is high and functional: tight 16–24px gaps, no decorative whitespace, every card earns its place with data. The deliberate choice is a right-hand persistent form (Quick Add) living beside the content rather than behind a modal — trading screen real estate for zero-click data entry, rejecting the more common "float a button, open a dialog" pattern.

## Colors
Background is a flat neutral gray-lilac, `#F4F5F7` (confirmed by the author's own `--background` token), reading as off-white in the pixel field (~55% pure white card fills, ~36% this gray field). All primary cards sit on pure `#FFFFFF` with hairline-soft shadows. The violet accent `#6C5CE7` is tightly rationed: it appears only on primary buttons and on one icon glyph — never as a large fill. Two pastel tint tiles extend the palette without saturating it: `#EDE9FD` (lavender, for a promotional/limit-setting panel) and `#E8FDF3` (mint, for a totals panel) — both are large, low-saturation fields, not accents. Text ink is `#1A1A2E` for primary content and `#9090A8` for secondary/meta labels — a clean two-step gray-navy scale, not pure black. Semantic color carries all financial meaning: `#1D9E6F` green for positive/income figures and net totals, `#C0392B` red for expense/negative figures. Borders where present are pure `#000000` but used only as a design token reference (hairlines render far lighter in practice via low-opacity shadow, not stroke).

## Typography
Single-family system: Inter for everything, no accent face. Hierarchy is built by weight and size alone: page titles/card numerals sit at `22px/700`, field labels and category names at `15px/600`, dense body and meta text (subtext, timestamps) drops to `13px/400`. Body copy in prose-length contexts runs `16px/400`. Line-height holds at a consistent `1.5` across every step — a deliberately uniform vertical rhythm rather than tightening for display sizes. Numerals (currency figures) are treated as the loudest element on the page, set at the largest weight/size pairing available in each card.

## Layout
This is a fixed two-pane app shell, not a marketing grid: a narrow icon/label sidebar fixed to the left, fluid content area filling the remainder. Within content, three grid types recur: a 4-column stat grid (gap 16px, four equal 24%-width cards in one row); a 3-column promo/summary grid where two tiles occupy an uneven split (66% / 32% of the row, gap 24px) rather than equal thirds; and a 2-column grid (gap 16px, two 49%-width panels) for the accounts/activity split. List-style content (category rows, transaction rows) abandons the grid for a stacked full-width row pattern (100% width, three rows, 12px vertical padding, no side padding, divided by hairlines) — a card-grid-to-list-layout shift signals the data has gone from comparative (cards) to sequential (list). Card radius is a consistent 16px across every card family; the utility/ghost button drops to a sharp 4px, marking it visually as a secondary, structural control rather than a branded action.

## Components
- **Sidebar nav**: fixed left rail, full-height. Contains a small square logo mark plus wordmark at top, then a vertical list of nav items (icon + label) with one active item shown on a light rounded highlight; a search affordance and two utility rows (New Transaction, Transfer, Search) anchor the bottom. No stated CTA in-rail; the primary action button lives below the nav list as a full-width filled violet control.
- **New Transaction button (sidebar)**: `button-primary-lg` token — `#6C5CE7` fill, white text, 16px radius (rounded, not pill), 41px height, `10px 12px` padding; hover drops opacity to 0.9. This is a bounded rounded-rectangle, not a capsule.
- **Date-range stepper (header)**: a small pill-shaped control pairing left/right chevrons around a text label; sits top-right of the header, transparent/outline styling, sharp-to-slightly-rounded corners.
- **Stat card ×4** (Accounts, Income, Expenses, Net): arranged in one row, 4-column grid, 16px gap, each ~24% width. Surface: `#FFFFFF`, 16px radius, `padding 16px`, shadow `rgba(0,0,0,0.1) 0px 1px 3px 0px, rgba(0,0,0,0.1) 0px 1px 2px -1px`. Anatomy top-to-bottom: a small circular icon chip (tinted pastel background matching the stat's semantic color) beside a label, then one large bold numeral (currency value) below, colored by role — green for income/net, default ink for accounts/expenses.
- **Budget-limit promo card**: one of a 3-column, 2-item row (66/32 split), occupying the narrower ~32% slot. Surface: `#EDE9FD` lavender tint, 16px radius, 20px padding. Anatomy: small label heading, one line of muted supporting body text, and a small filled violet pill/rounded button (`button-primary-sm` token: 16px radius, 30px height, `6px 12px` padding) as its sole action.
- **All-Expenses summary card**: the wider ~66% partner tile in the same row. Surface: `#E8FDF3` mint tint, 16px radius, 20px padding. Anatomy: heading label, one line of secondary meta text (referencing a category + amount), then one very large bold numeral beneath — no button.
- **Category breakdown card**: full-width card, `#FFFFFF`, 16px radius, 20px padding, same soft shadow as stat cards. Anatomy: section heading, then repeated rows (icon chip + category label on the left, amount + percentage on the right, with a full-width horizontal progress-bar track beneath each row filled proportionally in violet) — rows stack vertically with generous internal spacing; a dashed "add new category" affordance closes the list.
- **Recent Transactions card**: full-width list card, transparent/flat background (not a boxed card surface — sits directly on page), row anatomy repeated ×3: small square icon/emoji chip, two-line text block (title + account/method subtext) on the left, signed amount on the right colored green (+) or red/dark (−). Rows separated by hairline dividers, `12px 0px` padding, 100%-width rows. A "view all" text link sits top-right of the section heading.
- **Accounts panel** (right column): `#FFFFFF` card, 16px radius, standard shadow. Anatomy: heading + small circular violet "add" icon-button top-right, then repeated rows (icon chip + account name, balance amount right-aligned) ×3, closed by a divider and a bold "Total" summary row.
- **Quick Add panel** (right column, below Accounts): `#FFFFFF` card, same shadow/radius. Anatomy top-to-bottom: a two-segment toggle/tab control (Expense/Income, active segment on white pill within a gray track), then a stacked form: account selector, amount field, category selector, optional note field (each an input with `5px`–ish soft radius, thin border), and a full-width primary submit button in violet, disabled/muted-opacity state when the form is empty.
- **Ghost/utility button**: transparent fill, black text, sharp 4px radius, 40px height, 8px padding — used for low-emphasis controls distinct from branded violet actions.

## Graphics & Effects
No gradients, textures, or decorative imagery exist in this system — it is a flat-color, photo-free dashboard. The only depth cue is a soft, consistent drop shadow applied to every card surface: `rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0.1) 0px 1px 3px 0px, rgba(0,0,0,0.1) 0px 1px 2px -1px` — a near-imperceptible one-to-three-pixel lift, deliberately restrained rather than dramatic. A second, tighter shadow recipe (`rgba(0,0,0,0.3) 0px 0px 0.5px 0px, rgba(0,0,0,0.15) 0px 1px 3px 0px`) is reserved for smaller floating elements like icon buttons. Progress bars inside the category card use flat violet fills over a light-gray track — no gradient. Icon chips are small flat-color circles/squares carrying pastel tints that echo each stat's semantic role.

## Motion
Interaction motion is fast and utilitarian: color, background, border, and opacity transitions run at `0.15s` on `cubic-bezier(0.4, 0, 0.2, 1)` — a snappy ease-out feel appropriate for a dense data tool, not a showcase site. An `all 0.15s` catch-all covers general state changes (hover, focus). Available keyframes (`pulse`, `enter`, `exit`, `accordion-down`, `accordion-up`, `caret-blink`) point to disclosure and menu components (accordions, carets, transient toasts) rather than scroll-triggered or decorative animation — motion here exists purely to acknowledge input, not to entertain.

## Guardrails
- Never introduce a gradient or photographic background — this system is flat-color only; depth comes exclusively from the one soft card shadow recipe.
- Keep the violet `#6C5CE7` rationed to primary buttons, active nav states, and small icon accents — do not fill large card surfaces or backgrounds with it.
- Do not merge the lavender and mint tinted tiles into one visual treatment — they are two distinct, uneven-width panels (32%/66%) in the same row, not a symmetric pair.
- Preserve the 16px card radius system-wide; only the ghost/utility button and inputs drop to the sharp 4–5px family — don't round buttons into pills except the small promo action button.
- Do not convert the transaction/category list rows into boxed cards — they are flat, divider-separated, full-width rows sitting directly on the page.
- Keep semantic red/green strictly tied to negative/positive amounts — never use them decoratively elsewhere.