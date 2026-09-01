<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useI18n } from 'vue-i18n'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import DialogClose from './DialogClose.vue'

const props = withDefaults(
  defineProps<{
    // eslint-disable-next-line vue/require-default-prop
    class?: HTMLAttributes['class']
    showCloseButton?: boolean
  }>(),
  {
    showCloseButton: false,
  },
)

const { t } = useI18n()
</script>

<template>
  <div
    data-slot="dialog-footer"
    :class="cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', props.class)"
  >
    <slot />
    <DialogClose v-if="showCloseButton" as-child>
      <Button variant="secondary">{{ t('common.close') }}</Button>
    </DialogClose>
  </div>
</template>
