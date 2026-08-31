<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEventListener } from '@vueuse/core'
import { ArrowLeftRight, Minus, Plus, Tag } from '@lucide/vue'
import { NewCategoryDialog, useAddTransactionDialog } from '@/features/transaction/add'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'

// Desktop accelerator shell (web-unified-transaction-entry): the ⌘K / Ctrl+K
// command palette and the «N» hotkey. Accelerators only - the sidebar CTA
// stays the primary path. Mounted on desktop viewports only, which is also
// what scopes the hotkeys per the spec.
const { t } = useI18n()
const { openAddTransactionDialog } = useAddTransactionDialog()

const open = ref(false)
const query = ref('')
const activeIndex = ref(0)
const categoryOpen = ref(false)

// Icon colors follow the FAB speed-dial semantics (expense terracotta,
// income green, transfer teal).
interface PaletteAction {
  id: 'expense' | 'income' | 'transfer' | 'category'
  label: string
  icon: typeof Minus
  iconClass: string
  testid: string
  run: () => void
}

const actions = computed<PaletteAction[]>(() => [
  {
    id: 'expense',
    label: t('palette.addExpense'),
    icon: Minus,
    iconClass: 'text-warning',
    testid: 'palette-action-expense',
    run: () => openAddTransactionDialog('expense'),
  },
  {
    id: 'income',
    label: t('palette.addIncome'),
    icon: Plus,
    iconClass: 'text-success',
    testid: 'palette-action-income',
    run: () => openAddTransactionDialog('income'),
  },
  {
    id: 'transfer',
    label: t('palette.addTransfer'),
    icon: ArrowLeftRight,
    iconClass: 'text-primary',
    testid: 'palette-action-transfer',
    run: () => openAddTransactionDialog('transfer'),
  },
  {
    id: 'category',
    label: t('palette.newCategory'),
    icon: Tag,
    iconClass: 'text-muted-foreground',
    testid: 'palette-action-category',
    run: () => {
      categoryOpen.value = true
    },
  },
])

const filteredActions = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return actions.value
  return actions.value.filter((action) => action.label.toLowerCase().includes(needle))
})

function onOpenChange(value: boolean) {
  open.value = value
  if (value) {
    query.value = ''
    activeIndex.value = 0
  }
}

function activate(action: PaletteAction) {
  open.value = false
  action.run()
}

function onPaletteKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, filteredActions.value.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const action = filteredActions.value[activeIndex.value]
    if (action) activate(action)
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

// Physical key codes keep the bindings layout-independent (KeyN = «Н» on
// ЙЦУКЕН). The hotkey stays idle while typing or while any dialog is open.
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.code === 'KeyK') {
    event.preventDefault()
    onOpenChange(!open.value)
    return
  }
  if (
    event.code === 'KeyN' &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey
  ) {
    if (isEditableTarget(event.target) || document.querySelector('[role="dialog"]')) return
    event.preventDefault()
    openAddTransactionDialog()
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent
      class="gap-0 overflow-hidden p-0 sm:max-w-[480px]"
      :show-close-button="false"
      data-testid="command-palette"
      @keydown="onPaletteKeydown"
    >
      <DialogHeader class="sr-only">
        <DialogTitle>{{ t('palette.search') }}</DialogTitle>
      </DialogHeader>
      <div class="border-b px-4 py-2">
        <Input
          v-model="query"
          data-testid="palette-search"
          :placeholder="t('palette.search')"
          class="h-9 border-0 px-0 text-sm focus-visible:ring-0 md:text-sm"
        />
      </div>
      <ul role="listbox" :aria-label="t('palette.search')" class="max-h-72 overflow-y-auto p-2">
        <li v-for="(action, index) in filteredActions" :key="action.id">
          <button
            type="button"
            role="option"
            :aria-selected="index === activeIndex"
            :data-testid="action.testid"
            class="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm"
            :class="index === activeIndex ? 'bg-primary/10 text-primary' : 'text-foreground'"
            @mousemove="activeIndex = index"
            @click="activate(action)"
          >
            <component
              :is="action.icon"
              class="size-4"
              :class="action.iconClass"
              aria-hidden="true"
            />
            {{ action.label }}
          </button>
        </li>
        <li
          v-if="filteredActions.length === 0"
          class="px-3 py-6 text-center text-sm text-muted-foreground"
        >
          {{ t('palette.noResults') }}
        </li>
      </ul>
      <div class="border-t px-4 py-2 text-xs text-muted-foreground">{{ t('palette.hint') }}</div>
    </DialogContent>

    <!-- Standalone category creation from the palette; expense is the neutral
         default type (the forms create their own type inline). -->
    <NewCategoryDialog v-model:open="categoryOpen" type="expense" />
  </Dialog>
</template>
