<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, useAttrs, useSlots } from 'vue'
import { X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useDesktopPresentation } from '@/shared/lib/presentation'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '@/shared/ui/drawer'

defineOptions({
  inheritAttrs: false,
})

interface OpenChangeDetails {
  reason?: string
}

const props = withDefaults(
  defineProps<{
    open?: boolean
    class?: HTMLAttributes['class']
    headerClass?: HTMLAttributes['class']
    bodyClass?: HTMLAttributes['class']
    footerClass?: HTMLAttributes['class']
    titleClass?: HTMLAttributes['class']
    descriptionClass?: HTMLAttributes['class']
    closeButtonClass?: HTMLAttributes['class']
    showCloseButton?: boolean
    closeButtonInHeader?: boolean
    showFooterCloseButton?: boolean
  }>(),
  {
    open: false,
    class: undefined,
    headerClass: undefined,
    bodyClass: undefined,
    footerClass: undefined,
    titleClass: undefined,
    descriptionClass: undefined,
    closeButtonClass: undefined,
    showCloseButton: true,
    closeButtonInHeader: false,
    showFooterCloseButton: false,
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
const hasFooterBar = computed(() => hasFooter.value || props.showFooterCloseButton)

const handleOpenChange = (value: boolean, details?: OpenChangeDetails) => {
  emit('update:open', value, details)
}

const baseHeaderClass = computed(() =>
  cn(isDesktop.value ? 'text-center sm:text-left' : 'px-6 pb-4 pt-2 text-left', props.headerClass),
)
const baseBodyClass = computed(() =>
  cn('min-h-0', isDesktop.value ? null : 'px-6 pb-6', props.bodyClass),
)
const baseFooterClass = computed(() =>
  cn(
    isDesktop.value
      ? 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'
      : 'flex flex-col-reverse gap-2 border-t px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4',
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
              <DialogTitle v-if="$slots.title" :class="props.titleClass">
                <slot name="title" />
              </DialogTitle>
              <DialogDescription
                v-if="$slots.description"
                :class="cn('mt-2', props.descriptionClass)"
              >
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

        <div v-if="hasFooterBar" :class="baseFooterClass">
          <slot name="footer" />
          <DialogClose v-if="showFooterCloseButton" as-child>
            <Button variant="secondary">{{ t('common.close') }}</Button>
          </DialogClose>
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
              <DrawerTitle v-if="$slots.title" :class="props.titleClass">
                <slot name="title" />
              </DrawerTitle>
              <DrawerDescription
                v-if="$slots.description"
                :class="cn('mt-2', props.descriptionClass)"
              >
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

        <div v-if="hasFooterBar" :class="baseFooterClass">
          <slot name="footer" />
          <DrawerClose v-if="showFooterCloseButton" as-child>
            <Button variant="secondary">{{ t('common.close') }}</Button>
          </DrawerClose>
        </div>
      </div>
    </DrawerContent>
  </Drawer>
</template>
