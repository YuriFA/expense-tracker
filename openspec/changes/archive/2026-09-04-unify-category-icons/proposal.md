# Unify the category icon set across web and mobile

## Why

Category creation offers only 20 icons, several of which overlap in meaning
(☕ 🍔 🍕 🥗 all read as "food") while common spending domains have no icon at
all (groceries vs dining vs delivery, utilities, clothing, pharmacy,
subscriptions). The web and mobile apps also carry two different icon
vocabularies for the same stored string field: web stores emoji, mobile
stores Ionicons glyph names. Because categories sync across devices, an
icon created on one platform renders blank (mobile) or as literal text
(web) on the other. Separately, the registration seed set is dead: both
clients register with seeding disabled and new users start from an empty
category list, while the seed data itself carries duplicate colors that
would break chart distinctness if it were ever used.

## What Changes

- One shared emoji icon vocabulary for category creation on both platforms
  (30 unique icons): 24 expense-oriented and 7 income-oriented, with 🎁
  shared between both types.
- Each icon keeps its own pre-paired background color (1 icon = 1 color);
  the color is auto-assigned and never user-chosen. Mobile drops its
  separate 7-color picker and adopts the paired model, matching web.
- The picker list is filtered by the category type being created:
  expense creation offers the expense set, income creation the income set.
- Icons that no longer exist in the set are removed from the pickers:
  🍕 🥗 🎓 (and 🚌 returns as public transport, 🏝️ joins as vacation,
  ✈️ stays as flight tickets, 📺 joins as subscriptions).
- Mobile renders category icons as emoji text (Ionicons remains for app UI
  chrome only) and maps the legacy Ionicons glyph names still stored on
  existing categories to emoji for display, without rewriting stored data.
- Mobile's icon picker becomes a wrapping grid instead of a horizontal
  scrolling strip.
- Registration seeding is removed entirely: the backend `DefaultCategories`
  template list, the opt-in `SeedCategories` registration parameter, and
  the `seedCategories` OpenAPI request field. Every new user starts with
  an empty category list (existing behavior for both clients today).
- The canonical copy of the icon set lives in the mobile app; a drift
  guard test fails when the web copy diverges (same model as the design
  tokens palette sync).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `categories`: the registration seeding requirement is removed - the
  category list always starts empty.
- `web-screens`: the category create/edit dialogs offer the type-filtered
  unified icon set; the icon picker is the single source of appearance
  (paired color).
- `mobile-local-data`: category creation uses the unified emoji icon list
  with the pre-paired auto-assigned color; the color is no longer chosen
  from a separate list.

## Impact

- `docs/api/openapi.yaml` - remove `seedCategories` from the register
  request; regenerate backend (`make gen`) and TS types (`pnpm gen:api`).
- `backend/` - delete `DefaultCategories`, the `SeedCategories` register
  parameter and its wiring; rework tests that relied on seeding
  (server_test, sync_test, adjustment_test) to create categories
  explicitly.
- `apps/web/` - new `CATEGORY_ICONS` set (type-tagged), type-filtered
  picker in NewCategoryDialog/CategoryEditDialog, per-type defaults.
- `apps/mobile/` - emoji icon config with paired colors, emoji rendering
  with a legacy-glyph fallback map, wrapped-grid picker, color picker
  removal from the category form.
- Sync guard test comparing the web and mobile icon sets (mobile
  canonical).
- No stored-data migration: existing categories keep their icon/color
  strings and render as-is.

## Non-goals

- Migrating or rewriting icon/color values already stored on existing
  categories (including categories created on mobile with Ionicons names).
- Grouping the picker by domain sections (list stays flat; revisit if the
  set grows).
- Changing the API contract for category icon/color (they remain
  free-form strings, unvalidated by the backend).
- Backend-driven icon validation or a shared Go/TS icon package.
