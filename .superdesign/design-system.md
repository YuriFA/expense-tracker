# Design System — Expense Tracker (web redesign)

Style source: three reference screenshots provided by the user (a purple mobile finance app, a «Кошелёк» web dashboard with sidebar, a «Finance» web dashboard) — **inspired-by**, not a clone. The product keeps its own brand voice; the references supply the visual DNA below. Font is FIXED: Outfit everywhere (single sanctioned family — web and mobile share it).

## Product context

A personal & household finance tracker. Two clients (Vue 3 web PWA, React Native mobile) over one Go API; the web app is **anonymous-first and local-first**: it fully works without an account (local SQLite via OPFS), sign-in only adds background server sync. Data domain: accounts (balance derived), categories (emoji icon + color hex as DATA), transactions (expense/income/transfer), planned payments (recurring, confirm → transaction), debts (two directions, derived balances), analytics (donut + category breakdown by week/month/year), household (shared budget, email/join-code invites), sync engine (pending ops, conflicts the user resolves).

Key pages (web): Dashboard `/` (redesign target), Transactions, Analytics + detail, Debts, Plans, Income (quick entry), Accounts, Settings, auth stack (login/register/verify-email/reset-password/invite).

JTBD: record a spend in seconds; see where money goes this month; keep balances/debts/upcoming payments under control; share a budget with family; stay functional offline.

## Hard requirements (non-visual constraints that shape design)

