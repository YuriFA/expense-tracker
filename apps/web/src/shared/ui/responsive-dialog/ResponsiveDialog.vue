<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, useAttrs, useSlots } from 'vue'
import { X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useDesktopPresentation } from '@/shared/lib/presentation'
import { cn } from '@/shared/lib/utils'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'
import {
  DRAWER_FOOTER_CLASS,
  DRAWER_HEADER_PADDING,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/shared/ui/drawer'

defineOptions({
  inheritAttrs: false,
})

interface OpenChangeDetails {
  reason?: string
}

// Header layout shared by the FAB speed-dial dialogs and the inline
// NewCategoryDialog: actions row with a hairline, stretched to the overlay
// edges on desktop.
const BORDERED_ROW_HEADER_CLASS = `flex-row items-center justify-between border-b ${DRAWER_HEADER_PADDING} sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6`

const props = withDefaults(
  defineProps<{
    open?: boolean
    class?: HTMLAttributes['class']
    headerClass?: HTMLAttributes['class']
    footerClass?: HTMLAttributes['class']
    closeButtonClass?: HTMLAttributes['class']
    headerVariant?: 'default' | 'bordered-row'
    /** Full-bleed hairline above the footer band (settings design language:
     * the footer separates from the body like a card header strip). The
     * drawer footer always has the border; this adds it on desktop. */
    borderedFooter?: boolean
    showCloseButton?: boolean
    closeButtonInHeader?: boolean
  }>(),
  {
    open: false,
    class: undefined,
    headerClass: undefined,
    footerClass: undefined,
    closeButtonClass: undefined,
    headerVariant: 'default',
    borderedFooter: false,
    showCloseButton: true,
    closeButtonInHeader: false,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean, details?: OpenChangeDetails]
}>()

const slots = useSlots()
const attrs = useAttrs()
const { t } = useI18n()
const isDesktop = useDesktopPresentation()

const hasTitle = computed(() => Boolean(slots.title))
const hasDescription = computed(() => Boolean(slots.description))
const hasHeaderActions = computed(() => Boolean(slots['header-actions']))
const hasFooter = computed(() => Boolean(slots.footer))
const shouldRenderHeaderCloseButton = computed(
  () => props.showCloseButton && (!isDesktop.value || props.closeButtonInHeader),
)
const shouldRenderDesktopCornerCloseButton = computed(
  () => props.showCloseButton && isDesktop.value && !props.closeButtonInHeader,
)
const hasHeader = computed(
  () => hasTitle.value || hasDescription.value || hasHeaderActions.value || shouldRenderHeaderCloseButton.value,
)
const hasHeaderControls = computed(
  () => hasHeaderActions.value || shouldRenderHeaderCloseButton.value,
)

const handleOpenChange = (value: boolean, details?: OpenChangeDetails) => {
  emit('update:open', value, details)
}

const baseHeaderClass = computed(() =>
  cn(
    isDesktop.value ? 'text-center sm:text-left' : `${DRAWER_HEADER_PADDING} text-left`,
    props.headerVariant === 'bordered-row' && BORDERED_ROW_HEADER_CLASS,
    props.headerClass,
  ),
)
const baseBodyClass = computed(() => cn('min-h-0', isDesktop.value ? null : 'px-6 pb-6'))
const baseFooterClass = computed(() =>
  cn(
    'flex flex-col-reverse gap-2',
    isDesktop.value ? 'sm:flex-row sm:justify-end' : DRAWER_FOOTER_CLASS,
    // Desktop breakout mirrors BORDERED_ROW_HEADER_CLASS: the hairline
    // spans the overlay edge-to-edge instead of stopping at the padding.
    props.borderedFooter &&
      isDesktop.value &&
      '-mx-6 -mb-6 border-t border-border px-6 pb-5 pt-4',
    props.footerClass,
  ),
)
const closeButtonClass = computed(() =>
  cn(
    'rounded-xs text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:outline-hidden',
    props.closeButtonClass,
  ),
)
</script>

<template>
  <Dialog
    v-if="isDesktop"
    :open="open"
    @update:open="(value: boolean) => handleOpenChange(value)"
  >
    <DialogContent
      v-bind="attrs"
      :aria-describedby="hasDescription ? undefined : ''"
      :class="props.class"
      :show-close-button="shouldRenderDesktopCornerCloseButton"
    >
      <div class="flex min-h-0 flex-col gap-4">
        <header v-if="hasHeader" :class="baseHeaderClass">
          <div :class="hasHeaderControls ? 'flex items-start justify-between gap-4' : ''">
            <div class="min-w-0 flex-1">
              <DialogTitle v-if="$slots.title">
                <slot name="title" />
              </DialogTitle>
              <DialogDescription v-if="$slots.description" class="mt-2">
                <slot name="description" />
              </DialogDescription>
            </div>

            <div v-if="hasHeaderControls" class="flex shrink-0 items-center gap-2">
              <slot name="header-actions" />
              <DialogClose v-if="shouldRenderHeaderCloseButton" :class="closeButtonClass">
                <X class="size-5" />
                <span class="sr-only">{{ t('common.close') }}</span>
              </DialogClose>
            </div>
          </div>
        </header>

        <div :class="baseBodyClass">
          <slot />
        </div>

        <div v-if="hasFooter" :class="baseFooterClass">
          <slot name="footer" />
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <Drawer v-else :open="open" @update:open="handleOpenChange">
    <DrawerContent
      v-bind="attrs"
      :aria-describedby="hasDescription ? undefined : ''"
      :class="props.class"
    >
      <div class="flex min-h-0 flex-col gap-4">
        <header v-if="hasHeader" :class="baseHeaderClass">
          <div :class="hasHeaderControls ? 'flex items-start justify-between gap-4' : ''">
            <div class="min-w-0 flex-1">
              <DrawerTitle v-if="$slots.title">
                <slot name="title" />
              </DrawerTitle>
              <DrawerDescription v-if="$slots.description" class="mt-2">
                <slot name="description" />
              </DrawerDescription>
            </div>

            <div v-if="hasHeaderControls" class="flex shrink-0 items-center gap-2">
              <slot name="header-actions" />
              <DrawerClose v-if="shouldRenderHeaderCloseButton" :class="closeButtonClass">
                <X class="size-5" />
                <span class="sr-only">{{ t('common.close') }}</span>
              </DrawerClose>
            </div>
          </div>
        </header>

        <div :class="baseBodyClass">
          <slot />
        </div>

        <div v-if="hasFooter" :class="baseFooterClass">
          <slot name="footer" />
        </div>
      </div>
    </DrawerContent>
  </Drawer>
</template>
