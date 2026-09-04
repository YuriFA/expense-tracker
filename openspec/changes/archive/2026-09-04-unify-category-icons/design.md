# Design: unify-category-icons

## Context

Three hand-maintained copies of category appearance exist today and they
have already diverged:

- Web `apps/web/src/entities/category/config/category-appearance.ts`:
  20 emoji, each paired with one distinct background color; color is
  derived at creation (`pickCategoryColor` walks outward from the icon's
  pair to the nearest free color) and stored on the category record.
  Charts rely on colors being mutually distinct.
- Mobile `apps/mobile/src/entities/category/config/category-appearance.ts`:
  20 Ionicons glyph names plus a separate 7-color brand palette with a
  user-facing color picker in the category form.
- Backend `backend/internal/domain/seeds.go`: 24 starter categories with
  emoji icons and ad-hoc colors (several duplicated), wired only through
  the opt-in `SeedCategories` registration parameter that no client
  sends.

Because categories sync across devices, the web/mobile vocabulary split
produces blank icons (emoji on mobile's Ionicons renderer) and literal
text (glyph names like `cart` rendered as text on web) for cross-device
categories.

The settled product decisions (see proposal):

1. One shared emoji vocabulary, both platforms; 30 unique icons
   (24 expense-oriented, 7 income-oriented, 🎁 shared); the picker is
   filtered by the category type.
2. Paired model everywhere: 1 icon = 1 color, auto-assigned, never
   user-chosen. Mobile drops its separate color picker and palette.
3. No data migration. Stored strings render as-is; mobile gains a small
   display-only fallback map for legacy Ionicons glyph names.
4. Registration seeding is removed outright (dead in the live product).
5. Mobile holds the canonical icon set; a drift guard test fails when
   the web copy diverges (precedent: `design-tokens-sync`).

## The icon set

One flat list of `{ icon, color }` pairs ordered by domain (food,
transport, travel, home, health, entertainment, then singles, then
income). Each entry carries the types it is offered for
(`expense`, `income`, or both - only 🎁 is both).

Expense: 🛒 🍽️ ☕ 🛵 🍔 · 🚗 🚌 ⛽ · ✈️ 🏝️ · 🏠 🧾 🛠️ · 💊 💪 · 🎬 🎮 ·
📚 👕 📱 📺 🐾 🎁 ❤️
Income: 💼 🖥️ 📈 💰 🎉 💵 🎁

Defaults: 🛒 for expense, 💼 for income.

Constraints applied to the choice of glyphs:

- Single-codepoint emoji only (no ZWJ sequences like 🧑‍💻) for
  predictable rendering across web fonts and older Android.
- 30 mutually distinct colors. The palette grows past the current 20
  with additional chart-distinct hues; hues stay in the app's muted
  saturation band (the current palette's tailwind-scale values) so tinted
  circles and chart fills keep the same look.

Removed from the picker: 🍕 🥗 🎓 (semantically covered by 🍽️/🛵 and 📚).
🚌 returns (public transport), ✈️ is re-scoped to flight tickets,
🏝️ (vacation) and 📺 (subscriptions) are new; 📱 stays as
connection/internet.

## Where the set lives

- Mobile `entities/category/config/category-appearance.ts` is canonical:
  `CATEGORY_ICONS` (paired `{ icon, color, types }`), type helpers,
  defaults, and the legacy glyph → emoji fallback map.
- Web `entities/category/config/category-appearance.ts` mirrors the list
  with the same shape and re-exports the same helpers; a new web test
  (modeled on mobile's `design-tokens-sync`) reads the mobile config and
  fails on any drift in icons, colors, or types.
- Nothing shared moves into `packages/*`: the config is UI-layer data and
  the two apps render it differently (inline styles vs Text). A package
  would add a build/dep edge for no behavioral gain; the guard test is
  the cheaper enforcement, matching the tokens precedent.
- Backend seeds.go is deleted; no Go copy of the set remains.

## Rendering and legacy values

- Web renders the icon string as text (unchanged).
- Mobile category surfaces (chips, quick bar, picker sheet, forms)
  render the icon string as emoji text instead of `<Icon name=…>`; the
  `Icon`/Ionicons component stays for app UI chrome (nav, buttons).
- `legacyCategoryIcon(icon)`: display-only map for the 20 old Ionicons
  glyph names (`cart` → 🛒, `cafe` → ☕, …) applied wherever a stored
  category icon is rendered on mobile. Unknown strings pass through
  unchanged (emoji from the web renders directly; anything else renders
  as text, same degradation web has today). No repository writes.
- `pickCategoryColor` keeps its nearest-free walk so two categories of
  the same household still never share a color while the palette allows;
  with 30 pairs this holds for any realistic household.

## Seeding removal

- OpenAPI: drop `seedCategories` from the register request body, then
  `make gen` (backend) and `pnpm gen:api` (TS types).
- Backend: delete `DefaultCategories`, the `SeedCategories` field and its
  wiring in `users.go`/`auth.go`; rework `server_test.go`,
  `sync_test.go`, `adjustment_test.go` to create their categories through
  the normal create path.
- Existing users keep their seeded categories as ordinary records.

## Risks

- Color distinctness at 30 hues is the tightest constraint; mitigated by
  the nearest-free walk and by keeping the cap (no growth past ~32
  without re-evaluating the palette).
- Emoji rendering varies by platform font; single-codepoint glyphs and
  the existing emoji usage (web already renders emoji today) keep the
  variance acceptable.