- Every text goes through i18n (ru default, en) — drafts must use the Russian strings of the current UI (nav: Главная, Операции, Аналитика, Долги, Планы, Счета, Настройки; actions: Добавить операцию, Расход/Доход/Перевод).
- Money is RUB only, formatted like `26 813 ₽` (narrow space groups); income `+`, expense `−` with green/red.
- Category identity = emoji glyph on a pastel tinted circle (the category's own color at ~15% opacity). Icon and color are a PRE-PAIRED closed set: 20 emojis, each with its own strongly distinct hue (20-color palette, one color per icon). Creation asks for the emoji only and assigns the paired color, shifting to the nearest free hue when it is already taken — colors stay stored (API field `color`), never picked by the user. Accounts = letter avatar on hashed pastel.
- Visible states everywhere: skeletons while loading, empty states, error + retry, sync badge (synced / pending N / paused / conflicts), guest-mode badge for anonymous users.
- Accessible focus rings, one dialog instance per flow, icons from lucide only.

## Branding & styling

### Layout structure (all directions)
- **Left sidebar** (replaces the current top nav): brand mark top, vertical nav with lucide icons + labels, prominent primary CTA «Добавить операцию» (pill), bottom block: sync status badge + user email + sign out (authed) or guest badge + sign in.
- Content column max-width ~1200px, comfortable 24px gutters. Dashboard: main column + right rail (Счета, Цели/сводка) on ≥1280px, single column below.
- Cards: white surface, **radius 16–20px**, hairline border, soft low shadow. Page background: very light neutral gray (not pure white) so white cards read as surfaces.
- Tinted info cards (like refs «Лимит»/«Все расходы»): pastel fills (lavender/mint) with normal contrast text, radius 20.
- Big display money: `font-bold` 32–40px hero totals; 14px body; tabular numerals for amounts.
- Amount coloring: income green `+`, expense red `−`, transfer neutral. Stat-card icon chips: 40–44px colored circles (pastel tint + saturated glyph).
- Category rows in white cards: colored circle avatar, name, dotted meta, right-aligned amount, hairline dividers; «+ Новая категория» dashed ghost row.

### Typography
Outfit 400/500/600/700 only. Scale: 12 / 14 (body) / 16 / 20 (card titles) / 24 / 32–40 (hero money). Headings semibold-bold, ink `#1b1927`-family. No serifs, no decorative fonts — ANY direction.

### Sanctioned palettes (a draft MUST use exactly one, verbatim)

**Direction A — «Фиалка» (reference-faithful, default; extracted from the user's figma reference «Ledger Lavender»):** accent violet `#6C5CE7` — RATIONED to primary buttons, active nav state and small icon accents, never large fills (hover: opacity .9); ink `#1A1A2E`, secondary text `#9090A8`, page bg `#f4f5f7` (gray-lilac field), card `#ffffff`, border `#ecebf1`, tint tiles lavender `#ede9fd` + mint `#e8fdf3` (two DISTINCT panels, uneven split ~66/32, never symmetric twins); success `#1d9e6f` (green = income/net only), danger `#c0392b` (red = expense/negative only); soft card shadow `0 1px 3px rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1)`; card radius 16px everywhere, inputs 5–8px, list rows are FLAT divider-separated full-width rows (12px vertical padding), not boxed.

**Direction B — «Индиго refined» (current brand, tightened):** keep indigo `#6366f1` primary, warm paper muted `#f0ede6`, lavender accent `#e4ddfe`; larger radii (16–20), stronger tint usage, otherwise current palette verbatim.

**Direction C — «Полночь» (dark-first wildcard):** bg `#0f1015`, card `#171922`, border `#262a38`, ink `#f2f3f7`, muted `#9aa0b4`, accent emerald `#2dd4a7` (tint rgba glow), secondary accent violet `#8b7cff`, success same emerald, danger `#f87171`. Sidebar same surface as content, active item = tinted pill. (Dark is currently NOT wired at runtime — this direction is a design exploration only unless the user picks it.)

**Direction D — «Бумага» (warm minimal wildcard):** bg `#f6f2ec` (warm paper), card `#fffdf9`, ink `#221d16`, border `#e8e0d4`, muted `#8a8072`, accent deep teal `#0f766e` (tint `#d9efec`), secondary terracotta `#c2410c`, success `#15803d`, danger `#b91c1c`. Flat (border, almost no shadow), radius 14, underline-style nav instead of pills.

**Direction E — «Аврора» (wildcard from the user's lovable reference):** achromatic Swiss utility surface — bg `#f0f0f0`, card `#fafafa`, ink `#030303`, secondary `#636363`, hairline `#d2d2d2` — with ALL saturation rationed to one aurora-gradient motif (mesh of `#7890f0` blue / `#d8d8f0` lilac / `#d8f0f0` cyan over a coral `#ff4848` base) used only as: brand logomark, ONE canvas accent (e.g. dashboard header band or CTA hover glow), never as card fills. Highest-emphasis control = ink-solid `rgba(0,0,0,.88)` pill with `#fafafa` text; secondary controls transparent with hairline border, full-pill radius. Radius: cards 12–16, buttons pills.

### Cross-direction guardrails
- Flat-color systems (A, B, D): no gradients, no photography; depth = the one soft shadow recipe. E is the only direction allowed a gradient motif.
- Semantic green/red strictly tied to positive/negative amounts — never decorative.
- Category/transaction rows stay flat divider-separated rows inside white cards; do not box individual rows.
- Tinted tiles are content-bearing info cards (budget hint, totals), max 1–2 per screen, never symmetric twins.
- Violet/accent is rationed to actions and active states; large surfaces stay neutral.

### Motion
Fast and utilitarian: color/opacity transitions `0.15s cubic-bezier(0.4, 0, 0.2, 1)`, transform-based movement `0.3s` same curve; dialogs fade+zoom (tw-animate), drawers slide, hover lift on cards ≤2px. Route-change top progress bar stays. No parallax, no decorative loops.

### Spacing & shape
4px base grid; card padding 20–24px; list row height ~56px; icon tiles 40–44px; sidebar width 248px; controls (buttons, inputs, selects) share the 12px control radius; cards and the big sidebar CTA use the 14px card radius; full-round pills are reserved for badges, chips and status pills.

## Component rules

- Buttons: 12px control radius, NOT pills (pills are only badges/chips/status). Canonical variants: primary = accent teal fill `#0f766e`, white text, hover 90% opacity; secondary = warm neutral fill `#f0e9dd` (one step darker than the paper bg), ink text/icons, NO border, hover `#e9e1d2` - the default for toolbar/filter triggers (Все время, Фильтр), card-header actions and dialog «Отмена»; destructive = solid red `#b91c1c` fill, white text; danger-ghost = red text with red tint on hover, for row-level deletes; ghost = text-only, hover wash, for nav/row icon actions; link = teal underlined. DEPRECATED: transparent/outline secondary (fill = page background, hairline border) - never use it for toolbar or filter buttons. Sizes: h-8 sm, h-9 default, h-10 CTA; icon buttons 32/36/40. States: focus ring 3px teal at 50%, disabled opacity 50, loading = spinner with preserved width. Active selection/filter on a control = teal tint `#d9efec` with `#0f766e` text (applied date range, «Фильтр • 2» counter).
- Settings row-card: flat card whose header row is «title (14px semibold) + description (12px muted)» on the left and the control (bordered select) on the right; heavier sections (profile, household, sessions) use the same header row above hairline-divided content.
- Delete confirmation: centered dialog (max-w ~320px), 48px terracotta-tint circle with a trash glyph, title «Удалить …?», one-line muted description, footer «Отмена» (outline) + «Удалить» (solid red), both flex-1 with the 12px radius.
- Cards compose: Card (white surface) / Card tinted (info) / list-card (rows with dividers).
- Checkbox: custom-drawn native input — 16×16, radius 4, 1.5px border in the surface border color, transparent fill (no native accent-color tint). Checked = border AND an 8×8 rounded-2px inner dot take the row's accent color via currentColor: teal (primary) for the «Все расходы/доходы» master, the category's own color for its row. State coupling: unchecked (excluded) rows dim to 50% opacity; the selected row gets a warm muted wash instead of a tint. A second, standalone-filter variant exists in the specimen: 20×20, rounded-md, 2px border, checked = teal fill + white check glyph (for future filter surfaces).
- Segmented control (Расходы/Доходы on analytics, Add tabs): pill group on muted track, active = white raised.
- Date-range navigation (analytics): pill with ‹ › chevrons and centered label («1 авг. — 31 авг.»).
- Donut chart keeps its selectable-segment behavior; colors from category data or palette tints.

## Specific project requirements

- Keep ALL current dashboard data surfaces reachable after redesign: totals per account, quick add (expense/transfer dialogs, income page), recent transactions (edit/delete), plus reference-inspired additions (category breakdown card, accounts right-rail, month stat cards) — additions must map to existing domain data (accounts, categories, transactions; no invented backend features).
- **No invented features.** The product has NO budgets/limits — no limit tiles, no limit CTAs, no progress bars tied to limits anywhere. Category breakdown shows amount + percentage only (as the analytics page already does). Every block must map to an implemented surface: accounts, transactions, category breakdown with percentages, debts, planned payments, sync status.
- Anonymous-first: guest badge + sign-in entry must be visible without an account.
- Responsive: ≥768px shows the desktop sidebar; <768px the mobile shell (slim sticky top bar + floating bottom tab bar with a central FAB speed-dial) replaces the old hamburger drawer (web-mobile-bottom-nav). Right rail stacks below main.
- Mobile shell speed-dial tiles follow the icon-tile pattern: pastel semantic tint (~10%) + saturated glyph (перевод teal, расход terracotta, доход green), labels under circles, white 70% scrim; the only solid accent surface is the teal FAB.
- Never render raw hex outside tokens; drafts are style guidance for token updates in `packages/tokens` (web+mobile copies share identical sRGB values).
