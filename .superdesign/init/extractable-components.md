# extractable-components.md — components extractable as Superdesign DraftComponents

Sources carry full code in `components.md` (shared/ui) and `layouts.md`. Vue SFC → Petite-Vue HTML per COMPONENTS.md before `create-component`.

## Layout components (appear on every page)

## AppShell
- Source: `apps/web/src/app/layout/AppShell.vue`
- Category: layout
- Description: composition root — BootGate + (nav) + centered `<main>` + global dialog hosts
- Extractable props: `showNav` (boolean, default: true), `authed` (boolean, default: false)
- Hardcoded: global hosts (dialog-only, render nothing visually), main container classes

## AppNav / future Sidebar
- Source: `apps/web/src/app/layout/AppNav.vue`
- Category: layout
- Description: current top nav (7 RouterLinks + auth area). THE primary extraction target — the redesign replaces it with a sidebar.
- Extractable props: `activeItem` (string, default: "home"), `authed` (boolean, default: false), `userEmail` (string, default: ""), `pendingSync` (number, default: 0), `syncState` (string: synced|running|pending|paused|conflicts, default: "synced")
- Hardcoded: nav items (dashboard/transactions/analytics/debts/plans/accounts/settings — i18n labels), guest badge, sign in/out buttons, SyncStatusBadge internals

## Basic components (used across pages)

## TransactionListItem
- Source: `apps/web/src/entities/transaction/ui/TransactionListItem.vue`
- Category: basic
- Description: THE transaction row — 32px rounded-full emoji category avatar on bg-muted, description, dotted meta (category · account · date · author), right colored amount (+ green income / − red expense / neutral transfer)
- Extractable props: `description` (string), `categoryIcon` (string emoji), `categoryName` (string), `accountName` (string), `dateLabel` (string), `author` (string|null), `kind` (string: income|expense|transfer), `amount` (string)
- Hardcoded: row layout, avatar classes, amount color mapping, RepeatIcon for transfers, actions slot

## NetWorthCard
- Source: `apps/web/src/pages/dashboard/ui/NetWorthCard.vue`
- Category: basic
- Description: summary card — muted title, big `text-2xl font-bold` total(s), per-account balance rows (name link + right money)
- Extractable props: `totalLabel` (string), `totalAmount` (string), `accounts` (array of {name, amount})
- Hardcoded: row dividers `border-b-2 border-b-muted`, skeleton/error states

## QuickActionsCard
- Source: `apps/web/src/pages/dashboard/ui/QuickActionsCard.vue`
- Category: basic
- Description: 3 full-width outline buttons with 32px colored icon tiles (Minus/destructive-15, ArrowUp/primary-15, ArrowDown/success-15)
- Extractable props: `expenseLabel`, `transferLabel`, `incomeLabel` (strings)
- Hardcoded: tile colors, lucide icons, dialog wiring

## RecentTransactions (list)
- Source: `apps/web/src/pages/dashboard/ui/RecentTransactions.vue`
- Category: basic
- Description: last-5 list of TransactionListItem wrapped in a Card, per-row kebab DropdownMenu (edit/delete), skeleton/empty/error states
- Extractable props: `title` (string), `items` (array of TransactionListItem props)
- Hardcoded: kebab menu (MoreVertical/Pencil/Trash2), state components

## DonutChart + ChartLegend
- Source: `apps/web/src/shared/ui/donut-chart/DonutChart.vue`, `ChartLegend.vue`
- Category: basic
- Description: hand-rolled SVG donut (stroke-dasharray ring, selectable segments with dim/highlight, center slot, default 120px) + dot legend list
- Extractable props: `size` (number, default: 120), `strokeWidth` (number, default: 14), `selectedId` (string|null), `entries` (array of {id,label,color,value})
- Hardcoded: gap math, cursor/dim transitions, testids

## SyncStatusBadge
- Source: `apps/web/src/widgets/sync-status/ui/SyncStatusBadge.vue`
- Category: basic
- Description: pill outline button (h-7 rounded-full text-xs) with Spinner or CloudUpload icon; states conflicts/paused/running/pending N/synced; destructive coloring on conflicts/paused
- Extractable props: `state` (string: synced|running|pending|paused|conflicts), `pendingCount` (number)
- Hardcoded: CloudUploadIcon, size classes

## Skip (too simple for extraction; inline in drafts)
Button, Card, Badge, Chip, Input, Label, Field family, Separator, Skeleton, Spinner, EmptyState, ErrorState, Select, Dialog, Sheet, Tabs, Calendar — all standard shadcn-style markup in `components.md`.
